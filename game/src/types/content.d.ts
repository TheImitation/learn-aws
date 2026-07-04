/** Loose typings for the frozen narrative app's course data (web/src/content.js, read-only). */
declare module '@content' {
  export interface TopicQuizQuestion {
    kind: 'single' | 'multi';
    prompt: string;
    options: string[];
    correct: number[];
    explain: string;
  }
  export interface TopicStage {
    title: string;
    narration: string;
    storyNarration?: string;
    concept: string;
    [k: string]: unknown;
  }
  export interface TopicBlock {
    id: string;
    name: string;
    plain: string;
    real: string;
    code?: string;
    [k: string]: unknown;
  }
  export interface Topic {
    id: string;
    title: string;
    examDomain: string;
    summary: string;
    blocks: TopicBlock[];
    connections: { id: string; from: string; to: string; flow: string; [k: string]: unknown }[];
    stages: TopicStage[];
    quiz: TopicQuizQuestion[];
    [k: string]: unknown;
  }
  export const COURSE: { title: string; topics: Topic[] };
}
