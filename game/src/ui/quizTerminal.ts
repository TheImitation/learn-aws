import type { Topic, TopicQuizQuestion } from '@content';
import { clearMissed, markMissed } from '../core/progress';
import { esc, UiShell } from './uiShell';

const PASS_PCT = 80; // v1 topic-mastery threshold

/** Sign-off paperwork: runs a topic's quiz inside UiShell panels.
 *  v1 conventions preserved: options are shuffled at render (display order ≠ authoring
 *  order; `correct` holds ORIGINAL indices), one multi-select per topic, missed-question
 *  tracking feeds the review drill. */
export class QuizTerminal {
  constructor(private ui: UiShell) {}

  start(topic: Topic, onDone: (pct: number, passed: boolean) => void) {
    let qi = 0;
    let correctCount = 0;
    const askNext = () => {
      if (qi >= topic.quiz.length) {
        const pct = Math.round((correctCount / topic.quiz.length) * 100);
        onDone(pct, pct >= PASS_PCT);
        return;
      }
      this.ask(topic, qi, (ok) => { if (ok) correctCount++; qi++; askNext(); });
    };
    askNext();
  }

  private ask(topic: Topic, qi: number, cb: (ok: boolean) => void) {
    const q = topic.quiz[qi];
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const kicker = `Sign-off · Question ${qi + 1} of ${topic.quiz.length}`;

    const grade = (picked: Set<number>) => {
      const want = new Set(q.correct);
      const ok = picked.size === want.size && [...picked].every((p) => want.has(p));
      if (ok) clearMissed(topic.id, qi); else markMissed(topic.id, qi);
      this.explain(q, ok, kicker, () => cb(ok), qi + 1 >= topic.quiz.length);
    };

    if (q.kind === 'multi') {
      const picked = new Set<number>();
      const render = () => this.ui.open({
        id: `quiz-${topic.id}-${qi}`,
        kicker,
        title: q.prompt,
        actions: [
          ...order.map((oi) => ({
            label: `${picked.has(oi) ? '☑' : '☐'} ${q.options[oi]}`,
            closes: false,
            onSelect: () => { if (picked.has(oi)) picked.delete(oi); else picked.add(oi); render(); },
          })),
          { label: '→ Submit answer', closes: false, onSelect: () => grade(picked) },
        ],
      });
      render();
    } else {
      this.ui.open({
        id: `quiz-${topic.id}-${qi}`,
        kicker,
        title: q.prompt,
        actions: order.map((oi) => ({
          label: q.options[oi],
          closes: false,
          onSelect: () => grade(new Set([oi])),
        })),
      });
    }
  }

  private explain(q: TopicQuizQuestion, ok: boolean, kicker: string, next: () => void, last: boolean) {
    const answer = q.correct.map((i) => q.options[i]).join('  ·  ');
    this.ui.open({
      id: 'quiz-explain',
      kicker,
      title: ok ? '✔ Correct' : '✘ Not quite',
      bodyHtml:
        (ok ? '' : `<div><b>Answer:</b> ${esc(answer)}</div><div style="height:8px"></div>`) +
        `<div>${esc(q.explain)}</div>`,
      actions: [{ label: last ? 'See result →' : 'Next question →', closes: false, onSelect: next }],
    });
  }
}
