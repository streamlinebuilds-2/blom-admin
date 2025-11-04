/**
 * Convert a string to a URL-friendly slug
 * - Lowercase
 * - Replace spaces/special chars with hyphens
 * - Remove consecutive hyphens
 * - Trim hyphens from start/end
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug suggestion (appends number if needed)
 * Note: Actual uniqueness check should be done server-side
 */
export function generateSlug(name: string, existingSlugs: string[] = []): string {
  let base = slugify(name);
  if (!base) base = 'product';
  
  let slug = base;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

