'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, FileBarChart, ChevronLeft, ChevronRight, X, RefreshCw } from 'lucide-react';
import UserProfileButton from '@/components/UserProfileButton';

export default function GradingHistory() {
  const { data: session, status } = useSession();
  const [records, setRecords] = useState<any[]>([]);
  const [displayedRecords, setDisplayedRecords] = useState<any[]>([]);
  const [blkNumber, setBlkNumber] = useState('');
  const [sortOption, setSortOption] = useState('latest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [techGrades, setTechGrades] = useState({ smoothness: 0, shininess: 0 });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const selectedRecord = selectedIndex !== null ? records[selectedIndex] : null;

  // Fetch latest records on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchLatestRecords();
    }
  }, [status]);  // Track the currently loaded image URL to prevent unnecessary reloading
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRecord) {
      // Only reset the image loaded state when switching to a different image URL
      if (loadedImageUrl !== selectedRecord.imageMetadata.originalImageUrl) {
        setImgLoaded(false);
      }
      
      setIsEditing(false);
      setSubmitSuccess(false);
      setTechGrades({
        smoothness: selectedRecord.qualityControl.technicianSmoothnessGrade || 0,
        shininess: selectedRecord.qualityControl.technicianShininessGrade || 0
      });
    }
  }, [selectedRecord, loadedImageUrl]);

  // Sort records client-side based on sortOption
  useEffect(() => {
    let sorted = [...records];
    switch (sortOption) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.timestamps.createdAt).getTime() - new Date(b.timestamps.createdAt).getTime());
        break;
      case 'ai-high':
        sorted.sort((a, b) => b.gradingResults.combinedGrade - a.gradingResults.combinedGrade);
        break;
      case 'ai-low':
        sorted.sort((a, b) => a.gradingResults.combinedGrade - b.gradingResults.combinedGrade);
        break;
      case 'pending':
        sorted.sort((a, b) => (a.qualityControl.reviewStatus === 'pending' ? -1 : 1));
        break;
      case 'completed':
        sorted.sort((a, b) => (a.qualityControl.reviewStatus === 'completed' ? -1 : 1));
        break;
      default:
        sorted.sort((a, b) => new Date(b.timestamps.createdAt).getTime() - new Date(a.timestamps.createdAt).getTime());
    }
    setDisplayedRecords(sorted);
  }, [records, sortOption]);

  const fetchLatestRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/technician-grade');
      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }
      
      const data = await response.json();
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching records');
    } finally {
      setLoading(false);
    }
  };

  const searchByBlkNumber = async () => {
    if (!blkNumber.trim()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/technician-grade?blkNumber=${encodeURIComponent(blkNumber)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }
      
      const data = await response.json();
      setRecords(data.records || []);
      
      if (data.records.length === 0) {
        setError(`No records found for BLK number: ${blkNumber}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const closeModal = () => setSelectedIndex(null);
  const prevRecord = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };
  const nextRecord = () => {
    if (selectedIndex !== null && selectedIndex < records.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleSubmitGrades = async () => {
    if (!selectedRecord || selectedIndex === null) return;
    
    try {
      setSubmitLoading(true);
      
      const response = await fetch('/api/technician-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: selectedRecord.id,
          blkNumber: selectedRecord.blkNumber,
          smoothness: techGrades.smoothness,
          shininess: techGrades.shininess
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update grades');
      }
      
      const data = await response.json();
        // Update the record in the local state
      const updatedRecords = [...records];
      updatedRecords[selectedIndex] = data.record;
      // Keep the current imgLoaded state to avoid flashing
      const currentImgLoaded = imgLoaded;
      setRecords(updatedRecords);
      // Ensure the image stays loaded after update
      setImgLoaded(currentImgLoaded);
      
      setIsEditing(false);
      setSubmitSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update technician grades');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-900">      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Grading History
            </h1>
            <div className="flex items-center space-x-2">
              <Link 
                href="/" 
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Grader
              </Link>
              <UserProfileButton />
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search bar */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search by BLK Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={blkNumber}
                    onChange={(e) => setBlkNumber(e.target.value)}
                    placeholder="Enter BLK number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700"
                    onKeyDown={(e) => e.key === 'Enter' && searchByBlkNumber()}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={searchByBlkNumber}
                  disabled={loading}
                  className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  Search
                </button>
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-zinc-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none"
                  >
                    <option value="latest">Latest</option>
                    <option value="oldest">Oldest</option>
                    <option value="ai-high">AI Score High→Low</option>
                    <option value="ai-low">AI Score Low→High</option>
                    <option value="pending">Pending Reviews</option>
                    <option value="completed">Completed Reviews</option>
                  </select>
                  <button
                    onClick={fetchLatestRecords}
                    disabled={loading}
                    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Loading state */}
          {loading && (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          )}
          
          {/* Error message */}
          {error && !loading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-md p-4 my-4">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          
          {/* Records display */}
          {!loading && !error && displayedRecords.length > 0 && (
            <>
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-zinc-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">BLK Number</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">AI Grade</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tech Grade</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayedRecords.map((record, idx) => (
                      <tr key={record.id} onClick={() => setSelectedIndex(idx)} className="hover:bg-gray-50 dark:hover:bg-zinc-750 cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{record.blkNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDate(record.timestamps.createdAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {record.gradingResults.combinedGrade}/10
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {record.qualityControl.technicianCombinedGrade ? 
                            `${record.qualityControl.technicianCombinedGrade}/10` : 
                            'Not reviewed'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            record.qualityControl.reviewStatus === 'completed' ? 
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {record.qualityControl.reviewStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                   </tbody>
                 </table>
               </div>             </div>
              
              {selectedRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="fixed inset-0 bg-black/60" onClick={closeModal}></div>
                  <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg max-w-lg w-full max-h-full overflow-auto relative z-10"><button 
                      type="button"
                      onClick={closeModal} 
                      className="absolute top-2 right-2 p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-700 dark:text-gray-400 dark:hover:text-gray-200 z-30"
                    >
                      <X size={20} />
                    </button>
                    <div className="p-6 space-y-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Grading Details - {selectedRecord.blkNumber}</h2>
                      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <p><strong>ID:</strong> {selectedRecord.id}</p>
                        <p><strong>Document Type:</strong> {selectedRecord.documentType}</p>
                        <p><strong>Capture Date:</strong> {formatDate(selectedRecord.timestamps.createdAt)}</p>
                        <p><strong>Image:</strong></p>
                        <div className="w-full h-64 bg-gray-200 dark:bg-zinc-700 rounded-md overflow-hidden relative">
                          {!imgLoaded && <div className="absolute inset-0 bg-gray-300 dark:bg-zinc-600 animate-pulse" />}                          <img
                            src={selectedRecord.imageMetadata.originalImageUrl}
                            alt="Grading"
                            onLoad={() => {
                              setImgLoaded(true);
                              setLoadedImageUrl(selectedRecord.imageMetadata.originalImageUrl);
                            }}
                            className="w-full h-full object-contain"
                          />
                        </div>                        {/* AI Grades Section */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-100 dark:border-blue-900/30">
                          <h3 className="font-medium text-blue-800 dark:text-blue-400 mb-1">AI Analysis</h3>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              Smoothness: {selectedRecord.gradingResults.smoothnessGrade}/5
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              Shininess: {selectedRecord.gradingResults.shininessGrade}/5
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              Combined: {selectedRecord.gradingResults.combinedGrade}/10
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              Confidence: {selectedRecord.gradingResults.confidenceScore}
                            </span>
                          </div>
                        </div>
                        
                        {/* Technician Review Section */}
                        <div className={`p-3 rounded-md border ${
                          selectedRecord.qualityControl.reviewStatus === 'pending' 
                          ? 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30' 
                          : selectedRecord.gradingResults.combinedGrade === selectedRecord.qualityControl.technicianCombinedGrade
                            ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30'
                            : 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'
                        }`}>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className={`font-medium ${
                              selectedRecord.qualityControl.reviewStatus === 'pending' 
                              ? 'text-yellow-800 dark:text-yellow-400'
                              : selectedRecord.gradingResults.combinedGrade === selectedRecord.qualityControl.technicianCombinedGrade
                                ? 'text-green-800 dark:text-green-400'
                                : 'text-red-800 dark:text-red-400'
                            }`}>
                              Technician Review
                            </h3>
                            {selectedRecord.qualityControl.reviewStatus === 'pending' && (
                              <button 
                                onClick={() => setIsEditing(true)}
                                className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded"
                              >
                                Review Now
                              </button>
                            )}
                            {selectedRecord.qualityControl.reviewStatus === 'completed' && !isEditing && (
                              <button 
                                onClick={() => setIsEditing(true)}
                                className="text-xs bg-gray-500 hover:bg-gray-600 text-white py-1 px-2 rounded"
                              >
                                Edit Review
                              </button>
                            )}
                          </div>
                          
                          {!isEditing ? (
                            <>
                              <p className="text-sm">
                                <strong>Status:</strong>{' '}
                                <span className={`${
                                  selectedRecord.qualityControl.reviewStatus === 'pending' 
                                  ? 'text-yellow-800 dark:text-yellow-400'
                                  : 'text-green-800 dark:text-green-400'
                                }`}>
                                  {selectedRecord.qualityControl.reviewStatus === 'pending' ? 'Pending Review' : 'Completed'}
                                </span>
                              </p>
                              <p className="text-sm"><strong>Technician:</strong> {selectedRecord.qualityControl.qcTechnician}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                  selectedRecord.qualityControl.technicianSmoothnessGrade === undefined
                                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                }`}>
                                  Smoothness: {selectedRecord.qualityControl.technicianSmoothnessGrade ?? 'N/A'}/5
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                  selectedRecord.qualityControl.technicianShininessGrade === undefined
                                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                }`}>
                                  Shininess: {selectedRecord.qualityControl.technicianShininessGrade ?? 'N/A'}/5
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                  selectedRecord.qualityControl.technicianCombinedGrade === undefined
                                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                                  : selectedRecord.gradingResults.combinedGrade === selectedRecord.qualityControl.technicianCombinedGrade
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                }`}>
                                  Combined: {selectedRecord.qualityControl.technicianCombinedGrade ?? 'N/A'}/10
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium mb-1">Smoothness (1-5):</label>
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map(num => (
                                    <button 
                                      key={`smoothness-${num}`}
                                      onClick={() => setTechGrades({...techGrades, smoothness: num})}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        techGrades.smoothness === num 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Shininess (1-5):</label>
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map(num => (
                                    <button 
                                      key={`shininess-${num}`}
                                      onClick={() => setTechGrades({...techGrades, shininess: num})}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        techGrades.shininess === num 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex justify-between pt-2">
                                <button 
                                  onClick={() => setIsEditing(false)}
                                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={handleSubmitGrades}
                                  disabled={submitLoading}
                                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-60"
                                >
                                  {submitLoading ? 'Saving...' : 'Save Grades'}
                                </button>
                              </div>
                              {submitSuccess && (
                                <div className="text-center mt-2 text-green-600 dark:text-green-400 text-sm">
                                  Grades updated successfully!
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Additional Info Section */}
                        <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-md border border-gray-200 dark:border-zinc-700">
                          <h3 className="font-medium text-gray-800 dark:text-gray-300 mb-1">Additional Details</h3>
                          <p className="text-sm"><strong>Batch:</strong> {selectedRecord.qualityControl.batchInfo}</p>
                          <p className="text-sm"><strong>Station:</strong> {selectedRecord.qualityControl.station}</p>
                          <p className="text-sm"><strong>Processing Time:</strong> {selectedRecord.gradingResults.processingTime} ms</p>
                          <p className="text-sm"><strong>Last Updated:</strong> {formatDate(selectedRecord.timestamps.updatedAt)}</p>
                        </div>
                      </div>                    </div>
                    
                    <div className="absolute top-1/2 transform -translate-y-1/2 left-2 flex items-center">
                      <button onClick={prevRecord} disabled={selectedIndex === 0} className="p-2 bg-white dark:bg-zinc-700 rounded-full shadow-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <ChevronLeft size={24} />
                      </button>
                    </div>
                    <div className="absolute top-1/2 transform -translate-y-1/2 right-2 flex items-center">
                      <button onClick={nextRecord} disabled={selectedIndex === records.length - 1} className="p-2 bg-white dark:bg-zinc-700 rounded-full shadow-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
           )}
          
          {/* Empty state */}
          {!loading && !error && records.length === 0 && (
            <div className="text-center py-10">
              <FileBarChart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No records found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Start by grading some potatoes or searching for a specific BLK number.
              </p>
            </div>
          )}
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
