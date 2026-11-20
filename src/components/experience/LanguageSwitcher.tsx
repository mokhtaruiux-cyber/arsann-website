'use client';
import Link from 'next/link';
import { scene01Progress } from '@/lib/scene01/progress';
import { DICT, type Lang } from '@/content/scene01';

/** Real route switch (/en <-> /ar). Keeps the scroll position by handing the progress over through sessionStorage. The Earth is never mirrored. */
export function LanguageSwitcher({ lang }: { lang: Lang }) {
  const d = DICT[lang]; const o = d.otherLang;
  return (
    <Link href={`/${o.code}`} prefetch={false} hrefLang={o.code} lang={o.code} className="s01-lang" aria-label={o.name} onNavigate={() => {
      if (!scene01Progress.api) return;
      try { sessionStorage.setItem('arsann-p', `/${o.code}:${scene01Progress.ref.current}`); } catch { /* Storage blocked. */ }
    }}>
      <span aria-hidden="true" data-active={lang === 'en'}>EN</span><span aria-hidden="true" data-active={lang === 'ar'}>{lang === 'ar' ? 'عربي' : 'AR'}</span>
    </Link>
  );
}
