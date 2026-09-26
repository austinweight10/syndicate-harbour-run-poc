import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import type { GraphLink, GraphNode, GraphView } from "../services/graph/graph-types";
import { BrandGlyph } from "./Brand";
import { Icon } from "./Icon";

/* ── Visual vocabulary (mirrors Syndicate Graph Lab) ─────────────────────── */

type TypeStyle = { label: string; plural: string; fill: string; stroke: string; base: number };

const TYPE: Record<string, TypeStyle> = {
  EventCandidate: { label: "Occasion", plural: "Occasions", fill: "#252522", stroke: "#11110f", base: 19 },
  CatalogueEvent: { label: "Race calendar", plural: "Race calendar", fill: "#a11d2a", stroke: "#7a1520", base: 10 },
  VirtualEvent: { label: "Virtual event", plural: "Virtual events", fill: "#7a2430", stroke: "#5c1a24", base: 10 },
  ActivityChallenge: { label: "Challenge", plural: "Challenges", fill: "#8b3a45", stroke: "#6b2c35", base: 10 },
  SKU: { label: "Product", plural: "Products", fill: "#008060", stroke: "#006b50", base: 10 },
  Order: { label: "Order", plural: "Orders", fill: "#57534e", stroke: "#3a3633", base: 6.5 },
  Geo: { label: "Area", plural: "Areas", fill: "#c4a574", stroke: "#8b6914", base: 11 },
  Weather: { label: "Weather", plural: "Weather", fill: "#3b82c4", stroke: "#2b6cb0", base: 9 },
  Driver: { label: "Driver", plural: "Drivers", fill: "#2b6cb0", stroke: "#1e4e8c", base: 10 },
  Social: { label: "Buzz", plural: "Buzz", fill: "#5b7c99", stroke: "#3d5a73", base: 8.5 },
  Persona: { label: "Shopper", plural: "Shoppers", fill: "#8b7a9e", stroke: "#6b5b7a", base: 11 },
  Recommendation: { label: "Insight", plural: "Insights", fill: "#c47a1a", stroke: "#8f5610", base: 10 },
};
const FALLBACK: TypeStyle = { label: "Node", plural: "Other", fill: "#78716c", stroke: "#57534e", base: 9 };
const typeStyle = (type: string) => TYPE[type] ?? { ...FALLBACK, label: type, plural: type };

const PROV: Record<string, { short: string; label: string; colour: string; dash?: string }> = {
  OBSERVED: { short: "Seen", label: "Seen in shop data", colour: "#059669" },
  AGGREGATE_PROXY: { short: "Proxy", label: "External proxy signal", colour: "#3b82c4" },
  MODEL_HYPOTHESIS: { short: "Estimate", label: "Model estimate", colour: "#d97706", dash: "6 4" },
  MOCK: { short: "Demo", label: "Demo / seeded data", colour: "#a8a29e", dash: "4 3" },
};
const provStyle = (kind: string) => PROV[kind] ?? { short: kind, label: kind, colour: "#a8a29e" };

const RELATION: Record<string, string> = {
  CONTAINS: "Order contains product",
  SHIPPED_TO: "Shipped to area",
  AFFINITY: "Product fit",
  GEO_OVERLAP: "Area overlap",
  TEMPORAL_LIFT: "Timing lift",
  FORECAST_FOR: "Forecast for area",
  VENUE_IN: "Venue in area",
  TRENDING_IN: "Trending in area",
  DRIVEN_BY: "Driven by",
  SUPPORTED_BY: "Supported by",
};
const relationLabel = (relation: string) => RELATION[relation] ?? relation.replaceAll("_", " ").toLowerCase();

const COLUMN_X: Record<string, number> = {
  Order: -560,
  SKU: -320,
  Geo: -80,
  Persona: -80,
  Social: 120,
  CatalogueEvent: 170,
  Weather: 170,
  Driver: 170,
  ActivityChallenge: 170,
  VirtualEvent: 170,
  EventCandidate: 420,
  Recommendation: 620,
};

const ALWAYS_LABEL = new Set(["EventCandidate", "Geo", "CatalogueEvent", "Persona", "Recommendation"]);
const OCCASION_TYPES = new Set(["EventCandidate", "CatalogueEvent", "VirtualEvent", "ActivityChallenge", "Geo", "Weather", "Driver"]);

type Preset = "readable" | "path" | "occasions" | "full" | "custom";

/* ── Simulation ─────────────────────────────────────────────────────────── */

type SimNode = { id: string; x: number; y: number; vx: number; vy: number; fx: number | null; fy: number | null; r: number };
type View = { x: number; y: number; k: number };

const ALPHA_MIN = 0.004;
const ALPHA_DECAY = 0.028;
const VELOCITY_DECAY = 0.42;

function seedPositions(nodes: GraphNode[], radius: Map<string, number>): Map<string, SimNode> {
  const map = new Map<string, SimNode>();
  const golden = Math.PI * (3 - Math.sqrt(5));
  nodes.forEach((node, i) => {
    const r = 10 * Math.sqrt(0.5 + i);
    const a = i * golden;
    map.set(node.id, { id: node.id, x: r * Math.cos(a), y: r * Math.sin(a), vx: 0, vy: 0, fx: null, fy: null, r: radius.get(node.id) ?? 9 });
  });
  return map;
}

