import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './services/db';
import { getStoriesList, getStoryChapters, fetchDbStatus } from './services/dataService';
import { getOrFetchChapter } from './services/chapterService';
import { mergeStoryWithProgress } from './services/readingProgressService';
import type { Story, Chapter } from './types';
import { ReaderProvider } from './context/ReaderContext';
import { AudioProvider, useAudio } from './context/AudioContext';
import { Navbar } from './components/Navbar';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { ImportModal } from './components/ImportModal';
import { MongoModal } from './components/MongoModal';
import { LibraryView } from './views/LibraryView';
import { StoryDetailView } from './views/StoryDetailView';
import { ReaderView } from './views/ReaderView';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<'library' | 'story' | 'reader'>('library');
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);
  const [isMongoConnected, setIsMongoConnected] = useState(false);

  const { playChapter, currentStory, currentChapter, togglePlay } = useAudio();

  const isInternalNavRef = useRef(false);
  const storiesRef = useRef<Story[]>([]);

  useEffect(() => {
    storiesRef.current = stories;
  }, [stories]);

  const restoreRouteFromHash = useCallback(async (availableStories?: Story[]) => {
    const hash = window.location.hash ? window.location.hash.trim() : '';
    const storyList = availableStories && availableStories.length > 0 ? availableStories : storiesRef.current;

    // 1. Chapter Reader: #/story/:storyId/chapter/:chapIndex
    const chapterMatch = hash.match(/^#\/story\/([^/]+)\/chapter\/(\d+)$/);
    if (chapterMatch) {
      const storyId = decodeURIComponent(chapterMatch[1]);
      const chapterIndex = parseInt(chapterMatch[2], 10);

      let story = storyList.find((s) => s.id === storyId);
      if (!story) {
        story = await db.stories.get(storyId);
      }
      if (story) {
        const withProgress = mergeStoryWithProgress(story);
        setActiveStory(withProgress);
        let chaps = await getStoryChapters(withProgress.id);

        let targetChapter = chaps.find((c) => c.chapterIndex === chapterIndex);
        if (!targetChapter) {
          try {
            const fetched = await getOrFetchChapter(withProgress.id, chapterIndex);
            if (fetched) {
              targetChapter = fetched;
              if (!chaps.some((c) => c.id === fetched.id)) {
                chaps = [...chaps, fetched].sort((a, b) => a.chapterIndex - b.chapterIndex);
              }
            }
          } catch (e) {
            console.warn('[Router] Failed to fetch chapter:', e);
          }
        }

        setChapters(chaps);
        if (targetChapter) {
          setActiveChapter(targetChapter);
          setCurrentView('reader');
          return;
        }
      }
    }

    // 2. Story Detail: #/story/:storyId
    const storyMatch = hash.match(/^#\/story\/([^/]+)$/);
    if (storyMatch) {
      const storyId = decodeURIComponent(storyMatch[1]);
      let story = storyList.find((s) => s.id === storyId);
      if (!story) {
        story = await db.stories.get(storyId);
      }
      if (story) {
        const withProgress = mergeStoryWithProgress(story);
        setActiveStory(withProgress);
        const chaps = await getStoryChapters(withProgress.id);
        setChapters(chaps);
        setCurrentView('story');
        return;
      }
    }

    // 3. Default Library: #/ or empty or unknown
    if (!hash || hash === '#/' || hash === '#' || hash === '#/library') {
      setCurrentView('library');
      setActiveStory(null);
      setActiveChapter(null);
    }
  }, []);

  const refreshStories = useCallback(async (): Promise<Story[]> => {
    const status = await fetchDbStatus();
    setIsMongoConnected(status.connected);
    const list = await getStoriesList();
    const merged = list.map((s) => mergeStoryWithProgress(s));
    setStories(merged);
    storiesRef.current = merged;

    // If activeStory is selected, update it with fresh progress as well
    setActiveStory((selectedStory) => selectedStory
      ? merged.find((s) => s.id === selectedStory.id) || selectedStory
      : selectedStory);
    return merged;
  }, []);

  // Load initial database data, check Cloud DB status, and restore view from URL hash
  useEffect(() => {
    const init = async () => {
      const merged = await refreshStories();
      await restoreRouteFromHash(merged);
    };
    init();

    const handleHashChange = () => {
      if (isInternalNavRef.current) {
        isInternalNavRef.current = false;
        return;
      }
      restoreRouteFromHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [refreshStories, restoreRouteFromHash]);

  // Update hash when view or active items change
  const navigateTo = (view: 'library' | 'story' | 'reader', story?: Story | null, chapter?: Chapter | null) => {
    setCurrentView(view);
    let targetHash = '#/';
    if (view === 'library') {
      targetHash = '#/';
    } else if (view === 'story' && story) {
      targetHash = `#/story/${story.id}`;
    } else if (view === 'reader' && story && chapter) {
      targetHash = `#/story/${story.id}/chapter/${chapter.chapterIndex}`;
    }

    if (window.location.hash !== targetHash) {
      isInternalNavRef.current = true;
      window.location.hash = targetHash;
    }
  };

  const handleSelectStory = async (story: Story) => {
    const withProgress = mergeStoryWithProgress(story);
    setActiveStory(withProgress);
    const chaps = await getStoryChapters(withProgress.id);
    setChapters(chaps);
    navigateTo('story', withProgress);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReader = async (story: Story, chapterId?: string) => {
    const withProgress = mergeStoryWithProgress(story);
    setActiveStory(withProgress);
    const chaps = await getStoryChapters(withProgress.id);
    setChapters(chaps);

    const targetChapter =
      (chapterId ? chaps.find((c) => c.id === chapterId) : null) ||
      (withProgress.lastReadChapterId ? chaps.find((c) => c.id === withProgress.lastReadChapterId) : null) ||
      (withProgress.lastReadChapterIndex ? chaps.find((c) => c.chapterIndex === withProgress.lastReadChapterIndex) : null) ||
      chaps[0];

    if (targetChapter) {
      setActiveChapter(targetChapter);
      navigateTo('reader', withProgress, targetChapter);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenAudio = async (story: Story, chapterId?: string) => {
    const withProgress = mergeStoryWithProgress(story);
    setActiveStory(withProgress);
    const chaps = await getStoryChapters(withProgress.id);
    setChapters(chaps);

    const targetChapter =
      (chapterId ? chaps.find((c) => c.id === chapterId) : null) ||
      (withProgress.lastReadChapterId ? chaps.find((c) => c.id === withProgress.lastReadChapterId) : null) ||
      (withProgress.lastReadChapterIndex ? chaps.find((c) => c.chapterIndex === withProgress.lastReadChapterIndex) : null) ||
      chaps[0];

    if (targetChapter) {
      if (currentStory?.id === withProgress.id && currentChapter?.id === targetChapter.id) {
        togglePlay();
        return;
      }
      setActiveChapter(targetChapter);
      await playChapter(withProgress, targetChapter, chaps);
    }
  };

  const handleReadChapter = (chapter: Chapter, chapterList: Chapter[]) => {
    setActiveChapter(chapter);
    setChapters(chapterList);
    if (activeStory) {
      navigateTo('reader', activeStory, chapter);
    } else {
      setCurrentView('reader');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayChapter = async (chapter: Chapter, chapterList: Chapter[]) => {
    if (activeStory && currentStory?.id === activeStory.id && currentChapter?.id === chapter.id) {
      togglePlay();
      return;
    }
    setActiveChapter(chapter);
    setChapters(chapterList);
    if (activeStory) {
      await playChapter(activeStory, chapter, chapterList);
    }
  };

  const handleSelectChapterInReader = async (chapter: Chapter) => {
    setActiveChapter(chapter);
    if (activeStory) {
      const chaps = await getStoryChapters(activeStory.id);
      setChapters(chaps);
      navigateTo('reader', activeStory, chapter);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportSuccess = async (storyId: string) => {
    const freshList = await refreshStories();
    const importedStory = freshList.find((s) => s.id === storyId) || (await db.stories.get(storyId));
    if (importedStory) {
      handleSelectStory(importedStory);
    }
  };

  const handleOpenReaderFromPlayer = () => {
    if (currentStory && currentChapter) {
      const withProgress = mergeStoryWithProgress(currentStory);
      setActiveStory(withProgress);
      setActiveChapter(currentChapter);
      getStoryChapters(withProgress.id).then((chaps) => {
        setChapters(chaps);
        navigateTo('reader', withProgress, currentChapter);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors">
      {/* Top Navbar only shown when not in Reader View */}
      {currentView !== 'reader' && (
        <Navbar
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'library') {
              refreshStories();
              navigateTo('library');
            } else {
              setCurrentView(view);
            }
          }}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenMongoConfig={() => setIsMongoModalOpen(true)}
          isMongoConnected={isMongoConnected}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          hasActivePlayback={!!currentChapter}
          onOpenActivePlaybackReader={handleOpenReaderFromPlayer}
        />
      )}

      {/* Main Views */}
      <main>
        {currentView === 'library' && (
          <LibraryView
            stories={stories}
            onSelectStory={handleSelectStory}
            onOpenReader={handleOpenReader}
            onOpenAudio={handleOpenAudio}
            onOpenImport={() => setIsImportOpen(true)}
            onRefreshStories={refreshStories}
            searchQuery={searchQuery}
          />
        )}

        {currentView === 'story' && activeStory && (
          <StoryDetailView
            story={activeStory}
            onBack={() => {
              refreshStories();
              navigateTo('library');
            }}
            onReadChapter={handleReadChapter}
            onPlayChapter={handlePlayChapter}
            onRefreshStory={refreshStories}
          />
        )}

        {currentView === 'reader' && activeStory && activeChapter && (
          <ReaderView
            story={activeStory}
            chapter={activeChapter}
            chapters={chapters}
            onBack={() => {
              refreshStories();
              navigateTo('story', activeStory);
            }}
            onSelectChapter={handleSelectChapterInReader}
          />
        )}
      </main>

      {/* Persistent Docked Audio Player */}
      <AudioPlayerBar onOpenReader={handleOpenReaderFromPlayer} />

      {/* Import / Create Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={handleImportSuccess}
        stories={stories}
      />

      {/* MongoDB Atlas Cloud Storage Modal */}
      <MongoModal
        isOpen={isMongoModalOpen}
        onClose={() => setIsMongoModalOpen(false)}
        onConnected={refreshStories}
      />
    </div>
  );
};

export function App() {
  return (
    <ReaderProvider>
      <AudioProvider>
        <AppContent />
      </AudioProvider>
    </ReaderProvider>
  );
}

export default App;
