import { Song, TimeRange, Genre, User, SpotifySearchResult, Language, ArtistChannel, AdminStats, AdSettings, SpotlightConfig, SpotlightSubmission, Notification } from '../types';
import { MOCK_AUDIO_PREVIEW } from '../constants';
import { EditorialConfig, AdConfig, CustomAd } from '../types';

export { MOCK_AUDIO_PREVIEW };

const API_BASE = '/api';

// --- HELPERS ---

const getCsrfToken = () => {
  const match = document.cookie.match(new RegExp('(^| )X-CSRF-Token=([^;]+)'));
  return match ? match[2] : '';
};

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'x-csrf-token': getCsrfToken()
  };
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = { ...getHeaders(), ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Important for Cookies
  });

  // Helper to safely parse JSON
  const safeJson = async () => {
      const text = await res.text();
      try {
          return JSON.parse(text);
      } catch (e) {
          console.error(`Failed to parse JSON from ${url}:`, text.substring(0, 100));
          throw new Error(`Invalid JSON response from ${url}`);
      }
  };

  // Monkey-patch .json() to use safe version
  res.json = safeJson;
  
  return res;
};

// --- AUTH ---

export const loginAPI = async (username: string, password?: string): Promise<{user: User} | null> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const registerAPI = async (username: string, email: string, password?: string): Promise<{user: User} | null> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const getSessionAPI = async (token?: string): Promise<User | null> => {
  try {
    // Token arg is deprecated as we use cookies now, but keeping signature compatible
    const res = await fetchWithAuth(`${API_BASE}/auth/session`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const logoutAPI = async (): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/auth/logout`, { method: 'POST' });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// --- SONGS ---

export const fetchFilters = async (uploaderFilterId?: string): Promise<{ languages: string[], genres: string[] }> => {
  try {
    const params = new URLSearchParams();
    if (uploaderFilterId) params.append('uploaderFilterId', uploaderFilterId);
    
    const res = await fetchWithAuth(`${API_BASE}/metadata/filters?${params}`);
    if (!res.ok) return { languages: [], genres: [] };
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch filters:', e);
    return { languages: [], genres: [] };
  }
};

export const fetchSongs = async (
  page: number, 
  limit: number, 
  sortMode: TimeRange, 
  genre: Genre,
  language: Language,
  uploaderFilterId?: string,
  searchQuery?: string
): Promise<{ data: Song[], hasMore: boolean }> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortMode,
      genre,
      language,
      ...(uploaderFilterId ? { uploaderFilterId } : {}),
      ...(searchQuery ? { searchQuery } : {}),
      _t: Date.now().toString() // Cache buster
    });

    const res = await fetchWithAuth(`${API_BASE}/songs?${params}`);
    if (!res.ok) return { data: [], hasMore: false };
    return await res.json();
  } catch (e) {
    console.error(e);
    return { data: [], hasMore: false };
  }
};

export const addSong = async (
  url: string, 
  user: User, 
  language: string, 
  metadata?: Partial<Song>,
  subGenre?: string,
  artistChannels?: ArtistChannel[],
  isBachAssisted?: boolean,
  isAuramasterAssisted?: boolean
): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/songs`, {
      method: 'POST',
      body: JSON.stringify({ url, user, language, metadata, subGenre, artistChannels, isBachAssisted, isAuramasterAssisted })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      console.error('Add Song Failed:', errorData);
      return { success: false, message: errorData.error || 'Failed to submit song' };
    }
    return { success: true };
  } catch (e) {
    console.error('Add Song Network Error:', e);
    return { success: false, message: 'Network error occurred' };
  }
};

export const rateSong = async (songId: string, rating: number, userId: string, isSuperAdmin?: boolean): Promise<Song | null> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/songs/${songId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, userId, isSuperAdmin })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const updateSongMetadata = async (
  id: string, 
  title: string,
  artist: string,
  genre: Genre, 
  language: string, 
  subGenre: string, 
  artistChannels: ArtistChannel[]
): Promise<Song | null> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/songs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, artist, genre, language, subGenre, artistChannels })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const transferSong = async (songId: string, newUserId: string): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/songs/${songId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ newUserId })
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// --- USERS ---

