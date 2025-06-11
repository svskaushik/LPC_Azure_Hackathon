'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Upload, AlertCircle, Check, RefreshCw, Cloud, FileBarChart } from 'lucide-react';
import UserProfileButton from '@/components/UserProfileButton';

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
  const [grading, setGrading] = useState<{ 
    grade: string; 
    reasoning: string; 
    documentId?: string; 
    blkNumber?: string; 
    grades?: { 
      shininess: number; 
      smoothness: number; 
      combined: number; 
    }; 
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState<'uploading' | 'analyzing' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_TIMEOUT = 30000; // 30 seconds timeout for better UX

  // Technician grading state
  const [showTechnicianGrading, setShowTechnicianGrading] = useState(false);
  const [technicianShininess, setTechnicianShininess] = useState<number>(0);
  const [technicianSmoothness, setTechnicianSmoothness] = useState<number>(0);
  const [submittingTechnicianGrade, setSubmittingTechnicianGrade] = useState(false);
  const [technicianGraded, setTechnicianGraded] = useState(false);

  // State for BLK number and related fields
  const [blkNumber, setBlkNumber] = useState<string>('');
  const [station, setStation] = useState<string>('QC-Station-01');
  const [batchInfo, setBatchInfo] = useState<string>(`Batch-${new Date().toISOString().split('T')[0]}`);

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
    
    // Validate BLK number if required
    if (!blkNumber.trim()) {
      setError('Please enter a BLK number');
      return;
    }
    
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
      formData.append('blkNumber', blkNumber);
      formData.append('station', station);
      formData.append('batchInfo', batchInfo);
      
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
    setShowTechnicianGrading(false);
    setTechnicianGraded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Accept AI grades and submit them as technician grades
  const handleAcceptAIGrades = async () => {
    if (!grading?.documentId || !grading?.grades) return;

    setSubmittingTechnicianGrade(true);
    try {
      const response = await fetch('/api/technician-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: grading.documentId,
          blkNumber: grading.blkNumber || blkNumber,
          smoothness: grading.grades.smoothness,
          shininess: grading.grades.shininess,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit grades');
      }
      
      setTechnicianGraded(true);
    } catch (error) {
      setError('Failed to accept grading. Please try again.');
      console.error('Error accepting AI grades:', error);
    } finally {
      setSubmittingTechnicianGrade(false);
    }
  };

  // Toggle the technician grade form
  const handleRefineGrades = () => {
    if (!grading?.grades) return;
    
    // Pre-fill with AI grades
    setTechnicianSmoothness(grading.grades.smoothness);
    setTechnicianShininess(grading.grades.shininess);
    setShowTechnicianGrading(true);
  };

  // Submit technician grade
  const handleSubmitTechnicianGrade = async () => {
    if (!grading?.documentId) return;
    
    setSubmittingTechnicianGrade(true);
    try {
      const response = await fetch('/api/technician-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: grading.documentId,
          blkNumber: grading.blkNumber || blkNumber,
          smoothness: technicianSmoothness,
          shininess: technicianShininess,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit grades');
      }
      
      setShowTechnicianGrading(false);
      setTechnicianGraded(true);
    } catch (error) {
      setError('Failed to submit grading. Please try again.');
      console.error('Error submitting technician grades:', error);
    } finally {
      setSubmittingTechnicianGrade(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-900">      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Potato Quality Grader
            </h1>
            <div className="flex items-center space-x-2">
              <Link 
                href="/history" 
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                <FileBarChart className="mr-1 h-4 w-4" />
                View History
              </Link>
              <UserProfileButton />
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <div className="w-full max-w-2xl mx-auto p-4 md:p-6 my-4 md:my-8">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 md:p-6">
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Upload a potato image to receive an automated quality assessment based on shininess and smoothness.
            </p>
            
            <form onSubmit={handleImageUpload} className="flex flex-col gap-4">
              {/* BLK Number and related fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block">
                    <span className="text-sm font-medium block mb-1">BLK Number*</span>
                    <input
                      type="text"
                      value={blkNumber}
                      onChange={(e) => setBlkNumber(e.target.value)}
                      placeholder="e.g. BLK115124"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </label>
                </div>
                <div>
                  <label className="block">
                    <span className="text-sm font-medium block mb-1">QC Station</span>
                    <input
                      type="text"
                      value={station}
                      onChange={(e) => setStation(e.target.value)}
                      placeholder="e.g. QC-Station-01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block">
                    <span className="text-sm font-medium block mb-1">Batch Info</span>
                    <input
                      type="text"
                      value={batchInfo}
                      onChange={(e) => setBatchInfo(e.target.value)}
                      placeholder="e.g. Batch-2025-06-11-A"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
              
              {/* File upload area */}
              <div className="bg-gray-50 dark:bg-zinc-700 p-4 rounded-lg">
                <label className="block mb-4">
                  <span className="text-sm font-medium block mb-1">Select a potato image*</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png"
                    onChange={handleImageChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 block w-full"
                    required
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
                  
                  {/* Technician grading section */}
                  <div className="mt-6">
                    <h3 className="font-bold text-lg mb-4">Technician Grading</h3>
                    
                    {/* AI grades display */}
                    {grading.grades && (
                      <div className="mb-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">AI Suggested Grades</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4 flex flex-col items-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Shininess</div>
                            <div className="text-xl font-bold mt-1">
                              {grading.grades.shininess}/5
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-zinc-700 rounded-lg p-4 flex flex-col items-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Smoothness</div>
                            <div className="text-xl font-bold mt-1">
                              {grading.grades.smoothness}/5
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Technician grade actions */}
                    {!showTechnicianGrading && !technicianGraded ? (
                      <div className="bg-gray-50 dark:bg-zinc-700 p-4 rounded-lg mt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                          As a technician, you can accept the AI's grading or provide your own assessment.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleAcceptAIGrades}
                            disabled={submittingTechnicianGrade}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center"
                          >
                            {submittingTechnicianGrade ? <Spinner size="small" /> : <Check className="w-4 h-4 mr-1" />}
                            Accept AI Grades
                          </button>
                          
                          <button
                            onClick={handleRefineGrades}
                            disabled={submittingTechnicianGrade}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Refine Grades
                          </button>
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Technician grade form */}
                    {showTechnicianGrading && (
                      <div className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block">
                              <span className="text-sm font-medium block mb-1">Technician Shininess</span>
                              <input
                                type="number"
                                value={technicianShininess}
                                onChange={(e) => setTechnicianShininess(Number(e.target.value))}
                                min={0}
                                max={5}
                                step={0.1}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>
                          </div>
                          <div>
                            <label className="block">
                              <span className="text-sm font-medium block mb-1">Technician Smoothness</span>
                              <input
                                type="number"
                                value={technicianSmoothness}
                                onChange={(e) => setTechnicianSmoothness(Number(e.target.value))}
                                min={0}
                                max={5}
                                step={0.1}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </label>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                          <button
                            type="button"
                            onClick={() => setShowTechnicianGrading(false)}
                            className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 mb-2 sm:mb-0"
                          >
                            Cancel
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleSubmitTechnicianGrade}
                            disabled={submittingTechnicianGrade}
                            className="px-6 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {submittingTechnicianGrade ? (
                              <>
                                <Spinner size="small" />
                                <span className="ml-2">Submitting...</span>
                              </>
                            ) : (
                              'Submit Technician Grade'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Technician graded message */}
                    {technicianGraded && (
                      <div className="mt-4 p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-200 flex items-center gap-2">
                        <Check className="h-5 w-5 flex-shrink-0" />
                        <span>Grading submitted successfully!</span>
                      </div>
                    )}
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
