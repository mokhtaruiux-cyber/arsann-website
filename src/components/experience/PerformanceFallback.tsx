import { asset } from '@/lib/asset';
import Image from 'next/image';
import { DICT, type Lang } from '@/content/scene01';
import { SiteHeader } from './SiteHeader';

export type FallbackReason = 'reduced' | 'webgl' | 'perf' | 'assets';
/** An ordinary scrolling page over pre-rendered stills. Same copy, header and language switch. */
export function PerformanceFallback({ lang, reason }: { lang: Lang; reason: FallbackReason }) {
  const d = DICT[lang];
  return (
    <div className="s01-static" dir={d.dir} lang={lang} data-fallback={reason}>
      <SiteHeader lang={lang} />
      <p className="s01-static-note t-caption" role="status">{d.staticNotice[reason]}</p>
      <main id="s01-main" tabIndex={-1}>
        {d.states.map((s, i) => {
          const poster = String(s.at).padStart(3, '0');
          return (
            <section key={s.at} className="s01-static-sec" data-state={s.at}>
              <Image src={asset(`/posters/s01_${poster}.webp`)} alt="" fill sizes="100vw" priority={i === 0} loading="eager" className="s01-static-img" />
              <div className="s01-static-copy">
                <p className="t-caption s01-eyebrow">{d.eyebrow}</p>
                {s.head && (i === 0 ? <h1 className="t-display">{s.head}</h1> : <h2 className="t-h1">{s.head}</h2>)}
                {s.body && <p className="t-body s01-body">{s.body}</p>}
                {s.note && <p className="t-caption s01-note-static">{s.note}</p>}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
