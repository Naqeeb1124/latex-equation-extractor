import React, { useState, useCallback, DragEvent, useEffect } from 'react';
import { getLatexFromImage } from './services/geminiService';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';
import { UploadIcon, ClipboardIcon, CheckIcon, SparklesIcon, TrashIcon } from './components/icons';

interface ImageFile {
  file: File;
  preview: string;
}

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [latexCode, setLatexCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const processFile = useCallback((file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile({
        file,
        preview: URL.createObjectURL(file),
      });
      setLatexCode('');
      setError('');
    } else {
      setError('Please select or paste a valid image file.');
    }
  }, []);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
        
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          processFile(file);
          event.preventDefault();
          return;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [processFile]);

  useEffect(() => {
    return () => {
      if (imageFile) {
        URL.revokeObjectURL(imageFile.preview);
      }
    };
  }, [imageFile]);

  const handleFileChange = (files: FileList | null) => {
    processFile(files?.[0] ?? null);
  };

  const handleDragEvents = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleGenerateClick = useCallback(async () => {
    if (!imageFile) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setLatexCode('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile.file);
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = imageFile.file.type;
        const result = await getLatexFromImage(base64String, mimeType);
        setLatexCode(result);
        setIsLoading(false);
      };
      reader.onerror = () => {
          setError('Failed to read the image file.');
          setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
    }
  }, [imageFile]);
  
  const clearImage = () => {
    setImageFile(null);
    setLatexCode('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Equation to LaTeX
          </h1>
          <p className="text-lg text-gray-400">
            Upload a screenshot of an equation and get the LaTeX code instantly.
          </p>
        </header>

        <main className="bg-black border border-gray-700 rounded-xl shadow-2xl p-6 md:p-8 space-y-6">
          {!imageFile ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-300 ${isDragging ? 'border-white bg-gray-900' : 'border-gray-600 hover:border-gray-400'}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragEvents}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center text-gray-400">
                <UploadIcon className="w-12 h-12 mb-4" />
                <p className="font-semibold text-white mb-1">Paste, drag & drop your image here</p>
                <p className="text-sm">or</p>
                <label htmlFor="file-upload" className="relative cursor-pointer mt-2 bg-white text-black font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                  <span>Browse Files</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e.target.files)} />
                </label>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <p className="text-sm text-gray-400 mb-2">Image Preview:</p>
              <img src={imageFile.preview} alt="Equation preview" className="rounded-lg w-full max-h-60 object-contain bg-gray-900 p-2" />
              <button onClick={clearImage} className="absolute top-0 right-0 m-2 p-2 rounded-full bg-gray-800/80 text-white hover:bg-white hover:text-black transition-all duration-300 opacity-0 group-hover:opacity-100">
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          {imageFile && (
            <button
              onClick={handleGenerateClick}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Generate LaTeX
                </>
              )}
            </button>
          )}

          {error && <p className="text-white text-center bg-gray-900 border border-gray-700 p-3 rounded-lg">{error}</p>}
          
          {latexCode && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Generated LaTeX:</p>
              <div className="relative bg-gray-900 rounded-lg p-4 font-mono text-sm text-white whitespace-pre-wrap break-all">
                <code>{latexCode}</code>
                <button
                  onClick={() => copyToClipboard(latexCode)}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                >
                  {isCopied ? <CheckIcon className="w-5 h-5 text-white" /> : <ClipboardIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </main>
        <footer className="text-center text-gray-500 text-sm mt-8">
          &copy; Abdelrahman Mohammed 2025
        </footer>
      </div>
    </div>
  );
};

export default App;
