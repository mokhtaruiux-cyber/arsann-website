import { notFound } from 'next/navigation';
import { Scene01Experience } from '@/components/experience/Scene01Experience';
import { isLang } from '@/content/scene01';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLang(lang)) notFound();
  return <Scene01Experience lang={lang} />;
}
