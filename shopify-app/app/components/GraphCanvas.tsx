import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { GraphChip, GraphLink, GraphNode, GraphView } from "../services/graph/graph-types";

const CHIPS: { id: GraphChip; label: string }[] = [
  { id: "Order", label: "Order" },
  { id: "SKU", label: "SKU" },
  { id: "Geo", label: "Geo" },
  { id: "CatalogueEvent", label: "CatalogueEvent" },
  { id: "Driver", label: "Driver" },
  { id: "Weather", label: "Weather" },
  { id: "Social", label: "Social" },
  { id: "EventCandidate", label: "EventCandidate" },
  { id: "Persona", label: "Persona" },
];

const PROV = [
  { kind: "OBSERVED", short: "Obs", label: "Observed" },
  { kind: "AGGREGATE_PROXY", short: "Agg", label: "Aggregate proxy" },
  { kind: "MODEL_HYPOTHESIS", short: "Hyp", label: "Model hypothesis" },
  { kind: "MOCK", short: "Mock", label: "Mock" },
] as const;

const PROV_COLOUR: Record<string, string> = {
  OBSERVED: "#059669",
  AGGREGATE_PROXY: "#1a2744",
  MODEL_HYPOTHESIS: "#78716c",
  MOCK: "#a8a29e",
};

type Point = { x: number; y: number };

const COLUMN_X: Record<string, number> = {
  Order: -560,
  SKU: -300,
  Geo: -40,
  Persona: -40,
  CatalogueEvent: 240,
  Driver: 240,
  Weather: 240,
  EventCandidate: 560,
  Social: 560,
};

