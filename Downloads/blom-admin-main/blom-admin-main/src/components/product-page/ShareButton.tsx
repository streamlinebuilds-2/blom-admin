import React from 'react';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ShareButtonProps = {
  url: string;
  title: string;
  description?: string;
  className?: string;
};

export const ShareButton: React.FC<ShareButtonProps> = ({ url, title, description, className }) => {
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url, title, text: description });
      } catch (error) {
        console.warn('Share cancelled', error);
      }
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      if (typeof window !== 'undefined') {
        window.alert('Link copied to clipboard');
      }
    } catch (error) {
      console.warn('Failed to copy share link', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-pink-400 hover:text-pink-500',
        className,
      )}
    >
      <Share2 className="h-4 w-4" />
      Share
    </button>
  );
};
