export interface SpotifyMetadata {
    title: string;
    artist: string;
    coverUrl: string;
}

export async function scrapeSpotifyMetadata(url: string): Promise<SpotifyMetadata> {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'open.spotify.com') {
        throw new Error('Invalid Spotify URL: Must be open.spotify.com');
    }

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch Spotify page');
    }

    const html = await response.text();

    // Simple Regex Scraping
    const titleTagMatch = html.match(/<title>(.*?)<\/title>/);
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);

    let title = 'Unknown Title';
    let artist = 'Unknown Artist';
    let coverUrl = '';

    // Strategy 1: Parse <title> tag (Most reliable for Tracks)
    if (titleTagMatch && titleTagMatch[1]) {
        const pageTitle = titleTagMatch[1];

        // Flexible dash matching (hyphen, en-dash, em-dash)
        const dash = '[-–—]';

        const patterns = [
            // Specific verbose patterns first
            new RegExp(`(.*?) ${dash} song and lyrics by (.*?) \\| Spotify`, 'i'),
            new RegExp(`(.*?) ${dash} lyrics by (.*?) \\| Spotify`, 'i'),

            // Standard patterns
            new RegExp(`(.*?) ${dash} song by (.*?) \\| Spotify`, 'i'),
            new RegExp(`(.*?) ${dash} canción de (.*?) \\| Spotify`, 'i'),
            new RegExp(`(.*?) ${dash} Sencillo de (.*?) \\| Spotify`, 'i'),
            new RegExp(`(.*?) ${dash} Single by (.*?) \\| Spotify`, 'i'),
            new RegExp(`(.*?) ${dash} Album by (.*?) \\| Spotify`, 'i'),
            new RegExp(`(.*?) ${dash} Álbum de (.*?) \\| Spotify`, 'i'),
            new RegExp(`(.*?) ${dash} EP by (.*?) \\| Spotify`, 'i'),
            new RegExp(`(.*?) ${dash} EP de (.*?) \\| Spotify`, 'i'),

            // Generic Fallback: "Song Name - Artist Name | Spotify" (Sometimes used)
            new RegExp(`(.*?) ${dash} (.*?) \\| Spotify`, 'i')
        ];

        for (const pattern of patterns) {
            const match = pageTitle.match(pattern);
            if (match) {
                let potentialArtist = match[2];
                potentialArtist = potentialArtist
                    .replace(/^(song and lyrics by|lyrics by|song by|canción de|Sencillo de|Single by|Album by|Álbum de|EP by|EP de)\s+/i, '')
                    .trim();

                title = match[1];
                artist = potentialArtist;
                break;
            }
        }
    }

    // Strategy 2: Fallback to OG Tags if Title parsing failed
    if (title === 'Unknown Title' || artist === 'Unknown Artist') {
        if (ogTitleMatch && ogTitleMatch[1]) {
            title = ogTitleMatch[1];
        }

        if (ogDescMatch && ogDescMatch[1]) {
            // Description usually looks like: "Song · Artist · 2024"
            const parts = ogDescMatch[1].split('·').map(s => s.trim());
            if (parts.length >= 2) {
                // If we haven't found the artist yet, try the second part
                if (artist === 'Unknown Artist') {
                    artist = parts[1];
                }
            }
        }
    }

    if (ogImageMatch && ogImageMatch[1]) {
        coverUrl = ogImageMatch[1];
    }

    return { title, artist, coverUrl };
}

export async function scrapeSpotifyPlaylist(url: string, limit: number = 300): Promise<string[]> {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!response.ok) throw new Error('Failed to fetch playlist page');
    const html = await response.text();

    // Extract track URLs using regex
    // This is a best-effort scraper. It looks for href="/track/..."
    const trackRegex = /\/track\/([a-zA-Z0-9]+)/g;
    const matches = [...html.matchAll(trackRegex)];

    const trackIds = new Set<string>();

    // Add regex matches
    matches.forEach(m => trackIds.add(m[1]));

    // Strategy 2: Look for client-side hydration data (often contains more tracks)
    try {
        const scriptMatch = html.match(new RegExp('<script id="initial-state" type="text/plain">(.*?)</script>'));
        if (scriptMatch && scriptMatch[1]) {
            const jsonStr = Buffer.from(scriptMatch[1], 'base64').toString('utf-8');
            const data = JSON.parse(jsonStr);

            // Traverse data to find tracks (structure varies, so we look for patterns)
            // Common path: entities.items[].item.id or similar
            const jsonString = JSON.stringify(data);
            const jsonMatches = [...jsonString.matchAll(/"uri":"spotify:track:([a-zA-Z0-9]+)"/g)];
            jsonMatches.forEach(m => trackIds.add(m[1]));
        }
    } catch (e) {
        console.error('Failed to parse initial-state', e);
    }

    // Convert to URLs and Limit
    return Array.from(trackIds)
        .map(id => `https://open.spotify.com/track/${id}`)
        .slice(0, limit);
}
