import type { Topic } from '@content';
import { esc, UiShell } from './uiShell';

/** The field manual: teach the CONCEPT before the puzzle. For the new badge
 *  tracks it renders the topic's hand-written primer; for the SAA track it
 *  surfaces the frozen narrative app's teaching layer (block real/code
 *  analogies + stage concepts) that the game previously never showed.
 *  Manuals explain ideas — they never name the winning module on the pallet. */
export function openFieldManual(
  ui: UiShell,
  topic: Topic,
  back?: { label: string; onSelect: () => void },
) {
  const primer = (topic as { primer?: string }).primer;
  const blocks = topic.blocks ?? [];
  const concepts = [...new Set((topic.stages ?? []).map((s) => s.concept).filter(Boolean))];

  let body = '';
  if (primer) {
    body += `<div>${esc(primer)}</div>`;
  } else if (topic.summary) {
    body += `<div>${esc(topic.summary)}</div>`;
  }
  if (blocks.length) {
    body += `<div style="margin-top:10px;color:#7d8aa5;font-size:11px;letter-spacing:.08em">THE PIECES</div>`;
    for (const b of blocks) {
      body +=
        `<div style="margin-top:6px"><b>${esc(b.name)}</b> — ${esc(b.plain)}<br>` +
        `<span style="color:#9db4d6">${esc(b.real)}</span>` +
        (b.code ? `<br><span style="color:#6b7280;font-size:12px">${esc(b.code)}</span>` : '') +
        `</div>`;
    }
  }
  if (concepts.length) {
    body += `<div style="margin-top:10px;color:#7d8aa5;font-size:11px;letter-spacing:.08em">KEY IDEAS</div>` +
      `<div style="color:#9db4d6">${concepts.map((c) => `· ${esc(String(c))}`).join('<br>')}</div>`;
  }
  body += `<div style="margin-top:10px;color:#6b7280;font-size:12px">The manual teaches the concept. The site still hides its own specifics — go probe it.</div>`;

  const actions = [];
  if (back) actions.push({ label: back.label, closes: false as const, onSelect: back.onSelect });
  actions.push({ label: 'Close' });
  ui.open({
    id: `manual-${topic.id}`,
    kicker: `📖 Field manual · ${topic.examDomain}`,
    title: topic.title,
    bodyHtml: body,
    actions,
  });
}
