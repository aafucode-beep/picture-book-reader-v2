import {
  AnalyzeResponse,
  SynthesizeResponse,
  BooksListResponse,
  BookResponse,
  SaveResponse,
  Page
} from './types';

const API_BASE = '/api';

export async function analyzeImages(images: string[]): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ images }),
  });

  return response.json();
}

export async function synthesizeSpeech(
  pages: Page[],
  characters: Record<string, string>,
  bookId: string
): Promise<SynthesizeResponse> {
  const response = await fetch(`${API_BASE}/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pages,
      characters,
      book_id: bookId,
    }),
  });

  return response.json();
}

export async function getBooks(): Promise<BooksListResponse> {
  const response = await fetch(`${API_BASE}/books`);
  return response.json();
}

export async function getBook(bookId: string): Promise<BookResponse> {
  const response = await fetch(`${API_BASE}/books/${bookId}`);
  return response.json();
}

export async function saveBook(
  bookId: string,
  title: string,
  pages: Page[],
  audioUrls: any[],
  coverImage: string
): Promise<SaveResponse> {
  const response = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      book_id: bookId,
      title,
      pages,
      audio_urls: audioUrls,
      cover_image: coverImage,
    }),
  });

  return response.json();
}