function tick(
  sim: Map<string, SimNode>,
  ids: string[],
  edges: GraphLink[],
  alpha: number,
  columns: boolean,
  types: Map<string, string>,
) {
  const nodes = ids.map((id) => sim.get(id)!).filter(Boolean);
  const count = new Map<string, number>();
  for (const edge of edges) {
    count.set(edge.from, (count.get(edge.from) ?? 0) + 1);
    count.set(edge.to, (count.get(edge.to) ?? 0) + 1);
  }
  // Links (d3-style spring with degree-weighted bias)
  for (const edge of edges) {
    const s = sim.get(edge.from);
    const t = sim.get(edge.to);
    if (!s || !t) continue;
    let dx = t.x + t.vx - s.x - s.vx || 1e-3;
    let dy = t.y + t.vy - s.y - s.vy || 1e-3;
    const cs = count.get(edge.from) ?? 1;
    const ct = count.get(edge.to) ?? 1;
    const dist = Math.hypot(dx, dy);
    const target = 62 + (s.r + t.r) * 1.6;
    const strength = 0.9 / Math.min(cs, ct);
    const l = ((dist - target) / dist) * alpha * strength;
    dx *= l;
    dy *= l;
    const bias = cs / (cs + ct);
    t.vx -= dx * bias;
    t.vy -= dy * bias;
    s.vx += dx * (1 - bias);
    s.vy += dy * (1 - bias);
  }
  // Charge + collision
  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1e-4) {
        dx = (Math.random() - 0.5) * 1e-2;
        dy = (Math.random() - 0.5) * 1e-2;
        d2 = dx * dx + dy * dy;
      }
      if (d2 < 360000) {
        const wa = (-(150 + b.r * 14) * alpha) / d2;
        const wb = (-(150 + a.r * 14) * alpha) / d2;
        a.vx += dx * wa;
        a.vy += dy * wa;
        b.vx -= dx * wb;
        b.vy -= dy * wb;
      }
      const min = a.r + b.r + 12;
      if (d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5;
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
      }
    }
  }
  // Gravity / columns
  for (const n of nodes) {
    if (columns) {
      const tx = COLUMN_X[types.get(n.id) ?? ""] ?? 170;
      n.vx += (tx - n.x) * 0.3 * alpha;
      n.vy += -n.y * 0.03 * alpha;
    } else {
      n.vx += -n.x * 0.07 * alpha;
      n.vy += -n.y * 0.1 * alpha;
    }
  }
  // Integrate
  for (const n of nodes) {
    if (n.fx != null && n.fy != null) {
      n.x = n.fx;
      n.y = n.fy;
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx *= 1 - VELOCITY_DECAY;
    n.vy *= 1 - VELOCITY_DECAY;
    n.x += n.vx;
    n.y += n.vy;
  }
}

/* ── Component ──────────────────────────────────────────────────────────── */

type Selection = { kind: "node"; id: string } | { kind: "edge"; id: string } | null;

