import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DICT, LANGS, isLang } from '@/content/scene01';
import { asset } from '@/lib/asset';
import '../../globals.css';
import './site.css';

export function generateStaticParams() { return LANGS.map(lang => ({ lang })); }
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; if (!isLang(lang)) return {}; const d = DICT[lang];
  return { title: d.htmlTitle, description: d.description, alternates: { languages: { en: '/en', ar: '/ar' } }, robots: { index: false, follow: false } };
}
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLang(lang)) notFound();
  return (
    <html lang={lang} dir={DICT[lang].dir} data-site="arsann" suppressHydrationWarning>
      <head>{(lang === 'ar' ? ['ZaridSansAL-Regular.ttf', 'ZaridSansAL-Medium.ttf'] : ['GeneralSans-Regular.otf', 'GeneralSans-Medium.otf']).map(f => <link key={f} rel="preload" href={asset(`/fonts/${f}`)} as="font" type={f.endsWith('.ttf') ? 'font/ttf' : 'font/otf'} crossOrigin="anonymous" />)}</head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
