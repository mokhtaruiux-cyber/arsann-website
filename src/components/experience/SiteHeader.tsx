'use client';
import { asset } from '@/lib/asset';
import { useEffect, useRef, useState } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { scene01Progress } from '@/lib/scene01/progress';
import { DICT, type Lang } from '@/content/scene01';
import { NAV_LINKS } from '@/content/nav';

/** Logo is the PROVISIONAL lockup from the PM project (official master pending): shown unmodified, never recoloured or given effects. */
export function SiteHeader({ lang }: { lang: Lang }) {
  const d = DICT[lang];
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const menu = dialog.current;
    if (!menu) return;
    menu.showModal();
    scene01Progress.api?.stop();
    const desktop = window.matchMedia('(min-width: 1025px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      menu.close();
      desktop.removeEventListener('change', closeOnDesktop);
      scene01Progress.api?.start();
    };
  }, [open]);
  const onNav = (e: React.MouseEvent, id: string) => { if (!NAV_LINKS[id]) e.preventDefault(); setOpen(false); };   // no destination yet: stay on the page, still react to the click
  const items = d.nav.map(n => <li key={n.id}><a href={NAV_LINKS[n.id] ?? `#${n.id}`} data-nav={n.id} data-pending={NAV_LINKS[n.id] ? 'false' : 'true'} onClick={e => onNav(e, n.id)}>{n.label}</a></li>);
  return (
    <header className="s01-header">
      <a className="s01-skip" href="#s01-main">{d.skip}</a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <a href={`/${lang}`} className="s01-logo" aria-label={d.brand}><img src={asset("/brand/arsann-lockup-reverse.provisional.svg")} alt={d.brand} width={121} height={48} data-provisional="true" /></a>
      <nav aria-label={lang === 'en' ? 'Main' : 'الرئيسية'} className="s01-nav"><ul>{items}</ul></nav>
      <div className="s01-header-end">
        <LanguageSwitcher lang={lang} />
        <button type="button" className="s01-menu-btn" aria-expanded={open} aria-controls="s01-menu" onClick={() => setOpen(true)}>{d.menu}</button>
      </div>
      <dialog ref={dialog} id="s01-menu" className="s01-menu" aria-label={d.menu} onCancel={e => { e.preventDefault(); setOpen(false); }}>
        <button type="button" className="s01-menu-close" onClick={() => setOpen(false)}>{d.close}</button>
        <ul>{items}</ul>
      </dialog>
    </header>
  );
}
