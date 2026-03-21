
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import SongRow from './components/SongRow';
import LandingPage from './components/LandingPage';
import CookieConsent from './components/CookieConsent';
import LegalPage from './components/LegalPage';
import { Song, User, Genre, TimeRange, SpotifySearchResult, Language, ArtistChannel } from './types';
import { Loader2, Music, ChevronDown, ChevronUp, Flame, Sparkles } from 'lucide-react';
import { useTranslation } from './contexts/LanguageContext';

// --- SERVICE IMPORTS ---
import { fetchSongs, fetchFilters, rateSong, addSong, updateSongMetadata, transferSong, updateUserProfile, loginAPI, registerAPI, getSessionAPI, logoutAPI, getAdSettings, getHotSong, getEditorialSettings, getAdConfig, getCustomAds, getActiveSpotlight, getNotifications, getSpotlightConfig } from './services/realApiService';
import AdRow from './components/AdRow';
import { EditorialConfig, AdConfig, CustomAd, SpotlightConfig } from './types';
import { useToast } from './components/Toast';

// --- Code Splitting: Lazy Load Modals ---
const AuthModal = lazy(() => import('./components/AuthModal'));
const AddSongModal = lazy(() => import('./components/AddSongModal'));
const TransferModal = lazy(() => import('./components/TransferModal'));
const UserProfileModal = lazy(() => import('./components/UserProfileModal'));
const AdminDashboardModal = lazy(() => import('./components/AdminDashboardModal'));

