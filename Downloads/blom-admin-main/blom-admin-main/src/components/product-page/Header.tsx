import React from 'react';

type HeaderProps = {
  showMobileMenu?: boolean;
};

export const Header: React.FC<HeaderProps> = ({ showMobileMenu }) => {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" className="text-xl font-bold tracking-tight text-gray-900">
          Blom Beauty
        </a>
        {showMobileMenu && (
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <a href="/shop" className="transition hover:text-pink-500">
              Shop
            </a>
            <a href="/about" className="transition hover:text-pink-500">
              About
            </a>
            <a href="/contact" className="transition hover:text-pink-500">
              Contact
            </a>
          </nav>
        )}
      </div>
    </header>
  );
};
