'use client';

import Link from "next/link";
import { usePathname } from 'next/navigation';
import UserProfileButton from "./UserProfileButton";

export default function ClientNavbar() {
  const pathname = usePathname();
  const navLinks = [
    { href: '/', label: 'Grader' },
    { href: '/history', label: 'History' },
    { href: '/analytics', label: 'Analytics' },
  ];
  
  return (
    <header className="bg-white dark:bg-zinc-800 shadow sticky top-0 z-30">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-6 min-w-0">
          <span className="font-bold text-lg md:text-2xl text-blue-700 dark:text-slate-600 whitespace-nowrap truncate">Potato Quality Grader</span>
          <div className="hidden md:flex gap-2 ml-6">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md font-medium transition-colors text-sm ${
                  pathname === link.href
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700/60'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <div className="md:hidden">
            {/* Mobile nav: show only active section, could add a menu button for more */}
            <span className="px-3 py-2 rounded-md font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40">
              {navLinks.find(l => l.href === pathname)?.label || 'Menu'}
            </span>
          </div>
          <UserProfileButton />
        </div>
      </nav>
      {/* Mobile nav links */}
      <div className="md:hidden flex justify-center gap-2 pb-2">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 rounded-md font-medium transition-colors text-sm ${
              pathname === link.href
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700/60'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
