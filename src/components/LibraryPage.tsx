import { useState, useEffect } from 'react';
import { getBooks, getBook } from '../api';
import { BookListItem, Book } from '../types';

interface LibraryPageProps {
  onSelectBook: (bookId: string) => void;
  onCreateNew: () => void;
}

export default function LibraryPage({ onSelectBook, onCreateNew }: LibraryPageProps) {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getBooks();

      if (response.success) {
        setBooks(response.books);
      } else {
        setError(response.error || 'Failed to load books');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBook = async (bookId: string) => {
    onSelectBook(bookId);
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">我的书架</h1>
        <button
          onClick={loadBooks}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">
            <svg className="w-8 h-8 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm">加载中...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadBooks}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-white text-sm"
            >
              重试
            </button>
          </div>
        </div>
      ) : books.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-dark-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-400 mb-2">书架是空的</p>
          <p className="text-gray-500 text-sm mb-4">上传绘本开始阅读</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 rounded-lg text-white text-sm transition-colors"
          >
            创建绘本
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {books.map((book) => (
              <button
                key={book.id}
                onClick={() => handleSelectBook(book.id)}
                className="text-left bg-dark-800 rounded-xl overflow-hidden hover:bg-dark-700 transition-colors"
              >
                <div className="aspect-square bg-dark-700 relative">
                  {book.cover_image ? (
                    <img
                      src={book.cover_image}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-white text-sm truncate">{book.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{book.page_count} 页</p>
                </div>
              </button>
            ))}
          </div>

          {/* Create new button at bottom */}
          <button
            onClick={onCreateNew}
            className="w-full mt-4 p-4 border-2 border-dashed border-dark-600 rounded-xl text-gray-500 hover:border-accent-500 hover:text-accent-500 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建新绘本
          </button>
        </div>
      )}
    </div>
  );
}
