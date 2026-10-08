import { useOutlet } from '@remix-run/react';

export { loader } from '../server/library.loader.server';
export type { LibraryEntry } from '../server/library.loader.server';

/**
 * Presentation-library JSON loader lives in `../server/library.loader.server`
 * (kept out of `routes/` so Remix does not expose /library/loader/server).
 * Song-library routes nest under this path (`library.songs*`); render the child
 * via Outlet when present, otherwise the placeholder for bare `/library`.
 */
export default function LibraryPage() {
  const outlet = useOutlet();
  return outlet ?? <div>Library (coming soon)</div>;
}
