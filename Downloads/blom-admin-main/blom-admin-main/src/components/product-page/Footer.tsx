import React from 'react';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-center text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p className="font-medium text-gray-900">Blom Beauty</p>
        <p>&copy; {year} Blom Beauty. All rights reserved.</p>
        <div className="flex justify-center gap-4 sm:justify-end">
          <a href="/privacy" className="transition hover:text-pink-500">
            Privacy
          </a>
          <a href="/terms" className="transition hover:text-pink-500">
            Terms
          </a>
          <a href="/support" className="transition hover:text-pink-500">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
};
