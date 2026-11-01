export interface VietnameseVoice {
  id: string;
  name: string;
  style: string;
  gender: 'female' | 'male' | 'other';
  provider: 'edge' | 'google' | 'system';
  voiceName: string;
  pitch: string;
  rate: string;
  recommended: boolean;
  description: string;
}

export declare const VIETNAMESE_VOICES: VietnameseVoice[];

export declare function synthesizeSpeech(text: string, voiceId?: string): Promise<Buffer>;
