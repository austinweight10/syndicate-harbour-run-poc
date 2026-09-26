/* Syndicate Graph Lab — interactive occasion graph explorer */
(function () {
  "use strict";

  const COLOURS = {
    EventCandidate: { bg: "#1a2744", border: "#0f1829", font: "#fafaf9" },
    Event: { bg: "#a11d2a", border: "#7a1520", font: "#fafaf9" },
    VirtualEvent: { bg: "#7a2430", border: "#5c1a24", font: "#fafaf9" },
    ActivityChallenge: { bg: "#8b3a45", border: "#6b2c35", font: "#fafaf9" },
    Order: { bg: "#57534e", border: "#44403c", font: "#fafaf9" },
    SKU: { bg: "#008060", border: "#006b50", font: "#fafaf9" },
    Product: { bg: "#0a9b72", border: "#008060", font: "#fafaf9" },
    Geo: { bg: "#c4a574", border: "#8b6914", font: "#292524" },
    Persona: { bg: "#8b7a9e", border: "#6b5b7a", font: "#fafaf9" },
    SocialTrend: { bg: "#5b7c99", border: "#3d5a73", font: "#fafaf9" },
    HashtagWatch: { bg: "#7a94a8", border: "#5b7c99", font: "#fafaf9" },
    Driver: { bg: "#2b6cb0", border: "#1e4e8c", font: "#fafaf9" },
    Weather: { bg: "#3b82c4", border: "#2b6cb0", font: "#fafaf9" },
    Collection: { bg: "#a8a29e", border: "#78716c", font: "#292524" },
    Shop: { bg: "#d6d3d1", border: "#a8a29e", font: "#292524" },
  };

  const PROV_EDGE = {
    OBSERVED: { color: "#059669", dashes: false },
    AGGREGATE_PROXY: { color: "#3b82c4", dashes: false },
    MODEL_HYPOTHESIS: { color: "#d97706", dashes: [6, 4] },
    MOCK: { color: "#a8a29e", dashes: [4, 3] },
  };

  const DEFAULT_OFF_TYPES = new Set(["Order"]);
  const DEFAULT_ON_TYPES = new Set([
    "EventCandidate", "Event", "VirtualEvent", "ActivityChallenge",
    "Persona", "Geo", "SKU", "SocialTrend", "HashtagWatch",
    "Driver", "Collection", "Shop", "Weather", "Product",
  ]);

  const MATCHDAY_RELS = new Set([
    "SHIPPED_TO", "VENUE_IN", "TEMPORAL_LIFT", "GEO_OVERLAP",
    "AFFINITY", "AMPLIFIES", "PERSONA_OF", "DRIVEN_BY",
  ]);

  /** @type {any} */
  let DATA = null;
  /** @type {any} */
  let network = null;
  /** @type {any} */
  let nodesDS = null;
  /** @type {any} */
  let edgesDS = null;
  let physicsOn = true;
  let activePreset = "default";
  let focusNeighbourhood = null; // Set of node ids when highlighting
  let eventById = new Map();
  let nodeById = new Map();
  let usingFallback = false;

  const $ = (id) => document.getElementById(id);

  async function loadData() {
    const paths = ["graph-viz.json", "../data/graph-viz.json", "/data/graph-viz.json"];
    let lastErr;
    for (const p of paths) {
      try {
        const res = await fetch(p);
        if (!res.ok) throw new Error(`${p} → ${res.status}`);
        return await res.json();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Could not load graph-viz.json");
  }

  function nodeColour(type) {
    return COLOURS[type] || { bg: "#78716c", border: "#57534e", font: "#fafaf9" };
  }

  function confidenceFor(nodeId) {
    return eventById.get(nodeId)?.confidence || null;
  }

  function nodeSize(n) {
    if (n.type === "EventCandidate") {
      const c = confidenceFor(n.id);
      const v = c?.value ?? 0.4;
      return 18 + Math.round(v * 22);
    }
    if (n.type === "Order") return 8;
    if (n.type === "SKU" || n.type === "Product") return 12;
    if (n.type === "Geo" || n.type === "Persona") return 16;
    if (n.type === "Shop") return 18;
    if (n.type === "Event" || n.type === "VirtualEvent") return 15;
    return 11;
  }

  function edgeWidth(w) {
    return Math.max(0.8, Math.min(5, 0.6 + (Number(w) || 1) * 2.2));
  }

  function buildVisNodes(filteredIds) {
    return DATA.nodes
      .filter((n) => filteredIds.has(n.id))
      .map((n) => {
        const c = nodeColour(n.type);
        const conf = confidenceFor(n.id);
        const dimmed = focusNeighbourhood && !focusNeighbourhood.has(n.id);
        return {
          id: n.id,
          label: truncate(n.label, 28),
          title: `${n.type}\n${n.label}`,
          group: n.type,
          shape: n.type === "EventCandidate" ? "dot" : n.type === "Order" ? "dot" : "dot",
          size: nodeSize(n),
          color: {
            background: c.bg,
            border: c.border,
            highlight: { background: c.bg, border: "#fafaf9" },
            hover: { background: c.bg, border: "#fafaf9" },
          },
          font: {
            color: dimmed ? "rgba(41,37,36,0.25)" : c.font,
            size: n.type === "EventCandidate" ? 13 : 11,
            face: "system-ui, sans-serif",
          },
          borderWidth: n.type === "EventCandidate" ? 3 : 1.5,
          opacity: dimmed ? 0.15 : 1,
          _type: n.type,
          _label: n.label,
          _conf: conf?.value,
        };
      });
  }

  function buildVisEdges(filteredNodeIds, allowedRels, allowedProv) {
    return DATA.edges
      .filter(
        (e) =>
          filteredNodeIds.has(e.source) &&
          filteredNodeIds.has(e.target) &&
          allowedRels.has(e.relation) &&
          allowedProv.has(e.provenance)
      )
      .map((e) => {
        const style = PROV_EDGE[e.provenance] || PROV_EDGE.MOCK;
        const dimmed =
          focusNeighbourhood &&
          (!focusNeighbourhood.has(e.source) || !focusNeighbourhood.has(e.target));
        return {
          id: e.id,
          from: e.source,
          to: e.target,
          label: "",
          title: `${e.relation} · ${e.provenance} · w=${Number(e.weight).toFixed(2)}`,
          width: edgeWidth(e.weight),
          color: {
            color: dimmed ? "rgba(168,162,158,0.2)" : style.color,
            highlight: style.color,
            hover: style.color,
            opacity: dimmed ? 0.15 : 0.85,
          },
          dashes: style.dashes || false,
          arrows: { to: { enabled: true, scaleFactor: 0.45 } },
          smooth: { type: "continuous", roundness: 0.25 },
          _relation: e.relation,
          _provenance: e.provenance,
          _weight: e.weight,
        };
      });
  }

  function truncate(s, n) {
    if (!s) return "";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  function selectedTypes() {
    const set = new Set();
    document.querySelectorAll("#typeFilters input:checked").forEach((el) => set.add(el.value));
    return set;
  }
  function selectedRels() {
    const set = new Set();
    document.querySelectorAll("#relFilters input:checked").forEach((el) => set.add(el.value));
    return set;
  }
  function selectedProv() {
    const set = new Set();
    document.querySelectorAll("#provFilters input:checked").forEach((el) => set.add(el.value));
    return set;
  }

  function computeFilteredNodeIds() {
    const types = selectedTypes();
    const q = ($("searchInput").value || "").trim().toLowerCase();
    let ids = new Set(
      DATA.nodes.filter((n) => types.has(n.type)).map((n) => n.id)
    );

    if (activePreset === "matchday") {
      ids = computeMatchdayIds(ids);
    } else if (activePreset === "events") {
      const eventish = new Set([
        "EventCandidate", "Event", "VirtualEvent", "ActivityChallenge",
        "Persona", "Geo", "Driver",
      ]);
      ids = new Set(
        DATA.nodes.filter((n) => eventish.has(n.type) && types.has(n.type)).map((n) => n.id)
      );
    }

    if (q) {
      const matched = new Set();
      for (const n of DATA.nodes) {
        if (!ids.has(n.id)) continue;
        if (
          (n.label && n.label.toLowerCase().includes(q)) ||
          n.id.toLowerCase().includes(q) ||
          (n.type && n.type.toLowerCase().includes(q))
        ) {
          matched.add(n.id);
        }
      }
      // include 1-hop of matches so search stays useful
      for (const e of DATA.edges) {
        if (matched.has(e.source) && ids.has(e.target)) matched.add(e.target);
        if (matched.has(e.target) && ids.has(e.source)) matched.add(e.source);
      }
      ids = matched;
    }
    return ids;
  }

  function computeMatchdayIds(baseTypesOk) {
    const path = DATA.meta?.matchday_path || {};
    const seeds = new Set(path.seed_node_ids || []);
    const ecId = path.event_candidate_id;
    if (ecId) seeds.add(ecId);

    // Expand: keep edges whose relation is in MATCHDAY_RELS and touch seeds,
    // plus a few Manchester-shipped orders (cap) and AFFINITY SKUs.
    const keep = new Set(seeds);
    const orderCap = 8;
    let ordersAdded = 0;

    for (const e of DATA.edges) {
      if (!MATCHDAY_RELS.has(e.relation)) continue;
      const touchSeed = seeds.has(e.source) || seeds.has(e.target);
      if (!touchSeed) continue;

      const src = nodeById.get(e.source);
      const tgt = nodeById.get(e.target);

      // Always keep non-order endpoints on matchday path
      for (const [nid, n] of [[e.source, src], [e.target, tgt]]) {
        if (!n) continue;
        if (n.type === "Order") {
          if (ordersAdded < orderCap && (e.relation === "SHIPPED_TO" || seeds.has(nid))) {
            keep.add(nid);
            ordersAdded++;
          }
        } else if (baseTypesOk.has(nid) || seeds.has(nid) || n.type !== "Order") {
          keep.add(nid);
        }
      }
    }

    // Ensure typed filter still applies for non-seed extras? Keep seeds always.
    const types = selectedTypes();
    const filtered = new Set();
    for (const id of keep) {
      const n = nodeById.get(id);
      if (!n) continue;
      if (seeds.has(id) || types.has(n.type)) filtered.add(id);
    }
    return filtered;
  }

  function refreshGraph() {
    const ids = computeFilteredNodeIds();
    const rels = selectedRels();
    const prov = selectedProv();
    const visNodes = buildVisNodes(ids);
    const visEdges = buildVisEdges(ids, rels, prov);

    if (usingFallback) {
      fallbackRender(visNodes, visEdges);
    } else if (network && nodesDS && edgesDS) {
      nodesDS.clear();
      edgesDS.clear();
      nodesDS.add(visNodes);
      edgesDS.add(visEdges);
      network.stabilize(40);
    }

    $("statusBar").innerHTML =
      `Showing <strong>${visNodes.length}</strong> nodes · <strong>${visEdges.length}</strong> edges` +
      (activePreset !== "default" ? ` · preset <strong>${presetLabel(activePreset)}</strong>` : "") +
      (focusNeighbourhood ? ` · neighbourhood focus` : "");
  }

  function presetLabel(p) {
    return ({ default: "Default", matchday: "Match-day path", events: "Events only", full: "Full graph" })[p] || p;
  }

  function applyPreset(name) {
    activePreset = name;
    document.querySelectorAll("[data-preset]").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.preset === name);
    });
    focusNeighbourhood = null;

    const typeInputs = document.querySelectorAll("#typeFilters input");
    const relInputs = document.querySelectorAll("#relFilters input");
    const provInputs = document.querySelectorAll("#provFilters input");

    if (name === "full") {
      typeInputs.forEach((el) => { el.checked = true; });
      relInputs.forEach((el) => { el.checked = true; });
      provInputs.forEach((el) => { el.checked = true; });
    } else if (name === "events") {
      const keep = new Set([
        "EventCandidate", "Event", "VirtualEvent", "ActivityChallenge",
        "Persona", "Geo", "Driver", "Shop",
      ]);
      typeInputs.forEach((el) => { el.checked = keep.has(el.value); });
      relInputs.forEach((el) => {
        el.checked = ["TEMPORAL_LIFT", "GEO_OVERLAP", "VENUE_IN", "PERSONA_OF", "AMPLIFIES", "DRIVEN_BY", "AFFINITY"].includes(el.value);
      });
      provInputs.forEach((el) => { el.checked = true; });
    } else if (name === "matchday") {
      typeInputs.forEach((el) => {
        el.checked = el.value !== "HashtagWatch" && el.value !== "Collection";
      });
      // Turn Order on for matchday path (capped in compute)
      typeInputs.forEach((el) => {
        if (el.value === "Order") el.checked = true;
      });
      relInputs.forEach((el) => {
        el.checked = MATCHDAY_RELS.has(el.value);
      });
      provInputs.forEach((el) => { el.checked = true; });
    } else {
      // default: hide orders, keep top SKUs etc.
      typeInputs.forEach((el) => {
        el.checked = DEFAULT_ON_TYPES.has(el.value) && !DEFAULT_OFF_TYPES.has(el.value);
      });
      relInputs.forEach((el) => {
        // hide dense CONTAINS by default for readability (order lines)
        el.checked = el.value !== "CONTAINS";
      });
      provInputs.forEach((el) => { el.checked = true; });
    }
    refreshGraph();

    if (name === "matchday" && DATA.meta?.matchday_path?.event_candidate_id) {
      const ecId = DATA.meta.matchday_path.event_candidate_id;
      setTimeout(() => {
        focusOnNode(ecId, true);
        if (network && !usingFallback) {
          try { network.focus(ecId, { scale: 1.15, animation: true }); } catch (_) {}
        }
      }, 200);
    }
  }

  function focusOnNode(nodeId, showInspector) {
    const neigh = new Set([nodeId]);
    for (const e of DATA.edges) {
      if (e.source === nodeId) neigh.add(e.target);
      if (e.target === nodeId) neigh.add(e.source);
    }
    focusNeighbourhood = neigh;
    refreshGraph();
    if (showInspector) showNodeInspector(nodeId);
  }

  function clearFocus() {
    focusNeighbourhood = null;
    refreshGraph();
  }

  /* —— Inspector —— */
  function showNodeInspector(nodeId) {
    const n = nodeById.get(nodeId);
    if (!n) return;
    const c = nodeColour(n.type);
    const ev = eventById.get(nodeId);
    const neighbours = [];
    for (const e of DATA.edges) {
      if (e.source === nodeId) {
        const t = nodeById.get(e.target);
        neighbours.push({ edge: e, other: t, dir: "→" });
      } else if (e.target === nodeId) {
        const t = nodeById.get(e.source);
        neighbours.push({ edge: e, other: t, dir: "←" });
      }
    }
    neighbours.sort((a, b) => (b.edge.weight || 0) - (a.edge.weight || 0));

    let confHtml = "";
    if (ev && ev.confidence && ev.confidence.value != null) {
      const conf = ev.confidence;
      const bars = [
        ["Lt", conf.Lt, "Temporal lift"],
        ["G", conf.G, "Geo overlap"],
        ["A", conf.A, "Affinity"],
        ["Y", conf.Y, "YoY (neutral 0.5)"],
        ["R", conf.R, "Reliability"],
      ];
      confHtml = `
        <div class="conf-block">
          <div class="conf-value">${(conf.value * 100).toFixed(0)}%<span> confidence</span></div>
          <div class="conf-bars">
            ${bars.map(([k, v, tip]) => `
              <div class="conf-bar" title="${tip}">
                <span>${k}</span>
                <div class="conf-bar__track"><div class="conf-bar__fill" style="width:${Math.round((v || 0) * 100)}%"></div></div>
                <span>${((v || 0) * 100).toFixed(0)}%</span>
              </div>`).join("")}
          </div>
          <div class="prov-tags">
            ${(ev.provenance_labels || []).map(tagClass).join("")}
          </div>
          <dl style="margin-top:0.6rem">
            <div class="meta-row"><dt>Orders in window</dt><dd>${ev.n_orders}</dd></div>
            <div class="meta-row"><dt>Archetype</dt><dd>${ev.archetype || "—"}</dd></div>
            ${ev.venue_city ? `<div class="meta-row"><dt>Venue</dt><dd>${ev.venue_city}</dd></div>` : ""}
          </dl>
        </div>`;
    }

    $("inspectorBody").innerHTML = `
      <div class="inspector-card">
        <div class="inspector-type"><span class="swatch" style="background:${c.bg}"></span>${n.type}</div>
        <h3 class="inspector-label">${escapeHtml(n.label)}</h3>
        <div class="inspector-id">${escapeHtml(n.id)}</div>
        ${confHtml}
        ${n.payload && n.payload.synthesised ? `<p class="inspector-empty" style="margin-top:0.5rem">Synthesised placeholder — edge endpoint missing from nodes table.</p>` : ""}
      </div>
      <p class="panel__label">Neighbours (${neighbours.length})</p>
      <ul class="neighbour-list">
        ${neighbours.slice(0, 40).map(({ edge, other, dir }) => `
          <li data-goto="${other ? other.id : ""}">
            <span class="swatch" style="background:${other ? nodeColour(other.type).bg : "#ccc"};margin-top:3px"></span>
            <div>
              <div class="rel">${dir} ${escapeHtml(edge.relation)} · ${escapeHtml(edge.provenance)}</div>
              <div class="nl">${escapeHtml(other ? other.label : "?")}</div>
            </div>
          </li>`).join("")}
        ${neighbours.length > 40 ? `<li><em>…and ${neighbours.length - 40} more</em></li>` : ""}
      </ul>
      <button type="button" class="btn btn--panel btn--sm" id="btnClearFocus" style="margin-top:0.75rem">Clear neighbourhood focus</button>
    `;

    $("btnClearFocus")?.addEventListener("click", () => {
      clearFocus();
      $("inspectorBody").innerHTML = `<p class="inspector-empty">Focus cleared. Click a node or edge.</p>`;
    });
    $("inspectorBody").querySelectorAll("[data-goto]").forEach((li) => {
      li.addEventListener("click", () => {
        const id = li.getAttribute("data-goto");
        if (!id) return;
        focusOnNode(id, true);
        if (network && !usingFallback) {
          try { network.focus(id, { scale: 1.2, animation: true }); } catch (_) {}
        }
      });
    });
  }

  function showEdgeInspector(edgeId) {
    const e = DATA.edges.find((x) => x.id === edgeId);
    if (!e) return;
    const src = nodeById.get(e.source);
    const tgt = nodeById.get(e.target);
    const style = PROV_EDGE[e.provenance] || PROV_EDGE.MOCK;
    $("inspectorBody").innerHTML = `
      <div class="inspector-card">
        <div class="inspector-type">Edge · ${escapeHtml(e.relation)}</div>
        <h3 class="inspector-label">${escapeHtml(src?.label || e.source)} → ${escapeHtml(tgt?.label || e.target)}</h3>
        <div class="inspector-id">${escapeHtml(e.id)}</div>
        <dl>
          <div class="meta-row"><dt>Relation</dt><dd>${escapeHtml(e.relation)}</dd></div>
          <div class="meta-row"><dt>Weight</dt><dd>${Number(e.weight).toFixed(3)}</dd></div>
          <div class="meta-row"><dt>Provenance</dt><dd><span style="color:${style.color};font-weight:700">${escapeHtml(e.provenance)}</span></dd></div>
          <div class="meta-row"><dt>From type</dt><dd>${escapeHtml(e.from_type || src?.type || "—")}</dd></div>
          <div class="meta-row"><dt>To type</dt><dd>${escapeHtml(e.to_type || tgt?.type || "—")}</dd></div>
        </dl>
      </div>`;
  }

  function tagClass(label) {
    const u = String(label).toUpperCase();
    let cls = "tag";
    if (u.includes("OBSERVED")) cls += " tag--obs";
    else if (u.includes("AGGREGATE")) cls += " tag--agg";
    else if (u.includes("HYPOTHESIS") || u.includes("HYP")) cls += " tag--hyp";
    else if (u.includes("MOCK")) cls += " tag--mock";
    return `<span class="${cls}">${escapeHtml(label)}</span>`;
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* —— Filter UI —— */
  function buildFilterLists() {
    const types = DATA.meta.node_types || {};
    const rels = DATA.meta.relations || {};
    const provs = DATA.meta.provenances || {};

    const typeUl = $("typeFilters");
    typeUl.innerHTML = Object.entries(types)
      .map(([t, c]) => {
        const col = nodeColour(t);
        const checked =
          DEFAULT_ON_TYPES.has(t) && !DEFAULT_OFF_TYPES.has(t) ? "checked" : "";
        const orderNote = t === "Order" ? ` (default off)` : "";
        return `<li><input type="checkbox" value="${t}" ${checked} id="t_${t}" />
          <span class="swatch" style="background:${col.bg}"></span>
          <label for="t_${t}">${t}${orderNote}</label>
          <span class="count-badge">${c}</span></li>`;
      })
      .join("");

    const relUl = $("relFilters");
    relUl.innerHTML = Object.entries(rels)
      .map(([r, c]) => {
        const checked = r !== "CONTAINS" ? "checked" : "";
        return `<li><input type="checkbox" value="${r}" ${checked} id="r_${r}" />
          <label for="r_${r}">${r}</label>
          <span class="count-badge">${c}</span></li>`;
      })
      .join("");

    const provUl = $("provFilters");
    provUl.innerHTML = Object.entries(provs)
      .map(([p, c]) => {
        const style = PROV_EDGE[p] || PROV_EDGE.MOCK;
        return `<li><input type="checkbox" value="${p}" checked id="p_${p}" />
          <span class="swatch" style="background:${style.color};border-radius:2px"></span>
          <label for="p_${p}">${p}</label>
          <span class="count-badge">${c}</span></li>`;
      })
      .join("");

    typeUl.addEventListener("change", () => { activePreset = "custom"; document.querySelectorAll("[data-preset]").forEach((b) => b.classList.remove("is-active")); refreshGraph(); });
    relUl.addEventListener("change", () => { refreshGraph(); });
    provUl.addEventListener("change", () => { refreshGraph(); });
  }

  function buildLegend() {
    const keyTypes = [
      "EventCandidate", "Event", "VirtualEvent", "ActivityChallenge",
      "Order", "SKU", "Geo", "Persona", "SocialTrend", "HashtagWatch",
      "Driver", "Collection", "Shop",
    ];
    $("legendNodes").innerHTML = keyTypes
      .map((t) => {
        const c = nodeColour(t);
        return `<div class="legend__item"><span class="swatch" style="background:${c.bg}"></span>${t}</div>`;
      })
      .join("");
    $("legendEdges").innerHTML = Object.entries(PROV_EDGE)
      .map(([p, s]) => {
        const dashed = s.dashes ? "dashed" : "";
        return `<span><i class="edge-swatch ${dashed}" style="background:${s.dashes ? "transparent" : s.color};color:${s.color};border-color:${s.color}"></i>${p.replace("_", " ")}</span>`;
      })
      .join("");
  }

  /* —— vis-network —— */
  function initVis() {
    const ids = computeFilteredNodeIds();
    nodesDS = new vis.DataSet(buildVisNodes(ids));
    edgesDS = new vis.DataSet(buildVisEdges(ids, selectedRels(), selectedProv()));

    const options = {
      nodes: {
        borderWidthSelected: 3,
        chosen: true,
      },
      edges: {
        selectionWidth: 2,
        hoverWidth: 1.5,
      },
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -42,
          centralGravity: 0.012,
          springLength: 95,
          springConstant: 0.06,
          damping: 0.45,
          avoidOverlap: 0.35,
        },
        stabilization: { iterations: 120, fit: true },
      },
      interaction: {
        hover: true,
        tooltipDelay: 120,
        multiselect: false,
        navigationButtons: false,
        keyboard: false,
      },
      layout: { improvedLayout: true },
    };

    network = new vis.Network($("network"), { nodes: nodesDS, edges: edgesDS }, options);

    network.on("click", (params) => {
      if (params.nodes.length) {
        focusOnNode(params.nodes[0], true);
      } else if (params.edges.length) {
        focusNeighbourhood = null;
        refreshGraph();
        showEdgeInspector(params.edges[0]);
      } else {
        clearFocus();
        $("inspectorBody").innerHTML = `<p class="inspector-empty">Click a node or edge to inspect.</p>`;
      }
    });

    network.on("doubleClick", (params) => {
      if (!params.nodes.length) return;
      const id = params.nodes[0];
      const n = nodeById.get(id);
      focusOnNode(id, true);
      if (n && n.type === "EventCandidate") {
        try { network.focus(id, { scale: 1.35, animation: true }); } catch (_) {}
      }
    });

    network.once("stabilizationIterationsDone", () => {
      network.setOptions({ physics: { enabled: physicsOn } });
    });
  }

  /* —— Canvas fallback (no CDN) —— */
  let fb = { nodes: [], edges: [], raf: null, canvas: null, ctx: null, drag: null };

  function initFallback() {
    usingFallback = true;
    $("fallbackBanner").style.display = "block";
    const wrap = $("network");
    wrap.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    wrap.appendChild(canvas);
    fb.canvas = canvas;
    fb.ctx = canvas.getContext("2d");

    function resize() {
      const r = wrap.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      fb.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener("resize", () => { resize(); fallbackDraw(); });

    canvas.addEventListener("mousedown", (ev) => {
      const p = fallbackHit(ev);
      if (p) {
        fb.drag = p;
        focusOnNode(p.id, true);
      }
    });
    canvas.addEventListener("mousemove", (ev) => {
      if (!fb.drag) return;
      const rect = canvas.getBoundingClientRect();
      fb.drag.x = ev.clientX - rect.left;
      fb.drag.y = ev.clientY - rect.top;
    });
    canvas.addEventListener("mouseup", () => { fb.drag = null; });
    canvas.addEventListener("dblclick", (ev) => {
      const p = fallbackHit(ev);
      if (p) focusOnNode(p.id, true);
    });

    refreshGraph();
    fallbackLoop();
  }

  function fallbackRender(visNodes, visEdges) {
    const w = fb.canvas?.clientWidth || 800;
    const h = fb.canvas?.clientHeight || 600;
    const prev = new Map(fb.nodes.map((n) => [n.id, n]));
    fb.nodes = visNodes.map((n, i) => {
      const old = prev.get(n.id);
      const angle = (i / Math.max(visNodes.length, 1)) * Math.PI * 2;
      return {
        id: n.id,
        label: n.label,
        color: n.color.background,
        size: n.size,
        font: n.font.color,
        x: old ? old.x : w / 2 + Math.cos(angle) * Math.min(w, h) * 0.28,
        y: old ? old.y : h / 2 + Math.sin(angle) * Math.min(w, h) * 0.28,
        vx: 0,
        vy: 0,
      };
    });
    const idset = new Set(fb.nodes.map((n) => n.id));
    fb.edges = visEdges
      .filter((e) => idset.has(e.from) && idset.has(e.to))
      .map((e) => ({
        from: e.from,
        to: e.to,
        color: e.color.color,
        width: e.width,
      }));
  }

  function fallbackHit(ev) {
    const rect = fb.canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    for (let i = fb.nodes.length - 1; i >= 0; i--) {
      const n = fb.nodes[i];
      const dx = n.x - x, dy = n.y - y;
      if (dx * dx + dy * dy < (n.size + 4) * (n.size + 4)) return n;
    }
    return null;
  }

  function fallbackStep() {
    if (!physicsOn) return;
    const nodes = fb.nodes;
    const k = 0.004;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const rep = 800 / (dist * dist);
        dx /= dist; dy /= dist;
        nodes[i].vx -= dx * rep;
        nodes[i].vy -= dy * rep;
        nodes[j].vx += dx * rep;
        nodes[j].vy += dy * rep;
      }
    }
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const e of fb.edges) {
      const a = byId.get(e.from), b = byId.get(e.to);
      if (!a || !b) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 90) * k;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      a.vx += dx; a.vy += dy;
      b.vx -= dx; b.vy -= dy;
    }
    const w = fb.canvas.clientWidth, h = fb.canvas.clientHeight;
    for (const n of nodes) {
      if (fb.drag && fb.drag.id === n.id) { n.vx = 0; n.vy = 0; continue; }
      n.vx += (w / 2 - n.x) * 0.0008;
      n.vy += (h / 2 - n.y) * 0.0008;
      n.vx *= 0.85; n.vy *= 0.85;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(20, Math.min(w - 20, n.x));
      n.y = Math.max(20, Math.min(h - 20, n.y));
    }
  }

  function fallbackDraw() {
    const ctx = fb.ctx;
    if (!ctx) return;
    const w = fb.canvas.clientWidth, h = fb.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const byId = new Map(fb.nodes.map((n) => [n.id, n]));
    for (const e of fb.edges) {
      const a = byId.get(e.from), b = byId.get(e.to);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = e.width;
      ctx.globalAlpha = 0.75;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const n of fb.nodes) {
      ctx.beginPath();
      ctx.fillStyle = n.color;
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#292524";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(n.label, n.x, n.y + n.size + 12);
    }
  }

  function fallbackLoop() {
    fallbackStep();
    fallbackDraw();
    fb.raf = requestAnimationFrame(fallbackLoop);
  }

  /* —— PNG export —— */
  function exportPng() {
    try {
      let dataUrl;
      if (usingFallback && fb.canvas) {
        dataUrl = fb.canvas.toDataURL("image/png");
      } else if (network) {
        // vis-network renders to canvas inside #network
        const canvas = $("network").querySelector("canvas");
        if (!canvas) throw new Error("No canvas");
        dataUrl = canvas.toDataURL("image/png");
      } else {
        throw new Error("Nothing to export");
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `syndicate-graph-${activePreset}-${Date.now()}.png`;
      a.click();
    } catch (err) {
      alert("PNG export failed: " + err.message);
    }
  }

  /* —— Boot —— */
  async function main() {
    try {
      DATA = await loadData();
    } catch (err) {
      $("loading").textContent = "Failed to load graph-viz.json — run export_graph_json.py and serve from the lab folder.";
      console.error(err);
      return;
    }

    DATA.nodes.forEach((n) => nodeById.set(n.id, n));
    (DATA.events || []).forEach((e) => eventById.set(e.id, e));

    $("shopLabel").textContent = DATA.meta.shop_label || "Harbour Athletic";
    $("statNodes").textContent = DATA.meta.counts.nodes;
    $("statEdges").textContent = DATA.meta.counts.edges;
    $("statEvents").textContent = DATA.meta.counts.events;

    buildFilterLists();
    buildLegend();

    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
    });

    let searchTimer;
    $("searchInput").addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(refreshGraph, 180);
    });

    $("btnPhysics").addEventListener("click", () => {
      physicsOn = !physicsOn;
      $("btnPhysics").textContent = `Physics: ${physicsOn ? "on" : "off"}`;
      if (network && !usingFallback) {
        network.setOptions({ physics: { enabled: physicsOn } });
      }
    });

    $("btnFit").addEventListener("click", () => {
      if (network && !usingFallback) network.fit({ animation: true });
    });

    $("btnPng").addEventListener("click", exportPng);

    $("chkHier").addEventListener("change", (ev) => {
      if (!network || usingFallback) return;
      if (ev.target.checked) {
        network.setOptions({
          layout: {
            hierarchical: {
              enabled: true,
              direction: "UD",
              sortMethod: "directed",
              nodeSpacing: 120,
              levelSeparation: 100,
            },
          },
          physics: { enabled: false },
        });
        physicsOn = false;
        $("btnPhysics").textContent = "Physics: off";
      } else {
        network.setOptions({
          layout: { hierarchical: { enabled: false } },
          physics: { enabled: true },
        });
        physicsOn = true;
        $("btnPhysics").textContent = "Physics: on";
      }
    });

    $("loading").classList.add("hidden");

    const params = new URLSearchParams(location.search);
    const urlPreset = params.get("preset"); // default | matchday | events | full
    const shotMode = params.get("shot") === "1";

    const cdnOk = typeof vis !== "undefined" && vis.Network && !window.__VIS_CDN_FAILED;
    if (cdnOk) {
      initVis();
      if (urlPreset && ["default", "matchday", "events", "full"].includes(urlPreset)) {
        applyPreset(urlPreset);
      } else {
        refreshGraph();
      }
      if (shotMode) {
        // Wait for physics to settle then flag for headless capture
        network.once("stabilizationIterationsDone", () => {
          document.body.setAttribute("data-shot-ready", "1");
        });
        setTimeout(() => document.body.setAttribute("data-shot-ready", "1"), 3500);
      }
    } else {
      initFallback();
      if (urlPreset && ["default", "matchday", "events", "full"].includes(urlPreset)) {
        applyPreset(urlPreset);
      }
      if (shotMode) {
        setTimeout(() => document.body.setAttribute("data-shot-ready", "1"), 2000);
      }
    }
  }

  main();
})();
