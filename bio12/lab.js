/* Bio 12 · interactive 3D lab layer
 * Built on the existing Three.js + OrbitControls vendor files.
 * Every scene is user-controlled, has a still SVG fallback in the markup,
 * uses delta time, damped camera motion and an accessible HTML readout.
 * Kept inside bio12 so other year groups keep their existing behaviour. */
(function () {
  "use strict";

  if (!window.THREE) {
    window.Bio12Lab = { initAll: function () {}, scenes: {}, builders: {} };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initGenericTips);
    } else {
      initGenericTips();
    }
    return;
  }

  var scenes = Object.create(null);
  var rgbCache = Object.create(null);
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function damp(current, target, lambda, dt) {
    return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
  }
  function smoothstep(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function de(value, digits) {
    return Number(value).toLocaleString("de-DE", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }
  function tokenRgb(name) {
    if (rgbCache[name]) { return rgbCache[name]; }
    var probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.color = "var(" + name + ")";
    document.body.appendChild(probe);
    var css = getComputedStyle(probe).color;
    probe.remove();
    var canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    var ctx = canvas.getContext("2d");
    var rgb = "rgb(40,40,40)";
    try {
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      var data = ctx.getImageData(0, 0, 1, 1).data;
      rgb = "rgb(" + data[0] + "," + data[1] + "," + data[2] + ")";
    } catch (error) {}
    rgbCache[name] = rgb;
    return rgb;
  }
  function color(name) { return new THREE.Color(tokenRgb(name)); }
  function makeLabel(text, options) {
    options = options || {};
    var canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 200;
    var ctx = canvas.getContext("2d");
    var sheet = tokenRgb("--color-sheet");
    var ink = tokenRgb("--color-ink");
    var accent = tokenRgb("--color-accent");
    var rule = tokenRgb("--color-rule");
    ctx.fillStyle = sheet;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 10, canvas.height);
    ctx.strokeStyle = rule;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    ctx.fillStyle = ink;
    ctx.font = "600 100px 'Hanken Grotesk', sans-serif";
    ctx.textBaseline = "middle";
    var label = String(text);
    var measured = ctx.measureText(label).width;
    if (measured > canvas.width - 60) {
      ctx.font = "600 82px 'Hanken Grotesk', sans-serif";
    }
    ctx.fillText(label, 36, canvas.height / 2 + 2);
    var texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    var material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: true
    });
    var sprite = new THREE.Sprite(material);
    var width = options.width || 2.2;
    sprite.scale.set(width, width * 0.3125, 1);
    sprite.renderOrder = 20;
    return sprite;
  }
  function ensureStageTip(container) {
    var tip = container.querySelector("[data-lab-tip]");
    if (!tip) {
      tip = document.createElement("div");
      tip.setAttribute("data-lab-tip", "");
      container.appendChild(tip);
    }
    tip.className = "lab-tip lab-tip--stage";
    tip.setAttribute("aria-hidden", "true");
    tip.innerHTML = '<p class="lab-tip__title"></p><p class="lab-tip__body"></p><p class="lab-tip__meta"></p>';
    return tip;
  }
  function setTipContent(tip, data) {
    $(".lab-tip__title", tip).textContent = data.title || "";
    $(".lab-tip__body", tip).textContent = data.body || "";
    var meta = $(".lab-tip__meta", tip);
    if (data.meta) { meta.textContent = data.meta; meta.hidden = false; }
    else { meta.textContent = ""; meta.hidden = true; }
  }
  function positionStageTip(tip, container, clientX, clientY) {
    var rect = container.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var maxWidth = Math.min(340, Math.max(180, rect.width - 20));
    tip.style.maxWidth = maxWidth + "px";
    var half = Math.min(maxWidth, tip.offsetWidth || maxWidth) / 2;
    x = clamp(x, half + 8, rect.width - half - 8);
    var below = y < 110;
    tip.classList.toggle("is-below", below);
    tip.style.left = x + "px";
    tip.style.top = clamp(y, 8, rect.height - 8) + "px";
    tip.classList.add("is-visible");
    tip.setAttribute("aria-hidden", "false");
  }
  function hideStageTip(tip) {
    tip.classList.remove("is-visible");
    tip.setAttribute("aria-hidden", "true");
  }

  function createStage(container, options) {
    options = options || {};
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power"
      });
    } catch (error) {
      return null;
    }
    if (!renderer) { return null; }
    var width = Math.max(1, container.clientWidth);
    var height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = Boolean(options.shadows);
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ("outputEncoding" in renderer && THREE.sRGBEncoding) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(options.fov || 38, width / height, 0.1, 140);
    var startPosition = new THREE.Vector3().fromArray(options.position || [0, 6, 14]);
    var startTarget = new THREE.Vector3().fromArray(options.target || [0, 0, 0]);
    camera.position.copy(startPosition);
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = reduced ? 0.11 : 0.075;
    controls.enablePan = false;
    controls.rotateSpeed = 0.62;
    controls.zoomSpeed = 0.8;
    controls.minDistance = options.minDistance || 6;
    controls.maxDistance = options.maxDistance || 28;
    controls.minPolarAngle = options.minPolarAngle != null ? options.minPolarAngle : 0.18;
    controls.maxPolarAngle = options.maxPolarAngle != null ? options.maxPolarAngle : Math.PI / 2.05;
    controls.target.copy(startTarget);
    controls.update();

    var ink = color("--color-ink");
    var paper = color("--color-paper");
    var paper2 = color("--color-paper-2");
    var paper3 = color("--color-paper-3");
    var sheet = color("--color-sheet");
    var accent = color("--color-accent");
    var rule = color("--color-rule");
    var muted = color("--color-muted");

    var hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a44, 0.72);
    scene.add(hemi);
    var ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);
    var key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(6, 11, 8);
    if (options.shadows) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -10;
      key.shadow.camera.right = 10;
      key.shadow.camera.top = 10;
      key.shadow.camera.bottom = -10;
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 40;
      key.shadow.bias = -0.0005;
      key.shadow.normalBias = 0.03;
    }
    scene.add(key);
    var rim = new THREE.DirectionalLight(accent.getHex(), 0.38);
    rim.position.set(-7, 5, -8);
    scene.add(rim);

    var tip = ensureStageTip(container);
    var clock = new THREE.Clock();
    var elapsed = 0;
    var visible = true;
    var paused = true;
    var speed = 1;
    var cameraAnimation = null;
    var frameCallbacks = [];
    var playCallbacks = [];
    var hoverController = null;

    function resize() {
      var w = Math.max(1, container.clientWidth);
      var h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(container);
    } else {
      window.addEventListener("resize", resize);
    }
    window.addEventListener("resize", resize);
    resize();

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting; });
      }, { rootMargin: "100px" }).observe(container);
    }

    var fallback = container.querySelector(".tool__fallback");
    if (fallback) { fallback.hidden = true; }
    container.dataset.sceneReady = "true";

    function animateCameraTo(position, target, duration) {
      cameraAnimation = {
        fromPosition: camera.position.clone(),
        toPosition: position.clone(),
        fromTarget: controls.target.clone(),
        toTarget: target.clone(),
        start: performance.now(),
        duration: duration || 620
      };
      controls.enabled = false;
    }

    var api = {
      container: container,
      scene: scene,
      camera: camera,
      renderer: renderer,
      controls: controls,
      tip: tip,
      colors: { ink: ink, paper: paper, paper2: paper2, paper3: paper3, sheet: sheet, accent: accent, rule: rule, muted: muted },
      onFrame: function (callback) { frameCallbacks.push(callback); },
      onPlayChange: function (callback) { playCallbacks.push(callback); },
      isPlaying: function () { return !paused; },
      setPlaying: function (value) {
        paused = !value;
        $$("[data-lab-play]", container.closest("figure") || container).forEach(function (button) {
          button.setAttribute("aria-pressed", value ? "true" : "false");
          button.textContent = value
            ? (button.dataset.labPauseLabel || "Pause")
            : (button.dataset.labPlayLabel || "Abspielen");
        });
        playCallbacks.forEach(function (callback) { callback(Boolean(value)); });
      },
      setSpeed: function (value) {
        speed = Number(value) || 1;
        $$("[data-lab-speed]", container.closest("figure") || container).forEach(function (button) {
          button.setAttribute("aria-pressed", Number(button.dataset.labSpeed) === speed ? "true" : "false");
        });
      },
      getSpeed: function () { return speed; },
      resetView: function () {
        animateCameraTo(startPosition, startTarget, 680);
      },
      showTip: function (data, event) {
        setTipContent(tip, data);
        positionStageTip(tip, container, event.clientX, event.clientY);
      },
      hideTip: function () { hideStageTip(tip); },
      resize: resize,
      setHover: function (controller) { hoverController = controller; },
      canvas: renderer.domElement
    };

    $$("[data-lab-play]", container.closest("figure") || container).forEach(function (button) {
      button.setAttribute("aria-pressed", "false");
      button.textContent = button.dataset.labPlayLabel || "Abspielen";
      button.addEventListener("click", function () {
        api.setPlaying(!api.isPlaying());
      });
    });
    $$("[data-lab-speed]", container.closest("figure") || container).forEach(function (button) {
      var value = Number(button.dataset.labSpeed) || 1;
      button.setAttribute("aria-pressed", value === speed ? "true" : "false");
      button.addEventListener("click", function () { api.setSpeed(value); });
    });
    $$("[data-lab-reset-view]", container.closest("figure") || container).forEach(function (button) {
      button.addEventListener("click", function () { api.resetView(); });
    });
    $$("[data-lab-step]", container.closest("figure") || container).forEach(function (button) {
      button.addEventListener("click", function () {
        if (typeof api.step === "function") { api.step(); }
      });
    });
    $$("[data-lab-reset]", container.closest("figure") || container).forEach(function (button) {
      button.addEventListener("click", function () {
        if (typeof api.resetAll === "function") { api.resetAll(); }
        api.resetView();
      });
    });

    renderer.domElement.addEventListener("dblclick", function () { api.resetView(); });
    renderer.domElement.addEventListener("contextmenu", function (event) { event.preventDefault(); });

    function loop() {
      window.requestAnimationFrame(loop);
      var dt = Math.min(clock.getDelta(), 0.05);
      if (!visible || container.offsetParent === null) { return; }
      if (renderer.domElement.width <= 1 || renderer.domElement.height <= 1) { resize(); }
      if (cameraAnimation) {
        var now = performance.now();
        var t = clamp((now - cameraAnimation.start) / cameraAnimation.duration, 0, 1);
        var eased = easeInOutCubic(t);
        camera.position.lerpVectors(cameraAnimation.fromPosition, cameraAnimation.toPosition, eased);
        controls.target.lerpVectors(cameraAnimation.fromTarget, cameraAnimation.toTarget, eased);
        if (t >= 1) {
          cameraAnimation = null;
          controls.enabled = true;
        }
      }
      controls.update();
      var activeDt = paused ? 0 : dt * speed;
      elapsed += activeDt;
      frameCallbacks.forEach(function (callback) {
        try { callback(dt, activeDt, elapsed); } catch (error) { console.error(error); }
      });
      renderer.render(scene, camera);
    }
    loop();
    api.resize();

    return api;
  }

  function createHover(api, objects, handlers) {
    handlers = handlers || {};
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var current = null;
    var lastEvent = null;
    var rect;

    function anchorOf(object) {
      var node = object;
      while (node) {
        if (node.userData && node.userData.labTip) { return node; }
        node = node.parent;
      }
      return null;
    }
    function pick(clientX, clientY) {
      rect = api.canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      raycaster.setFromCamera(pointer, api.camera);
      var hits = raycaster.intersectObjects(objects, true);
      for (var i = 0; i < hits.length; i += 1) {
        var anchor = anchorOf(hits[i].object);
        if (anchor) { return { anchor: anchor, hit: hits[i] }; }
      }
      return null;
    }
    function enter(result, event) {
      current = result.anchor;
      api.container.classList.add("is-hovering");
      var data = result.anchor.userData.labTip;
      setTipContent(api.tip, data);
      if (event) { positionStageTip(api.tip, api.container, event.clientX, event.clientY); }
      if (handlers.enter) { handlers.enter(result.anchor, result.hit); }
    }
    function leave() {
      if (current && handlers.leave) { handlers.leave(current); }
      current = null;
      api.container.classList.remove("is-hovering");
      api.hideTip();
    }
    function onMove(event) {
      lastEvent = event;
      var result = pick(event.clientX, event.clientY);
      if (!result) {
        if (current) { leave(); }
        return;
      }
      if (result.anchor !== current) {
        if (current) { leave(); }
        enter(result, event);
      } else {
        positionStageTip(api.tip, api.container, event.clientX, event.clientY);
      }
    }
    api.canvas.addEventListener("pointermove", onMove);
    api.canvas.addEventListener("pointerleave", function () { leave(); });
    api.canvas.addEventListener("pointerdown", function (event) {
      var result = pick(event.clientX, event.clientY);
      if (!result) { return; }
      if (handlers.click) { handlers.click(result.anchor, result.hit, event); }
      if (!current) { enter(result, event); }
    });
    var controller = {
      refresh: function () {
        if (lastEvent && current) {
          positionStageTip(api.tip, api.container, lastEvent.clientX, lastEvent.clientY);
        }
      },
      clear: leave
    };
    api.setHover(controller);
    return controller;
  }

  /* ---------- methods: the path of an investigation ---------- */
  var METHOD_STAGES = [
    {
      label: "Phänomen",
      title: "1 · Phänomen beobachten",
      body: "Du beobachtest etwas, das eine Frage auslöst, etwa unterschiedliche Blattfarben an einem Standort.",
      meta: "Beobachtung · noch keine Erklärung"
    },
    {
      label: "Frage",
      title: "2 · Forschungsfrage",
      body: "Formuliere die Beobachtung als prüfbare Frage. Sie muss auf einen Zusammenhang oder Unterschied zielen.",
      meta: "Frage · prüfbar"
    },
    {
      label: "Hypothese",
      title: "3 · Hypothese",
      body: "Die Hypothese ist eine begründete, vorläufige Antwort. Sie muss falsifizierbar sein: Daten können sie widerlegen.",
      meta: "Hypothese · falsifizierbar"
    },
    {
      label: "Vorhersage",
      title: "4 · Vorhersage",
      body: "Leite aus der Hypothese ab, welches Ergebnis du erwarten würdest, wenn sie zutrifft. Nenne Messgröße und Richtung.",
      meta: "Wenn-dann · konkret"
    },
    {
      label: "Untersuchung",
      title: "5 · Untersuchung planen",
      body: "Lege unabhängige und abhängige Variable, Kontrollgruppe, Stichprobe und Störgrößen fest. Nur so ist der Effekt eindeutig.",
      meta: "Variable · Kontrolle · Stichprobe"
    },
    {
      label: "Daten",
      title: "6 · Daten erheben",
      body: "Miss mit Einheit, dokumentiere die Bedingungen und wiederhole die Messung. Ein Einzelwert ist noch kein Muster.",
      meta: "Messgröße · Einheit · Streuung"
    },
    {
      label: "Auswertung",
      title: "7 · Daten auswerten",
      body: "Trenne Beschreibung und Interpretation. Prüfe, ob die Daten zur Vorhersage passen, und nenne Grenzen sowie Fehlerquellen.",
      meta: "Befund · Interpretation · Grenze"
    }
  ];

  function buildMethods(container) {
    var api = createStage(container, {
      fov: 37,
      position: [0, 6.8, 12.6],
      target: [0, 1.3, 0],
      minDistance: 7,
      maxDistance: 28,
      maxPolarAngle: Math.PI / 2.1,
      shadows: true
    });
    if (!api) { return null; }
    var C = api.colors;
    var group = new THREE.Group();
    api.scene.add(group);

    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 8.4),
      new THREE.ShadowMaterial({ color: C.ink, opacity: 0.18 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.16;
    floor.receiveShadow = true;
    group.add(floor);
    var floorRule = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(14, 8.4)),
      new THREE.LineBasicMaterial({ color: C.rule, transparent: true, opacity: 0.8 })
    );
    floorRule.rotation.x = -Math.PI / 2;
    floorRule.position.y = -0.15;
    group.add(floorRule);

    var steps = [];
    var labels = [];
    var stepMaterial = new THREE.MeshStandardMaterial({
      color: C.paper,
      roughness: 0.68,
      metalness: 0.04
    });
    var supportMaterial = new THREE.MeshStandardMaterial({
      color: C.rule,
      roughness: 0.8,
      metalness: 0.02
    });
    var stagePositions = [];

    METHOD_STAGES.forEach(function (stage, index) {
      var x = -6.3 + index * 2.1;
      var y = index * 0.43;
      var material = stepMaterial.clone();
      var step = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 1.55), material);
      step.position.set(x, y, 0);
      step.castShadow = true;
      step.receiveShadow = true;
      step.userData.labTip = {
        title: stage.title,
        body: stage.body,
        meta: stage.meta
      };
      step.userData.stageIndex = index;
      step.userData.baseY = y;
      group.add(step);
      var edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(step.geometry),
        new THREE.LineBasicMaterial({ color: C.muted, transparent: true, opacity: 0.55 })
      );
      edges.position.copy(step.position);
      group.add(edges);
      steps.push(step);
      stagePositions.push(new THREE.Vector3(x, y + 0.55, 0));

      var support = new THREE.Mesh(new THREE.BoxGeometry(0.12, Math.max(0.2, y + 0.16), 0.12), supportMaterial);
      support.position.set(x, (y - 0.16) / 2, 0);
      support.castShadow = true;
      group.add(support);

      var label = makeLabel(stage.label, { width: 2.35 });
      label.position.set(x, y + 1.17, 0);
      group.add(label);
      labels.push(label);
    });

    var pathPoints = stagePositions.map(function (point) {
      return new THREE.Vector3(point.x, point.y + 0.05, point.z);
    });
    var pathCurve = new THREE.CatmullRomCurve3(pathPoints);
    var pathGeometry = new THREE.BufferGeometry().setFromPoints(pathCurve.getPoints(160));
    var path = new THREE.Line(pathGeometry, new THREE.LineDashedMaterial({
      color: C.rule,
      dashSize: 0.22,
      gapSize: 0.16,
      transparent: true,
      opacity: 0.9
    }));
    path.computeLineDistances();
    group.add(path);

    var probe = new THREE.Group();
    var probeCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.19, 1),
      new THREE.MeshStandardMaterial({
        color: C.accent,
        emissive: C.accent,
        emissiveIntensity: 0.6,
        roughness: 0.35,
        metalness: 0.1
      })
    );
    probe.add(probeCore);
    var probeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.55 })
    );
    probeRing.rotation.x = Math.PI / 2;
    probe.add(probeRing);
    group.add(probe);

    var progress = 0;
    var selected = 0;
    var readout = container.closest("figure").querySelector("[data-methods-readout]");
    var indexOutput = container.closest("figure").querySelector("[data-methods-index]");

    function updateReadout(index) {
      selected = clamp(index, 0, METHOD_STAGES.length - 1);
      var stage = METHOD_STAGES[selected];
      if (readout) {
        readout.innerHTML = '<span class="lab-verdict">Schritt ' + (selected + 1) + " von " + METHOD_STAGES.length + "</span> " +
          "<strong>" + escapeHtml(stage.title.replace(/^\d+ · /, "")) + ".</strong> " +
          escapeHtml(stage.body) +
          ' <span class="lab-stat">' + escapeHtml(stage.meta) + "</span>";
      }
      if (indexOutput) { indexOutput.textContent = (selected + 1) + " / " + METHOD_STAGES.length; }
      steps.forEach(function (step, stepIndex) {
        var material = step.material;
        material.color.copy(stepIndex === selected ? C.paper : C.paper);
        material.emissive.copy(C.accent);
        material.emissiveIntensity = stepIndex === selected ? 0.18 : 0;
      });
      labels.forEach(function (label, labelIndex) {
        var target = labelIndex === selected ? 1.08 : 1;
        label.scale.set(2.35 * target, 2.35 * 0.3125 * target, 1);
        if (labelIndex !== selected) {
          label.position.y = steps[labelIndex].position.y + 1.17;
        }
      });
    }

    function setProgress(value, announce) {
      progress = clamp(value, 0, METHOD_STAGES.length - 1);
      var index = Math.round(progress);
      var f = Math.floor(progress);
      var frac = smoothstep(progress - f);
      var a = stagePositions[f];
      var b = stagePositions[Math.min(METHOD_STAGES.length - 1, f + 1)];
      var position = new THREE.Vector3().lerpVectors(a, b, f === METHOD_STAGES.length - 1 ? 0 : frac);
      position.y += Math.sin((progress % 1) * Math.PI) * 0.26;
      probe.position.copy(position);
      probeRing.rotation.z += 0.01;
      if (announce !== false && index !== selected) { updateReadout(index); }
    }

    setProgress(0, false);
    updateReadout(0);

    api.onFrame(function (dt, activeDt, elapsedTime) {
      if (activeDt > 0) {
        progress += activeDt * 0.46;
        if (progress >= METHOD_STAGES.length - 1) {
          progress = METHOD_STAGES.length - 1;
          api.setPlaying(false);
          updateReadout(METHOD_STAGES.length - 1);
          if (readout) {
            readout.innerHTML += ' <span class="lab-stat">Weg vollständig · mit „Schritt“ oder einem Klick wiederholen.</span>';
          }
        }
        setProgress(progress, true);
      }
      probe.rotation.y += dt * 0.8;
      probeRing.position.y = Math.sin(elapsedTime * 1.6) * 0.04;
      labels.forEach(function (label, index) {
        if (index === selected) {
          label.position.y = steps[index].position.y + 1.17 + Math.sin(elapsedTime * 1.4) * 0.03;
        }
      });
    });

    var hover = createHover(api, steps, {
      enter: function (step) {
        step.material.emissive.copy(C.accent);
        step.material.emissiveIntensity = 0.2;
      },
      leave: function (step) {
        step.material.emissiveIntensity = step.userData.stageIndex === selected ? 0.18 : 0;
      },
      click: function (step) {
        api.setPlaying(false);
        progress = step.userData.stageIndex;
        setProgress(progress, true);
        updateReadout(step.userData.stageIndex);
      }
    });

    api.step = function () {
      api.setPlaying(false);
      var next = Math.round(progress) + 1;
      if (next >= METHOD_STAGES.length) { next = 0; }
      progress = next;
      setProgress(progress, true);
      updateReadout(next);
      hover.clear();
    };
    api.onPlayChange(function (playing) {
      if (playing && progress >= METHOD_STAGES.length - 1) {
        progress = 0;
        setProgress(0, true);
        updateReadout(0);
      }
    });
    api.resetAll = function () {
      api.setPlaying(false);
      progress = 0;
      setProgress(0, true);
      updateReadout(0);
      hover.clear();
    };
    api.hover = hover;
    return api;
  }

  /* ---------- genetics: DNA double helix ---------- */
  function buildDNA(container) {
    var api = createStage(container, {
      fov: 34,
      position: [0, 2.2, 18.5],
      target: [0, 0.3, 0],
      minDistance: 10,
      maxDistance: 30,
      maxPolarAngle: Math.PI / 2.05,
      minPolarAngle: 0.22
    });
    if (!api) { return null; }
    var C = api.colors;
    var figure = container.closest("figure");
    var group = new THREE.Group();
    api.scene.add(group);

    var radius = 3.1;
    var height = 12;
    var turns = 2.4;
    var steps = 200;
    var pointsA = [];
    var pointsB = [];
    for (var i = 0; i <= steps; i += 1) {
      var t = i / steps;
      var angle = t * turns * Math.PI * 2;
      var y = -height / 2 + t * height;
      pointsA.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      pointsB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
    }
    function tube(points, tubeColor) {
      var curve = new THREE.CatmullRomCurve3(points);
      var geometry = new THREE.TubeGeometry(curve, 260, 0.15, 10, false);
      var material = new THREE.MeshStandardMaterial({
        color: tubeColor,
        roughness: 0.44,
        metalness: 0.08
      });
      return new THREE.Mesh(geometry, material);
    }
    var strandA = tube(pointsA, C.ink);
    var strandB = tube(pointsB, C.muted);
    strandA.castShadow = false;
    group.add(strandA);
    group.add(strandB);

    var baseColors = [
      color("--color-base-a"),
      color("--color-base-t"),
      color("--color-base-g"),
      color("--color-base-c")
    ];
    var letters = ["A", "T", "G", "C"];
    var complement = { A: "T", T: "A", G: "C", C: "G" };
    var pairGroups = [];
    var pairCount = 32;
    var hBonds = { A: 2, T: 2, G: 3, C: 3 };

    function addHalf(groupRef, start, end, mat) {
      var direction = new THREE.Vector3().subVectors(end, start);
      var length = direction.length();
      if (length < 0.02) { return; }
      var geometry = new THREE.CylinderGeometry(0.095, 0.095, length, 8);
      var cylinder = new THREE.Mesh(geometry, mat);
      cylinder.position.copy(start).add(end).multiplyScalar(0.5);
      cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      groupRef.add(cylinder);
    }

    for (var p = 0; p < pairCount; p += 1) {
      var index = Math.round((p / (pairCount - 1)) * steps);
      var a = pointsA[index];
      var b = pointsB[index];
      var mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      var direction = new THREE.Vector3().subVectors(b, a).normalize();
      var gap = 0.08;
      var leftBase = letters[(p * 5 + 1) % 4];
      var rightBase = complement[leftBase];
      var pairGroup = new THREE.Group();
      pairGroup.position.copy(mid);
      var leftMat = new THREE.MeshStandardMaterial({
        color: baseColors[letters.indexOf(leftBase)].clone(),
        roughness: 0.48,
        metalness: 0.04
      });
      var rightMat = new THREE.MeshStandardMaterial({
        color: baseColors[letters.indexOf(rightBase)].clone(),
        roughness: 0.48,
        metalness: 0.04
      });
      addHalf(pairGroup, a.clone().sub(mid), mid.clone().addScaledVector(direction, -gap).sub(mid), leftMat);
      addHalf(pairGroup, mid.clone().addScaledVector(direction, gap).sub(mid), b.clone().sub(mid), rightMat);
      pairGroup.userData.labTip = {
        title: leftBase + "–" + rightBase + " Basenpaar",
        body: leftBase + " und " + rightBase + " sind komplementär. Sie werden durch " +
          hBonds[leftBase] + " Wasserstoffbrücken verbunden. " +
          (leftBase === "A" || leftBase === "T"
            ? "A–T bildet zwei Wasserstoffbrücken."
            : "G–C bildet drei Wasserstoffbrücken und stabilisiert die Helix stärker."),
        meta: "Basenpaar " + (p + 1) + " von " + pairCount + " · Wasserstoffbrücken"
      };
      pairGroup.userData.base = leftBase;
      pairGroup.userData.partner = rightBase;
      pairGroup.userData.index = p;
      group.add(pairGroup);
      pairGroups.push(pairGroup);
    }

    function addEndLabel(text, position, width) {
      var label = makeLabel(text, { width: width || 0.9 });
      label.position.copy(position);
      group.add(label);
    }
    addEndLabel("5′", pointsA[0].clone().add(new THREE.Vector3(0.55, 0.9, 0.3)), 0.8);
    addEndLabel("3′", pointsB[0].clone().add(new THREE.Vector3(-0.55, 0.9, -0.3)), 0.8);
    addEndLabel("3′", pointsA[steps].clone().add(new THREE.Vector3(0.55, -1.35, -0.3)), 0.8);
    addEndLabel("5′", pointsB[steps].clone().add(new THREE.Vector3(-0.55, -1.35, 0.3)), 0.8);

    var pairsInput = figure ? figure.querySelector("[data-lab-pairs]") : null;
    if (pairsInput) {
      pairGroups.forEach(function (pair) { pair.visible = pairsInput.checked; });
      pairsInput.addEventListener("change", function () {
        pairGroups.forEach(function (pair) { pair.visible = pairsInput.checked; });
        api.hideTip();
      });
    }

    var spin = 0;
    var readout = figure ? figure.querySelector("[data-dna-readout]") : null;
    var selected = null;
    function setReadout(text) {
      if (readout) { readout.innerHTML = text; }
    }
    function paintPair(pair, on) {
      if (!pair) { return; }
      pair.traverse(function (child) {
        if (child.isMesh && child.material && child.material.emissive) {
          if (on) {
            child.material.emissive.copy(C.accent);
            child.material.emissiveIntensity = 0.33;
          } else {
            child.material.emissive.setRGB(0, 0, 0);
            child.material.emissiveIntensity = 0;
          }
        }
      });
    }
    setReadout('<span class="lab-verdict">Modell</span> Die Farben markieren A, T, G und C. Fahre über eine Sprosse, um die Basenpaarung zu lesen. Am oberen und unteren Ende stehen die 5′- und 3′-Enden: Die Stränge laufen antiparallel.');

    api.onFrame(function (dt, activeDt, elapsedTime) {
      var targetSpin = api.isPlaying() ? 0.3 : 0;
      spin = damp(spin, targetSpin, 3.2, dt);
      group.rotation.y += spin * activeDt;
      group.rotation.z = Math.sin(elapsedTime * 0.5) * 0.012;
      pairGroups.forEach(function (pair, index) {
        var hovered = pair === selected;
        var target = hovered ? 1.14 : 1;
        var scale = damp(pair.scale.x, target, 8, dt);
        pair.scale.setScalar(scale);
      });
    });

    var hover = createHover(api, pairGroups, {
      enter: function (pair) {
        selected = pair;
        paintPair(pair, true);
      },
      leave: function (pair) {
        paintPair(pair, false);
        if (selected === pair) { selected = null; }
      },
      click: function (pair) {
        api.setPlaying(false);
        var base = pair.userData.base;
        var partner = pair.userData.partner;
        var drug = base === "A" || base === "T"
          ? "Zwei Wasserstoffbrücken machen A–T etwas leichter trennbar als G–C."
          : "Drei Wasserstoffbrücken machen G–C stabiler. Das ist für die Schmelztemperatur der DNA wichtig.";
        setReadout('<span class="lab-verdict">Gewählt</span> <strong>' + base + "–" + partner +
          "</strong> " + drug + ' <span class="lab-stat">Basenpaar ' + (pair.userData.index + 1) + " von " + pairCount + "</span>");
      }
    });

    api.step = function () {
      var next = Math.floor(Math.random() * pairGroups.length);
      var pair = pairGroups[next];
      if (selected) { paintPair(selected, false); }
      selected = pair;
      paintPair(pair, true);
      setReadout('<span class="lab-verdict">Beispiel</span> <strong>' + pair.userData.base + "–" + pair.userData.partner +
        ".</strong> " + (pair.userData.base === "A" || pair.userData.base === "T"
          ? "A paart mit T über zwei Wasserstoffbrücken."
          : "G paart mit C über drei Wasserstoffbrücken.") +
        ' <span class="lab-stat">In der RNA steht U anstelle von T.</span>');
    };
    api.resetAll = function () {
      api.setPlaying(false);
      group.rotation.set(0, 0, 0);
      spin = 0;
      if (selected) { paintPair(selected, false); }
      selected = null;
      setReadout('<span class="lab-verdict">Modell</span> Die Farben markieren A, T, G und C. Fahre über eine Sprosse, um die Basenpaarung zu lesen.');
      hover.clear();
    };
    api.hover = hover;
    return api;
  }

  /* ---------- genetics: chromatin switch ---------- */
  function buildChromatin(container) {
    var api = createStage(container, {
      fov: 36,
      position: [5.6, 4.6, 10.0],
      target: [0, 0, 0],
      minDistance: 6,
      maxDistance: 24,
      maxPolarAngle: Math.PI / 2.1
    });
    if (!api) { return null; }
    var C = api.colors;
    var figure = container.closest("figure");
    var group = new THREE.Group();
    group.rotation.y = -0.3;
    api.scene.add(group);

    var histoneCount = 7;
    var spacing = 1.75;
    var histones = [];
    var histoneGeo = new THREE.SphereGeometry(0.3, 18, 14);
    var histoneMat = new THREE.MeshStandardMaterial({
      color: C.paper,
      roughness: 0.62,
      metalness: 0.04
    });
    for (var h = 0; h < histoneCount; h += 1) {
      var histone = new THREE.Group();
      histone.position.set((h - 3) * spacing, 0, 0);
      for (var hp = 0; hp < 8; hp += 1) {
        var phi = Math.acos(1 - 2 * (hp + 0.5) / 8);
        var theta = Math.PI * (1 + Math.sqrt(5)) * hp;
        var protein = new THREE.Mesh(histoneGeo, histoneMat);
        protein.position.set(
          Math.sin(phi) * Math.cos(theta) * 0.42,
          Math.cos(phi) * 0.42,
          Math.sin(phi) * Math.sin(theta) * 0.42
        );
        histone.add(protein);
      }
      histone.userData.labTip = {
        title: "Histonoktamer",
        body: "Acht Histonproteine bilden einen Kern, um den sich die DNA wickelt. Die Verpackung entscheidet mit, ob ein Gen abgelesen werden kann.",
        meta: "Chromatin · Verpackungseinheit"
      };
      histone.userData.index = h;
      group.add(histone);
      histones.push(histone);
    }

    var dnaCount = 300;
    var dnaGeo = new THREE.SphereGeometry(0.062, 8, 6);
    var dnaMat = new THREE.MeshStandardMaterial({
      color: C.ink,
      roughness: 0.5,
      metalness: 0.06
    });
    var dnaBeads = new THREE.InstancedMesh(dnaGeo, dnaMat, dnaCount);
    dnaBeads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(dnaBeads);
    var dnaDummy = new THREE.Object3D();
    for (var dInit = 0; dInit < dnaCount; dInit += 1) {
      var initPoint = new THREE.Vector3(
        -6.5 + (dInit / (dnaCount - 1)) * 13,
        Math.cos((dInit / (dnaCount - 1)) * 8 * Math.PI * 2) * 1.2,
        Math.sin((dInit / (dnaCount - 1)) * 8 * Math.PI * 2) * 1.2
      );
      dnaDummy.position.copy(initPoint);
      dnaDummy.updateMatrix();
      dnaBeads.setMatrixAt(dInit, dnaDummy.matrix);
    }
    dnaBeads.instanceMatrix.needsUpdate = true;

    var methylMat = new THREE.MeshStandardMaterial({
      color: C.accent,
      emissive: C.accent,
      emissiveIntensity: 0.18,
      roughness: 0.4,
      transparent: true,
      opacity: 0
    });
    var methylGeo = new THREE.OctahedronGeometry(0.11, 0);
    var methylMarkers = [];
    for (var m = 0; m < 26; m += 1) {
      var marker = new THREE.Mesh(methylGeo, methylMat);
      marker.userData.t = (m + 0.5) / 26;
      marker.userData.labTip = {
        title: "Methylgruppe",
        body: "Eine Methylgruppe an einer CpG-Insel kann die Transkription hemmen. Die Basensequenz bleibt unverändert; die Verpackung wird dichter.",
        meta: "Epigenetik · Genstilllegung"
      };
      marker.scale.setScalar(0.001);
      marker.visible = false;
      group.add(marker);
      methylMarkers.push(marker);
    }
    var acetylMat = new THREE.MeshStandardMaterial({
      color: color("--color-base-g"),
      emissive: color("--color-base-g"),
      emissiveIntensity: 0.16,
      roughness: 0.4,
      transparent: true,
      opacity: 0
    });
    var acetylGeo = new THREE.SphereGeometry(0.13, 12, 10);
    var acetylMarkers = [];
    for (var a = 0; a < histoneCount; a += 1) {
      var acetyl = new THREE.Mesh(acetylGeo, acetylMat);
      acetyl.userData.labTip = {
        title: "Acetylgruppe",
        body: "Acetylgruppen an Histonen lockern das Chromatin. Die DNA wird zugänglicher, die RNA-Polymerase kann leichter binden.",
        meta: "Epigenetik · Genexpression"
      };
      acetyl.visible = false;
      group.add(acetyl);
      acetylMarkers.push(acetyl);
    }

    var state = { methyl: 0, acetyl: 1 };
    var target = { methyl: 0, acetyl: 1 };
    var methylButton = figure ? figure.querySelector("[data-lab-methyl]") : null;
    var acetylButton = figure ? figure.querySelector("[data-lab-acetyl]") : null;
    var readout = figure ? figure.querySelector("[data-chromatin-readout]") : null;

    function updateButtons() {
      if (methylButton) { methylButton.setAttribute("aria-pressed", target.methyl > 0.5 ? "true" : "false"); }
      if (acetylButton) { acetylButton.setAttribute("aria-pressed", target.acetyl > 0.5 ? "true" : "false"); }
      var expression = Math.max(0, Math.min(5, (target.acetyl > 0.5 ? 4 : 0) - (target.methyl > 0.5 ? 2 : 0) + 1));
      if (readout) {
        readout.innerHTML = '<span class="lab-verdict">Genexpression</span> <span class="lab-stat">' + expression + " von 5</span> · Methylierung: " +
          (target.methyl > 0.5 ? "an" : "aus") + " · Acetylierung: " + (target.acetyl > 0.5 ? "an" : "aus") + ". " +
          (expression >= 4
            ? "Das Chromatin ist offen; die RNA-Polymerase kann binden."
            : expression >= 2
              ? "Das Chromatin ist teilweise zugänglich; die Expression ist mittel."
              : "Das Chromatin ist dicht; das Gen wird kaum abgelesen.");
      }
    }
    updateButtons();

    if (methylButton) {
      methylButton.addEventListener("click", function () {
        target.methyl = target.methyl > 0.5 ? 0 : 1;
        updateButtons();
      });
    }
    if (acetylButton) {
      acetylButton.addEventListener("click", function () {
        target.acetyl = target.acetyl > 0.5 ? 0 : 1;
        updateButtons();
      });
    }

    function pathPoint(t, currentSpacing, currentCoil) {
      var span = currentSpacing * (histoneCount - 1) + 1.5;
      var angle = t * 8 * Math.PI * 2;
      return new THREE.Vector3(
        -span / 2 + t * span,
        Math.cos(angle) * currentCoil,
        Math.sin(angle) * currentCoil
      );
    }

    api.onFrame(function (dt, activeDt, elapsedTime) {
      var speedFactor = api.isPlaying() ? api.getSpeed() : 1;
      state.methyl = damp(state.methyl, target.methyl, 4.2 * speedFactor, dt);
      state.acetyl = damp(state.acetyl, target.acetyl, 4.2 * speedFactor, dt);
      var currentSpacing = spacing - state.methyl * 0.35 + state.acetyl * 0.3;
      var currentCoil = 1.0 - state.methyl * 0.24 + state.acetyl * 0.2;
      histones.forEach(function (histone, index) {
        histone.position.x = damp(histone.position.x, (index - 3) * currentSpacing, 6 * speedFactor, dt);
        histone.scale.setScalar(damp(histone.scale.x, 1 - state.methyl * 0.1, 5 * speedFactor, dt));
      });
      for (var d = 0; d < dnaCount; d += 1) {
        var point = pathPoint(d / (dnaCount - 1), currentSpacing, currentCoil);
        dnaDummy.position.copy(point);
        dnaDummy.updateMatrix();
        dnaBeads.setMatrixAt(d, dnaDummy.matrix);
      }
      dnaBeads.instanceMatrix.needsUpdate = true;      methylMarkers.forEach(function (marker) {
        var point = pathPoint(marker.userData.t, currentSpacing, currentCoil);
        var outward = new THREE.Vector3(0, point.y, point.z).normalize().multiplyScalar(0.14);
        marker.position.copy(point).add(outward);
        var amount = state.methyl;
        marker.visible = amount > 0.03;
        marker.scale.setScalar(Math.max(0.001, amount));
      });
      methylMat.opacity = state.methyl;
      acetylMarkers.forEach(function (marker, index) {
        var histone = histones[index];
        marker.position.set(histone.position.x, 0.84, 0);
        var amount = state.acetyl;
        marker.visible = amount > 0.03;
        marker.scale.setScalar(Math.max(0.001, amount));
      });
      acetylMat.opacity = state.acetyl;
      group.rotation.y = -0.3 + Math.sin(elapsedTime * 0.25) * 0.04;
    });

    var hoverTargets = histones.concat(methylMarkers, acetylMarkers);
    var hover = createHover(api, hoverTargets, {
      enter: function (object) {
        object.traverse(function (child) {
          if (child.isMesh && child.material && child.material.emissive && child.material !== methylMat && child.material !== acetylMat) {
            child.material.emissive.copy(C.accent);
            child.material.emissiveIntensity = 0.22;
          }
        });
      },
      leave: function (object) {
        object.traverse(function (child) {
          if (child.isMesh && child.material && child.material.emissive && child.material !== methylMat && child.material !== acetylMat) {
            child.material.emissiveIntensity = 0;
          }
        });
      }
    });

    api.resetAll = function () {
      api.setPlaying(false);
      target.methyl = 0;
      target.acetyl = 1;
      state.methyl = 0;
      state.acetyl = 1;
      group.rotation.set(0, -0.3, 0);
      updateButtons();
      hover.clear();
    };
    api.hover = hover;
    return api;
  }

  /* ---------- evolution: selection simulation ---------- */
  function buildSelection(container) {
    var api = createStage(container, {
      fov: 38,
      position: [0, 9.2, 14.5],
      target: [0, 0.45, 0],
      minDistance: 7,
      maxDistance: 27,
      maxPolarAngle: Math.PI / 2.02,
      shadows: true
    });
    if (!api) { return null; }
    var C = api.colors;
    var figure = container.closest("figure");
    var population = [];
    var spheres = [];
    var count = 120;
    var generation = 0;
    var mode = "directional";
    var optimumInput = figure ? figure.querySelector("[data-selection-optimum]") : null;
    var pressureInput = figure ? figure.querySelector("[data-selection-pressure]") : null;
    var modeInput = figure ? figure.querySelector("[data-selection-mode]") : null;
    var readout = figure ? figure.querySelector("[data-selection-readout]") : null;
    var histogram = figure ? figure.querySelector("[data-selection-histogram]") : null;

    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(12.5, 10.5),
      new THREE.MeshStandardMaterial({ color: C.paper2, roughness: 0.9, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    api.scene.add(ground);
    var border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(12.5, 10.5)),
      new THREE.LineBasicMaterial({ color: C.rule, transparent: true, opacity: 0.95 })
    );
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.005;
    api.scene.add(border);
    var grid = new THREE.GridHelper(12.5, 12, C.rule.getHex(), C.rule.getHex());
    grid.position.y = 0.008;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    api.scene.add(grid);

    function gaussian() {
      var u = 0;
      var v = 0;
      while (u === 0) { u = Math.random(); }
      while (v === 0) { v = Math.random(); }
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    function settings() {
      return {
        optimum: optimumInput ? Number(optimumInput.value) / 100 : 0.7,
        pressure: pressureInput ? Number(pressureInput.value) / 100 : 0.6,
        mode: modeInput ? modeInput.value : mode
      };
    }
    function fitness(trait, current) {
      var pressure = current.pressure;
      if (current.mode === "stabilizing") {
        var sigmaS = Math.max(0.055, 0.2 - pressure * 0.12);
        return Math.exp(-Math.pow(trait - 0.5, 2) / (2 * sigmaS * sigmaS));
      }
      if (current.mode === "disruptive") {
        var sigmaD = Math.max(0.045, 0.13 - pressure * 0.07);
        var left = Math.exp(-Math.pow(trait - 0.28, 2) / (2 * sigmaD * sigmaD));
        var right = Math.exp(-Math.pow(trait - 0.72, 2) / (2 * sigmaD * sigmaD));
        return Math.max(left, right);
      }
      var sigma = Math.max(0.045, 0.26 - pressure * 0.19);
      return Math.exp(-Math.pow(trait - current.optimum, 2) / (2 * sigma * sigma));
    }
    function makeSphere(trait, index) {
      var material = new THREE.MeshStandardMaterial({
        color: C.muted.clone().lerp(C.accent, trait),
        roughness: 0.46,
        metalness: 0.06
      });
      var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), material);
      sphere.userData.trait = trait;
      sphere.userData.display = trait;
      sphere.userData.z = (Math.random() - 0.5) * 8.4;
      sphere.userData.targetZ = sphere.userData.z;
      sphere.userData.phase = Math.random() * Math.PI * 2;
      sphere.userData.hovered = false;
      sphere.userData.index = index;
      sphere.userData.labTip = {
        title: "Individuum " + (index + 1),
        body: "",
        meta: ""
      };
      sphere.position.set((trait - 0.5) * 11.4, 0.16, sphere.userData.z);
      sphere.castShadow = true;
      api.scene.add(sphere);
      spheres.push(sphere);
      return sphere;
    }
    for (var i = 0; i < count; i += 1) {
      var trait = clamp(0.5 + gaussian() * 0.08, 0, 1);
      population.push(trait);
      makeSphere(trait, i);
    }

    var lineMaterial = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.8 });
    var lineA = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 9.4), lineMaterial);
    lineA.position.y = 0.025;
    api.scene.add(lineA);
    var lineB = lineA.clone();
    api.scene.add(lineB);
    var optimumLabel = makeLabel("Optimum", { width: 1.9 });
    optimumLabel.position.y = 0.7;
    api.scene.add(optimumLabel);
    var leftAxis = makeLabel("0", { width: 0.6 });
    leftAxis.position.set(-5.75, 0.32, 4.9);
    api.scene.add(leftAxis);
    var rightAxis = makeLabel("1", { width: 0.6 });
    rightAxis.position.set(5.75, 0.32, 4.9);
    api.scene.add(rightAxis);
    var axisTitle = makeLabel("Merkmalswert", { width: 2.6 });
    axisTitle.position.set(0, 0.32, 5.35);
    api.scene.add(axisTitle);

    function updateHistogram(current) {
      if (!histogram) { return; }
      if (!histogram.children.length) {
        histogram.innerHTML = new Array(10).fill(0).map(function () { return "<i></i>"; }).join("");
        var line = document.createElement("span");
        line.className = "histogram__optimum";
        line.setAttribute("data-selection-optimum-line", "");
        histogram.appendChild(line);
        var line2 = document.createElement("span");
        line2.className = "histogram__optimum";
        line2.setAttribute("data-selection-optimum-line-2", "");
        line2.hidden = true;
        histogram.appendChild(line2);
      }
      var bars = $$("i", histogram);
      var bins = new Array(10).fill(0);
      population.forEach(function (trait) { bins[Math.min(9, Math.floor(trait * 10))] += 1; });
      var max = Math.max.apply(null, bins) || 1;
      bars.forEach(function (bar, index) {
        bar.style.height = Math.max(4, (bins[index] / max) * 100) + "%";
        bar.title = (index / 10).toFixed(1) + " bis " + ((index + 1) / 10).toFixed(1) + ": " + bins[index] + " Individuen";
      });
      var line = histogram.querySelector("[data-selection-optimum-line]");
      var line2 = histogram.querySelector("[data-selection-optimum-line-2]");
      if (current.mode === "directional") {
        line.hidden = false;
        line.style.left = (current.optimum * 100) + "%";
        line2.hidden = true;
      } else if (current.mode === "stabilizing") {
        line.hidden = false;
        line.style.left = "50%";
        line2.hidden = true;
      } else {
        line.hidden = false;
        line.style.left = "28%";
        line2.hidden = false;
        line2.style.left = "72%";
      }
    }

    function updateOptimumLines(current) {
      if (current.mode === "directional") {
        lineA.visible = true;
        lineB.visible = false;
        lineA.position.x = (current.optimum - 0.5) * 11.4;
        optimumLabel.visible = true;
        optimumLabel.position.x = lineA.position.x;
        optimumLabel.position.z = -4.45;
      } else if (current.mode === "stabilizing") {
        lineA.visible = true;
        lineB.visible = false;
        lineA.position.x = 0;
        optimumLabel.visible = true;
        optimumLabel.position.x = 0;
        optimumLabel.position.z = -4.45;
      } else {
        lineA.visible = true;
        lineB.visible = true;
        lineA.position.x = (0.28 - 0.5) * 11.4;
        lineB.position.x = (0.72 - 0.5) * 11.4;
        optimumLabel.visible = false;
      }
    }

    function updateReadout(current) {
      if (!readout) { return; }
      var mean = population.reduce(function (a, b) { return a + b; }, 0) / population.length;
      var variance = population.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / population.length;
      var sd = Math.sqrt(variance);
      var modeText = current.mode === "directional"
        ? "Gerichtete Selektion bevorzugt ein Extrem. Das Optimum lässt sich verschieben."
        : current.mode === "stabilizing"
          ? "Stabilisierende Selektion bevorzugt die Mitte; beide Extreme sind benachteiligt."
          : "Disruptive Selektion bevorzugt beide Extreme und benachteiligt die Mitte.";
      readout.innerHTML =
        '<span class="lab-verdict">Generation ' + generation + "</span> " +
        '<span class="lab-stat">Mittelwert ' + de(mean, 2) + "</span> · " +
        '<span class="lab-stat">Streuung ' + de(sd, 2) + "</span> · " +
        '<span class="lab-stat">Optimum ' + (current.mode === "directional" ? de(current.optimum, 2) : current.mode === "stabilizing" ? "0,50" : "0,28 / 0,72") + "</span><br> " +
        modeText + " " + (generation === 0 ? "Starte mit „Generation“ oder „Lauf starten“." : "Vergleiche die Verteilung mit dem Ausgangszustand.");
    }

    function updateTargets(current, reshuffle) {
      spheres.forEach(function (sphere, index) {
        var trait = population[index];
        sphere.userData.target = trait;
        if (reshuffle) { sphere.userData.targetZ = (Math.random() - 0.5) * 8.4; }
        sphere.userData.labTip.body = "Merkmalswert " + de(trait, 2) + ". Die Farbe zeigt denselben Wert: je stärker magenta, desto größer das Merkmal.";
        sphere.userData.labTip.meta = "Relative Fitness " + de(fitness(trait, current), 2) + " · Generation " + generation;
      });
    }

    function step() {
      var current = settings();
      var weights = population.map(function (trait) { return fitness(trait, current); });
      var total = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
      var next = [];
      for (var n = 0; n < population.length; n += 1) {
        var pick = Math.random() * total;
        var cursor = 0;
        var parent = population[0];
        for (var j = 0; j < population.length; j += 1) {
          cursor += weights[j];
          if (pick <= cursor) { parent = population[j]; break; }
        }
        next.push(clamp(parent + gaussian() * Math.max(0.018, 0.05 - current.pressure * 0.025), 0, 1));
      }
      population = next;
      generation += 1;
      updateTargets(current, true);
      updateHistogram(current);
      updateReadout(current);
      updateOptimumLines(current);
    }

    function resetPopulation() {
      generation = 0;
      population = population.map(function () { return clamp(0.5 + gaussian() * 0.08, 0, 1); });
      spheres.forEach(function (sphere, index) {
        sphere.userData.display = population[index];
        sphere.userData.z = (Math.random() - 0.5) * 8.4;
        sphere.userData.targetZ = sphere.userData.z;
        sphere.position.set((population[index] - 0.5) * 11.4, 0.16, sphere.userData.z);
        sphere.userData.hovered = false;
      });
      var current = settings();
      updateTargets(current, false);
      updateHistogram(current);
      updateReadout(current);
      updateOptimumLines(current);
    }

    if (modeInput) {
      mode = modeInput.value;
      modeInput.addEventListener("change", function () {
        mode = modeInput.value;
        if (optimumInput) { optimumInput.disabled = mode !== "directional"; }
        var current = settings();
        updateOptimumLines(current);
        updateHistogram(current);
        updateReadout(current);
      });
    }
    if (optimumInput) {
      optimumInput.addEventListener("input", function () {
        var current = settings();
        updateOptimumLines(current);
        updateHistogram(current);
        updateReadout(current);
        updateTargets(current, false);
      });
    }
    if (pressureInput) {
      pressureInput.addEventListener("input", function () {
        var current = settings();
        updateTargets(current, false);
        updateReadout(current);
      });
    }

    var accumulator = 0;
    api.onFrame(function (dt, activeDt, elapsedTime) {
      var current = settings();
      var running = api.isPlaying();
      if (running) {
        accumulator += activeDt;
        if (accumulator >= 0.9) {
          accumulator = 0;
          step();
        }
      } else {
        accumulator = 0;
      }
      spheres.forEach(function (sphere, index) {
        var targetTrait = sphere.userData.target != null ? sphere.userData.target : population[index];
        sphere.userData.display = damp(sphere.userData.display, targetTrait, 4.2, dt);
        sphere.userData.z = damp(sphere.userData.z, sphere.userData.targetZ, 2.8, dt);
        var x = (sphere.userData.display - 0.5) * 11.4;
        var y = 0.16 + Math.sin(elapsedTime * 1.2 + sphere.userData.phase) * 0.018;
        sphere.position.set(x, y, sphere.userData.z);
        var hoverScale = sphere.userData.hovered ? 1.18 : 1;
        sphere.scale.setScalar((0.78 + sphere.userData.display * 0.55) * hoverScale);
        sphere.material.color.copy(C.muted).lerp(C.accent, sphere.userData.display);
        sphere.material.emissive.copy(C.accent);
        sphere.material.emissiveIntensity = sphere.userData.hovered ? 0.3 : 0;
      });
    });

    updateHistogram(settings());
    updateReadout(settings());
    updateOptimumLines(settings());
    updateTargets(settings(), true);

    var hover = createHover(api, spheres, {
      enter: function (sphere) {
        sphere.userData.hovered = true;
      },
      leave: function (sphere) {
        sphere.userData.hovered = false;
      }
    });

    api.step = step;
    api.resetAll = resetPopulation;
    api.hover = hover;
    return api;
  }

  /* ---------- behaviour: 3D fitness landscape ---------- */
  function buildFitness(container) {
    var api = createStage(container, {
      fov: 38,
      position: [9.8, 6.8, 13.2],
      target: [0, 0.7, 0],
      minDistance: 8,
      maxDistance: 30,
      minPolarAngle: 0.35,
      maxPolarAngle: Math.PI / 2.15,
      shadows: true
    });
    if (!api) { return null; }
    var C = api.colors;
    var figure = container.closest("figure");
    var readout = figure ? figure.querySelector("[data-fitness-readout]") : null;

    function height(x, z) {
      return 2.2 * Math.exp(-((x + 4) * (x + 4) + (z + 1) * (z + 1)) / 3.0) +
        1.8 * Math.exp(-((x) * (x) + (z) * (z)) / 2.6) +
        1.4 * Math.exp(-((x - 4) * (x - 4) + (z - 1.5) * (z - 1.5)) / 2.2) + 0.08;
    }

    var base = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 13),
      new THREE.MeshStandardMaterial({ color: C.paper2, roughness: 0.95, metalness: 0 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.06;
    base.receiveShadow = true;
    api.scene.add(base);

    var geometry = new THREE.PlaneGeometry(12, 12, 64, 64);
    geometry.rotateX(-Math.PI / 2);
    var positions = geometry.attributes.position;
    var colors = [];
    var maxHeight = 2.5;
    var lowColor = C.rule.clone();
    for (var i = 0; i < positions.count; i += 1) {
      var x = positions.getX(i);
      var z = positions.getZ(i);
      var y = height(x, z);
      positions.setY(i, y);
      var t = clamp((y - 0.1) / maxHeight, 0, 1);
      var vertexColor = lowColor.clone().lerp(C.accent, Math.pow(t, 0.7));
      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }
    positions.needsUpdate = true;
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    var surface = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.64,
      metalness: 0.04,
      side: THREE.DoubleSide
    }));
    surface.receiveShadow = true;
    surface.castShadow = true;
    api.scene.add(surface);

    var gridGeometry = new THREE.PlaneGeometry(12, 12, 18, 18);
    gridGeometry.rotateX(-Math.PI / 2);
    var gridPositions = gridGeometry.attributes.position;
    for (var g = 0; g < gridPositions.count; g += 1) {
      gridPositions.setY(g, height(gridPositions.getX(g), gridPositions.getZ(g)) + 0.018);
    }
    gridPositions.needsUpdate = true;
    gridGeometry.computeVertexNormals();
    var surfaceGrid = new THREE.Mesh(gridGeometry, new THREE.MeshBasicMaterial({
      color: C.ink,
      wireframe: true,
      transparent: true,
      opacity: 0.075,
      depthWrite: false
    }));
    api.scene.add(surfaceGrid);

    var baseBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(12, 12)),
      new THREE.LineBasicMaterial({ color: C.rule, transparent: true, opacity: 0.8 })
    );
    baseBorder.rotation.x = -Math.PI / 2;
    baseBorder.position.y = 0.015;
    api.scene.add(baseBorder);

    function contour(level, divisions) {
      divisions = divisions || 48;
      var points = [];
      var cell = 12 / divisions;
      function sample(ix, iz) {
        var x = -6 + ix * cell;
        var z = -6 + iz * cell;
        return { x: x, z: z, h: height(x, z) };
      }
      function edgePoint(a, b) {
        var t = (level - a.h) / (b.h - a.h || 1);
        return [a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t];
      }
      for (var ix = 0; ix < divisions; ix += 1) {
        for (var iz = 0; iz < divisions; iz += 1) {
          var a = sample(ix, iz);
          var b = sample(ix + 1, iz);
          var c = sample(ix + 1, iz + 1);
          var d = sample(ix, iz + 1);
          var edges = [];
          if ((a.h >= level) !== (b.h >= level)) { edges.push(edgePoint(a, b)); }
          if ((b.h >= level) !== (c.h >= level)) { edges.push(edgePoint(b, c)); }
          if ((c.h >= level) !== (d.h >= level)) { edges.push(edgePoint(c, d)); }
          if ((d.h >= level) !== (a.h >= level)) { edges.push(edgePoint(d, a)); }
          if (edges.length === 2) {
            points.push(edges[0][0], height(edges[0][0], edges[0][1]) + 0.015, edges[0][1]);
            points.push(edges[1][0], height(edges[1][0], edges[1][1]) + 0.015, edges[1][1]);
          } else if (edges.length === 4) {
            points.push(edges[0][0], height(edges[0][0], edges[0][1]) + 0.015, edges[0][1]);
            points.push(edges[1][0], height(edges[1][0], edges[1][1]) + 0.015, edges[1][1]);
            points.push(edges[2][0], height(edges[2][0], edges[2][1]) + 0.015, edges[2][1]);
            points.push(edges[3][0], height(edges[3][0], edges[3][1]) + 0.015, edges[3][1]);
          }
        }
      }
      if (!points.length) { return null; }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
      return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: level > 2 ? C.accent.getHex() : C.muted.getHex(),
        transparent: true,
        opacity: level > 2 ? 0.75 : 0.34
      }));
    }
    [0.55, 1.05, 1.55, 2.05].forEach(function (level) {
      var lines = contour(level, 44);
      if (lines) { api.scene.add(lines); }
    });

    function addPeakLabel(text, x, z) {
      var label = makeLabel(text, { width: 1.9 });
      label.position.set(x, height(x, z) + 0.52, z);
      api.scene.add(label);
    }
    addPeakLabel("Gipfel", -4, -1);
    addPeakLabel("Gipfel", 0, 0);
    addPeakLabel("Gipfel", 4, 1.5);

    var marker = new THREE.Group();
    var markerBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 16),
      new THREE.MeshStandardMaterial({
        color: C.accent,
        emissive: C.accent,
        emissiveIntensity: 0.5,
        roughness: 0.35,
        metalness: 0.1
      })
    );
    markerBall.castShadow = true;
    marker.add(markerBall);
    var markerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.7 })
    );
    markerRing.rotation.x = Math.PI / 2;
    markerRing.position.y = -0.16;
    marker.add(markerRing);
    marker.userData.labTip = {
      title: "Population",
      body: "Der Punkt steht für eine Kombination von zwei Merkmalen. Die Höhe ist die Fitness dieser Kombination.",
      meta: "Klicke in die Fläche, um den Punkt zu versetzen."
    };
    api.scene.add(marker);

    var hoverRing = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.32, 40),
      new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    hoverRing.rotation.x = -Math.PI / 2;
    hoverRing.visible = false;
    api.scene.add(hoverRing);

    var trailPoints = [];
    var trailGeometry = new THREE.BufferGeometry();
    var trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({
      color: C.ink,
      transparent: true,
      opacity: 0.55
    }));
    api.scene.add(trail);

    var current = { x: -1.5, z: 1.6 };
    var finished = false;
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();

    function placeMarker(x, z, resetTrail) {
      current.x = clamp(x, -5.8, 5.8);
      current.z = clamp(z, -5.8, 5.8);
      var y = height(current.x, current.z);
      marker.position.set(current.x, y + 0.2, current.z);
      if (resetTrail) {
        trailPoints = [[current.x, y + 0.06, current.z]];
        updateTrail();
      }
      if (readout) {
        readout.innerHTML = '<span class="lab-verdict">Position</span> ' +
          '<span class="lab-stat">Merkmal 1 ' + de(current.x, 2) + "</span> · " +
          '<span class="lab-stat">Merkmal 2 ' + de(current.z, 2) + "</span> · " +
          '<span class="lab-stat">Fitness ' + de(y, 2) + "</span> " +
          (finished ? "Die Population sitzt an einem lokalen Gipfel." : "Die Höhe ist die relative Fitness dieser Kombination.");
      }
    }
    function updateTrail() {
      var positions = [];
      trailPoints.forEach(function (point) { positions.push(point[0], point[1], point[2]); });
      trailGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      trailGeometry.computeBoundingSphere();
    }
    placeMarker(-1.5, 1.6, true);

    function surfacePoint(event) {
      var rect = api.canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      raycaster.setFromCamera(pointer, api.camera);
      var hits = raycaster.intersectObject(surface, false);
      return hits.length ? hits[0] : null;
    }

    var pointerDown = null;
    api.canvas.addEventListener("pointermove", function (event) {
      var hit = surfacePoint(event);
      if (!hit) {
        hoverRing.visible = false;
        api.container.classList.remove("is-hovering");
        api.hideTip();
        return;
      }
      hoverRing.visible = true;
      hoverRing.position.set(hit.point.x, height(hit.point.x, hit.point.z) + 0.025, hit.point.z);
      api.container.classList.add("is-hovering");
      api.showTip({
        title: "Fitnesslandschaft",
        body: "Merkmal 1 " + de(hit.point.x, 2) + ", Merkmal 2 " + de(hit.point.z, 2) + ". Die Höhe zeigt die relative Fitness.",
        meta: "Fitness " + de(height(hit.point.x, hit.point.z), 2) + " · Klick setzt den Startpunkt"
      }, event);
    });
    api.canvas.addEventListener("pointerleave", function () {
      hoverRing.visible = false;
      api.container.classList.remove("is-hovering");
      api.hideTip();
    });
    api.canvas.addEventListener("pointerdown", function (event) {
      pointerDown = { x: event.clientX, y: event.clientY, time: performance.now() };
    });
    api.canvas.addEventListener("pointerup", function (event) {
      if (!pointerDown) { return; }
      var moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      var quick = performance.now() - pointerDown.time < 650;
      pointerDown = null;
      if (moved > 6 || !quick) { return; }
      var hit = surfacePoint(event);
      if (!hit) { return; }
      api.setPlaying(false);
      finished = false;
      placeMarker(hit.point.x, hit.point.z, true);
    });

    function gradient(x, z) {
      var e = 0.04;
      return {
        x: (height(x + e, z) - height(x - e, z)) / (2 * e),
        z: (height(x, z + e) - height(x, z - e)) / (2 * e)
      };
    }

    var climbSpeed = 1.8;
    api.onFrame(function (dt, activeDt, elapsedTime) {
      markerRing.rotation.z += dt * 0.1;
      markerBall.position.y = Math.sin(elapsedTime * 1.4) * 0.02;
      if (!api.isPlaying() || activeDt <= 0) { return; }
      var grad = gradient(current.x, current.z);
      var length = Math.hypot(grad.x, grad.z);
      if (length < 0.025) {
        api.setPlaying(false);
        finished = true;
        placeMarker(current.x, current.z, false);
        if (readout) {
          readout.innerHTML += ' <span class="lab-stat">Lokales Optimum erreicht.</span>';
        }
        return;
      }
      var step = climbSpeed * activeDt;
      current.x = clamp(current.x + (grad.x / length) * step, -5.8, 5.8);
      current.z = clamp(current.z + (grad.z / length) * step, -5.8, 5.8);
      var y = height(current.x, current.z);
      marker.position.set(current.x, y + 0.2, current.z);
      if (trailPoints.length === 0 || Math.hypot(current.x - trailPoints[trailPoints.length - 1][0], current.z - trailPoints[trailPoints.length - 1][2]) > 0.06) {
        trailPoints.push([current.x, y + 0.06, current.z]);
        if (trailPoints.length > 260) { trailPoints.shift(); }
        updateTrail();
      }
      if (readout) {
        readout.innerHTML = '<span class="lab-verdict">Gipfelsuche</span> ' +
          '<span class="lab-stat">Merkmal 1 ' + de(current.x, 2) + "</span> · " +
          '<span class="lab-stat">Merkmal 2 ' + de(current.z, 2) + "</span> · " +
          '<span class="lab-stat">Fitness ' + de(y, 2) + "</span> Die Population folgt dem steilsten Anstieg.";
      }
    });

    var resetButton = figure ? figure.querySelector("[data-fitness-reset]") : null;
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        api.setPlaying(false);
        finished = false;
        placeMarker(-1.5, 1.6, true);
      });
    }
    api.step = function () {
      api.setPlaying(!api.isPlaying());
    };
    api.resetAll = function () {
      api.setPlaying(false);
      finished = false;
      placeMarker(-1.5, 1.6, true);
    };
    return api;
  }

  /* ---------- generic HTML tooltips ---------- */
  function initGenericTips() {
    if (document.getElementById("lab-tip-float")) { return; }
    var tip = document.createElement("div");
    tip.className = "lab-tip lab-tip--float";
    tip.id = "lab-tip-float";
    tip.setAttribute("role", "tooltip");
    tip.innerHTML = '<p class="lab-tip__title"></p><p class="lab-tip__body"></p><p class="lab-tip__meta"></p>';
    document.body.appendChild(tip);
    var active = null;

    function show(target) {
      var title = target.dataset.tipTitle || "";
      var body = target.dataset.tip || "";
      if (!body) { return; }
      active = target;
      $(".lab-tip__title", tip).textContent = title || "Hinweis";
      $(".lab-tip__body", tip).textContent = body;
      var meta = $(".lab-tip__meta", tip);
      if (target.dataset.tipMeta) { meta.textContent = target.dataset.tipMeta; meta.hidden = false; }
      else { meta.textContent = ""; meta.hidden = true; }
      var rect = target.getBoundingClientRect();
      tip.style.visibility = "hidden";
      tip.classList.add("is-visible");
      var tipRect = tip.getBoundingClientRect();
      var left = clamp(rect.left + rect.width / 2 - tipRect.width / 2, 12, window.innerWidth - tipRect.width - 12);
      var top = rect.bottom + 10;
      if (top + tipRect.height > window.innerHeight - 12) {
        top = rect.top - tipRect.height - 10;
      }
      tip.style.left = left + "px";
      tip.style.top = Math.max(12, top) + "px";
      tip.style.visibility = "";
      target.setAttribute("aria-describedby", "lab-tip-float");
    }
    function hide() {
      if (active) { active.removeAttribute("aria-describedby"); }
      active = null;
      tip.classList.remove("is-visible");
    }
    $$("[data-tip]").forEach(function (target) {
      target.addEventListener("pointerenter", function () { show(target); });
      target.addEventListener("pointerleave", function () { hide(); });
      target.addEventListener("focus", function () { show(target); });
      target.addEventListener("blur", function () { hide(); });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { hide(); }
    });
  }

  var builders = {
    methods: buildMethods,
    dna: buildDNA,
    chromatin: buildChromatin,
    selection: buildSelection,
    fitness: buildFitness
  };

  function initAll() {
    $$("[data-lab-scene]").forEach(function (container) {
      if (container.dataset.labReady === "true") { return; }
      var type = container.dataset.labScene;
      var builder = builders[type];
      if (!builder) { return; }
      var api = null;
      try {
        api = builder(container);
      } catch (error) {
        console.error("Bio12 lab scene failed:", type, error);
      }
      if (!api) {
        container.classList.add("lab-fallback");
        return;
      }
      container.dataset.labReady = "true";
      if (container.id) { scenes[container.id] = api; }
      scenes[type] = api;
    });
    initGenericTips();
  }

  window.Bio12Lab = { initAll: initAll, scenes: scenes, builders: builders };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
