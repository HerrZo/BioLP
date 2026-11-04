/* Quality-of-life layer for Biologie 9.
   One delegated tooltip for every element with data-tip, plus small touch and focus refinements.
   No framework, no layout changes, no new design language. */
(function () {
  "use strict";

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  var tip = null;
  var active = null;
  var showTimer = null;
  var hideTimer = null;

  function ensureTip() {
    if (tip) { return tip; }
    tip = document.createElement("div");
    tip.className = "ui-tip";
    tip.id = "ui-tip";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    document.body.appendChild(tip);
    return tip;
  }

  function contentFor(element) {
    var title = element.getAttribute("data-tip-title");
    var text = element.getAttribute("data-tip");
    var note = element.getAttribute("data-tip-note");
    if (!text) { return ""; }
    var html = "";
    if (title) { html += "<strong>" + title + "</strong>"; }
    html += "<span>" + text + "</span>";
    if (note) { html += "<em>" + note + "</em>"; }
    return html;
  }

  function place(element) {
    var node = ensureTip();
    var rect = element.getBoundingClientRect();
    var width = node.offsetWidth;
    var height = node.offsetHeight;
    var left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    var top = rect.top - height - 10;
    if (top < 12) { top = rect.bottom + 10; }
    if (top + height > window.innerHeight - 12) { top = Math.max(12, window.innerHeight - height - 12); }
    node.style.left = left + "px";
    node.style.top = top + "px";
  }

  function show(element) {
    if (!element || !element.getAttribute("data-tip")) { return; }
    window.clearTimeout(hideTimer);
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(function () {
      var node = ensureTip();
      node.innerHTML = contentFor(element);
      node.hidden = false;
      node.classList.add("is-visible");
      active = element;
      element.setAttribute("aria-describedby", "ui-tip");
      place(element);
    }, 90);
  }

  function hide(element) {
    window.clearTimeout(showTimer);
    if (!active || (element && element !== active)) { return; }
    hideTimer = window.setTimeout(function () {
      var node = ensureTip();
      node.classList.remove("is-visible");
      node.hidden = true;
      if (active) { active.removeAttribute("aria-describedby"); }
      active = null;
    }, 60);
  }

  function closestTip(node) {
    return node && node.closest ? node.closest("[data-tip]") : null;
  }

  document.addEventListener("pointerover", function (event) {
    var element = closestTip(event.target);
    if (element && !element.contains(event.relatedTarget)) { show(element); }
  });
  document.addEventListener("pointerout", function (event) {
    var element = closestTip(event.target);
    if (element && !element.contains(event.relatedTarget)) { hide(element); }
  });
  document.addEventListener("focusin", function (event) {
    var element = closestTip(event.target);
    if (element) { show(element); }
  });
  document.addEventListener("focusout", function (event) {
    var element = closestTip(event.target);
    if (element) { hide(element); }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      var node = ensureTip();
      node.classList.remove("is-visible");
      node.hidden = true;
      if (active) { active.removeAttribute("aria-describedby"); }
      active = null;
    }
  });
  window.addEventListener("scroll", function () {
    if (active) { place(active); }
  }, { passive: true });
  window.addEventListener("resize", function () {
    if (active) { place(active); }
  });

  /* Native title attributes on generated controls would duplicate the tooltip.
     Keep the accessible name on the element, but remove only the browser title. */
  function stripTitle(root) {
    $$("[data-tip][title]", root).forEach(function (element) { element.removeAttribute("title"); });
  }
  document.addEventListener("DOMContentLoaded", function () { stripTitle(document); });
  if (document.readyState !== "loading") { stripTitle(document); }

  /* Smooth activation feedback for segmented controls, independent of the
     specific simulation. The visual state itself stays in the page tools. */
  document.addEventListener("click", function (event) {
    var segmented = event.target.closest ? event.target.closest(".speed-group, .scene-speed") : null;
    if (!segmented) { return; }
    $$("button", segmented).forEach(function (button) {
      button.setAttribute("aria-pressed", button === event.target.closest("button") ? "true" : "false");
    });
  });

  window.BioQoL = {
    tip: function (element, title, text) {
      if (!element) { return; }
      if (title) { element.setAttribute("data-tip-title", title); }
      element.setAttribute("data-tip", text || "");
    }
  };
})();