export function GraphCanvas({ graph }: { graph: GraphView }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHIPS.map((chip) => [chip.id, chip.id !== "Social" && chip.id !== "Persona"])),
  );
  const [query, setQuery] = useState("");
  const [physics, setPhysics] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const highlight = new Set(graph.highlightIds);
  const needle = query.trim().toLowerCase();
  const visibleNodes = graph.nodes.filter((node) => visibleNode(node, enabled, needle, highlight));
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = graph.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to));

  const [positions, setPositions] = useState<Record<string, Point>>(() => layoutColumns(visibleNodes));
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const physicsRef = useRef(physics);
  physicsRef.current = physics;
  const edgesRef = useRef(visibleEdges);
  edgesRef.current = visibleEdges;
  const visibleIdsRef = useRef(visibleIds);
  visibleIdsRef.current = visibleIds;
  const anchors = useRef<Record<string, Point>>(layoutColumns(visibleNodes));

  const visibleKey = visibleNodes.map((node) => node.id).join("|");
  const layout = layoutColumns(visibleNodes);
  anchors.current = layout;
  useEffect(() => {
    setPositions(layout);
    setView({ x: 0, y: 0, k: 1 });
  }, [visibleKey]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (physicsRef.current && !drag.current) {
        const current = positionsRef.current;
        const ids = [...visibleIdsRef.current].filter((id) => current[id] && anchors.current[id]);
        const next: Record<string, Point> = {};
        for (const id of ids) next[id] = { ...current[id] };
        for (let i = 0; i < ids.length; i += 1) {
          for (let j = i + 1; j < ids.length; j += 1) {
            const a = next[ids[i]];
            const b = next[ids[j]];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            const dist = Math.hypot(dx, dy) || 0.1;
            const push = Math.min(14, 420 / (dist * dist));
            dx = (dx / dist) * push;
            dy = (dy / dist) * push;
            a.x += dx;
            a.y += dy;
            b.x -= dx;
            b.y -= dy;
          }
        }
        for (const edge of edgesRef.current) {
          const a = next[edge.from];
          const b = next[edge.to];
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.1;
          const pull = (dist - 150) * 0.012;
          a.x += (dx / dist) * pull;
          a.y += (dy / dist) * pull;
          b.x -= (dx / dist) * pull;
          b.y -= (dy / dist) * pull;
        }
        let moved = 0;
        for (const id of ids) {
          const home = anchors.current[id];
          if (!home) continue;
          next[id].x += (home.x - next[id].x) * 0.18;
          next[id].y += (home.y - next[id].y) * 0.18;
          moved = Math.max(moved, Math.hypot(next[id].x - current[id].x, next[id].y - current[id].y));
        }
        if (moved > 0.25) {
          setPositions((prev) => {
            const merged = { ...anchors.current, ...prev };
            for (const id of ids) if (next[id]) merged[id] = next[id];
            return merged;
          });
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toWorld(event: React.PointerEvent) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM()?.inverse();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix);
    return { x: (local.x - view.x) / view.k, y: (local.y - view.y) / view.k };
  }

  function fit() {
    const pts = visibleNodes.map((node) => positions[node.id]).filter(Boolean);
    if (pts.length === 0) {
      setView({ x: 0, y: 0, k: 1 });
      return;
    }
    const xs = pts.map((point) => point.x);
    const ys = pts.map((point) => point.y);
    const minX = Math.min(...xs) - 48;
    const maxX = Math.max(...xs) + 190;
    const minY = Math.min(...ys) - 36;
    const maxY = Math.max(...ys) + 36;
    const k = Math.min(2.2, Math.max(0.45, Math.min(1680 / (maxX - minX), 860 / (maxY - minY))));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({ x: -cx * k, y: -cy * k, k });
  }

  const selectedNode = graph.nodes.find((node) => node.id === selected) ?? null;

  return (
    <div className="graph-page">
      <div className="filter-row" role="toolbar" aria-label="Graph filters">
        {CHIPS.map((chip) => {
          const on = enabled[chip.id] !== false;
          return (
            <button
              key={chip.id}
              type="button"
              className={on ? "filter-pill active" : "filter-pill"}
              aria-pressed={on}
              onClick={() => setEnabled((current) => ({ ...current, [chip.id]: current[chip.id] === false }))}
            >
              {chip.label}
            </button>
          );
        })}
        <label className="graph-search">
          <span className="sr-only">Search nodes</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nodes…"
            aria-label="Search nodes"
          />
        </label>
        <button type="button" className="filter-pill" onClick={fit}>
          Fit
        </button>
        <button
          type="button"
          className={physics ? "filter-pill active" : "filter-pill"}
          aria-pressed={physics}
          onClick={() => setPhysics((on) => !on)}
        >
          Physics <span className="filter-sep">·</span> {physics ? "On" : "Off"}
        </button>
      </div>

      <div className="card graph-panel">
        <svg
          ref={svgRef}
          className="graph-svg"
          viewBox="-860 -460 1720 920"
          role="img"
          aria-label="Race-day evidence path"
          onWheel={(event) => {
            event.preventDefault();
            const next = event.deltaY > 0 ? view.k * 0.92 : view.k * 1.08;
            setView({ ...view, k: Math.min(2.8, Math.max(0.35, next)) });
          }}
          onPointerUp={() => {
            if (drag.current) {
              const id = drag.current.id;
              const point = positionsRef.current[id];
              if (point) anchors.current[id] = point;
            }
            drag.current = null;
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const world = toWorld(event);
            const id = drag.current.id;
            setPositions((current) => ({
              ...current,
              [id]: { x: world.x + drag.current!.dx, y: world.y + drag.current!.dy },
            }));
          }}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {visibleEdges.map((edge) => (
              <EdgeLine key={edge.id} edge={edge} positions={positions} />
            ))}
            {visibleNodes.map((node) => {
              const point = positions[node.id] ?? layout[node.id];
              if (!point) return null;
              return (
                <g
                  key={node.id}
                  transform={`translate(${point.x} ${point.y})`}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    const world = toWorld(event);
                    drag.current = { id: node.id, dx: point.x - world.x, dy: point.y - world.y };
                    setSelected(node.id);
                  }}
                >
                  <NodeMark node={node} selected={selected === node.id} />
                  <text x={20} y={4} className={node.type === "EventCandidate" ? "graph-label graph-label-serif" : "graph-label"}>
                    {node.label.length > 28 ? `${node.label.slice(0, 27)}…` : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        <div className="graph-legend" aria-label="Provenance legend">
          {PROV.map((item) => (
            <span key={item.kind} className={`prov prov-${item.kind.toLowerCase()}`} title={item.label} aria-label={item.label}>
              {item.short}
            </span>
          ))}
          <span className="muted">Race PROXY dashed · weather Driver solid navy · EventCandidate kit-red</span>
        </div>
        {selectedNode ? (
          <div className="graph-detail">
            <strong>{selectedNode.label}</strong>
            <span className="muted">
              {" "}
              · {selectedNode.type}
              {selectedNode.provenance ? ` · ${provenanceLabel(selectedNode.provenance)}` : ""}
            </span>
            {detailHref(selectedNode) ? (
              <>
                {" "}
                · <Link to={detailHref(selectedNode)!}>{detailLabel(selectedNode)}</Link>
              </>
            ) : null}
          </div>
        ) : (
          <p className="graph-detail muted">Select a node to read its label. Drag freezes that node where you leave it.</p>
        )}
      </div>
    </div>
  );
}

function visibleNode(
  node: GraphNode,
  enabled: Record<string, boolean>,
  needle: string,
  highlight: Set<string>,
): boolean {
  if (enabled[node.type] === false) return false;
  if (needle) {
    const haystack = `${node.label} ${node.id} ${node.ref}`.toLowerCase();
    return haystack.includes(needle);
  }
  return highlight.size === 0 || highlight.has(node.id);
}

function layoutColumns(nodes: GraphNode[]): Record<string, Point> {
  const buckets = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const x = COLUMN_X[node.type] ?? 240;
    const list = buckets.get(x) ?? [];
    list.push(node);
    buckets.set(x, list);
  }
  const positions: Record<string, Point> = {};
  for (const [x, list] of buckets) {
    list.sort((a, b) => a.label.localeCompare(b.label, "en-GB"));
    const gap = 52;
    const top = -((list.length - 1) * gap) / 2;
    list.forEach((node, index) => {
      positions[node.id] = { x, y: top + index * gap };
    });
  }
  return positions;
}

function NodeMark({ node, selected }: { node: GraphNode; selected: boolean }) {
  const stroke = selected ? "#a11d2a" : strokeFor(node.type);
  const width = selected ? 2.5 : 2;
  if (node.type === "CatalogueEvent") {
    return <rect x={-16} y={-12} width={32} height={24} rx={6} fill="#ffffff" stroke={stroke} strokeWidth={width} strokeDasharray="4 3" />;
  }
  if (node.type === "EventCandidate") {
    return <rect x={-18} y={-14} width={36} height={28} rx={8} fill="#fff7f7" stroke="#a11d2a" strokeWidth={selected ? 3 : 2.5} />;
  }
  if (node.type === "Driver" || node.type === "Weather") {
    return <rect x={-16} y={-12} width={32} height={24} rx={6} fill="#ffffff" stroke={stroke} strokeWidth={width} />;
  }
  return <circle r={node.type === "Order" ? 12 : 11} fill="#ffffff" stroke={stroke} strokeWidth={width} />;
}

function strokeFor(type: string): string {
  if (type === "Order") return "#008060";
  if (type === "EventCandidate") return "#a11d2a";
  if (type === "CatalogueEvent" || type === "Social" || type === "Persona") return "#78716c";
  return "#1a2744";
}

function provenanceLabel(kind: string): string {
  return PROV.find((item) => item.kind === kind)?.label ?? kind;
}

function detailHref(node: GraphNode): string | null {
  if (node.type === "EventCandidate") return `/app/events/${node.ref}`;
  if (node.type === "Persona") return `/app/personas/${node.ref}`;
  return null;
}

function detailLabel(node: GraphNode): string {
  return node.type === "Persona" ? "Open persona" : "Open event";
}

function EdgeLine({ edge, positions }: { edge: GraphLink; positions: Record<string, Point> }) {
  const a = positions[edge.from];
  const b = positions[edge.to];
  if (!a || !b) return null;
  const colour = PROV_COLOUR[edge.provenance] ?? "#a8a29e";
  const dashed = edge.provenance === "MOCK" || edge.provenance === "MODEL_HYPOTHESIS" || edge.relation === "VENUE_IN";
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={colour}
      strokeWidth={Math.max(1.25, Math.min(2.75, edge.weight))}
      strokeDasharray={dashed ? "5 4" : undefined}
    >
      <title>{`${edge.relation} · ${provenanceLabel(edge.provenance)}`}</title>
    </line>
  );
}
