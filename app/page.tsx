'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Upload, AlertCircle, Check, RefreshCw, Cloud } from 'lucide-react';

// Enhanced spinner with size options
function Spinner({ size = 'small' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'h-5 w-5',
    medium: 'h-8 w-8',
    large: 'h-10 w-10'
  };
  
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-400 border-r-transparent ${sizeClasses[size]}`} />
  );
}

// Component for displaying potato grade scores
function GradeScores({ reasoning }: { reasoning: string }) {
  // Extract scores from the analysis text
  const shininessMatch = reasoning.match(/shininess.*?(\d+)\/5/i);
  const smoothnessMatch = reasoning.match(/smoothness.*?(\d+)\/5/i);
  const combinedMatch = reasoning.match(/combined.*?(\d+)\/10/i);

  const shininess = shininessMatch ? parseInt(shininessMatch[1]) : null;
  const smoothness = smoothnessMatch ? parseInt(smoothnessMatch[1]) : null;
  const combined = combinedMatch ? parseInt(combinedMatch[1]) : null;

  return (
    <div className="flex flex-col gap-3 my-4">
      <h3 className="font-bold text-lg">Potato Quality Scores</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard title="Shininess" score={shininess} maxScore={5} />
        <ScoreCard title="Smoothness" score={smoothness} maxScore={5} />
        <ScoreCard title="Overall" score={combined} maxScore={10} />
      </div>
    </div>
  );
}

// Score card component for visual display of scores
function ScoreCard({ title, score, maxScore }: { title: string; score: number | null; maxScore: number }) {
  return (
    <div className="bg-white dark:bg-zinc-700 rounded-lg shadow p-4 flex flex-col items-center">
      <div className="text-sm text-gray-600 dark:text-gray-300">{title}</div>
      <div className="text-2xl font-bold mt-1">
        {score !== null ? (
          <span>{score}/{maxScore}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>
    </div>
  );
}

// Image placeholder component
function ImagePlaceholder() {
  return (
    <div className="w-full h-48 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-800">
      <div className="text-center">
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload a potato image</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">JPG or PNG format (max 6MB)</p>
      </div>
    </div>
  );
}

export default function PotatoGrade() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [grading, setGrading] = useState<{ grade: string; reasoning: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState<'uploading' | 'analyzing' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_TIMEOUT = 10000; // 10 seconds timeout for better UX

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up object URLs to avoid memory leaks
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Countdown timer for API calls
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (uploading && timeRemaining !== null) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (!uploading) {
      setTimeRemaining(null);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploading, timeRemaining]);

  // Image upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setGrading(null);
    setSuccess(false);
    const file = e.target.files?.[0];
    
    // Validate file presence
    if (!file) {
      return;
    }
    
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Please upload a valid image (JPG or PNG format)');
      return;
    }
    
    // Validate file size
    if (file.size > 6 * 1024 * 1024) {  // 6MB max
      setError('File too large. Maximum size is 6MB.');
      return;
    }
    
    // Set file and create preview
    setImage(file);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(URL.createObjectURL(file));
  };

  // Submit image to API with timeout handling
  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) return;
    
    setUploading(true);
    setError(null);
    setGrading(null);
    setSuccess(false);
    setTimeRemaining(Math.floor(API_TIMEOUT / 1000));
    
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
      const formData = new FormData();
      formData.append('image', image);
      
      // Update processing stage to uploading
      setProcessingStage('uploading');
      
      const res = await fetch('/api/potato-grade', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Update processing stage to analyzing after upload
      setProcessingStage('analyzing');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.result) {
        setGrading(data.result);
        setSuccess(true);
        // Scroll to results after a short delay
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setError('Request timed out. Please try again with a smaller image or check your connection.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload image.';
        setError(errorMessage);
      }
      console.error('Image upload error:', error);
    } finally {
      setUploading(false);
      setTimeRemaining(null);
      setProcessingStage(null);
    }
  };

  // Reset the form to upload a new image
  const handleReset = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setImage(null);
    setPreview(null);
    setGrading(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Potato Quality Grader
          </h1>
        </div>
      </header>
      
      <main className="flex-1">
        <div className="w-full max-w-2xl mx-auto p-4 md:p-6 my-4 md:my-8">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 md:p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Upload a potato image to receive an automated quality assessment based on shininess and smoothness.
            </p>
            
            <form onSubmit={handleImageUpload} className="flex flex-col gap-4">
              {/* File upload area */}
              <div className="bg-gray-50 dark:bg-zinc-700 p-4 rounded-lg">
                <label className="block mb-4">
                  <span className="text-sm font-medium block mb-1">Select a potato image</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png"
                    onChange={handleImageChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 block w-full"
                  />
                </label>
                
                {/* Image preview area with fixed height */}
                <div className="my-4 flex justify-center" style={{ height: '250px' }}>
                  {preview ? (
                    <div className="h-full flex items-center">
                      <Image 
                        src={preview} 
                        alt="Potato preview" 
                        className="max-h-[250px] max-w-full rounded shadow object-contain" 
                        width={400}
                        height={250}
                        unoptimized // For blob URLs which Next Image doesn't optimize
                      />
                    </div>
                  ) : (
                    <ImagePlaceholder />
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                  {image && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 mb-2 sm:mb-0"
                    >
                      Clear
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    disabled={!image || uploading}
                    className="px-6 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                  >
                    {uploading ? (
                      <>
                        <Spinner />
                        <span className="ml-2">Analyzing{timeRemaining ? ` (${timeRemaining}s)` : '...'}</span>
                      </>
                    ) : (
                      'Grade Potato'
                    )}
                  </button>
                </div>
              </div>
              
              {/* Loading indicator */}
              {uploading && (
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
                  <div className="flex justify-center mb-2">
                    {processingStage === 'uploading' ? (
                      <Cloud className="animate-pulse h-6 w-6 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <RefreshCw className="animate-spin h-6 w-6 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {processingStage === 'uploading' 
                      ? 'Uploading image to cloud storage...' 
                      : 'Analyzing potato image...'}
                  </p>
                  <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                    This will take a few seconds
                  </p>
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div className="mt-4 p-4 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Success message */}
              {success && !error && (
                <div className="mt-4 p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-200 flex items-center gap-2">
                  <Check className="h-5 w-5 flex-shrink-0" />
                  <span>Analysis completed successfully!</span>
                </div>
              )}
              
              {/* Grading results */}
              {grading && (
                <div id="results" className="mt-6 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-4 shadow-md">
                  {/* Display score cards */}
                  <GradeScores reasoning={grading.reasoning} />
                  
                  {/* Detailed reasoning */}
                  <div className="mt-4 border-t border-gray-200 dark:border-zinc-700 pt-4">
                    <h3 className="font-bold text-lg mb-2">Detailed Analysis</h3>
                    <div className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-zinc-700 p-4 rounded">
                      {grading.reasoning}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Potato Quality Grader - LPC
          </p>
        </div>
      </footer>
    </div>
  );
}
