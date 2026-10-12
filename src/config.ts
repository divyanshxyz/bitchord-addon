export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  addonId: process.env.ADDON_ID || 'in.divyansh.bitchord-flac',
  addonName: process.env.ADDON_NAME || 'Lossless FLAC Master Library',
  addonVersion: process.env.ADDON_VERSION || '1.1.0',
  allowDownloads: process.env.ALLOW_DOWNLOADS !== '0' ? 1 : 0,
  checkValidLossless: process.env.CHECK_VALID_LOSSLESS === '1' ? 1 : 0,
  musicDir: process.env.MUSIC_DIR || './music',
  subsonicUrl: process.env.SUBSONIC_URL || '',
  subsonicUser: process.env.SUBSONIC_USER || '',
  subsonicToken: process.env.SUBSONIC_TOKEN || '',
  cacheTtlMs: 10 * 60 * 1000,
};
