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
    // Use redirect: true to directly redirect to Microsoft login page with tenant-specific endpoint
    await signIn('azure-ad', { 
      callbackUrl,
      redirect: true,
      // This ensures we're using the tenant-specific endpoint
      tenantId: process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID
    });
  };
    return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-zinc-800 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Potato Quality Grader</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Sign in to access the QC system</p>
        </div>
        
        <div className="mt-8">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 23 23">
                <rect x="1" y="1" width="10" height="10" fill="#f25022" />
                <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
                <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
                <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
              </svg>
            )}            {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
          </button>
        </div>
        
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">
          This application requires authentication with your Microsoft account
        </p>
      </div>
    </div>
  );
}
