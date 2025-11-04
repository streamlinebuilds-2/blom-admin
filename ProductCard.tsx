import React from 'react';
import { Heart, ShoppingCart, ShoppingBag } from 'lucide-react';
import { cartStore } from '../lib/cart';
import { wishlistStore } from '../lib/wishlist';
import { OptimizedImage } from './seo/OptimizedImage';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  shortDescription?: string;
  images: string[];
  inStock?: boolean;
  badges?: string[];
  className?: string;
  isListView?: boolean;
  // Enable homepage-only shine hover effect on image (no colorful hover image)
  hoverShine?: boolean;
  // Discount information
  discountPrice?: number;
  discountBadge?: string;
  discountBadgeColor?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  slug,
  price,
  compareAtPrice,
  shortDescription,
  images,
  inStock = true,
  badges = [],
  className = '',
  isListView = false,
  hoverShine = false,
  discountPrice,
  discountBadge,
  discountBadgeColor
}) => {
  const [isWishlisted, setIsWishlisted] = React.useState(false);
  const cardRef = React.useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    setIsWishlisted(wishlistStore.isInWishlist(slug));
    
    const unsubscribe = wishlistStore.subscribe(() => {
      setIsWishlisted(wishlistStore.isInWishlist(slug));
    });

    return unsubscribe;
  }, [slug]);

  // Detect mobile once on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
    }
  }, []);

  // Mobile-only: Scroll-triggered reveal when card center is within a band around viewport center
  React.useEffect(() => {
    if (!isListView) return;
    if (!isMobile) return;

    const el = cardRef.current;
    if (!el) return;

    const lastYRef = { current: typeof window !== 'undefined' ? window.scrollY : 0 } as { current: number };
    const lastTRef = { current: typeof performance !== 'undefined' ? performance.now() : 0 } as { current: number };
    const velRef = { current: 0 } as { current: number };

    const centerBandPct = 0.15; // ±15% around viewport center
    const enterDwellMs = 160;
    const exitDwellMs = 100;
    const maxScrollPxPerMs = 1.2; // velocity guard
    let timer: number | null = null;

    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const dy = Math.abs(y - lastYRef.current);
      const dt = Math.max(1, now - lastTRef.current);
      velRef.current = dy / dt; // px/ms
      lastYRef.current = y;
      lastTRef.current = now;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = rect.top + rect.height / 2;
      const bandTop = vh * 0.5 * (1 - centerBandPct);
      const bandBot = vh * 0.5 * (1 + centerBandPct);

      const isInBand = center >= bandTop && center <= bandBot;
      const isSlow = velRef.current <= maxScrollPxPerMs;

      if (timer) { window.clearTimeout(timer); timer = null; }

      if (isInBand && isSlow) {
        timer = window.setTimeout(() => setIsInView(true), enterDwellMs);
      } else {
        timer = window.setTimeout(() => setIsInView(false), exitDwellMs);
      }
    };

    // initial compute
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [isListView, isMobile]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!inStock || price === -1) return;
    
    cartStore.addItem({
      id: `item_${Date.now()}`,
      productId: slug,
      name,
      price,
      image: images[0] || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'
    });
    
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const wishlistItem = {
      id: slug,
      productId: slug,
      name,
      price,
      image: images[0] || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
      slug
    };
    
    const wasAdded = wishlistStore.toggleItem(wishlistItem);
    
  };

  const handleCardClick = () => {
    window.location.href = `/products/${slug}`;
  };

  const formatPrice = (price: number) => `R${price.toFixed(2)}`;

  // List view layout - mobile: styled like best seller cards, desktop: horizontal list
  if (isListView) {
    return (
      <article 
        ref={cardRef as any}
        className={`product-card group cursor-pointer bg-white rounded-[18px] overflow-hidden relative transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] md:flex md:items-center md:gap-6 md:p-4 ${className}`}
        style={{ boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}
        onClick={handleCardClick}
      >
        {/* Image Container with Shimmer Effect */}
        <div className="relative aspect-square overflow-hidden md:w-24 md:h-24 md:flex-shrink-0">
          {/* Default white background image */}
          <OptimizedImage
            src={images[0] || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'}
            alt={name}
            productName={name}
            productPrice={price}
            productCategory="Nail Care Products"
            className={`w-full h-full object-cover transition-all duration-300 ease-out ${
              isMobile ? (isInView ? 'opacity-0 scale-[1.02]' : 'opacity-100') : ''
            } group-hover:opacity-0 group-hover:scale-[1.02]`}
            width={400}
            height={400}
            loading="lazy"
          />
          {/* Hover colorful image */}
          {images[1] && (
            <OptimizedImage
              src={images[1]}
              alt={`${name} - Colorful view`}
              productName={name}
              productPrice={price}
              productCategory="Nail Care Products"
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ease-out ${
                isMobile ? (isInView ? 'opacity-100 scale-[1.02]' : 'opacity-0') : 'opacity-0'
              } group-hover:opacity-100 group-hover:scale-[1.02]`}
              width={400}
              height={400}
              loading="lazy"
            />
          )}
          
          {/* Shimmer Effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="shimmer"></div>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="absolute top-3 left-3 z-10 md:top-1 md:left-1">
              {badges.map((badge, index) => (
                <span
                  key={index}
                  className={`inline-block text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                    badge === 'Bestseller' ? 'bg-pink-400 text-white' :
                    badge === 'New' ? 'bg-blue-500 text-white' :
                    badge === 'Sale' ? 'bg-red-500 text-white' : 'bg-pink-400 text-white'
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          {/* Wishlist Button - Bigger */}
          <div className="absolute top-3 right-3 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 md:top-1 md:right-1">
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="relative p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all duration-300 group/btn md:p-2"
              aria-label="Toggle wishlist"
            >
              <Heart className={`h-6 w-6 transition-all md:h-4 md:w-4 ${
                isWishlisted 
                  ? 'fill-current text-pink-400' 
                  : 'text-gray-700'
              }`} />
            </button>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-6 md:p-0 md:flex-1 md:flex md:items-center md:justify-between">
          <div className="md:flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-pink-400 transition-colors duration-[800ms] ease-out md:text-base md:mb-1">
              {name}
            </h3>
            
            {shortDescription && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2 md:text-xs md:mb-2">
                {shortDescription}
              </p>
            )}

            <div className="flex items-center gap-2 md:mb-0">
              <span className="text-xl font-bold text-gray-900 md:text-lg">
                {price === -1 ? 'Coming Soon' : formatPrice(price)}
              </span>
              {compareAtPrice && price !== -1 && (
                <span className="text-sm text-gray-500 line-through md:text-xs">
                  {formatPrice(compareAtPrice)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || price === -1}
            className="w-full bg-pink-400 hover:bg-pink-400 text-white font-semibold py-3 px-4 rounded-full transition-all duration-300 ease-out hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(255,116,164,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none md:w-auto md:px-6 md:py-2 md:text-sm"
          >
            {price === -1 ? 'Coming Soon' : inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </article>
    );
  }

  // Grid view layout
  return (
    <article
      className={`product-card group relative bg-white rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-2 ${hoverShine ? 'best-seller-card' : ''} ${className}`}
      onClick={handleCardClick}
    >
      {/* Image Container - Static for best sellers, Flip for others */}
      {hoverShine ? (
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <img
            src={images[0] || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop';
            }}
          />
          {/* Hover Shine Effect (homepage best sellers only) */}
          <div className="shimmer"></div>

          {/* Wishlist Heart */}
          <button
            type="button"
            onClick={handleWishlistToggle}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg group/heart"
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-all ${
              isWishlisted 
                ? 'fill-current text-pink-400 group-hover/heart:text-pink-500' 
                : 'text-gray-600 group-hover/heart:text-pink-500 group-hover/heart:fill-current'
            }`} />
          </button>
        </div>
      ) : (
        <div className="relative aspect-square overflow-hidden bg-gray-50 product-card-flip-container">
          <div className="product-card-flip-inner">
            {/* Front Face - White Background Image */}
            <div className="product-card-flip-front">
              <img
                src={images[0] || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'}
                alt={name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop';
                }}
              />
            </div>

            {/* Back Face - Colorful Image */}
            {images[1] && (
              <div className="product-card-flip-back">
                <img
                  src={images[1]}
                  alt={name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = images[0] || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop';
                  }}
                />
              </div>
            )}
          </div>

          {/* Wishlist Heart */}
          <button
            type="button"
            onClick={handleWishlistToggle}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg group/heart"
            aria-label="Toggle wishlist"
          >
            <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-all ${
              isWishlisted 
                ? 'fill-current text-pink-400 group-hover/heart:text-pink-500' 
                : 'text-gray-600 group-hover/heart:text-pink-500 group-hover/heart:fill-current'
            }`} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-4 sm:p-4 md:p-6">
        {/* Product Name */}
        <h3 className="font-bold text-base sm:text-base md:text-xl mb-2 text-gray-900 group-hover:text-pink-500 transition-colors line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] md:min-h-[3.5rem] text-center">
          {name}
        </h3>

        {/* Short Description */}
        {shortDescription && (
          <p className="text-gray-600 text-sm sm:text-sm mb-2 sm:mb-3 md:mb-4 line-clamp-2 leading-relaxed text-center">
            {shortDescription}
          </p>
        )}

        {/* Price - Centered */}
        <div className="text-center mb-4 sm:mb-4 md:mb-5">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <span className="text-xl sm:text-xl md:text-2xl font-bold text-gray-900">
              {price === -1 ? 'Coming Soon' : formatPrice(discountPrice || price)}
            </span>
            {(compareAtPrice || discountPrice) && (
              <>
                <span className="text-base sm:text-base md:text-lg text-gray-400 line-through">
                  {formatPrice(compareAtPrice || price)}
                </span>
                <span className={`text-xs sm:text-xs font-semibold text-white px-2 py-1 sm:px-2 sm:py-1 rounded-full ${
                  discountBadgeColor || 'bg-blue-400'
                }`}>
                  {discountBadge || (compareAtPrice ? `${Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}% OFF` : 'SALE')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Add to Cart Button - Centered */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || price === -1}
            className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 py-3 px-4 sm:py-2.5 sm:px-5 md:py-3.5 md:px-8 rounded-full font-bold text-sm sm:text-xs md:text-sm uppercase transition-all duration-200 ${
              inStock && price !== -1
                ? 'bg-pink-400 text-white hover:bg-pink-400 hover:shadow-lg transform hover:scale-[1.02] active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            aria-disabled={!inStock || price === -1}
          >
            <ShoppingCart className="h-4 w-4 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            {price === -1 ? 'COMING SOON' : inStock ? 'ADD TO CART' : 'OUT OF STOCK'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes shineMove {
          0% { transform: translateX(-150%) skewX(-12deg); }
          100% { transform: translateX(150%) skewX(-12deg); }
        }
        /* Trigger animation only on hover to avoid continuous motion */
        .group:hover .shine-bar {
          animation: shineMove 1.2s ease-in-out;
        }
      `}</style>
    </article>
  );
};
