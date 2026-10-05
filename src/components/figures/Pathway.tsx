import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Figure, Pathway as PathwayT, PathwayEdge, PathwayNode } from '@/types';
import { getTerm } from '@/lib/data';
import { svgToPng } from './download';
import CiteList from '@/components/records/CiteList';
import Term from '@/components/reader/Term';

const PAD = 16;

/** Wrap a label into lines of ~`max` characters (the full label is always in the card). */
function lines(label: string, max: number, cap: number): string[] {
  const words = label.split(/\s+/); const out: string[] = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) out.push(cur);
  return out.length > cap ? [...out.slice(0, cap - 1), `${out[cap - 1].slice(0, max - 1)}…`] : out;
}

/**
 * The two pathway figures as fixed-layout SVG from the pack's `col`/`row` (rows may be fractional). Node kinds are
 * drawn apart: in Figure 2 `advise` boxes are outlined, `decide` boxes filled, a `lane` is the lane's label and the
 * `overlay` node is a bar across every lane; in Figure 1 the question and the doors are rounded, decisions filled and
 * end states outlined. Every node is a button: its card shows the node's references and links its glossary term.
 */
export default function Pathway({ figure, data, inline }: { figure: Figure; data: PathwayT; inline?: boolean }) {
  const [sel, setSel] = useState<{ node?: string; edge?: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lanes = data.nodes.some((n) => n.kind === 'lane');
  const COL_W = lanes ? 240 : 200, NODE_W = lanes ? 216 : 180, ROW_H = lanes ? 92 : 78, NODE_H = lanes ? 72 : 58;
  const minRow = Math.min(...data.nodes.map((n) => n.row));
  const maxRow = Math.max(...data.nodes.map((n) => n.row));
  const maxCol = Math.max(...data.nodes.map((n) => n.col));
  const W = PAD * 2 + maxCol * COL_W + NODE_W, H = PAD * 2 + (maxRow - minRow) * ROW_H + NODE_H;
  const box = useMemo(() => new Map(data.nodes.map((n) => {
    if (n.kind === 'overlay') return [n.id, { x: PAD, y: PAD + (n.row - minRow) * ROW_H, w: W - PAD * 2, h: NODE_H - 14 }];
    if (n.kind === 'lane') return [n.id, { x: PAD, y: PAD + (n.row - minRow) * ROW_H, w: NODE_W * 0.55, h: NODE_H }];
    return [n.id, { x: PAD + n.col * COL_W, y: PAD + (n.row - minRow) * ROW_H, w: NODE_W, h: NODE_H }];
  })), [data, minRow, W, COL_W, NODE_W, ROW_H, NODE_H]);
  const touches = (e: PathwayEdge) => !!sel?.node && (e.from === sel.node || e.to === sel.node);
  const selNode = sel?.node ? data.nodes.find((n) => n.id === sel.node) : undefined;
  const selEdge = sel?.edge !== undefined ? data.edges[sel.edge] : undefined;
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
  const style = (n: PathwayNode) => {
    switch (n.kind) {
      case 'decide': case 'decision': return { fill: 'var(--bx-accent)', fillOpacity: 0.85, text: 'var(--bx-bg)', rx: 6, dash: undefined as string | undefined, weight: 600 };
      case 'advise': return { fill: 'var(--bx-bg)', fillOpacity: 1, text: 'var(--bx-ink)', rx: 6, dash: undefined, weight: 400 };
      case 'overlay': return { fill: 'var(--bx-bg-2)', fillOpacity: 1, text: 'var(--bx-ink)', rx: 4, dash: '6 3', weight: 600 };
      case 'lane': return { fill: 'transparent', fillOpacity: 0, text: 'var(--bx-ink)', rx: 4, dash: undefined, weight: 700 };
      case 'question': case 'door': return { fill: 'var(--bx-bg-2)', fillOpacity: 1, text: 'var(--bx-ink)', rx: 18, dash: undefined, weight: 600 };
      case 'end': return { fill: 'var(--bx-bg)', fillOpacity: 1, text: 'var(--bx-ink)', rx: 6, dash: undefined, weight: 600 };
      case 'note': return { fill: 'transparent', fillOpacity: 0, text: 'var(--bx-muted)', rx: 4, dash: '3 3', weight: 400 };
      default: return { fill: 'var(--bx-bg)', fillOpacity: 1, text: 'var(--bx-ink)', rx: 6, dash: undefined, weight: 400 };
    }
  };

  return (
    <div>
      {!inline && (
        <div className="flex flex-wrap gap-1 justify-end no-print">
          <button type="button" className="bx-btn" onClick={() => svgRef.current && svgToPng(svgRef.current, `${figure.id}.png`)}>PNG</button>
        </div>
      )}
      <div className="mt-2 overflow-auto rounded-md border border-[color:var(--bx-line)]" style={{ maxHeight: inline ? 560 : 820 }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ width: '100%', minWidth: Math.round(W * 0.6), height: 'auto' }} role="group" aria-label={`${figure.label}: ${figure.title}. ${data.nodes.length} boxes; select one for its card.`} data-testid={`pathway-${figure.id}`} className="block">
          <defs>
            <marker id={`arr-${figure.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" /></marker>
          </defs>
          <g className="text-[color:var(--bx-muted)]">
            {data.edges.map((e, i) => {
              const a = box.get(e.from), b = box.get(e.to);
              if (!a || !b) return null;
              const overlay = nodeById.get(e.from)?.kind === 'overlay';
              const forward = !overlay && b.x > a.x + 1;
              const x1 = overlay ? b.x + b.w / 2 : forward ? a.x + a.w : a.x + a.w / 2;
              const y1 = overlay ? a.y + a.h : forward ? a.y + a.h / 2 : a.y + (b.y > a.y ? a.h : 0);
              const x2 = forward ? b.x : b.x + b.w / 2, y2 = forward ? b.y + b.h / 2 : b.y + (b.y > a.y ? 0 : b.h);
              const mx = (x1 + x2) / 2;
              const d = forward ? `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`;
              const on = touches(e) || sel?.edge === i;
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1} strokeOpacity={sel && !on ? 0.25 : 0.8} strokeDasharray={e.kind === 'overlay' || e.kind === 'note' ? '4 3' : undefined} markerEnd={`url(#arr-${figure.id})`} />
                  <path d={d} fill="none" stroke="transparent" strokeWidth={10} onMouseEnter={() => setSel({ edge: i })} onClick={() => setSel({ edge: i })} style={{ cursor: 'pointer' }}><title>{`${nodeById.get(e.from)?.label ?? e.from} → ${nodeById.get(e.to)?.label ?? e.to}${e.label ? ` (${e.label})` : ''}`}</title></path>
                </g>
              );
            })}
          </g>
          {data.nodes.map((n) => {
            const p = box.get(n.id)!;
            const on = sel?.node === n.id || (selEdge && (selEdge.from === n.id || selEdge.to === n.id));
            const st = style(n);
            const max = Math.floor(p.w / 6.4);
            const ls = lines(n.label, max, n.kind === 'overlay' ? 2 : 4);
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} tabIndex={0} role="button" aria-label={`${n.label} (${n.kind})`} aria-pressed={sel?.node === n.id}
                onMouseEnter={() => setSel({ node: n.id })} onFocus={() => setSel({ node: n.id })} onClick={() => setSel({ node: n.id })}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSel({ node: n.id }); } }}
                style={{ cursor: 'pointer', outline: 'none' }} data-testid={`node-${n.id}`} data-kind={n.kind}>
                <rect width={p.w} height={p.h} rx={st.rx} fill={st.fill} fillOpacity={st.fillOpacity} stroke={n.kind === 'lane' ? 'transparent' : 'var(--bx-ink)'} strokeOpacity={0.55} strokeWidth={on ? 3 : 1.2} strokeDasharray={st.dash} />
                <text x={8} y={p.h / 2 - (ls.length - 1) * 6.5 + 4} fontSize={11} fill={st.text} fontWeight={st.weight}>
                  {ls.map((l, i) => <tspan key={i} x={8} dy={i === 0 ? 0 : 13}>{l}</tspan>)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 bx-card p-3 text-sm min-h-[5.5rem]" aria-live="polite" data-testid="pathway-card">
        {!sel && <p className="bx-muted">Hover, focus or select a box or an arrow for its full label, its references and its glossary term.</p>}
        {selNode && (
          <div>
            <p className="font-semibold">{selNode.label} <span className="bx-chip border border-[color:var(--bx-line)] bx-muted ml-1">{selNode.kind}</span></p>
            {selNode.term && getTerm(selNode.term) && <p className="mt-1 text-sm">Term: <Term id={selNode.term}>{getTerm(selNode.term)!.term}</Term> · <Link className="underline" to={`/glossary#${selNode.term}`}>full entry</Link></p>}
            {selNode.refs.length > 0 ? <div className="mt-1"><CiteList ns={selNode.refs} /></div> : <p className="mt-1 text-xs bx-muted">This box carries no reference of its own.</p>}
          </div>
        )}
        {selEdge && (
          <div>
            <p className="font-semibold">{nodeById.get(selEdge.from)?.label} → {nodeById.get(selEdge.to)?.label}</p>
            {selEdge.label && <p className="mt-1">{selEdge.label}</p>}
            {selEdge.refs.length > 0 && <div className="mt-1"><CiteList ns={selEdge.refs} /></div>}
          </div>
        )}
      </div>
      {data.note && <p className="mt-2 text-xs bx-muted">{data.note}</p>}
    </div>
  );
}
