export const GRAPH_PRESET = "race_day_evidence" as const;

export type GraphPreset = typeof GRAPH_PRESET;

/** Chip types on the Admin graph. Stored Prisma types are mapped onto these. */
export type GraphChip =
  | "Order"
  | "SKU"
  | "Geo"
  | "CatalogueEvent"
  | "Driver"
  | "Weather"
  | "Social"
  | "EventCandidate"
  | "Persona";

export type GraphNode = {
  id: string;
  type: GraphChip | string;
  typeLabel: string;
  label: string;
  ref: string;
  provenance?: string;
};

export type GraphLink = {
  id: string;
  from: string;
  to: string;
  fromId: string;
  toId: string;
  relation: string;
  provenance: string;
  weight: number;
};

export type GraphEmptyReason = "no_edges_after_pipeline" | "pipeline_incomplete";

export type GraphView = {
  nodes: GraphNode[];
  edges: GraphLink[];
  highlightIds: string[];
  preset: GraphPreset;
  /** True when the Admin cap dropped nodes or edges. */
  capped: boolean;
  truncated: boolean;
  totals: { nodes: number; edges: number };
  totalNodes: number;
  totalEdges: number;
  shownNodes: number;
  shownEdges: number;
  emptyReason?: GraphEmptyReason;
  /** Set when score_link failed and there is nothing to draw. */
  error: "score_failed" | null;
};

export function emptyGraphView(overrides: Partial<GraphView> = {}): GraphView {
  return {
    nodes: [],
    edges: [],
    highlightIds: [],
    preset: GRAPH_PRESET,
    capped: false,
    truncated: false,
    totals: { nodes: 0, edges: 0 },
    totalNodes: 0,
    totalEdges: 0,
    shownNodes: 0,
    shownEdges: 0,
    error: null,
    ...overrides,
  };
}

export function chipType(stored: string): GraphChip | string {
  if (stored === "Event" || stored === "CatalogueEvent") return "CatalogueEvent";
  if (stored === "WeatherForecast") return "Weather";
  if (stored === "SocialTrend") return "Social";
  if (stored === "Geo" || stored === "GeoBucket") return "Geo";
  return stored;
}
