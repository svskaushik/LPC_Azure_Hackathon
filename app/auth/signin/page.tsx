'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  const handleSignIn = async () => {
    setIsLoading(true);
    await signIn('azure-ad', { callbackUrl });
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Potato Quality Grader</h1>
          <p className="mt-2 text-gray-600">Sign in to access the QC system</p>
        </div>
        
        <div className="mt-8">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 48 48" fill="none">
                <path fill="#FF5722" d="M6 6h36v36H6z" />
                <path fill="#FFCDD2" d="M42 22H22V6h20v16z" />
                <path fill="#FF9800" d="M6 22h16v16H6V22z" />
                <path fill="#FFFFFF" d="M22 42V22h20v20H22z" />
              </svg>
            )}
            {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
          </button>
        </div>
        
        <p className="text-sm text-center text-gray-500 mt-4">
          This application requires authentication with your Microsoft account
        </p>
      </div>
    </div>
  );
}