export function GraphCanvas({ graph, onOpenLabels }: { graph: GraphView; onOpenLabels?: () => void }) {
  /* Static indexes */
  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const typeOf = useMemo(() => new Map(graph.nodes.map((n) => [n.id, String(n.type)])), [graph.nodes]);
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of graph.edges) {
      d.set(e.from, (d.get(e.from) ?? 0) + 1);
      d.set(e.to, (d.get(e.to) ?? 0) + 1);
    }
    return d;
  }, [graph.edges]);
  const radius = useMemo(() => {
    const r = new Map<string, number>();
    for (const n of graph.nodes) {
      const s = typeStyle(String(n.type));
      const boost = n.type === "Order" ? 0 : Math.min(7, Math.sqrt(degree.get(n.id) ?? 0) * 1.3);
      r.set(n.id, s.base + boost);
    }
    return r;
  }, [graph.nodes, degree]);
  const highlight = useMemo(() => new Set(graph.highlightIds), [graph.highlightIds]);
  const anchorLabel = useMemo(
    () => {
      const label = graph.nodes.find((n) => n.type === "EventCandidate" && highlight.has(n.id))?.label;
      return label ? label.split(" — ").pop()! : "Top occasion";
    },
    [graph.nodes, highlight],
  );

  const typeCounts = useMemo(() => countBy(graph.nodes.map((n) => String(n.type))), [graph.nodes]);
  const relCounts = useMemo(() => countBy(graph.edges.map((e) => e.relation)), [graph.edges]);
  const provCounts = useMemo(() => countBy(graph.edges.map((e) => e.provenance)), [graph.edges]);

  /* Filter state */
  const [preset, setPreset] = useState<Preset>("readable");
  const [typeOn, setTypeOn] = useState<Record<string, boolean>>(() => presetTypes("readable", typeCounts));
  const [relOn, setRelOn] = useState<Record<string, boolean>>({});
  const [provOn, setProvOn] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [physics, setPhysics] = useState(true);
  const [columns, setColumns] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [selection, setSelection] = useState<Selection>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [labelZoom, setLabelZoom] = useState(false);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [showIsolated, setShowIsolated] = useState(false);

  function applyPreset(next: Preset) {
    setPreset(next);
    setTypeOn(presetTypes(next, typeCounts));
    setRelOn({});
    setProvOn({});
    setFocusId(null);
  }

  /* Visible subgraph */
  const needle = query.trim().toLowerCase();
  const { visibleNodes, visibleEdges, matches, isolated } = useMemo(() => {
    let nodes = graph.nodes.filter((n) => typeOn[String(n.type)] !== false);
    if (preset === "path" && highlight.size > 0) nodes = nodes.filter((n) => highlight.has(n.id));
    let ids = new Set(nodes.map((n) => n.id));
    let edges = graph.edges.filter(
      (e) => ids.has(e.from) && ids.has(e.to) && relOn[e.relation] !== false && provOn[e.provenance] !== false,
    );
    const matches = new Set<string>();
    if (needle) {
      for (const n of nodes) if (`${n.label} ${n.ref} ${n.id}`.toLowerCase().includes(needle)) matches.add(n.id);
      const keep = new Set(matches);
      for (const e of edges) {
        if (matches.has(e.from)) keep.add(e.to);
        if (matches.has(e.to)) keep.add(e.from);
      }
      ids = keep;
    }
    if (focusId && ids.has(focusId)) {
      const keep = new Set([focusId]);
      for (const e of edges) {
        if (e.from === focusId) keep.add(e.to);
        if (e.to === focusId) keep.add(e.from);
      }
      ids = new Set([...ids].filter((id) => keep.has(id)));
    }
    nodes = nodes.filter((n) => ids.has(n.id));
    edges = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
    let isolated = 0;
    if (!showIsolated) {
      const linked = new Set(edges.flatMap((e) => [e.from, e.to]));
      const before = nodes.length;
      nodes = nodes.filter((n) => linked.has(n.id) || matches.has(n.id) || n.id === focusId);
      isolated = before - nodes.length;
    }
    return { visibleNodes: nodes, visibleEdges: edges, matches, isolated };
  }, [graph.nodes, graph.edges, typeOn, relOn, provOn, preset, highlight, needle, focusId, showIsolated]);

  /* Hot set: hovered or selected node plus neighbours */
  const hot = useMemo(() => {
    const centre = hoverId ?? (selection?.kind === "node" ? selection.id : null);
    if (selection?.kind === "edge" && !hoverId) {
      const edge = graph.edges.find((e) => e.id === selection.id);
      return edge ? { nodes: new Set([edge.from, edge.to]), edges: new Set([edge.id]) } : null;
    }
    if (!centre) return null;
    const nodes = new Set([centre]);
    const edges = new Set<string>();
    for (const e of visibleEdges) {
      if (e.from === centre || e.to === centre) {
        nodes.add(e.from);
        nodes.add(e.to);
        edges.add(e.id);
      }
    }
    return { nodes, edges };
  }, [hoverId, selection, visibleEdges, graph.edges]);

  /* Simulation refs */
  const [seeded] = useState(() => seedPositions(graph.nodes, radius));
  const sim = useRef<Map<string, SimNode>>(seeded);
  const alpha = useRef(1);
  const alphaTarget = useRef(0);
  const view = useRef<View>({ x: 0, y: 0, k: 0.9 });
  const size = useRef({ w: 900, h: 600 });
  const pendingFit = useRef(true);
  const settleFit = useRef(false);
  const userMoved = useRef(false);
  const viewAnim = useRef<{ from: View; to: View; start: number; dur: number } | null>(null);
  const physicsRef = useRef(physics);
  physicsRef.current = physics;
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const visibleRef = useRef({ ids: visibleNodes.map((n) => n.id), edges: visibleEdges });
  visibleRef.current = { ids: visibleNodes.map((n) => n.id), edges: visibleEdges };
  const hoverRef = useRef(hoverId);
  hoverRef.current = hoverId;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const worldRef = useRef<SVGGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const nodeEls = useRef(new Map<string, SVGGElement>());
  const edgeEls = useRef(new Map<string, SVGLineElement>());
  const edgeHitEls = useRef(new Map<string, SVGLineElement>());
  const pointer = useRef<
    | { mode: "node"; id: string; dx: number; dy: number; moved: boolean; startX: number; startY: number }
    | { mode: "pan"; startX: number; startY: number; vx: number; vy: number; moved: boolean }
    | null
  >(null);

  const reheat = useCallback((to = 0.7) => {
    alpha.current = Math.max(alpha.current, to);
  }, []);

  /* Paint helpers (imperative, per frame) */
  const paintView = useCallback(() => {
    const { w, h } = size.current;
    const v = view.current;
    worldRef.current?.setAttribute("transform", `translate(${w / 2 + v.x} ${h / 2 + v.y}) scale(${v.k})`);
    const zoomed = v.k >= 1.25;
    setLabelZoom((prev) => (prev === zoomed ? prev : zoomed));
  }, []);

  const paintNode = useCallback((id: string) => {
    const el = nodeEls.current.get(id);
    const n = sim.current.get(id);
    if (el && n) el.setAttribute("transform", `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`);
  }, []);

  const paintEdge = useCallback((edge: GraphLink) => {
    const s = sim.current.get(edge.from);
    const t = sim.current.get(edge.to);
    if (!s || !t) return;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    const x1 = s.x + (dx / d) * s.r;
    const y1 = s.y + (dy / d) * s.r;
    const x2 = t.x - (dx / d) * (t.r + 2);
    const y2 = t.y - (dy / d) * (t.r + 2);
    for (const el of [edgeEls.current.get(edge.id), edgeHitEls.current.get(edge.id)]) {
      if (!el) continue;
      el.setAttribute("x1", x1.toFixed(1));
      el.setAttribute("y1", y1.toFixed(1));
      el.setAttribute("x2", x2.toFixed(1));
      el.setAttribute("y2", y2.toFixed(1));
    }
  }, []);

  const paintTooltip = useCallback(() => {
    const tip = tooltipRef.current;
    const id = hoverRef.current;
    if (!tip) return;
    const n = id ? sim.current.get(id) : null;
    if (!n) {
      tip.style.opacity = "0";
      return;
    }
    const { w, h } = size.current;
    const v = view.current;
    const sx = w / 2 + v.x + n.x * v.k;
    const sy = h / 2 + v.y + (n.y - n.r) * v.k;
    tip.style.opacity = "1";
    tip.style.transform = `translate(${sx.toFixed(0)}px, ${(sy - 10).toFixed(0)}px) translate(-50%, -100%)`;
  }, []);

  const paintAll = useCallback(() => {
    for (const id of visibleRef.current.ids) paintNode(id);
    for (const e of visibleRef.current.edges) paintEdge(e);
    paintTooltip();
  }, [paintNode, paintEdge, paintTooltip]);

  const fitTarget = useCallback((ids?: string[]): View => {
    const list = (ids ?? visibleRef.current.ids).map((id) => sim.current.get(id)).filter(Boolean) as SimNode[];
    const { w, h } = size.current;
    if (list.length === 0) return { x: 0, y: 0, k: 1 };
    const minX = Math.min(...list.map((n) => n.x - n.r)) - 40;
    const maxX = Math.max(...list.map((n) => n.x + n.r)) + 90;
    const minY = Math.min(...list.map((n) => n.y - n.r)) - 30;
    const maxY = Math.max(...list.map((n) => n.y + n.r)) + 40;
    const top = 56;
    const k = Math.min(2.4, Math.max(0.25, Math.min(w / (maxX - minX), (h - top) / (maxY - minY))));
    return { x: -((minX + maxX) / 2) * k, y: top / 2 - ((minY + maxY) / 2) * k, k };
  }, []);

  const animateView = useCallback((to: View, dur = 650) => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      view.current = to;
      paintView();
      paintTooltip();
      return;
    }
    viewAnim.current = { from: { ...view.current }, to, start: performance.now(), dur };
  }, [paintView, paintTooltip]);

  const fit = useCallback(() => animateView(fitTarget()), [animateView, fitTarget]);

  /* Frame loop */
  useEffect(() => {
    let frame = 0;
    const loop = (now: number) => {
      const anim = viewAnim.current;
      if (anim) {
        const t = Math.min(1, (now - anim.start) / anim.dur);
        const e = 1 - Math.pow(1 - t, 3);
        view.current = {
          x: anim.from.x + (anim.to.x - anim.from.x) * e,
          y: anim.from.y + (anim.to.y - anim.from.y) * e,
          k: anim.from.k + (anim.to.k - anim.from.k) * e,
        };
        paintView();
        paintTooltip();
        if (t >= 1) viewAnim.current = null;
      }
      const dragging = pointer.current?.mode === "node";
      const running = physicsRef.current && (alpha.current > ALPHA_MIN || alphaTarget.current > 0);
      if (running) {
        alpha.current += (alphaTarget.current - alpha.current) * ALPHA_DECAY;
        const { ids, edges } = visibleRef.current;
        tick(sim.current, ids, edges, alpha.current, columnsRef.current, typeOf);
        paintAll();
        if (pendingFit.current && alpha.current < 0.12 && !dragging) {
          pendingFit.current = false;
          settleFit.current = true;
          animateView(fitTarget(), 900);
        } else if (settleFit.current && alpha.current < 0.02 && !viewAnim.current) {
          settleFit.current = false;
          if (!userMoved.current) animateView(fitTarget(), 700);
        }
      } else if (pendingFit.current) {
        pendingFit.current = false;
        animateView(fitTarget(), 500);
      }
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [typeOf, paintAll, paintView, paintTooltip, animateView, fitTarget]);

  /* Re-layout when the visible set or layout mode changes */
  const visibleKey = visibleNodes.map((n) => n.id).join("|") + `#${columns}`;
  useEffect(() => {
    // Nodes that just appeared start next to a visible neighbour rather than at the origin.
    const shown = new Set(visibleRef.current.ids);
    for (const id of shown) {
      const n = sim.current.get(id);
      if (!n) continue;
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) {
        n.x = 0;
        n.y = 0;
      }
    }
    pendingFit.current = true;
    userMoved.current = false;
    reheat(physicsRef.current ? 0.6 : 0);
    paintAll();
  }, [visibleKey, reheat, paintAll]);

  /* Resize */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let first = true;
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      size.current = { w: rect.width, h: rect.height };
      if (first) {
        first = false;
        if (rect.width < 820) setLegendOpen(false);
      }
      paintView();
      paintTooltip();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [paintView, paintTooltip]);

  /* Wheel zoom around the cursor (non-passive) */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      viewAnim.current = null;
      userMoved.current = true;
      const rect = svg.getBoundingClientRect();
      const { w, h } = size.current;
      const v = view.current;
      const px = event.clientX - rect.left - w / 2;
      const py = event.clientY - rect.top - h / 2;
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0022));
      const k = Math.min(4, Math.max(0.2, v.k * factor));
      const wx = (px - v.x) / v.k;
      const wy = (py - v.y) / v.k;
      view.current = { k, x: px - wx * k, y: py - wy * k };
      paintView();
      paintTooltip();
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [paintView, paintTooltip]);

  function toWorld(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    const { w, h } = size.current;
    const v = view.current;
    return { x: (clientX - rect.left - w / 2 - v.x) / v.k, y: (clientY - rect.top - h / 2 - v.y) / v.k };
  }

  function zoomBy(factor: number) {
    const v = view.current;
    const k = Math.min(4, Math.max(0.2, v.k * factor));
    animateView({ x: (v.x * k) / v.k, y: (v.y * k) / v.k, k }, 260);
  }

  function centreOn(id: string) {
    const n = sim.current.get(id);
    if (!n) return;
    const k = Math.max(view.current.k, 1.2);
    animateView({ x: -n.x * k, y: -n.y * k, k }, 600);
  }

  function selectNode(id: string, centre = false) {
    setSelection({ kind: "node", id });
    if (centre) centreOn(id);
  }

  function onNodePointerDown(event: React.PointerEvent, id: string) {
    event.stopPropagation();
    if (event.button !== 0) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    const n = sim.current.get(id)!;
    const world = toWorld(event.clientX, event.clientY);
    pointer.current = { mode: "node", id, dx: n.x - world.x, dy: n.y - world.y, moved: false, startX: event.clientX, startY: event.clientY };
  }

  function onPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    viewAnim.current = null;
    pointer.current = { mode: "pan", startX: event.clientX, startY: event.clientY, vx: view.current.x, vy: view.current.y, moved: false };
  }

  function onPointerMove(event: React.PointerEvent) {
    const p = pointer.current;
    if (!p) return;
    const moved = Math.hypot(event.clientX - p.startX, event.clientY - p.startY) > 3;
    if (p.mode === "pan") {
      if (!moved && !p.moved) return;
      p.moved = true;
      userMoved.current = true;
      view.current = { ...view.current, x: p.vx + event.clientX - p.startX, y: p.vy + event.clientY - p.startY };
      paintView();
      paintTooltip();
      return;
    }
    if (!moved && !p.moved) return;
    if (!p.moved) {
      p.moved = true;
      alphaTarget.current = physicsRef.current ? 0.25 : 0;
      reheat(0.25);
    }
    const n = sim.current.get(p.id);
    if (!n) return;
    const world = toWorld(event.clientX, event.clientY);
    n.fx = world.x + p.dx;
    n.fy = world.y + p.dy;
    n.x = n.fx;
    n.y = n.fy;
    if (!physicsRef.current) paintAll();
  }

  function onPointerUp() {
    const p = pointer.current;
    pointer.current = null;
    alphaTarget.current = 0;
    if (!p) return;
    if (p.mode === "pan") {
      if (!p.moved) {
        setSelection(null);
      }
      return;
    }
    if (p.moved) {
      setPinned((prev) => new Set(prev).add(p.id));
      setSelection({ kind: "node", id: p.id });
    } else {
      setSelection((prev) => (prev?.kind === "node" && prev.id === p.id ? prev : { kind: "node", id: p.id }));
    }
  }

  function unpin(id: string) {
    const n = sim.current.get(id);
    if (n) {
      n.fx = null;
      n.fy = null;
    }
    setPinned((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    reheat(0.3);
  }

  function releaseAll() {
    for (const n of sim.current.values()) {
      n.fx = null;
      n.fy = null;
    }
    setPinned(new Set());
    pendingFit.current = true;
    reheat(0.8);
  }

  function exportPng() {
    const svg = svgRef.current;
    if (!svg) return;
    const { w, h } = size.current;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    clone.querySelectorAll("[data-export-skip]").forEach((el) => el.remove());
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "syndicate-evidence.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    };
    img.src = url;
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if ((event.target as HTMLElement).tagName === "INPUT") return;
    if (event.key === "Escape") {
      setSelection(null);
      setFocusId(null);
    } else if (event.key === "f" || event.key === "F") fit();
    else if (event.key === "+" || event.key === "=") zoomBy(1.25);
    else if (event.key === "-") zoomBy(0.8);
  }

  /* Derived presentation */
  const visibleTypes = [...new Set(visibleNodes.map((n) => String(n.type)))];
  const selectedNode = selection?.kind === "node" ? nodeById.get(selection.id) ?? null : null;
  const selectedEdge = selection?.kind === "edge" ? graph.edges.find((e) => e.id === selection.id) ?? null : null;
  const hoverNode = hoverId ? nodeById.get(hoverId) ?? null : null;
  const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const occasionCount = typeCounts.EventCandidate ?? 0;

  return (
    <div className="gl" onKeyDown={onKeyDown}>
      {/* Toolbar */}
      <div className="gl-toolbar">
        <div className="gl-stats">
          <span className="gl-stat">
            <strong>{graph.totals.nodes}</strong> nodes
          </span>
          <span className="gl-stat">
            <strong>{graph.totals.edges}</strong> edges
          </span>
          <span className="gl-stat gl-stat-accent">
            <strong>{occasionCount}</strong> occasions
          </span>
          {graph.capped ? <span className="gl-stat gl-stat-quiet">Strongest links only</span> : null}
        </div>
        <div className="gl-actions">
          <button
            type="button"
            className={physics ? "gl-btn is-on" : "gl-btn"}
            aria-pressed={physics}
            onClick={() => {
              setPhysics((on) => !on);
              if (!physics) reheat(0.5);
            }}
          >
            <Icon name="zap" size={14} /> Physics: {physics ? "on" : "off"}
          </button>
          <button
            type="button"
            className={columns ? "gl-btn is-on" : "gl-btn"}
            aria-pressed={columns}
            onClick={() => setColumns((on) => !on)}
            title="Arrange by type — orders on the left, occasions on the right"
          >
            <Icon name="layers" size={14} /> Columns
          </button>
          <button type="button" className="gl-btn" onClick={exportPng}>
            <Icon name="download" size={14} /> Export PNG
          </button>
          <button type="button" className="gl-btn gl-btn-primary" onClick={fit}>
            <Icon name="fit" size={14} /> Fit
          </button>
        </div>
      </div>

      {/* Filters */}
      <aside className="gl-panel gl-filters" aria-label="Graph filters">
        <h2 className="gl-panel-title">Filters</h2>
        <div className="gl-section">
          <label className="gl-label" htmlFor="gl-search">
            Search
          </label>
          <div className="gl-search">
            <Icon name="search" size={14} />
            <input
              id="gl-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Label or id…"
              autoComplete="off"
            />
          </div>
          {needle ? (
            <p className="gl-hint">
              {matches.size} match{matches.size === 1 ? "" : "es"} · showing neighbours too
            </p>
          ) : null}
        </div>

        <div className="gl-section">
          <p className="gl-label">Presets</p>
          <div className="gl-presets">
            {(
              [
                ["readable", "Default (readable)", "Everything except individual orders"],
                ["path", `${anchorLabel} evidence path`, "The evidence chain behind the top occasion"],
                ["occasions", "Occasions only", "Occasions, calendar, areas and weather"],
                ["full", "Full graph", "Every node, including orders"],
              ] as const
            ).map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                className={preset === id ? "gl-preset is-active" : "gl-preset"}
                aria-pressed={preset === id}
                onClick={() => applyPreset(id)}
                title={hint}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="gl-section">
          <p className="gl-label">Node types</p>
          <ul className="gl-checks">
            {typeEntries.map(([type, n]) => {
              const s = typeStyle(type);
              const on = typeOn[type] !== false;
              return (
                <li key={type}>
                  <label className={on ? "gl-check" : "gl-check is-off"}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setPreset("custom");
                        setTypeOn((cur) => ({ ...cur, [type]: !on }));
                      }}
                    />
                    <span className="gl-dot" style={{ background: s.fill }} />
                    <span className="gl-check-label">{s.plural}</span>
                    <span className="gl-count">{n}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="gl-section">
          <p className="gl-label">Relations</p>
          <ul className="gl-checks">
            {Object.entries(relCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([rel, n]) => {
                const on = relOn[rel] !== false;
                return (
                  <li key={rel}>
                    <label className={on ? "gl-check" : "gl-check is-off"}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          setPreset((p) => (p === "path" ? p : "custom"));
                          setRelOn((cur) => ({ ...cur, [rel]: !on }));
                        }}
                      />
                      <span className="gl-check-label">{relationLabel(rel)}</span>
                      <span className="gl-count">{n}</span>
                    </label>
                  </li>
                );
              })}
          </ul>
        </div>

        <div className="gl-section">
          <p className="gl-label">
            Evidence labels
            {onOpenLabels ? (
              <button type="button" className="gl-help" onClick={onOpenLabels} aria-label="What evidence labels mean">
                <Icon name="info" size={13} />
              </button>
            ) : null}
          </p>
          <ul className="gl-checks">
            {Object.keys(PROV)
              .filter((kind) => provCounts[kind])
              .map((kind) => {
                const s = provStyle(kind);
                const on = provOn[kind] !== false;
                return (
                  <li key={kind}>
                    <label className={on ? "gl-check" : "gl-check is-off"} title={s.label}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          setPreset((p) => (p === "path" ? p : "custom"));
                          setProvOn((cur) => ({ ...cur, [kind]: !on }));
                        }}
                      />
                      <EdgeSwatch colour={s.colour} dashed={Boolean(s.dash)} />
                      <span className="gl-check-label">{s.label}</span>
                      <span className="gl-count">{provCounts[kind]}</span>
                    </label>
                  </li>
                );
              })}
          </ul>
        </div>
      </aside>

      {/* Stage */}
      <section
        className="gl-stage"
        ref={stageRef}
        tabIndex={0}
        aria-label="Evidence graph. Drag to pan, scroll to zoom, F to fit, Escape to clear."
      >
        <svg
          ref={svgRef}
          className="gl-svg"
          role="img"
          aria-label={`Evidence graph showing ${visibleNodes.length} nodes and ${visibleEdges.length} links`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <pattern id="gl-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.1" fill="#d9d3c6" />
            </pattern>
            <radialGradient id="gl-vignette" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#faf7f0" stopOpacity="0" />
              <stop offset="100%" stopColor="#e8e2d5" stopOpacity="0.9" />
            </radialGradient>
            <filter id="gl-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#252522" floodOpacity="0.35" />
            </filter>
            <filter id="gl-lift" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#252522" floodOpacity="0.22" />
            </filter>
            {Object.entries(PROV).map(([kind, s]) => (
              <marker
                key={kind}
                id={`gl-arrow-${kind}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                markerUnits="userSpaceOnUse"
                orient="auto"
              >
                <path d="M0 1.5 9 5 0 8.5z" fill={s.colour} />
              </marker>
            ))}
          </defs>
          <rect width="100%" height="100%" fill="#f5f1e8" />
          <rect width="100%" height="100%" fill="url(#gl-dots)" />
          <rect width="100%" height="100%" fill="url(#gl-vignette)" />
          <g ref={worldRef}>
            <g>
              {visibleEdges.map((edge) => {
                const s = provStyle(edge.provenance);
                const isHot = hot?.edges.has(edge.id);
                const dim = hot && !isHot;
                const selectedEdgeId = selection?.kind === "edge" ? selection.id : null;
                return (
                  <line
                    key={edge.id}
                    ref={(el) => {
                      if (el) {
                        edgeEls.current.set(edge.id, el);
                        paintEdge(edge);
                      } else edgeEls.current.delete(edge.id);
                    }}
                    stroke={s.colour}
                    strokeWidth={(isHot ? 1.6 : 1) * Math.max(1, Math.min(2.6, 0.9 + edge.weight))}
                    strokeDasharray={s.dash}
                    strokeLinecap="round"
                    opacity={dim ? 0.07 : isHot || selectedEdgeId === edge.id ? 0.95 : 0.5}
                    markerEnd={`url(#gl-arrow-${PROV[edge.provenance] ? edge.provenance : "MOCK"})`}
                    className="gl-edge"
                  />
                );
              })}
            </g>
            <g data-export-skip>
              {visibleEdges.map((edge) => (
                <line
                  key={edge.id}
                  ref={(el) => {
                    if (el) {
                      edgeHitEls.current.set(edge.id, el);
                      paintEdge(edge);
                    } else edgeHitEls.current.delete(edge.id);
                  }}
                  stroke="transparent"
                  strokeWidth={10}
                  className="gl-edge-hit"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setSelection({ kind: "edge", id: edge.id });
                  }}
                >
                  <title>{`${relationLabel(edge.relation)} · ${provStyle(edge.provenance).label}`}</title>
                </line>
              ))}
            </g>
            <g>
              {visibleNodes.map((node) => {
                const type = String(node.type);
                const s = typeStyle(type);
                const r = radius.get(node.id) ?? 9;
                const isHot = hot?.nodes.has(node.id);
                const dim = hot && !isHot;
                const isSelected = selection?.kind === "node" && selection.id === node.id;
                const isMatch = matches.has(node.id);
                const showLabel = ALWAYS_LABEL.has(type) || labelZoom || isHot || isMatch || isSelected;
                const occasion = type === "EventCandidate";
                const label = node.label.length > 34 ? `${node.label.slice(0, 33)}…` : node.label;
                return (
                  <g
                    key={node.id}
                    ref={(el) => {
                      if (el) {
                        nodeEls.current.set(node.id, el);
                        paintNode(node.id);
                      } else nodeEls.current.delete(node.id);
                    }}
                    className="gl-node"
                    opacity={dim ? 0.18 : 1}
                    onPointerDown={(event) => onNodePointerDown(event, node.id)}
                    onPointerEnter={() => setHoverId(node.id)}
                    onPointerLeave={() => setHoverId((cur) => (cur === node.id ? null : cur))}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      setFocusId((cur) => (cur === node.id ? null : node.id));
                      setSelection({ kind: "node", id: node.id });
                    }}
                  >
                    {isSelected ? (
                      <circle r={r + 7} fill="none" stroke={s.fill} strokeWidth={2} opacity={0.5} className="gl-pulse" data-export-skip />
                    ) : null}
                    {isMatch ? <circle r={r + 5} fill="none" stroke="#d97706" strokeWidth={2.5} /> : null}
                    <circle
                      r={r}
                      fill={s.fill}
                      stroke={isSelected ? "#ffffff" : s.stroke}
                      strokeWidth={isSelected ? 3 : occasion ? 2.5 : 1.5}
                      filter={occasion ? "url(#gl-glow)" : "url(#gl-lift)"}
                    />
                    {occasion ? <BrandGlyph scale={(r * 0.62) / 100} fill={s.fill} seam="#f5f1e8" /> : null}
                    {pinned.has(node.id) ? <circle cx={r * 0.72} cy={-r * 0.72} r={3} fill="#a11d2a" stroke="#fff" strokeWidth={1.2} /> : null}
                    {showLabel ? (
                      <text
                        y={r + 13}
                        textAnchor="middle"
                        fontSize={occasion ? 12.5 : 10.5}
                        fontWeight={occasion || isSelected ? 750 : 550}
                        fontFamily="Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
                        letterSpacing={occasion ? "-0.01em" : undefined}
                        fill={occasion ? "#252522" : "#4a4843"}
                        stroke="#f5f1e8"
                        strokeWidth={3.5}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                        pointerEvents="none"
                      >
                        {label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Status pill */}
        <div className="gl-status" role="status">
          {focusId && nodeById.get(focusId) ? (
            <>
              <Icon name="focus" size={14} />
              Focused on <strong>{nodeById.get(focusId)!.label}</strong>
              <button type="button" className="gl-status-clear" onClick={() => setFocusId(null)}>
                Clear
              </button>
            </>
          ) : (
            <>
              Showing <strong>{visibleNodes.length}</strong> nodes · <strong>{visibleEdges.length}</strong> edges
            </>
          )}
          {isolated > 0 || showIsolated ? (
            <button type="button" className="gl-status-clear" onClick={() => setShowIsolated((on) => !on)}>
              {showIsolated ? "Hide unlinked" : `+${isolated} unlinked`}
            </button>
          ) : null}
          {pinned.size > 0 ? (
            <button type="button" className="gl-status-clear" onClick={releaseAll}>
              Release {pinned.size} pinned
            </button>
          ) : null}
        </div>

        {/* Tooltip */}
        <div className="gl-tooltip" ref={tooltipRef} aria-hidden="true">
          {hoverNode ? (
            <>
              <span className="gl-dot" style={{ background: typeStyle(String(hoverNode.type)).fill }} />
              <span>
                <strong>{hoverNode.label}</strong>
                <em>
                  {typeStyle(String(hoverNode.type)).label} · {degree.get(hoverNode.id) ?? 0} links
                </em>
              </span>
            </>
          ) : null}
        </div>

        {/* Legend */}
        <div className={legendOpen ? "gl-legend" : "gl-legend is-collapsed"}>
          <button type="button" className="gl-legend-head" onClick={() => setLegendOpen((o) => !o)} aria-expanded={legendOpen}>
            <span>Legend</span>
            <Icon name={legendOpen ? "minus" : "plus"} size={13} />
          </button>
          {legendOpen ? (
            <>
              <div className="gl-legend-grid">
                {visibleTypes.map((type) => (
                  <span key={type}>
                    <span className="gl-dot" style={{ background: typeStyle(type).fill }} />
                    {typeStyle(type).label}
                  </span>
                ))}
              </div>
              <div className="gl-legend-edges">
                {Object.entries(PROV).map(([kind, s]) => (
                  <span key={kind}>
                    <EdgeSwatch colour={s.colour} dashed={Boolean(s.dash)} />
                    {s.short}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Zoom */}
        <div className="gl-zoom" role="group" aria-label="Zoom">
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
            <Icon name="plus" size={15} />
          </button>
          <button type="button" onClick={() => zoomBy(0.8)} aria-label="Zoom out">
            <Icon name="minus" size={15} />
          </button>
          <button type="button" onClick={fit} aria-label="Fit to screen">
            <Icon name="fit" size={15} />
          </button>
        </div>

        {visibleNodes.length === 0 ? (
          <div className="gl-empty">
            <p>Nothing matches these filters.</p>
            <button type="button" className="gl-btn gl-btn-primary" onClick={() => { setQuery(""); applyPreset("readable"); }}>
              Reset filters
            </button>
          </div>
        ) : null}
      </section>

      {/* Inspector */}
      <aside className="gl-panel gl-inspector" aria-label="Inspector" aria-live="polite">
        <h2 className="gl-panel-title">Inspector</h2>
        {selectedNode ? (
          <NodeInspector
            node={selectedNode}
            edges={graph.edges}
            nodeById={nodeById}
            degree={degree.get(selectedNode.id) ?? 0}
            pinned={pinned.has(selectedNode.id)}
            focused={focusId === selectedNode.id}
            onFocus={() => setFocusId((cur) => (cur === selectedNode.id ? null : selectedNode.id))}
            onUnpin={() => unpin(selectedNode.id)}
            onSelect={(id) => selectNode(id, true)}
            onClose={() => setSelection(null)}
          />
        ) : selectedEdge ? (
          <EdgeInspector edge={selectedEdge} nodeById={nodeById} onSelect={(id) => selectNode(id, true)} onClose={() => setSelection(null)} />
        ) : (
          <div className="gl-inspector-empty">
            <p>
              Click a node or link to inspect it. Double-click to focus on its neighbourhood. Drag a node to pin it in
              place.
            </p>
            <ul className="gl-tips">
              <li>
                <kbd>Scroll</kbd> zoom
              </li>
              <li>
                <kbd>Drag</kbd> pan
              </li>
              <li>
                <kbd>F</kbd> fit
              </li>
              <li>
                <kbd>Esc</kbd> clear
              </li>
            </ul>
            <p className="gl-label">Top occasions</p>
            <ul className="gl-neighbours">
              {graph.nodes
                .filter((n) => n.type === "EventCandidate")
                .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
                .slice(0, 6)
                .map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => selectNode(n.id, true)}>
                      <span className="gl-dot" style={{ background: TYPE.EventCandidate.fill }} />
                      <span className="gl-neighbour-label">{n.label}</span>
                      <span className="gl-count">{degree.get(n.id) ?? 0}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ── Inspector panes ────────────────────────────────────────────────────── */

function NodeInspector({
  node,
  edges,
  nodeById,
  degree,
  pinned,
  focused,
  onFocus,
  onUnpin,
  onSelect,
  onClose,
}: {
  node: GraphNode;
  edges: GraphLink[];
  nodeById: Map<string, GraphNode>;
  degree: number;
  pinned: boolean;
  focused: boolean;
  onFocus: () => void;
  onUnpin: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const s = typeStyle(String(node.type));
  const groups = new Map<string, { id: string; dir: "out" | "in" }[]>();
  for (const e of edges) {
    if (e.from !== node.id && e.to !== node.id) continue;
    const other = e.from === node.id ? e.to : e.from;
    const list = groups.get(e.relation) ?? [];
    if (!list.some((row) => row.id === other)) list.push({ id: other, dir: e.from === node.id ? "out" : "in" });
    groups.set(e.relation, list);
  }
  const href = node.type === "EventCandidate" ? `/app/events/${node.ref}` : node.type === "Persona" ? `/app/personas/${node.ref}` : null;
  const prov = node.provenance ? provStyle(node.provenance) : null;
  return (
    <div className="gl-inspect" key={node.id}>
      <div className="gl-inspect-head">
        <span className="gl-type-chip" style={{ background: s.fill }}>
          {s.label}
        </span>
        <button type="button" className="gl-close" onClick={onClose} aria-label="Close inspector">
          <Icon name="x" size={14} />
        </button>
      </div>
      <h3 className="gl-inspect-title">{node.label}</h3>
      <dl className="gl-meta">
        <div>
          <dt>Links</dt>
          <dd>{degree}</dd>
        </div>
        {prov ? (
          <div>
            <dt>Evidence</dt>
            <dd>
              <span className="gl-prov" style={{ color: prov.colour }}>
                <EdgeSwatch colour={prov.colour} dashed={Boolean(prov.dash)} />
                {prov.short}
              </span>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Id</dt>
          <dd className="gl-mono" title={node.ref}>
            {node.ref.length > 18 ? `${node.ref.slice(0, 17)}…` : node.ref}
          </dd>
        </div>
      </dl>
      <div className="gl-inspect-actions">
        {href ? (
          <Link to={href} className="gl-btn gl-btn-primary">
            Open {node.type === "Persona" ? "shopper" : "occasion"} <Icon name="arrowRight" size={13} />
          </Link>
        ) : null}
        <button type="button" className={focused ? "gl-btn is-on" : "gl-btn"} onClick={onFocus}>
          <Icon name="focus" size={13} /> {focused ? "Clear focus" : "Focus"}
        </button>
        {pinned ? (
          <button type="button" className="gl-btn" onClick={onUnpin}>
            Unpin
          </button>
        ) : null}
      </div>
      {[...groups.entries()].map(([relation, list]) => (
        <div key={relation} className="gl-group">
          <p className="gl-label">
            {relationLabel(relation)} <span className="gl-count">{list.length}</span>
          </p>
          <ul className="gl-neighbours">
            {list.slice(0, 12).map(({ id }) => {
              const other = nodeById.get(id);
              if (!other) return null;
              return (
                <li key={id}>
                  <button type="button" onClick={() => onSelect(id)}>
                    <span className="gl-dot" style={{ background: typeStyle(String(other.type)).fill }} />
                    <span className="gl-neighbour-label">{other.label}</span>
                    <Icon name="chevronRight" size={13} />
                  </button>
                </li>
              );
            })}
            {list.length > 12 ? <li className="gl-more">+{list.length - 12} more</li> : null}
          </ul>
        </div>
      ))}
    </div>
  );
}

function EdgeInspector({
  edge,
  nodeById,
  onSelect,
  onClose,
}: {
  edge: GraphLink;
  nodeById: Map<string, GraphNode>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const p = provStyle(edge.provenance);
  const from = nodeById.get(edge.from);
  const to = nodeById.get(edge.to);
  return (
    <div className="gl-inspect" key={edge.id}>
      <div className="gl-inspect-head">
        <span className="gl-type-chip" style={{ background: p.colour }}>
          Link
        </span>
        <button type="button" className="gl-close" onClick={onClose} aria-label="Close inspector">
          <Icon name="x" size={14} />
        </button>
      </div>
      <h3 className="gl-inspect-title">{relationLabel(edge.relation)}</h3>
      <div className="gl-edge-path">
        {[from, to].map((n, i) =>
          n ? (
            <button key={n.id} type="button" onClick={() => onSelect(n.id)} className="gl-edge-end">
              <span className="gl-dot" style={{ background: typeStyle(String(n.type)).fill }} />
              <span>
                <em>{i === 0 ? "From" : "To"} · {typeStyle(String(n.type)).label}</em>
                <strong>{n.label}</strong>
              </span>
            </button>
          ) : null,
        )}
      </div>
      <dl className="gl-meta">
        <div>
          <dt>Evidence</dt>
          <dd>
            <span className="gl-prov" style={{ color: p.colour }}>
              <EdgeSwatch colour={p.colour} dashed={Boolean(p.dash)} />
              {p.label}
            </span>
          </dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>
            <span className="gl-weight">
              <span style={{ width: `${Math.min(100, edge.weight * 100)}%`, background: p.colour }} />
            </span>
            {edge.weight.toFixed(2)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function EdgeSwatch({ colour, dashed }: { colour: string; dashed: boolean }) {
  return (
    <svg width="22" height="8" viewBox="0 0 22 8" className="gl-edge-swatch" aria-hidden="true">
      <line x1="1" y1="4" x2="21" y2="4" stroke={colour} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={dashed ? "4 3" : undefined} />
    </svg>
  );
}

/* ── Utilities ──────────────────────────────────────────────────────────── */

function countBy(list: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of list) out[item] = (out[item] ?? 0) + 1;
  return out;
}

function presetTypes(preset: Preset, counts: Record<string, number>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const type of Object.keys(counts)) {
    if (preset === "readable") out[type] = type !== "Order";
    else if (preset === "occasions") out[type] = OCCASION_TYPES.has(type);
    else out[type] = true;
  }
  return out;
}
