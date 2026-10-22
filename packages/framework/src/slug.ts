/**
 * Heading and tab slugs, the same way `rehype-slug`/GitHub make them. Pure, no
 * IO, so routing code that never touches the file system (./routes) can use
 * it. `./content` re-exports it, so `slugify` from there is unchanged.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
