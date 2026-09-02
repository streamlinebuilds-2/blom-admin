/**
 * Standard door-to-door delivery pricing, mirrored from the storefront.
 *
 * SOURCE OF TRUTH: blom-cosmetics-main/src/lib/shipping.ts — the storefront
 * quotes and charges these values, and this repo only ever reads them back to
 * render receipts, invoices and product copy. Change the storefront first,
 * then mirror the change here; the values must stay identical or admin
 * receipts will disagree with what the customer was actually charged.
 */

/** Flat door-to-door delivery fee, in rand. */
export const SHIPPING_FLAT_RATE = 150;

/** Order subtotal (in rand) at or above which delivery is free. */
export const FREE_SHIPPING_THRESHOLD = 2800;

/** Same values in cents, which is how orders are stored. */
export const SHIPPING_FLAT_RATE_CENTS = SHIPPING_FLAT_RATE * 100;
export const FREE_SHIPPING_THRESHOLD_CENTS = FREE_SHIPPING_THRESHOLD * 100;

/** Display strings for receipts and marketing copy, e.g. "R150" / "R2800". */
export const SHIPPING_FLAT_RATE_LABEL = `R${SHIPPING_FLAT_RATE}`;
export const FREE_SHIPPING_THRESHOLD_LABEL = `R${FREE_SHIPPING_THRESHOLD}`;

/** Whether an order subtotal in cents qualified for free delivery. */
export function qualifiedForFreeShipping(subtotalCents: number): boolean {
  return (subtotalCents || 0) >= FREE_SHIPPING_THRESHOLD_CENTS;
}
