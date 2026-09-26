import type { Resource, StudyTask } from './types';

// Only the five user-verified URLs. No inferred video titles or curriculum mappings.
export const VERIFIED_RESOURCES: Resource[] = [
  ...['aaDMXl4FVBg', '9KAgoYwUH4s', 'GkRsyvj72YU'].map((id): Resource => ({
    id, title: `YouTube · ${id}`, url: `https://www.youtube.com/watch?v=${id}`,
    kind: 'video', subjectId: null, chapterId: null, language: 'unknown', verified: true,
  })),
  { id: '15MinMathLr', title: '15MinMathLr', url: 'https://www.youtube.com/@15MinMathLr/playlists', kind: 'playlist', subjectId: null, chapterId: null, language: 'unknown', verified: true },
  { id: 'hassanbahi', title: 'hassanbahi', url: 'https://www.youtube.com/@hassanbahi', kind: 'channel', subjectId: null, chapterId: null, language: 'unknown', verified: true },
];

export function safeYouTubeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'www.youtube.com' || url.port || url.username || url.password) return null;
    if (url.pathname === '/watch' && /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get('v') ?? ''))
      return `https://www.youtube.com/watch?v=${url.searchParams.get('v')}`;
    if (/^\/@[A-Za-z0-9_-]+(?:\/playlists)?$/.test(url.pathname)) return `https://www.youtube.com${url.pathname}`;
    return null;
  } catch { return null; }
}

export function youtubeThumbnail(value: string): string | null {
  const safe = safeYouTubeUrl(value);
  const id = safe ? new URL(safe).searchParams.get('v') : null;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/** Explicit links, then exact chapter, then subject, then unmapped supplementary links.
 * Stable id tie-break and URL deduplication keep recommendations deterministic. */
export function selectResources(resources: Resource[], task: Pick<StudyTask, 'subjectId' | 'chapterId' | 'resourceIds'>): Resource[] {
  const score = (r: Resource) => task.resourceIds?.includes(r.id) ? 4 : r.chapterId && r.chapterId === task.chapterId ? 3 : r.subjectId && r.subjectId === task.subjectId && !r.chapterId ? 2 : !r.chapterId && !r.subjectId ? 1 : 0;
  const seen = new Set<string>();
  return [...resources].filter(r => r.verified && safeYouTubeUrl(r.url) && score(r) > 0)
    .sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .filter(r => { const url = safeYouTubeUrl(r.url)!; if (seen.has(url)) return false; seen.add(url); return true; }).slice(0, 3);
}

export function learningStage(type: StudyTask['type']): 'learn' | 'practice' | 'recall' {
  return type === 'COURSE' ? 'learn' : ['REVISION', 'MEMORY', 'REVIEW'].includes(type) ? 'recall' : 'practice';
}

export function nextLearningTask(tasks: StudyTask[]): StudyTask | null {
  return tasks.filter(t => ['pending', 'running', 'paused'].includes(t.status))
    .sort((a, b) => Number(b.status === 'running') - Number(a.status === 'running') || b.priority - a.priority || a.id.localeCompare(b.id))[0] ?? null;
}
