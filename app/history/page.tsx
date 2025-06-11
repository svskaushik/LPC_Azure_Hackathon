'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, FileBarChart, ChevronLeft } from 'lucide-react';
import UserProfileButton from '@/components/UserProfileButton';

export default function GradingHistory() {
  const { data: session, status } = useSession();
  const [records, setRecords] = useState<any[]>([]);
  const [blkNumber, setBlkNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch latest records on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchLatestRecords();
    }
  }, [status]);

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
                <button
                  onClick={fetchLatestRecords}
                  disabled={loading}
                  className="w-full md:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Show Latest
                </button>
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
          {!loading && !error && records.length > 0 && (
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
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-zinc-750">
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
              </div>
            </div>
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
