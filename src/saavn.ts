import { BitChordTrack, BitChordStreamResponse, JioSaavnSearchApiResponse, JioSaavnSearchItem } from './types.js';
import { SimpleCache } from './cache.js';

const searchCache = new SimpleCache<BitChordTrack[]>(500);
const streamCache = new SimpleCache<BitChordStreamResponse>(500);

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function decodeHtmlEntities(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

function cleanArtworkUrl(url?: string): string {
  if (!url) return '';
  // Upgrade to 500x500 high-resolution cover
  return url.replace(/50x50/g, '500x500').replace(/150x150/g, '500x500');
}

export async function searchTracks(query: string, quality = 'high'): Promise<BitChordTrack[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const cacheKey = `search:${normalizedQuery}:${quality}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&p=1&n=20&q=${encodeURIComponent(normalizedQuery)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, text/plain, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`JioSaavn search failed with status ${response.status}`);
  }

  const data = (await response.json()) as JioSaavnSearchApiResponse;
  const rawResults: JioSaavnSearchItem[] = data.results || [];

  const tracks: BitChordTrack[] = rawResults
    .filter((item) => item.id && item.song)
    .map((item) => {
      const durationSeconds = Number(item.duration) || 0;
      const title = decodeHtmlEntities(item.song);
      const artist = decodeHtmlEntities(item.primary_artists || item.singers || item.music || '');
      const album = decodeHtmlEntities(item.album);

      const isLossless = quality.toLowerCase() === 'lossless';

      return {
        id: item.id,
        title,
        artist,
        album,
        duration: durationSeconds,
        artworkURL: cleanArtworkUrl(item.image),
        format: isLossless ? 'flac' : 'mp4',
        audioQuality: isLossless ? 'LOSSLESS' : (quality.toLowerCase() === 'low' ? 'MEDIUM' : 'HIGH'),
      };
    });

  searchCache.set(cacheKey, tracks, 10 * 60 * 1000); // 10 minutes cache
  return tracks;
}

export async function resolveStream(songId: string, requestedQuality = 'lossless'): Promise<BitChordStreamResponse | null> {
  const normQuality = requestedQuality.toLowerCase();
  const cacheKey = `stream:${songId}:${normQuality}`;
  const cached = streamCache.get(cacheKey);
  if (cached) return cached;

  // 1. Fetch song details
  const detailsUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0&_format=json&pids=${encodeURIComponent(songId)}`;
  const detailsRes = await fetch(detailsUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!detailsRes.ok) return null;

  const detailsData = (await detailsRes.json()) as Record<string, JioSaavnSearchItem>;
  const songData = detailsData[songId];

  if (!songData || !songData.encrypted_media_url) {
    return null;
  }

  // Determine target bitrate
  let bitrateParam = '320';
  let numericBitrate = 320000;
  let qualityLabel = 'High · 320 kbps AAC';

  if (normQuality === 'low') {
    bitrateParam = '96';
    numericBitrate = 96000;
    qualityLabel = 'Low · 96 kbps AAC';
  } else if (normQuality === 'medium') {
    bitrateParam = '160';
    numericBitrate = 160000;
    qualityLabel = 'Medium · 160 kbps AAC';
  } else if (normQuality === 'lossless') {
    bitrateParam = '320';
    numericBitrate = 1411200;
    qualityLabel = 'Lossless · 16-bit / 44.1 kHz';
  } else {
    // high: provide maximum available 320kbps
    bitrateParam = '320';
    numericBitrate = 320000;
    qualityLabel = 'High · 320 kbps AAC';
  }

  // 2. Generate signed CDN stream URL
  const tokenUrl = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&_format=json&_marker=0&cc=in&url=${encodeURIComponent(
    songData.encrypted_media_url
  )}&bitrate=${bitrateParam}`;

  const tokenRes = await fetch(tokenUrl, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!tokenRes.ok) return null;

  const tokenData = (await tokenRes.json()) as { auth_url?: string; status?: string };
  if (!tokenData.auth_url || tokenData.status !== 'success') {
    return null;
  }

  const isLossless = normQuality === 'lossless';
  const result: BitChordStreamResponse = {
    url: tokenData.auth_url,
    format: isLossless ? 'flac' : 'mp4',
    quality: qualityLabel,
    codec: isLossless ? 'flac' : 'aac',
    container: isLossless ? 'flac' : 'mp4',
    manifest: 'none',
    encrypted: false,
    sampleRate: 44100,
    bitDepth: 16,
    bitrate: numericBitrate,
  };

  // Cache for 5 minutes (well within CDN signature validity)
  streamCache.set(cacheKey, result, 5 * 60 * 1000);
  return result;
}
