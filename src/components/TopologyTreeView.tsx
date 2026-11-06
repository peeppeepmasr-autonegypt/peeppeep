/**
 * TopologyTreeView — pure server component.
 * Renders the business hierarchy tree using native <details>/<summary>
 * HTML elements for zero-JS collapse/expand behaviour.
 */

interface TreeNode {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string | null;
  type_id: string;
  custom_domain: string | null;
  edge_count: number;
  children: TreeNode[];
}

interface Props {
  roots: TreeNode[];
  totalNodes: number;
  totalEdges: number;
}

// ── Colour maps ───────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  vehicle_brand:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  vehicle_model:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  vehicle_trim:   'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  showroom:       'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  main_agency:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  car_listing:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  distributor:    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};
const TYPE_BADGE_DEFAULT = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';

function typeBadge(typeId: string): string {
  return TYPE_BADGE[typeId] ?? TYPE_BADGE_DEFAULT;
}

// ── Recursive node renderer ───────────────────────────────────────────────────

function NodeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const label = node.name_ar || node.name;

  const rowContent = (
    <div
      className="flex flex-wrap items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm"
      style={{ paddingLeft: `${depth * 20 + 8}px` }}
    >
      {/* Type badge */}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${typeBadge(node.type_id)}`}>
        {node.type_id}
      </span>

      {/* Name */}
      <span className="font-semibold">{label}</span>

      {/* Slug */}
      {node.slug && (
        <span className="text-[11px] opacity-50 font-mono">{node.slug}</span>
      )}

      {/* Custom domain */}
      {node.custom_domain && (
        <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
          🌐 {node.custom_domain}
        </span>
      )}

      {/* Edge count badge */}
      {node.edge_count > 0 && (
        <span className="text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
          🔗 {node.edge_count}
        </span>
      )}
    </div>
  );

  if (node.children.length === 0) {
    return <div>{rowContent}</div>;
  }

  return (
    <details open className="group">
      <summary className="list-none cursor-pointer select-none">
        <div className="flex items-center gap-1">
          <span className="text-[10px] opacity-40 group-open:rotate-90 inline-block transition-transform shrink-0 ml-1" style={{ paddingLeft: `${depth * 20}px` }}>
            ▶
          </span>
          <div className="flex-1">{rowContent}</div>
        </div>
      </summary>
      <div className="border-l border-black/10 dark:border-white/10 ml-3">
        {node.children.map((child) => (
          <NodeRow key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    </details>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TopologyTreeView({ roots, totalNodes, totalEdges }: Props) {
  return (
    <div className="space-y-4">
      {/* Summary line */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">
          🏢 {totalNodes} nodes
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-semibold">
          🔗 {totalEdges} graph edges
        </span>
      </div>

      {/* Tree */}
      {roots.length === 0 ? (
        <div className="text-sm opacity-50 text-center py-10">No active businesses found.</div>
      ) : (
        <div className="border border-black/10 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm divide-y divide-black/5 dark:divide-white/5 p-2">
          {roots.map((root) => (
            <NodeRow key={root.id} node={root} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
