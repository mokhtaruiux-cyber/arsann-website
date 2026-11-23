'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { DICT, type Lang } from '@/content/scene01';
import { buildScene01Timeline } from '@/lib/scene01/timeline';
import { scene01Progress } from '@/lib/scene01/progress';

function HeroWords({ text }: { text: string }) {
  return text.split(/(\s+)/u).map((part, index) => part.trim() ? (
    <span key={index} className="s01-word-mask">
      <span className="s01-word-exit" data-hero-word="">
        <span className="s01-word-enter" style={{ '--word-order': Math.floor(index / 2) } as CSSProperties}>{part}</span>
      </span>
    </span>
  ) : part);
}

/** All text is live HTML. States are stacked blocks cross-faded by ONE scrubbed GSAP timeline (visibility:hidden removes inactive blocks from the accessibility tree);
 *  a visually-hidden outline lists every headline for assistive tech and crawlers. */
export function Scene01Content({ lang }: { lang: Lang }) {
  const d = DICT[lang]; const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current; if (!el) return; const tl = buildScene01Timeline(el, d.dir);
    tl.progress(scene01Progress.ref.current); const off = scene01Progress.subscribe(p => { tl.progress(p); });
    return () => { off(); tl.kill(); };
  }, [d.dir]);
  const headStates = d.states;
  return (
    <div ref={root} className="s01-content" dir={d.dir} lang={lang}>
      <div className="s01-scrim" data-scrim="left" aria-hidden="true" /><div className="s01-scrim" data-scrim="right" aria-hidden="true" /><div className="s01-scrim" data-scrim="bottom" aria-hidden="true" />
      <div className="s01-scrim" data-scrim="top" aria-hidden="true" />
      {headStates.map((s, i) => (
        <section key={s.at} data-state={s.at} data-zone={s.zone} data-narrow={s.narrow ? 'true' : 'false'} className="s01-block">
          <p className="t-caption s01-eyebrow">{i === 0 ? <HeroWords text={d.eyebrow} /> : d.eyebrow}</p>
          {s.head && (i === 0 ? <h1 className="t-display"><HeroWords text={s.head} /></h1> : <h2 className="t-h1">{s.head}</h2>)}
          {s.body && <p className="t-body s01-body">{i === 0 ? <HeroWords text={s.body} /> : s.body}</p>}
          {s.note && <p className="t-caption s01-note">{s.note}</p>}
        </section>
      ))}
      <div className="s01-cue" data-cue="scroll" aria-hidden="true"><span className="t-caption">{d.scroll}</span><i /></div>
      <div className="s01-cue" data-cue="continue" aria-hidden="true"><span className="t-caption">{d.cont}</span><i /></div>
      <main className="s01-sr" id="s01-main" tabIndex={-1}><h2>{d.outlineTitle}</h2><ol>{headStates.filter(s => s.head).map(s => <li key={s.at}>{s.head}{s.body ? ` — ${s.body}` : ''}</li>)}</ol></main>
    </div>
  );
}
