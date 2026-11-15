import Link from 'next/link';
export default function Home() {
  return (<main className="p-8" style={{ fontFamily: 'system-ui, sans-serif' }}><h1 className="mb-4 text-xl">ARSANN — Scene 01 GLB proof of concept</h1>
    <ul className="list-disc space-y-1 ps-6"><li><Link href="/scene01-test">/scene01-test</Link> — GLB inspection viewer</li><li><Link href="/scene01-compare">/scene01-compare</Link> — Blender vs GLB</li><li><Link href="/scene01-scroll-test">/scene01-scroll-test</Link> — GSAP + Lenis scroll</li></ul></main>);
}
