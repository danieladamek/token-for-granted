import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import pathfinderJson from '@/data/pathfinder.json';
import { loadFunders, loadFundersTree, useAsync } from '@/lib/heavy';
import type { Funder, Pathfinder } from '@/types';
import ReaderFigure from '@/components/reader/ReaderFigure';
import { BlockLabel } from '@/components/records/Bits';

const pf = pathfinderJson as unknown as Pathfinder;
type Node = { id: string; name: string; parent_id: string | null; parent_text: string | null };
/** The `unsolicited` labels, as the pack writes them (EXTENSIONS.md v0.7); the meaning of each is the record's own note. */
export const UNSOLICITED = ['accepted', 'letter-of-inquiry', 'open-call-only', 'invitation-only', 'not-stated'];

function Tree({ nodes, parent, depth = 0 }: { nodes: Node[]; parent: string; depth?: number }) {
  const kids = nodes.filter((n) => n.parent_id === parent);
  if (!kids.length) return null;
  return (
    <ul className={depth ? 'ml-4 mt-1 border-l border-[color:var(--bx-line)] pl-3 grid gap-1' : 'grid gap-1'}>
      {kids.map((n) => <li key={n.id}><Link className="underline" to={`/funders/${n.id}`}>{n.name}</Link><Tree nodes={nodes} parent={n.id} depth={depth + 1} /></li>)}
    </ul>
  );
}

/**
 * `/funders` — two parts (KICKOFF §4b): federal and congressionally created funders as a tree by `parent`, then the
 * foundations and other private grantmakers as a table filterable by kind and by how each takes requests, under the
 * printed note that they are an editorial sample. Figures 6 and 7 sit on the foundations part.
 */
export default function Funders() {
  const tree = useAsync(loadFundersTree);
  const funders = useAsync(loadFunders);
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') ?? '';
  const uns = params.get('unsolicited') ?? '';
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const roots = useMemo(() => {
    const groups = new Map<string, Node[]>();
    for (const n of tree ?? []) if (!n.parent_id) { const key = n.parent_text ?? '(no parent recorded)'; if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(n); }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [tree]);
  const foundations = (funders ?? []).filter((f) => f.side === 'foundation');
  const kinds = [...new Set(foundations.map((f) => String(f.foundation_kind ?? 'not recorded')))].sort();
  const shown = foundations.filter((f) => (!kind || String(f.foundation_kind ?? 'not recorded') === kind) && (!uns || f.unsolicited === uns));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Funders</h1>
      <p className="bx-prose mt-2 max-w-3xl">{tree ? tree.length : '…'} federal and congressionally created funders, then {foundations.length || '…'} foundations and other private grantmakers. Each page says how the funder decides, where it posts, whom to talk to and which programmes it runs, each with its status and the date it was read.</p>

      <section className="mt-8" aria-labelledby="fed-h">
        <h2 id="fed-h" className="text-2xl">Federal and congressionally created funders</h2>
        <p className="text-sm bx-muted mt-1">Grouped by the parent each record names, as written; a funder whose parent is another funder in the guide sits under it.</p>
        {!tree ? <p className="bx-muted mt-3" role="status">Loading…</p> : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="funder-tree">
            {roots.map(([parent, list]) => (
              <div key={parent} className="bx-card p-3 text-sm">
                <h3 className="text-base font-semibold">{parent}</h3>
                <ul className="mt-1.5 grid gap-1">{list.map((n) => <li key={n.id}><Link className="underline" to={`/funders/${n.id}`}>{n.name}</Link><Tree nodes={tree} parent={n.id} depth={1} /></li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="foundations" id="foundations">
        <h2 id="foundations-h" className="text-2xl">Foundations and other private grantmakers</h2>
        <p className="bx-card p-3 mt-2 text-sm border-l-4 border-l-[color:var(--bx-line)]" data-testid="foundations-note">{pf.display.foundations_note}</p>
        <p className="text-sm mt-2">Every private foundation the IRS lists is in the <Link className="underline" to="/find?tab=foundations">foundation directory</Link>.</p>
        <div className="bx-card p-3 mt-4 grid gap-2 sm:grid-cols-3 text-sm" role="search" aria-label="Filter foundations">
          <label className="block"><span className="block text-xs bx-muted mb-1">Kind of foundation, as recorded</span><select className="bx-input" value={kind} onChange={(e) => set('kind', e.target.value)} data-testid="filter-kind"><option value="">Any kind</option>{kinds.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
          <label className="block"><span className="block text-xs bx-muted mb-1">How it takes requests</span><select className="bx-input" value={uns} onChange={(e) => set('unsolicited', e.target.value)} data-testid="filter-unsolicited"><option value="">Any</option>{UNSOLICITED.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
          <p className="text-xs bx-muted self-end" role="status">{shown.length} of {foundations.length}</p>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="bx-table" data-testid="foundations-table">
            <thead><tr><th scope="col">Foundation</th><th scope="col">Kind</th><th scope="col">How it takes requests</th><th scope="col">Programmes in the guide</th></tr></thead>
            <tbody>{shown.map((f: Funder) => (
              <tr key={f.id}><td><Link className="underline font-semibold" to={`/funders/${f.id}`}>{f.name}</Link></td><td>{String(f.foundation_kind ?? '—')}</td><td>{f.unsolicited ?? '—'}</td><td className="tabular-nums">{f.programs_all.length}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <BlockLabel>Figures on this part</BlockLabel>
        <ReaderFigure id="foundation-doors" />
        <ReaderFigure id="foundation-indirect-rates" />
      </section>
    </div>
  );
}
