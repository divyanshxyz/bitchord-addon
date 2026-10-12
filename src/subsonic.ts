import crypto from 'node:crypto';
import { BitChordTrack, BitChordStreamResponse } from './types.js';

export interface SubsonicConfig {
  url?: string;
  user?: string;
  token?: string;
  salt?: string;
}

export class SubsonicClient {
  private url: string;
  private user: string;
  private token: string;
  private salt: string;
  public enabled: boolean;

  constructor(cfg: SubsonicConfig) {
    this.url = (cfg.url || '').replace(/\/+$/, '');
    this.user = cfg.user || '';
    this.salt = cfg.salt || crypto.randomBytes(6).toString('hex');
    this.token = cfg.token || '';
    this.enabled = Boolean(this.url && this.user);
  }

  private buildAuthParams(): string {
    return `u=${encodeURIComponent(this.user)}&t=${encodeURIComponent(this.token)}&s=${encodeURIComponent(
      this.salt
    )}&v=1.16.1&c=bitchord-addon&f=json`;
  }

  public async search(query: string, quality = 'lossless'): Promise<BitChordTrack[]> {
    if (!this.enabled) return [];

    try {
      const endpoint = `${this.url}/rest/search3.view?query=${encodeURIComponent(query)}&songCount=20&${this.buildAuthParams()}`;
      const res = await fetch(endpoint);
      if (!res.ok) return [];

      const data = await res.json();
      const songList = data?.['subsonic-response']?.searchResult3?.song || [];

      return songList.map((item: any) => {
        const isFlac = (item.suffix || '').toLowerCase() === 'flac';
        const coverArtUrl = item.coverArt
          ? `${this.url}/rest/getCoverArt.view?id=${encodeURIComponent(item.coverArt)}&${this.buildAuthParams()}`
          : '';

        return {
          id: 'subsonic_' + item.id,
          title: item.title,
          artist: item.artist,
          album: item.album,
          duration: item.duration || 0,
          artworkURL: coverArtUrl,
          format: isFlac ? 'flac' : (item.suffix || 'mp3').toLowerCase(),
          audioQuality: isFlac ? 'LOSSLESS' : 'HIGH',
        };
      });
    } catch (err) {
      console.warn('Subsonic search error:', err);
      return [];
    }
  }

  public async resolveStream(subsonicSongId: string): Promise<BitChordStreamResponse | null> {
    if (!this.enabled) return null;
    const rawId = subsonicSongId.replace(/^subsonic_/, '');

    const streamUrl = `${this.url}/rest/stream.view?id=${encodeURIComponent(rawId)}&format=raw&${this.buildAuthParams()}`;

    return {
      url: streamUrl,
      format: 'flac',
      quality: 'Lossless · Direct Subsonic Stream',
      codec: 'flac',
      container: 'flac',
      manifest: 'none',
      encrypted: false,
      sampleRate: 44100,
      bitDepth: 16,
      bitrate: 1411200,
    };
  }
}
