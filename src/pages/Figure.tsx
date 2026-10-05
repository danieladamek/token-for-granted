import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Figure as FigureT } from '@/types';
import { figuresIndex as figures } from '@/lib/data';
import { loadFigure } from '@/lib/heavy';
import { lazy, Suspense } from 'react';
import FigureHeader from '@/components/figures/FigureHeader';
// the frame (markdown, tables, charts, the records index) loads after the heading has painted
const FigureFrame = lazy(() => import('@/components/figures/FigureFrame'));
import NotFound from './NotFound';

/** Run `cb` once the page has had its first contentful paint (at once if it already has). */
function afterFirstPaint(cb: () => void): () => void {
  let done = false; let t: ReturnType<typeof setTimeout> | undefined;
  const go = () => { if (!done) { done = true; t = setTimeout(cb, 30); } };
  if (typeof PerformanceObserver === 'undefined' || performance.getEntriesByName('first-contentful-paint').length) { go(); return () => clearTimeout(t); }
  const po = new PerformanceObserver(() => { po.disconnect(); go(); });
  try { po.observe({ type: 'paint', buffered: true }); } catch { go(); }
  const fallback = setTimeout(go, 1500);
  return () => { done = true; po.disconnect(); clearTimeout(t); clearTimeout(fallback); };
}

export default function Figure() {
  const { id } = useParams();
  const meta = figures.find((x) => x.id === id);
  const [f, setF] = useState<FigureT | null>(null);
  // the figure's data (and the frame's code) are fetched after the heading has painted, so the heading is never held back by them
  useEffect(() => {
    let live = true; setF(null);
    const cancel = afterFirstPaint(() => { if (id) loadFigure(id).then((x) => { if (live) setF(x); }); });
    return () => { live = false; cancel(); };
  }, [id]);
  if (!meta) return <NotFound />;
  const idx = figures.findIndex((x) => x.id === meta.id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* the heading renders from the slim index at once, and stays put while the figure's own data loads */}
      <div className="bx-card p-4 sm:p-6">
        <FigureHeader meta={meta} />
        {f ? <Suspense fallback={<div className="min-h-[44rem]"><p className="mt-4 bx-muted" role="status">Loading the figure…</p></div>}><FigureFrame figure={f} headless /></Suspense> : <div className="min-h-[44rem]"><p className="mt-4 bx-muted" role="status">Loading the figure…</p></div>}
      </div>
      <p className="mt-6 flex flex-wrap gap-2 text-sm">
        {idx > 0 && <Link className="bx-btn" to={`/figures/${figures[idx - 1].id}`}>← {figures[idx - 1].label}</Link>}
        {idx < figures.length - 1 && <Link className="bx-btn" to={`/figures/${figures[idx + 1].id}`}>{figures[idx + 1].label} →</Link>}
        <Link className="bx-btn ml-auto" to="/figures">All figures</Link>
      </p>
    </div>
  );
}
