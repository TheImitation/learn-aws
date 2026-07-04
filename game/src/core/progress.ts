/** v1-compatible progress persistence — SAME localStorage keys and semantics as the
 *  narrative app (web/src/main.js), so mastery earned in either app carries over. */

const PKEY = 'learnaws.progress';
const MKEY = 'learnaws.missed';

export interface TopicProgress { mastery: 'Mastered' | 'Assessed' | 'Not started'; best: number }

export function readProgress(): Record<string, TopicProgress> {
  try { return JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch { return {}; }
}

/** v1 semantics exactly: mastery is overwritten, best is monotonic. */
export function recordProgress(id: string, mastery: 'Mastered' | 'Assessed', pct: number): TopicProgress {
  const all = readProgress();
  const cur = all[id] || { mastery: 'Not started' as const, best: 0 };
  all[id] = { mastery, best: Math.max(pct, cur.best || 0) };
  localStorage.setItem(PKEY, JSON.stringify(all));
  return all[id];
}

/** Missed-question tracking (feeds v1's review-weak-spots drill): keyed topicId#qIndex. */
export function markMissed(topicId: string, qi: number) {
  try {
    const m = JSON.parse(localStorage.getItem(MKEY) || '{}');
    m[`${topicId}#${qi}`] = Date.now();
    localStorage.setItem(MKEY, JSON.stringify(m));
  } catch { /* storage unavailable */ }
}
export function clearMissed(topicId: string, qi: number) {
  try {
    const m = JSON.parse(localStorage.getItem(MKEY) || '{}');
    delete m[`${topicId}#${qi}`];
    localStorage.setItem(MKEY, JSON.stringify(m));
  } catch { /* storage unavailable */ }
}
