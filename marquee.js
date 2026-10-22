/* ---------- Turnaround — business marquee ----------
   Duplicates each track's cards once so the CSS animation
   (translateX 0 → -50%) loops without a seam. Copies are hidden
   from assistive tech and skipped by keyboard.
---------------------------------------------------- */

(function () {
  "use strict";

  document.querySelectorAll(".marquee__track").forEach(function (track) {
    Array.prototype.slice.call(track.children).forEach(function (item) {
      var copy = item.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      track.appendChild(copy);
    });
  });
})();
