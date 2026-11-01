import type { TTSVoiceOption, TTSSettings } from '../types';

export type TTSStatus = 'idle' | 'playing' | 'paused';

export const NATURAL_VI_VOICE_URI = 'edge:vi-VN-HoaiMyNeural';

export const DEFAULT_ONLINE_VOICES: TTSVoiceOption[] = [
  {
    voiceURI: 'edge:vi-VN-HoaiMyNeural',
    name: 'Hoài My (Nữ)',
    style: 'Tự nhiên & Truyền cảm',
    lang: 'vi-VN',
    gender: 'female',
    provider: 'edge',
    isDefault: true,
    isVietnamese: true,
    recommended: true,
    description: 'Giọng nữ chuẩn Bắc mượt mà, diễn cảm xuất sắc cho tiểu thuyết và truyện audio.',
  },
  {
    voiceURI: 'edge:vi-VN-NamMinhNeural',
    name: 'Nam Minh (Nam)',
    style: 'Trầm ấm & Điềm đạm',
    lang: 'vi-VN',
    gender: 'male',
    provider: 'edge',
    isDefault: false,
    isVietnamese: true,
    recommended: true,
    description: 'Giọng nam trầm ấm, truyền cảm, thích hợp đọc truyện kiếm hiệp, tiên hiệp, lịch sử.',
  },
  {
    voiceURI: 'edge:vi-VN-HoaiMyNeural:story',
    name: 'Hoài My - Kể Chuyện',
    style: 'Tâm sự & Nhẹ nhàng',
    lang: 'vi-VN',
    gender: 'female',
    provider: 'edge',
    isDefault: false,
    isVietnamese: true,
    recommended: false,
    description: 'Tông giọng sâu lắng, tốc độ thong thả, mang phong cách kể chuyện đêm khuya.',
  },
  {
    voiceURI: 'edge:vi-VN-HoaiMyNeural:youth',
    name: 'Hoài My - Trẻ Trung',
    style: 'Trong trẻo & Tươi vui',
    lang: 'vi-VN',
    gender: 'female',
    provider: 'edge',
    isDefault: false,
    isVietnamese: true,
    recommended: false,
    description: 'Tông cao trong trẻo, tươi sáng, phù hợp truyện ngôn tình học đường, đời sống.',
  },
  {
    voiceURI: 'edge:vi-VN-NamMinhNeural:epic',
    name: 'Nam Minh - Kiếm Hiệp',
    style: 'Trầm hùng & Hào sảng',
    lang: 'vi-VN',
    gender: 'male',
    provider: 'edge',
    isDefault: false,
    isVietnamese: true,
    recommended: false,
    description: 'Giọng nam trầm vang, có khí chất hào sảng, cực hợp các phân đoạn phân tranh, chiến đấu.',
  },
  {
    voiceURI: 'edge:vi-VN-NamMinhNeural:fast',
    name: 'Nam Minh - Thời Sự',
    style: 'Rõ ràng & Dứt khoát',
    lang: 'vi-VN',
    gender: 'male',
    provider: 'edge',
    isDefault: false,
    isVietnamese: true,
    recommended: false,
    description: 'Tiết tấu nhanh, dứt khoát, phát âm chuẩn, thích hợp đọc lướt nội dung.',
  },
  {
    voiceURI: 'vi-natural-google',
    name: 'Chị Google',
    style: 'Quen thuộc & Dễ nghe',
    lang: 'vi-VN',
    gender: 'female',
    provider: 'google',
    isDefault: false,
    isVietnamese: true,
    recommended: false,
    description: 'Giọng đọc Google Translate quen thuộc, ổn định và tải nhanh.',
  },
];

export function isOnlineVoice(uri?: string): boolean {
  if (!uri) return true;
  return uri.startsWith('edge:') || uri.startsWith('google:') || uri === 'vi-natural-google';
}

