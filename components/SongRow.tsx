
import React, { useState, useEffect } from 'react';
import { ArrowUp, TrendingUp, Calendar, Star, ChevronDown, ChevronUp, Link as LinkIcon, Facebook, Twitter, Check, AtSign, Edit2, Save, X, ArrowDown, Crown, Sparkles, Minus, ArrowRightLeft, Music, Youtube, Instagram, Cloud, Globe, Plus, Trash2, Twitch, Video, Lock, PlayCircle, AlertCircle, Zap, Flag } from 'lucide-react';
import { Song, User, Genre, ArtistChannel, SpotlightConfig } from '../types';
import { getEmbedUrl, submitClaim } from '../services/realApiService';
import { GENRES, LANGUAGES } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { useToast } from './Toast';

// Brand Icons
const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="16" height="16">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="16" height="16">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24.01-1.44.63-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.78.81.04 2.14-.67 3.53-.56 1.23.09 2.18.63 2.78 1.52-2.47 1.48-2.06 4.67.43 5.7-.56 1.48-1.31 2.92-1.82 5.53zm-1.74-13.6c.6-1.2 1.94-1.99 3.02-2.13.06 1.05-.28 2.37-1.12 3.19-.88.85-2.38 1.43-3.08 1.02-.2-.97.58-2.08 1.18-2.08z"/>
  </svg>
);

const YoutubeMusicIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="16" height="16">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-12.5v9l6-4.5z"/>
  </svg>
);

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="16" height="16">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const SoundCloudIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="16" height="16">
        <path d="M1.175 12.225c-.015.116-.015.233-.015.352 0 1.503.735 2.836 1.874 3.693 0 .007 0 .013.003.02.046 1.637 1.393 2.957 3.05 2.957.177 0 .351-.016.522-.045.034.004.068.006.103.006h10.567c3.714 0 6.722-2.986 6.722-6.67 0-3.565-2.812-6.478-6.36-6.657-.597-2.735-3.028-4.793-5.918-4.793-3.142 0-5.733 2.434-6.068 5.672-.084-.006-.169-.01-.255-.01-1.928 0-3.528 1.405-3.864 3.22l-.361 2.245z"/>
    </svg>
)

interface SongRowProps {
  song: Song;
  user: User | null;
  onRate: (id: string, rating: number) => void;
  showSubmittedDate?: boolean;
  allowEdit?: boolean;
  onUpdate?: (id: string, title: string, artist: string, genre: Genre, language: string, subGenre: string, artistChannels: ArtistChannel[]) => void;
  onTransfer?: (song: Song) => void;
  onSpotlight?: (song: Song) => void;
  customRank?: React.ReactNode;
  isHot?: boolean;
  isEditorial?: boolean;
  spotlightConfig?: SpotlightConfig;
}

