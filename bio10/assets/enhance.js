/* Biologie 10 · shared interaction layer.
   Adds one accessible, fixed-position tooltip for [data-tip] and for the 3D scenes.
   The native title attribute is intentionally not used: it is slow, unstyled and
   cannot carry the Hallmark typography. */
(function () {
  "use strict";

  var tip = document.createElement("div");
  tip.className = "ui-tip";
  tip.id = "ui-tip";
  tip.setAttribute("role", "tooltip");
  tip.setAttribute("aria-hidden", "true");
  document.body.appendChild(tip);

  var active = null;
  var lastX = 0;
  var lastY = 0;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function place(x, y) {
    lastX = x;
    lastY = y;
    var width = tip.offsetWidth || 320;
    var height = tip.offsetHeight || 120;
    var margin = 14;
    var left = x + 16;
    var top = y + 16;
    if (left + width > window.innerWidth - margin) {
      left = x - width - 16;
    }
    if (left < margin) {
      left = margin;
    }
    if (top + height > window.innerHeight - margin) {
      top = y - height - 16;
    }
    if (top < margin) {
      top = margin;
    }
    tip.style.left = Math.round(left) + "px";
    tip.style.top = Math.round(top) + "px";
  }

  function render(title, text) {
    tip.textContent = "";
    if (title) {
      var strong = document.createElement("strong");
      strong.textContent = title;
      tip.appendChild(strong);
    }
    if (text) {
      var body = document.createElement("span");
      body.textContent = text;
      tip.appendChild(body);
    }
  }

  function show(title, text, x, y) {
    if (!title && !text) {
      return;
    }
    render(title, text);
    tip.setAttribute("aria-hidden", "false");
    tip.setAttribute("data-visible", "true");
    place(x, y);
  }

  function showElement(element) {
    var title = element.getAttribute("data-tip-title") || "";
    var text = element.getAttribute("data-tip") || "";
    if (!text && !title) {
      return;
    }
    active = element;
    element.setAttribute("aria-describedby", "ui-tip");
    var rect = element.getBoundingClientRect();
    show(title, text, rect.left + Math.min(rect.width / 2, 160), rect.bottom);
  }

  function hide() {
    if (active) {
      active.removeAttribute("aria-describedby");
    }
    active = null;
    tip.setAttribute("data-visible", "false");
    tip.setAttribute("aria-hidden", "true");
  }

  function move(x, y) {
    if (tip.getAttribute("data-visible") === "true") {
      place(x, y);
    }
  }

  function bind(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll("[data-tip], [data-tip-title]");
    Array.prototype.forEach.call(nodes, function (element) {
      if (element.dataset.tipBound === "true") {
        return;
      }
      element.dataset.tipBound = "true";
      element.addEventListener("pointerenter", function (event) {
        if (event.pointerType === "touch") {
          return;
        }
        active = element;
        element.setAttribute("aria-describedby", "ui-tip");
        var title = element.getAttribute("data-tip-title") || "";
        var text = element.getAttribute("data-tip") || "";
        show(title, text, event.clientX, event.clientY);
      });
      element.addEventListener("pointermove", function (event) {
        if (active === element) {
          place(event.clientX, event.clientY);
        }
      });
      element.addEventListener("pointerleave", function () {
        if (active === element) {
          hide();
        }
      });
      element.addEventListener("focusin", function () {
        showElement(element);
      });
      element.addEventListener("focusout", function () {
        if (active === element) {
          hide();
        }
      });
    });
  }

  document.addEventListener("scroll", function () {
    if (active) {
      hide();
    }
  }, { passive: true });
  window.addEventListener("resize", function () {
    if (active) {
      hide();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      hide();
    }
  });

  bind(document);

  if (window.MutationObserver) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes, function (node) {
          if (node.nodeType !== 1) {
            return;
          }
          if (node.matches && node.matches("[data-tip], [data-tip-title]")) {
            bind(node.parentNode || document);
          } else if (node.querySelectorAll) {
            bind(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.BioTips = {
    show: show,
    hide: hide,
    move: move,
    bind: bind,
    element: tip,
    last: function () { return { x: lastX, y: lastY }; }
  };
})();
