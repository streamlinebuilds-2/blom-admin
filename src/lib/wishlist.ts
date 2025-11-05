export interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
  slug?: string;
}

export type WishlistSubscriber = (items: WishlistItem[]) => void;

const STORAGE_KEY = 'blom-wishlist-items';

function readFromStorage(): WishlistItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as WishlistItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(Boolean);
  } catch (error) {
    console.warn('Failed to read wishlist from storage', error);
    return [];
  }
}

function writeToStorage(items: WishlistItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('Failed to write wishlist to storage', error);
  }
}

class WishlistStore {
  private items: WishlistItem[] = [];
  private subscribers: Set<WishlistSubscriber> = new Set();

  constructor() {
    this.items = readFromStorage();
  }

  private notify() {
    writeToStorage(this.items);
    const snapshot = [...this.items];
    this.subscribers.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.warn('Wishlist subscriber failed', error);
      }
    });
  }

  getItems() {
    return [...this.items];
  }

  subscribe(listener: WishlistSubscriber) {
    this.subscribers.add(listener);
    listener([...this.items]);

    return () => {
      this.subscribers.delete(listener);
    };
  }

  isInWishlist(productSlug: string) {
    if (!productSlug) return false;
    return this.items.some((item) => item.slug === productSlug || item.productId === productSlug);
  }

  toggleItem(item: WishlistItem) {
    if (!item?.productId && !item?.slug) {
      return false;
    }

    const identifier = item.slug || item.productId;
    const existingIndex = this.items.findIndex(
      (wishlistItem) => wishlistItem.slug === identifier || wishlistItem.productId === identifier
    );

    if (existingIndex >= 0) {
      this.items.splice(existingIndex, 1);
      this.notify();
      return false;
    }

    const entry: WishlistItem = {
      ...item,
      slug: item.slug || item.productId,
    };

    this.items.push(entry);
    this.notify();
    return true;
  }
}

export const wishlistStore = new WishlistStore();
