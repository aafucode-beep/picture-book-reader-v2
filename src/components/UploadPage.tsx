import { useState, useRef, useCallback } from 'react';

interface UploadPageProps {
  onImagesSelected: (images: string[]) => void;
  onNavigateToLibrary: () => void;
}

export default function UploadPage({ onImagesSelected, onNavigateToLibrary }: UploadPageProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList) => {
    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      setError('请选择图片文件');
      return;
    }

    // Read images as base64
    const promises = imageFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Images => {
      setImages(prev => [...prev, ...base64Images]);
      setError('');
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleCameraCapture = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    };
    input.click();
  }, [handleFiles]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (images.length === 0) {
      setError('请至少上传一张图片');
      return;
    }

    // Save images to sessionStorage for processing page
    sessionStorage.setItem('uploaded_images', JSON.stringify(images));

    // Navigate to processing
    onImagesSelected(images);
  }, [images, onImagesSelected]);

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">上传绘本</h1>
        <button
          onClick={onNavigateToLibrary}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          我的书架
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex-1 border-2 border-dashed rounded-xl p-6 transition-colors ${
          isDragging
            ? 'border-accent-500 bg-accent-500/10'
            : 'border-dark-600 bg-dark-800'
        }`}
      >
        {images.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-dark-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400 mb-2">拖拽图片到这里</p>
            <p className="text-gray-500 text-sm mb-4">或点击下方按钮选择</p>

            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 rounded-lg text-white text-sm transition-colors"
              >
                选择图片
              </button>
              <button
                onClick={handleCameraCapture}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-white text-sm transition-colors"
              >
                拍照
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 grid grid-cols-3 gap-2 overflow-y-auto pb-4">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square bg-dark-700 rounded-lg overflow-hidden">
                  <img
                    src={img}
                    alt={`Page ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-500 transition-colors"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-3 border-t border-dark-600">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-white text-sm transition-colors"
              >
                添加更多
              </button>
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-accent-500 hover:bg-accent-600 disabled:bg-dark-600 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
              >
                {isLoading ? '分析中...' : '开始分析'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
