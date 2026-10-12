export interface BitChordManifestSettingOption {
  label: string;
  value: string;
}

export interface BitChordManifestSetting {
  key: string;
  type: 'select' | 'text' | 'boolean';
  default: string;
  options?: BitChordManifestSettingOption[];
}

export interface BitChordManifest {
  id: string;
  name: string;
  version: string;
  resources: ('search' | 'stream')[];
  allowDownloads?: number;
  checkValidLossless?: number;
  settings?: BitChordManifestSetting[];
}

export interface BitChordTrack {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  artworkURL?: string;
  format?: string;
  audioQuality?: string;
  streamURL?: string;
  audioModes?: string[];
  atmos?: boolean;
}

export interface BitChordSearchResponse {
  tracks: BitChordTrack[];
}

export interface BitChordStreamResponse {
  url: string;
  format?: string;
  quality?: string;
  codec?: string;
  container?: string;
  manifest?: 'none' | 'hls' | 'dash';
  encrypted: boolean;
  sampleRate?: number;
  bitDepth?: number;
  bitrate?: number;
  audioMode?: string;
  error?: string;
}

export interface JioSaavnSearchItem {
  id: string;
  song: string;
  album: string;
  duration: string | number;
  image: string;
  primary_artists?: string;
  singers?: string;
  music?: string;
  year?: string;
  encrypted_media_url?: string;
  media_preview_url?: string;
  [key: string]: unknown;
}

export interface JioSaavnSearchApiResponse {
  results?: JioSaavnSearchItem[];
  total?: number;
  [key: string]: unknown;
}
