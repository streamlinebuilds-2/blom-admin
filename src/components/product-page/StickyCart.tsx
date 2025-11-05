import React from 'react';
import { ShoppingCart } from 'lucide-react';

type StickyCartProps = {
  productName: string;
  productImage: string;
  productPrice: number;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  isVisible: boolean;
};

export const StickyCart: React.FC<StickyCartProps> = ({
  productName,
  productImage,
  productPrice,
  quantity,
  onQuantityChange,
  onAddToCart,
  isVisible,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 sm:px-6">
        <img
          src={productImage}
          alt={productName}
          className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
          onError={(event) => {
            event.currentTarget.src =
              'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop';
          }}
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{productName}</p>
          <p className="text-sm text-gray-600">R{productPrice.toFixed(2)}</p>
        </div>
        <div className="flex items-center rounded-full border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            className="px-3 py-1 text-sm font-semibold text-gray-600 hover:text-pink-500"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="px-4 text-sm font-semibold text-gray-900">{quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(quantity + 1)}
            className="px-3 py-1 text-sm font-semibold text-gray-600 hover:text-pink-500"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onAddToCart}
          className="inline-flex items-center gap-2 rounded-full bg-pink-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-500"
        >
          <ShoppingCart className="h-4 w-4" />
          Add to cart
        </button>
      </div>
    </div>
  );
};
