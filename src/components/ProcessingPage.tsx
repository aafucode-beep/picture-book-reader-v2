import { useState, useEffect } from 'react';
import { analyzeImages, synthesizeSpeech, saveBook } from '../api';
import { Page, AudioUrls } from '../types';

interface ProcessingPageProps {
  pages: Page[];
  onComplete: (bookId: string, pages: Page[], audioUrls: AudioUrls[], title: string) => void;
  onCancel: () => void;
}

type Step = 'analyzing' | 'synthesizing' | 'saving' | 'complete';
type StepStatus = 'pending' | 'active' | 'complete' | 'error';

interface StepInfo {
  key: Step;
  label: string;
  status: StepStatus;
}

export default function ProcessingPage({ pages: initialPages, onComplete, onCancel }: ProcessingPageProps) {
  const [images, setImages] = useState<string[]>([]);
  const [bookId] = useState(() => `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [audioUrls, setAudioUrls] = useState<AudioUrls[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>('analyzing');
  const [error, setError] = useState('');
  const [bookTitle, setBookTitle] = useState('');

  useEffect(() => {
    // Get images from sessionStorage
    const storedImages = sessionStorage.getItem('uploaded_images');
    if (storedImages) {
      try {
        const parsed = JSON.parse(storedImages);
        setImages(parsed);
      } catch (e) {
        console.error('Failed to parse stored images');
      }
    }

    // Get book title
    const storedTitle = sessionStorage.getItem('book_title');
    if (storedTitle) {
      setBookTitle(storedTitle);
    }
  }, []);

  const runAnalysis = async (): Promise<Page[]> => {
    setCurrentStep('analyzing');
    const storedImages = sessionStorage.getItem('uploaded_images');
    if (!storedImages) throw new Error('No images found');

    const parsedImages = JSON.parse(storedImages);
    const response = await analyzeImages(parsedImages);

    if (!response.success) {
      throw new Error(response.error || 'Analysis failed');
    }

    return response.pages;
  };

  const runSynthesis = async (analyzedPages: Page[]): Promise<AudioUrls[]> => {
    setCurrentStep('synthesizing');
    const response = await synthesizeSpeech(analyzedPages, {}, bookId);

    if (!response.success) {
      throw new Error(response.error || 'Synthesis failed');
    }

    return response.audio_urls;
  };

  const runSave = async (analyzedPages: Page[], synthesizedAudioUrls: AudioUrls[]) => {
    setCurrentStep('saving');
    const title = bookTitle || `绘本 ${new Date().toLocaleDateString()}`;

    const response = await saveBook(bookId, title, analyzedPages, synthesizedAudioUrls, images[0] || '');

    if (!response.success) {
      throw new Error(response.error || 'Save failed');
    }

    return response.book_id;
  };

  useEffect(() => {
    let mounted = true;

    const process = async () => {
      try {
        // Step 1: Analyze images
        const analyzedPages = await runAnalysis();
        if (!mounted) return;
        setPages(analyzedPages);

        // Step 2: Synthesize speech
        const synthesizedAudioUrls = await runSynthesis(analyzedPages);
        if (!mounted) return;
        setAudioUrls(synthesizedAudioUrls);

        // Step 3: Save book
        const savedBookId = await runSave(analyzedPages, synthesizedAudioUrls);
        if (!mounted) return;

        // Complete!
        setCurrentStep('complete');

        // Clear session storage
        sessionStorage.removeItem('uploaded_images');
        sessionStorage.removeItem('book_title');

        // Navigate to player
        setTimeout(() => {
          onComplete(savedBookId, analyzedPages, synthesizedAudioUrls, bookTitle || `绘本`);
        }, 1000);

      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Processing failed');
          setCurrentStep('error' as Step);
        }
      }
    };

    if (images.length > 0 || initialPages.length > 0) {
      process();
    }

    return () => {
      mounted = false;
    };
  }, []);

  const steps: StepInfo[] = [
    { key: 'analyzing', label: '分析图片', status: currentStep === 'analyzing' ? 'active' : currentStep === 'analyzing' ? 'active' : ['synthesizing', 'saving', 'complete'].includes(currentStep) ? 'complete' : 'pending' },
    { key: 'synthesizing', label: '生成语音', status: currentStep === 'synthesizing' ? 'active' : ['saving', 'complete'].includes(currentStep) ? 'complete' : currentStep === 'analyzing' ? 'pending' : 'pending' },
    { key: 'saving', label: '保存书籍', status: currentStep === 'saving' ? 'active' : currentStep === 'complete' ? 'complete' : 'pending' },
  ];

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">创建绘本</h1>
        <button
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          取消
        </button>
      </div>

      {/* Progress */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Steps indicator */}
        <div className="w-full max-w-xs mb-8">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center mb-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.status === 'active'
                    ? 'bg-accent-500 text-white pulse'
                    : step.status === 'complete'
                    ? 'bg-green-500 text-white'
                    : step.status === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-dark-700 text-gray-400'
                }`}
              >
                {step.status === 'complete' ? '✓' : step.status === 'error' ? '✕' : index + 1}
              </div>
              <span
                className={`ml-3 text-sm ${
                  step.status === 'active'
                    ? 'text-white'
                    : step.status === 'complete'
                    ? 'text-green-400'
                    : step.status === 'error'
                    ? 'text-red-400'
                    : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ml-3 ${
                    step.status === 'complete' ? 'bg-green-500' : 'bg-dark-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Current step detail */}
        <div className="text-center">
          {currentStep === 'analyzing' && (
            <div className="text-gray-300">
              <p className="text-lg mb-2">正在分析绘本图片...</p>
              <p className="text-sm text-gray-500">提取文字和对话内容</p>
            </div>
          )}
          {currentStep === 'synthesizing' && (
            <div className="text-gray-300">
              <p className="text-lg mb-2">正在生成语音...</p>
              <p className="text-sm text-gray-500">为每个角色合成声音</p>
            </div>
          )}
          {currentStep === 'saving' && (
            <div className="text-gray-300">
              <p className="text-lg mb-2">正在保存...</p>
              <p className="text-sm text-gray-500">上传到云端</p>
            </div>
          )}
          {currentStep === 'complete' && (
            <div className="text-green-400">
              <p className="text-lg mb-2">完成!</p>
              <p className="text-sm text-gray-500">即将进入阅读模式...</p>
            </div>
          )}
          {currentStep === 'error' && (
            <div className="text-red-400">
              <p className="text-lg mb-2">处理失败</p>
              <p className="text-sm text-gray-500">{error}</p>
              <button
                onClick={onCancel}
                className="mt-4 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-white text-sm"
              >
                返回
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
