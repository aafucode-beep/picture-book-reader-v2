import { useState, useEffect, useRef } from 'react';
import { analyzeSingleImage, synthesizeSpeech, saveBook } from '../api';
import { Page, AudioUrls } from '../types';

interface ProcessingPageProps {
  pages: Page[];
  onComplete: (bookId: string, pages: Page[], audioUrls: AudioUrls[], title: string) => void;
  onCancel: () => void;
}

type MainStep = 'analyzing' | 'synthesizing' | 'saving' | 'complete' | 'error';

export default function ProcessingPage({ pages: initialPages, onComplete, onCancel }: ProcessingPageProps) {
  const [images, setImages] = useState<string[]>([]);
  const [bookId] = useState(() => `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [pages, setPages] = useState<Page[]>([]);
  const [audioUrls, setAudioUrls] = useState<AudioUrls[]>([]);
  const [mainStep, setMainStep] = useState<MainStep>('analyzing');
  const [error, setError] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const didRun = useRef(false);

  useEffect(() => {
    const storedImages = sessionStorage.getItem('uploaded_images');
    if (storedImages) {
      try {
        const parsed = JSON.parse(storedImages);
        setImages(parsed);
        setTotalImages(parsed.length);
      } catch (e) {
        console.error('Failed to parse stored images');
      }
    }
    const storedTitle = sessionStorage.getItem('book_title');
    if (storedTitle) setBookTitle(storedTitle);
  }, []);

  useEffect(() => {
    if (images.length === 0 || didRun.current) return;
    didRun.current = true;

    const process = async () => {
      try {
        // Step 1: Analyze each image one by one
        setMainStep('analyzing');
        const analyzedPages: Page[] = [];

        for (let i = 0; i < images.length; i++) {
          const result = await analyzeSingleImage(images[i], i);
          if (!result.success) throw new Error(result.error || `第${i+1}页分析失败`);
          analyzedPages.push(result.page);
          setAnalyzedCount(i + 1);
          setPages([...analyzedPages]);
        }

        // Step 2: Synthesize speech (all pages at once)
        setMainStep('synthesizing');
        const synthResponse = await synthesizeSpeech(analyzedPages, {}, bookId);
        if (!synthResponse.success) throw new Error(synthResponse.error || '语音生成失败');
        setAudioUrls(synthResponse.audio_urls);

        // Step 3: Save book
        setMainStep('saving');
        const title = bookTitle || `绘本 ${new Date().toLocaleDateString()}`;
        const saveResponse = await saveBook(bookId, title, analyzedPages, synthResponse.audio_urls, images[0] || '');
        if (!saveResponse.success) throw new Error(saveResponse.error || '保存失败');

        // Done!
        setMainStep('complete');
        sessionStorage.removeItem('uploaded_images');
        sessionStorage.removeItem('book_title');

        setTimeout(() => {
          onComplete(saveResponse.book_id || bookId, analyzedPages, synthResponse.audio_urls, title);
        }, 1000);

      } catch (err: any) {
        console.error('Processing error:', err);
        setError(err.message || '处理失败，请重试');
        setMainStep('error');
      }
    };

    process();
  }, [images]);

  const stepOrder: MainStep[] = ['analyzing', 'synthesizing', 'saving'];

  const getStepStatus = (step: MainStep) => {
    const idx = stepOrder.indexOf(step);
    const curIdx = stepOrder.indexOf(mainStep);
    if (mainStep === 'complete') return 'complete';
    if (idx < curIdx) return 'complete';
    if (idx === curIdx) return 'active';
    return 'pending';
  };

  const steps = [
    { key: 'analyzing' as MainStep, label: '分析图片' },
    { key: 'synthesizing' as MainStep, label: '生成语音' },
    { key: 'saving' as MainStep, label: '保存书籍' },
  ];

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">创建绘本</h1>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-white transition-colors">
          取消
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Steps */}
        <div className="w-full max-w-xs mb-8">
          {steps.map((step, index) => {
            const status = mainStep === 'error' && getStepStatus(step.key) === 'active' ? 'error' : getStepStatus(step.key);
            return (
              <div key={step.key} className="flex items-center mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  status === 'active' ? 'bg-purple-500 text-white animate-pulse' :
                  status === 'complete' ? 'bg-green-500 text-white' :
                  status === 'error' ? 'bg-red-500 text-white' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {status === 'complete' ? '✓' : status === 'error' ? '✕' : index + 1}
                </div>
                <span className={`ml-3 text-sm ${
                  status === 'active' ? 'text-white' :
                  status === 'complete' ? 'text-green-400' :
                  status === 'error' ? 'text-red-400' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Detail */}
        <div className="text-center w-full max-w-xs">
          {mainStep === 'analyzing' && (
            <div className="text-gray-300">
              <p className="text-lg mb-2">正在分析图片...</p>
              {totalImages > 0 && (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    第 {analyzedCount} / {totalImages} 页
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${totalImages > 0 ? (analyzedCount / totalImages) * 100 : 0}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          {mainStep === 'synthesizing' && (
            <div className="text-gray-300">
              <p className="text-lg mb-2">正在生成语音...</p>
              <p className="text-sm text-gray-500">为每个角色合成声音</p>
            </div>
          )}
          {mainStep === 'saving' && (
            <div className="text-gray-300">
              <p className="text-lg mb-2">正在保存...</p>
              <p className="text-sm text-gray-500">上传到云端</p>
            </div>
          )}
          {mainStep === 'complete' && (
            <div className="text-green-400">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-lg mb-1">完成!</p>
              <p className="text-sm text-gray-500">即将进入阅读模式...</p>
            </div>
          )}
          {mainStep === 'error' && (
            <div className="text-red-400">
              <p className="text-lg mb-2">处理失败</p>
              <p className="text-sm text-gray-400 mb-4 break-all">{error}</p>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm"
              >
                返回重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