export function hasSpeakableText(text: string): boolean {
  return /[a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/.test(text);
}

export function splitParagraphIntoChunks(text: string, voiceURI?: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || !hasSpeakableText(clean)) return [];

  const isGoogle = voiceURI === 'vi-natural-google';
  const maxLen = isGoogle ? 170 : 1000;

  if (clean.length <= maxLen) return [clean];

  const sentences = clean.split(/(?<=[.!?…;:])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current ? current + ' ' + s : s).trim();
    } else {
      if (current && hasSpeakableText(current)) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        const subWords = s.split(/\s+/);
        let subChunk = '';
        for (const w of subWords) {
          if ((subChunk + ' ' + w).trim().length <= maxLen) {
            subChunk = (subChunk ? subChunk + ' ' + w : w).trim();
          } else {
            if (subChunk && hasSpeakableText(subChunk)) chunks.push(subChunk);
            subChunk = w;
          }
        }
        current = subChunk;
      }
    }
  }
  if (current && hasSpeakableText(current)) chunks.push(current);
  return chunks.filter((c) => hasSpeakableText(c));
}

export interface ParagraphSpan {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  ratioStart: number;
  ratioEnd: number;
}

export interface TTSAudioBlock {
  blockIndex: number;
  text: string;
  spans: ParagraphSpan[];
  startParagraphIndex: number;
  endParagraphIndex: number;
}

