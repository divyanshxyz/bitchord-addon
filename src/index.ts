import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import process from 'node:process';
import { config } from './config.js';
import { BitChordManifest, BitChordTrack } from './types.js';
import { FlacLibraryManager } from './flacLibrary.js';
import { SubsonicClient } from './subsonic.js';
import { searchTracks as searchSaavn, resolveStream as resolveSaavn } from './saavn.js';
import { searchTidal, fetchTidalTrackDetails, getTidalCachedTrack } from './tidal.js';
import { renderHtmlDashboard } from './ui.js';

const app = new Hono();
app.use('*', cors());

const flacLib = new FlacLibraryManager(config.musicDir);
const subsonic = new SubsonicClient({
  url: config.subsonicUrl,
  user: config.subsonicUser,
  token: config.subsonicToken,
});

// Initial library scan
await flacLib.scan();

function getHostBaseUrl(c: any): string {
  const forwardedProto = c.req.header('x-forwarded-proto') || 'http';
  const host = c.req.header('host') || `localhost:${config.port}`;
  return `${forwardedProto}://${host}`;
}

// 0. Dashboard & Tester UI
app.get('/', (c) => {
  return c.html(renderHtmlDashboard(config.addonId, config.addonName, config.addonVersion));
});

// 1. BitChord Manifest Endpoint
app.get('/manifest.json', (c) => {
  const manifest: BitChordManifest = {
    id: config.addonId,
    name: config.addonName,
    version: config.addonVersion,
    resources: ['search', 'stream'],
    allowDownloads: config.allowDownloads,
    checkValidLossless: config.checkValidLossless,
    settings: [
      {
        key: 'quality',
        type: 'select',
        default: 'lossless',
        options: [
          { label: 'Lossless (Bit-exact FLAC)', value: 'lossless' },
          { label: 'High (320 kbps AAC)', value: 'high' },
          { label: 'Low (96 kbps AAC)', value: 'low' },
        ],
      },
    ],
  };

  return c.json(manifest, 200, {
    'Cache-Control': 'public, max-age=600',
  });
});

