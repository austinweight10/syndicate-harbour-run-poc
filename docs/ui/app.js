/* Syndicate prototype — nav, tabs, toast, agent run interactions */

(function () {
  "use strict";

  const STORAGE_KEY = "syndicate_agent_run";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  /* ——— Toast ——— */
  function ensureToastHost() {
    let host = $(".toast-host");
    if (!host) {
      host = document.createElement("div");
      host.className = "toast-host";
      document.body.appendChild(host);
    }
    return host;
  }

  function showToast(message, opts) {
    opts = opts || {};
    const host = ensureToastHost();
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = message;
    host.appendChild(el);
    const ttl = opts.duration || 4200;
    setTimeout(function () {
      el.classList.add("toast-out");
      setTimeout(function () {
        el.remove();
      }, 220);
    }, ttl);
  }

  /* ——— Tabs ——— */
  function initTabs() {
    $all("[data-tabs]").forEach(function (root) {
      const tabs = $all(".tab", root);
      const panels = $all(".tab-panel", root.parentElement || document);
      // Prefer panels scoped under a shared parent wrapper
      const panelRoot = root.closest("[data-tab-root]") || root.parentElement;
      const scopedPanels = $all(".tab-panel", panelRoot);

      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          const id = tab.getAttribute("data-tab");
          tabs.forEach(function (t) {
            t.classList.toggle("active", t === tab);
          });
          scopedPanels.forEach(function (p) {
            p.classList.toggle("active", p.getAttribute("data-panel") === id);
          });
        });
      });
    });
  }

  /* ——— Modal ——— */
  function initModals() {
    $all("[data-open-modal]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        const id = btn.getAttribute("data-open-modal");
        const modal = document.getElementById(id);
        if (modal) modal.classList.add("open");
      });
    });
    $all("[data-close-modal]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const backdrop = btn.closest(".modal-backdrop");
        if (backdrop) backdrop.classList.remove("open");
      });
    });
    $all(".modal-backdrop").forEach(function (backdrop) {
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) backdrop.classList.remove("open");
      });
    });
  }

  /* ——— Agent run state ——— */
  function defaultRunState() {
    return {
      status: "idle", // idle | queued | running | complete
      startedAt: null,
      progress: 0,
      steps: [
        { id: "load", label: "Load persona & event context", status: "pending", detail: "Away-day dad · Match-day home kit rush" },
        { id: "home", label: "Land on storefront home", status: "pending", detail: "demo-football-merch.myshopify.com" },
        { id: "collection", label: "Open Home Kits collection", status: "pending", detail: "/collections/home-kits" },
        { id: "pdp", label: "View replica shirt PDP", status: "pending", detail: "Adult home shirt — size M" },
        { id: "cart", label: "Add shirt + kids scarf to cart", status: "pending", detail: "Basket total ~£64" },
        { id: "checkout", label: "Reach checkout (stop before payment)", status: "pending", detail: "No payment taken" },
        { id: "score", label: "Score insights / frictions", status: "pending", detail: "Write findings to Insights board" }
      ]
    };
  }

  function loadRunState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return defaultRunState();
  }

  function saveRunState(state) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function startAgentRun() {
    const state = defaultRunState();
    state.status = "queued";
    state.startedAt = new Date().toISOString();
    state.progress = 5;
    state.steps[0].status = "running";
    saveRunState(state);

    showToast(
      'Agent run queued for <strong>Away-day dad</strong>. <a href="agent-run.html">View run →</a>'
    );

    // Simulate progression in background for demo cohesion
    simulateRunProgress();
  }

  let simTimer = null;

  function simulateRunProgress() {
    if (simTimer) clearInterval(simTimer);
    simTimer = setInterval(function () {
      const state = loadRunState();
      if (state.status === "complete" || state.status === "idle") {
        clearInterval(simTimer);
        simTimer = null;
        return;
      }

      if (state.status === "queued") {
        state.status = "running";
      }

      const runningIdx = state.steps.findIndex(function (s) {
        return s.status === "running";
      });
      const pendingIdx = state.steps.findIndex(function (s) {
        return s.status === "pending";
      });

      if (runningIdx >= 0) {
        state.steps[runningIdx].status = "done";
        if (pendingIdx >= 0) {
          state.steps[pendingIdx].status = "running";
          state.progress = Math.min(95, Math.round(((pendingIdx + 1) / state.steps.length) * 100));
        } else {
          state.status = "complete";
          state.progress = 100;
          showToast('Agent run complete. <a href="artifacts.html">See Insights / Frictions →</a>');
        }
      } else if (pendingIdx >= 0) {
        state.steps[pendingIdx].status = "running";
        state.status = "running";
      }

      saveRunState(state);
      if (typeof window.__syndicateRenderRun === "function") {
        window.__syndicateRenderRun(state);
      }
    }, 1600);
  }

  function initRunButton() {
    $all("[data-run-agents]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.disabled = true;
        const label = btn.querySelector("[data-label]") || btn;
        const prev = label.textContent;
        label.textContent = "Queuing…";
        startAgentRun();
        setTimeout(function () {
          btn.disabled = false;
          label.textContent = prev;
        }, 1200);
      });
    });
  }

  /* ——— Agent run page renderer ——— */
  function initAgentRunPage() {
    const root = $("[data-agent-run]");
    if (!root) return;

    function render(state) {
      const statusEl = $("[data-run-status]", root);
      const progressEl = $("[data-run-progress]", root);
      const progressLabel = $("[data-run-progress-label]", root);
      const list = $("[data-run-steps]", root);
      const outcome = $("[data-run-outcome]", root);

      if (statusEl) {
        const map = {
          idle: ["Not started", "pill-neutral"],
          queued: ["Queued", "pill-info"],
          running: ["Running", "pill-info"],
          complete: ["Complete", "pill-success"]
        };
        const m = map[state.status] || map.idle;
        statusEl.className = "pill " + m[1] + " pill-dot";
        statusEl.textContent = m[0];
      }

      if (progressEl) {
        progressEl.style.width = (state.progress || 0) + "%";
      }
      if (progressLabel) {
        progressLabel.textContent = (state.progress || 0) + "%";
      }

      if (list) {
        list.innerHTML = state.steps
          .map(function (step) {
            const iconClass =
              step.status === "done"
                ? "done"
                : step.status === "running"
                ? "running"
                : step.status === "failed"
                ? "failed"
                : "pending";
            const icon =
              step.status === "done"
                ? "✓"
                : step.status === "running"
                ? "…"
                : step.status === "failed"
                ? "!"
                : "·";
            return (
              '<li class="run-step">' +
              '<div class="run-step-icon ' +
              iconClass +
              '">' +
              icon +
              "</div>" +
              '<div class="run-step-body">' +
              '<div class="run-step-title">' +
              step.label +
              "</div>" +
              '<div class="run-step-detail">' +
              step.detail +
              "</div>" +
              "</div>" +
              '<div class="run-step-time">' +
              (step.status === "done" ? "done" : step.status) +
              "</div>" +
              "</li>"
            );
          })
          .join("");
      }

      if (outcome) {
        if (state.status === "complete") {
          outcome.hidden = false;
        } else {
          outcome.hidden = true;
        }
      }
    }

    window.__syndicateRenderRun = render;
    let state = loadRunState();
    render(state);

    if (state.status === "queued" || state.status === "running") {
      simulateRunProgress();
    }

    // If idle and ?autostart=1, kick off
    const params = new URLSearchParams(window.location.search);
    if (params.get("autostart") === "1" && state.status === "idle") {
      startAgentRun();
      state = loadRunState();
      render(state);
    }
  }

  /* ——— Confidence bars from data-attrs ——— */
  function initConfidenceBars() {
    $all("[data-confidence]").forEach(function (el) {
      const v = parseFloat(el.getAttribute("data-confidence"));
      if (isNaN(v)) return;
      const fill = $(".confidence-fill", el);
      const label = $(".confidence-value", el);
      if (fill) {
        fill.style.width = Math.round(v * 100) + "%";
        fill.classList.remove("mid", "low");
        if (v < 0.55) fill.classList.add("low");
        else if (v < 0.75) fill.classList.add("mid");
      }
      if (label) label.textContent = v.toFixed(2);
    });
  }

  /* ——— Highlight active nav ——— */
  function initNav() {
    const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    $all(".sidenav .nav-item").forEach(function (item) {
      const href = (item.getAttribute("href") || "").toLowerCase();
      let active = href === path;
      // Treat detail pages as belonging to parent section
      if (!active) {
        if (path === "event-detail.html" && href === "events.html") active = true;
        if (path === "persona-detail.html" && href === "personas.html") active = true;
        if (path === "agent-run.html" && href === "agent-run.html") active = true;
        if ((path === "" || path === "/") && href === "index.html") active = true;
      }
      item.classList.toggle("active", active);
    });
  }


  /* ——— Settings: pause agents + refresh pipeline ——— */
  function initSettingsControls() {
    const pause = $("[data-pause-agents]");
    const status = $("[data-agents-auto-status]");
    const PAUSE_KEY = "syndicate_pause_auto_agents";

    function renderPause() {
      if (!pause) return;
      const paused = pause.checked;
      try { sessionStorage.setItem(PAUSE_KEY, paused ? "1" : "0"); } catch (e) {}
      if (status) {
        status.innerHTML = paused
          ? 'Auto-queue <strong>PAUSED</strong> — manual Run agents still works. Agents always stop before payment.'
          : 'Auto-queue <strong>ON</strong> — capped at 3 Ready personas per PipelineRun.';
      }
    }

    if (pause) {
      try {
        pause.checked = sessionStorage.getItem(PAUSE_KEY) === "1";
      } catch (e) {}
      pause.addEventListener("change", function () {
        renderPause();
        showToast(
          pause.checked
            ? "Auto agents paused for this shop."
            : "Auto agents resumed (capped queue)."
        );
      });
      renderPause();
    }

    $all("[data-refresh-pipeline]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.disabled = true;
        showToast(
          "Queued <strong>Refresh store + re-run</strong> · trigger=manual_refresh. Resume from last successful stage."
        );
        setTimeout(function () {
          btn.disabled = false;
        }, 1400);
      });
    });
  }

  function initFilterRows() {
    $all(".filter-row").forEach(function (row) {
      $all(".filter-pill", row).forEach(function (pill) {
        pill.addEventListener("click", function () {
          // Toggle active on exclusive groups: siblings that share no exclusive attrs — soft toggle
          pill.classList.toggle("active");
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initTabs();
    initModals();
    initRunButton();
    initConfidenceBars();
    initAgentRunPage();
    initSettingsControls();
    initFilterRows();
  });

  // Expose for debugging in demo
  window.SyndicateUI = {
    showToast: showToast,
    startAgentRun: startAgentRun,
    loadRunState: loadRunState
  };
})();
