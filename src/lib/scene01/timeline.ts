import gsap from 'gsap';
/** One continuous GSAP timeline (duration 1 == scroll progress 0..1). Checkpoints 0/15/40/65/85/100 are waypoints on it, not slides. */
export function buildScene01Timeline(root: HTMLElement, dir: 'ltr' | 'rtl') {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power1.inOut' } });
  const q = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const win = (sel: string, inA: number | null, inB: number, outA: number | null, outB: number, y = 18) => {
    const els = q(sel); if (!els.length) return;
    if (inA !== null) tl.fromTo(els, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: inB - inA, immediateRender: true }, inA);
    if (outA !== null) { if (inA === null) tl.fromTo(els, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -y * 0.6, duration: outB - outA, immediateRender: true }, outA); else tl.to(els, { autoAlpha: 0, y: -y * 0.6, duration: outB - outA, immediateRender: false }, outA); }
  };
  // Let the opening words travel out through the same masks as their entrance.
  const heroWords = q('[data-state="0"] [data-hero-word]');
  if (heroWords.length) {
    tl.fromTo(heroWords, { yPercent: 0 }, { yPercent: -145, duration: 0.065, stagger: 0.002, ease: 'power2.in' }, 0.07);
  }
  win('[data-state="0"]', null, 0, 0.125, 0.165, 0);
  win('[data-state="15"]', 0.10, 0.17, 0.28, 0.33);      // orbital: eyebrow only
  win('[data-state="40"]', 0.30, 0.37, 0.55, 0.60);      // "Built in Saudi Arabia."
  // The cloud cover starts at 84 % and is half-way at 93 %, so every message must be gone before the clouds take the frame (nothing on clouds, nothing leaking into Scene 02).
  win('[data-state="65"]', 0.58, 0.64, 0.68, 0.73);      // "Across the Kingdom."
  win('[data-state="85"]', 0.71, 0.76, 0.79, 0.83);      // "Every place, connected."
  win('[data-state="100"]', 0.82, 0.86, 0.89, 0.92);     // "Every arrival, handled."
  win('[data-cue="scroll"]', null, 0, 0.0, 0.07, 6); win('[data-cue="continue"]', 0.96, 1.0, null, 1, 6);
  // legibility scrims: copy sits on the start side from 65 % (Arabic: right), in the left safe zone before that
  const left = q('[data-scrim="left"]'), right = q('[data-scrim="right"]');
  if (dir === 'ltr') { tl.fromTo(left, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.07, immediateRender: true }, 0.30); }
  else { tl.fromTo(left, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.07, immediateRender: true }, 0.30).to(left, { autoAlpha: 0, duration: 0.06 }, 0.58).fromTo(right, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06, immediateRender: true }, 0.60); }
  tl.fromTo(q('[data-scrim="bottom"]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.07, immediateRender: true }, 0.30);
  tl.fromTo(q('[data-scrim="top"]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.13, immediateRender: true }, 0.17);
  tl.to({}, { duration: 0 }, 1);
  return tl;
}
