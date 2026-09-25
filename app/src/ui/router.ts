/**
 * Minimal hash router — no extra dependency, works offline and keeps every screen linkable.
 * Routes are plain strings: `#/today`, `#/subject/sub-analyse1`, `#/chapter/ch-…`.
 */

import { useEffect, useState } from 'react';

export interface Route {
  screen: string;
  params: string[];
  hash: string;
}

function parse(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const parts = clean.split('/').filter(Boolean);
  const [screen = 'dashboard', ...params] = parts;
  return { screen, params, hash: clean };
}

export function useRoute(): Route {
  const initial = typeof window === 'undefined' ? '' : window.location.hash;
  const [route, setRoute] = useState<Route>(() => parse(initial));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.location.replace('#/dashboard');
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(path: string): void {
  if (typeof window === 'undefined') return;
  const target = path.startsWith('#') ? path : `#/${path.replace(/^\//, '')}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}

export function href(path: string): string {
  return `#/${path.replace(/^\//, '')}`;
}