export function buildAudioBlocks(
  paragraphs: string[],
  startParagraphIndex: number = 0,
  voiceURI?: string
): TTSAudioBlock[] {
  const isGoogle = voiceURI === 'vi-natural-google';
  // Natural flow: Edge TTS synthesizes 500-800 characters (~30-50s) with human-like prosody.
  // Google TTS has a strict 170-character limit.
  const targetMaxChars = isGoogle ? 160 : 750;
  const hardMaxChars = isGoogle ? 180 : 1000;

  const blocks: TTSAudioBlock[] = [];
  let blockIndex = 0;

  let currentBlockTextParts: string[] = [];
  let currentSpans: { index: number; text: string; length: number }[] = [];
  let currentBlockCharCount = 0;

  function commitCurrentBlock() {
    if (currentSpans.length === 0) return;
    const joinedText = currentBlockTextParts.join('\n');
    const totalChars = currentBlockCharCount;

    let charOffset = 0;
    const finalSpans: ParagraphSpan[] = [];

    for (let i = 0; i < currentSpans.length; i++) {
      const s = currentSpans[i];
      const spanLen = s.length;
      const start = charOffset;
      const end = charOffset + spanLen;
      const ratioStart = totalChars > 0 ? start / totalChars : 0;
      const ratioEnd = totalChars > 0 ? end / totalChars : 1;

      finalSpans.push({
        index: s.index,
        text: s.text,
        charStart: start,
        charEnd: end,
        ratioStart,
        ratioEnd,
      });

      charOffset = end + 1;
    }

    blocks.push({
      blockIndex: blockIndex++,
      text: joinedText,
      spans: finalSpans,
      startParagraphIndex: finalSpans[0].index,
      endParagraphIndex: finalSpans[finalSpans.length - 1].index,
    });

    currentBlockTextParts = [];
    currentSpans = [];
    currentBlockCharCount = 0;
  }

  for (let i = startParagraphIndex; i < paragraphs.length; i++) {
    const raw = paragraphs[i]?.trim();
    if (!raw || !hasSpeakableText(raw)) continue;

    if (raw.length > hardMaxChars) {
      commitCurrentBlock();
      const subChunks = splitParagraphIntoChunks(raw, voiceURI);
      for (const chunk of subChunks) {
        if (!hasSpeakableText(chunk)) continue;
        blocks.push({
          blockIndex: blockIndex++,
          text: chunk,
          spans: [
            {
              index: i,
              text: chunk,
              charStart: 0,
              charEnd: chunk.length,
              ratioStart: 0,
              ratioEnd: 1,
            },
          ],
          startParagraphIndex: i,
          endParagraphIndex: i,
        });
      }
      continue;
    }

    let speechText = raw;
    if (!/[.!?…;:\-—"”'’]$/.test(speechText)) {
      speechText += '.';
    }

    const addedLen = speechText.length + (currentBlockCharCount > 0 ? 1 : 0);

    if (currentBlockCharCount > 0 && currentBlockCharCount + addedLen > targetMaxChars) {
      commitCurrentBlock();
    }

    currentBlockTextParts.push(speechText);
    currentSpans.push({ index: i, text: raw, length: speechText.length });
    currentBlockCharCount += speechText.length;
  }

  commitCurrentBlock();
  return blocks;
}

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  // Dual-Audio Ping-Pong Buffers for Gapless Natural Playback
  private audioA: HTMLAudioElement | null = null;
  private audioB: HTMLAudioElement | null = null;
  private currentAudioIndex: 0 | 1 = 0; // 0 = audioA is active, 1 = audioB is active
  private previewAudioEl: HTMLAudioElement | null = null;

  // In-memory Blob ObjectURL cache to eliminate network and decoding gaps
  private blobCache = new Map<string, string>();
  private pendingFetches = new Map<string, Promise<string>>();

  private audioBlocks: TTSAudioBlock[] = [];
  private currentBlockIndex: number = 0;
  private isOnlineEngine: boolean = true;
  private errorRetryCount: number = 0;
  private currentRequestId: number = 0;
  private isTransitioning: boolean = false;

  private paragraphs: string[] = [];
  private currentIndex: number = 0;
  private status: TTSStatus = 'idle';

  private settings: TTSSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    voiceURI: NATURAL_VI_VOICE_URI,
  };

  private onParagraphChangeCallback?: (index: number) => void;
  private onStatusChangeCallback?: (status: TTSStatus) => void;
  private onFinishCallback?: () => void;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
      }
      this.audioA = new Audio();
      this.audioB = new Audio();
      this.previewAudioEl = new Audio();
      this.setupAudioListeners();
    }
  }

  private getActiveAudio(): HTMLAudioElement | null {
    return this.currentAudioIndex === 0 ? this.audioA : this.audioB;
  }

  private getStandbyAudio(): HTMLAudioElement | null {
    return this.currentAudioIndex === 0 ? this.audioB : this.audioA;
  }

  private swapAudio() {
    this.currentAudioIndex = this.currentAudioIndex === 0 ? 1 : 0;
  }

  private setupAudioListeners() {
    const bindEl = (el: HTMLAudioElement | null, id: 0 | 1) => {
      if (!el) return;
      el.onplaying = () => {
        if (this.currentAudioIndex === id) {
          this.errorRetryCount = 0;
          this.isTransitioning = false;
          this.setStatus('playing');
        }
      };
      el.ontimeupdate = () => {
        if (this.currentAudioIndex !== id || this.status !== 'playing') return;
        const block = this.audioBlocks[this.currentBlockIndex];
        if (!block || block.spans.length === 0) return;

        const duration = el.duration;
        if (duration > 0) {
          const ratio = Math.max(0, Math.min(1, el.currentTime / duration));
          const matchingSpan =
            block.spans.find((s) => ratio >= s.ratioStart && ratio < s.ratioEnd) ||
            (ratio >= 0.98 ? block.spans[block.spans.length - 1] : block.spans[0]);

          if (matchingSpan && matchingSpan.index !== this.currentIndex) {
            this.currentIndex = matchingSpan.index;
            if (this.onParagraphChangeCallback) {
              this.onParagraphChangeCallback(matchingSpan.index);
            }
          }

          // Gapless early transition: Edge TTS has ~200-300ms trailing silence.
          // Trigger the next block slightly early (0.12s before end) to completely eliminate dead air!
          if (duration > 1.5 && el.currentTime >= duration - 0.12 && !this.isTransitioning) {
            this.handleCurrentItemEnded();
          }
        }
      };
      el.onended = () => {
        if (this.currentAudioIndex === id && !this.isTransitioning) {
          this.handleCurrentItemEnded();
        }
      };
      el.onerror = () => {
        if (this.currentAudioIndex === id) {
          this.handleCurrentItemError();
        }
      };
    };

    bindEl(this.audioA, 0);
    bindEl(this.audioB, 1);
  }

  private handleCurrentItemError() {
    if (this.status !== 'playing' || !this.isOnlineEngine) return;
    const active = this.getActiveAudio();
    if (!active || !active.src || active.src === window.location.href) return;

    this.errorRetryCount++;
    console.warn(`[TTSService] Audio error (retry ${this.errorRetryCount}/3):`, active.error);

    if (this.errorRetryCount >= 3) {
      console.warn('[TTSService] Retries exhausted. Pausing audio.');
      this.errorRetryCount = 0;
      this.setStatus('paused');
      return;
    }

    const reqId = this.currentRequestId;
    setTimeout(() => {
      if (this.status === 'playing' && this.isOnlineEngine && this.currentRequestId === reqId) {
        this.playCurrentBlock();
      }
    }, 600);
  }

  public isSupported(): boolean {
    return true;
  }

  public async getVoices(): Promise<TTSVoiceOption[]> {
    let onlineVoices: TTSVoiceOption[] = DEFAULT_ONLINE_VOICES;

    try {
      const res = await fetch('/api/tts/voices');
      if (res.ok) {
        const serverVoices = await res.json();
        if (Array.isArray(serverVoices) && serverVoices.length > 0) {
          onlineVoices = serverVoices.map((v: any) => ({
            voiceURI: v.id,
            name: v.name,
            style: v.style,
            gender: v.gender,
            provider: v.provider,
            lang: 'vi-VN',
            isDefault: v.id === NATURAL_VI_VOICE_URI,
            isVietnamese: true,
            description: v.description,
            recommended: !!v.recommended,
          }));
        }
      }
    } catch {
      // Use DEFAULT_ONLINE_VOICES fallback
    }

    // Local system Web Speech voices
    const systemVoices: TTSVoiceOption[] = [];
    if (this.synth) {
      const rawVoices = this.synth.getVoices() || [];
      const isVi = (v: { lang: string; name: string }) => {
        const l = v.lang.toLowerCase();
        const n = v.name.toLowerCase();
        return (
          l.startsWith('vi') ||
          l.includes('vietnam') ||
          n.includes('vietnam') ||
          n.includes('tiếng việt') ||
          n.includes('vietnamese')
        );
      };

      rawVoices.filter(isVi).forEach((v) => {
        systemVoices.push({
          voiceURI: v.voiceURI,
          name: `${v.name} (Thiết bị)`,
          style: 'Giọng hệ thống offline',
          gender: v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('nam') ? 'male' : 'female',
          provider: 'system',
          lang: v.lang,
          isDefault: false,
          isVietnamese: true,
          description: 'Giọng đọc cục bộ cài đặt trên máy',
        });
      });
    }

    return [...onlineVoices, ...systemVoices];
  }

  public setSettings(settings: Partial<TTSSettings>) {
    this.settings = { ...this.settings, ...settings };
    if (this.audioA) {
      this.audioA.playbackRate = this.settings.rate;
      this.audioA.volume = this.settings.volume;
    }
    if (this.audioB) {
      this.audioB.playbackRate = this.settings.rate;
      this.audioB.volume = this.settings.volume;
    }
  }

  public getSettings(): TTSSettings {
    return this.settings;
  }

  public onParagraphChange(cb: (index: number) => void) {
    this.onParagraphChangeCallback = cb;
  }

  public onStatusChange(cb: (status: TTSStatus) => void) {
    this.onStatusChangeCallback = cb;
  }

  public onFinish(cb: () => void) {
    this.onFinishCallback = cb;
  }

  private setStatus(status: TTSStatus) {
    this.status = status;
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status);
    }
  }

  public getStatus(): TTSStatus {
    return this.status;
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  // --- AUDIO PRELOADING & OBJECT URL CACHE ---
  private async getAudioBlobUrl(text: string, voiceURI?: string): Promise<string> {
    const clean = text.trim();
    if (!clean) throw new Error('Empty text');
    const voice = voiceURI || NATURAL_VI_VOICE_URI;
    const cacheKey = `${voice}::${clean}`;

    if (this.blobCache.has(cacheKey)) {
      return this.blobCache.get(cacheKey)!;
    }

    if (this.pendingFetches.has(cacheKey)) {
      return this.pendingFetches.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const encoded = encodeURIComponent(clean);
        const encodedVoice = encodeURIComponent(voice);
        const res = await fetch(`/api/tts?text=${encoded}&voice=${encodedVoice}`);
        if (!res.ok) {
          throw new Error(`TTS HTTP error ${res.status}`);
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);

        // Keep cache bounded to 150 items to avoid excessive RAM usage
        if (this.blobCache.size >= 150) {
          const oldestKey = this.blobCache.keys().next().value;
          if (oldestKey) {
            const oldUrl = this.blobCache.get(oldestKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            this.blobCache.delete(oldestKey);
          }
        }

        this.blobCache.set(cacheKey, objectUrl);
        return objectUrl;
      } finally {
        this.pendingFetches.delete(cacheKey);
      }
    })();

    this.pendingFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private preloadNextBlock() {
    if (this.currentBlockIndex + 1 >= this.audioBlocks.length) return;
    const nextBlock = this.audioBlocks[this.currentBlockIndex + 1];
    const standby = this.getStandbyAudio();
    if (!standby) return;

    this.getAudioBlobUrl(nextBlock.text, this.settings.voiceURI)
      .then((blobUrl) => {
        if (this.status === 'playing' && this.isOnlineEngine) {
          standby.src = blobUrl;
          standby.playbackRate = this.settings.rate;
          standby.volume = this.settings.volume;
          standby.load();
        }
      })
      .catch((err) => {
        console.warn('[TTSService] Preload error:', err);
      });

    // Proactively fetch block + 2 into blob cache as well
    if (this.currentBlockIndex + 2 < this.audioBlocks.length) {
      const blockAfterNext = this.audioBlocks[this.currentBlockIndex + 2];
      this.getAudioBlobUrl(blockAfterNext.text, this.settings.voiceURI).catch(() => {});
    }
  }

  public startReading(paragraphs: string[], startIndex = 0) {
    this.stop();
    this.stopPreview();
    this.currentRequestId++;
    this.paragraphs = paragraphs || [];
    if (this.paragraphs.length === 0) {
      console.warn('[TTSService] startReading called with empty paragraphs.');
      this.setStatus('idle');
      return;
    }
    this.currentIndex = Math.max(0, Math.min(startIndex, this.paragraphs.length - 1));

    // Determine engine based on selected voice
    this.isOnlineEngine = isOnlineVoice(this.settings.voiceURI);

    if (this.isOnlineEngine) {
      this.audioBlocks = buildAudioBlocks(this.paragraphs, this.currentIndex, this.settings.voiceURI);
      this.currentBlockIndex = 0;
      if (this.audioBlocks.length === 0) {
        this.setStatus('idle');
        if (this.onFinishCallback) this.onFinishCallback();
        return;
      }
      this.playCurrentBlock();
    } else {
      this.speakCurrentSystem();
    }
  }

  // --- ONLINE NATURAL ENGINE ---
  private async playCurrentBlock() {
    const reqId = this.currentRequestId;
    const active = this.getActiveAudio();
    if (!active) return;

    if (this.currentBlockIndex >= this.audioBlocks.length) {
      this.setStatus('idle');
      if (this.onFinishCallback) this.onFinishCallback();
      return;
    }

    const block = this.audioBlocks[this.currentBlockIndex];
    if (!block || !hasSpeakableText(block.text)) {
      this.currentBlockIndex++;
      this.playCurrentBlock();
      return;
    }

    this.setStatus('playing');
    this.currentIndex = block.startParagraphIndex;
    if (this.onParagraphChangeCallback) {
      this.onParagraphChangeCallback(this.currentIndex);
    }

    try {
      const blobUrl = await this.getAudioBlobUrl(block.text, this.settings.voiceURI);
      if (this.currentRequestId !== reqId || this.status !== 'playing') return;

      active.src = blobUrl;
      active.playbackRate = this.settings.rate;
      active.volume = this.settings.volume;

      const playPromise = active.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Seamlessly preload the upcoming block into standby audio
            this.preloadNextBlock();
          })
          .catch((err) => {
            if (err.name === 'AbortError') return;
            if (this.currentRequestId !== reqId) return;
            console.warn('[TTSService] active.play() warning:', err.name, err.message);
            if (err.name === 'NotAllowedError') {
              this.setStatus('paused');
            }
          });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (this.currentRequestId !== reqId) return;
      console.warn('[TTSService] playCurrentBlock error:', err);
    }
  }

  private handleCurrentItemEnded() {
    if (this.status !== 'playing' || !this.isOnlineEngine || this.isTransitioning) return;
    this.isTransitioning = true;
    const reqId = this.currentRequestId;

    const currentEl = this.getActiveAudio();
    if (currentEl && (!currentEl.duration || currentEl.duration < 0.2)) {
      console.warn('[TTSService] Ignored transition on invalid or near-zero duration.');
      this.isTransitioning = false;
      return;
    }

    if (this.currentBlockIndex + 1 >= this.audioBlocks.length) {
      this.isTransitioning = false;
      this.setStatus('idle');
      if (this.onFinishCallback) this.onFinishCallback();
      return;
    }

    this.currentBlockIndex++;
    const nextBlock = this.audioBlocks[this.currentBlockIndex];
    this.currentIndex = nextBlock.startParagraphIndex;
    if (this.onParagraphChangeCallback) {
      this.onParagraphChangeCallback(this.currentIndex);
    }

    this.swapAudio();
    const newActive = this.getActiveAudio();
    if (!newActive || this.currentRequestId !== reqId) {
      this.isTransitioning = false;
      return;
    }

    newActive.playbackRate = this.settings.rate;
    newActive.volume = this.settings.volume;

    const playPromise = newActive.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isTransitioning = false;
          // Preload upcoming block into standby
          this.preloadNextBlock();
        })
        .catch((err) => {
          this.isTransitioning = false;
          if (err.name === 'AbortError') return;
          console.warn('[TTSService] Seamless switch play warning, fallback to playCurrentBlock:', err);
          this.playCurrentBlock();
        });
    } else {
      this.isTransitioning = false;
    }
  }

  // --- SYSTEM WEB SPEECH ENGINE ---
  private isVietnameseVoice(v: SpeechSynthesisVoice): boolean {
    const l = v.lang.toLowerCase();
    const n = v.name.toLowerCase();
    return (
      l.startsWith('vi') ||
      l.includes('vietnam') ||
      n.includes('vietnam') ||
      n.includes('tiếng việt') ||
      n.includes('vietnamese')
    );
  }

  private speakCurrentSystem() {
    if (!this.synth) {
      this.isOnlineEngine = true;
      this.jumpToParagraph(this.currentIndex);
      return;
    }

    if (this.currentIndex >= this.paragraphs.length) {
      this.setStatus('idle');
      if (this.onFinishCallback) this.onFinishCallback();
      return;
    }

    const text = this.paragraphs[this.currentIndex]?.trim();
    if (!text) {
      this.currentIndex++;
      this.speakCurrentSystem();
      return;
    }

    this.setStatus('playing');
    if (this.onParagraphChangeCallback) {
      this.onParagraphChangeCallback(this.currentIndex);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    utterance.lang = 'vi-VN';

    const voices = this.synth.getVoices();
    let chosenVoice: SpeechSynthesisVoice | undefined;

    if (this.settings.voiceURI && !isOnlineVoice(this.settings.voiceURI)) {
      chosenVoice = voices.find((v) => v.voiceURI === this.settings.voiceURI);
    }

    if (!chosenVoice || !this.isVietnameseVoice(chosenVoice)) {
      this.isOnlineEngine = true;
      this.jumpToParagraph(this.currentIndex);
      return;
    }

    utterance.voice = chosenVoice;
    utterance.lang = chosenVoice.lang || 'vi-VN';
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;

    utterance.onend = () => {
      if (this.status === 'playing') {
        this.currentIndex++;
        this.speakCurrentSystem();
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', e);
      }
    };

    this.synth.speak(utterance);
  }

  public pause() {
    if (this.isOnlineEngine) {
      this.audioA?.pause();
      this.audioB?.pause();
      this.setStatus('paused');
    } else if (this.synth && this.status === 'playing') {
      this.synth.pause();
      this.setStatus('paused');
    }
  }

  public resume() {
    if (this.isOnlineEngine) {
      const active = this.getActiveAudio();
      if (this.status === 'paused' && active && active.src && active.src !== window.location.href) {
        active
          .play()
          .then(() => this.setStatus('playing'))
          .catch(() => {
            this.setStatus('playing');
            this.playCurrentBlock();
          });
      } else if (this.paragraphs.length > 0) {
        this.setStatus('playing');
        this.jumpToParagraph(this.currentIndex);
      }
    } else if (this.synth) {
      if (this.status === 'paused') {
        this.synth.resume();
        this.setStatus('playing');
      } else if (this.paragraphs.length > 0) {
        this.speakCurrentSystem();
      }
    }
  }

  public stop() {
    this.currentRequestId++;
    this.isTransitioning = false;
    this.setStatus('idle');
    this.currentUtterance = null;
    if (this.audioA) {
      this.audioA.pause();
      this.audioA.removeAttribute('src');
      this.audioA.load();
    }
    if (this.audioB) {
      this.audioB.pause();
      this.audioB.removeAttribute('src');
      this.audioB.load();
    }
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public playVoicePreview(voiceURI: string, onEnded?: () => void): Promise<void> {
    this.stopPreview();
    if (!this.previewAudioEl) return Promise.resolve();

    const sampleText = 'Xin chào, đây là giọng đọc thử nghiệm tiếng Việt.';
    const encoded = encodeURIComponent(sampleText);
    const voice = encodeURIComponent(voiceURI);

    this.previewAudioEl.src = `/api/tts?text=${encoded}&voice=${voice}`;
    this.previewAudioEl.playbackRate = 1.0;
    this.previewAudioEl.volume = this.settings.volume;

    this.previewAudioEl.onended = () => {
      if (onEnded) onEnded();
    };

    return this.previewAudioEl.play().catch(() => {
      if (onEnded) onEnded();
    });
  }

  public stopPreview() {
    if (this.previewAudioEl) {
      this.previewAudioEl.pause();
      this.previewAudioEl.removeAttribute('src');
      this.previewAudioEl.load();
    }
  }

  public getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  public nextParagraph() {
    if (this.currentIndex < this.paragraphs.length - 1) {
      this.jumpToParagraph(this.currentIndex + 1);
    }
  }

  public prevParagraph() {
    if (this.currentIndex > 0) {
      this.jumpToParagraph(this.currentIndex - 1);
    }
  }

  public jumpToParagraph(index: number) {
    if (index < 0 || index >= this.paragraphs.length) return;

    this.currentRequestId++;
    this.isTransitioning = false;
    if (this.audioA) {
      this.audioA.pause();
      this.audioA.removeAttribute('src');
      this.audioA.load();
    }
    if (this.audioB) {
      this.audioB.pause();
      this.audioB.removeAttribute('src');
      this.audioB.load();
    }
    if (this.synth) {
      this.synth.cancel();
    }

    this.currentIndex = index;

    if (this.status === 'playing' || this.status === 'paused') {
      if (this.isOnlineEngine) {
        this.audioBlocks = buildAudioBlocks(this.paragraphs, index, this.settings.voiceURI);
        this.currentBlockIndex = 0;
        this.playCurrentBlock();
      } else {
        this.speakCurrentSystem();
      }
    } else {
      if (this.onParagraphChangeCallback) {
        this.onParagraphChangeCallback(this.currentIndex);
      }
    }
  }
}

export const ttsService = new TTSService();
