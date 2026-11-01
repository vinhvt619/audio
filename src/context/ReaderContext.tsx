import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReaderSettings, ReaderTheme } from '../types';

interface ReaderContextType {
  settings: ReaderSettings;
  updateSettings: (newSettings: Partial<ReaderSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: ReaderSettings = {
  theme: 'sepia',
  fontFamily: 'serif',
  fontSize: 19,
  lineHeight: 1.9,
  letterSpacing: 0.2,
  paragraphSpacing: 22,
  maxWidth: 'normal',
  textAlign: 'justify',
  autoScrollWithTTS: true,
  bionicReading: false,
};

const STORAGE_KEY = 'audioread_reader_settings';

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export const ReaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse reader settings from localStorage', e);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save reader settings to localStorage', e);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <ReaderContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </ReaderContext.Provider>
  );
};

export const useReader = () => {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  return context;
};

export function getThemeClasses(theme: ReaderTheme) {
  switch (theme) {
    case 'sepia':
      return {
        bg: 'bg-[#fbf0d9]',
        surface: 'bg-[#f4e6c9]',
        text: 'text-[#433422]',
        mutedText: 'text-[#7e6950]',
        border: 'border-[#e4d3b4]',
        highlight: 'bg-[#edd8b0] text-[#342410] ring-2 ring-[#cbb48b]',
        activeParagraph: 'bg-[#f0e0be]/90 shadow-sm border-l-4 border-[#b8935c] pl-3',
      };
    case 'forest':
      return {
        bg: 'bg-[#eef6f0]',
        surface: 'bg-[#e0eee3]',
        text: 'text-[#1d3d27]',
        mutedText: 'text-[#456d50]',
        border: 'border-[#cde0d2]',
        highlight: 'bg-[#d2e8d7] text-[#132c1c] ring-2 ring-[#a4ccad]',
        activeParagraph: 'bg-[#deede1]/90 shadow-sm border-l-4 border-[#3e8452] pl-3',
      };
    case 'night':
      return {
        bg: 'bg-[#18181b]',
        surface: 'bg-[#27272a]',
        text: 'text-[#e4e4e7]',
        mutedText: 'text-[#a1a1aa]',
        border: 'border-[#3f3f46]',
        highlight: 'bg-[#3f3f46] text-white ring-2 ring-indigo-500',
        activeParagraph: 'bg-[#27272a]/90 shadow-sm border-l-4 border-indigo-500 pl-3',
      };
    case 'dark':
      return {
        bg: 'bg-[#000000]',
        surface: 'bg-[#141416]',
        text: 'text-[#d4d4d8]',
        mutedText: 'text-[#71717a]',
        border: 'border-[#27272a]',
        highlight: 'bg-[#27272a] text-white ring-2 ring-indigo-400',
        activeParagraph: 'bg-[#18181b]/90 shadow-sm border-l-4 border-indigo-400 pl-3',
      };
    case 'light':
    default:
      return {
        bg: 'bg-[#ffffff]',
        surface: 'bg-[#f8fafc]',
        text: 'text-[#1e293b]',
        mutedText: 'text-[#64748b]',
        border: 'border-[#e2e8f0]',
        highlight: 'bg-indigo-50 text-indigo-950 ring-2 ring-indigo-300',
        activeParagraph: 'bg-indigo-50/70 shadow-sm border-l-4 border-indigo-600 pl-3',
      };
  }
}
