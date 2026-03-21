
import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, CheckCircle, Loader2, Tag, Globe, Music, Plus, Trash2, Sparkles, Edit3, Zap } from 'lucide-react';
import { User as UserType, SpotifySearchResult, Genre, ArtistChannel } from '../types';
import { getSpotifyTrackDetails, MOCK_AUDIO_PREVIEW, extractSpotifyId, getEmbedUrl } from '../services/realApiService';
import { GENRES, LANGUAGES } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, language: string, metadata?: SpotifySearchResult, subGenre?: string, artistChannels?: ArtistChannel[], isBachAssisted?: boolean, isAuramasterAssisted?: boolean) => Promise<{ success: boolean; message?: string }>;
  user: UserType;
}

const AddSongModal: React.FC<AddSongModalProps> = ({ isOpen, onClose, onSubmit, user }) => {
  const { t } = useTranslation();
  // Manual Input State
  const [manualLink, setManualLink] = useState('');
  
  // Metadata State (Now Editable)
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [popularity, setPopularity] = useState<number>(0);
  
  const [manualGenre, setManualGenre] = useState<Genre>('Pop');
  const [manualSubGenre, setManualSubGenre] = useState('');
  const [manualLanguage, setManualLanguage] = useState<string>('English');
  const [artistChannels, setArtistChannels] = useState<ArtistChannel[]>([]);
  const [isBachAssisted, setIsBachAssisted] = useState(false);
  const [isAuramasterAssisted, setIsAuramasterAssisted] = useState(false);

  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  
  // Submission State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
        setManualLink('');
        setTitle('');
        setArtist('');
        setPopularity(0);
        setManualGenre('Pop');
        setManualSubGenre('');
        setManualLanguage('English');
        setArtistChannels([]);
        setIsBachAssisted(false);
        setIsAuramasterAssisted(false);
        setSuccess(false);
        setLoading(false);
        setErrorMsg(null);
    }
  }, [isOpen]);

  // Debounce for auto-fetch (Genre + Metadata)
  useEffect(() => {
    const timer = setTimeout(() => {
        if (manualLink && manualLink.includes('open.spotify.com') && (manualLink.includes('track') || manualLink.includes('album'))) {
            handleFetchMetadata(manualLink);
        }
    }, 800);
    return () => clearTimeout(timer);
  }, [manualLink]);

  if (!isOpen) return null;

  const handleFetchMetadata = async (url: string) => {
    if (isFetchingMeta) return;
    setIsFetchingMeta(true);
    setErrorMsg(null);
    
    try {
        const details = await getSpotifyTrackDetails(url);
        if (details) {
            if (details.genre) setManualGenre(details.genre);
            if (details.language) setManualLanguage(details.language);
            if (details.subGenre) setManualSubGenre(details.subGenre);
            if (details.title) setTitle(details.title);
            if (details.artist) setArtist(details.artist);
            if (details.spotifyPopularity) setPopularity(details.spotifyPopularity);
        }
    } catch (e) {
        console.error("Failed to fetch metadata", e);
    } finally {
        setIsFetchingMeta(false);
    }
  };

  const handleAddChannel = (e: React.MouseEvent) => {
      e.preventDefault();
      setArtistChannels([...artistChannels, { id: Date.now().toString(), url: '' }]);
  };

  const handleUpdateChannel = (id: string, newUrl: string) => {
      setArtistChannels(prev => prev.map(ch => ch.id === id ? { ...ch, url: newUrl } : ch));
  };

  const handleDeleteChannel = (id: string) => {
      setArtistChannels(prev => prev.filter(ch => ch.id !== id));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualLink) return;

      const id = extractSpotifyId(manualLink) || `manual_${Date.now()}`;
      
      const finalCoverUrl = `https://picsum.photos/seed/${id}/200/200`;

      const manualTrack: SpotifySearchResult = {
          id: id,
          title: title || 'Unknown Title',
          artist: artist || 'Unknown Artist',
          spotifyUrl: manualLink,
          coverUrl: finalCoverUrl,
          previewUrl: MOCK_AUDIO_PREVIEW,
          genre: manualGenre,
          subGenre: manualSubGenre,
          language: manualLanguage,
          spotifyPopularity: popularity || undefined
      };

      setLoading(true);
      setErrorMsg(null);
      const result = await onSubmit(manualLink, manualLanguage, manualTrack, manualSubGenre, artistChannels, isBachAssisted, isAuramasterAssisted);
      setLoading(false);
      
      if (result.success) {
          setSuccess(true);
          // Close automatically after success
          setTimeout(() => {
              onClose();
          }, 1500);
      } else {
          setErrorMsg(result.message || "Failed to submit track. Please check if you are logged in or if the URL is valid.");
      }
  };

  // Helper to safely get ID for key prop
  const getTrackIdSafe = (url: string) => extractSpotifyId(url) || 'temp';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden relative border border-gray-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-purple-600 p-6 flex justify-between items-start text-white shrink-0">
          <div>
            <h2 className="text-2xl font-billboard uppercase tracking-wide">
              {t.modal.title}
            </h2>
            <p className="text-purple-200 text-sm mt-1">
              {t.modal.subtitle}
            </p>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {success ? (
             <div className="p-12 flex flex-col items-center text-center justify-center flex-1">
                 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="text-green-600" size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900">{t.modal.submitted}</h3>
                 <p className="text-gray-500 mt-2">{t.modal.submittedDesc}</p>
             </div>
        ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.modal.url}</label>
                            <div className="relative group">
                                <LinkIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="url"
                                    value={manualLink}
                                    onChange={(e) => setManualLink(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 outline-none transition-all font-medium bg-white text-gray-900"
                                    placeholder="https://open.spotify.com/track/..."
                                    required
                                />
                                {isFetchingMeta && (
                                    <div className="absolute right-3 top-3.5">
                                        <Loader2 className="animate-spin text-purple-600" size={18} />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Preview Section */}
                        {getEmbedUrl(manualLink) && (
                            <div className="animate-fade-in">
                                <div className="rounded-xl overflow-hidden shadow-lg bg-black mb-4">
                                    <iframe 
                                        key={getTrackIdSafe(manualLink)}
                                        style={{ borderRadius: '12px' }} 
                                        src={getEmbedUrl(manualLink)!} 
                                        width="100%" 
                                        height="80" 
                                        frameBorder="0" 
                                        allowFullScreen 
                                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                        loading="lazy"
                                    ></iframe>
                                </div>
                                
                                {/* Manual Metadata Inputs */}
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Song Title</label>
                                        <div className="relative">
                                            <Edit3 className="absolute left-2 top-2.5 text-gray-400" size={14} />
                                            <input 
                                                type="text" 
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full pl-7 pr-2 py-2 text-sm border border-gray-300 rounded focus:border-purple-600 outline-none"
                                                placeholder="Title"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Artist Name</label>
                                        <div className="relative">
                                            <Edit3 className="absolute left-2 top-2.5 text-gray-400" size={14} />
                                            <input 
                                                type="text" 
                                                value={artist}
                                                onChange={(e) => setArtist(e.target.value)}
                                                className="w-full pl-7 pr-2 py-2 text-sm border border-gray-300 rounded focus:border-purple-600 outline-none"
                                                placeholder="Artist"
                                            />
                                        </div>
                                    </div>
                                    <p className="col-span-2 text-[10px] text-gray-400 italic">
                                        * Please verify the song title and artist name match the Spotify track for searchability.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* Genre Dropdown */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.modal.genre}</label>
                                <div className="relative group">
                                    <Tag className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    <select
                                        value={manualGenre}
                                        onChange={(e) => setManualGenre(e.target.value as Genre)}
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 outline-none transition-all font-medium bg-white appearance-none text-gray-900"
                                        required
                                    >
                                        {GENRES.filter(g => g !== 'All').map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                             {/* Language Dropdown */}
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.modal.language}</label>
                                <div className="relative group">
                                    <Globe className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                    <select
                                        value={manualLanguage}
                                        onChange={(e) => setManualLanguage(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 outline-none transition-all font-medium bg-white appearance-none text-gray-900"
                                        required
                                    >
                                        {LANGUAGES.filter(l => l !== 'All').map(l => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Sub Genre Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.modal.subGenre}</label>
                            <input
                                type="text"
                                value={manualSubGenre}
                                onChange={(e) => setManualSubGenre(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 outline-none transition-all font-medium bg-white text-gray-900"
                                placeholder="e.g. Drum & Bass, City Pop"
                            />
                        </div>

                        {/* Artist Channels Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                                {t.modal.channels}
                                <button 
                                    onClick={handleAddChannel} 
                                    className="text-purple-600 flex items-center gap-1 hover:underline"
                                >
                                    <Plus size={12} /> {t.modal.addChannel}
                                </button>
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {artistChannels.map((channel) => (
                                    <div key={channel.id} className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Music className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <input
                                                type="url"
                                                value={channel.url}
                                                onChange={(e) => handleUpdateChannel(channel.id, e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:border-purple-600 outline-none text-sm bg-white text-gray-900"
                                                placeholder="https://youtube.com/..."
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => handleDeleteChannel(channel.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {artistChannels.length === 0 && (
                                    <div className="text-xs text-gray-400 italic p-2 border border-dashed border-gray-200 rounded">
                                        No channels added.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Production Options */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2">
                                 <button 
                                    type="button"
                                    onClick={() => setIsBachAssisted(!isBachAssisted)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all
                                        ${isBachAssisted 
                                            ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm' 
                                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                        }`}
                                 >
                                    <Sparkles size={16} className={isBachAssisted ? "text-amber-600" : "text-gray-300"} />
                                    Pre-produced with Bach
                                 </button>
                                 <button 
                                    type="button"
                                    onClick={() => setIsAuramasterAssisted(!isAuramasterAssisted)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all
                                        ${isAuramasterAssisted 
                                            ? 'bg-indigo-100 border-indigo-300 text-indigo-800 shadow-sm' 
                                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                        }`}
                                 >
                                    <Zap size={16} className={isAuramasterAssisted ? "text-indigo-600" : "text-gray-300"} />
                                    Post-produced with Auramaster
                                 </button>
                            </div>
                            
                            {/* Legend */}
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                                <p className="font-bold mb-1 flex items-center gap-1"><Sparkles size={12}/> Rewards:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1 opacity-80">
                                    <li>Pre-produced with Bach: <strong>+0.25 Stars</strong></li>
                                    <li>Post-produced with Auramaster: <strong>+0.25 Stars</strong></li>
                                    <li>Both: <strong>+0.50 Stars</strong> (Start with 0.5 stars!)</li>
                                </ul>
                                <p className="mt-2 text-[10px] opacity-60 italic">* Proof of use may be required for verification.</p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {errorMsg && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                <span className="font-bold">Error:</span> {errorMsg}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading || !manualLink}
                            className="w-full bg-black text-white font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {loading ? t.modal.processing : t.modal.btnSubmit}
                        </button>
                    </form>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AddSongModal;
