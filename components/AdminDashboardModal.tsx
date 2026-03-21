
import React, { useState, useEffect } from 'react';
import { X, Shield, BarChart3, Users, Upload, Calendar, Music, Activity, UserPlus, Mic2, Search, CheckCircle, AlertTriangle, UserCheck, Settings, ToggleLeft, ToggleRight, Flame, Flag, UploadCloud, Loader2, Zap, Bell, Send, XCircle } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { getAdminStats, searchUsers, toggleAdminStatus, getAdSettings, updateAdSettings, getHotSongSettings, updateHotSongSettings, getClaims, processClaim, getEditorialSettings, updateEditorialSettings, getAdConfig, updateAdConfig, getAdminAds, createCustomAd, updateCustomAd, deleteCustomAd, toggleCustomAd, startBulkUpload, getBulkUploadStatus, getSpotlightConfig, updateSpotlightConfig, createNotification } from '../services/realApiService';
import { AdminStats, User, AdSettings, EditorialConfig, AdConfig, CustomAd, SpotlightConfig } from '../types';
import { useToast } from './Toast';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings' | 'claims' | 'editorial' | 'ads' | 'spotlight' | 'notifications'>('overview');

  // User Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Claims State
  const [claims, setClaims] = useState<any[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  // Settings State
  const [adSettings, setAdSettings] = useState<AdSettings>({ bach: true, auramaster: true });
  const [hotSongSettings, setHotSongSettings] = useState<{ mode: 'random' | 'manual', url: string }>({ mode: 'random', url: '' });
  
  // New Configs State
  const [editorialConfig, setEditorialConfig] = useState<EditorialConfig>({ interval: 17, mode: 'random', manualSongId: '' });
  const [adConfig, setAdConfig] = useState<AdConfig>({ interval: 10, enabled: true });
  const [customAds, setCustomAds] = useState<CustomAd[]>([]);
  const [spotlightConfig, setSpotlightConfig] = useState<SpotlightConfig>({ enabled: true, prices: { day: 1, genre_language: 1, global: 2 } });
  
  // Notification State
  const [notifForm, setNotifForm] = useState({ userId: '', title: '', message: '', type: 'info' });
  const [sendingNotif, setSendingNotif] = useState(false);
  
  // Custom Ad Form State
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<CustomAd | null>(null);
  const [adForm, setAdForm] = useState({ title: '', description: '', url: '', imageUrl: '' });

  // Bulk Upload State
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [playlistStatus, setPlaylistStatus] = useState<string | null>(null);

  // Polling Effect for Bulk Upload
  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
        const job = await getBulkUploadStatus(activeJobId);
        if (job) {
            setPlaylistStatus(job.message);
            if (job.status === 'completed' || job.status === 'failed') {
                setActiveJobId(null); // Stop polling
            }
        } else {
            // Job not found or error
            setActiveJobId(null);
        }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeJobId]);

  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        getAdminStats(),
        getAdSettings(),
        getHotSongSettings(),
        getClaims(),
        getEditorialSettings(),
        getAdConfig(),
        getAdminAds(),
        getSpotlightConfig()
      ]).then(([statsData, settingsData, hotSongData, claimsData, editorialData, adConfigData, adsData, spotlightData]) => {
        setStats(statsData);
        setAdSettings(settingsData);
        setHotSongSettings(hotSongData);
        setClaims(claimsData);
        setEditorialConfig(editorialData);
        setAdConfig(adConfigData);
        setCustomAds(adsData);
        setSpotlightConfig(spotlightData);
        setLoading(false);
      });
      // Reset
      setActiveTab('overview');
      setSearchQuery('');
      setUserResults([]);
      setShowAdForm(false);
      setEditingAd(null);
      setAdForm({ title: '', description: '', url: '', imageUrl: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(async () => {
        if (activeTab === 'users' && searchQuery.length >= 2) {
            setIsSearchingUsers(true);
            const res = await searchUsers(searchQuery);
            setUserResults(res);
            setIsSearchingUsers(false);
        } else if (searchQuery.length < 2) {
            setUserResults([]);
        }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleToggleAdmin = async (userId: string, currentStatus: boolean | undefined) => {
      const newStatus = !currentStatus;
      if (window.confirm(`Are you sure you want to ${newStatus ? 'PROMOTE' : 'REVOKE'} this user's admin privileges?`)) {
          const success = await toggleAdminStatus(userId, newStatus);
          if (success) {
              // Refresh results locally
              setUserResults(prev => prev.map(u => u.id === userId ? { ...u, isSuperAdmin: newStatus } : u));
              showToast(`User admin privileges ${newStatus ? 'promoted' : 'revoked'} successfully!`, 'success');
          } else {
              showToast('Failed to update user admin privileges.', 'error');
          }
      }
  };

  const handleToggleAd = async (key: keyof AdSettings) => {
      const newSettings = { ...adSettings, [key]: !adSettings[key] };
      setAdSettings(newSettings); // Optimistic
      setSavingSettings(true);
      const success = await updateAdSettings(newSettings);
      setSavingSettings(false);
      if (success) {
          showToast(`Ad setting ${key} toggled successfully!`, 'success');
      } else {
          setAdSettings(adSettings); // Revert
          showToast(`Failed to toggle ad setting ${key}.`, 'error');
      }
  };

  const handleHotSongModeChange = async (mode: 'random' | 'manual') => {
      const newSettings = { ...hotSongSettings, mode };
      setHotSongSettings(newSettings);
      setSavingSettings(true);
      const success = await updateHotSongSettings(newSettings.mode, newSettings.url);
      setSavingSettings(false);
      if (success) {
          showToast(`Hot song mode updated to ${mode} successfully!`, 'success');
      } else {
          setHotSongSettings(hotSongSettings); // Revert
          showToast('Failed to update hot song mode.', 'error');
      }
  };

  const handleHotSongUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHotSongSettings({ ...hotSongSettings, url: e.target.value });
  };

  const handleSaveHotSongUrl = async () => {
      setSavingSettings(true);
      const success = await updateHotSongSettings(hotSongSettings.mode, hotSongSettings.url);
      setSavingSettings(false);
      if (success) {
          showToast('Hot song URL saved successfully!', 'success');
      } else {
          showToast('Failed to save hot song URL.', 'error');
      }
  };

  const handleBulkUpload = async () => {
      if (!playlistUrl) return;
      setPlaylistStatus('Starting background job...');
      
      const res = await startBulkUpload(playlistUrl);
      if (res.success && res.jobId) {
          setActiveJobId(res.jobId);
          setPlaylistStatus('Job started. You can close this window.');
          setPlaylistUrl('');
      } else {
          setPlaylistStatus(`Error: ${res.error}`);
      }
  };

  const handleSaveSpotlightConfig = async () => {
      setSavingSettings(true);
      const success = await updateSpotlightConfig(spotlightConfig);
      setSavingSettings(false);
      if (success) {
          showToast('Spotlight configuration saved successfully!', 'success');
      } else {
          showToast('Failed to save spotlight configuration.', 'error');
      }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
      e.preventDefault();
      setSendingNotif(true);
      await createNotification(notifForm);
      setSendingNotif(false);
      setNotifForm({ userId: '', title: '', message: '', type: 'info' });
      showToast('Notification sent!', 'success');
  };

  // New Handlers
  const handleSaveEditorial = async () => {
      setSavingSettings(true);
      const success = await updateEditorialSettings(editorialConfig);
      setSavingSettings(false);
      if (success) {
          showToast('Editorial settings saved successfully!', 'success');
      } else {
          showToast('Failed to save editorial settings.', 'error');
      }
  };

  const handleSaveAdConfig = async () => {
      setSavingSettings(true);
      const success = await updateAdConfig(adConfig);
      setSavingSettings(false);
      if (success) {
          showToast('Ad configuration saved successfully!', 'success');
      } else {
          showToast('Failed to save ad configuration.', 'error');
      }
  };

  const handleAdFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingSettings(true);
      
      let success = false;
      if (editingAd) {
          success = await updateCustomAd(editingAd.id, adForm);
      } else {
          success = await createCustomAd(adForm);
      }
      
      if (success) {
          const updatedAds = await getAdminAds();
          setCustomAds(updatedAds);
          setShowAdForm(false);
          setEditingAd(null);
          setAdForm({ title: '', description: '', url: '', imageUrl: '' });
          showToast(editingAd ? 'Ad updated successfully!' : 'Ad created successfully!', 'success');
      } else {
          showToast('Failed to save ad.', 'error');
      }
      setSavingSettings(false);
  };

  const handleEditAd = (ad: CustomAd) => {
      setEditingAd(ad);
      setAdForm({ title: ad.title, description: ad.description, url: ad.url, imageUrl: ad.imageUrl || '' });
      setShowAdForm(true);
  };

  const handleDeleteAd = async (id: string) => {
      if (confirm('Are you sure you want to delete this ad?')) {
          const success = await deleteCustomAd(id);
          if (success) {
              setCustomAds(prev => prev.filter(a => a.id !== id));
              showToast('Ad deleted successfully!', 'success');
          } else {
              showToast('Failed to delete ad.', 'error');
          }
      }
  };

  const handleToggleCustomAd = async (id: string, currentStatus: boolean) => {
      const success = await toggleCustomAd(id, !currentStatus);
      if (success) {
          setCustomAds(prev => prev.map(a => a.id === id ? { ...a, isActive: !currentStatus } : a));
      } else {
          showToast('Failed to toggle ad status.', 'error');
      }
  };

  const handleProcessClaim = async (claimId: number, action: 'approve' | 'reject') => {
      setLoadingClaims(true);
      const success = await processClaim(claimId, action);
      if (success) {
          const updatedClaims = await getClaims();
          setClaims(updatedClaims);
          showToast(`Claim ${action}d successfully!`, 'success');
      } else {
          showToast(`Failed to ${action} claim.`, 'error');
      }
      setLoadingClaims(false);
  };

  if (!isOpen) return null;

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-black p-6 flex justify-between items-start text-white shrink-0">
          <div>
            <h2 className="text-2xl font-billboard uppercase tracking-wide flex items-center gap-2">
              <Shield className="text-red-500" size={24} />
              {t.admin.title}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'overview' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                Overview
            </button>
            <button 
                onClick={() => setActiveTab('users')}
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'users' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                User Management
            </button>
            <button 
                onClick={() => setActiveTab('claims')}
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'claims' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                Claims
                {claims.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {claims.length}
                    </span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('editorial')}
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'editorial' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                Editorial
            </button>
            <button 
                onClick={() => setActiveTab('ads')}
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'ads' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                Ads
            </button>
            <button 
                onClick={() => setActiveTab('spotlight')}
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'spotlight' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                Spotlight
            </button>
            <button 
                onClick={() => setActiveTab('notifications')}
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'notifications' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                Notifications
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`py-3 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'settings' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
                Settings
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-white flex-1">
          {activeTab === 'overview' ? (
              loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
                </div>
              ) : stats ? (
                <div className="space-y-6">
                
                {/* Row 1: Key Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <Music className="text-blue-500 mb-2" size={28} />
                        <span className="text-3xl font-bold text-gray-900">{stats.totalSongs}</span>
                        <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">{t.admin.totalSongs}</span>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <Activity className="text-purple-500 mb-2" size={28} />
                        <span className="text-3xl font-bold text-gray-900">{stats.totalVotes}</span>
                        <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">{t.admin.totalVotes}</span>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <UserPlus className="text-green-500 mb-2" size={28} />
                        <span className="text-3xl font-bold text-gray-900">{stats.totalUsers}</span>
                        <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">{t.admin.totalUsers}</span>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                        <Upload className="text-orange-500 mb-2" size={28} />
                        <span className="text-3xl font-bold text-gray-900">{stats.activeUploaders}</span>
                        <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">{t.admin.activeUploaders}</span>
                    </div>
                </div>

                {/* Row 2: Top Lists (Users & Artists) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Top Submitters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center gap-2">
                        <Upload className="text-blue-600" size={18} />
                        <h3 className="text-sm font-bold uppercase text-gray-700">{t.admin.topSubmitters}</h3>
                    </div>
                    <div className="p-0">
                        {stats.topSubmitters.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm italic">{t.admin.noData}</div>
                        ) : (
                            <table className="w-full text-sm">
                                <tbody>
                                    {stats.topSubmitters.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 w-8">{idx + 1}.</td>
                                        <td className="px-4 py-3 text-gray-600">{item.username}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{item.count}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    </div>

                    {/* Top Artists (By Votes Received) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center gap-2">
                        <Mic2 className="text-purple-600" size={18} />
                        <h3 className="text-sm font-bold uppercase text-gray-700">{t.admin.topArtists}</h3>
                    </div>
                    <div className="p-0">
                        {stats.topArtistsByVotes.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm italic">{t.admin.noData}</div>
                        ) : (
                            <table className="w-full text-sm">
                                <tbody>
                                    {stats.topArtistsByVotes.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 w-8">{idx + 1}.</td>
                                        <td className="px-4 py-3 text-gray-600">{item.username}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{item.count}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    </div>
                </div>

                {/* Row 3: Country Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Submissions by Country */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center gap-2">
                        <BarChart3 className="text-gray-500" size={18} />
                        <h3 className="text-sm font-bold uppercase text-gray-700">{t.admin.topCountriesSub}</h3>
                    </div>
                    <div className="p-0">
                        {stats.topCountriesBySubmission.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm italic">{t.admin.noData}</div>
                        ) : (
                            <table className="w-full text-sm">
                                <tbody>
                                    {stats.topCountriesBySubmission.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 w-8">{idx + 1}.</td>
                                        <td className="px-4 py-3 text-gray-600">{item.country}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{item.count}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    </div>

                    {/* Votes by Country */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center gap-2">
                        <Users className="text-gray-500" size={18} />
                        <h3 className="text-sm font-bold uppercase text-gray-700">{t.admin.topCountriesVote}</h3>
                    </div>
                    <div className="p-0">
                        {stats.topCountriesByVotes.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm italic">{t.admin.noData}</div>
                        ) : (
                            <table className="w-full text-sm">
                                <tbody>
                                    {stats.topCountriesByVotes.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 w-8">{idx + 1}.</td>
                                        <td className="px-4 py-3 text-gray-600">{item.country}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{item.count}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    </div>
                </div>

                </div>
            ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">{t.admin.noData}</div>
            )
          ) : activeTab === 'users' ? (
              // USER MANAGEMENT TAB
              <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">Search Users to Promote/Demote</label>
                      <div className="relative">
                          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                          <input 
                             type="text" 
                             className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 outline-none"
                             placeholder="Search by username or email..."
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {isSearchingUsers && (
                              <div className="absolute right-3 top-3">
                                  <div className="animate-spin h-5 w-5 border-2 border-red-600 rounded-full border-t-transparent"></div>
                              </div>
                          )}
                      </div>
                  </div>

                  {userResults.length > 0 && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-sm">
                              <thead className="bg-gray-100 text-gray-600 uppercase font-bold text-xs">
                                  <tr>
                                      <th className="px-6 py-3 text-left">User</th>
                                      <th className="px-6 py-3 text-left">Role</th>
                                      <th className="px-6 py-3 text-right">Action</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {userResults.map(user => (
                                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                          <td className="px-6 py-4">
                                              <p className="font-bold text-gray-900">{user.username}</p>
                                              <p className="text-gray-500 text-xs">{user.email || 'No Email'}</p>
                                          </td>
                                          <td className="px-6 py-4">
                                              {user.isSuperAdmin ? (
                                                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1 w-fit">
                                                      <Shield size={12} /> Admin
                                                  </span>
                                              ) : (
                                                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase w-fit">
                                                      User
                                                  </span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              {user.username === 'Melodia Admin' ? (
                                                  <span className="text-gray-400 text-xs italic">Protected</span>
                                              ) : (
                                                  <div className="flex items-center justify-end">
                                                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                                          <button
                                                              onClick={() => user.isSuperAdmin && handleToggleAdmin(user.id, true)}
                                                              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!user.isSuperAdmin ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                                          >
                                                              User
                                                          </button>
                                                          <button
                                                              onClick={() => !user.isSuperAdmin && handleToggleAdmin(user.id, false)}
                                                              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${user.isSuperAdmin ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-900'}`}
                                                          >
                                                              Super Admin
                                                          </button>
                                                      </div>
                                                  </div>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {searchQuery.length >= 2 && !isSearchingUsers && userResults.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                          <p>No users found matching "{searchQuery}"</p>
                      </div>
                  )}
              </div>
          ) : activeTab === 'claims' ? (
              // CLAIMS TAB
              <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Pending Ownership Claims</h3>
                  
                  {claims.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                          <Flag className="mx-auto text-gray-300 mb-2" size={48} />
                          <p className="text-gray-500 font-medium">No pending claims</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {claims.map((claim) => (
                              <div key={claim.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                  <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="font-bold text-gray-900">{claim.song_title}</span>
                                          <span className="text-gray-400 text-sm">by {claim.song_artist}</span>
                                      </div>
                                      <div className="text-sm text-gray-600 mb-2">
                                          Claimed by: <span className="font-semibold text-indigo-600">{claim.claimant_name}</span> ({claim.claimant_email})
                                      </div>
                                      <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700 italic border border-gray-100">
                                          " {claim.proof_text} "
                                      </div>
                                      <div className="mt-2 text-[10px] text-gray-400">
                                          {new Date(claim.timestamp).toLocaleString()}
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 shrink-0">
                                      <button 
                                          onClick={() => handleProcessClaim(claim.id, 'reject')}
                                          disabled={loadingClaims}
                                          className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 disabled:opacity-50"
                                      >
                                          Reject
                                      </button>
                                      <button 
                                          onClick={() => handleProcessClaim(claim.id, 'approve')}
                                          disabled={loadingClaims}
                                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                      >
                                          Approve Transfer
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          ) : activeTab === 'editorial' ? (
              // EDITORIAL TAB
              <div className="space-y-6">
                   <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Flame className="text-purple-500" size={20} />
                          Editorial Spotlight Configuration
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
                          Configure the recurring "Spotlight" blocks in the chart.
                      </p>

                      <div className="space-y-6">
                          {/* Interval Input */}
                          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                                  Recurrence Interval (Positions)
                              </label>
                              <div className="flex gap-2 items-center">
                                  <input 
                                      type="number" 
                                      value={editorialConfig.interval}
                                      onChange={(e) => setEditorialConfig({ ...editorialConfig, interval: parseInt(e.target.value) || 17 })}
                                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                      min="1"
                                  />
                                  <span className="text-sm text-gray-500">positions</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-2">
                                  Example: If set to 17, spotlights will appear at rank 17, 34, 51, etc.
                              </p>
                          </div>

                          {/* Mode Toggle */}
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <div>
                                  <p className="font-bold text-gray-900">Selection Mode</p>
                                  <p className="text-xs text-gray-500">
                                      {editorialConfig.mode === 'random' 
                                          ? 'Automatically selects a random song from the chart.' 
                                          : 'Manually define a specific song to feature.'}
                                  </p>
                              </div>
                              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                  <button
                                      onClick={() => setEditorialConfig({ ...editorialConfig, mode: 'random' })}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${editorialConfig.mode === 'random' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                  >
                                      Random
                                  </button>
                                  <button
                                      onClick={() => setEditorialConfig({ ...editorialConfig, mode: 'manual' })}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${editorialConfig.mode === 'manual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                  >
                                      Manual
                                  </button>
                              </div>
                          </div>

                          {/* Manual URL Input */}
                          {editorialConfig.mode === 'manual' && (
                              <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm animate-fade-in">
                                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                                      Spotify URL of Spotlight Song
                                  </label>
                                  <input 
                                      type="text" 
                                      value={editorialConfig.manualSongId || ''} // Using manualSongId to store URL/ID for now
                                      onChange={(e) => setEditorialConfig({ ...editorialConfig, manualSongId: e.target.value })}
                                      placeholder="https://open.spotify.com/track/..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                  />
                              </div>
                          )}
                          
                          <div className="flex justify-end">
                              <button 
                                  onClick={handleSaveEditorial}
                                  disabled={savingSettings}
                                  className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                              >
                                  {savingSettings ? 'Saving...' : 'Save Configuration'}
                              </button>
                          </div>
                      </div>
                   </div>

                   {/* Hot Song Management Section */}
                   <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Flame className="text-red-500" size={20} />
                          Hot Song Configuration
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
                          Choose how the "Hot Song" (Rank #49) is selected.
                      </p>

                      <div className="space-y-6">
                          {/* Mode Toggle */}
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <div>
                                  <p className="font-bold text-gray-900">Selection Mode</p>
                                  <p className="text-xs text-gray-500">
                                      {hotSongSettings.mode === 'random' 
                                          ? 'Automatically selects a random song from the last 7 days.' 
                                          : 'Manually define a specific song to feature.'}
                                  </p>
                              </div>
                              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                  <button
                                      onClick={() => handleHotSongModeChange('random')}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${hotSongSettings.mode === 'random' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                  >
                                      Random
                                  </button>
                                  <button
                                      onClick={() => handleHotSongModeChange('manual')}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${hotSongSettings.mode === 'manual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                  >
                                      Manual
                                  </button>
                              </div>
                          </div>

                          {/* Manual URL Input */}
                          {hotSongSettings.mode === 'manual' && (
                              <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm animate-fade-in">
                                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                                      Spotify URL of Hot Song
                                  </label>
                                  <div className="flex gap-2">
                                      <input 
                                          type="text" 
                                          value={hotSongSettings.url}
                                          onChange={handleHotSongUrlChange}
                                          placeholder="https://open.spotify.com/track/..."
                                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                      />
                                      <button 
                                          onClick={handleSaveHotSongUrl}
                                          disabled={savingSettings}
                                          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                                      >
                                          {savingSettings ? 'Saving...' : 'Save'}
                                      </button>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-2 italic">
                                      Note: The song must already exist in the chart database.
                                  </p>
                              </div>
                          )}
                      </div>
                   </div>

                   {/* Bulk Upload Section */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <UploadCloud size={20} className="text-blue-600" /> 
                            Bulk Playlist Upload
                        </h3>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <p className="text-xs text-blue-700 mb-3">
                                Paste a Spotify Playlist URL to automatically add all tracks (up to 100). 
                                <br/>
                                <span className="font-bold">Note:</span> This process runs in the background (1 song every 30s). You can close this window.
                            </p>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={playlistUrl}
                                    onChange={(e) => setPlaylistUrl(e.target.value)}
                                    placeholder="https://open.spotify.com/playlist/..."
                                    className="flex-1 px-3 py-2 border border-blue-200 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={!!activeJobId}
                                />
                                <button 
                                    type="button"
                                    onClick={handleBulkUpload}
                                    disabled={!!activeJobId || !playlistUrl}
                                    className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {!!activeJobId ? <Loader2 className="animate-spin" size={14} /> : 'Start'}
                                </button>
                            </div>
                            {playlistStatus && (
                                <p className="text-[10px] font-mono mt-2 text-blue-800">
                                    {playlistStatus}
                                </p>
                            )}
                        </div>
                    </div>
              </div>
          ) : activeTab === 'ads' ? (
              // ADS TAB
              <div className="space-y-6">
                  {/* Global Config */}
                   <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Settings size={20} />
                          Ad Configuration
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                                  Display Interval
                              </label>
                              <div className="flex gap-2">
                                  {[6, 10, 20].map(val => (
                                      <button
                                          key={val}
                                          onClick={() => setAdConfig({ ...adConfig, interval: val })}
                                          className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${adConfig.interval === val ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                      >
                                          Every {val}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <div>
                                  <p className="font-bold text-gray-900">Enable Ads</p>
                                  <p className="text-xs text-gray-500">Toggle all ad injections</p>
                              </div>
                              <button 
                                onClick={() => setAdConfig({ ...adConfig, enabled: !adConfig.enabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${adConfig.enabled ? 'bg-green-600' : 'bg-gray-200'}`}
                              >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                          </div>
                      </div>
                      
                      <div className="flex justify-end">
                          <button 
                              onClick={handleSaveAdConfig}
                              disabled={savingSettings}
                              className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
                          >
                              {savingSettings ? 'Saving...' : 'Save Config'}
                          </button>
                      </div>
                   </div>

                   {/* Custom Ads List */}
                   <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-gray-900">Custom Ads</h3>
                          <button 
                              onClick={() => { setShowAdForm(true); setEditingAd(null); setAdForm({ title: '', description: '', url: '', imageUrl: '' }); }}
                              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
                          >
                              <Upload size={16} /> New Ad
                          </button>
                      </div>

                      {showAdForm && (
                          <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm mb-6 animate-fade-in">
                              <h4 className="font-bold text-gray-900 mb-4">{editingAd ? 'Edit Ad' : 'Create New Ad'}</h4>
                              <form onSubmit={handleAdFormSubmit} className="space-y-4">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Title</label>
                                      <input 
                                          type="text" 
                                          required
                                          value={adForm.title}
                                          onChange={e => setAdForm({...adForm, title: e.target.value})}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                                      <input 
                                          type="text" 
                                          value={adForm.description}
                                          onChange={e => setAdForm({...adForm, description: e.target.value})}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target URL</label>
                                      <input 
                                          type="url" 
                                          required
                                          value={adForm.url}
                                          onChange={e => setAdForm({...adForm, url: e.target.value})}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Image URL (Optional)</label>
                                      <input 
                                          type="url" 
                                          value={adForm.imageUrl}
                                          onChange={e => setAdForm({...adForm, imageUrl: e.target.value})}
                                          placeholder="https://..."
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      />
                                  </div>
                                  <div className="flex justify-end gap-2 pt-2">
                                      <button 
                                          type="button"
                                          onClick={() => setShowAdForm(false)}
                                          className="px-4 py-2 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-lg"
                                      >
                                          Cancel
                                      </button>
                                      <button 
                                          type="submit"
                                          disabled={savingSettings}
                                          className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700"
                                      >
                                          {savingSettings ? 'Saving...' : 'Save Ad'}
                                      </button>
                                  </div>
                              </form>
                          </div>
                      )}

                      <div className="space-y-3">
                          {customAds.length === 0 ? (
                              <p className="text-center text-gray-400 py-8 italic">No custom ads created yet.</p>
                          ) : (
                              customAds.map(ad => (
                                  <div key={ad.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between group">
                                      <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                              {ad.imageUrl ? (
                                                  <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                                              ) : (
                                                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">AD</div>
                                              )}
                                          </div>
                                          <div>
                                              <h4 className="font-bold text-gray-900 text-sm">{ad.title}</h4>
                                              <p className="text-xs text-gray-500 truncate max-w-[200px]">{ad.url}</p>
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                          <button 
                                              onClick={() => handleToggleCustomAd(ad.id, ad.isActive)}
                                              className={`text-xs font-bold px-2 py-1 rounded uppercase ${ad.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                          >
                                              {ad.isActive ? 'Active' : 'Inactive'}
                                          </button>
                                          <button 
                                              onClick={() => handleEditAd(ad)}
                                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                          >
                                              <Settings size={16} />
                                          </button>
                                          <button 
                                              onClick={() => handleDeleteAd(ad.id)}
                                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                          >
                                              <X size={16} />
                                          </button>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                   </div>
              </div>
          ) : activeTab === 'spotlight' ? (
              // SPOTLIGHT TAB
              <div className="space-y-6">
                   <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Zap className="text-amber-500" size={20} />
                          Spotlight Configuration
                      </h3>
                      
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
                          <div>
                              <p className="font-bold text-gray-900">Enable Spotlight Submissions</p>
                              <p className="text-xs text-gray-500">Allow users to submit songs for spotlight</p>
                          </div>
                          <button 
                            onClick={async () => {
                                const newConfig = { ...spotlightConfig, enabled: !spotlightConfig.enabled };
                                setSpotlightConfig(newConfig);
                                setSavingSettings(true);
                                const success = await updateSpotlightConfig(newConfig);
                                setSavingSettings(false);
                                if (success) {
                                    showToast(`Spotlight submissions ${newConfig.enabled ? 'enabled' : 'disabled'} successfully!`, 'success');
                                } else {
                                    setSpotlightConfig(spotlightConfig); // Revert
                                    showToast('Failed to toggle spotlight submissions.', 'error');
                                }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${spotlightConfig.enabled ? 'bg-amber-500' : 'bg-gray-200'}`}
                          >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${spotlightConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Price Per Day ($)</label>
                              <input 
                                  type="number" 
                                  value={spotlightConfig.prices.day}
                                  onChange={(e) => setSpotlightConfig({ ...spotlightConfig, prices: { ...spotlightConfig.prices, day: parseFloat(e.target.value) || 0 } })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Genre/Lang Base Price ($)</label>
                              <input 
                                  type="number" 
                                  value={spotlightConfig.prices.genre_language}
                                  onChange={(e) => setSpotlightConfig({ ...spotlightConfig, prices: { ...spotlightConfig.prices, genre_language: parseFloat(e.target.value) || 0 } })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Global Base Price ($)</label>
                              <input 
                                  type="number" 
                                  value={spotlightConfig.prices.global}
                                  onChange={(e) => setSpotlightConfig({ ...spotlightConfig, prices: { ...spotlightConfig.prices, global: parseFloat(e.target.value) || 0 } })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                          </div>
                      </div>

                      <div className="mb-6">
                          <h4 className="font-bold text-gray-900 text-sm mb-2">Submission Limits</h4>
                          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Songs Required on Chart per Spotlight</label>
                              <div className="flex items-center gap-2">
                                  <input 
                                      type="number" 
                                      value={spotlightConfig.chart_limit || 0}
                                      onChange={(e) => setSpotlightConfig({ ...spotlightConfig, chart_limit: parseInt(e.target.value) || 0 })}
                                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      min="0"
                                  />
                                  <span className="text-sm text-gray-500">songs</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                  Example: If set to 10, a user needs 10 songs on the chart to submit 1 spotlight. Set to 0 to disable.
                              </p>
                          </div>
                      </div>

                      <div className="flex justify-end">
                          <button 
                              onClick={handleSaveSpotlightConfig}
                              disabled={savingSettings}
                              className="bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50"
                          >
                              {savingSettings ? 'Saving...' : 'Save Configuration'}
                          </button>
                      </div>
                   </div>
              </div>
          ) : activeTab === 'notifications' ? (
              // NOTIFICATIONS TAB
              <div className="space-y-6">
                   <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Bell className="text-blue-500" size={20} />
                          Send Notification
                      </h3>
                      
                      <form onSubmit={handleSendNotification} className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target User ID (Optional)</label>
                              <input 
                                  type="text" 
                                  value={notifForm.userId}
                                  onChange={(e) => setNotifForm({ ...notifForm, userId: e.target.value })}
                                  placeholder="Leave blank for Global Notification"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Title</label>
                              <input 
                                  type="text" 
                                  required
                                  value={notifForm.title}
                                  onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Message</label>
                              <textarea 
                                  required
                                  value={notifForm.message}
                                  onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Type</label>
                              <select 
                                  value={notifForm.type}
                                  onChange={(e) => setNotifForm({ ...notifForm, type: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                  <option value="info">Info</option>
                                  <option value="success">Success</option>
                                  <option value="warning">Warning</option>
                                  <option value="error">Error</option>
                              </select>
                          </div>
                          
                          <div className="flex justify-end">
                              <button 
                                  type="submit"
                                  disabled={sendingNotif}
                                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                  <Send size={16} />
                                  {sendingNotif ? 'Sending...' : 'Send Notification'}
                              </button>
                          </div>
                      </form>
                   </div>
              </div>
          ) : (
              // SETTINGS TAB
              <div className="space-y-6">
                   <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Settings size={20} />
                          Ad Management
                      </h3>
                      <p className="text-sm text-gray-500 mb-6">
                          Toggle visibility for sponsored content in the chart.
                      </p>

                      <div className="space-y-4">
                          {/* Bach Toggle */}
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
                                      BACH
                                  </div>
                                  <div>
                                      <p className="font-bold text-gray-900">Bach Sponsorship</p>
                                      <p className="text-xs text-gray-500">Pre-production AI tool ad</p>
                                  </div>
                              </div>
                              <button 
                                onClick={() => handleToggleAd('bach')}
                                disabled={savingSettings}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${adSettings.bach ? 'bg-indigo-600' : 'bg-gray-200'}`}
                              >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adSettings.bach ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                          </div>

                          {/* Auramaster Toggle */}
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-xs">
                                      AURA
                                  </div>
                                  <div>
                                      <p className="font-bold text-gray-900">Auramaster Sponsorship</p>
                                      <p className="text-xs text-gray-500">Post-production AI tool ad</p>
                                  </div>
                              </div>
                              <button 
                                onClick={() => handleToggleAd('auramaster')}
                                disabled={savingSettings}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${adSettings.auramaster ? 'bg-purple-600' : 'bg-gray-200'}`}
                              >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adSettings.auramaster ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                          </div>
                      </div>
                   </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardModal;
