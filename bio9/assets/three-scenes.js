/* Three.js instruments for Biologie 9.
   Every scene is user-controlled, has a still fallback in the markup, and stops when its station is hidden.
   v2: delta-time animation, damped camera, raycast tooltips, per-scene control bar. */
(function () {
  "use strict";

  var TAU = Math.PI * 2;

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  function tokenColor(name) {
    var probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.backgroundColor = "var(" + name + ")";
    document.body.appendChild(probe);
    var value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    try {
      var canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      var pixel = ctx.getImageData(0, 0, 1, 1).data;
      return "rgb(" + pixel[0] + "," + pixel[1] + "," + pixel[2] + ")";
    } catch (error) {
      return "rgb(40,40,40)";
    }
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function damp(current, target, lambda, dt) {
    if (dt <= 0) { return current; }
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function makeRenderer(container) {
    if (!window.THREE) { return null; }
    try {
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (THREE.sRGBEncoding) { renderer.outputEncoding = THREE.sRGBEncoding; }
      container.appendChild(renderer.domElement);
      return renderer;
    } catch (error) {
      return null;
    }
  }

  function fit(renderer, camera, container) {
    var width = Math.max(1, container.clientWidth);
    var height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function ensureCanvasSize(renderer, resize) {
    if (renderer.domElement.width <= 1 || renderer.domElement.height <= 1) { resize(); }
  }

  function standard(color, options) {
    var settings = { color: color, roughness: 0.62, metalness: 0.02 };
    if (options) {
      Object.keys(options).forEach(function (key) { settings[key] = options[key]; });
    }
    return new THREE.MeshStandardMaterial(settings);
  }

  /* ---------- legacy scene setup (kept for older instruments) ---------- */
  function setup(container, cameraPosition, target) {
    var renderer = makeRenderer(container);
    if (!renderer) { return null; }
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !reducedMotion();
    controls.dampingFactor = 0.08;
    controls.minDistance = 6;
    controls.maxDistance = 30;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(target[0], target[1], target[2]);
    scene.add(new THREE.AmbientLight(0xffffff, 0.68));
    var hemi = new THREE.HemisphereLight(tokenColor("--color-paper-2"), tokenColor("--color-ink-2"), 0.42);
    scene.add(hemi);
    var light = new THREE.DirectionalLight(0xffffff, 0.7);
    light.position.set(6, 12, 8);
    scene.add(light);
    var fallback = container.querySelector(".tool__fallback");
    var visible = true;
    function resize() {
      fit(renderer, camera, container);
      if (fallback && container.clientWidth > 1 && container.clientHeight > 1) { fallback.hidden = true; }
    }
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(container); } else { window.addEventListener("resize", resize); }
    resize();
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting; });
      }, { rootMargin: "80px" }).observe(container);
    }
    function loop(update) {
      var renderedOnce = false;
      function frame() {
        if (visible && container.offsetParent !== null) {
          ensureCanvasSize(renderer, resize);
          if (update) { update(); }
          controls.update();
          renderer.render(scene, camera);
          renderedOnce = true;
        } else if (!renderedOnce && container.offsetParent !== null && container.clientWidth > 1 && container.clientHeight > 1) {
          ensureCanvasSize(renderer, resize);
          if (update) { update(); }
          renderer.render(scene, camera);
          renderedOnce = true;
        }
        window.requestAnimationFrame(frame);
      }
      window.requestAnimationFrame(frame);
    }
    return { renderer: renderer, scene: scene, camera: camera, controls: controls, resize: resize, loop: loop, visible: function () { return visible; } };
  }

  /* ---------- shared interactive stage ---------- */
  function Stage(container, options) {
    var settings = options || {};
    var renderer = makeRenderer(container);
    if (!renderer) { return null; }

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(settings.fov || 38, 1, 0.1, 200);
    var home = (settings.camera || [0, 3, 12]).slice();
    camera.position.set(home[0], home[1], home[2]);

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !reducedMotion();
    controls.dampingFactor = settings.damping || 0.075;
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 0.82;
    controls.minDistance = settings.minDistance || 5.5;
    controls.maxDistance = settings.maxDistance || 24;
    controls.minPolarAngle = settings.minPolarAngle || 0.18;
    controls.maxPolarAngle = settings.maxPolarAngle || Math.PI * 0.485;
    var homeTarget = new THREE.Vector3(
      (settings.target || [0, 0, 0])[0],
      (settings.target || [0, 0, 0])[1],
      (settings.target || [0, 0, 0])[2]
    );
    controls.target.copy(homeTarget);
    controls.update();

    var paper = new THREE.Color(tokenColor("--color-paper"));
    var paper2 = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var ink2 = new THREE.Color(tokenColor("--color-ink-2"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var rule2 = new THREE.Color(tokenColor("--color-rule-2"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var water = new THREE.Color(tokenColor("--color-water"));

    scene.add(new THREE.HemisphereLight(paper, ink2, 0.5));
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    var key = new THREE.DirectionalLight(0xfffaf0, 0.84);
    key.position.set(7, 13, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 46;
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.bias = -0.0006;
    key.target.position.copy(homeTarget);
    scene.add(key);
    scene.add(key.target);
    var fill = new THREE.DirectionalLight(0xffffff, 0.2);
    fill.position.set(-9, 5, -7);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(accent, 0.12);
    rim.position.set(2, 5, -10);
    scene.add(rim);

    var shadowPlane = null;
    if (settings.shadowPlane !== false) {
      shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(settings.groundSize || 16, settings.groundSize || 16),
        new THREE.ShadowMaterial({ color: 0x000000, opacity: settings.shadowOpacity || 0.16 })
      );
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = settings.groundY === undefined ? -0.02 : settings.groundY;
      shadowPlane.receiveShadow = true;
      scene.add(shadowPlane);
    }

    var figure = container.closest("figure");
    var readout = figure ? figure.querySelector(settings.readout || "[data-scene-readout]") : null;
    function setReadout(html) { if (readout) { readout.innerHTML = html; } }

    var tooltip = document.createElement("div");
    tooltip.className = "scene-tooltip";
    tooltip.setAttribute("role", "tooltip");
    container.appendChild(tooltip);

    var hint = document.createElement("div");
    hint.className = "scene-hint";
    hint.textContent = settings.hint || "Ziehen: drehen · Scrollen: zoomen · Bauteil antippen";
    container.appendChild(hint);

    var haloMaterial = new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0, depthWrite: false });
    var halo = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), haloMaterial);
    halo.visible = false;
    scene.add(halo);

    var parts = [];
    var pickables = [];
    var hovered = null;
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var hoverBox = new THREE.Box3();
    var hoverSize = new THREE.Vector3();
    var hoverCenter = new THREE.Vector3();
    var pointerDown = null;
    var canvas = renderer.domElement;

    function registerPart(object, data) {
      var part = {
        key: data.key,
        object: object,
        title: data.title || "",
        text: data.text || "",
        hint: data.hint || "Klicken zeigt die Funktion im Lesetext.",
        onSelect: data.onSelect || null,
        shell: Boolean(data.shell),
        data: data
      };
      object.traverse(function (child) {
        if (child.isMesh || child.isLine || child.isPoints) {
          child.userData.scenePart = part;
          pickables.push(child);
        }
      });
      parts.push(part);
      return part;
    }

    function findPart(key) {
      for (var i = 0; i < parts.length; i += 1) { if (parts[i].key === key) { return parts[i]; } }
      return null;
    }

    function tooltipAt(event) {
      var rect = container.getBoundingClientRect();
      var left = event.clientX - rect.left + 16;
      var top = event.clientY - rect.top + 16;
      tooltip.style.left = "0px";
      tooltip.style.top = "0px";
      var width = tooltip.offsetWidth;
      var height = tooltip.offsetHeight;
      if (left + width > rect.width - 8) { left = Math.max(8, event.clientX - rect.left - width - 16); }
      if (top + height > rect.height - 8) { top = Math.max(8, event.clientY - rect.top - height - 16); }
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }

    function showTooltip(part, event) {
      tooltip.innerHTML = "<strong>" + part.title + "</strong><span>" + part.text + "</span><em>" + part.hint + "</em>";
      tooltip.classList.add("is-visible");
      if (event) {
        tooltip.style.transform = "";
        tooltipAt(event);
      } else {
        tooltip.style.transform = "";
        tooltip.style.left = Math.max(8, (container.clientWidth - tooltip.offsetWidth) / 2) + "px";
        tooltip.style.top = Math.max(8, (container.clientHeight - tooltip.offsetHeight) / 2) + "px";
      }
    }

    function hideTooltip() {
      tooltip.classList.remove("is-visible");
      tooltip.style.transform = "";
    }

    function pointAt(event) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function isVisible(object) {
      var node = object;
      while (node) {
        if (node.visible === false) { return false; }
        node = node.parent;
      }
      return true;
    }

    function partAt(event) {
      pointAt(event);
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(pickables, false);
      var firstShell = null;
      for (var i = 0; i < hits.length; i += 1) {
        if (!isVisible(hits[i].object) || !hits[i].object.userData.scenePart) { continue; }
        var part = hits[i].object.userData.scenePart;
        if (!part.shell) { return part; }
        if (!firstShell) { firstShell = part; }
      }
      return firstShell;
    }

    function hover(part, event) {
      if (part === hovered) {
        if (part && event) { tooltipAt(event); }
        return;
      }
      hovered = part;
      canvas.classList.toggle("is-pointing", Boolean(part));
      if (part) { showTooltip(part, event); }
      else { hideTooltip(); }
    }

    function select(part) {
      if (!part) { return; }
      if (part.onSelect) { part.onSelect(part); }
      else { setReadout("<strong>" + part.title + ".</strong> " + part.text); }
      hover(part, null);
      window.setTimeout(function () { if (hovered === part) { hover(null, null); } }, 2600);
    }

    canvas.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch" && event.buttons) { return; }
      hover(partAt(event), event);
    });
    canvas.addEventListener("pointerleave", function () { hover(null, null); });
    canvas.addEventListener("pointerdown", function (event) {
      pointerDown = { x: event.clientX, y: event.clientY, time: performance.now() };
    });
    canvas.addEventListener("pointerup", function (event) {
      if (!pointerDown) { return; }
      var moved = Math.abs(event.clientX - pointerDown.x) + Math.abs(event.clientY - pointerDown.y);
      var quick = performance.now() - pointerDown.time < 700;
      pointerDown = null;
      if (moved < 7 && quick) { select(partAt(event)); }
    });
    canvas.addEventListener("pointercancel", function () { pointerDown = null; });

    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", settings.ariaLabel || "Interaktives 3D-Modell. Mit den Pfeiltasten nicht bedienbar; nutze die Schaltflächen der Seite.");
    canvas.tabIndex = 0;

    /* ---------- toolbar ---------- */
    var toolbar = document.createElement("div");
    toolbar.className = "scene-ui";
    container.appendChild(toolbar);

    function icon(kind) {
      if (kind === "pause") {
        return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="4" y="3" width="3" height="10" fill="currentColor"></rect><rect x="9" y="3" width="3" height="10" fill="currentColor"></rect></svg>';
      }
      if (kind === "play") {
        return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 3l8 5-8 5z" fill="currentColor"></path></svg>';
      }
      return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8a5 5 0 1 0 1.6-3.7" fill="none" stroke="currentColor" stroke-width="1.6"></path><path d="M3 2v3.5h3.5" fill="none" stroke="currentColor" stroke-width="1.6"></path></svg>';
    }

    var paused = reducedMotion();
    var speed = 1;
    var pauseButton = document.createElement("button");
    pauseButton.type = "button";
    pauseButton.className = "scene-btn";
    pauseButton.dataset.sceneToggle = "";
    pauseButton.setAttribute("aria-pressed", "false");
    pauseButton.setAttribute("aria-label", "Animation pausieren");
    pauseButton.setAttribute("data-tip", "Pausiert alle Bewegungen im Modell. Drehen und Zoomen bleiben möglich.");
    pauseButton.innerHTML = icon("pause") + "<span>Pause</span>";
    toolbar.appendChild(pauseButton);

    function renderPause() {
      pauseButton.innerHTML = icon(paused ? "play" : "pause") + "<span>" + (paused ? "Weiter" : "Pause") + "</span>";
      pauseButton.setAttribute("aria-pressed", paused ? "true" : "false");
      pauseButton.setAttribute("aria-label", paused ? "Animation fortsetzen" : "Animation pausieren");
    }
    function setPaused(value) { paused = Boolean(value); renderPause(); }
    renderPause();
    pauseButton.addEventListener("click", function () { setPaused(!paused); });

    var speedGroup = document.createElement("div");
    speedGroup.className = "scene-speed";
    speedGroup.setAttribute("role", "group");
    speedGroup.setAttribute("aria-label", "Animationsgeschwindigkeit");
    [0.5, 1, 2].forEach(function (value) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "scene-btn";
      button.dataset.sceneSpeed = String(value);
      button.setAttribute("aria-pressed", value === 1 ? "true" : "false");
      button.setAttribute("data-tip", "Animationsgeschwindigkeit " + String(value).replace(".", ",") + "×. Beeinflusst nur die Bewegung, nicht die Fachinhalte.");
      button.textContent = String(value).replace(".", ",") + "×";
      button.addEventListener("click", function () {
        speed = value;
        $$("[data-scene-speed]", toolbar).forEach(function (inner) {
          inner.setAttribute("aria-pressed", Number(inner.dataset.sceneSpeed) === speed ? "true" : "false");
        });
      });
      speedGroup.appendChild(button);
    });
    toolbar.appendChild(speedGroup);

    var resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "scene-btn scene-btn--icon";
    resetButton.dataset.sceneReset = "";
    resetButton.setAttribute("aria-label", "Kamera in die Ausgangsansicht zurückführen");
    resetButton.setAttribute("data-tip", "Fährt die Kamera weich in die Startansicht zurück. Das Modell bleibt erhalten.");
    resetButton.innerHTML = icon("reset");
    toolbar.appendChild(resetButton);

    var resetTween = null;
    function resetView() {
      resetTween = {
        t: 0,
        duration: 0.75,
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone()
      };
    }
    resetButton.addEventListener("click", resetView);
    controls.addEventListener("start", function () { resetTween = null; });

    function addAction(config) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "scene-btn";
      if (config.pressed) { button.setAttribute("aria-pressed", "true"); }
      if (config.tip) { button.setAttribute("data-tip", config.tip); }
      button.textContent = config.label;
      button.addEventListener("click", function () { config.onClick(button); });
      toolbar.appendChild(button);
      return button;
    }

    var updates = [];
    function addUpdate(fn) { updates.push(fn); return fn; }

    var visible = true;
    var time = 0;
    var clock = new THREE.Clock();

    /* Paint one frame after the scene function has added its meshes. This also
       gives a correct still image when the browser throttles rAF in a background tab. */
    if (window.Promise) {
      Promise.resolve().then(function () {
        resize();
        controls.update();
        renderer.render(scene, camera);
      });
    }

    function resize() {
      fit(renderer, camera, container);
      var fallback = container.querySelector(".tool__fallback");
      if (fallback && container.clientWidth > 1 && container.clientHeight > 1) { fallback.hidden = true; }
    }
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(container); } else { window.addEventListener("resize", resize); }
    resize();
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting; });
        if (visible) {
          resize();
          renderer.render(scene, camera);
        }
      }, { rootMargin: "100px" }).observe(container);
    }
    var station = container.closest(".station");
    if (station && window.MutationObserver) {
      new MutationObserver(function () {
        if (station.classList.contains("is-active")) {
          visible = true;
          resize();
          controls.update();
          renderer.render(scene, camera);
        }
      }).observe(station, { attributes: true, attributeFilter: ["class"] });
    }

    function frame() {
      window.requestAnimationFrame(frame);
      var realDt = Math.min(clock.getDelta(), 0.05);
      if (!visible || container.offsetParent === null) { return; }
      ensureCanvasSize(renderer, resize);
      var simDt = paused ? 0 : realDt * speed;
      time += simDt;

      if (resetTween) {
        resetTween.t += realDt;
        var k = easeInOutCubic(clamp(resetTween.t / resetTween.duration, 0, 1));
        camera.position.lerpVectors(resetTween.fromPosition, new THREE.Vector3(home[0], home[1], home[2]), k);
        controls.target.lerpVectors(resetTween.fromTarget, homeTarget, k);
        if (k >= 1) { resetTween = null; }
      }

      for (var i = 0; i < updates.length; i += 1) { updates[i](simDt, time, realDt, paused); }

      var haloOpacity = 0;
      if (hovered) {
        hoverBox.setFromObject(hovered.object);
        if (!hoverBox.isEmpty()) {
          hoverBox.getSize(hoverSize);
          hoverBox.getCenter(hoverCenter);
          halo.position.copy(hoverCenter);
          var radius = Math.max(hoverSize.x, hoverSize.y, hoverSize.z) * 0.56 + 0.04;
          halo.scale.setScalar(radius);
          halo.visible = true;
          haloOpacity = 0.32;
        }
      }
      haloMaterial.opacity = damp(haloMaterial.opacity, haloOpacity, 16, realDt);
      if (haloMaterial.opacity < 0.01) { halo.visible = false; }

      controls.update();
      renderer.render(scene, camera);
    }
    window.requestAnimationFrame(frame);

    return {
      scene: scene,
      camera: camera,
      renderer: renderer,
      controls: controls,
      colors: { paper: paper, paper2: paper2, paper3: paper3, ink: ink, ink2: ink2, muted: muted, rule2: rule2, accent: accent, water: water },
      registerPart: registerPart,
      findPart: findPart,
      setReadout: setReadout,
      addAction: addAction,
      addUpdate: addUpdate,
      resetView: resetView,
      setPaused: setPaused,
      setSpeed: function (value) { speed = value; },
      focusPart: function (key) { var part = findPart(key); if (part) { select(part); } },
      selectPart: select,
      time: function () { return time; },
      visible: function () { return visible; }
    };
  }

  /* =====================================================================
     Legacy instruments (Biologie 8 scenes kept in this asset for safety)
     ===================================================================== */

  function neuronScene(container) {
    var base = setup(container, [2, 3, 14], [2, 0, 0]);
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var soma = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 18), new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.65 }));
    base.scene.add(soma);
    var nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 }));
    nucleus.position.set(-0.1, 0.1, 0.5);
    base.scene.add(nucleus);
    function branch(start, direction, length, depth, group) {
      var end = start.clone().add(direction.clone().normalize().multiplyScalar(length));
      var dir = new THREE.Vector3().subVectors(end, start);
      var cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * depth, 0.11 * depth, dir.length(), 7), new THREE.MeshStandardMaterial({ color: ink, roughness: 0.6 }));
      cyl.position.copy(start).add(end).multiplyScalar(0.5);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      group.add(cyl);
      if (depth > 1) {
        var left = direction.clone().add(new THREE.Vector3(0.4, 0.7, 0.1)).normalize();
        var right = direction.clone().add(new THREE.Vector3(-0.3, 0.5, -0.2)).normalize();
        branch(end, left, length * 0.62, depth - 1, group);
        branch(end, right, length * 0.55, depth - 1, group);
      }
    }
    var dendrites = new THREE.Group();
    base.scene.add(dendrites);
    var directions = [
      new THREE.Vector3(-1, 0.7, 0.2), new THREE.Vector3(-0.8, -0.7, -0.3), new THREE.Vector3(-0.4, 1.0, -0.2),
      new THREE.Vector3(-0.2, -1.0, 0.4), new THREE.Vector3(-1, 0.1, 0.8), new THREE.Vector3(-0.9, -0.2, -0.8)
    ];
    directions.forEach(function (direction) { branch(new THREE.Vector3(-0.9, 0, 0), direction, 1.6, 3, dendrites); });
    var axon = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 7.5, 10), new THREE.MeshStandardMaterial({ color: ink, roughness: 0.6 }));
    axon.position.set(4.8, 0, 0);
    axon.rotation.z = Math.PI / 2;
    base.scene.add(axon);
    var myelinGroup = new THREE.Group();
    base.scene.add(myelinGroup);
    for (var m = 0; m < 5; m += 1) {
      var sheath = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.05, 10), new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.7 }));
      sheath.position.set(2.4 + m * 1.35, 0, 0);
      sheath.rotation.z = Math.PI / 2;
      myelinGroup.add(sheath);
    }
    var terminals = new THREE.Group();
    base.scene.add(terminals);
    [new THREE.Vector3(8.5, 0.7, 0.3), new THREE.Vector3(8.5, -0.7, -0.3), new THREE.Vector3(8.5, 0, 0.8)].forEach(function (position) {
      var end = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 }));
      end.position.copy(position);
      terminals.add(end);
    });
    var pulse = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 }));
    pulse.visible = false;
    base.scene.add(pulse);
    var fireButton = figure ? figure.querySelector("[data-neuron-fire]") : null;
    var resetButton = figure ? figure.querySelector("[data-neuron-reset]") : null;
    var myelinInput = figure ? figure.querySelector("[data-neuron-myelin]") : null;
    var readout = figure ? figure.querySelector("[data-neuron-readout]") : null;
    var running = false;
    var progress = 0;
    function setReadout(html) { if (readout) { readout.innerHTML = html; } }
    function fire() {
      if (running) { return; }
      running = true;
      progress = 0;
      pulse.visible = true;
      setReadout("<strong>Reiz unterwegs.</strong> Der Reiz läuft vom Soma über das Axon zu den Endknöpfchen. Die Myelinscheiden beschleunigen die Weiterleitung.");
    }
    function reset() {
      running = false;
      progress = 0;
      pulse.visible = false;
      setReadout("Drücke „Reiz auslösen“, um die Weiterleitung zu starten.");
    }
    if (fireButton) { fireButton.addEventListener("click", fire); }
    if (resetButton) { resetButton.addEventListener("click", reset); }
    if (myelinInput) {
      myelinInput.addEventListener("change", function () {
        myelinGroup.visible = myelinInput.checked;
        setReadout(myelinInput.checked ? "Mit Myelin: Die Erregung springt schneller von Schnürring zu Schnürring." : "Ohne Myelin: Die Erregung läuft kontinuierlich entlang des Axons und ist langsamer.");
      });
    }
    setReadout("Drücke „Reiz auslösen“, um die Weiterleitung zu starten.");
    base.loop(function () {
      if (running) {
        progress += 0.012;
        var x = -0.8 + progress * 9.3;
        pulse.position.set(x, Math.sin(progress * Math.PI * 6) * 0.08, 0);
        if (progress >= 1) {
          running = false;
          pulse.visible = false;
          setReadout("<strong>Angekommen.</strong> An den Endknöpfchen wird der elektrische Reiz auf die nächste Zelle übertragen, meist über eine Synapse.");
        }
      }
    });
    return { fire: fire, reset: reset };
  }

  function eyeScene(container) {
    var base = setup(container, [0, 0.5, 11], [0, 0, 0]);
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var sclera = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 32, 24),
      new THREE.MeshStandardMaterial({ color: paper, transparent: true, opacity: 0.18, roughness: 0.5, depthWrite: false })
    );
    base.scene.add(sclera);
    var wire = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 20, 14),
      new THREE.MeshBasicMaterial({ color: muted, wireframe: true, transparent: true, opacity: 0.28 })
    );
    base.scene.add(wire);
    var retina = new THREE.Mesh(new THREE.CircleGeometry(2.25, 32), new THREE.MeshStandardMaterial({ color: muted, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    retina.position.z = -2.2;
    base.scene.add(retina);
    var iris = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.18, 8, 32), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.45 }));
    iris.position.z = 2.42;
    base.scene.add(iris);
    var pupil = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: ink }));
    pupil.position.z = 2.43;
    base.scene.add(pupil);
    var lens = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 18), new THREE.MeshStandardMaterial({ color: paper3, transparent: true, opacity: 0.72, roughness: 0.35 }));
    lens.position.z = 1.55;
    lens.scale.z = 0.55;
    base.scene.add(lens);
    var nerve = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 3.2, 10), new THREE.MeshStandardMaterial({ color: ink, roughness: 0.6 }));
    nerve.position.set(1.7, 0.2, -3.4);
    nerve.rotation.x = Math.PI / 2;
    base.scene.add(nerve);
    var rayGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.6, 0, 6), new THREE.Vector3(-0.6, 0, 1.55), new THREE.Vector3(0, 0, -2.2),
      new THREE.Vector3(0.6, 0, 6), new THREE.Vector3(0.6, 0, 1.55), new THREE.Vector3(0, 0, -2.2)
    ]);
    var rays = new THREE.LineSegments(rayGeometry, new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.9 }));
    base.scene.add(rays);
    var buttons = figure ? $$("[data-eye-mode]", figure) : [];
    var readout = figure ? figure.querySelector("[data-eye-readout]") : null;
    var modes = {
      near: { lens: 0.72, focus: -2.2, text: "Nahsehen: Die Linse ist stärker gekrümmt. Das Licht wird stärker gebrochen und trifft scharf auf die Netzhaut." },
      far: { lens: 0.42, focus: -2.2, text: "Fernsehen: Die Linse ist flacher. Das Licht wird weniger stark gebrochen und trifft scharf auf die Netzhaut." },
      myopia: { lens: 0.85, focus: -1.2, text: "Kurzsichtigkeit: Das Bild entsteht vor der Netzhaut. Ferne Gegenstände sind unscharf; eine Zerstreuungslinse kann korrigieren." },
      hyperopia: { lens: 0.3, focus: -3.3, text: "Weitsichtigkeit: Das Bild würde hinter der Netzhaut entstehen. Nahe Gegenstände sind unscharf; eine Sammellinse kann korrigieren." }
    };
    function setMode(key) {
      var mode = modes[key] || modes.far;
      lens.scale.z = mode.lens;
      var focus = mode.focus;
      rayGeometry.setFromPoints([
        new THREE.Vector3(-0.6, 0, 6), new THREE.Vector3(-0.6, 0, 1.55), new THREE.Vector3(0, 0, focus),
        new THREE.Vector3(0.6, 0, 6), new THREE.Vector3(0.6, 0, 1.55), new THREE.Vector3(0, 0, focus)
      ]);
      rayGeometry.attributes.position.needsUpdate = true;
      buttons.forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.eyeMode === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + (key === "near" ? "Nah" : key === "far" ? "Fern" : key === "myopia" ? "Kurzsichtig" : "Weitsichtig") + ".</strong> " + mode.text; }
    }
    buttons.forEach(function (button) { button.addEventListener("click", function () { setMode(button.dataset.eyeMode); }); });
    setMode("far");
    base.loop(null);
    return { setMode: setMode };
  }

  function earScene(container) {
    var base = setup(container, [0, 4, 14], [0, 0, 0]);
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var pinna = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.28, 10, 32), new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.65 }));
    pinna.position.x = -4.2;
    pinna.rotation.y = Math.PI / 2;
    base.scene.add(pinna);
    var canal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.4, 12), new THREE.MeshStandardMaterial({ color: paper, roughness: 0.6 }));
    canal.position.x = -2.3;
    canal.rotation.z = Math.PI / 2;
    base.scene.add(canal);
    var drum = new THREE.Mesh(new THREE.CircleGeometry(0.82, 24), new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.5, side: THREE.DoubleSide }));
    drum.position.x = -0.5;
    drum.rotation.y = Math.PI / 2;
    base.scene.add(drum);
    var ossicles = new THREE.Group();
    base.scene.add(ossicles);
    [new THREE.Vector3(0.0, 0.2, 0), new THREE.Vector3(0.7, -0.1, 0.2), new THREE.Vector3(1.35, 0.2, -0.1)].forEach(function (position) {
      var bone = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.55 }));
      bone.position.copy(position);
      ossicles.add(bone);
    });
    var cochleaPoints = [];
    for (var c = 0; c <= 120; c += 1) {
      var t = c / 120;
      var angle = t * 5 * Math.PI * 2;
      cochleaPoints.push(new THREE.Vector3(2.2 + t * 1.4, Math.cos(angle) * 0.75, Math.sin(angle) * 0.75));
    }
    var cochlea = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cochleaPoints), 180, 0.16, 8, false),
      new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 })
    );
    base.scene.add(cochlea);
    var nerve = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.4, 10), new THREE.MeshStandardMaterial({ color: ink, roughness: 0.6 }));
    nerve.position.set(4.8, 0, 0);
    nerve.rotation.z = Math.PI / 2;
    base.scene.add(nerve);
    var waves = new THREE.Group();
    base.scene.add(waves);
    for (var w = 0; w < 4; w += 1) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.6 + w * 0.35, 0.035, 6, 32), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.7 }));
      ring.position.x = -8 + w * 0.7;
      ring.rotation.y = Math.PI / 2;
      waves.add(ring);
    }
    var playButton = figure ? figure.querySelector("[data-ear-play]") : null;
    var loudButton = figure ? figure.querySelector("[data-ear-loud]") : null;
    var highButton = figure ? figure.querySelector("[data-ear-high]") : null;
    var readout = figure ? figure.querySelector("[data-ear-readout]") : null;
    var playing = false;
    var loud = false;
    var high = false;
    function setReadout(html) { if (readout) { readout.innerHTML = html; } }
    function play() {
      playing = true;
      setReadout("<strong>Schall unterwegs.</strong> Die Schallwellen treffen auf das Trommelfell. Die Gehörknöchelchen übertragen die Schwingung auf die Cochlea, dort entstehen Nervensignale." + (loud ? " Bei hoher Lautstärke steigt das Risiko für Hörschäden." : ""));
    }
    if (playButton) { playButton.addEventListener("click", play); }
    if (loudButton) {
      loudButton.addEventListener("click", function () {
        loud = !loud;
        loudButton.setAttribute("aria-pressed", loud ? "true" : "false");
        setReadout(loud ? "Laut: Hohe Schallpegel können die Haarzellen in der Cochlea schädigen. Das Gehör erholt sich nicht immer." : "Leise: Ein niedriger Schallpegel ist für das Gehör unproblematisch.");
      });
    }
    if (highButton) {
      highButton.addEventListener("click", function () {
        high = !high;
        highButton.setAttribute("aria-pressed", high ? "true" : "false");
        setReadout(high ? "Hoher Ton: Die Schallwellen sind schnell. Hohe Frequenzen werden vor allem am Anfang der Cochlea wahrgenommen." : "Tiefer Ton: Die Schallwellen sind langsam. Tiefe Frequenzen werden weiter in der Cochlea wahrgenommen.");
      });
    }
    setReadout("Starte einen Ton. Die Schallwellen wandern vom Außenohr über das Trommelfell und die Gehörknöchelchen zur Cochlea.");
    var phase = 0;
    base.loop(function () {
      if (playing) {
        phase += 0.025;
        waves.children.forEach(function (ring, index) {
          var x = -8 + ((phase * 4 + index * 0.9) % 4);
          ring.position.x = x;
          var scale = high ? 0.55 : 1;
          ring.scale.setScalar(scale);
          ring.material.opacity = loud ? 0.95 : 0.55;
        });
      }
    });
    return { play: play };
  }

  function synapseScene(container) {
    var base = setup(container, [0, 2, 12], [0, 0, 0]);
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var terminal = new THREE.Mesh(new THREE.SphereGeometry(2.1, 24, 18), new THREE.MeshStandardMaterial({ color: paper3, transparent: true, opacity: 0.32, roughness: 0.5, depthWrite: false }));
    terminal.position.x = -3;
    base.scene.add(terminal);
    var membrane = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.4, 3.4), new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.65 }));
    membrane.position.x = 2.2;
    base.scene.add(membrane);
    var receptors = new THREE.Group();
    base.scene.add(receptors);
    for (var r = 0; r < 4; r += 1) {
      var receptor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 }));
      receptor.position.set(1.95, -1.2 + r * 0.8, 0.5);
      receptor.rotation.z = Math.PI / 2;
      receptors.add(receptor);
    }
    var vesicles = new THREE.Group();
    base.scene.add(vesicles);
    var vesicleGeo = new THREE.SphereGeometry(0.16, 10, 8);
    var vesicleMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.45 });
    for (var v = 0; v < 8; v += 1) {
      var vesicle = new THREE.Mesh(vesicleGeo, vesicleMat);
      vesicle.position.set(-4 + (v % 3) * 0.5, -1 + Math.floor(v / 3) * 0.6, 0.3);
      vesicles.add(vesicle);
    }
    var transmitters = new THREE.Group();
    base.scene.add(transmitters);
    var transGeo = new THREE.SphereGeometry(0.11, 10, 8);
    var transMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 });
    for (var t = 0; t < 8; t += 1) {
      var transmitter = new THREE.Mesh(transGeo, transMat);
      transmitter.visible = false;
      transmitter.userData.start = new THREE.Vector3(-2.2, -1.1 + (t % 4) * 0.7, 0.4);
      transmitter.userData.end = new THREE.Vector3(1.85, -1.1 + (t % 4) * 0.7, 0.5);
      transmitter.position.copy(transmitter.userData.start);
      transmitters.add(transmitter);
    }
    var sendButton = figure ? figure.querySelector("[data-synapse-send]") : null;
    var resetButton = figure ? figure.querySelector("[data-synapse-reset]") : null;
    var readout = figure ? figure.querySelector("[data-synapse-readout]") : null;
    var running = false;
    var progress = 0;
    function setReadout(html) { if (readout) { readout.innerHTML = html; } }
    function send() {
      running = true;
      progress = 0;
      Array.prototype.forEach.call(transmitters.children, function (transmitter) { transmitter.visible = true; });
      setReadout("<strong>Signal angekommen.</strong> Die Vesikel verschmelzen mit der Membran, Neurotransmitter werden in den synaptischen Spalt freigesetzt und binden an die Rezeptoren der nächsten Zelle.");
    }
    function reset() {
      running = false;
      progress = 0;
      Array.prototype.forEach.call(transmitters.children, function (transmitter) { transmitter.visible = false; transmitter.position.copy(transmitter.userData.start); });
      setReadout("Drücke „Signal senden“, um die Übertragung an der Synapse zu starten.");
    }
    if (sendButton) { sendButton.addEventListener("click", send); }
    if (resetButton) { resetButton.addEventListener("click", reset); }
    setReadout("Drücke „Signal senden“, um die Übertragung an der Synapse zu starten.");
    base.loop(function () {
      if (running) {
        progress += 0.014;
        Array.prototype.forEach.call(transmitters.children, function (transmitter) {
          transmitter.position.lerpVectors(transmitter.userData.start, transmitter.userData.end, Math.min(1, progress));
        });
        receptors.children.forEach(function (receptor, index) {
          receptor.material.color.copy(muted).lerp(accent, Math.min(1, progress + index * 0.05));
        });
        if (progress >= 1) {
          running = false;
          setReadout("<strong>Übertragen.</strong> Die Bindung an den Rezeptoren löst in der nächsten Zelle ein neues elektrisches Signal aus. Danach werden die Neurotransmitter abgebaut oder wieder aufgenommen.");
        }
      }
    });
    return { send: send, reset: reset };
  }

  function ecosystemScene(container) {
    var base = setup(container, [0, 11, 16], [0, 0, 0]);
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var water = new THREE.Color(tokenColor("--color-water"));
    function terrainHeight(x, z) {
      return 0.35 * Math.sin(x * 0.42) * Math.cos(z * 0.34) + 0.18 * Math.sin(x * 0.9 + z * 0.5);
    }
    var geometry = new THREE.PlaneGeometry(16, 12, 40, 30);
    geometry.rotateX(-Math.PI / 2);
    var position = geometry.attributes.position;
    for (var i = 0; i < position.count; i += 1) {
      position.setY(i, terrainHeight(position.getX(i), position.getZ(i)));
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    var terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.85 }));
    base.scene.add(terrain);
    var border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(16, 12)), new THREE.LineBasicMaterial({ color: muted }));
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.02;
    base.scene.add(border);
    var riverPoints = [];
    for (var rp = 0; rp <= 20; rp += 1) {
      var z = -5.8 + (rp / 20) * 11.6;
      riverPoints.push(new THREE.Vector3(Math.sin(z * 0.55) * 1.8, 0.18, z));
    }
    var river = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPoints), 100, 0.34, 8, false), new THREE.MeshStandardMaterial({ color: water, roughness: 0.5 }));
    base.scene.add(river);
    var trees = new THREE.Group();
    base.scene.add(trees);
    var treePositions = [];
    for (var tx = -6; tx <= 6; tx += 2.2) {
      for (var tz = -4.2; tz <= 4.2; tz += 2.4) {
        if (Math.abs(tx - Math.sin(tz * 0.55) * 1.8) < 1.2) { continue; }
        treePositions.push([tx + (Math.random() - 0.5) * 0.5, tz + (Math.random() - 0.5) * 0.5]);
      }
    }
    treePositions.forEach(function (pos) {
      var tree = new THREE.Group();
      var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 6), new THREE.MeshStandardMaterial({ color: ink, roughness: 0.7 }));
      trunk.position.y = 0.6;
      tree.add(trunk);
      var crown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 7), new THREE.MeshStandardMaterial({ color: muted, roughness: 0.7 }));
      crown.position.y = 1.7;
      tree.add(crown);
      tree.position.set(pos[0], terrainHeight(pos[0], pos[1]) + 0.05, pos[1]);
      trees.add(tree);
    });
    var fields = new THREE.Group();
    base.scene.add(fields);
    for (var fx = -5; fx <= 5; fx += 3.4) {
      for (var fz = -3; fz <= 3; fz += 3) {
        var field = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), new THREE.MeshStandardMaterial({ color: paper, roughness: 0.8 }));
        field.rotation.x = -Math.PI / 2;
        field.position.set(fx, terrainHeight(fx, fz) + 0.04, fz);
        fields.add(field);
      }
    }
    fields.visible = false;
    var stage = 3;
    var agriculture = false;
    var straightened = false;
    var stageButtons = figure ? $$("[data-eco-stage]", figure) : [];
    var agricultureInput = figure ? figure.querySelector("[data-eco-agriculture]") : null;
    var riverInput = figure ? figure.querySelector("[data-eco-river]") : null;
    var readout = figure ? figure.querySelector("[data-eco-readout]") : null;
    function update() {
      var treeCount = stage === 0 ? 0 : stage === 1 ? 0 : stage === 2 ? Math.ceil(trees.children.length * 0.45) : trees.children.length;
      trees.children.forEach(function (tree, index) {
        tree.visible = !agriculture && index < treeCount;
        tree.scale.setScalar(stage === 2 ? 0.72 : 1);
      });
      fields.visible = agriculture;
      var points = [];
      for (var rp2 = 0; rp2 <= 20; rp2 += 1) {
        var z2 = -5.8 + (rp2 / 20) * 11.6;
        points.push(new THREE.Vector3(straightened ? 0 : Math.sin(z2 * 0.55) * 1.8, 0.2, z2));
      }
      river.geometry.dispose();
      river.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 100, 0.34, 8, false);
      stageButtons.forEach(function (button) { button.setAttribute("aria-pressed", Number(button.dataset.ecoStage) === stage ? "true" : "false"); });
      if (readout) {
        var stageText = ["Rohboden: kaum Vegetation, Pionierarten beginnen.", "Grasland: Gräser und Kräuter bedecken den Boden.", "Gebüsch: Sträucher und erste Bäume verdrängen das Gras.", "Wald: Bäume dominieren; die Sukzession ist noch nicht endgültig abgeschlossen."][stage];
        readout.innerHTML = "<strong>" + stageText + "</strong> " + (agriculture ? "Die Landwirtschaft hat die Bäume entfernt und Felder angelegt." : "Ohne landwirtschaftlichen Eingriff bleibt die Vegetation stehen.") + " " + (straightened ? "Der Fluss ist begradigt." : "Der Fluss mäandriert.") + " Sukzession ist ein Prozess, kein Endzustand.";
      }
    }
    stageButtons.forEach(function (button) {
      button.addEventListener("click", function () { stage = Number(button.dataset.ecoStage); update(); });
    });
    if (agricultureInput) { agricultureInput.addEventListener("change", function () { agriculture = agricultureInput.checked; update(); }); }
    if (riverInput) { riverInput.addEventListener("change", function () { straightened = riverInput.checked; update(); }); }
    update();
    base.loop(null);
    return { update: update };
  }

  /* =====================================================================
     Biologie 9 instruments
     ===================================================================== */

  /* ---------- 1. Microscope (Methoden) ---------- */
  function microscopeScene(container) {
    var stage = new Stage(container, {
      camera: [6.6, 5.4, 9.4],
      target: [0, 2.5, 0],
      fov: 38,
      minDistance: 5.4,
      maxDistance: 17,
      groundY: -0.02,
      groundSize: 15,
      readout: "[data-micro3d-readout]",
      hint: "Ziehen: Gerät drehen · Scrollen: zoomen · Bauteil antippen",
      ariaLabel: "3D-Modell eines Lichtmikroskops mit Okular, Objektiven, Objekttisch, Fokusknopf und Lichtquelle."
    });
    if (!stage) { return null; }
    var c = stage.colors;
    var figure = container.closest("figure");
    var tool = document.querySelector('[data-tool="microscope9"]');

    var bodyMat = standard(c.paper3, { roughness: 0.58, metalness: 0.04 });
    var metalMat = standard(c.ink, { roughness: 0.42, metalness: 0.18 });
    var darkMat = standard(c.ink2, { roughness: 0.55, metalness: 0.08 });
    var accentMat = standard(c.accent, { roughness: 0.38, metalness: 0.12 });
    var glassMat = standard(c.paper, { roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.42 });

    var microscope = new THREE.Group();
    microscope.position.y = 0;
    stage.scene.add(microscope);

    var base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.42, 3.1), bodyMat);
    base.position.set(0, 0.21, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    microscope.add(base);
    var baseInset = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.08, 2.25), darkMat);
    baseInset.position.set(0, 0.44, 0);
    microscope.add(baseInset);

    var arm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 4.55, 0.56), bodyMat);
    arm.position.set(-1.62, 2.65, 0);
    arm.castShadow = true;
    microscope.add(arm);
    var armTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.58, 0.56), bodyMat);
    armTop.position.set(-0.68, 4.93, 0);
    armTop.castShadow = true;
    microscope.add(armTop);
    var armCurve = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.28, 10, 24, Math.PI * 0.5), bodyMat);
    armCurve.position.set(-1.25, 3.85, 0);
    armCurve.rotation.z = Math.PI * 0.55;
    microscope.add(armCurve);

    var stagePlate = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.18, 2.45), metalMat);
    stagePlate.position.set(0.42, 2.02, 0);
    stagePlate.castShadow = true;
    stagePlate.receiveShadow = true;
    microscope.add(stagePlate);
    var stageGlass = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.95), glassMat);
    stageGlass.position.set(0.42, 2.13, 0);
    microscope.add(stageGlass);
    var slide = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.035, 0.7), standard(c.paper, { roughness: 0.3, transparent: true, opacity: 0.8 }));
    slide.position.set(0.42, 2.16, 0);
    microscope.add(slide);
    var specimen = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18), accentMat);
    specimen.rotation.x = -Math.PI / 2;
    specimen.position.set(0.48, 2.183, 0.02);
    microscope.add(specimen);
    var clipLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.62), metalMat);
    clipLeft.position.set(-0.16, 2.19, 0.3);
    microscope.add(clipLeft);
    var clipRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.62), metalMat);
    clipRight.position.set(1.0, 2.19, -0.3);
    microscope.add(clipRight);

    var nosepiece = new THREE.Group();
    nosepiece.position.set(0.42, 3.18, 0);
    microscope.add(nosepiece);
    var nosepieceDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.32, 24), metalMat);
    nosepieceDisc.castShadow = true;
    nosepiece.add(nosepieceDisc);
    var objectives = new THREE.Group();
    nosepiece.add(objectives);
    var objectiveData = [
      { label: "4×", color: c.paper3, length: 0.72 },
      { label: "10×", color: c.paper3, length: 0.58 },
      { label: "40×", color: c.paper3, length: 0.46 }
    ];
    objectiveData.forEach(function (entry, index) {
      var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, entry.length, 14), standard(entry.color, { roughness: 0.4, metalness: 0.14 }));
      var angle = index * TAU / 3;
      lens.position.set(Math.sin(angle) * 0.32, -0.36, Math.cos(angle) * 0.32);
      lens.castShadow = true;
      objectives.add(lens);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 18), accentMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(lens.position.x, -0.36 - entry.length * 0.5, lens.position.z);
      objectives.add(ring);
    });

    var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.36, 1.72, 20), bodyMat);
    tube.position.set(0.42, 3.99, 0);
    tube.castShadow = true;
    microscope.add(tube);
    var tubeRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 8, 22), metalMat);
    tubeRing.rotation.x = Math.PI / 2;
    tubeRing.position.set(0.42, 3.26, 0);
    microscope.add(tubeRing);

    var eyepiece = new THREE.Group();
    eyepiece.position.set(0.42, 5.02, 0);
    microscope.add(eyepiece);
    var eyepieceTube = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.27, 0.55, 20), metalMat);
    eyepieceTube.castShadow = true;
    eyepiece.add(eyepieceTube);
    var eyepieceRim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 22), accentMat);
    eyepieceRim.rotation.x = Math.PI / 2;
    eyepieceRim.position.y = 0.27;
    eyepiece.add(eyepieceRim);
    var eyepieceLens = new THREE.Mesh(new THREE.CircleGeometry(0.24, 22), glassMat);
    eyepieceLens.rotation.x = -Math.PI / 2;
    eyepieceLens.position.y = 0.28;
    eyepiece.add(eyepieceLens);

    var focusKnobs = new THREE.Group();
    microscope.add(focusKnobs);
    [-1, 1].forEach(function (side) {
      var knob = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.22, 24), accentMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(-1.28, 2.0, side * 0.42);
      knob.castShadow = true;
      focusKnobs.add(knob);
      var knobRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 24), darkMat);
      knobRing.position.set(-1.28, 2.0, side * 0.54);
      focusKnobs.add(knobRing);
      var spokes = new THREE.Group();
      spokes.position.set(-1.28, 2.0, side * 0.555);
      spokes.userData.spin = true;
      for (var spokeIndex = 0; spokeIndex < 3; spokeIndex += 1) {
        var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.02), darkMat);
        spoke.rotation.z = spokeIndex * Math.PI / 3;
        spokes.add(spoke);
      }
      focusKnobs.add(spokes);
    });

    var lightGroup = new THREE.Group();
    microscope.add(lightGroup);
    var lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 0.26, 24), metalMat);
    lamp.position.set(0.42, 0.62, 0);
    lamp.castShadow = true;
    lightGroup.add(lamp);
    var lampGlowMat = new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 0.65, roughness: 0.35 });
    var lampGlow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), lampGlowMat);
    lampGlow.rotation.x = -Math.PI / 2;
    lampGlow.position.set(0.42, 0.76, 0);
    lightGroup.add(lampGlow);
    var beamMat = new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
    var beam = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.5, 1.5, 24, 1, true), beamMat);
    beam.position.set(0.42, 1.52, 0);
    lightGroup.add(beam);

    var dustCount = 90;
    var dustGeometry = new THREE.BufferGeometry();
    var dustPositions = new Float32Array(dustCount * 3);
    var dustPhase = new Float32Array(dustCount);
    for (var d = 0; d < dustCount; d += 1) {
      var angle = Math.random() * TAU;
      var radius = Math.random() * 0.85;
      dustPositions[d * 3] = 0.42 + Math.cos(angle) * radius;
      dustPositions[d * 3 + 1] = 0.9 + Math.random() * 1.35;
      dustPositions[d * 3 + 2] = Math.sin(angle) * radius;
      dustPhase[d] = Math.random() * TAU;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    var dustMaterial = new THREE.PointsMaterial({ color: c.accent, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false });
    var dust = new THREE.Points(dustGeometry, dustMaterial);
    stage.scene.add(dust);

    function pageZoomIndex() {
      if (!tool) { return 2; }
      var pressed = tool.querySelector('[data-micro-zoom][aria-pressed="true"]');
      return pressed ? Number(pressed.dataset.microZoom) : 40;
    }
    function targetNosepieceRotation() {
      var zoom = pageZoomIndex();
      return zoom === 40 ? -TAU / 3 : zoom === 100 ? 0 : TAU / 3;
    }
    var nosepieceAngle = targetNosepieceRotation();
    nosepiece.rotation.y = nosepieceAngle;
    var knobSpin = 0;
    var knobTarget = 0;
    var lightOn = true;
    var lampBase = 0.65;

    function focusPage() { if (tool) { var button = tool.querySelector("[data-micro-focus]"); if (button) { button.click(); } } }
    function cycleZoom() {
      if (!tool) { return; }
      stage.setPaused(false);
      var buttons = $$("[data-micro-zoom]", tool);
      if (!buttons.length) { return; }
      var current = 0;
      buttons.forEach(function (button, index) { if (button.getAttribute("aria-pressed") === "true") { current = index; } });
      var next = buttons[(current + 1) % buttons.length];
      next.click();
      stage.setReadout("<strong>" + next.dataset.microZoom + "×.</strong> Das Objektiv wurde gewechselt. Die Gesamtvergrößerung ist Okular × Objektiv.");
    }
    function toggleLight() {
      lightOn = !lightOn;
      beam.visible = lightOn;
      dust.visible = lightOn;
      lampGlowMat.emissiveIntensity = lightOn ? 0.65 : 0.02;
      beamMat.opacity = lightOn ? 0.07 : 0;
      stage.setReadout(lightOn ? "<strong>Licht an.</strong> Die Lichtquelle beleuchtet das Präparat von unten. Ohne Licht siehst du keine Struktur." : "<strong>Licht aus.</strong> Ohne Beleuchtung bleibt das Sehfeld dunkel. Die Vergrößerung allein reicht nicht.");
    }
    function setSlideFocus() {
      if (!tool) { return; }
      stage.setPaused(false);
      var button = tool.querySelector("[data-micro-focus]");
      if (!button) { return; }
      button.click();
      knobTarget += Math.PI;
      var sharp = button.textContent.indexOf("Unscharf") === 0;
      stage.setReadout(sharp ? "<strong>Scharf.</strong> Der Fokus liegt in der Präparatebene. Jetzt erkennst du Zellwände, Kerne oder Bakterien." : "<strong>Unscharf.</strong> Drehe am Fokusknopf, bis die Struktur klar erscheint.");
    }

    function markMicroPart(key) {
      $$("[data-micro3d-part]", figure).forEach(function (button) {
        button.setAttribute("aria-pressed", button.dataset.micro3dPart === key ? "true" : "false");
      });
    }
    stage.registerPart(eyepiece, {
      key: "eyepiece", title: "Okular", text: "Die Linse, durch die du schaust. Ein 10×-Okular vergrößert das Bild des Objektivs noch einmal um den Faktor 10.", hint: "Klicken: Gesamtvergrößerung erklären",
      onSelect: function () { markMicroPart("eyepiece"); stage.setReadout("<strong>Okular (10×).</strong> Die Gesamtvergrößerung ist Okular × Objektiv. Mit einem 40×-Objektiv ergibt das 400×."); }
    });
    stage.registerPart(objectives, {
      key: "objectives", title: "Objektive", text: "Die Linsen nahe am Präparat. 4×, 10× und 40× sind typische Werte. Das Objektiv bestimmt mit dem Okular die Gesamtvergrößerung.", hint: "Klicken: Objektiv wechseln",
      onSelect: function () { markMicroPart("objectives"); cycleZoom(); }
    });
    stage.registerPart(stagePlate, {
      key: "stage", title: "Objekttisch", text: "Er trägt das Präparat. Klemmen halten den Objektträger fest, damit das Bild beim Fokussieren nicht verrutscht.", hint: "Klicken: Funktion anzeigen",
      onSelect: function () { markMicroPart("stage"); stage.setReadout("<strong>Objekttisch.</strong> Das Präparat liegt auf dem Objektträger. Klemmen halten es fest; der Tisch lässt sich mit dem Fokusknopf bewegen."); }
    });
    stage.registerPart(focusKnobs, {
      key: "focus", title: "Fokussierung", text: "Der Fokusknopf verschiebt den Objekttisch oder das Objektiv. Erst wenn die Präparatebene scharf ist, erkennst du Details.", hint: "Klicken: Scharf stellen",
      onSelect: function () { markMicroPart("focus"); setSlideFocus(); }
    });
    stage.registerPart(lightGroup, {
      key: "light", title: "Lichtquelle", text: "Sie beleuchtet das Präparat von unten. Zu wenig Licht ergibt ein dunkles Bild, zu viel Licht blendet und lässt Kontraste verschwinden.", hint: "Klicken: Licht ein- oder ausschalten",
      onSelect: function () { markMicroPart("light"); toggleLight(); }
    });
    stage.registerPart(arm, {
      key: "arm", title: "Mikroskoparm", text: "Der Arm verbindet Fuß, Tubus und Objekttisch. Er hält die optischen Bauteile stabil über dem Präparat.", hint: "Klicken: Funktion anzeigen",
      onSelect: function () { stage.setReadout("<strong>Mikroskoparm.</strong> Er stabilisiert den Tubus über dem Objekttisch. Ein wackeliges Mikroskop liefert kein scharfes Bild."); }
    });

    if (tool) {
      $$("[data-micro-zoom]", tool).forEach(function (button) {
        button.addEventListener("click", function () {
          nosepieceAngle = targetNosepieceRotation();
        });
      });
      var focusButton = tool.querySelector("[data-micro-focus]");
      if (focusButton) {
        focusButton.addEventListener("click", function () { knobTarget += Math.PI * 0.75; });
      }
    }

    stage.addAction({
      label: "Licht", tip: "Schaltet die Beleuchtung des Mikroskops ein und aus. Ohne Licht bleibt das Sehfeld dunkel.", onClick: toggleLight
    });
    stage.addAction({
      label: "Fokus", tip: "Dreht den Fokusknopf und stellt das Präparat scharf.", onClick: setSlideFocus
    });
    $$("[data-micro3d-part]", figure).forEach(function (button) {
      button.addEventListener("click", function () {
        $$("[data-micro3d-part]", figure).forEach(function (inner) { inner.setAttribute("aria-pressed", inner === button ? "true" : "false"); });
        stage.focusPart(button.dataset.micro3dPart);
      });
    });

    stage.addUpdate(function (dt, time) {
      nosepiece.rotation.y = damp(nosepiece.rotation.y, nosepieceAngle, 8, dt);
      knobSpin = damp(knobSpin, knobTarget, 5, dt);
      focusKnobs.children.forEach(function (child) { if (child.userData.spin) { child.rotation.z = knobSpin; } });
      lampGlowMat.emissiveIntensity = lightOn ? 0.58 + Math.sin(time * 2.2) * 0.08 : 0.02;
      beamMat.opacity = lightOn ? 0.055 + Math.sin(time * 1.7) * 0.015 : 0;
      if (lightOn) {
        var positions = dustGeometry.attributes.position.array;
        for (var i = 0; i < dustCount; i += 1) {
          positions[i * 3 + 1] += dt * 0.16;
          if (positions[i * 3 + 1] > 2.35) { positions[i * 3 + 1] = 0.85; }
          positions[i * 3] += Math.sin(time * 0.7 + dustPhase[i]) * dt * 0.02;
        }
        dustGeometry.attributes.position.needsUpdate = true;
      }
      specimen.material.emissive = c.accent;
      specimen.material.emissiveIntensity = lightOn ? 0.15 + Math.sin(time * 2.6) * 0.1 : 0;
    });

    stage.setReadout("<strong>Lichtmikroskop.</strong> Fahre über ein Bauteil oder tippe es an. Das Okular vergrößert das Bild des Objektivs.");
    return {
      focusPart: stage.focusPart,
      reset: stage.resetView,
      toggleLight: toggleLight,
      setZoom: function (zoom) { nosepieceAngle = zoom === 40 ? -TAU / 3 : zoom === 100 ? 0 : TAU / 3; },
      stage: stage
    };
  }

  /* ---------- 2. Microbes (Mikroorganismen) ---------- */
  function microbeScene(container) {
    var stage = new Stage(container, {
      camera: [0, 2.2, 11.8],
      target: [0, 0, 0],
      fov: 38,
      minDistance: 6,
      maxDistance: 20,
      groundY: -2.75,
      groundSize: 13,
      readout: "[data-microbe-readout]",
      hint: "Ziehen: Zelle drehen · Scrollen: zoomen · Organell antippen",
      ariaLabel: "3D-Vergleich von Bakterium und Hefezelle. Bakterium: Zellwand, Ringchromosom, Plasmide, Ribosomen und Geißel. Hefe: Zellkern, Vakuole, Mitochondrien und Knospe."
    });
    if (!stage) { return null; }
    var c = stage.colors;
    var figure = container.closest("figure");

    var bodyMat = standard(c.paper3, { roughness: 0.48, transparent: true, opacity: 0.52, depthWrite: false });
    var wallMat = new THREE.MeshBasicMaterial({ color: c.muted, wireframe: true, transparent: true, opacity: 0.16 });
    var accentMat = standard(c.accent, { roughness: 0.4, metalness: 0.05 });
    var mutedMat = standard(c.muted, { roughness: 0.58 });
    var inkMat = standard(c.ink2, { roughness: 0.5 });

    /* --- bacterium --- */
    var bacterium = new THREE.Group();
    stage.scene.add(bacterium);
    var body = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 3.5, 28), bodyMat);
    body.rotation.z = Math.PI / 2;
    bacterium.add(body);
    var capLeft = new THREE.Mesh(new THREE.SphereGeometry(1.12, 24, 18), bodyMat);
    capLeft.position.x = -1.75;
    bacterium.add(capLeft);
    var capRight = new THREE.Mesh(new THREE.SphereGeometry(1.12, 24, 18), bodyMat);
    capRight.position.x = 1.75;
    bacterium.add(capRight);

    var wallGroup = new THREE.Group();
    var wall = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 3.5, 12), wallMat);
    wall.rotation.z = Math.PI / 2;
    wallGroup.add(wall);
    var wallLeft = new THREE.Mesh(new THREE.SphereGeometry(1.22, 12, 8), wallMat);
    wallLeft.position.x = -1.75;
    wallGroup.add(wallLeft);
    var wallRight = new THREE.Mesh(new THREE.SphereGeometry(1.22, 12, 8), wallMat);
    wallRight.position.x = 1.75;
    wallGroup.add(wallRight);
    bacterium.add(wallGroup);

    var piliGroup = new THREE.Group();
    for (var pi = 0; pi < 18; pi += 1) {
      var pili = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.34, 5), mutedMat);
      var pa = (pi / 18) * TAU;
      var px = -1.5 + (pi % 6) * 0.6;
      pili.position.set(px, Math.cos(pa) * 1.2, Math.sin(pa) * 1.2);
      pili.rotation.x = pa;
      bacteriaPili(pili, pa);
      piliGroup.add(pili);
    }
    function bacteriaPili(mesh, angle) {
      mesh.rotation.set(Math.PI / 2, 0, angle);
    }
    bacterium.add(piliGroup);

    var nucleoid = new THREE.Mesh(new THREE.TorusKnotGeometry(0.58, 0.09, 90, 10, 2, 3), accentMat);
    nucleoid.rotation.x = Math.PI / 2;
    bacterium.add(nucleoid);
    var plasmids = new THREE.Group();
    for (var p = 0; p < 3; p += 1) {
      var plasmid = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 26), accentMat);
      plasmid.position.set(-0.75 + p * 0.72, 0.46 - p * 0.3, 0.34);
      plasmid.rotation.set(p * 0.7, p * 0.5, p * 0.3);
      plasmids.add(plasmid);
    }
    bacterium.add(plasmids);
    var ribosomes = new THREE.Group();
    for (var r = 0; r < 18; r += 1) {
      var ribosome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), inkMat);
      ribosome.position.set(-1.3 + (r % 9) * 0.32, -0.58 + Math.floor(r / 9) * 1.12, 0.48 - (r % 2) * 0.28);
      ribosomes.add(ribosome);
    }
    bacterium.add(ribosomes);

    var flagella = new THREE.Group();
    for (var f = 0; f < 3; f += 1) {
      var flagPoints = [];
      for (var fp = 0; fp <= 24; fp += 1) {
        var ft = fp / 24;
        flagPoints.push(new THREE.Vector3(1.9 + ft * 2.0, Math.sin(ft * Math.PI * 4 + f) * 0.42, Math.cos(ft * Math.PI * 3 + f) * 0.3));
      }
      var flagellum = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(flagPoints), 44, 0.045, 6, false), inkMat);
      flagellum.position.z = (f - 1) * 0.45;
      flagella.add(flagellum);
    }
    bacterium.add(flagella);
    bacterium.position.set(0, 0.1, 0);
    bacterium.rotation.y = -0.18;

    /* --- yeast --- */
    var yeast = new THREE.Group();
    stage.scene.add(yeast);
    var cellWall = new THREE.Mesh(new THREE.SphereGeometry(1.88, 34, 24), standard(c.paper3, { transparent: true, opacity: 0.42, roughness: 0.42, depthWrite: false }));
    yeast.add(cellWall);
    var cellWire = new THREE.Mesh(new THREE.SphereGeometry(1.93, 14, 10), new THREE.MeshBasicMaterial({ color: c.muted, wireframe: true, transparent: true, opacity: 0.14 }));
    yeast.add(cellWire);
    var nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 16), accentMat);
    nucleus.position.set(-0.32, 0.26, 0.1);
    yeast.add(nucleus);
    var vacuole = new THREE.Mesh(new THREE.SphereGeometry(0.68, 24, 18), standard(c.water, { transparent: true, opacity: 0.34, roughness: 0.3, depthWrite: false }));
    vacuole.position.set(0.58, -0.3, 0.22);
    yeast.add(vacuole);
    var vacuoleRim = new THREE.Mesh(new THREE.SphereGeometry(0.69, 16, 12), new THREE.MeshBasicMaterial({ color: c.water, wireframe: true, transparent: true, opacity: 0.25 }));
    vacuoleRim.position.copy(vacuole.position);
    yeast.add(vacuoleRim);
    var mitochondria = new THREE.Group();
    for (var m = 0; m < 4; m += 1) {
      var mitochondrion = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), inkMat);
      mitochondrion.scale.set(2.0, 0.72, 0.72);
      mitochondrion.position.set(-0.85 + m * 0.62, -0.92 + (m % 2) * 0.28, 0.55 - m * 0.34);
      mitochondrion.rotation.z = m * 0.7;
      mitochondria.add(mitochondrion);
    }
    yeast.add(mitochondria);
    var bud = new THREE.Group();
    bud.position.set(1.55, 0.95, 0.05);
    var budCell = new THREE.Mesh(new THREE.SphereGeometry(0.78, 24, 18), standard(c.paper3, { transparent: true, opacity: 0.58, roughness: 0.45, depthWrite: false }));
    bud.add(budCell);
    var budNucleus = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), accentMat);
    budNucleus.position.set(0.1, 0.04, 0);
    bud.add(budNucleus);
    var budScar = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 26), mutedMat);
    budScar.position.set(1.55, 0.95, 0.05);
    budScar.scale.set(1, 0.72, 1);
    yeast.add(budScar);
    yeast.add(bud);
    yeast.visible = false;
    yeast.position.set(0, 0.2, 0);

    var mode = "bacterium";
    function setMode(key) {
      mode = key === "yeast" ? "yeast" : "bacterium";
      bacterium.visible = mode === "bacterium";
      yeast.visible = mode === "yeast";
      $$("[data-microbe-mode]", figure).forEach(function (button) {
        button.setAttribute("aria-pressed", button.dataset.microbeMode === mode ? "true" : "false");
      });
      stage.setReadout(mode === "bacterium"
        ? "<strong>Bakterium.</strong> Prokaryot: Ringchromosom und Plasmide, Zellwand aus Murein, keine Mitochondrien. Geißeln dienen der Fortbewegung."
        : "<strong>Hefe.</strong> Eukaryot: echter Zellkern, Mitochondrien, Vakuole und Zellwand. Vermehrung durch Knospung.");
    }
    $$("[data-microbe-mode]", figure).forEach(function (button) {
      button.addEventListener("click", function () { setMode(button.dataset.microbeMode); });
    });

    function part(object, key, title, text, hint, shell) {
      stage.registerPart(object, {
        key: key, title: title, text: text, hint: hint || "Klicken: Funktion im Lesetext", shell: shell,
        onSelect: function () { stage.setReadout("<strong>" + title + ".</strong> " + text); }
      });
    }
    part(wallGroup, "bacterial-wall", "Zellwand aus Murein", "Die Zellwand gibt dem Bakterium Form und Stabilität. Penicillin hemmt ihren Aufbau; menschliche Zellen haben keine Murein-Zellwand.", null, true);
    part(nucleoid, "nucleoid", "Ringchromosom", "Die DNA liegt als ringförmiges Chromosom im Zellplasma. Ein echter Zellkern fehlt – deshalb ist das Bakterium ein Prokaryot.");
    part(plasmids, "plasmids", "Plasmide", "Kleine ringförmige DNA-Moleküle mit zusätzlichen Genen, zum Beispiel für Antibiotikaresistenzen. In der Gentechnik dienen sie als Vektor.");
    part(ribosomes, "ribosomes", "Ribosomen", "Sie bauen Proteine aus Aminosäuren zusammen. Bakterien haben Ribosomen, aber keine Mitochondrien.");
    part(flagella, "flagella", "Geißeln", "Mit ihnen bewegt sich das Bakterium im Wasser fort. Die Geißel rotiert und schiebt die Zelle vorwärts.");
    part(piliGroup, "pili", "Pili", "Kurze Fortsätze zum Anheften an Oberflächen und für den Austausch von DNA zwischen Bakterien.");
    part(cellWire, "yeast-wall", "Zellwand der Hefe", "Die Hefezellwand enthält Chitin und Glucane. Sie schützt die Zelle und gibt ihr Form.", null, true);
    part(nucleus, "yeast-nucleus", "Zellkern", "Hefen sind Eukaryoten: Ihre DNA liegt in einem echten Zellkern, der von einer Kernhülle umgeben ist.");
    part(vacuole, "vacuole", "Vakuole", "Ein Speicher- und Regulationsorganell. Es speichert Wasser und Stoffe und hilft, den Innendruck der Zelle zu regulieren.");
    part(mitochondria, "mitochondria", "Mitochondrien", "Hier läuft die Zellatmung. Sie liefern Energie in Form von ATP – Bakterien besitzen keine Mitochondrien.");
    part(bud, "bud", "Knospe", "Bei der Knospung wächst eine Tochterzelle an der Mutterzelle heran, erhält einen Zellkern und löst sich schließlich ab.");

    var bacteriumAction;
    var yeastAction;
    bacteriumAction = stage.addAction({
      label: "Bakterium", pressed: true, tip: "Wechselt zum Bakterium: Prokaryot ohne Zellkern.",
      onClick: function () {
        bacteriumAction.setAttribute("aria-pressed", "true");
        yeastAction.setAttribute("aria-pressed", "false");
        setMode("bacterium");
      }
    });
    yeastAction = stage.addAction({
      label: "Hefe", tip: "Wechselt zur Hefe: Eukaryot mit Zellkern und Mitochondrien.",
      onClick: function () {
        yeastAction.setAttribute("aria-pressed", "true");
        bacteriumAction.setAttribute("aria-pressed", "false");
        setMode("yeast");
      }
    });

    stage.addUpdate(function (dt, time) {
      bacterium.rotation.y = -0.18 + Math.sin(time * 0.35) * 0.22;
      bacterium.position.y = 0.1 + Math.sin(time * 0.8) * 0.06;
      yeast.rotation.y = 0.12 + Math.sin(time * 0.3) * 0.2;
      yeast.position.y = 0.2 + Math.sin(time * 0.75 + 1) * 0.06;
      nucleoid.rotation.z += dt * 0.22;
      plasmids.rotation.y += dt * 0.32;
      flagella.rotation.x = Math.sin(time * 3.2) * 0.45;
      piliGroup.rotation.y = Math.sin(time * 0.8) * 0.03;
      var budPulse = 1 + Math.sin(time * 1.8) * 0.035;
      bud.scale.setScalar(budPulse);
      budScar.rotation.z += dt * 0.18;
      mitochondria.rotation.y = Math.sin(time * 0.5) * 0.12;
    });

    setMode("bacterium");
    return { setMode: setMode, focusPart: stage.focusPart, reset: stage.resetView, stage: stage };
  }

  /* ---------- 3. Insect (Wirbellose) ---------- */
  function insectScene(container) {
    var stage = new Stage(container, {
      camera: [0.6, 3.4, 11.8],
      target: [0, 0, 0],
      fov: 38,
      minDistance: 7,
      maxDistance: 23,
      groundY: -2.9,
      groundSize: 15,
      readout: "[data-insect-readout]",
      hint: "Ziehen: Insekt drehen · Scrollen: zoomen · Körperteil antippen",
      ariaLabel: "3D-Modell eines Insekts mit Kopf, Thorax, Abdomen, drei Beinpaaren, Flügeln und Facettenaugen."
    });
    if (!stage) { return null; }
    var c = stage.colors;
    var figure = container.closest("figure");
    var bodyMat = standard(c.paper3, { roughness: 0.46, metalness: 0.06 });
    var darkMat = standard(c.ink2, { roughness: 0.52 });
    var eyeMat = standard(c.accent, { roughness: 0.34, metalness: 0.08 });
    var wingMat = standard(c.paper, { transparent: true, opacity: 0.34, side: THREE.DoubleSide, roughness: 0.32, depthWrite: false });
    var veinMat = new THREE.LineBasicMaterial({ color: c.muted, transparent: true, opacity: 0.55 });

    var insect = new THREE.Group();
    insect.scale.setScalar(0.94);
    stage.scene.add(insect);

    var head = new THREE.Group();
    head.position.set(-3.2, 0.25, 0);
    insect.add(head);
    var headMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 26, 20), bodyMat);
    headMesh.castShadow = true;
    head.add(headMesh);
    var eyes = new THREE.Group();
    [-1, 1].forEach(function (sign) {
      var eye = new THREE.Mesh(new THREE.SphereGeometry(0.56, 20, 16), eyeMat);
      eye.position.set(-0.44, 0.34, sign * 0.74);
      eye.castShadow = true;
      eyes.add(eye);
      var facets = new THREE.Mesh(new THREE.SphereGeometry(0.575, 12, 9), new THREE.MeshBasicMaterial({ color: c.paper, wireframe: true, transparent: true, opacity: 0.32 }));
      facets.position.copy(eye.position);
      eyes.add(facets);
    });
    head.add(eyes);
    var antennae = [];
    function antenna(sign) {
      var points = [
        new THREE.Vector3(-0.7, 0.72, sign * 0.22),
        new THREE.Vector3(-1.5, 1.6, sign * 0.72),
        new THREE.Vector3(-2.1, 2.15, sign * 1.12)
      ];
      var mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 26, 0.055, 6, false), darkMat);
      head.add(mesh);
      antennae.push(mesh);
    }
    antenna(1);
    antenna(-1);
    var mouthparts = new THREE.Group();
    [-1, 1].forEach(function (sign) {
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.62, 8), darkMat);
      cone.position.set(-0.94, -0.54, sign * 0.22);
      cone.rotation.z = Math.PI / 2;
      mouthparts.add(cone);
    });
    head.add(mouthparts);

    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.82, 12), darkMat);
    neck.rotation.z = Math.PI / 2;
    neck.position.set(-1.88, 0.22, 0);
    insect.add(neck);

    var thorax = new THREE.Group();
    insect.add(thorax);
    var thoraxMesh = new THREE.Mesh(new THREE.SphereGeometry(1.36, 26, 20), bodyMat);
    thoraxMesh.scale.set(1.1, 0.9, 1.0);
    thoraxMesh.castShadow = true;
    thorax.add(thoraxMesh);

    var legs = new THREE.Group();
    insect.add(legs);
    function limb(start, end, radius) {
      var dir = new THREE.Vector3().subVectors(end, start);
      var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 8), darkMat);
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      mesh.castShadow = true;
      return mesh;
    }
    [-0.82, 0, 0.82].forEach(function (x) {
      [1, -1].forEach(function (sign) {
        var start = new THREE.Vector3(x, -0.74, sign * 0.82);
        var knee = new THREE.Vector3(x + 0.22, -1.86, sign * 1.82);
        var foot = new THREE.Vector3(x + 0.44, -2.62, sign * 2.42);
        legs.add(limb(start, knee, 0.085));
        legs.add(limb(knee, foot, 0.062));
        var joint = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), darkMat);
        joint.position.copy(knee);
        legs.add(joint);
      });
    });

    var wings = new THREE.Group();
    insect.add(wings);
    var wingPivots = [];
    [1, -1].forEach(function (sign) {
      var pivot = new THREE.Group();
      pivot.position.set(-0.08, 1.12, sign * 0.58);
      var wing = new THREE.Mesh(new THREE.CircleGeometry(1.35, 30), wingMat);
      wing.scale.set(1.78, 0.56, 1);
      wing.rotation.x = -Math.PI / 2 + 0.46;
      wing.rotation.z = sign * 0.22;
      wing.position.set(0.55, 0.05, sign * 1.08);
      wing.castShadow = true;
      pivot.add(wing);
      var vein = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CircleGeometry(1.35, 10)),
        veinMat
      );
      vein.scale.copy(wing.scale);
      vein.rotation.copy(wing.rotation);
      vein.position.copy(wing.position);
      pivot.add(vein);
      wingPivots.push(pivot);
      wings.add(pivot);
    });

    var abdomen = new THREE.Group();
    insect.add(abdomen);
    [2.0, 2.78, 3.56, 4.26].forEach(function (x, index) {
      var segment = new THREE.Mesh(new THREE.SphereGeometry(1.0 - index * 0.14, 22, 16), index % 2 === 0 ? bodyMat : darkMat);
      segment.scale.set(1.2, 0.95, 0.95);
      segment.position.set(x, -0.1, 0);
      segment.castShadow = true;
      abdomen.add(segment);
    });
    var spiracles = new THREE.Group();
    [1.8, 2.5, 3.2, 3.9].forEach(function (x) {
      [1, -1].forEach(function (sign) {
        var hole = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), accentMatFor(c.accent));
        hole.position.set(x, -0.04, sign * 0.94);
        spiracles.add(hole);
      });
    });
    function accentMatFor(color) { return new THREE.MeshStandardMaterial({ color: color, roughness: 0.4 }); }
    abdomen.add(spiracles);

    var parts = {
      head: ["Kopf", "Der Kopf trägt die Sinnesorgane: Facettenaugen, Antennen und Mundwerkzeuge.", head],
      thorax: ["Thorax", "Der Thorax ist der Bewegungsmittelpunkt. Hier setzen drei Beinpaare und die Flügel an.", thorax],
      abdomen: ["Abdomen", "Der Abdomen enthält den Großteil der Organe, darunter das Tracheensystem und den Darm.", abdomen],
      legs: ["Beine", "Drei Beinpaare mit Gelenken und Muskeln. Das Außenskelett aus Chitin gibt Halt und Schutz.", legs],
      wings: ["Flügel", "Die Flügel sind dünne, chitinhaltige Häute. Sie werden von Muskeln im Thorax bewegt.", wings],
      eyes: ["Facettenaugen", "Facettenaugen bestehen aus vielen Einzelaugen. Sie nehmen Bewegungen und Farben wahr.", eyes]
    };
    function markInsectPart(key) {
      $$("[data-insect-part]", figure).forEach(function (button) {
        button.setAttribute("aria-pressed", button.dataset.insectPart === key ? "true" : "false");
      });
    }
    Object.keys(parts).forEach(function (key) {
      stage.registerPart(parts[key][2], {
        key: key,
        title: parts[key][0],
        text: parts[key][1],
        hint: "Klicken: Körperteil im Lesetext hervorheben",
        onSelect: function () {
          markInsectPart(key);
          stage.setReadout("<strong>" + parts[key][0] + ".</strong> " + parts[key][1]);
        }
      });
    });
    $$("[data-insect-part]", figure).forEach(function (button) {
      button.addEventListener("click", function () {
        stage.focusPart(button.dataset.insectPart);
      });
    });

    var flapping = false;
    stage.addAction({
      label: "Flügelschlag", tip: "Lässt die Flügel schlagen. Bei Insekten bewegen indirekte Flugmuskeln den Thorax und damit die Flügel.",
      onClick: function (button) {
        flapping = !flapping;
        button.setAttribute("aria-pressed", flapping ? "true" : "false");
        if (flapping) { stage.setPaused(false); }
      }
    });

    stage.addUpdate(function (dt, time) {
      var flap = flapping ? Math.sin(time * 18) * 0.42 : Math.sin(time * 1.6) * 0.045;
      wingPivots[0].rotation.x = flap;
      wingPivots[1].rotation.x = flap;
      wings.rotation.z = Math.sin(time * 0.9) * 0.02;
      head.rotation.y = Math.sin(time * 0.6) * 0.035;
      antennae.forEach(function (mesh, index) {
        mesh.rotation.z = Math.sin(time * 1.1 + index * 0.6) * 0.03;
      });
      legs.rotation.z = Math.sin(time * 0.8) * 0.012;
      abdomen.rotation.y = Math.sin(time * 0.45) * 0.03;
      insect.position.y = Math.sin(time * 0.9) * 0.035;
    });

    stage.setReadout("<strong>Insekt.</strong> Fahre über Kopf, Thorax, Abdomen, Beine, Flügel oder Augen. Ein Klick zeigt die Funktion.");
    return { focusPart: stage.focusPart, reset: stage.resetView, stage: stage };
  }

  /* ---------- 4. Soil profile (Boden) ---------- */
  function soilScene(container) {
    var stage = new Stage(container, {
      camera: [9.2, 5.6, 12.2],
      target: [0, 0.45, 0],
      fov: 38,
      minDistance: 10,
      maxDistance: 24,
      groundY: -2.12,
      groundSize: 17,
      readout: "[data-soil-readout]",
      hint: "Ziehen: Profil drehen · Scrollen: zoomen · Horizont antippen",
      ariaLabel: "3D-Bodenprofil mit O-, A-, B- und C-Horizont, Wurzeln, Regenwurm und Bodenlebewesen."
    });
    if (!stage) { return null; }
    var c = stage.colors;
    var figure = container.closest("figure");
    var block = new THREE.Group();
    stage.scene.add(block);

    var layers = {};
    function layer(key, y, height, color) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(8, height, 6), standard(color, { roughness: 0.88 }));
      mesh.position.y = y;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      block.add(mesh);
      layers[key] = mesh;
      return mesh;
    }
    layer("o", 2.3, 0.4, c.ink2);
    layer("a", 1.7, 0.8, c.muted);
    layer("b", 0.6, 1.4, c.paper3);
    layer("c", -0.6, 1.0, c.rule2);
    layer("r", -1.5, 0.8, c.ink2);

    var stoneMat = standard(c.muted, { roughness: 0.95 });
    for (var st = 0; st < 34; st += 1) {
      var stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + Math.random() * 0.1, 0), stoneMat);
      stone.position.set(-3.8 + Math.random() * 7.6, -1.05 + Math.random() * 0.7, 3.02);
      stone.rotation.set(Math.random() * TAU, Math.random() * TAU, 0);
      block.add(stone);
    }
    var speckMat = standard(c.ink2, { roughness: 0.8 });
    for (var sp = 0; sp < 42; sp += 1) {
      var speck = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random() * 0.03, 6, 4), speckMat);
      speck.position.set(-3.8 + Math.random() * 7.6, 1.35 + Math.random() * 1.1, 3.03);
      block.add(speck);
    }

    var grass = new THREE.Group();
    block.add(grass);
    var grassMat = standard(c.ink2, { roughness: 0.72 });
    for (var gx = -3.6; gx <= 3.6; gx += 0.6) {
      for (var gz = -2.6; gz <= 2.6; gz += 0.9) {
        var blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.5, 4), grassMat);
        blade.position.set(gx + (Math.random() - 0.5) * 0.2, 2.75, gz + (Math.random() - 0.5) * 0.2);
        blade.rotation.z = (Math.random() - 0.5) * 0.22;
        blade.userData.phase = Math.random() * TAU;
        grass.add(blade);
      }
    }

    var roots = new THREE.Group();
    block.add(roots);
    var rootMat = standard(c.paper2, { roughness: 0.75 });
    [-2.4, -0.8, 0.8, 2.4].forEach(function (x) {
      var points = [
        new THREE.Vector3(x, 2.5, 2.96),
        new THREE.Vector3(x + 0.35, 2.0, 3.0),
        new THREE.Vector3(x - 0.2, 1.4, 3.02),
        new THREE.Vector3(x + 0.15, 0.9, 3.03)
      ];
      roots.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 30, 0.04, 6, false), rootMat));
    });

    var worm = new THREE.Group();
    block.add(worm);
    var wormMat = standard(c.accent, { roughness: 0.46 });
    var wormSegments = [];
    for (var ws = 0; ws < 12; ws += 1) {
      var segment = new THREE.Mesh(new THREE.SphereGeometry(0.1 - ws * 0.002, 10, 8), wormMat);
      segment.position.set(-1.3 + ws * 0.2, 1.62, 3.05);
      worm.add(segment);
      wormSegments.push(segment);
    }
    var soilLife = new THREE.Group();
    block.add(soilLife);
    var organismMat = standard(c.paper, { roughness: 0.62 });
    [[-2.0, 1.82, 3.08], [-0.35, 1.9, 3.08], [1.65, 1.76, 3.08], [2.55, 1.55, 3.08], [0.8, 1.45, 3.08]].forEach(function (pos) {
      var organism = new THREE.Mesh(new THREE.SphereGeometry(0.09, 9, 7), organismMat);
      organism.position.set(pos[0], pos[1], pos[2]);
      soilLife.add(organism);
    });
    for (var sl = 0; sl < 9; sl += 1) {
      var springtailGeometry = THREE.CapsuleGeometry
        ? new THREE.CapsuleGeometry(0.035, 0.12, 3, 6)
        : new THREE.CylinderGeometry(0.04, 0.04, 0.16, 6);
      var springtail = new THREE.Mesh(springtailGeometry, organismMat);
      springtail.position.set(-2.8 + Math.random() * 5.6, 1.35 + Math.random() * 0.55, 3.08);
      springtail.rotation.z = Math.random() * Math.PI;
      soilLife.add(springtail);
    }

    var highlight = new THREE.Mesh(new THREE.BoxGeometry(8.16, 1, 6.16), new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, opacity: 0, depthWrite: false }));
    highlight.visible = true;
    stage.scene.add(highlight);
    var highlightTarget = { y: 2.3, scale: 0.45, opacity: 0 };
    var highlightPlaced = false;
    var layerInfo = {
      o: ["O-Horizont", "Streuauflage aus Blättern, Nadeln und abgestorbenen Pflanzenteilen. Hier beginnt der Abbau.", 2.3, 0.45],
      a: ["A-Horizont", "Oberboden mit Humus, Wurzeln und Bodenleben. Hier ist die biologische Aktivität am größten.", 1.7, 0.85],
      b: ["B-Horizont", "Unterboden, in den Ton und Nährstoffe eingewaschen werden. Weniger Humus, weniger Leben.", 0.6, 1.45],
      c: ["C-Horizont", "Verwittertes Ausgangsgestein. Hier beginnt die Bodenbildung.", -0.6, 1.05],
      r: ["Ausgangsgestein", "Festeres Gestein unter dem C-Horizont. Es verwittert sehr langsam und bildet die mineralische Grundlage des Bodens.", -1.5, 0.85],
      life: ["Bodenleben", "Bakterien, Pilze, Regenwürmer, Milben und Springschwänze zersetzen Streu, bilden Humus und durchmischen den Boden.", 1.7, 0.85]
    };
    function selectLayer(key) {
      var entry = layerInfo[key];
      if (!entry) { return; }
      highlightTarget.y = entry[2];
      highlightTarget.scale = entry[3];
      highlightTarget.opacity = 0.14;
      if (!highlightPlaced) {
        highlight.position.y = entry[2];
        highlight.scale.y = entry[3];
        highlight.material.opacity = 0.14;
        highlightPlaced = true;
      }
      $$("[data-soil-layer]", figure).forEach(function (button) {
        button.setAttribute("aria-pressed", button.dataset.soilLayer === key ? "true" : "false");
      });
      stage.setReadout("<strong>" + entry[0] + ".</strong> " + entry[1]);
    }
    ["o", "a", "b", "c", "r"].forEach(function (key) {
      var mesh = layers[key];
      var info = layerInfo[key];
      stage.registerPart(mesh, {
        key: key, title: info[0], text: info[1], hint: "Klicken: Horizont hervorheben",
        onSelect: function () { selectLayer(key); }
      });
    });
    stage.registerPart(soilLife, {
      key: "life", title: layerInfo.life[0], text: layerInfo.life[1], hint: "Klicken: Bodenleben zeigen",
      onSelect: function () { selectLayer("life"); }
    });
    stage.registerPart(worm, {
      key: "worm", title: "Regenwurm", text: "Er frisst Streu und Boden, durchmischt die Horizonte und hinterlässt nährstoffreiche Ausscheidungen. Seine Gänge belüften den Boden.", hint: "Klicken: Rolle im Boden",
      onSelect: function () { selectLayer("life"); stage.setReadout("<strong>Regenwurm.</strong> Er durchmischt Boden und Streu, verbessert die Wasserinfiltration und schafft Gänge für Luft. Regenwürmer sind Bodeningenieure."); }
    });
    $$("[data-soil-layer]", figure).forEach(function (button) {
      button.addEventListener("click", function () { selectLayer(button.dataset.soilLayer); });
    });

    stage.addAction({
      label: "Schicht-Tour", tip: "Führt automatisch durch O-, A-, B- und C-Horizont sowie das Bodenleben.", pressed: false,
      onClick: function (button) {
        var tour = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", tour ? "false" : "true");
        if (tour) { tourIndex = -1; return; }
        tourIndex = 0;
        tourClock = 0;
        stage.setPaused(false);
      }
    });
    var tourIndex = -1;
    var tourClock = 0;
    var tourOrder = ["o", "a", "b", "c", "life"];

    stage.addUpdate(function (dt, time) {
      highlight.position.y = damp(highlight.position.y, highlightTarget.y, 8, dt);
      highlight.scale.y = damp(highlight.scale.y, highlightTarget.scale, 8, dt);
      highlight.material.opacity = damp(highlight.material.opacity, highlightTarget.opacity, 8, dt);
      grass.children.forEach(function (blade) {
        blade.rotation.z = 0.06 + Math.sin(time * 1.2 + blade.userData.phase) * 0.07;
      });
      wormSegments.forEach(function (segment, index) {
        segment.position.y = 1.62 + Math.sin(time * 1.6 + index * 0.42) * 0.06;
        segment.position.x = -1.3 + index * 0.2 + Math.sin(time * 0.7 + index * 0.2) * 0.015;
      });
      worm.rotation.z = Math.sin(time * 1.1) * 0.05;
      soilLife.position.y = Math.sin(time * 0.9) * 0.02;
      if (tourIndex >= 0) {
        tourClock += dt;
        if (tourClock > 2.0) {
          tourClock = 0;
          selectLayer(tourOrder[tourIndex]);
          tourIndex = (tourIndex + 1) % tourOrder.length;
        }
      }
    });

    selectLayer("o");
    stage.setReadout("<strong>O-Horizont.</strong> Streuauflage aus Blättern und abgestorbenen Pflanzenteilen. Fahre über die Horizonte oder tippe sie an.");
    return { focusPart: stage.focusPart, reset: stage.resetView, selectLayer: selectLayer, stage: stage };
  }

  /* ---------- 5. DNA double helix (Genetik) ---------- */
  function dnaScene(container) {
    var stage = new Stage(container, {
      camera: [0, 0.5, 16.4],
      target: [0, 0, 0],
      fov: 38,
      minDistance: 8,
      maxDistance: 26,
      shadowPlane: false,
      readout: "[data-dna3d-readout]",
      hint: "Ziehen: Helix drehen · Scrollen: zoomen · Basenpaar antippen",
      ariaLabel: "3D-Modell einer DNA-Doppelhelix mit zwei Zucker-Phosphat-Rückgraten und Basenpaaren A-T und G-C."
    });
    if (!stage) { return null; }
    var c = stage.colors;
    var figure = container.closest("figure");
    var dna = new THREE.Group();
    stage.scene.add(dna);

    var strandA = [];
    var strandB = [];
    var basePattern = ["A", "T", "G", "C", "A", "T", "G", "C", "T", "A", "C", "G", "A", "T", "C", "G", "T", "A", "G", "C", "A", "T", "G", "C"];
    var rungs = [];
    var helixRadius = 1.5;
    var helixHeight = 9.4;
    var turns = 2.6;
    var rungCount = basePattern.length;

    for (var i = 0; i <= 140; i += 1) {
      var t = i / 140;
      var angle = t * TAU * turns;
      var y = t * helixHeight - helixHeight / 2;
      strandA.push(new THREE.Vector3(Math.cos(angle) * helixRadius, y, Math.sin(angle) * helixRadius));
      strandB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * helixRadius, y, Math.sin(angle + Math.PI) * helixRadius));
    }
    var backboneMatA = standard(c.ink, { roughness: 0.5, metalness: 0.05 });
    var backboneMatB = standard(c.muted, { roughness: 0.55, metalness: 0.03 });
    var backboneA = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strandA), 180, 0.09, 8, false), backboneMatA);
    var backboneB = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strandB), 180, 0.09, 8, false), backboneMatB);
    backboneA.castShadow = true;
    backboneB.castShadow = true;
    dna.add(backboneA);
    dna.add(backboneB);

    var rungMeshes = [];
    basePattern.forEach(function (base, index) {
      var t = (index + 0.5) / rungCount;
      var angle = t * TAU * turns;
      var y = t * helixHeight - helixHeight / 2;
      var from = new THREE.Vector3(Math.cos(angle) * (helixRadius - 0.1), y, Math.sin(angle) * (helixRadius - 0.1));
      var to = new THREE.Vector3(Math.cos(angle + Math.PI) * (helixRadius - 0.1), y, Math.sin(angle + Math.PI) * (helixRadius - 0.1));
      var mid = from.clone().add(to).multiplyScalar(0.5);
      var dir = new THREE.Vector3().subVectors(to, from);
      var isAT = base === "A" || base === "T";
      var rungGroup = new THREE.Group();
      var rungMat = standard(isAT ? c.accent : c.ink2, { roughness: 0.4, metalness: 0.06, transparent: true, opacity: 1 });
      var bar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, dir.length(), 8), rungMat);
      bar.position.copy(mid);
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      bar.castShadow = true;
      rungGroup.add(bar);
      var dotFrom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), rungMat);
      dotFrom.position.copy(from);
      rungGroup.add(dotFrom);
      var dotTo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), rungMat);
      dotTo.position.copy(to);
      rungGroup.add(dotTo);
      rungGroup.userData.isAT = isAT;
      rungGroup.userData.base = base;
      rungGroup.userData.material = rungMat;
      rungGroup.userData.targetOpacity = 1;
      dna.add(rungGroup);
      rungs.push(rungGroup);
      rungMeshes.push(bar);
    });

    var backbonePart = stage.registerPart(backboneA, {
      key: "backbone", title: "Zucker-Phosphat-Rückgrat", text: "Die beiden Stränge bestehen aus Desoxyribose und Phosphat. Sie bilden das Gerüst; die Basen zeigen nach innen und tragen die Information.", hint: "Klicken: Aufbau erklären", shell: true,
      onSelect: function () { stage.setReadout("<strong>Rückgrat.</strong> Zucker (Desoxyribose) und Phosphat bilden die Kette. Die Basen A, T, G und C sitzen innen und paaren sich komplementär."); }
    });
    var backbonePartB = stage.registerPart(backboneB, {
      key: "backbone-b", title: "Gegenstrang", text: "Der zweite Strang läuft antiparallel. Seine Basen sind komplementär zum ersten Strang: A paart mit T, G mit C.", hint: "Klicken: Komplementarität erklären", shell: true,
      onSelect: function () { stage.setReadout("<strong>Gegenstrang.</strong> Die Stränge sind komplementär und antiparallel. Deshalb kann jeder Strang als Vorlage für eine Kopie dienen."); }
    });

    rungs.forEach(function (rung, index) {
      var base = rung.userData.base;
      var partner = base === "A" ? "T" : base === "T" ? "A" : base === "G" ? "C" : "G";
      var bonds = base === "A" || base === "T" ? "zwei" : "drei";
      stage.registerPart(rung, {
        key: "bp" + index,
        title: "Basenpaar " + base + "–" + partner,
        text: base + " und " + partner + " sind komplementär und werden durch " + bonds + " Wasserstoffbrücken zusammengehalten. " + (bonds === "drei" ? "G–C ist dadurch etwas stabiler als A–T." : "A–T hat zwei Wasserstoffbrücken."),
        hint: "Klicken: Base in den DNA-Baukasten übernehmen",
        onSelect: function () {
          var builderButton = document.querySelector('[data-tool="dna9"] [data-dna-base="' + (base === "A" || base === "T" ? "A" : "G") + '"]');
          if (builderButton) { builderButton.click(); }
          stage.setReadout("<strong>Basenpaar " + base + "–" + partner + ".</strong> " + base + " bindet an " + partner + " (" + bonds + " Wasserstoffbrücken). Im Baukasten wurde " + (base === "A" || base === "T" ? "A" : "G") + " ergänzt.");
        }
      });
    });

    var filter = "all";
    function applyFilter(value) {
      filter = value;
      rungs.forEach(function (rung) {
        var isAT = rung.userData.isAT;
        var match = filter === "all" || (filter === "at" && isAT) || (filter === "gc" && !isAT);
        rung.userData.targetOpacity = match ? 1 : 0.14;
      });
      $$("[data-dna3d-filter]", figure).forEach(function (button) {
        button.setAttribute("aria-pressed", button.dataset.dna3dFilter === filter ? "true" : "false");
      });
      stage.setReadout(filter === "at"
        ? "<strong>A–T-Paare.</strong> Adenin und Thymin sind komplementär. Zwischen ihnen liegen zwei Wasserstoffbrücken."
        : filter === "gc"
          ? "<strong>G–C-Paare.</strong> Guanin und Cytosin sind komplementär. Zwischen ihnen liegen drei Wasserstoffbrücken."
          : "<strong>Alle Basenpaare.</strong> A paart mit T, G mit C. Die Reihenfolge der Basen bildet den genetischen Code.");
    }
    $$("[data-dna3d-filter]", figure).forEach(function (button) {
      button.addEventListener("click", function () { applyFilter(button.dataset.dna3dFilter); });
    });

    var rotating = true;
    stage.addAction({
      label: "Drehen", pressed: true, tip: "Schaltet die langsame Drehung der Helix ein oder aus.",
      onClick: function (button) {
        rotating = !rotating;
        button.setAttribute("aria-pressed", rotating ? "true" : "false");
        if (rotating) { stage.setPaused(false); }
      }
    });

    stage.addUpdate(function (dt, time) {
      if (rotating) { dna.rotation.y += dt * 0.24; }
      dna.position.y = Math.sin(time * 0.8) * 0.08;
      rungs.forEach(function (rung) {
        var mat = rung.userData.material;
        mat.opacity = damp(mat.opacity, rung.userData.targetOpacity, 10, dt);
        mat.transparent = mat.opacity < 0.99;
      });
      var pulse = 0.5 + Math.sin(time * 1.5) * 0.5;
      backboneA.material.emissive = c.accent;
      backboneA.material.emissiveIntensity = 0.03 + pulse * 0.04;
    });

    applyFilter("all");
    return { focusPart: stage.focusPart, reset: stage.resetView, setFilter: applyFilter, stage: stage };
  }

  /* ---------- 6. Selection (Evolution) ---------- */
  function selectionScene(container) {
    var stage = new Stage(container, {
      camera: [0, 9.2, 14.6],
      target: [0, 0, 0],
      fov: 40,
      minDistance: 11,
      maxDistance: 28,
      groundY: -0.28,
      groundSize: 20,
      shadowPlane: false,
      readout: "[data-selection3d-readout]",
      hint: "Ziehen: Fläche drehen · Scrollen: zoomen · Käfer antippen",
      ariaLabel: "3D-Modell einer Käferpopulation auf hellem oder dunklem Untergrund. Helle und dunkle Varianten sind unterschiedlich gut getarnt."
    });
    if (!stage) { return null; }
    var c = stage.colors;
    var figure = container.closest("figure");
    var source = document.querySelector('[data-tool="selection9"]');

    var ground = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 10), standard(c.paper3, { roughness: 0.92 }));
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    stage.scene.add(ground);
    var groundTarget = new THREE.Color(c.paper3);

    var beetleGroup = new THREE.Group();
    stage.scene.add(beetleGroup);
    var lightMat = standard(c.paper, { roughness: 0.58, metalness: 0.02 });
    var darkMat = standard(c.ink, { roughness: 0.5, metalness: 0.04 });
    var beetles = [];
    var total = 40;
    for (var i = 0; i < total; i += 1) {
      var beetle = new THREE.Group();
      var body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), lightMat);
      body.scale.set(1, 0.6, 1.35);
      body.position.y = 0.16;
      body.castShadow = true;
      beetle.add(body);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), lightMat);
      head.position.set(0, 0.18, 0.31);
      beetle.add(head);
      var antennaMat = new THREE.LineBasicMaterial({ color: c.ink2 });
      var antennaGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.24, 0.36), new THREE.Vector3(0, 0.42, 0.52)]);
      beetle.add(new THREE.Line(antennaGeo, antennaMat));
      var antenna2 = new THREE.Line(antennaGeo, antennaMat);
      antenna2.position.x = 0.08;
      beetle.add(antenna2);
      beetle.userData.base = new THREE.Vector3((Math.random() - 0.5) * 14.4, 0, (Math.random() - 0.5) * 8.6);
      beetle.userData.home = beetle.userData.base.clone();
      beetle.userData.phase = Math.random() * TAU;
      beetle.userData.light = i < total / 2;
      beetle.userData.targetScale = 1;
      beetle.position.copy(beetle.userData.home);
      beetle.rotation.y = Math.random() * TAU;
      beetle.visible = i < total / 2;
      beetleGroup.add(beetle);
      beetles.push(beetle);
      stage.registerPart(beetle, {
        key: "beetle" + i,
        title: beetle.userData.light ? "Helle Variante" : "Dunkle Variante",
        text: beetle.userData.light ? "Helle Käfer sind auf hellem Untergrund besser getarnt. Auf dunklem Untergrund fallen sie Fressfeinden eher auf." : "Dunkle Käfer sind auf dunklem Untergrund besser getarnt. Auf hellem Untergrund fallen sie Fressfeinden eher auf.",
        hint: "Klicken: Selektionsdruck erklären",
        onSelect: function (part) {
          var isLight = part.object.userData.light;
          stage.setReadout(isLight
            ? "<strong>Helle Variante.</strong> Auf hellem Untergrund hat sie einen Tarnvorteil. Ihre Überlebens- und Fortpflanzungschance ist höher."
            : "<strong>Dunkle Variante.</strong> Auf dunklem Untergrund hat sie einen Tarnvorteil. Die Umwelt entscheidet, welches Merkmal günstig ist.");
        }
      });
    }

    function currentLightPercent() {
      if (!source) { return 50; }
      var node = source.querySelector("[data-selection-light-value]");
      if (!node) { return 50; }
      return parseFloat(String(node.textContent).replace(",", ".")) || 0;
    }
    function currentBackground() {
      if (!source) { return "light"; }
      var pressed = source.querySelector('[data-selection-bg][aria-pressed="true"]');
      return pressed ? pressed.dataset.selectionBg : "light";
    }
    var lastGeneration = "";
    var lastBackground = null;
    function syncFromSource() {
      var lightPercent = currentLightPercent();
      var countLight = Math.round((lightPercent / 100) * total);
      var background = currentBackground();
      groundTarget.set(background === "light" ? c.paper3 : c.ink2);
      if (background !== lastBackground) {
        ground.material.color.copy(groundTarget);
        lastBackground = background;
      }
      $$("[data-selection3d-bg]", figure).forEach(function (button) {
        button.setAttribute("aria-pressed", button.dataset.selection3dBg === background ? "true" : "false");
      });
      beetles.forEach(function (beetle, index) {
        var isLight = index < countLight;
        beetle.userData.light = isLight;
        beetle.children.forEach(function (child) {
          if (child.isMesh) { child.material = isLight ? lightMat : darkMat; }
        });
        beetle.userData.targetScale = 1;
        if (!beetle.visible) { beetle.visible = true; }
      });
      var generationNode = source ? source.querySelector("[data-selection-generation]") : null;
      var generationText = generationNode ? generationNode.textContent : "";
      if (generationText !== lastGeneration) {
        lastGeneration = generationText;
        beetles.forEach(function (beetle) {
          beetle.userData.home.set((Math.random() - 0.5) * 14.4, 0, (Math.random() - 0.5) * 8.6);
        });
      }
    }

    if (source) {
      var observer = new MutationObserver(syncFromSource);
      observer.observe(source, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-pressed", "style"] });
    }

    $$("[data-selection3d-bg]", figure).forEach(function (button) {
      button.addEventListener("click", function () {
        if (!source) { return; }
        var target = source.querySelector('[data-selection-bg="' + button.dataset.selection3dBg + '"]');
        if (target) { target.click(); }
        $$("[data-selection3d-bg]", figure).forEach(function (inner) { inner.setAttribute("aria-pressed", inner === button ? "true" : "false"); });
      });
    });
    var nextButton = figure.querySelector("[data-selection3d-next]");
    if (nextButton) { nextButton.addEventListener("click", function () { if (source) { var button = source.querySelector("[data-selection-next]"); if (button) { button.click(); } } }); }
    var resetButton = figure.querySelector("[data-selection3d-reset]");
    if (resetButton) { resetButton.addEventListener("click", function () { if (source) { var button = source.querySelector("[data-selection-reset]"); if (button) { button.click(); } } }); }

    stage.addAction({
      label: "Nächste Generation", tip: "Lässt die Population eine Generation weiterlaufen. Die Häufigkeit der besser getarnten Variante steigt.",
      onClick: function () { if (source) { var button = source.querySelector("[data-selection-next]"); if (button) { button.click(); } } }
    });
    stage.addAction({
      label: "Zurücksetzen", tip: "Setzt die Population auf 50 % helle und 50 % dunkle Käfer zurück.",
      onClick: function () { if (source) { var button = source.querySelector("[data-selection-reset]"); if (button) { button.click(); } } }
    });

    stage.addUpdate(function (dt, time) {
      ground.material.color.lerp(groundTarget, 1 - Math.exp(-5 * dt));
      beetles.forEach(function (beetle) {
        var home = beetle.userData.home;
        var phase = beetle.userData.phase;
        beetle.position.x = damp(beetle.position.x, home.x + Math.sin(time * 0.7 + phase) * 0.26, 3.5, dt);
        beetle.position.z = damp(beetle.position.z, home.z + Math.cos(time * 0.55 + phase) * 0.22, 3.5, dt);
        beetle.position.y = 0.02 + Math.sin(time * 2.2 + phase) * 0.012;
        beetle.rotation.y = damp(beetle.rotation.y, Math.atan2(home.x - beetle.position.x, home.z - beetle.position.z), 0.7, dt);
      });
    });

    syncFromSource();
    stage.setReadout("<strong>Selektion im Modell.</strong> Helle und dunkle Käfer sind unterschiedlich getarnt. Wähle einen Untergrund und lasse die nächste Generation laufen.");
    return { focusPart: stage.focusPart, reset: stage.resetView, sync: syncFromSource, stage: stage };
  }

  /* =====================================================================
     Bootstrap
     ===================================================================== */
  var scenes = Object.create(null);
  function initAll() {
    $$("[data-scene]").forEach(function (container) {
      var type = container.dataset.scene;
      if (scenes[container.id]) { return; }
      var api = null;
      if (type === "neuron") { api = neuronScene(container); }
      if (type === "eye") { api = eyeScene(container); }
      if (type === "ear") { api = earScene(container); }
      if (type === "synapse") { api = synapseScene(container); }
      if (type === "ecosystem") { api = ecosystemScene(container); }
      if (type === "microscope") { api = microscopeScene(container); }
      if (type === "microbe") { api = microbeScene(container); }
      if (type === "insect") { api = insectScene(container); }
      if (type === "soil") { api = soilScene(container); }
      if (type === "dna") { api = dnaScene(container); }
      if (type === "selection") { api = selectionScene(container); }
      if (!api) { return; }
      scenes[container.id] = api;
      container.dataset.sceneReady = "true";
    });
  }

  window.Bio3D = { initAll: initAll, scenes: scenes };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
