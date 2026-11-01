import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import https from 'https';

export const VIETNAMESE_VOICES = [
  {
    id: 'edge:vi-VN-HoaiMyNeural',
    name: 'Hoài My (Nữ)',
    style: 'Tự nhiên & Truyền cảm',
    gender: 'female',
    provider: 'edge',
    voiceName: 'vi-VN-HoaiMyNeural',
    pitch: '+0Hz',
    rate: '+0%',
    recommended: true,
    description: 'Giọng nữ chuẩn Bắc mượt mà, diễn cảm xuất sắc cho tiểu thuyết và truyện audio.'
  },
  {
    id: 'edge:vi-VN-NamMinhNeural',
    name: 'Nam Minh (Nam)',
    style: 'Trầm ấm & Điềm đạm',
    gender: 'male',
    provider: 'edge',
    voiceName: 'vi-VN-NamMinhNeural',
    pitch: '+0Hz',
    rate: '+0%',
    recommended: true,
    description: 'Giọng nam trầm ấm, truyền cảm, thích hợp đọc truyện kiếm hiệp, tiên hiệp, huyền huyễn.'
  },
  {
    id: 'edge:vi-VN-HoaiMyNeural:story',
    name: 'Hoài My - Kể Chuyện',
    style: 'Tâm sự & Nhẹ nhàng',
    gender: 'female',
    provider: 'edge',
    voiceName: 'vi-VN-HoaiMyNeural',
    pitch: '-2Hz',
    rate: '-5%',
    recommended: false,
    description: 'Tông giọng sâu lắng, tốc độ thong thả, phong cách kể chuyện đêm khuya.'
  },
  {
    id: 'edge:vi-VN-HoaiMyNeural:youth',
    name: 'Hoài My - Trẻ Trung',
    style: 'Trong trẻo & Tươi vui',
    gender: 'female',
    provider: 'edge',
    voiceName: 'vi-VN-HoaiMyNeural',
    pitch: '+4Hz',
    rate: '+6%',
    recommended: false,
    description: 'Tông cao trong trẻo, tươi sáng, phù hợp truyện ngôn tình học đường, đời sống.'
  },
  {
    id: 'edge:vi-VN-NamMinhNeural:epic',
    name: 'Nam Minh - Kiếm Hiệp',
    style: 'Trầm hùng & Hào sảng',
    gender: 'male',
    provider: 'edge',
    voiceName: 'vi-VN-NamMinhNeural',
    pitch: '-5Hz',
    rate: '-4%',
    recommended: false,
    description: 'Giọng nam trầm vang, khí chất hào sảng, cực hợp các phân đoạn phân tranh, chiến đấu.'
  },
  {
    id: 'edge:vi-VN-NamMinhNeural:fast',
    name: 'Nam Minh - Thời Sự',
    style: 'Rõ ràng & Dứt khoát',
    gender: 'male',
    provider: 'edge',
    voiceName: 'vi-VN-NamMinhNeural',
    pitch: '+2Hz',
    rate: '+8%',
    recommended: false,
    description: 'Tiết tấu nhanh, dứt khoát, phát âm chuẩn, thích hợp đọc lướt nội dung.'
  },
  {
    id: 'vi-natural-google',
    name: 'Chị Google',
    style: 'Quen thuộc & Dễ nghe',
    gender: 'female',
    provider: 'google',
    voiceName: 'google',
    pitch: '0',
    rate: '1',
    recommended: false,
    description: 'Giọng đọc Google Translate quen thuộc, ổn định và tải nhanh.'
  }
];

// In-memory audio buffer cache (up to 1,000 audio paragraphs/chunks)
const audioCache = new Map();
const pendingSyntheses = new Map();
const MAX_CACHE_SIZE = 1000;

function fetchGoogleTtsBuffer(text) {
  return new Promise((resolve, reject) => {
    const targetUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=vi&client=tw-ob`;
    https.get(
      targetUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Google TTS status code: ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    ).on('error', reject);
  });
}

function sanitizeForSSML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function synthesizeSpeech(text, voiceId = 'edge:vi-VN-HoaiMyNeural') {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Empty text');
  }

  const voiceConfig = VIETNAMESE_VOICES.find((v) => v.id === voiceId) || VIETNAMESE_VOICES[0];
  const cacheKey = `${voiceConfig.id}::${cleanText}`;

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey);
  }

  if (pendingSyntheses.has(cacheKey)) {
    return pendingSyntheses.get(cacheKey);
  }

  const synthesisPromise = (async () => {
    try {
      let buffer;

      if (voiceConfig.provider === 'google') {
        buffer = await fetchGoogleTtsBuffer(cleanText);
      } else {
        const tts = new MsEdgeTTS();
        try {
          await tts.setMetadata(voiceConfig.voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
          const ssmlText = sanitizeForSSML(cleanText);
          const { audioStream } = tts.toStream(ssmlText, {
            pitch: voiceConfig.pitch,
            rate: voiceConfig.rate,
          });

          buffer = await new Promise((resolve, reject) => {
            const chunks = [];
            audioStream.on('data', (c) => chunks.push(c));
            audioStream.on('end', () => resolve(Buffer.concat(chunks)));
            audioStream.on('error', reject);
          });
        } catch (edgeErr) {
          console.warn('Edge TTS failed, falling back to Google TTS:', edgeErr.message);
          buffer = await fetchGoogleTtsBuffer(cleanText);
        } finally {
          tts.close();
        }
      }

      // Manage cache size
      if (audioCache.size >= MAX_CACHE_SIZE) {
        const firstKey = audioCache.keys().next().value;
        if (firstKey) audioCache.delete(firstKey);
      }
      audioCache.set(cacheKey, buffer);

      return buffer;
    } finally {
      pendingSyntheses.delete(cacheKey);
    }
  })();

  pendingSyntheses.set(cacheKey, synthesisPromise);
  return synthesisPromise;
}
