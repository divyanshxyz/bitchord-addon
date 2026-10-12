export function renderHtmlDashboard(addonId: string, addonName: string, version: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${addonName} · BitChord Addon</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090a0f;
      --card-bg: rgba(26, 29, 38, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.25);
      --accent-hover: #4f46e5;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --success: #10b981;
      --flac-gold: #f59e0b;
      --font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: radial-gradient(circle at 50% 0%, #1c1938 0%, var(--bg) 65%);
      color: var(--text);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1.5rem;
    }

    .container {
      width: 100%;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.12);
      color: #fbbf24;
      font-size: 0.825rem;
      font-weight: 600;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .badge-status::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fbbf24;
      box-shadow: 0 0 8px #fbbf24;
    }

    h1 {
      font-size: 2.25rem;
      font-weight: 700;
      background: linear-gradient(135deg, #fff 30%, #ffd480 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    p.subtitle {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 620px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      border-radius: 1rem;
      padding: 1.75rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .copy-box {
      display: flex;
      gap: 0.75rem;
      background: rgba(0, 0, 0, 0.4);
      padding: 0.6rem 0.85rem;
      border-radius: 0.6rem;
      border: 1px solid var(--card-border);
      align-items: center;
      font-family: var(--font-mono);
      font-size: 0.9rem;
      color: #cbd5e1;
    }

    .copy-box input {
      background: transparent;
      border: none;
      color: inherit;
      width: 100%;
      outline: none;
      font-family: inherit;
      font-size: inherit;
    }

    .btn {
      background: var(--accent);
      color: white;
      border: none;
      padding: 0.55rem 1rem;
      font-weight: 600;
      font-size: 0.85rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      white-space: nowrap;
    }

    .btn:hover { background: var(--accent-hover); }
    .btn:active { transform: scale(0.98); }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.14);
    }

    .steps-list {
      margin-top: 1rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .step-item {
      background: rgba(255, 255, 255, 0.03);
      padding: 1rem;
      border-radius: 0.6rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .step-num {
      color: var(--accent);
      font-weight: 700;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.35rem;
    }

    .step-text {
      font-size: 0.9rem;
      color: #d1d5db;
    }

    .search-row {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .search-row input {
      flex: 1;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--card-border);
      border-radius: 0.5rem;
      padding: 0.65rem 1rem;
      color: white;
      font-family: var(--font);
      font-size: 0.95rem;
      outline: none;
    }

    .search-row input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }

    .results-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 420px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    .track-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255, 255, 255, 0.02);
      padding: 0.75rem 1rem;
      border-radius: 0.6rem;
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.15s;
    }

    .track-row:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .track-cover {
      width: 46px;
      height: 46px;
      border-radius: 6px;
      object-fit: cover;
      background: #1f2937;
    }

    .track-info {
      flex: 1;
      min-width: 0;
    }

    .track-title {
      font-size: 0.95rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .track-artist {
      font-size: 0.8rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge-flac {
      font-size: 0.75rem;
      padding: 0.2rem 0.55rem;
      background: rgba(245, 158, 11, 0.18);
      color: #fde68a;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.04em;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }

    .badge-aac {
      font-size: 0.75rem;
      padding: 0.2rem 0.55rem;
      background: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      border-radius: 4px;
      font-weight: 600;
    }

    .play-btn {
      background: #22c55e;
      color: #000;
      border: none;
      padding: 0.4rem 0.85rem;
      border-radius: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .play-btn:hover { background: #16a34a; }

    audio {
      width: 100%;
      margin-top: 1rem;
      border-radius: 8px;
    }

    footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.825rem;
      margin-top: 1rem;
    }
    footer a { color: #a5b4fc; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge-status">Hi-Res Lossless 24-bit / 96 kHz Active</div>
      <h1>${addonName}</h1>
      <p class="subtitle">Bit-perfect FLAC streaming for BitChord. Drop FLAC tracks in <code>./music</code> or stream via Navidrome.</p>
    </header>

    <div class="card">
      <div class="card-title">
        <span>Connect to BitChord App</span>
        <button class="btn btn-secondary" id="rescanBtn" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">Rescan Music Folder</button>
      </div>
      <div class="copy-box">
        <input type="text" id="manifestUrl" readonly value="" />
        <button class="btn" id="copyBtn">Copy URL</button>
      </div>

      <div class="steps-list">
        <div class="step-item">
          <div class="step-num">Step 1</div>
          <div class="step-text">Open <strong>BitChord</strong> on your Android phone or desktop.</div>
        </div>
        <div class="step-item">
          <div class="step-num">Step 2</div>
          <div class="step-text">Go to <strong>Settings</strong> &rarr; <strong>Sources</strong> &rarr; <strong>Add an addon</strong>.</div>
        </div>
        <div class="step-item">
          <div class="step-num">Step 3</div>
          <div class="step-text">Paste the copied URL & enjoy bit-exact Lossless FLAC audio!</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Lossless FLAC Test Bench</div>
      <div class="search-row">
        <input type="text" id="searchInput" placeholder="Search track in library or broad catalog..." value="Lossless Acoustic" />
        <button class="btn" id="searchBtn">Search</button>
      </div>

      <div class="results-container" id="results">
        <div style="color: var(--text-muted); text-align: center; padding: 2rem;">Hit "Search" to test lossless streaming...</div>
      </div>

      <audio id="audioPlayer" controls style="display: none;"></audio>
    </div>

    <footer>
      BitChord Lossless Protocol Specification · Bit-perfect FLAC audio
    </footer>
  </div>

  <script>
    const origin = window.location.origin;
    const manifestInput = document.getElementById('manifestUrl');
    manifestInput.value = origin + '/manifest.json';

    document.getElementById('copyBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(manifestInput.value);
      const btn = document.getElementById('copyBtn');
      btn.innerText = 'Copied!';
      setTimeout(() => { btn.innerText = 'Copy URL'; }, 2000);
    });

    document.getElementById('rescanBtn').addEventListener('click', async () => {
      const btn = document.getElementById('rescanBtn');
      btn.innerText = 'Scanning...';
      try {
        const res = await fetch('/rescan', { method: 'POST' });
        const data = await res.json();
        alert('Scanned ' + data.count + ' FLAC tracks in ' + data.musicDir);
        doSearch();
      } catch (e) {
        alert('Rescan failed: ' + e.message);
      } finally {
        btn.innerText = 'Rescan Music Folder';
      }
    });

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsDiv = document.getElementById('results');
    const audioPlayer = document.getElementById('audioPlayer');

    async function doSearch() {
      const q = searchInput.value.trim();
      resultsDiv.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">Searching...</div>';

      try {
        const res = await fetch('/search?q=' + encodeURIComponent(q) + '&quality=lossless');
        const data = await res.json();
        if (!data.tracks || data.tracks.length === 0) {
          resultsDiv.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">No tracks found.</div>';
          return;
        }

        resultsDiv.innerHTML = '';
        data.tracks.forEach(track => {
          const isFlac = track.format === 'flac';
          const badgeClass = isFlac ? 'badge-flac' : 'badge-aac';
          const badgeText = isFlac ? 'FLAC LOSSLESS' : (track.format.toUpperCase() + ' 320k');

          const row = document.createElement('div');
          row.className = 'track-row';
          row.innerHTML = \`
            <img class="track-cover" src="\${track.artworkURL || '/art/default.png'}" alt="cover" />
            <div class="track-info">
              <div class="track-title">\${track.title}</div>
              <div class="track-artist">\${track.artist} \${track.album ? '· ' + track.album : ''}</div>
            </div>
            <div class="\${badgeClass}">\${badgeText}</div>
            <button class="play-btn" data-id="\${track.id}">Play</button>
          \`;
          row.querySelector('.play-btn').addEventListener('click', () => playTrack(track.id));
          resultsDiv.appendChild(row);
        });
      } catch (err) {
        resultsDiv.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 2rem;">Search failed: ' + err.message + '</div>';
      }
    }

    async function playTrack(id) {
      try {
        const res = await fetch('/stream/' + encodeURIComponent(id) + '?quality=lossless');
        if (!res.ok) throw new Error('Stream status ' + res.status);
        const data = await res.json();
        if (data.url) {
          audioPlayer.src = data.url;
          audioPlayer.style.display = 'block';
          audioPlayer.play();
        }
      } catch (err) {
        alert('Could not resolve stream: ' + err.message);
      }
    }

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });

    // Auto-search initially
    doSearch();
  </script>
</body>
</html>`;
}
