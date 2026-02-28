import {
  AnalyzeResponse,
  SynthesizeResponse,
  BooksListResponse,
  BookResponse,
  SaveResponse,
  Page
} from './types';

const API_BASE = '/api';

// Analyze a single image page (avoids Vercel 10s timeout)
export async function analyzeSingleImage(image: string, pageNum: number): Promise<{ page: Page; page_num: number; success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image, page_num: pageNum }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

// Legacy: analyze all images at once (kept for compatibility)
export async function analyzeImages(images: string[]): Promise<AnalyzeResponse> {
  const pages: Page[] = [];
  for (let i = 0; i < images.length; i++) {
    const result = await analyzeSingleImage(images[i], i);
    if (!result.success) {
      return { success: false, pages: [], page_count: 0, error: result.error };
    }
    pages.push(result.page);
  }
  return { success: true, pages, page_count: pages.length };
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
