import fs from 'fs';
import path from 'path';

// Generate a gentle 15-second ambient chord melody as sample audiobook audio
const sampleRate = 44100;
const durationSeconds = 15;
const totalSamples = sampleRate * durationSeconds;
const numChannels = 1;
const bytesPerSample = 2; // 16-bit PCM

const dataSize = totalSamples * numChannels * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

// RIFF header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);

// fmt subchunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
buffer.writeUInt16LE(16, 34); // BitsPerSample

// data subchunk
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Generate gentle melody: C - G - Am - F progression chords
const notes = [261.63, 392.00, 440.00, 349.23]; // C4, G4, A4, F4
let offset = 44;

for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate;
  const chordIdx = Math.floor((t / durationSeconds) * notes.length) % notes.length;
  const freq = notes[chordIdx];

  // Soft sine wave with gentle envelope
  const envelope = Math.sin((Math.PI * (t % (durationSeconds / notes.length))) / (durationSeconds / notes.length));
  const sampleValue = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
  const int16Value = Math.floor(sampleValue * 32767);

  buffer.writeInt16LE(int16Value, offset);
  offset += 2;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'sample-audio.wav'), buffer);
console.log('Successfully created public/sample-audio.wav');
