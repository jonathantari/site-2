/* ============================================================
   Turnaround — Slot-Machine Reel Engine
   ------------------------------------------------------------
   Each pinned section has height = (faces + HOLD) × 100vh.
   Inside is a sticky viewport-height frame. Scrolling through
   the section advances one face per viewport, then the last
   word holds for HOLD viewports while an underline draws in
   left-to-right. This gives the reader a moment to absorb the
   final word before the next section enters.

   Scroll progress formula:
     p = -rect.top / (rect.height - viewport)   → 0..1

   Face index:
     rawIdx = p × (faces + HOLD - 1)
     idx    = min(faces-1, round(rawIdx))   ← caps at last face

   Underline progress (0→1 during hold zone):
     ulP = (rawIdx - (faces-1)) / HOLD      ← when rawIdx ≥ faces-1
   ============================================================ */

(function () {
  "use strict";

  const ROT_DUR = 360;
  const HOLD    = 2;   // extra viewports to hold the last word
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Reel ──────────────────────────────────────────────────
  class Reel {
    constructor(root, faces) {
      this.root = root;
      this.faces = faces;
      this.currentIndex = 0;
      this.targetIndex  = 0;
      this.isAnimating  = false;
      this.isBlock      = root.classList.contains("reel--block");
      this.widths       = [];
      this.finishTimer  = null;
      this.underlineEl  = null;

      this._build();
      this._measure();
      this._applyIdle(0);
    }

    _build() {
      this.root.classList.add("reel");

      this.stage = document.createElement("span");
      this.stage.className = "reel__stage";

      this.frontEl = document.createElement("span");
      this.frontEl.className = "reel__face reel__face--front";

      this.incomingEl = document.createElement("span");
      this.incomingEl.className = "reel__face reel__face--incoming";

      this.stage.appendChild(this.frontEl);
      this.stage.appendChild(this.incomingEl);
      this.root.appendChild(this.stage);

      if (this.isBlock) {
        this.underlineEl = document.createElement("span");
        this.underlineEl.className = "reel__underline";
        this.root.appendChild(this.underlineEl);
      }
    }

    _measure() {
      const probe = this.frontEl;
      const prev  = probe.textContent;
      if (!prev) probe.textContent = "M";
      const cs = getComputedStyle(probe);

      const baseStyle = [
        "position:absolute", "left:-99999px", "top:0",
        "visibility:hidden", "pointer-events:none",
        "margin:0", "padding:0", "border:0",
        "font-family:"          + cs.fontFamily,
        "font-size:"            + cs.fontSize,
        "font-weight:"          + cs.fontWeight,
        "font-style:"           + cs.fontStyle,
        "letter-spacing:"       + cs.letterSpacing,
        "font-feature-settings:"+ cs.fontFeatureSettings,
        "font-variant:"         + cs.fontVariant,
        "text-transform:"       + cs.textTransform,
      ];

      if (this.isBlock) {
        const w = this.root.clientWidth || this.root.getBoundingClientRect().width || 400;
        const mirror = document.createElement("div");
        mirror.style.cssText = baseStyle.concat([
          "display:block",
          "width:" + w + "px",
          "white-space:normal",
          "line-height:1.1",
          "text-align:center",
        ]).join(";");
        document.body.appendChild(mirror);

        let maxH = 0;
        this.widths = this.faces.map(f => {
          if (f.blank) return 0;
          mirror.textContent = f.text;
          const r = mirror.getBoundingClientRect();
          if (r.height > maxH) maxH = r.height;
          return Math.ceil(r.width) + 4;
        });
        this.root.style.setProperty("--reel-h", Math.ceil(maxH) + "px");
        document.body.removeChild(mirror);
      } else {
        const mirror = document.createElement("span");
        mirror.style.cssText = baseStyle.concat([
          "display:inline-block",
          "white-space:nowrap",
          "line-height:1",
        ]).join(";");
        document.body.appendChild(mirror);
        this.widths = this.faces.map(f => {
          if (f.blank) return 0;
          mirror.textContent = f.text;
          return Math.ceil(mirror.getBoundingClientRect().width) + 4;
        });
        document.body.removeChild(mirror);
      }

      probe.textContent = prev;
    }

    remeasure() {
      this._measure();
      this._applyIdle(this.currentIndex);
    }

    _applyIdle(idx) {
      const face = this.faces[idx];
      if (!this.isBlock) {
        this.root.style.setProperty("--reel-w", this.widths[idx] + "px");
      }
      this.frontEl.textContent = face.blank ? "" : face.text;
      this.frontEl.classList.toggle("reel__face--blank", !!face.blank);
      this.incomingEl.textContent = "";
      this.root.classList.remove("is-spinning", "dir-forward", "dir-reverse");
    }

    setTarget(idx) {
      idx = Math.max(0, Math.min(this.faces.length - 1, idx));
      if (idx === this.targetIndex) return;
      this.targetIndex = idx;
      this._maybeTick();
    }

    _maybeTick() {
      if (this.isAnimating) return;
      if (this.currentIndex === this.targetIndex) return;
      const dir       = this.targetIndex > this.currentIndex ? 1 : -1;
      const nextIndex = this.currentIndex + dir;
      this._spinOne(nextIndex, dir, nextIndex === this.targetIndex);
    }

    _spinOne(nextIndex, dir, isFinal) {
      this.isAnimating = true;

      const incoming = this.faces[nextIndex];
      this.incomingEl.textContent = incoming.blank ? "" : incoming.text;
      this.incomingEl.classList.toggle("reel__face--blank", !!incoming.blank);

      this.root.style.setProperty(
        "--ease",
        isFinal
          ? "cubic-bezier(0.2, 0.85, 0.25, 1)"
          : "cubic-bezier(0.55, 0.05, 0.45, 0.95)"
      );

      if (!this.isBlock) {
        this.root.style.setProperty("--reel-w", this.widths[nextIndex] + "px");
      }

      this.root.classList.remove("dir-forward", "dir-reverse");
      this.root.classList.add(dir > 0 ? "dir-forward" : "dir-reverse");
      void this.root.offsetWidth;
      this.root.classList.add("is-spinning");

      clearTimeout(this.finishTimer);
      this.finishTimer = setTimeout(() => {
        this.currentIndex = nextIndex;
        this.isAnimating  = false;
        this._applyIdle(nextIndex);
        this._maybeTick();
      }, ROT_DUR + 10);
    }

    setUnderlineProgress(p) {
      if (!this.underlineEl) return;
      this.underlineEl.style.transform = `scaleX(${p})`;
    }

    _crossfadeTo(idx) {
      if (this.currentIndex === idx) return;
      this.currentIndex = this.targetIndex = idx;
      this.frontEl.style.transition = "opacity 150ms ease";
      this.frontEl.style.opacity    = "0";
      setTimeout(() => {
        this._applyIdle(idx);
        this.frontEl.style.opacity = "1";
        setTimeout(() => { this.frontEl.style.transition = ""; }, 180);
      }, 160);
    }
  }

  // ── Section ───────────────────────────────────────────────
  class Section {
    constructor(el, reel) {
      this.el            = el;
      this.reel          = reel;
      this.faceCount     = reel.faces.length;
      this.ulProgress    = 0;   // exposed for CTA check
    }

    // p runs 0→1 over the section's full scrollable height,
    // which includes (faceCount + HOLD - 1) viewport-lengths.
    updateProgress(p) {
      const n   = this.faceCount;
      const span = n + HOLD - 1;          // total scrollable viewport-lengths
      const raw  = Math.max(0, Math.min(span, p * span));

      // Face mapping — capped at last face
      const idx = Math.min(n - 1, Math.round(raw));
      this.reel.setTarget(idx);

      // Underline — grows only during the HOLD zone
      const holdStart = n - 1;
      if (raw >= holdStart) {
        this.ulProgress = Math.min(1, (raw - holdStart) / HOLD);
      } else {
        this.ulProgress = 0;
      }
      this.reel.setUnderlineProgress(this.ulProgress);
    }
  }

  // ── ScrollController ──────────────────────────────────────
  class ScrollController {
    constructor(sections) {
      this.sections = sections;
      this.ctaRow   = document.querySelector(".s4-cta-row");
      this.raf      = null;
      this._onScroll = this._onScroll.bind(this);
      window.addEventListener("scroll", this._onScroll, { passive: true });
      window.addEventListener("resize", this._onScroll, { passive: true });
      this._onScroll();
    }

    _onScroll() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = null;
        this._tick();
      });
    }

    _tick() {
      const vh = window.innerHeight;
      this.sections.forEach((s) => {
        const rect  = s.el.getBoundingClientRect();
        const range = Math.max(1, rect.height - vh);
        const p     = -rect.top / range;
        s.updateProgress(p);

        // CTA appears once the underline is nearly drawn
        if (s.el.id === "section-4" && this.ctaRow) {
          this.ctaRow.classList.toggle("is-visible", s.ulProgress >= 0.88);
        }
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  function sizePinnedSections() {
    const vh = window.innerHeight;
    document.querySelectorAll(".section--pinned").forEach((el) => {
      const faces = parseInt(el.getAttribute("data-faces"), 10) || 1;
      el.style.height = ((faces + HOLD) * vh) + "px";
    });
  }

  function initReel(selector, faces) {
    const root = document.querySelector(selector);
    return root ? new Reel(root, faces) : null;
  }

  function buildSections() {
    const s1 = initReel("#s1-main", [
      { text: "save it"         },
      { text: "turn it around"  },
      { text: "evolve it"       },
      { text: "grow it"         },
      { text: "lead it"         },
    ]);

    const s2 = initReel("#s2-main", [
      { text: "are dying quietly"                    },
      { text: "are aging out"                        },
      { text: "built the economy"                    },
      { text: "already have customers and a product" },
      { text: "are salvageable"                      },
      { text: "are one great boss away"              },
    ]);

    const s4 = initReel("#s4-main", [
      { text: "yourself"                                },
      { text: "jobs saved"                              },
      { text: "your local economy"                      },
      { text: "creating a great place to work"          },
      { text: "more good managers in the world"         },
      { text: "the critical businesses nobody talks about" },
      { text: "leaving a legacy"                        },
      { text: "yourself"                                },
    ]);

    return [
      s1 && new Section(document.getElementById("section-1"), s1),
      s2 && new Section(document.getElementById("section-2"), s2),
      s4 && new Section(document.getElementById("section-4"), s4),
    ].filter(Boolean);
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(async function () {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) {}
    }

    sizePinnedSections();
    const sections = buildSections();

    requestAnimationFrame(() => requestAnimationFrame(() => {
      sections.forEach(s => s.reel.remeasure());
    }));

    if (reducedMotion) {
      sections.forEach(s => {
        const r = s.reel;
        r.setTarget = (idx) => {
          idx = Math.max(0, Math.min(r.faces.length - 1, idx));
          if (idx !== r.currentIndex) r._crossfadeTo(idx);
        };
      });
    }

    new ScrollController(sections);

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        sizePinnedSections();
        sections.forEach(s => s.reel.remeasure());
      }, 150);
    });
  });
})();
