import { useState } from 'react';
import UploadPage from './components/UploadPage';
import ProcessingPage from './components/ProcessingPage';
import PlayerPage from './components/PlayerPage';
import LibraryPage from './components/LibraryPage';
import { Page, AudioUrls } from './types';

type PageType = 'upload' | 'processing' | 'player' | 'library';

interface AppState {
  currentPage: PageType;
  bookId?: string;
  bookTitle?: string;
  pages?: Page[];
  audioUrls?: AudioUrls[];
  currentPageIndex?: number;
}

function App() {
  const [state, setState] = useState<AppState>({
    currentPage: 'upload',
  });

  const navigateTo = (page: PageType, data?: Partial<AppState>) => {
    setState(prev => ({
      ...prev,
      currentPage: page,
      ...data,
    }));
  };

  const renderPage = () => {
    switch (state.currentPage) {
      case 'upload':
        return (
          <UploadPage
            onImagesSelected={(images) => {
              navigateTo('processing', { pages: [], audioUrls: [] });
            }}
            onNavigateToLibrary={() => navigateTo('library')}
          />
        );
      case 'processing':
        return (
          <ProcessingPage
            pages={state.pages || []}
            onComplete={(bookId, pages, audioUrls, title) => {
              navigateTo('player', {
                bookId,
                pages,
                audioUrls,
                bookTitle: title,
                currentPageIndex: 0,
              });
            }}
            onCancel={() => navigateTo('upload')}
          />
        );
      case 'player':
        return (
          <PlayerPage
            bookId={state.bookId || ''}
            title={state.bookTitle || ''}
            pages={state.pages || []}
            audioUrls={state.audioUrls || []}
            initialPageIndex={state.currentPageIndex || 0}
            onBack={() => navigateTo('library')}
          />
        );
      case 'library':
        return (
          <LibraryPage
            onSelectBook={(bookId) => {
              navigateTo('player', { bookId });
            }}
            onCreateNew={() => navigateTo('upload')}
          />
        );
      default:
        return <UploadPage onImagesSelected={() => {}} onNavigateToLibrary={() => {}} />;
    }
  };

  return (
    <div className="h-full w-full bg-dark-900">
      {renderPage()}
    </div>
  );
}

export default App;
