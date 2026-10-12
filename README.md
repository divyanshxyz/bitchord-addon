# BitChord Lossless FLAC Addon

Bit-exact, high-resolution Lossless FLAC streaming addon for [BitChord](https://bitchord.kushagrasingh.in).

- **True 24-bit / 96 kHz & 16-bit / 44.1 kHz FLAC**: Bit-perfect audio streaming with HTTP 206 Partial Content range seeking.
- **Embedded Metadata & Artwork**: Reads Vorbis comments, embedded album artwork, sample rate, bit depth, and bitrate via `music-metadata`.
- **Multi-Source Library Architecture**:
  1. **Local FLAC Directory** (`./music` or custom `MUSIC_DIR`).
  2. **Navidrome / Subsonic** bridge (stream your remote self-hosted FLAC collection).
  3. **Broad Catalog Fallback** (JioSaavn 80M+ tracks when not in local FLAC library).
- **BitChord Lossless Gate Compliant**: Supports BitChord's `checkValidLossless` output contract (wired headphones, USB DACs, LDAC).

---

## ⚡ Quickstart

### 1. Add your FLAC files
Drop your `.flac` files into the `music/` directory (or set `MUSIC_DIR` in `.env` to any folder on your computer, e.g. `C:\Users\username\Music`).

A 24-bit/96kHz sample track (`music/sample.flac`) is pre-generated for immediate testing.

### 2. Run Test Suite
```bash
npm test
```

### 3. Start Server
```bash
npm run dev
# or for production:
npm run build
npm start
```
Server runs at `http://localhost:3000`.

---

## 📱 Connect to BitChord App

1. Expose server via HTTPS (Render, Railway, Fly.io, Cloudflare Tunnel, or Tailscale).
2. In BitChord on your phone/desktop:
   - Navigate to **Settings** &rarr; **Sources** &rarr; **Add an addon**.
   - Enter `https://<your-server>/manifest.json`.
   - Run health check.
3. BitChord will stream bit-perfect FLAC audio and display the `LOSSLESS` badge during playback!
