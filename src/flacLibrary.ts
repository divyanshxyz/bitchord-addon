import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import * as mm from 'music-metadata';
import { BitChordTrack, BitChordStreamResponse } from './types.js';

export interface LocalFlacItem {
  id: string;
  filePath: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  sampleRate: number;
  bitDepth: number;
  bitrate: number;
  hasArtwork: boolean;
  artworkMime?: string;
}

export class FlacLibraryManager {
  private musicDir: string;
  private tracks: Map<string, LocalFlacItem> = new Map();
  private artworkCache: Map<string, { buffer: Buffer; mime: string }> = new Map();

  constructor(musicDir: string) {
    let resolved = path.resolve(musicDir);
    if (!fs.existsSync(resolved)) {
      const alt1 = path.join(process.cwd(), 'music');
      const alt2 = path.resolve('../music');
      if (fs.existsSync(alt1)) resolved = alt1;
      else if (fs.existsSync(alt2)) resolved = alt2;
    }
    this.musicDir = resolved;
    try {
      if (!fs.existsSync(this.musicDir)) {
        fs.mkdirSync(this.musicDir, { recursive: true });
      }
    } catch {
      // Read-only filesystem in serverless environments (Vercel)
    }
  }

  public async scan(): Promise<number> {
    const files = this.collectAudioFiles(this.musicDir);
    this.tracks.clear();
    this.artworkCache.clear();

    for (const file of files) {
      try {
        const metadata = await mm.parseFile(file);
        const relPath = path.relative(this.musicDir, file);
        const id = 'flac_' + crypto.createHash('md5').update(relPath).digest('hex').slice(0, 12);

        const title = metadata.common.title || path.basename(file, path.extname(file));
        const artist = metadata.common.artist || metadata.common.albumartist || 'Unknown Artist';
        const album = metadata.common.album || 'Unknown Album';
        const duration = Math.round(metadata.format.duration || 0);
        const sampleRate = metadata.format.sampleRate || 44100;
        const bitDepth = metadata.format.bitsPerSample || 16;
        const bitrate = metadata.format.bitrate || 1411200;

        let hasArtwork = false;
        let artworkMime = undefined;

        if (metadata.common.picture && metadata.common.picture.length > 0) {
          const pic = metadata.common.picture[0];
          hasArtwork = true;
          artworkMime = pic.format;
          this.artworkCache.set(id, {
            buffer: Buffer.from(pic.data),
            mime: pic.format,
          });
        }

        const item: LocalFlacItem = {
          id,
          filePath: file,
          title,
          artist,
          album,
          duration,
          sampleRate,
          bitDepth,
          bitrate,
          hasArtwork,
          artworkMime,
        };

        this.tracks.set(id, item);
      } catch (err) {
        console.warn(`Failed to parse FLAC file ${file}:`, err);
      }
    }

    return this.tracks.size;
  }

  private collectAudioFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(this.collectAudioFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.flac', '.wav', '.alac'].includes(ext)) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }

  public search(query: string, hostBaseUrl: string): BitChordTrack[] {
    const q = query.trim().toLowerCase();
    const matches: BitChordTrack[] = [];

    for (const item of this.tracks.values()) {
      const haystack = `${item.title} ${item.artist} ${item.album}`.toLowerCase();
      if (!q || haystack.includes(q)) {
        const artUrl = item.hasArtwork
          ? `${hostBaseUrl}/art/${item.id}`
          : `${hostBaseUrl}/art/default.png`;

        matches.push({
          id: item.id,
          title: item.title,
          artist: item.artist,
          album: item.album,
          duration: item.duration,
          artworkURL: artUrl,
          format: 'flac',
          audioQuality: 'LOSSLESS',
        });
      }
    }

    return matches;
  }

  public getTrack(id: string): LocalFlacItem | undefined {
    return this.tracks.get(id);
  }

  public getArtwork(id: string): { buffer: Buffer; mime: string } | undefined {
    return this.artworkCache.get(id);
  }

  public buildStreamResponse(id: string, hostBaseUrl: string): BitChordStreamResponse | null {
    const item = this.tracks.get(id);
    if (!item) return null;

    const qualityLabel = `Lossless · ${item.bitDepth}-bit / ${Math.round(item.sampleRate / 1000)} kHz`;

    return {
      url: `${hostBaseUrl}/audio/${item.id}.flac`,
      format: 'flac',
      quality: qualityLabel,
      codec: 'flac',
      container: 'flac',
      manifest: 'none',
      encrypted: false,
      sampleRate: item.sampleRate,
      bitDepth: item.bitDepth,
      bitrate: item.bitrate,
    };
  }

  public getTrackCount(): number {
    return this.tracks.size;
  }

  public getMusicDir(): string {
    return this.musicDir;
  }
}
