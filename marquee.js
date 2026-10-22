/* ---------- Turnaround — business marquee ----------
   Each row is a horizontally scrollable strip. The cards are duplicated
   once so the loop has no seam, and the row drifts on its own by moving
   scrollLeft. Because it is real scrolling, people can also swipe it on
   a phone or drag it with a trackpad; it pauses while they do, and while
   a mouse hovers over it, then carries on from wherever they left it.
---------------------------------------------------- */

(function () {
  "use strict";

  var SPEED = 48;        // px per second, first row
  var SPEED_REV = 40;    // px per second, second row (moves the other way)
  var RESUME_MS = 1800;  // wait after a swipe or wheel before drifting again

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".marquee").forEach(function (box) {
    var track = box.querySelector(".marquee__track");
    if (!track) return;

    // Duplicate the cards so scrolling past the end wraps cleanly.
    Array.prototype.slice.call(track.children).forEach(function (item) {
      var copy = item.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      track.appendChild(copy);
    });

    if (reduceMotion) return; // still swipeable, just no drift

    var reverse = track.classList.contains("marquee__track--rev");
    var speed = reverse ? -SPEED_REV : SPEED;
    var pos = 0;
    var half = 0;
    var last = 0;
    var touching = false;
    var hovering = false;
    var pausedUntil = 0;
    var visible = true;
    var ourScroll = false;

    function measure() {
      half = track.scrollWidth / 2;
    }

    function wrap(x) {
      if (half <= 0) return x;
      while (x >= half) x -= half;
      while (x < 0) x += half;
      return x;
    }

    function setPos(x) {
      pos = wrap(x);
      ourScroll = true;
      box.scrollLeft = pos;
    }

    function pause(ms) { pausedUntil = Math.max(pausedUntil, performance.now() + ms); }

    function tick(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (visible && !touching && !hovering && now >= pausedUntil && half > 0) {
        setPos(pos + speed * dt);
      }
      requestAnimationFrame(tick);
    }

    // Any scroll we didn't cause came from the visitor: follow it, wrap it, pause.
    box.addEventListener("scroll", function () {
      if (ourScroll) { ourScroll = false; return; }
      pos = box.scrollLeft;
      if (half > 0 && (pos >= half || pos <= 0)) setPos(pos);
      pause(RESUME_MS);
    }, { passive: true });

    box.addEventListener("touchstart", function () { touching = true; }, { passive: true });
    box.addEventListener("touchend", function () { touching = false; pause(RESUME_MS); }, { passive: true });
    box.addEventListener("touchcancel", function () { touching = false; pause(RESUME_MS); }, { passive: true });
    box.addEventListener("wheel", function () { pause(RESUME_MS); }, { passive: true });
    // Mouse only: on phones a tap fires enter without a matching leave.
    box.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovering = true; });
    box.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hovering = false; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }).observe(box);
    }

    window.addEventListener("resize", function () { measure(); setPos(pos); });
    window.addEventListener("load", function () { measure(); setPos(pos); });

    measure();
    setPos(reverse ? half / 2 : 0);
    requestAnimationFrame(tick);
  });
})();
