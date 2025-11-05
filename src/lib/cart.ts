export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
  variantId?: string;
  variant?: Record<string, unknown>;
  quantity?: number;
}

export type CartSubscriber = (items: CartItem[]) => void;

const STORAGE_KEY = 'blom-cart-items';

function readFromStorage(): CartItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(Boolean);
  } catch (error) {
    console.warn('Failed to read cart from storage', error);
    return [];
  }
}

function writeToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('Failed to write cart to storage', error);
  }
}

class CartStore {
  private items: CartItem[] = [];
  private subscribers: Set<CartSubscriber> = new Set();

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
        console.warn('Cart subscriber failed', error);
      }
    });
  }

  getItems() {
    return [...this.items];
  }

  subscribe(listener: CartSubscriber) {
    this.subscribers.add(listener);
    listener([...this.items]);

    return () => {
      this.subscribers.delete(listener);
    };
  }

  addItem(item: CartItem, quantity = 1) {
    if (!item?.productId) {
      return;
    }

    const existing = this.items.find(
      (cartItem) =>
        cartItem.productId === item.productId &&
        (cartItem.variantId || '') === (item.variantId || '')
    );

    if (existing) {
      existing.quantity = (existing.quantity || 1) + Math.max(1, quantity);
    } else {
      this.items.push({ ...item, quantity: Math.max(1, quantity) });
    }

    this.notify();
  }

  updateQuantity(productId: string, quantity: number, variantId?: string) {
    const target = this.items.find(
      (cartItem) =>
        cartItem.productId === productId &&
        (cartItem.variantId || '') === (variantId || '')
    );

    if (!target) {
      return;
    }

    if (quantity <= 0) {
      this.removeItem(productId, variantId);
      return;
    }

    target.quantity = quantity;
    this.notify();
  }

  removeItem(productId: string, variantId?: string) {
    const beforeLength = this.items.length;
    this.items = this.items.filter(
      (cartItem) =>
        cartItem.productId !== productId ||
        (cartItem.variantId || '') !== (variantId || '')
    );

    if (this.items.length !== beforeLength) {
      this.notify();
    }
  }

  clear() {
    if (this.items.length === 0) {
      return;
    }

    this.items = [];
    this.notify();
  }
}

export const cartStore = new CartStore();

export function showNotification(message: string) {
  if (!message) return;

  if (typeof window !== 'undefined') {
    const event = new CustomEvent('cart:notification', { detail: { message } });
    window.dispatchEvent(event);
  } else {
    console.log(message);
  }
}
