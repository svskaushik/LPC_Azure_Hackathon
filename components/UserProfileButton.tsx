'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { User, LogOut, ChevronDown, History } from 'lucide-react';

export default function UserProfileButton() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    signOut({ callbackUrl: '/' });
    closeMenu();
  };

  return (
    <div className="relative">
      {status === 'authenticated' ? (
        <>
          <button 
            onClick={toggleMenu} 
            className="flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50"
          >
            <User className="mr-1 h-4 w-4" />
            <span className="max-w-[150px] truncate">{session.user?.email}</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-md shadow-lg z-10 py-1">
              <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <div className="font-medium truncate">{session.user?.name || 'User'}</div>
                <div className="text-xs truncate text-gray-500 dark:text-gray-400">{session.user?.email}</div>
              </div>
              
              <Link 
                href="/history" 
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center"
                onClick={closeMenu}
              >
                <History className="mr-2 h-4 w-4" />
                View History
              </Link>
              
              <a 
                href="#" 
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </a>
            </div>
          )}
        </>
      ) : (
        <button 
          onClick={() => signIn('azure-ad')} 
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50"
        >
          <User className="mr-1 h-4 w-4" />
          Sign In
        </button>
      )}
    </div>
  );
}