const SongRow: React.FC<SongRowProps> = ({ song, user, onRate, showSubmittedDate, allowEdit, onUpdate, onTransfer, onSpotlight, customRank, isHot, isEditorial, spotlightConfig }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(song.title);
  const [editArtist, setEditArtist] = useState(song.artist);
  const [editGenre, setEditGenre] = useState<Genre>(song.genre);
  const [editLanguage, setEditLanguage] = useState<string>(song.language);
  const [editSubGenre, setEditSubGenre] = useState<string>(song.subGenre || '');
  const [editChannels, setEditChannels] = useState<ArtistChannel[]>(song.artistChannels || []);
  const [isSaving, setIsSaving] = useState(false);

  // Claim State
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimProof, setClaimProof] = useState('');
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Status checks
  const isOwner = user?.id === song.uploaderId;

  // ...

  const handleClaim = async () => {
      if (!claimProof.trim()) return;
      
      if (isOwner) {
          showToast("You cannot claim your own song.", "error");
          return;
      }

      setIsClaiming(true);
      try {
          const response = await fetch(`/api/songs/${song.id}/claim`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proof: claimProof })
          });
          
          const result = await response.json();
          setIsClaiming(false);

          if (response.ok) {
              showToast('Claim submitted successfully!', 'success');
              setShowClaimModal(false);
              setClaimProof('');
          } else {
              showToast(result.error || 'Failed to submit claim.', 'error');
          }
      } catch (e) {
          setIsClaiming(false);
          showToast('An error occurred while submitting claim.', 'error');
      }
  };
  const isSuperAdmin = user?.isSuperAdmin;
  const hasVoted = user && song.votedUserIds && song.votedUserIds.includes(user.id);
  
  // Logic: Allow interaction even if not logged in (to trigger Auth modal upstream)
  const canInteract = !user || isSuperAdmin || (!hasVoted && !isOwner);

  useEffect(() => {
      if (ratingMessage) {
          const timer = setTimeout(() => setRatingMessage(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [ratingMessage]);

  const handleRate = (rating: number) => {
    // 1. Check Login - Pass to parent to handle Modal
    if (!user) {
        onRate(song.id, rating);
        return;
    }

    // 2. Check Owner (Must show legend/message)
    if (isOwner && !isSuperAdmin) {
        setRatingMessage("You can't vote for your own song");
        return;
    }

    // 3. Check Already Voted (Skip for admin)
    if (hasVoted && !isSuperAdmin) {
        setRatingMessage("You have already voted");
        return;
    }
    
    // Success
    onRate(song.id, rating);
    setRatingMessage(null);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(song.spotifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform: 'facebook' | 'twitter' | 'threads', e: React.MouseEvent) => {
      e.stopPropagation();
      const text = `Check out this track on MelodIA Charts: #aimusic #aichart`;
      const url = encodeURIComponent(song.spotifyUrl);
      
      if (platform === 'facebook') {
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
      } else if (platform === 'twitter') {
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
      } else if (platform === 'threads') {
          window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
      }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setExpanded(true); // Auto expand so user sees the warning message
    // Reset state to current song values just in case
    setEditTitle(song.title);
    setEditArtist(song.artist);
    setEditGenre(song.genre);
    setEditLanguage(song.language);
    setEditSubGenre(song.subGenre || '');
    setEditChannels(song.artistChannels ? [...song.artistChannels] : []);
  };

  const handleSaveEdit = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    await onUpdate(song.id, editTitle, editArtist, editGenre, editLanguage, editSubGenre, editChannels);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleAddChannel = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setEditChannels([...editChannels, { id: Date.now().toString(), url: '' }]);
  };

  const handleUpdateChannel = (id: string, newUrl: string) => {
      setEditChannels(prev => prev.map(ch => ch.id === id ? { ...ch, url: newUrl } : ch));
  };

  const handleDeleteChannel = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setEditChannels(prev => prev.filter(ch => ch.id !== id));
  };

  const formatDate = (timestamp: number) => {
      return new Date(timestamp).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
      });
  };

  const getIconForUrl = (url: string) => {
      const lower = url.toLowerCase();
      if (lower.includes('music.youtube')) return <YoutubeMusicIcon className="text-red-600" />;
      if (lower.includes('youtube') || lower.includes('youtu.be')) return <Youtube size={16} className="text-red-600" />;
      
      if (lower.includes('spotify')) return <SpotifyIcon className="text-[#1DB954]" />; 
      if (lower.includes('apple') || lower.includes('music.apple')) return <AppleIcon className="text-white" />;
      
      if (lower.includes('instagram')) return <Instagram size={16} className="text-pink-600" />;
      if (lower.includes('twitter') || lower.includes('x.com')) return <Twitter size={16} className="text-blue-400" />;
      if (lower.includes('facebook')) return <Facebook size={16} className="text-blue-600" />;
      if (lower.includes('soundcloud')) return <SoundCloudIcon className="text-[#FF5500]" />;
      if (lower.includes('twitch')) return <Twitch size={16} className="text-purple-500" />;
      if (lower.includes('tiktok')) return <TiktokIcon className="text-black dark:text-white" />; 
      return <Globe size={16} className="text-gray-400" />;
  };

  // Helper: Percentage Fill for fractional stars
  const getFillWidth = (starIndex: number, rating: number) => {
      const diff = rating - (starIndex - 1);
      if (diff >= 1) return 100;
      if (diff <= 0) return 0;
      return diff * 100;
  };

  // Internal helper for Star Rating to avoid duplication
  const StarRating = ({ size = 18 }: { size?: number }) => (
    <div 
      className={`relative flex items-center gap-1 ${(!canInteract && user) ? 'opacity-80' : ''}`}
      onMouseLeave={() => setHoverRating(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const percent = getFillWidth(star, song.averageRating);
        const isHovered = hoverRating && star <= hoverRating;
        
        return (
            <button
            key={star}
            onClick={(e) => { e.stopPropagation(); handleRate(star); }}
            onMouseEnter={() => canInteract && setHoverRating(star)}
            className={`relative transition-transform focus:outline-none 
                ${canInteract ? 'cursor-pointer hover:scale-110' : 'cursor-default'} p-1 sm:p-0`}
            >
            {/* Background Star (Gray) */}
            <div className="relative">
                <Star size={size} className="text-gray-300 fill-gray-100" strokeWidth={1.5} />
                
                {/* Foreground Star (Yellow - Partial Fill) - Only show if NOT hovering (Hover takes precedence) */}
                {!isHovered && percent > 0 && (
                    <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${percent}%` }}>
                        <Star size={size} className="fill-yellow-400 text-yellow-400" strokeWidth={1.5} />
                    </div>
                )}
                
                {/* Hover State (Solid Fill) */}
                {isHovered && (
                    <div className="absolute top-0 left-0">
                        <Star size={size} className="fill-yellow-400 text-yellow-400" strokeWidth={1.5} />
                    </div>
                )}
            </div>
            </button>
        )
      })}
    </div>
  );

  const getRankChange = () => {
    if (!song.lastWeekRank) return <span className="text-purple-600 text-xs font-bold uppercase">{t.row.new}</span>;
    const diff = song.lastWeekRank - song.rank;
    if (diff > 0) return <div className="flex items-center text-green-600 text-xs font-bold"><ArrowUp size={12} /> {diff}</div>;
    if (diff < 0) return <div className="text-red-500 text-xs font-bold">{diff}</div>;
    return <div className="text-gray-400 text-xs font-bold">-</div>;
  };

  // Badge Logic
  const isFresh = !song.lastWeekRank;
  const isRising = song.lastWeekRank && song.lastWeekRank > song.rank;
  const isFalling = song.lastWeekRank && song.lastWeekRank < song.rank;
  const showCrown = song.weeksOnChart >= 4;

  const embedUrl = getEmbedUrl(song.spotifyUrl);

  return (
    <div className={`border-b border-gray-200 bg-white 
      ${isHot ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}
      ${isEditorial ? 'border-l-4 border-l-purple-500 bg-purple-50/30 shadow-inner' : ''}
    `}>
      {/* Main Row */}
      <div 
        className={`group relative hover:bg-gray-50 transition-colors py-3 px-2 sm:px-4 flex flex-col sm:flex-row gap-0 sm:gap-6 cursor-pointer ${expanded ? 'bg-indigo-50' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        
        {/* Top Row: Rank + Player + Desktop Stats/Rating */}
        <div className="flex items-center gap-3 sm:gap-6 w-full pr-8 sm:pr-0 relative">
            
            {/* 1. Rank Section */}
            <div className="w-12 sm:w-16 flex flex-col items-center justify-center shrink-0">
              {customRank ? (
                  customRank
              ) : (
                  <>
                    <span className="font-billboard text-2xl sm:text-4xl font-bold text-gray-900 leading-none">
                        {song.rank}
                    </span>
                    <div className="mt-1">
                        {getRankChange()}
                    </div>
                  </>
              )}
            </div>

            {/* 2. Spotify Player & Info Section */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              
              {/* --- IFRAME PLAYER --- */}
              <div className="w-full h-[80px] rounded-xl overflow-hidden bg-gray-900 shadow-sm relative z-0">
                {embedUrl ? (
                     <iframe 
                      src={embedUrl}
                      width="100%" 
                      height="80" 
                      frameBorder="0" 
                      allowFullScreen 
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                      title={`Spotify embed for ${song.title}`}
                      className="bg-gray-100"
                      loading="lazy"
                    ></iframe>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                        {t.row.previewUnavailable}
                    </div>
                )}
              </div>
              
              {/* Metadata Tags + NEW BADGES */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 px-1 pointer-events-auto">
                {isEditing ? (
                  <div className="flex flex-col gap-2 w-full mt-2 animate-fade-in">
                     {/* Edit Title & Artist - Always Available */}
                     <div className="flex items-center gap-2 mb-1">
                         <input 
                             type="text"
                             value={editTitle}
                             onChange={(e) => setEditTitle(e.target.value)}
                             onClick={(e) => e.stopPropagation()}
                             placeholder="Song Title"
                             className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-black w-full"
                         />
                         <input 
                             type="text"
                             value={editArtist}
                             onChange={(e) => setEditArtist(e.target.value)}
                             onClick={(e) => e.stopPropagation()}
                             placeholder="Artist"
                             className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-black w-full"
                         />
                     </div>

                     <div className="flex items-center gap-2">
                         {!song.hasBeenEdited ? (
                            <>
                                <select 
                                    value={editGenre}
                                    onChange={(e) => setEditGenre(e.target.value as Genre)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-black"
                                >
                                    {GENRES.filter(g => g !== 'All').map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <select 
                                    value={editLanguage}
                                    onChange={(e) => setEditLanguage(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-black"
                                >
                                    {LANGUAGES.filter(l => l !== 'All').map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                                <input 
                                    type="text"
                                    value={editSubGenre}
                                    onChange={(e) => setEditSubGenre(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder={t.row.subGenre}
                                    className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-black w-32"
                                />
                            </>
                         ) : (
                             <div className="flex items-center gap-2 text-gray-500 italic text-[10px]">
                                 <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{editGenre}</span>
                                 <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{editLanguage}</span>
                                 {editSubGenre && <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{editSubGenre}</span>}
                                 <span className="text-gray-400 ml-2 flex items-center gap-1"><Lock size={10} /> Genre/Lang locked</span>
                             </div>
                         )}
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                           className="bg-green-600 text-white p-1 rounded hover:bg-green-700"
                           disabled={isSaving}
                         >
                            <Save size={14} />
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                           className="bg-gray-400 text-white p-1 rounded hover:bg-gray-500"
                         >
                            <X size={14} />
                         </button>
                     </div>

                     {!song.hasBeenEdited && (
                        <p className="text-[10px] text-red-500 font-bold animate-pulse">
                            {t.row.editInfo}
                        </p>
                     )}
                     
                     {/* Edit Channels - Always Editable */}
                     <div className="flex flex-col gap-1 pl-1 border-l-2 border-indigo-200 mt-1">
                        <span className="text-[10px] font-bold uppercase text-gray-400">{t.row.artistChannels}</span>
                        {editChannels.map((channel) => (
                            <div key={channel.id} className="flex items-center gap-1">
                                <span className="text-gray-400">{getIconForUrl(channel.url)}</span>
                                <input 
                                    type="text"
                                    value={channel.url}
                                    onChange={(e) => handleUpdateChannel(channel.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder={t.row.channelUrl}
                                    className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-black flex-1 min-w-[150px]"
                                />
                                <button
                                    onClick={(e) => handleDeleteChannel(channel.id, e)}
                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={handleAddChannel}
                            className="text-[10px] text-indigo-600 flex items-center gap-1 hover:underline w-fit"
                        >
                            <Plus size={10} /> {t.row.addChannel}
                        </button>
                     </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider text-gray-600">
                        {song.genre}
                        </span>
                        {song.subGenre && (
                            <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider text-gray-500">
                                {song.subGenre}
                            </span>
                        )}
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider text-gray-600">
                        {song.language}
                        </span>

                        {song.isBachAssisted && (
                            <span className="bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider" title={t.modal.bachAssisted}>
                               <Zap size={10} className="fill-amber-500 text-amber-600"/> {t.row.badges.bach}
                            </span>
                        )}
                        {song.isAuramasterAssisted && (
                            <span className="bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider" title="Post-produced with Auramaster">
                               <Sparkles size={10} className="fill-purple-500 text-purple-600"/> Aura
                            </span>
                        )}
                    </div>
                    
                    {/* NEW: Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        {isFresh && (
                            <span className="bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                            <Sparkles size={10} /> {t.row.badges.fresh}
                            </span>
                        )}
                        
                        {isRising && (
                            <span className="bg-cyan-50 text-cyan-700 border border-cyan-100 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                            <ArrowUp size={10} /> {t.row.badges.up}
                            </span>
                        )}
                        
                        {isFalling && (
                            <span className="bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                            <ArrowDown size={10} /> {t.row.badges.down}
                            </span>
                        )}
                        
                        {showCrown && (
                            <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                            <Crown size={10} className="fill-yellow-500 text-yellow-600" /> 
                            {song.weeksOnChart} {t.row.badges.weeks}
                            </span>
                        )}
                    </div>

                    {/* Edit and Transfer Buttons */}
                    {allowEdit && isOwner && !isEditing && (
                        <div className="flex items-center gap-2 ml-1">
                             <button 
                                 onClick={handleEditClick}
                                 className="flex items-center gap-1 text-[10px] text-purple-600 font-bold hover:underline"
                                 title={t.row.edit}
                             >
                                 <Edit2 size={10} /> {t.row.edit}
                             </button>
                             
                             {onTransfer && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onTransfer(song); }}
                                    className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold hover:underline"
                                    title={t.row.transfer}
                                >
                                    <ArrowRightLeft size={10} /> {t.row.transfer}
                                </button>
                             )}
                        </div>
                    )}

                     {/* Claim Button (If not owner) */}
                     {!isOwner && user && (
                         <div className="flex items-center gap-2 ml-1">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); setShowClaimModal(true); }}
                                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 font-bold hover:underline transition-colors"
                                  title="Claim this track"
                              >
                                  <Flag size={10} /> Claim
                              </button>
                         </div>
                     )}

                     {/* Spotlight Button (If owner) */}
                     {isOwner && user && onSpotlight && !isEditing && spotlightConfig?.enabled && (
                         <div className="flex items-center gap-2 ml-1">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onSpotlight(song); }}
                                  className="flex items-center gap-1 text-[10px] bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded hover:bg-yellow-200 transition-colors font-bold uppercase tracking-wider"
                                  title="Submit to Spotlight"
                              >
                                  <Zap size={10} className="fill-yellow-500" /> Spotlight
                              </button>
                         </div>
                     )}
                  </>
                )}
                
                {showSubmittedDate && !isEditing && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium ml-auto sm:ml-0">
                    <Calendar size={10} />
                    {new Date(song.timestamp).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Stats Box (Billboard Style) - DESKTOP ONLY */}
            <div className="hidden md:flex shrink-0 gap-6 text-center border-l border-gray-200 pl-6 h-12 items-center">
              <div className="flex flex-col items-center w-10">
                  <span className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">{t.row.stats.lw}</span>
                  <span className="text-sm font-bold text-gray-700">{song.lastWeekRank || '-'}</span>
              </div>
              <div className="flex flex-col items-center w-10">
                  <span className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">{t.row.stats.peak}</span>
                  <span className="text-sm font-bold text-gray-700">{song.peakRank}</span>
              </div>
              <div className="flex flex-col items-center w-10">
                  <span className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">{t.row.stats.wks}</span>
                  <span className="text-sm font-bold text-gray-700">{song.weeksOnChart}</span>
              </div>
            </div>

            {/* 4. Rating Section - DESKTOP ONLY */}
            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 ml-auto pl-4 min-w-[120px]">
              <div className="flex flex-col items-end">
                <StarRating size={18} />
                {ratingMessage && (
                    <span className="text-[10px] text-red-500 font-bold animate-pulse absolute -bottom-4 right-0 whitespace-nowrap bg-white px-1 shadow-sm rounded border border-red-100 z-10">
                        {ratingMessage}
                    </span>
                )}
              </div>
              <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-gray-900">{song.averageRating.toFixed(1)} / 5</span>
                  <span className="text-xs text-gray-400">{song.ratingCount} {t.row.stats.votes}</span>
              </div>
            </div>

            {/* Expand Toggle */}
            <div className="absolute top-2 right-2 sm:static sm:flex items-center justify-center">
                <button className={`p-2 rounded-full transition-transform ${expanded ? 'rotate-180 bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'}`}>
                    <ChevronDown size={20} />
                </button>
            </div>
        </div>

        {/* 5. Mobile Only Rating Section */}
        <div className="sm:hidden w-full mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              {t.row.voteNow} <span className="w-1 h-1 rounded-full bg-purple-500"></span>
            </span>
            <div className="flex items-center gap-2 relative">
              {ratingMessage && (
                  <span className="text-[10px] text-red-500 font-bold animate-pulse absolute -top-5 right-0 whitespace-nowrap bg-white px-1 shadow-sm rounded border border-red-100 z-10">
                      {ratingMessage}
                  </span>
              )}
              <StarRating size={22} />
              <span className="text-sm font-bold text-gray-900 ml-1">{song.averageRating.toFixed(1)}</span>
            </div>
        </div>
      </div>

      {/* EXPANDED DETAILS */}
      {expanded && (
          <div className="bg-indigo-950 text-white p-6 sm:p-8 animate-fade-in border-t border-indigo-900">
             <div className="max-w-4xl mx-auto flex flex-col-reverse md:flex-row gap-8 md:gap-16 items-start">
                 
                 {/* LEFT: Socials & Actions (Formerly Right) */}
                 <div className="flex flex-col gap-6 flex-1 w-full text-center md:text-left">
                     
                     <div className="flex flex-col gap-3 items-center md:items-start">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">{t.row.share}</span>
                         <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            {/* Standard Socials */}
                            <button 
                                onClick={(e) => handleShare('facebook', e)}
                                className="w-10 h-10 border border-indigo-700 bg-indigo-900/40 rounded flex items-center justify-center text-indigo-200 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all"
                                title="Share on Facebook"
                            >
                                <Facebook size={18} />
                            </button>
                            <button 
                                onClick={(e) => handleShare('twitter', e)}
                                className="w-10 h-10 border border-indigo-700 bg-indigo-900/40 rounded flex items-center justify-center text-indigo-200 hover:bg-sky-500 hover:border-sky-500 hover:text-white transition-all"
                                title="Share on X"
                            >
                                <Twitter size={18} />
                            </button>
                             <button 
                                onClick={(e) => handleShare('threads', e)}
                                className="w-10 h-10 border border-indigo-700 bg-indigo-900/40 rounded flex items-center justify-center text-indigo-200 hover:bg-black hover:border-white hover:text-white transition-all"
                                title="Share on Threads"
                            >
                                <AtSign size={18} />
                            </button>
                            <button 
                                onClick={handleCopyLink}
                                className="w-10 h-10 border border-indigo-700 bg-indigo-900/40 rounded flex items-center justify-center text-indigo-200 hover:bg-pink-500 hover:border-pink-500 hover:text-white transition-all relative"
                                title="Copy Link"
                            >
                                {copied ? <Check size={18} /> : <LinkIcon size={18} />}
                            </button>
                         </div>
                     </div>

                    {/* Artist Channels Section */}
                    {song.artistChannels && song.artistChannels.length > 0 && (
                        <div className="flex flex-col gap-3 items-center md:items-start">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">{t.row.artistChannels}</span>
                            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                {song.artistChannels.map((channel) => (
                                    <a 
                                        key={channel.id}
                                        href={channel.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-10 h-10 border border-indigo-700 bg-indigo-900/40 rounded flex items-center justify-center text-indigo-200 hover:bg-green-500 hover:border-green-500 hover:text-white transition-all"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {getIconForUrl(channel.url)}
                                    </a>
                                ))}
                            </div>
                        </div>
                     )}

                     <a 
                        href={song.spotifyUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold uppercase tracking-widest py-3 px-8 rounded-full transition-all hover:scale-105 shadow-lg shadow-green-900/20 mx-auto md:mx-0 w-full sm:w-auto"
                     >
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                        {t.row.stream}
                     </a>
                 </div>

                 {/* RIGHT: Debut & Peak Boxes (Formerly Left) - UPDATED COLORS (Deep Indigo + Pink Accent) */}
                 <div className="flex gap-4 sm:gap-8 mx-auto md:mx-0">
                     <div className="flex flex-col gap-2">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 text-center sm:text-left">{t.row.debut}</span>
                         <div className="border-2 border-pink-500/30 rounded-xl w-32 h-36 flex flex-col items-center justify-center text-center bg-indigo-900/50 hover:bg-indigo-900 transition-colors shadow-lg shadow-black/20">
                             <span className="text-6xl font-billboard font-bold text-pink-400 leading-none">{song.debutRank}</span>
                             <div className="mt-3 flex flex-col gap-0.5">
                                 <span className="text-[10px] text-white font-bold tracking-wide">{t.row.debutDate}</span>
                                 <span className="text-xs text-indigo-300 font-mono">
                                    {formatDate(song.debutDate)}
                                 </span>
                             </div>
                         </div>
                     </div>

                     <div className="flex flex-col gap-2">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 text-center sm:text-left">{t.row.peak}</span>
                         <div className="border-2 border-cyan-500/30 rounded-xl w-32 h-36 flex flex-col items-center justify-center text-center bg-indigo-900/50 hover:bg-indigo-900 transition-colors shadow-lg shadow-black/20">
                             <span className="text-6xl font-billboard font-bold text-cyan-400 leading-none">{song.peakRank}</span>
                             <div className="mt-3 flex flex-col gap-0.5">
                                 <span className="text-[10px] text-white font-bold tracking-wide">{t.row.peakDate}</span>
                                 <span className="text-xs text-indigo-300 font-mono">
                                    {formatDate(song.timestamp)} 
                                 </span>
                             </div>
                         </div>
                     </div>
                 </div>

             </div>
          </div>
      )}
      {/* Claim Modal */}
      {showClaimModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm cursor-default" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Claim Ownership</h3>
                  <p className="text-sm text-gray-500 mb-4">
                      If you are the artist or rights holder of this track, please provide proof (e.g., link to social media, official website, or Spotify for Artists profile).
                  </p>
                  <textarea
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none mb-4 text-black"
                      rows={3}
                      placeholder="Proof of ownership..."
                      value={claimProof}
                      onChange={(e) => setClaimProof(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                      <button 
                          onClick={() => setShowClaimModal(false)}
                          className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={handleClaim}
                          disabled={isClaiming || !claimProof.trim()}
                          className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                          {isClaiming ? 'Submitting...' : 'Submit Claim'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SongRow;
