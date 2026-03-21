
export type Genre = string;

export type TimeRange = 'all-time' | 'month' | 'week' | 'fresh';
export type Language = string;

export interface User {
  id: string;
  username: string; // Used as Artist/Label Name
  email?: string;
  country?: string;
  isLoggedIn: boolean;
  isSuperAdmin?: boolean;
  lastUsernameUpdate?: number; // Timestamp of last name change
}

export interface ArtistChannel {
  id: string;
  url: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  spotifyUrl: string;
  previewUrl: string; // Mock audio URL
  
  // Stats
  ratingCount: number;
  averageRating: number; // 1.0 - 5.0
  spotifyPopularity: number; // 0-100
  votedUserIds: string[]; // Track who voted
  
  // Chart Position Data
  rank: number;
  lastWeekRank: number | null; // null if new
  peakRank: number;
  weeksOnChart: number;
  
  // Historic Stats
  debutRank: number;
  debutDate: number; // timestamp
  
  // Metadata
  genre: Genre;
  subGenre?: string;
  language: string;
  artistChannels?: ArtistChannel[];
  uploaderId: string;
  timestamp: number; // For "Fresh" sorting
  hasBeenEdited?: boolean; // Can only edit once
  isBachAssisted?: boolean; // New Field
  isAuramasterAssisted?: boolean; // New Field
}

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export interface SpotifySearchResult {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  spotifyUrl: string;
  previewUrl: string;
  genre?: Genre;
  subGenre?: string;
  language?: string;
  spotifyPopularity?: number;
}

export interface CountryStat {
  country: string;
  count: number;
}

export interface UserStat {
  username: string;
  count: number;
}

export interface AdminStats {
  totalSongs: number;
  totalVotes: number;
  totalUsers: number;
  activeUploaders: number;
  topCountriesBySubmission: CountryStat[];
  topCountriesByVotes: CountryStat[];
  topSubmitters: UserStat[];
  topArtistsByVotes: UserStat[];
  latestUploadDate: number | null;
  latestVoteDate: number | null;
}

export interface AdSettings {
  bach: boolean;
  auramaster: boolean;
}

export interface CustomAd {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string; // Optional, maybe use a placeholder or upload later
  isActive: boolean;
  createdAt: number;
  type: 'custom' | 'bach' | 'auramaster'; // To distinguish
}

export interface EditorialConfig {
  interval: number;
  mode: 'random' | 'manual';
  manualSongId?: string; // ID of the song if manual
}

export interface AdConfig {
  interval: number; // 6, 10, 20
  enabled: boolean;
}

export interface SpotlightConfig {
  enabled: boolean;
  prices: {
    day: number;
    genre_language: number;
    global: number;
  };
  chart_limit?: number; // Songs required on chart to submit 1 spotlight
}

export interface SpotlightSubmission {
  id: string;
  trackId: string;
  userId: string;
  type: 'organic' | 'paid';
  status: 'queued' | 'active' | 'completed' | 'rejected';
  targetDate?: string;
  days: number;
  bidAmount: number;
  scope: 'global' | 'genre_language';
  createdAt: number;
  queuePosition?: number; // Calculated field
  track?: Song; // Populated field
}

export interface Notification {
  id: string;
  userId?: string; // null for global
  title?: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: number;
}
