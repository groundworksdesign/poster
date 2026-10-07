import { useOutlet } from '@remix-run/react';

export { loader } from './library.loader.server';
export type { LibraryEntry } from './library.loader.server';

/**
 * Presentation-library JSON loader lives in `library.loader.server`.
 * Song-library routes nest under this path (`library.songs*`); render the child
 * via Outlet when present, otherwise the placeholder for bare `/library`.
 */
export default function LibraryPage() {
  const outlet = useOutlet();
  return outlet ?? <div>Library (coming soon)</div>;
}
