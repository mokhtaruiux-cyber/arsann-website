import { asset } from '@/lib/asset';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DICT, LANGS, isLang } from '@/content/scene01';
import '../../globals.css';
import './site.css';

/** Everything the Earth needs for its first frame, requested by the browser from the very first byte of HTML. Without this the downloads form a waterfall (JS → canvas chunk → GLB → textures → Basis transcoder) and the globe appears seconds late on a phone. Same URLs and CORS mode as the loaders use, so the responses are reused, not fetched twice. The texture/transcoder preloads are phone-only (media query): desktop picks a different texture tier and must not pay for files it will not use. */
const EARTH_PRELOADS = [asset('/models/scene01/v3/scene01_origin.notex.glb'), asset('/data/camera_path_v3.json'), asset('/textures/scene01/day_global_4096.etc1s.ktx2'), asset('/textures/scene01/night_global_4096.etc1s.ktx2'), asset('/textures/scene01/landmask_2048.webp'), asset('/basis/basis_transcoder.js'), asset('/basis/basis_transcoder.wasm')];
/** The live Earth camera zooms in on narrow/short phones (EarthScene portraitZoom); the baked poster is a 390×844 capture, so it is scaled (empirical fit of the live framing at 640–844px heights, measured on the deployed site) before first paint — no size jump when the live canvas takes over. */
const POSTER_ZOOM_JS = `(function(){function z(){var w=innerWidth,h=innerHeight,v=1;if(w/h<0.8){v=h<=667?Math.max(0.75,0.83+(h-640)*0.00075):h>=844?1.045:0.849+(h-667)*0.00111}document.documentElement.style.setProperty('--pz',v.toFixed(4))}z();addEventListener('resize',z)})()`;
export function generateStaticParams() { return LANGS.map(lang => ({ lang })); }
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; if (!isLang(lang)) return {}; const d = DICT[lang];
  return { title: d.htmlTitle, description: d.description, alternates: { languages: { en: '/en', ar: '/ar' } }, robots: { index: false, follow: false } };
}
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLang(lang)) notFound();
  return (
    <html lang={lang} dir={DICT[lang].dir} data-site="arsann" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: POSTER_ZOOM_JS }} />
        {EARTH_PRELOADS.map(u => <link key={u} rel="preload" as="fetch" href={(u)} crossOrigin="anonymous" fetchPriority={/\.(ktx2|webp|wasm|js)$/.test(u) ? 'low' : 'auto'} media={/\.(ktx2|webp|wasm|js)$/.test(u) ? '(max-aspect-ratio: 4/5)' : undefined} />)}{(lang === 'ar' ? ['ZaridSansAL-Regular.ttf', 'ZaridSansAL-Medium.ttf'] : ['GeneralSans-Regular.otf', 'GeneralSans-Medium.otf']).map(f => <link key={f} rel="preload" href={`/fonts/${f}`} as="font" type={f.endsWith('.ttf') ? 'font/ttf' : 'font/otf'} crossOrigin="anonymous" />)}</head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
