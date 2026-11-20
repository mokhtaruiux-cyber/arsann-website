import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DICT, LANGS, isLang } from '@/content/scene01';
import { asset } from '@/lib/asset';
import '../../globals.css';
import './site.css';

/** Everything the Earth needs for its first frame, requested by the browser from the very first byte of HTML. Without this the downloads form a waterfall (JS → canvas chunk → GLB → textures → Basis transcoder) and the globe appears seconds late on a phone. Same URLs and CORS mode as the loaders use, so the responses are reused, not fetched twice. */
const EARTH_PRELOADS = ['/models/scene01/v3/scene01_origin.notex.glb', '/data/camera_path_v3.json', '/textures/scene01/day_global_4096.etc1s.ktx2', '/textures/scene01/night_global_4096.etc1s.ktx2', '/textures/scene01/landmask_2048.webp', '/basis/basis_transcoder.js', '/basis/basis_transcoder.wasm'];
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
        {EARTH_PRELOADS.map(u => <link key={u} rel="preload" as="fetch" href={asset(u)} crossOrigin="anonymous" fetchPriority={/\.(ktx2|webp|wasm|js)$/.test(u) ? 'low' : 'auto'} />)}{(lang === 'ar' ? ['ZaridSansAL-Regular.ttf', 'ZaridSansAL-Medium.ttf'] : ['GeneralSans-Regular.otf', 'GeneralSans-Medium.otf']).map(f => <link key={f} rel="preload" href={asset(`/fonts/${f}`)} as="font" type={f.endsWith('.ttf') ? 'font/ttf' : 'font/otf'} crossOrigin="anonymous" />)}</head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
