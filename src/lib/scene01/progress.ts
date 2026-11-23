import { CHECKPOINTS } from '@/content/scene01';
type Listener = (p: number) => void;
/** Single source of truth for Scene 01 scroll progress (0..1). Written by ScrollController; read by the timeline, canvas, labels and indicator without React re-renders. */
export const scene01Progress = {
  ref: { current: 0 },
  listeners: new Set<Listener>(),
  api: null as null | { scrollTo: (p: number, immediate?: boolean) => void; stop: () => void; start: () => void },
  publish(p: number) { this.ref.current = p; this.listeners.forEach(l => l(p)); },
  subscribe(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; },
};
export function nearestCheckpoint(p: number) { let best = 0, d = 9; CHECKPOINTS.forEach((c, i) => { const x = Math.abs(c / 100 - p); if (x < d) { d = x; best = i; } }); return best; }

/** Scene 02 progress (0..1) — the second half of the shared scroll length, published by ScrollController. */
export const scene02Progress = {
  ref: { current: 0 },
  listeners: new Set<Listener>(),
  publish(p: number) { this.ref.current = p; this.listeners.forEach(l => l(p)); },
  subscribe(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; },
};

/** Scene 03 progress (0..1) — the last share of the shared scroll length. */
export const scene03Progress = {
  ref: { current: 0 },
  listeners: new Set<Listener>(),
  publish(p: number) { this.ref.current = p; this.listeners.forEach(l => l(p)); },
  subscribe(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; },
};

/** Scene 04 progress (0..1): the Tesla corridor drive (Blender image sequence), after the horse story. */
export const scene04Progress = {
  ref: { current: 0 },
  listeners: new Set<Listener>(),
  publish(p: number) { this.ref.current = p; this.listeners.forEach(l => l(p)); },
  subscribe(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; },
};
