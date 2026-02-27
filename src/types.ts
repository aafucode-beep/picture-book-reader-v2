export interface Dialogue {
  character: string;
  text: string;
  emotion: string;
}

export interface Page {
  narrator: string;
  dialogues: Dialogue[];
  scene_description: string;
}

export interface AudioUrls {
  narrator: string;
  dialogues: {
    character: string;
    text: string;
    url: string;
    emotion: string;
  }[];
}

export interface Book {
  id: string;
  title: string;
  cover_image: string;
  pages: Page[];
  audio_urls: AudioUrls[];
  page_count: number;
  created_at: string;
  updated_at: string;
}

export interface BookListItem {
  id: string;
  title: string;
  cover_image: string;
  page_count: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyzeResponse {
  success: boolean;
  pages: Page[];
  page_count: number;
  error?: string;
}

export interface SynthesizeResponse {
  success: boolean;
  book_id: string;
  audio_urls: AudioUrls[];
  error?: string;
}

export interface BooksListResponse {
  success: boolean;
  books: BookListItem[];
  count: number;
  error?: string;
}

export interface BookResponse {
  success: boolean;
  book: Book;
  error?: string;
}

export interface SaveResponse {
  success: boolean;
  book_id: string;
  message: string;
  error?: string;
}