const App: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  // Navigation State
  const [showLanding, setShowLanding] = useState(window.location.pathname === '/' || window.location.pathname === '/index.html');
  const [activeLegalPage, setActiveLegalPage] = useState<'privacy' | 'terms' | null>(
    window.location.pathname === '/privacypolicy' ? 'privacy' : 
    window.location.pathname === '/terms' ? 'terms' : null
  );

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  // Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [selectedSongToTransfer, setSelectedSongToTransfer] = useState<Song | null>(null);
  const [initialSpotlightSong, setInitialSpotlightSong] = useState<Song | null>(null);

  // Data State
  const [songs, setSongs] = useState<Song[]>([]);
  const [hotSong, setHotSong] = useState<Song | null>(null);
  const [activeSpotlightSong, setActiveSpotlightSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Ad State
  const [adSettings, setAdSettings] = useState<{bach: boolean, auramaster: boolean}>({ bach: true, auramaster: true });
  const [adConfig, setAdConfig] = useState<AdConfig>({ interval: 10, enabled: true });
  const [customAds, setCustomAds] = useState<CustomAd[]>([]);
  const [editorialConfig, setEditorialConfig] = useState<EditorialConfig>({ interval: 17, mode: 'random', manualSongId: '' });
  const [editorialSong, setEditorialSong] = useState<Song | null>(null); // For manual mode
  const [spotlightConfig, setSpotlightConfig] = useState<SpotlightConfig>({ enabled: true, prices: { day: 1, genre_language: 1, global: 2 } });

  // Filter State
  const [currentGenre, setCurrentGenre] = useState<Genre>('All');
  const [currentLanguage, setCurrentLanguage] = useState<Language>('All');
  const [timeRange, setTimeRange] = useState<TimeRange>('all-time');
  const [showMyTracks, setShowMyTracks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(['All']);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>(['All']);
  
  // UI State
  const [showGenres, setShowGenres] = useState(false);

  // Observer for Infinite Scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const lastSongElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // --- NAVIGATION HELPERS ---
  const navigateToCharts = () => {
    setShowLanding(false);
    setActiveLegalPage(null);
    // Just reset filters, we are already in the app view
    setShowMyTracks(false);
    setCurrentGenre('All');
    setCurrentLanguage('All');
    setTimeRange('all-time');
    setSearchQuery('');
    window.history.pushState({}, '', '/charts');
  };

  const navigateToLegal = (page: 'privacy' | 'terms') => {
    setShowLanding(false);
    setActiveLegalPage(page);
    window.history.pushState({}, '', page === 'privacy' ? '/privacypolicy' : '/terms');
  };

  // --- 1. SESSION RESTORATION (DATA PERSISTENCE) ---
  useEffect(() => {
      const restoreSession = async () => {
          const restoredUser = await getSessionAPI();
          if (restoredUser) {
              setUser(restoredUser);
          }
          setAuthLoading(false);
      };
      restoreSession();
      
      // Load Ad Settings & Configs
      Promise.all([
        getAdSettings(),
        getAdConfig(),
        getCustomAds(),
        getEditorialSettings(),
        getSpotlightConfig()
      ]).then(([settings, config, ads, editorial, spotlight]) => {
        setAdSettings(settings);
        setAdConfig(config);
        setCustomAds(ads);
        setEditorialConfig(editorial);
        setSpotlightConfig(spotlight);
      });

      // Load Hot Song (Legacy/Manual Editorial)
      getHotSong().then(song => {
        if (song) setHotSong(song);
      });

      // Load Active Spotlight
      getActiveSpotlight().then(data => {
          if (data && data.active) {
              // Transform to Song object if needed, or if API returns mixed data
              // The API returns { active: { ...submission_fields, title, artist, ... } }
              // We need to map it to Song interface
              const s = data.active;
              const song: Song = {
                  id: s.track_id,
                  title: s.title,
                  artist: s.artist,
                  coverUrl: s.cover_url || `https://picsum.photos/seed/${s.track_id}/300/300`,
                  spotifyUrl: s.spotify_url,
                  previewUrl: '', // Mock
                  genre: 'Pop', // Default or fetch
                  language: 'English', // Default or fetch
                  uploaderId: s.user_id,
                  ratingCount: 0, // Mock or fetch
                  averageRating: 0, // Mock or fetch
                  spotifyPopularity: 0,
                  votedUserIds: [],
                  rank: 0,
                  lastWeekRank: 0,
                  peakRank: 0,
                  weeksOnChart: 0,
                  debutRank: 0,
                  debutDate: 0,
                  timestamp: 0
              };
              setActiveSpotlightSong(song);
          }
      });
  }, []);

  // Fetch Notification Count
  useEffect(() => {
    if (user) {
      const fetchNotifs = async () => {
        const notifs = await getNotifications();
        // Count unread notifications
        const unreadCount = notifs.filter(n => !n.isRead).length;
        setNotificationCount(unreadCount);
      };
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 60000); // Check every minute
      return () => clearInterval(interval);
    } else {
      setNotificationCount(0);
    }
  }, [user]);

  // --- 2. DATA LOADING ---
  const loadSongs = useCallback(async (reset: boolean = false) => {
    setLoading(true);
    const targetPage = reset ? 1 : page;
    const filterId = showMyTracks && user ? user.id : undefined;
    
    // Fetch filters if we are resetting (e.g. initial load or filter change)
    if (reset) {
        fetchFilters(filterId).then(({ languages, genres }) => {
            // Ensure 'All' is always first, and sort the rest alphabetically
            const sortedLangs = ['All', ...languages.filter(l => l !== 'All').sort()];
            const sortedGenres = ['All', ...genres.filter(g => g !== 'All').sort()];
            setAvailableLanguages(sortedLangs);
            setAvailableGenres(sortedGenres);
        });
    }

    const { data, hasMore: moreAvailable } = await fetchSongs(
      targetPage, 
      15, 
      timeRange, 
      currentGenre, 
      currentLanguage,
      filterId,
      searchQuery
    );
    
    setSongs(prev => {
      return targetPage === 1 ? data : [...prev, ...data];
    });
    setHasMore(moreAvailable);
    setLoading(false);
  }, [page, timeRange, currentGenre, currentLanguage, showMyTracks, user, searchQuery]);

  // Effect: Handle Filter Changes
  useEffect(() => {
      setSongs([]);
      setPage(1);
      setHasMore(true);
      loadSongs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGenre, currentLanguage, timeRange, showMyTracks, searchQuery]);

  // Effect: Handle Pagination
  useEffect(() => {
    if (page > 1) {
        loadSongs(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); 

  // --- ACTIONS ---

  const handleLogin = async (username: string, password?: string, email?: string, isRegister?: boolean): Promise<boolean> => {
      let result;
      if (isRegister && email) {
          result = await registerAPI(username, email, password);
      } else {
          result = await loginAPI(username, password);
      }

      if (result) {
          setUser(result.user);
          localStorage.setItem('melodia_auth_token', result.token);
          setShowAuthModal(false);
          showToast(isRegister ? "Account created successfully!" : "Logged in successfully!", "success");
          return true;
      } else {
          showToast("Login Failed. Please check credentials or try a different username.", "error");
          return false;
      }
  };

  const handleLogout = async () => {
      await logoutAPI();
      setUser(null);
      localStorage.removeItem('melodia_auth_token');
      setShowProfileModal(false);
      setShowMyTracks(false); // Reset view
  };

  const handleToggleAdmin = () => {
    if (user) {
        setUser({ ...user, isSuperAdmin: !user.isSuperAdmin });
    }
  };

  const handleUpdateProfile = async (userId: string, name: string, country: string) => {
      const updatedUser = await updateUserProfile(userId, name, country);
      if (updatedUser) {
          setUser(updatedUser);
      }
  };

  const handleUpload = async (url: string, language: string, metadata?: SpotifySearchResult, subGenre?: string, artistChannels?: ArtistChannel[], isBachAssisted?: boolean, isAuramasterAssisted?: boolean): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: 'User not logged in' };
    
    setLoading(true);
    const result = await addSong(url, user, language, metadata, subGenre, artistChannels, isBachAssisted, isAuramasterAssisted);
    setLoading(false); 
    
    if (result.success) {
        // Refresh Logic
        const isAlreadyFresh = timeRange === 'fresh';
        const isAlreadyAll = currentGenre === 'All' && currentLanguage === 'All';

        if (isAlreadyFresh && isAlreadyAll && !showMyTracks) {
            loadSongs(true);
        } else {
            if (showMyTracks) setShowMyTracks(false);
            setCurrentGenre('All');
            setCurrentLanguage('All');
            setTimeRange('fresh');
        }
    }
    return result;
  };

  const handleUpdateSong = async (id: string, title: string, artist: string, genre: Genre, language: string, subGenre: string, artistChannels: ArtistChannel[]) => {
    const updated = await updateSongMetadata(id, title, artist, genre, language, subGenre, artistChannels);
    if (updated) {
        if (updated.genre !== currentGenre && currentGenre !== 'All') {
            loadSongs(true); 
        } else {
             setSongs(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
        }
    }
  }

  const handleRate = async (id: string, rating: number) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Optimistic UI
    setSongs(prevSongs => {
        // 1. Update the rated song
        const updatedSongs = prevSongs.map(s => {
            if (s.id === id) {
                const currentTotalScore = s.averageRating * s.ratingCount;
                const newCount = s.ratingCount + 1;
                const newAvg = (currentTotalScore + rating) / newCount;
                
                return {
                    ...s,
                    ratingCount: newCount,
                    averageRating: parseFloat(newAvg.toFixed(1)), 
                    votedUserIds: [...(s.votedUserIds || []), user.id]
                };
            }
            return s;
        });

        // 2. Re-sort based on new stats (Avg Rating DESC, Vote Count DESC)
        // Only re-sort if we are in the default view (not "fresh" or specific filters that might override this)
        // However, the user request implies they want to see the rank change immediately.
        // Assuming the main view is the chart view.
        if (timeRange !== 'fresh') {
             updatedSongs.sort((a, b) => {
                if (b.averageRating !== a.averageRating) {
                    return b.averageRating - a.averageRating;
                }
                return b.ratingCount - a.ratingCount;
            });
        }

        // 3. Re-calculate Ranks
        // Note: This only re-ranks the currently loaded songs. 
        // If pagination is involved, this is a local approximation.
        return updatedSongs.map((s, index) => ({
            ...s,
            rank: index + 1 // Rank is 1-based index
        }));
    });

    await rateSong(id, rating, user.id, user.isSuperAdmin);
  };

  const handleTransferClick = (song: Song) => {
      setSelectedSongToTransfer(song);
      setShowTransferModal(true);
  };

  const handleSpotlightClick = (song: Song) => {
      setInitialSpotlightSong(song);
      setShowProfileModal(true);
  };

  const handleTransferConfirm = async (newUserId: string) => {
      if (selectedSongToTransfer) {
          const success = await transferSong(selectedSongToTransfer.id, newUserId);
          if (success) {
              if (showMyTracks) {
                  setSongs(prev => prev.filter(s => s.id !== selectedSongToTransfer.id));
              }
              showToast('Song transferred successfully!', 'success');
          } else {
              showToast('Failed to transfer song.', 'error');
          }
      }
  };

  const handleTabChange = (range: TimeRange | 'my-tracks') => {
      if (range === 'my-tracks') {
          if (!user) {
              setShowAuthModal(true);
              return;
          }
          setShowMyTracks(true);
      } else {
          setShowMyTracks(false);
          setTimeRange(range);
      }
  };

  const handleGenreSelect = (g: Genre) => {
      setCurrentGenre(g);
      setShowGenres(false);
  };

  const getTimeRangeLabel = (tr: TimeRange) => {
    if (tr === 'all-time') return t.home.time.allTime;
    if (tr === 'month') return t.home.time.month;
    if (tr === 'week') return t.home.time.week;
    if (tr === 'fresh') return t.home.time.fresh;
    return tr;
  }

  // Loading Screen for Session Check
  if (authLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="animate-spin text-purple-600 mb-4" size={48} />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Loading Melodia...</p>
          </div>
      )
  }

  if (showLanding) {
    return <LandingPage onEnter={navigateToCharts} />;
  }

  if (activeLegalPage) {
    const isPrivacy = activeLegalPage === 'privacy';
    return (
      <LegalPage 
        onGoHome={navigateToCharts}
        title={isPrivacy ? "One for All Privacy Policy" : "Terms of Service: Melodia.top"}
        content={isPrivacy ? (
          <>
            <p>This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from https://melodia.top (hereinafter referred to as the “Site”).</p>
            <h2 className="text-xl font-bold mt-6 mb-2">PERSONAL INFORMATION WE COLLECT</h2>
            <p>When you visit the Site, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device. Additionally, as you browse the Site, we collect information about the individual web pages or products that you view, what websites or search terms referred you to the Site, and information about how you interact with the Site. We refer to this automatically-collected information as “Device Information.”</p>
            <p>We collect Device Information using the following technologies:</p>
            <h3 className="text-lg font-bold mt-4 mb-2">COOKIES</h3>
            <p>Here is a list of cookies that we use. We’ve listed them here so you can choose whether you want to opt-out of them or not.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>_session_id: unique token, sessional. Allows Shopify to store information about your session (referrer, landing page, etc).</li>
              <li>_shopify_visit: no data held, persistent for 30 minutes from the last visit. Used by our website provider’s internal stats tracker to record the number of visits.</li>
              <li>_shopify_uniq: no data held, expires midnight (relative to the visitor) of the next day. Counts the number of visits to a store by a single customer.</li>
              <li>cart: unique token, persistent for 2 weeks. Stores information about the contents of your cart.</li>
              <li>_secure_session_id: unique token, sessional.</li>
              <li>storefront_digest: unique token, indefinite. If the shop has a password, this is used to determine if the current visitor has access.</li>
            </ul>
            <p className="mt-4">“Log files” track actions occurring on the Site, and collect data including your IP address, browser type, Internet service provider, referring/exit pages, and date/time stamps.</p>
            <p>“Web beacons,” “tags,” and “pixels” are electronic files used to record information about how you browse the Site.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">HOW DO WE USE YOUR PERSONAL INFORMATION?</h2>
            <p>We use the Order Information that we collect generally to fulfill any orders placed through the Site (including processing your payment information, arranging for shipping, and providing you with invoices and/or order confirmations). Additionally, we use this Order Information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Communicate with you;</li>
              <li>Screen our orders for potential risk or fraud; and</li>
              <li>When in line with the preferences you have shared with us, provide you with information or advertising relating to our products or services.</li>
            </ul>
            <p className="mt-4">We use the Device Information that we collect to help us screen for potential risk and fraud (in particular, your IP address), and more generally to improve and optimize our Site (for example, by generating analytics about how our customers browse and interact with the Site, and to assess the success of our marketing and advertising campaigns).</p>
            <h2 className="text-xl font-bold mt-6 mb-2">SHARING YOUR PERSONAL INFORMATION</h2>
            <p>We share your Personal Information with third parties to help us use your Personal Information, as described above. For example, we use Shopify to power our online store. You can read more about how Shopify uses your Personal Information here: https://www.shopify.com/legal/privacy. We also use Google Analytics to help us understand how our customers use the Site. You can read more about how Google uses your Personal Information here: https://www.google.com/intl/en/policies/privacy/. You can also opt-out of Google Analytics here: https://tools.google.com/dlpage/gaoptout.</p>
            <p className="mt-4">Finally, we may also share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">BEHAVIOURAL ADVERTISING</h2>
            <p>As described above, we use your Personal Information to provide you with targeted advertisements or marketing communications we believe may be of interest to you. For more information about how targeted advertising works, you can visit the Network Advertising Initiative’s (“NAI”) educational page at http://www.networkadvertising.org/understanding-online-advertising/how-does-it-work.</p>
            <p className="mt-4">You can opt out of targeted advertising by using the links below:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>FACEBOOK: https://www.facebook.com/settings/?tab=ads</li>
              <li>GOOGLE: https://adssettings.google.com/authenticated?hl=en</li>
              <li>BING: https://about.ads.microsoft.com/en-us/resources/policies/personalized-ads</li>
            </ul>
            <h2 className="text-xl font-bold mt-6 mb-2">DO NOT TRACK</h2>
            <p>Please note that we do not alter our Site’s data collection and use practices when we see a Do Not Track signal from your browser.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">YOUR RIGHTS</h2>
            <p>If you are a European resident, you have the right to access personal information we hold about you and to ask that your personal information be corrected, updated, or deleted. If you would like to exercise this right, please contact us through the contact information below.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">DATA RETENTION</h2>
            <p>When you place an order through the Site, we will maintain your Order Information for our records unless and until you ask us to delete this information.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">CHANGES</h2>
            <p>We may update this privacy policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal or regulatory reasons.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">CONTACT US</h2>
            <p>For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by e-mail at agency.oneforall@gmail.com</p>
          </>
        ) : (
          <>
            <p><strong>Last Updated: March 2026</strong></p>
            <h2 className="text-xl font-bold mt-6 mb-2">1. Description of Service</h2>
            <p>Melodia.top is an open chart platform for AI-generated music distributed on Spotify. The platform provides a dynamic ranking system based on global performance, language, and genre.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">2. User Accounts and Artist Information</h2>
            <p>Users who upload or claim songs are encouraged to provide relevant artist information.</p>
            <p><strong>Artist Profiles:</strong> You may include social media links, biographies, and other relevant metadata.</p>
            <p><strong>Accuracy:</strong> You are responsible for ensuring that all links and information provided are accurate and do not violate the terms of service of third-party platforms (e.g., Instagram, X, Spotify).</p>
            <p><strong>Responsibility:</strong> Melodia.top is not responsible for the content hosted on external social media links provided by users.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">3. Ranking and Voting System</h2>
            <p>Our ranking system is designed to highlight the best AI music through Global, Language-based, and Genre-specific charts.</p>
            <p><strong>Voting Restrictions:</strong> To ensure a fair environment, users are strictly prohibited from voting for their own songs.</p>
            <p><strong>Fair Play:</strong> Any attempt to manipulate rankings through self-voting, botting, or creating multiple accounts will result in the immediate disqualification of the track and a potential permanent ban of the user account.</p>
            <p><strong>Algorithm:</strong> Melodia.top reserves the right to adjust ranking algorithms to maintain the integrity of the charts.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">4. Featured Content and Spotlight</h2>
            <p>Melodia.top offers opportunities for increased visibility through "Featured" placements and "Spotlight" positions.</p>
            <p><strong>Access:</strong> These promotional spots may be granted through organic performance (free/earned access) or through optional paid services.</p>
            <p><strong>Non-Mandatory:</strong> Paid promotion is entirely optional. Making a payment is not a requirement to use the core features of the Site (uploading, claiming, or organic ranking).</p>
            <p><strong>No Guarantee of Success:</strong> While "Featured" or "Spotlight" status increases visibility, Melodia.top does not guarantee a specific number of plays, followers, or external engagement. All payments for promotional services are non-refundable unless stated otherwise.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">5. Intellectual Property and Claims</h2>
            <p><strong>Ownership:</strong> You retain all rights to your AI-generated content as per your provider's terms.</p>
            <p><strong>Claiming Songs:</strong> If your song is already on the chart, you may use the "Claim" feature. We may require proof of ownership, such as access to your Spotify for Artists dashboard.</p>
            <p><strong>License:</strong> By listing a song, you grant Melodia.top a royalty-free license to display your cover art, artist name, and track snippets for promotional and ranking purposes.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">6. Disclaimers and Liability</h2>
            <p>Melodia.top is an independent platform and is not affiliated with, endorsed by, or sponsored by Spotify. We are not liable for any changes in Spotify's API or distribution policies that may affect the visibility of your tracks.</p>
            <h2 className="text-xl font-bold mt-6 mb-2">7. Contact Information</h2>
            <p>For inquiries regarding "Spotlight" placements or to report voting abuse, contact us at: agency.oneforall@gmail.com</p>
          </>
        )}
      />
    );
  }

  // --- RENDER MAIN APP ---
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 animate-fade-in text-gray-900">
      <Navbar 
        user={user} 
        onLoginClick={() => setShowAuthModal(true)} 
        onUploadClick={() => user ? setShowAddModal(true) : setShowAuthModal(true)}
        currentGenre={currentGenre}
        onSearch={setSearchQuery}
        onToggleAdmin={handleToggleAdmin}
        onProfileClick={() => setShowProfileModal(true)}
        onDashboardClick={() => setShowProfileModal(true)}
        onAdminDashboardClick={() => setShowAdminDashboard(true)}
        onHomeClick={navigateToCharts}
        notificationCount={notificationCount}
      />

      {/* Sticky Filters Header */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center">
          
          {/* Row 1: Language Tabs - Centered */}
          <div className="flex items-center justify-center gap-6 py-3 w-full relative">
            {availableLanguages.map(lang => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`text-sm font-bold uppercase tracking-widest px-2 py-1 transition-colors relative
                  ${currentLanguage === lang 
                    ? 'text-black' 
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {lang === 'All' ? t.common.global : lang}
                {currentLanguage === lang && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-full"></span>
                )}
              </button>
            ))}
          </div>

          {/* Row 2: Genre Toggler */}
           <div className="w-full border-t border-gray-100 bg-gray-50/50">
              <div className="flex justify-center py-2">
                 <button 
                    onClick={() => setShowGenres(!showGenres)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                 >
                    {t.home.filterGenre} <span className="text-black">{currentGenre === 'All' ? t.common.all : currentGenre}</span>
                    {showGenres ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                 </button>
              </div>
              
              {/* Expandable Genre Area */}
              {showGenres && (
                 <div className="pb-4 pt-1 px-4 animate-in slide-in-from-top-2 fade-in flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
                    {availableGenres.map(g => (
                        <button
                        key={g}
                        onClick={() => handleGenreSelect(g)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all
                            ${currentGenre === g 
                            ? 'bg-black text-white shadow-md' 
                            : 'bg-white text-gray-500 hover:text-black hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                        {g === 'All' ? t.common.all : g}
                        </button>
                    ))}
                 </div>
              )}
           </div>

        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-0 sm:px-4 py-6">
        
        {/* Header Area */}
        <div className="px-4 sm:px-0 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-baseline gap-2">
                <h1 className="font-billboard text-4xl sm:text-5xl uppercase font-bold tracking-tight text-black">
                  {showMyTracks 
                    ? t.home.yourSubmissions 
                    : searchQuery 
                        ? `Search: "${searchQuery}"`
                        : currentLanguage === 'All'
                            ? (currentGenre === 'All' ? t.home.globalRanking : `${currentGenre} ${t.home.globalRanking}`)
                            : `${currentGenre === 'All' ? t.common.all : currentGenre} ${t.home.charts}`
                  }
                </h1>
                {!showMyTracks && !searchQuery && currentLanguage !== 'All' && (
                    <span className="font-billboard text-2xl text-purple-600 uppercase">
                        ({currentLanguage})
                    </span>
                )}
            </div>
            <p className="text-gray-500 mt-1 text-sm font-medium">
                {showMyTracks 
                    ? t.home.descMy 
                    : t.home.descAll}
            </p>
          </div>

          {/* Time Tabs */}
          <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex items-center">
             {(['all-time', 'month', 'week', 'fresh'] as TimeRange[]).map(t => (
                 <button
                    key={t}
                    onClick={() => handleTabChange(t)}
                    className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-colors ${timeRange === t && !showMyTracks ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                     {getTimeRangeLabel(t)}
                 </button>
             ))}
             <div className="w-px h-4 bg-gray-200 mx-1"></div>
             <button 
                onClick={() => handleTabChange('my-tracks')}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-colors ${showMyTracks ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
             >
                 {t.home.myTracks}
             </button>
          </div>
        </div>

        {/* Chart List Header (Desktop) */}
        <div className="hidden sm:flex px-4 py-2 border-b-2 border-black text-xs font-bold text-gray-500 uppercase tracking-widest gap-6">
            <div className="w-16 text-center">{t.home.pos}</div>
            <div className="flex-1">{t.home.trackInfo}</div>
            <div className="w-32 text-center pl-6">{t.home.stats}</div>
            <div className="w-24 text-right pr-2">{t.home.rate}</div>
        </div>

        {/* List */}
        <div className="bg-white shadow-sm sm:rounded-b-lg min-h-[50vh]">
          {songs.length === 0 && !loading ? (
             <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                 <Music size={48} className="mb-4 opacity-20" />
                 <p className="font-medium">{t.home.noSongs}</p>
             </div>
          ) : (
            songs.map((song, index) => {
                // Calculate Ad Injection
                // Inject AFTER every adConfig.interval items
                // Index is 0-based. So if interval is 10, inject after index 9 (Rank 10), 19 (Rank 20), etc.
                const shouldShowAd = adConfig.enabled && (index + 1) % adConfig.interval === 0;
                
                // Determine which ad to show
                // Pool: Custom Ads + Bach (if enabled) + Auramaster (if enabled)
                const adPool: { type: 'custom' | 'bach' | 'auramaster', data?: CustomAd }[] = [
                    ...customAds.map(ad => ({ type: 'custom' as const, data: ad })),
                    ...(adSettings.bach ? [{ type: 'bach' as const }] : []),
                    ...(adSettings.auramaster ? [{ type: 'auramaster' as const }] : [])
                ];
                
                // Simple rotation based on index to ensure variety
                const adIndex = Math.floor((index + 1) / adConfig.interval) % (adPool.length || 1);
                const adToRender = adPool.length > 0 ? adPool[adIndex] : null;

                // Calculate Editorial Injection
                // Inject AFTER every editorialConfig.interval items
                const shouldShowEditorial = (index + 1) % editorialConfig.interval === 0;
                
                // Determine editorial song
                // Priority: Active Spotlight (Queue) -> Hot Song (Manual/Random Editorial)
                let editorialTrack = activeSpotlightSong || hotSong;
                
                if (!activeSpotlightSong && editorialConfig.mode === 'random') {
                    // Pick a song from the list "pseudo-randomly" but deterministically for this render
                    const randomOffset = (index * 7) % songs.length;
                    editorialTrack = songs[randomOffset];
                }

                return (
                <div key={song.id}>
                  <div ref={index === songs.length - 1 ? lastSongElementRef : null}>
                    <SongRow 
                        song={song} 
                        user={user}
                        onRate={handleRate}
                        showSubmittedDate={showMyTracks}
                        allowEdit={showMyTracks}
                        onUpdate={handleUpdateSong}
                        onTransfer={handleTransferClick}
                        onSpotlight={handleSpotlightClick}
                        spotlightConfig={spotlightConfig}
                    />
                  </div>

                  {/* Editorial Spotlight Injection */}
                  {shouldShowEditorial && editorialTrack && (
                     <div className="my-4">
                        <SongRow 
                            song={editorialTrack} 
                            user={user}
                            onRate={handleRate}
                            isEditorial={true}
                            spotlightConfig={spotlightConfig}
                            customRank={
                                <div className="flex flex-col items-center justify-center">
                                    <Sparkles className="text-purple-500 animate-pulse fill-purple-200" size={32} />
                                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest mt-1">SPOTLIGHT</span>
                                </div>
                            }
                        />
                     </div>
                  )}

                  {/* Ad Injection */}
                  {shouldShowAd && adToRender && (
                     <AdRow type={adToRender.type} customAd={adToRender.data} />
                  )}
                </div>
            )})
          )}
          
          {loading && songs.length === 0 && (
            <div className="py-8 flex justify-center w-full">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="font-billboard font-bold text-xl mb-2">MELODIA</p>
            <p className="text-gray-500 text-sm mb-2">&copy; 2026 {t.home.footer}</p>
            <div className="flex justify-center gap-4">
                <a 
                    href="https://melodia.top/privacypolicy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline text-sm font-bold"
                >
                    Privacy Policy
                </a>
                <a 
                    href="https://melodia.top/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline text-sm font-bold"
                >
                    Terms and Conditions
                </a>
            </div>
        </div>
      </footer>

      {/* Modals - Lazy Loaded with Suspense */}
      <Suspense fallback={null}>
        <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
            onLogin={handleLogin} 
        />
        
        {user && (
            <>
                <AddSongModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleUpload}
                    user={user}
                />
                <UserProfileModal
                    isOpen={showProfileModal}
                    onClose={() => { setShowProfileModal(false); setInitialSpotlightSong(null); }}
                    user={user}
                    onUpdate={handleUpdateProfile}
                    onLogout={handleLogout}
                    initialSpotlightSong={initialSpotlightSong}
                    onNotificationRead={() => {
                        setNotificationCount(prev => Math.max(0, prev - 1));
                    }}
                    spotlightConfig={spotlightConfig}
                />
                {user.isSuperAdmin && (
                <AdminDashboardModal 
                    isOpen={showAdminDashboard}
                    onClose={() => setShowAdminDashboard(false)}
                />
                )}
            </>
        )}

        {selectedSongToTransfer && (
            <TransferModal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                onTransfer={handleTransferConfirm}
                currentSongTitle={selectedSongToTransfer.title}
            />
        )}
      </Suspense>

      <CookieConsent />
    </div>
  );
};

export default App;
