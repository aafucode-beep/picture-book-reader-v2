import { useState, useEffect, useRef, useCallback } from 'react';
import { getBook } from '../api';
import { Page, AudioUrls, Book } from '../types';

interface PlayerPageProps {
  bookId: string;
  title: string;
  pages: Page[];
  audioUrls: AudioUrls[];
  initialPageIndex?: number;
  onBack: () => void;
}

export default function PlayerPage({
  bookId,
  title: initialTitle,
  pages: initialPages,
  audioUrls: initialAudioUrls,
  initialPageIndex = 0,
  onBack,
}: PlayerPageProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(initialPageIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingType, setPlayingType] = useState<'narrator' | 'dialogue' | null>(null);
  const [playingDialogueIndex, setPlayingDialogueIndex] = useState(-1);
  const [title, setTitle] = useState(initialTitle);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load book data if not provided
  useEffect(() => {
    if (!book && bookId) {
      getBook(bookId).then(response => {
        if (response.success) {
          setBook(response.book);
          setTitle(response.book.title);
        }
      });
    }
  }, [book, bookId]);

  const pages = book?.pages || initialPages;
  const audioUrls = book?.audio_urls || initialAudioUrls;
  const currentPage = pages[currentPageIndex];
  const currentAudio = audioUrls[currentPageIndex];

  const playNarrator = useCallback(() => {
    if (!currentAudio?.narrator) return;

    setIsPlaying(true);
    setPlayingType('narrator');
    setPlayingDialogueIndex(-1);

    if (audioRef.current) {
      audioRef.current.src = currentAudio.narrator;
      audioRef.current.play();
    }
  }, [currentAudio]);

  const playDialogue = useCallback((dialogueIndex: number) => {
    if (!currentAudio?.dialogues?.[dialogueIndex]) return;

    setIsPlaying(true);
    setPlayingType('dialogue');
    setPlayingDialogueIndex(dialogueIndex);

    if (audioRef.current) {
      audioRef.current.src = currentAudio.dialogues[dialogueIndex].url;
      audioRef.current.play();
    }
  }, [currentAudio]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setPlayingType(null);
    setPlayingDialogueIndex(-1);
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setPlayingType(null);
    setPlayingDialogueIndex(-1);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = handleAudioEnded;
    }
  }, [handleAudioEnded]);

  const goToNextPage = useCallback(() => {
    stopPlayback();
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  }, [currentPageIndex, pages.length, stopPlayback]);

  const goToPrevPage = useCallback(() => {
    stopPlayback();
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  }, [currentPageIndex, stopPlayback]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage]);

  if (!currentPage) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-900">
      {/* Hidden audio element */}
      <audio ref={audioRef} />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-medium text-white truncate mx-4">{title}</h1>
        <div className="text-sm text-gray-400">
          {currentPageIndex + 1} / {pages.length}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Scene description */}
        <div className="mb-4 p-3 bg-dark-800 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">场景</p>
          <p className="text-sm text-gray-300">{currentPage.scene_description}</p>
        </div>

        {/* Narrator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">旁白</span>
            <button
              onClick={isPlaying && playingType === 'narrator' ? stopPlayback : playNarrator}
              disabled={!currentAudio?.narrator}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isPlaying && playingType === 'narrator'
                  ? 'bg-red-500 text-white'
                  : currentAudio?.narrator
                  ? 'bg-accent-500 text-white hover:bg-accent-600'
                  : 'bg-dark-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isPlaying && playingType === 'narrator' ? '停止' : '播放'}
            </button>
          </div>
          <div className="p-3 bg-dark-800 rounded-lg">
            <p className="text-white leading-relaxed">{currentPage.narrator}</p>
          </div>
        </div>

        {/* Dialogues */}
        {currentPage.dialogues.length > 0 && (
          <div>
            <span className="text-sm text-gray-500 mb-2 block">对话</span>
            <div className="space-y-3">
              {currentPage.dialogues.map((dialogue, index) => (
                <div key={index} className="p-3 bg-dark-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-accent-400">{dialogue.character}</span>
                    <button
                      onClick={isPlaying && playingType === 'dialogue' && playingDialogueIndex === index ? stopPlayback : () => playDialogue(index)}
                      disabled={!currentAudio?.dialogues?.[index]}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                        isPlaying && playingType === 'dialogue' && playingDialogueIndex === index
                          ? 'bg-red-500 text-white'
                          : currentAudio?.dialogues?.[index]
                          ? 'bg-accent-600 text-white hover:bg-accent-500'
                          : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isPlaying && playingType === 'dialogue' && playingDialogueIndex === index ? '停止' : '播放'}
                    </button>
                  </div>
                  <p className="text-white leading-relaxed">"{dialogue.text}"</p>
                  {dialogue.emotion && (
                    <span className="text-xs text-gray-500 mt-1 inline-block">
                      情绪: {dialogue.emotion}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-t border-dark-700">
        <button
          onClick={goToPrevPage}
          disabled={currentPageIndex === 0}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white hover:bg-dark-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          上一页
        </button>

        {/* Page indicator dots */}
        <div className="flex gap-1">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                stopPlayback();
                setCurrentPageIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentPageIndex
                  ? 'bg-accent-500'
                  : 'bg-dark-600 hover:bg-dark-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPageIndex === pages.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white hover:bg-dark-700 transition-colors"
        >
          下一页
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