export const searchUsers = async (query: string): Promise<User[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const updateUserProfile = async (userId: string, name: string, country: string): Promise<User | null> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, country })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const toggleAdminStatus = async (targetUserId: string, isAdmin: boolean): Promise<User | null> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/${targetUserId}/toggle-admin`, {
      method: 'POST',
      body: JSON.stringify({ isAdmin })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const updateUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/users/${userId}/password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// --- CLAIMS ---

export const submitClaim = async (songId: string, proof: string): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/songs/${songId}/claim`, {
      method: 'POST',
      body: JSON.stringify({ proof })
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getClaims = async (): Promise<any[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/claims`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const processClaim = async (claimId: number, action: 'approve' | 'reject'): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/claims/${claimId}/${action}`, {
      method: 'POST'
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// --- PLAYLIST ---

export const fetchPlaylistTracks = async (url: string): Promise<string[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/spotify/playlist?url=${encodeURIComponent(url)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.tracks || [];
  } catch (e) {
    console.error(e);
    return [];
  }
};

// --- ADMIN ---

export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/stats`);
    if (!res.ok) return {
      totalSongs: 0,
      totalVotes: 0,
      totalUsers: 0,
      activeUploaders: 0,
      topCountriesBySubmission: [],
      topCountriesByVotes: [],
      topSubmitters: [],
      topArtistsByVotes: [],
      latestUploadDate: null,
      latestVoteDate: null
    };
    return await res.json();
  } catch (e) {
    console.error(e);
    return {
      totalSongs: 0,
      totalVotes: 0,
      totalUsers: 0,
      activeUploaders: 0,
      topCountriesBySubmission: [],
      topCountriesByVotes: [],
      topSubmitters: [],
      topArtistsByVotes: [],
      latestUploadDate: null,
      latestVoteDate: null
    };
  }
};

export const getHotSong = async (): Promise<Song | null> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/songs/hot`);
    if (!res.ok) throw new Error('Failed to fetch hot song');
    const data = await res.json();
    return data.song;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getHotSongSettings = async (): Promise<{ mode: 'random' | 'manual', url: string }> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/settings/hot-song`);
    if (!res.ok) return { mode: 'random', url: '' };
    return await res.json();
  } catch (error) {
    console.error(error);
    return { mode: 'random', url: '' };
  }
};

export const updateHotSongSettings = async (mode: 'random' | 'manual', url: string): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/settings/hot-song`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, url })
    });
    return res.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const getAdSettings = async (): Promise<AdSettings> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/settings/promotions`);
    if (!res.ok) return { bach: true, auramaster: true };
    return await res.json();
  } catch (e) {
    console.error(e);
    return { bach: true, auramaster: true };
  }
};

export const updateAdSettings = async (settings: AdSettings): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/settings/promotions`, {
      method: 'POST',
      body: JSON.stringify(settings)
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getEditorialSettings = async (): Promise<EditorialConfig> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/settings/editorial`);
    if (!res.ok) return { interval: 17, mode: 'random', manualSongId: '' };
    return await res.json();
  } catch (e) {
    console.error(e);
    return { interval: 17, mode: 'random', manualSongId: '' };
  }
};

export const updateEditorialSettings = async (settings: EditorialConfig): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/settings/editorial`, {
      method: 'POST',
      body: JSON.stringify(settings)
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getAdConfig = async (): Promise<AdConfig> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/settings/ad-config`);
    if (!res.ok) return { interval: 10, enabled: true };
    return await res.json();
  } catch (e) {
    console.error(e);
    return { interval: 10, enabled: true };
  }
};

export const updateAdConfig = async (config: AdConfig): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/settings/ad-config`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getCustomAds = async (): Promise<CustomAd[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/ads`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getAdminAds = async (): Promise<CustomAd[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/ads`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const createCustomAd = async (ad: Partial<CustomAd>): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/ads`, {
      method: 'POST',
      body: JSON.stringify(ad)
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const updateCustomAd = async (id: string, ad: Partial<CustomAd>): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/ads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ad)
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const deleteCustomAd = async (id: string): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/ads/${id}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const toggleCustomAd = async (id: string, isActive: boolean): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/admin/ads/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ isActive })
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// --- BULK UPLOAD ---

export interface BulkUploadJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    total: number;
    processed: number;
    successCount: number;
    errors: string[];
    message: string;
}

export const startBulkUpload = async (url: string): Promise<{ success: boolean; jobId?: string; error?: string }> => {
    try {
        const res = await fetchWithAuth(`${API_BASE}/admin/bulk-upload`, {
            method: 'POST',
            body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error };
        return { success: true, jobId: data.jobId };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Network error' };
    }
};

export const getBulkUploadStatus = async (jobId: string): Promise<BulkUploadJob | null> => {
    try {
        const res = await fetchWithAuth(`${API_BASE}/admin/bulk-upload/status/${jobId}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
};

export const getUserStats = async (userId: string): Promise<any> => {
    try {
        const res = await fetchWithAuth(`${API_BASE}/users/${userId}/stats`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
};

export const getUserClaims = async (userId: string): Promise<any[]> => {
    try {
        const res = await fetchWithAuth(`${API_BASE}/users/${userId}/claims`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const updateTrack = async (trackId: string, data: any): Promise<boolean> => {
    try {
        const res = await fetchWithAuth(`${API_BASE}/songs/${trackId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const deleteTrack = async (trackId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const res = await fetchWithAuth(`${API_BASE}/dashboard/delete/${trackId}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            console.error('Delete Track Failed:', errorData);
            return { success: false, message: errorData.error || 'Failed to delete track' };
        }
        
        return { success: true };
    } catch (e: any) {
        console.error('Delete Track Network Error:', e);
        return { success: false, message: e.message || 'Network error occurred' };
    }
};

// --- SPOTLIGHT ---

export const getActiveSpotlight = async (): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE}/spotlight/active`);
        if (!response.ok) throw new Error('Failed to get active spotlight');
        return await response.json();
    } catch (error) {
        console.error('Get Active Spotlight Error:', error);
        return null;
    }
};

export const getSpotlightConfig = async (): Promise<SpotlightConfig> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/spotlight/config`);
    if (!res.ok) return { enabled: true, prices: { day: 1, genre_language: 1, global: 2 } };
    return await res.json();
  } catch (e) {
    console.error(e);
    return { enabled: true, prices: { day: 1, genre_language: 1, global: 2 } };
  }
};

export const updateSpotlightConfig = async (config: SpotlightConfig): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/spotlight/config`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getUserSubmissions = async (): Promise<SpotlightSubmission[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/spotlight/submissions`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((s: any) => ({
      id: s.id,
      trackId: s.track_id,
      userId: s.user_id,
      type: s.type,
      status: s.status,
      targetDate: s.target_date,
      days: s.days,
      bidAmount: s.bid_amount,
      scope: s.scope,
      createdAt: s.created_at,
      queuePosition: s.queue_position,
      track: s.track
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const submitToSpotlight = async (data: {
  trackId: string;
  type: 'organic' | 'paid';
  days?: number;
  scope?: 'global' | 'genre_language';
  targetDate?: string;
}): Promise<{ success: boolean; message?: string; bidAmount?: number; queuePosition?: number; estimatedWaitDays?: number; targetDate?: string }> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/spotlight/submit`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) return { success: false, message: result.error || 'Submission failed' };
    return { 
        success: true, 
        bidAmount: result.bidAmount,
        queuePosition: result.queuePosition,
        estimatedWaitDays: result.estimatedWaitDays,
        targetDate: result.targetDate
    };
  } catch (e: any) {
    console.error(e);
    return { success: false, message: e.message || 'Network error' };
  }
};

// --- NOTIFICATIONS ---

export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/notifications`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: !!n.is_read,
      createdAt: n.created_at
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const markNotificationRead = async (id: string): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST'
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const createNotification = async (data: { userId?: string; title: string; message: string; type: string }): Promise<boolean> => {
  try {
    const res = await fetchWithAuth(`${API_BASE}/notifications/create`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// --- UTILS ---

export const extractSpotifyId = (url: string): string | null => {
    if (!url) return null;
    try {
        const cleanUrl = url.trim();
        const match = cleanUrl.match(/(?:\/|:)(track|album)(?:\/|:)([a-zA-Z0-9]+)/);
        if (match && match[2]) {
            return match[2];
        }
    } catch (e) {
        console.error("ID Extraction failed", e);
    }
    return null;
};

export const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    try {
        const cleanUrl = url.trim();
        const match = cleanUrl.match(/(?:\/|:)(track|album)(?:\/|:)([a-zA-Z0-9]+)/);
        if (match && match[1] && match[2]) {
            const type = match[1];
            const id = match[2];
            return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
        }
    } catch (e) {
        console.error("Embed URL generation failed", e);
    }
    return null;
};

export const getSpotifyTrackDetails = async (url: string): Promise<SpotifySearchResult | null> => {
    const id = extractSpotifyId(url);
    if (!id) return null;
    
    try {
        const res = await fetchWithAuth(`${API_BASE}/spotify/metadata?url=${encodeURIComponent(url)}`);
        if (res.ok) {
            const data = await res.json();
            return {
                id: id,
                title: data.title,
                artist: data.artist,
                coverUrl: data.coverUrl || `https://picsum.photos/seed/${id}/200/200`,
                spotifyUrl: url,
                previewUrl: MOCK_AUDIO_PREVIEW,
                genre: 'Pop',
                language: 'English',
                spotifyPopularity: Math.floor(Math.random() * 60) + 40
            };
        }
    } catch (e) {
        console.error("Metadata fetch failed", e);
    }

    // Fallback if fetch fails
    return {
        id: id,
        title: 'Unknown Title',
        artist: 'Unknown Artist',
        coverUrl: `https://picsum.photos/seed/${id}/200/200`,
        spotifyUrl: url,
        previewUrl: MOCK_AUDIO_PREVIEW,
        genre: 'Pop',
        language: 'English',
        spotifyPopularity: Math.floor(Math.random() * 60) + 40
    };
};