// 2. BitChord Search Endpoint
app.get('/search', async (c) => {
  const query = c.req.query('q') || '';
  const quality = c.req.query('quality') || 'lossless';
  const baseUrl = getHostBaseUrl(c);

  if (!query.trim()) {
    // Return all local FLAC library items if query is empty
    const localAll = flacLib.search('', baseUrl);
    return c.json({ tracks: localAll });
  }

  try {
    const results: BitChordTrack[] = [];

    // Priority 1: Local FLAC Library (if any)
    const localMatches = flacLib.search(query, baseUrl);
    results.push(...localMatches);

    // Priority 2: Subsonic / Navidrome Library (if configured)
    if (subsonic.enabled) {
      const subsonicMatches = await subsonic.search(query, quality);
      results.push(...subsonicMatches);
    }

    // Priority 3: Tidal Hi-Res Lossless Catalog
    const tidalMatches = await searchTidal(query);
    results.push(...tidalMatches);

    // Priority 4: JioSaavn Catalog
    const saavnMatches = await searchSaavn(query, quality);
    results.push(...saavnMatches);

    return c.json({ tracks: results }, 200, {
      'Cache-Control': 'public, max-age=600',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search resolution error';
    return c.json({ error: message, tracks: [] }, 500);
  }
});

// 3. BitChord Stream Endpoint
app.get('/stream/:id', async (c) => {
  const id = c.req.param('id');
  const quality = c.req.query('quality') || 'lossless';
  const baseUrl = getHostBaseUrl(c);

  if (!id) {
    return c.json({ error: 'Missing track id' }, 404);
  }

  try {
    // 1. Check Local FLAC Library
    if (id.startsWith('flac_')) {
      const stream = flacLib.buildStreamResponse(id, baseUrl);
      if (stream) {
        return c.json(stream, 200, { 'Cache-Control': 'public, max-age=300' });
      }
    }

    // 2. Check Subsonic
    if (id.startsWith('subsonic_')) {
      const stream = await subsonic.resolveStream(id);
      if (stream) {
        return c.json(stream, 200, { 'Cache-Control': 'public, max-age=300' });
      }
    }

    // 3. Check Tidal
    if (id.startsWith('tidal_')) {
      const rawId = id.replace(/^tidal_/, '');
      const meta = getTidalCachedTrack(id) || (await fetchTidalTrackDetails(rawId));
      if (meta) {
        const query = `${meta.title} ${meta.artist}`.trim();
        const matches = await searchSaavn(query, quality);
        if (matches.length > 0) {
          const stream = await resolveSaavn(matches[0].id, quality);
          if (stream) {
            return c.json(stream, 200, { 'Cache-Control': 'public, max-age=300' });
          }
        }
      }
    }

    // 4. Fallback to Saavn
    const stream = await resolveSaavn(id, quality);
    if (!stream) {
      return c.json({ error: 'Track not found in catalogue' }, 404);
    }

    return c.json(stream, 200, { 'Cache-Control': 'public, max-age=300' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stream resolution failed';
    return c.json({ error: message }, 500);
  }
});

// 4. Bit-perfect FLAC audio stream with Range Request (206 Partial Content) support
app.get('/audio/:filename', (c) => {
  const filename = c.req.param('filename');
  const id = filename.replace(/\.flac$/i, '');
  const track = flacLib.getTrack(id);

  if (!track || !fs.existsSync(track.filePath)) {
    return c.text('Audio file not found', 404);
  }

  const stat = fs.statSync(track.filePath);
  const fileSize = stat.size;
  const range = c.req.header('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return c.text('Requested range not satisfiable', 416, {
        'Content-Range': `bytes */${fileSize}`,
      });
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(track.filePath, { start, end });
    const webStream = Readable.toWeb(fileStream);

    return new Response(webStream as any, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunksize),
        'Content-Type': 'audio/flac',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  const fileStream = fs.createReadStream(track.filePath);
  const webStream = Readable.toWeb(fileStream);

  return new Response(webStream as any, {
    status: 200,
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': 'audio/flac',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

// 5. Embedded artwork endpoint
app.get('/art/:id', (c) => {
  const id = c.req.param('id');
  if (id === 'default.png') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
      <text x="50%" y="45%" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="52" font-weight="bold">FLAC</text>
      <text x="50%" y="58%" text-anchor="middle" fill="#e0e7ff" font-family="sans-serif" font-size="28" font-weight="500">LOSSLESS AUDIO</text>
    </svg>`;
    return c.body(svg, 200, { 'Content-Type': 'image/svg+xml' });
  }

  const art = flacLib.getArtwork(id);
  if (!art) {
    return c.redirect('/art/default.png');
  }

  return c.body(new Uint8Array(art.buffer), 200, {
    'Content-Type': art.mime,
    'Cache-Control': 'public, max-age=86400',
  });
});

// 6. Rescan library endpoint
app.post('/rescan', async (c) => {
  const count = await flacLib.scan();
  return c.json({ status: 'ok', count, musicDir: flacLib.getMusicDir() });
});

// Health check route
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    flacCount: flacLib.getTrackCount(),
    subsonicEnabled: subsonic.enabled,
    uptime: process.uptime(),
  });
});

// Start server (when not running serverless on Vercel)
if (!process.env.VERCEL) {
  console.log(`Starting BitChord Lossless FLAC Addon Server...`);
  console.log(`Addon Name: ${config.addonName}`);
  console.log(`Addon ID: ${config.addonId}`);
  console.log(`FLAC Directory: ${flacLib.getMusicDir()} (${flacLib.getTrackCount()} tracks loaded)`);
  console.log(`Lossless Gate: ${config.checkValidLossless === 1 ? 'Enabled (Requires LDAC / DAC)' : 'Disabled'}`);

  serve(
    {
      fetch: app.fetch,
      port: config.port,
      hostname: config.host,
    },
    (info) => {
      console.log(`🚀 BitChord Lossless Addon listening on http://${info.address}:${info.port}`);
      console.log(`📦 Manifest URL: http://${info.address}:${info.port}/manifest.json`);
    }
  );
}

export default app;
export { app };
