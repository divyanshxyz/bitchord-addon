import { BitChordTrack } from './types.js';

const TIDAL_SEARCH_URL = 'https://listen.tidal.com/v1/search';
const TIDAL_TRACK_URL = 'https://api.tidal.com/v1/tracks';
const TIDAL_PUBLIC_TOKEN = '49YxDN9a2aFV6RTG';
const TIDAL_RESOURCES_BASE = 'https://resources.tidal.com/images';

export interface TidalTrackMeta {
  title: string;
  artist: string;
  duration: number;
  audioModes?: string[];
  atmos?: boolean;
}

const tidalMetadataCache = new Map<string, TidalTrackMeta>();

export function getTidalCachedTrack(id: string): TidalTrackMeta | undefined {
  return tidalMetadataCache.get(id);
}

export async function fetchTidalTrackDetails(rawId: string): Promise<TidalTrackMeta | null> {
  const cached = tidalMetadataCache.get(`tidal_${rawId}`);
  if (cached) return cached;

  try {
    const res = await fetch(`${TIDAL_TRACK_URL}/${encodeURIComponent(rawId)}?countryCode=US`, {
      headers: {
        'x-tidal-token': TIDAL_PUBLIC_TOKEN,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) return null;

    const item = await res.json();
    const artists = (item.artists || []).map((a: any) => a.name).join(', ');
    const audioModes: string[] = item.audioModes || [];
    const isAtmos = audioModes.includes('DOLBY_ATMOS');

    const meta: TidalTrackMeta = {
      title: item.title,
      artist: artists || item.artist?.name || '',
      duration: Number(item.duration) || 0,
      audioModes,
      atmos: isAtmos,
    };

    tidalMetadataCache.set(`tidal_${rawId}`, meta);
    return meta;
  } catch (err) {
    console.warn('Failed to fetch Tidal track details:', err);
    return null;
  }
}

export async function searchTidal(
  query: string,
  limit = 20,
  countryCode = 'US'
): Promise<BitChordTrack[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `${TIDAL_SEARCH_URL}?query=${encodeURIComponent(q)}&limit=${limit}&countryCode=${countryCode}`;

  try {
    const res = await fetch(url, {
      headers: {
        'x-tidal-token': TIDAL_PUBLIC_TOKEN,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = data.tracks?.items || [];

    return items.map((item: any) => {
      const coverId = item.album?.cover;
      const artworkURL = coverId
        ? `${TIDAL_RESOURCES_BASE}/${coverId.replace(/-/g, '/')}/1280x1280.jpg`
        : '';

      const artists = (item.artists || []).map((a: any) => a.name).join(', ');
      const title = item.title;
      const artist = artists || item.artist?.name || 'Unknown Artist';
      const audioModes: string[] = item.audioModes || [];
      const isAtmos = audioModes.includes('DOLBY_ATMOS');

      // Cache metadata for instant stream resolution
      tidalMetadataCache.set(`tidal_${item.id}`, {
        title,
        artist,
        duration: Number(item.duration) || 0,
        audioModes,
        atmos: isAtmos,
      });

      return {
        id: `tidal_${item.id}`,
        title,
        artist,
        album: item.album?.title || '',
        duration: Number(item.duration) || 0,
        artworkURL,
        format: 'flac',
        audioQuality: 'LOSSLESS',
        audioModes: isAtmos ? ['DOLBY_ATMOS'] : undefined,
        atmos: isAtmos || undefined,
      };
    });
  } catch (err) {
    console.warn('Tidal search failed:', err);
    return [];
  }
}
