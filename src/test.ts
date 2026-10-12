import { FlacLibraryManager } from './flacLibrary.js';
import { searchTracks as searchSaavn, resolveStream as resolveSaavn } from './saavn.js';
import { config } from './config.js';

async function runTests() {
  console.log('🧪 Starting Lossless FLAC BitChord Contract Verification...\n');

  // Test 1: Config & Identity
  console.log('Checking Addon Identity:');
  console.log(`  ID: ${config.addonId}`);
  console.log(`  Name: ${config.addonName}`);
  console.log(`  Directory: ${config.musicDir}`);
  if (!config.addonId) throw new Error('Addon ID is empty!');
  console.log('  ✅ Manifest identity passed.\n');

  // Test 2: Local FLAC Library Scanning
  console.log('Scanning FLAC Directory...');
  const flacLib = new FlacLibraryManager(config.musicDir);
  const count = await flacLib.scan();
  console.log(`  Scanned ${count} FLAC track(s) from ${flacLib.getMusicDir()}`);

  if (count === 0) {
    throw new Error('No FLAC tracks scanned in music/ folder!');
  }

  // Test 3: Local FLAC Search
  console.log('Testing FLAC Search ("Lossless Acoustic")...');
  const flacResults = flacLib.search('Lossless Acoustic', 'http://localhost:3000');
  if (flacResults.length === 0) {
    throw new Error('Could not find sample FLAC in local library search!');
  }

  const sample = flacResults[0];
  console.log('  FLAC Search Result:');
  console.log(`    Title: ${sample.title}`);
  console.log(`    Artist: ${sample.artist}`);
  console.log(`    Album: ${sample.album}`);
  console.log(`    Format: ${sample.format}`);
  console.log(`    Audio Quality: ${sample.audioQuality}`);
  console.log(`    Artwork URL: ${sample.artworkURL}`);

  if (sample.format !== 'flac') throw new Error('Format must be flac!');
  if (sample.audioQuality !== 'LOSSLESS') throw new Error('audioQuality must be LOSSLESS!');
  console.log('  ✅ FLAC search contract passed.\n');

  // Test 4: Stream response specs
  console.log('Testing FLAC Stream Response...');
  const streamRes = flacLib.buildStreamResponse(sample.id, 'http://localhost:3000');
  if (!streamRes) throw new Error('buildStreamResponse returned null!');

  console.log('  Stream Specs:');
  console.log(`    URL: ${streamRes.url}`);
  console.log(`    Codec: ${streamRes.codec}`);
  console.log(`    Container: ${streamRes.container}`);
  console.log(`    Quality: ${streamRes.quality}`);
  console.log(`    Sample Rate: ${streamRes.sampleRate} Hz`);
  console.log(`    Bit Depth: ${streamRes.bitDepth}-bit`);
  console.log(`    Bitrate: ${streamRes.bitrate} bps`);

  if (streamRes.codec !== 'flac' || streamRes.container !== 'flac') {
    throw new Error('Stream codec and container must be flac!');
  }
  if (streamRes.sampleRate !== 96000 || streamRes.bitDepth !== 24) {
    throw new Error('Sample rate or bit depth does not match 24-bit/96kHz!');
  }
  console.log('  ✅ FLAC stream response contract passed.\n');

  // Test 5: Broad Fallback (Saavn)
  console.log('Testing Broad Catalog Search ("Believer")...');
  const broadTracks = await searchSaavn('Believer', 'lossless');
  console.log(`  Found ${broadTracks.length} tracks in broad catalog fallback.`);
  console.log('  ✅ Broad fallback search passed.\n');

  console.log('🎉 ALL LOSSLESS FLAC CONTRACT TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
