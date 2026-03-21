
import React, { useState, useEffect } from 'react';
import { X, Save, User as UserIcon, Globe, Mail, Loader2, CheckCircle, Lock, LogOut, Key, LayoutDashboard, Music, Flag, BarChart2, Trash2, Edit2, AlertCircle, Plus, Zap, Bell, Calendar, Sparkles } from 'lucide-react';
import { User, Song, Genre, ArtistChannel, SpotlightConfig, Notification } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { useToast } from './Toast';
import { COUNTRIES, GENRES, LANGUAGES } from '../constants';
import { updateUserPassword, getUserStats, getUserClaims, fetchSongs, updateTrack, deleteTrack, getSpotlightConfig, submitToSpotlight, getNotifications, markNotificationRead } from '../services/realApiService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate: (userId: string, name: string, country: string) => Promise<void>;
  onLogout?: () => void;
  initialSpotlightSong?: Song | null;
  onNotificationRead?: () => void;
  spotlightConfig?: SpotlightConfig;
}

type Tab = 'overview' | 'tracks' | 'claims' | 'profile' | 'notifications';

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user, onUpdate, onLogout, initialSpotlightSong, onNotificationRead, spotlightConfig }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  
  // Profile State
  const [profileState, setProfileState] = useState({
    name: user.username,
    country: user.country || 'United States',
    isSaving: false,
    isSuccess: false,
    newPassword: '',
    confirmPassword: '',
    passwordMessage: null as string | null
  });

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState({
    stats: null as any,
    claims: [] as any[],
    myTracks: [] as Song[],
    notifications: [] as Notification[],
    loading: false
  });

  // Spotlight State
  const [spotlightState, setSpotlightState] = useState({
    modalOpen: false,
    selectedTrack: null as Song | null,
    type: 'organic' as 'organic' | 'paid',
    days: 1,
    scope: 'genre_language' as 'global' | 'genre_language',
    bid: 0,
    queuePosition: null as number | null,
    estimatedWaitDays: null as number | null,
    targetDate: '' as string
  });

  // Edit Track State
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
      genre: Genre;
      language: string;
      artistChannels: ArtistChannel[];
  }>({ genre: 'Pop', language: 'English', artistChannels: [] });

  // Delete Confirmation State
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null);

  // Sync with user prop changes
  useEffect(() => {
    if (isOpen) {
        setProfileState(prev => ({
            ...prev,
            name: user.username,
            country: user.country || 'United States',
            isSuccess: false,
            newPassword: '',
            confirmPassword: '',
            passwordMessage: null
        }));
        
        if (initialSpotlightSong) {
            setActiveTab('tracks');
            setSpotlightState(prev => ({
                ...prev,
                selectedTrack: initialSpotlightSong,
                modalOpen: true,
                type: 'organic',
                days: 1,
                queuePosition: null,
                estimatedWaitDays: null
            }));
        } else {
            setActiveTab('overview');
        }
        
        loadTabData(activeTab);
        fetchSpotlightConfig();
    } else {
        // Reset spotlight state when closing
        setSpotlightState(prev => ({ ...prev, modalOpen: false, selectedTrack: null }));
    }
  }, [user, isOpen, initialSpotlightSong]);

  useEffect(() => {
      if (isOpen) {
          loadTabData(activeTab);
      }
  }, [activeTab]);

  const fetchSpotlightConfig = async () => {
      const config = await getSpotlightConfig();
      setSpotlightState(prev => ({ ...prev, config }));
  };

  const loadTabData = async (tab: Tab) => {
      setDashboardData(prev => ({ ...prev, loading: true }));
      if (tab === 'overview') {
          const data = await getUserStats(user.id);
          setDashboardData(prev => ({ ...prev, stats: data, loading: false }));
      } else if (tab === 'tracks') {
          // Fetch all user tracks (using limit 100 for now, maybe pagination later)
          const { data } = await fetchSongs(1, 100, 'fresh', 'All', 'All', user.id);
          setDashboardData(prev => ({ ...prev, myTracks: data, loading: false }));
      } else if (tab === 'claims') {
          const data = await getUserClaims(user.id);
          setDashboardData(prev => ({ ...prev, claims: data, loading: false }));
      } else if (tab === 'notifications') {
          const data = await getNotifications();
          setDashboardData(prev => ({ ...prev, notifications: data, loading: false }));
      } else {
          setDashboardData(prev => ({ ...prev, loading: false }));
      }
  };

  const handleMarkRead = async (id: string) => {
      await markNotificationRead(id);
      setDashboardData(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
      }));
      if (onNotificationRead) onNotificationRead();
  };

  // Logic to determine if user can edit name (once every 30 days)
  const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
  const lastUpdate = user.lastUsernameUpdate || 0;
  const nextUpdate = lastUpdate + DAYS_30;
  const canEditName = Date.now() > nextUpdate;
  const formattedNextUpdate = new Date(nextUpdate).toLocaleDateString();

  // Calculate Bid
  useEffect(() => {
      if (spotlightConfig && spotlightState.type === 'paid') {
          const basePrice = spotlightState.scope === 'global' ? spotlightConfig.prices.global : spotlightConfig.prices.genre_language;
          const dayPrice = spotlightConfig.prices.day;
          // Simple calculation for now, can be more complex
          setSpotlightState(prev => ({ ...prev, bid: (basePrice + (dayPrice * prev.days)) }));
      } else {
          setSpotlightState(prev => ({ ...prev, bid: 0 }));
      }
  }, [spotlightState.type, spotlightState.days, spotlightState.scope, spotlightConfig]);


  if (!isOpen) return null;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileState.name) return;
    
    setProfileState(prev => ({ ...prev, isSaving: true }));
    await onUpdate(user.id, profileState.name, profileState.country);
    
    if (profileState.newPassword) {
        if (profileState.newPassword !== profileState.confirmPassword) {
            setProfileState(prev => ({ ...prev, passwordMessage: "Passwords do not match", isSaving: false }));
            return;
        }
        if (profileState.newPassword.length < 6) {
             setProfileState(prev => ({ ...prev, passwordMessage: "Password must be at least 6 characters", isSaving: false }));
             return;
        }
        await updateUserPassword(user.id, profileState.newPassword);
    }

    setProfileState(prev => ({ ...prev, isSaving: false, isSuccess: true }));
    setTimeout(() => {
        setProfileState(prev => ({ ...prev, isSuccess: false }));
    }, 2000);
  };

  const handleEditTrackClick = (song: Song) => {
      setEditingTrackId(song.id);
      setEditForm({
          genre: song.genre,
          language: song.language,
          artistChannels: song.artistChannels || []
      });
  };

  const handleSpotlightClick = (song: Song) => {
      setSpotlightState(prev => ({
          ...prev,
          selectedTrack: song,
          modalOpen: true,
          type: 'organic',
          days: 1,
          queuePosition: null, // Reset
          estimatedWaitDays: null
      }));
  };

  const handleSubmitSpotlight = async () => {
      if (!spotlightState.selectedTrack) return;

      setProfileState(prev => ({ ...prev, isSaving: true }));
      const result = await submitToSpotlight({
          trackId: spotlightState.selectedTrack.id,
          type: spotlightState.type,
          days: spotlightState.type === 'paid' ? spotlightState.days : undefined,
          scope: spotlightState.type === 'paid' ? spotlightState.scope : undefined,
          targetDate: spotlightState.type === 'paid' ? spotlightState.targetDate : undefined
      });
      setProfileState(prev => ({ ...prev, isSaving: false }));

      if (result.success) {
          if (spotlightState.type === 'organic') {
              // Update state to show success message with queue info instead of closing immediately
              setSpotlightState(prev => ({
                  ...prev,
                  queuePosition: result.queuePosition,
                  estimatedWaitDays: result.estimatedWaitDays
              }));
              showToast(`Submitted to Spotlight Queue! Position: ${result.queuePosition}, Est. Wait: ${result.estimatedWaitDays} days.`, 'success');
              setSpotlightState(prev => ({ ...prev, modalOpen: false, selectedTrack: null }));
          } else {
              showToast(`Spotlight Bid Placed: $${result.bidAmount}`, 'success');
              setSpotlightState(prev => ({ ...prev, modalOpen: false, selectedTrack: null }));
          }
      } else {
          showToast(`Submission Failed: ${result.message}`, 'error');
      }
  };

  const handleSaveTrack = async (songId: string) => {
      setProfileState(prev => ({ ...prev, isSaving: true }));
      const success = await updateTrack(songId, editForm);
      setProfileState(prev => ({ ...prev, isSaving: false }));
      if (success) {
          setEditingTrackId(null);
          loadTabData('tracks'); // Refresh
          showToast("Track updated successfully!", "success");
      } else {
          showToast("Failed to update track", "error");
      }
  };

  const handleDeleteTrack = async (songId: string) => {
      setDeletingTrackId(songId);
  };

  const confirmDelete = async () => {
      if (!deletingTrackId) return;
      
      console.log("Deleting track:", deletingTrackId);
      setProfileState(prev => ({ ...prev, isSaving: true }));
      const result = await deleteTrack(deletingTrackId);
      setProfileState(prev => ({ ...prev, isSaving: false }));
      
      if (result.success) {
          console.log("Track deleted successfully");
          setDeletingTrackId(null);
          loadTabData('tracks'); // Refresh
          showToast("Track deleted successfully!", "success");
      } else {
          console.error("Delete failed:", result.message);
          showToast(`Failed to delete: ${result.message}`, "error"); 
      }
  };

  const handleAddChannel = () => {
      setEditForm(prev => ({
          ...prev,
          artistChannels: [...prev.artistChannels, { id: Date.now().toString(), url: '' }]
      }));
  };

  const handleUpdateChannel = (id: string, url: string) => {
      setEditForm(prev => ({
          ...prev,
          artistChannels: prev.artistChannels.map(ch => ch.id === id ? { ...ch, url } : ch)
      }));
  };

  const handleRemoveChannel = (id: string) => {
      setEditForm(prev => ({
          ...prev,
          artistChannels: prev.artistChannels.filter(ch => ch.id !== id)
      }));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden relative max-h-[90vh] flex flex-col">
        
        {/* Spotlight Submission Modal */}
        {spotlightState.modalOpen && spotlightState.selectedTrack && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
                <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl overflow-y-auto max-h-[80vh]">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4 text-yellow-600">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Submit to Spotlight</h3>
                        <p className="text-sm text-gray-500 font-medium">{spotlightState.selectedTrack.title}</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        {/* Pre-filled Info */}
                        <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 space-y-1">
                            <div className="flex justify-between"><span>Genre:</span> <span className="font-bold">{spotlightState.selectedTrack.genre}</span></div>
                            <div className="flex justify-between"><span>Language:</span> <span className="font-bold">{spotlightState.selectedTrack.language}</span></div>
                        </div>

                        {/* Type Selection */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSpotlightState(prev => ({ ...prev, type: 'organic' }))}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded border ${spotlightState.type === 'organic' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                Organic (Free)
                            </button>
                            <button 
                                onClick={() => setSpotlightState(prev => ({ ...prev, type: 'paid' }))}
                                disabled={!spotlightConfig?.prices.day}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded border ${spotlightState.type === 'paid' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'} ${!spotlightConfig?.prices.day ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={!spotlightConfig?.prices.day ? "Paid spotlight is currently disabled" : ""}
                            >
                                Paid (Boost)
                            </button>
                        </div>

                        {spotlightState.type === 'organic' ? (
                            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded border border-blue-100">
                                <p className="mb-2"><span className="font-bold text-blue-700">How it works:</span> Your song will be added to the spotlight queue. It will be featured for 24 hours when it reaches the front of the line.</p>
                                <p>Queue Position: <span className="font-bold">{spotlightState.queuePosition !== null ? spotlightState.queuePosition : "Calculating..."}</span></p>
                                {spotlightState.estimatedWaitDays !== null && <p>Est. Wait: <span className="font-bold">{spotlightState.estimatedWaitDays} days</span></p>}
                            </div>
                        ) : (
                            <div className="space-y-3 animate-in fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration (Days)</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="7" 
                                        value={spotlightState.days} 
                                        onChange={(e) => setSpotlightState(prev => ({ ...prev, days: parseInt(e.target.value) || 1 }))}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date (Optional)</label>
                                    <input 
                                        type="date" 
                                        value={spotlightState.targetDate} 
                                        onChange={(e) => setSpotlightState(prev => ({ ...prev, targetDate: e.target.value }))}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Leave blank to start ASAP.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Scope</label>
                                    <select 
                                        value={spotlightState.scope} 
                                        onChange={(e) => setSpotlightState(prev => ({ ...prev, scope: e.target.value as any }))}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="genre_language">Genre & Language Only</option>
                                        <option value="global">Global (All Users)</option>
                                    </select>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded border border-indigo-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-indigo-900 uppercase">Estimated Bid</span>
                                    <span className="text-lg font-black text-indigo-600">${spotlightState.bid.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setSpotlightState(prev => ({ ...prev, modalOpen: false }))}
                            className="flex-1 py-2.5 text-sm font-bold uppercase tracking-wider text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmitSpotlight}
                            disabled={profileState.isSaving}
                            className="flex-1 py-2.5 text-sm font-bold uppercase tracking-wider text-white bg-black hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {profileState.isSaving ? <Loader2 className="animate-spin" size={16} /> : "Submit"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingTrackId && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 animate-in fade-in">
                <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Track?</h3>
                        <p className="text-sm text-gray-500">
                            Are you sure you want to delete this track? This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setDeletingTrackId(null)}
                            className="flex-1 py-2.5 text-sm font-bold uppercase tracking-wider text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            disabled={profileState.isSaving}
                            className="flex-1 py-2.5 text-sm font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {profileState.isSaving ? <Loader2 className="animate-spin" size={16} /> : "Delete"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-black p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-billboard text-white uppercase tracking-wide flex items-center gap-2">
              <LayoutDashboard className="text-purple-400" size={24} />
              User Dashboard
            </h2>
            <p className="text-gray-400 text-xs uppercase tracking-wider mt-1">Welcome back, {user.username}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 shrink-0 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors whitespace-nowrap
                    ${activeTab === 'overview' ? 'bg-white border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}
                `}
            >
                <BarChart2 size={16} /> Overview
            </button>
            <button 
                onClick={() => setActiveTab('tracks')}
                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors whitespace-nowrap
                    ${activeTab === 'tracks' ? 'bg-white border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}
                `}
            >
                <Music size={16} /> My Tracks
            </button>
            <button 
                onClick={() => setActiveTab('claims')}
                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors whitespace-nowrap
                    ${activeTab === 'claims' ? 'bg-white border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}
                `}
            >
                <Flag size={16} /> Claims
            </button>
            <button 
                onClick={() => setActiveTab('notifications')}
                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors whitespace-nowrap
                    ${activeTab === 'notifications' ? 'bg-white border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}
                `}
            >
                <Bell size={16} /> Notifications
                {dashboardData.notifications.some(n => !n.isRead) && (
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors whitespace-nowrap
                    ${activeTab === 'profile' ? 'bg-white border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}
                `}
            >
                <UserIcon size={16} /> Profile
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {dashboardData.loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <span className="text-xs font-bold uppercase">Loading...</span>
                </div>
            ) : (
                <>
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && dashboardData.stats && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Songs</div>
                                    <div className="text-3xl font-black text-gray-900">{dashboardData.stats.totalSongs}</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Total Votes</div>
                                    <div className="text-3xl font-black text-purple-600">{dashboardData.stats.totalVotes}</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-1 sm:col-span-2">
                                    <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Top Artist</div>
                                    <div className="text-xl font-bold text-gray-900 truncate">{dashboardData.stats.topArtist}</div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Top Countries (Votes)</h3>
                                <div className="space-y-3">
                                    {dashboardData.stats.topCountries.length > 0 ? (
                                        dashboardData.stats.topCountries.map((c: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">{i + 1}</span>
                                                    {c.country}
                                                </span>
                                                <span className="text-sm font-bold text-gray-900">{c.count} votes</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No votes yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MY TRACKS TAB */}
                    {activeTab === 'tracks' && (
                        <div className="space-y-4 animate-fade-in">
                            {dashboardData.myTracks.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>You haven't uploaded any tracks yet.</p>
                                </div>
                            ) : (
                                dashboardData.myTracks.map(song => (
                                    <div key={song.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                        {editingTrackId === song.id ? (
                                            // EDIT MODE
                                            <div className="p-4 bg-indigo-50 border-l-4 border-indigo-500">
                                                <h4 className="text-sm font-bold text-indigo-900 uppercase mb-4 flex items-center gap-2">
                                                    <Edit2 size={14} /> Editing: {song.title}
                                                </h4>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Genre</label>
                                                        <select 
                                                            value={editForm.genre}
                                                            onChange={(e) => setEditForm({...editForm, genre: e.target.value as Genre})}
                                                            className="w-full p-2 border border-gray-300 rounded text-sm"
                                                            disabled={song.hasBeenEdited}
                                                        >
                                                            {GENRES.filter(g => g !== 'All').map(g => <option key={g} value={g}>{g}</option>)}
                                                        </select>
                                                        {song.hasBeenEdited && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><Lock size={10}/> Locked (Already Edited)</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Language</label>
                                                        <select 
                                                            value={editForm.language}
                                                            onChange={(e) => setEditForm({...editForm, language: e.target.value})}
                                                            className="w-full p-2 border border-gray-300 rounded text-sm"
                                                            disabled={song.hasBeenEdited}
                                                        >
                                                            {LANGUAGES.filter(l => l !== 'All').map(l => <option key={l} value={l}>{l}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Artist Channels</label>
                                                    <div className="space-y-2">
                                                        {editForm.artistChannels.map(ch => (
                                                            <div key={ch.id} className="flex gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    value={ch.url} 
                                                                    onChange={(e) => handleUpdateChannel(ch.id, e.target.value)}
                                                                    placeholder="https://..."
                                                                    className="flex-1 p-2 border border-gray-300 rounded text-sm"
                                                                />
                                                                <button onClick={() => handleRemoveChannel(ch.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={handleAddChannel} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                                                            <Plus size={12} /> Add Channel
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => setEditingTrackId(null)}
                                                        className="px-4 py-2 text-gray-600 font-bold text-xs uppercase hover:bg-gray-200 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSaveTrack(song.id)}
                                                        disabled={profileState.isSaving}
                                                        className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs uppercase hover:bg-indigo-700 rounded flex items-center gap-2"
                                                    >
                                                        {profileState.isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // VIEW MODE
                                            <div className="p-4 flex items-center gap-4">
                                                <img src={song.coverUrl} alt={song.title} className="w-12 h-12 rounded bg-gray-200 object-cover" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 truncate">{song.title}</h4>
                                                    <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 uppercase font-bold">{song.genre}</span>
                                                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 uppercase font-bold">{song.language}</span>
                                                        {song.isBachAssisted && (
                                                            <span className="bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider" title="Bach Assisted">
                                                               <Music size={10} className="fill-blue-500 text-blue-600"/> Bach
                                                            </span>
                                                        )}
                                                        {song.isAuramasterAssisted && (
                                                            <span className="bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider" title="Post-produced with Auramaster">
                                                               <Sparkles size={10} className="fill-purple-500 text-purple-600"/> Aura
                                                            </span>
                                                        )}
                                                        {song.hasBeenEdited && <span className="text-[10px] text-orange-500 flex items-center gap-0.5"><Edit2 size={8}/> Edited</span>}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col items-end gap-1 mr-4">
                                                    <div className="text-xs font-bold text-gray-900">{song.ratingCount} Votes</div>
                                                    <div className="text-xs text-gray-500">{song.averageRating.toFixed(1)} / 5.0</div>
                                                </div>

                                                <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
                                                    {spotlightConfig?.enabled && (
                                                        <button 
                                                            onClick={() => handleSpotlightClick(song)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-full transition-colors text-xs font-bold uppercase tracking-wider"
                                                            title="Submit to Spotlight"
                                                        >
                                                            <Zap size={14} className="fill-yellow-500" /> Spotlight
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleEditTrackClick(song)}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                                        title="Edit Track"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteTrack(song.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                        title="Delete Track"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* CLAIMS TAB */}
                    {activeTab === 'claims' && (
                        <div className="space-y-4 animate-fade-in">
                            {dashboardData.claims.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Flag size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>You haven't submitted any claims.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Song</th>
                                                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Status</th>
                                                <th className="px-6 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {dashboardData.claims.map(claim => (
                                                <tr key={claim.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{claim.song_title}</div>
                                                        <div className="text-xs text-gray-500">{claim.song_artist}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                            ${claim.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                                              claim.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                                              'bg-yellow-100 text-yellow-700'}
                                                        `}>
                                                            {claim.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                                        {new Date(claim.timestamp).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* NOTIFICATIONS TAB */}
                    {activeTab === 'notifications' && (
                        <div className="space-y-4 animate-fade-in">
                            {dashboardData.notifications.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Bell size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No notifications yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {dashboardData.notifications.map(notification => (
                                        <div 
                                            key={notification.id} 
                                            className={`p-4 rounded-xl border transition-all ${notification.isRead ? 'bg-white border-gray-200 opacity-75' : 'bg-blue-50 border-blue-200 shadow-sm'}`}
                                            onClick={() => !notification.isRead && handleMarkRead(notification.id)}
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <h4 className={`text-sm font-bold mb-1 ${notification.isRead ? 'text-gray-700' : 'text-blue-900'}`}>
                                                        {notification.title || 'Notification'}
                                                    </h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed">{notification.message}</p>
                                                    <span className="text-[10px] text-gray-400 mt-2 block">
                                                        {new Date(notification.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1"></span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in max-w-lg mx-auto">
                            {profileState.isSuccess ? (
                                <div className="p-12 flex flex-col items-center text-center justify-center min-h-[300px]">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                                        <CheckCircle className="text-green-600" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">{t.profile.saved}</h3>
                                </div>
                            ) : (
                                <form onSubmit={handleProfileSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                                            {t.profile.nameLabel}
                                            {!canEditName && (
                                                <span className="flex items-center gap-1 text-red-500 text-[10px]">
                                                    <Lock size={10} /> Locked until {formattedNextUpdate}
                                                </span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                value={profileState.name}
                                                onChange={(e) => setProfileState(prev => ({ ...prev, name: e.target.value }))}
                                                disabled={!canEditName}
                                                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition-all font-medium text-gray-900
                                                    ${!canEditName 
                                                        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                                                        : 'bg-white border-gray-300 focus:ring-2 focus:ring-purple-600 focus:border-transparent'
                                                    }
                                                `}
                                                placeholder="Enter Artist or Label Name"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.profile.countryLabel}</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-3 text-gray-400" size={18} />
                                            <select
                                                value={profileState.country}
                                                onChange={(e) => setProfileState(prev => ({ ...prev, country: e.target.value }))}
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all font-medium bg-white appearance-none text-gray-900"
                                            >
                                                {COUNTRIES.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2 opacity-75">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                            {t.profile.emailLabel}
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="email"
                                                value={user.email || 'no-email@example.com'}
                                                disabled
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Key size={16} /> Security
                                        </h3>
                                        <div className="space-y-3">
                                            <input
                                                type="password"
                                                value={profileState.newPassword}
                                                onChange={(e) => setProfileState(prev => ({ ...prev, newPassword: e.target.value }))}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none transition-all text-sm"
                                                placeholder="New Password"
                                            />
                                            <input
                                                type="password"
                                                value={profileState.confirmPassword}
                                                onChange={(e) => setProfileState(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none transition-all text-sm"
                                                placeholder="Confirm New Password"
                                            />
                                            {profileState.passwordMessage && (
                                                <p className="text-xs text-red-500 font-bold">{profileState.passwordMessage}</p>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={profileState.isSaving}
                                        className="w-full bg-black text-white font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-gray-800 transition-colors mt-4 flex items-center justify-center gap-2"
                                    >
                                        {profileState.isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        {t.profile.save}
                                    </button>
                                </form>
                            )}
                            
                            {onLogout && (
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <button 
                                        onClick={() => { onClose(); onLogout(); }}
                                        className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 font-bold uppercase tracking-wider text-xs transition-colors py-2"
                                    >
                                        <LogOut size={16} /> Log Out
                                    </button>
                                </div>
                            )}
                         </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
