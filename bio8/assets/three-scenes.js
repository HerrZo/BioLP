/* Three.js instruments for Biologie 8.
   Every scene is user-controlled, has a still fallback in the markup, and stops when its station is hidden.
   v3: delta-time animation, damped camera, bounded orbit, soft shadows, raycast tooltips,
   a pause/speed/reset shelf and smooth scene-state transitions. */
(function () {
  "use strict";

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function damp(current, target, lambda, dt) {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
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
  function makeRenderer(container) {
    if (!window.THREE) { return null; }
    try {
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    var opts = options || {};
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: opts.roughness != null ? opts.roughness : 0.62,
      metalness: opts.metalness != null ? opts.metalness : 0.04,
      transparent: Boolean(opts.transparent),
      opacity: opts.opacity != null ? opts.opacity : 1,
      side: opts.side || THREE.FrontSide,
      depthWrite: opts.depthWrite != null ? opts.depthWrite : true,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity != null ? opts.emissiveIntensity : 1,
      vertexColors: Boolean(opts.vertexColors)
    });
  }
  function basic(color, options) {
    var opts = options || {};
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: opts.transparent != null ? opts.transparent : false,
      opacity: opts.opacity != null ? opts.opacity : 1,
      wireframe: Boolean(opts.wireframe),
      side: opts.side || THREE.FrontSide,
      depthWrite: opts.depthWrite != null ? opts.depthWrite : true
    });
  }
  function makeLights(scene, palette, options) {
    var opts = options || {};
    var hemi = new THREE.HemisphereLight(0xffffff, 0x2d3e32, 0.5);
    hemi.position.set(0, 18, 0);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0xffffff, opts.ambient != null ? opts.ambient : 0.28));
    var key = new THREE.DirectionalLight(0xfff6e7, opts.key != null ? opts.key : 1.08);
    key.position.set(7, 13, 8);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -14;
    key.shadow.bias = -0.0005;
    key.shadow.radius = 3;
    scene.add(key);
    var fill = new THREE.DirectionalLight(palette.muted, opts.fill != null ? opts.fill : 0.34);
    fill.position.set(-9, 5, 5);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(palette.accent, opts.rim != null ? opts.rim : 0.4);
    rim.position.set(-3, 6, -9);
    scene.add(rim);
    return { key: key, fill: fill, rim: rim };
  }
  function addShadowFloor(scene, y, opacity) {
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.ShadowMaterial({ opacity: opacity != null ? opacity : 0.2 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = y;
    floor.receiveShadow = true;
    scene.add(floor);
    return floor;
  }

  function setup(container, cameraPosition, target, options) {
    var opts = options || {};
    var renderer = makeRenderer(container);
    if (!renderer) { return null; }
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    var initialPosition = new THREE.Vector3(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    var initialTarget = new THREE.Vector3(target[0], target[1], target[2]);
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.rotateSpeed = 0.62;
    controls.zoomSpeed = 0.8;
    controls.minDistance = opts.minDistance != null ? opts.minDistance : 6;
    controls.maxDistance = opts.maxDistance != null ? opts.maxDistance : 30;
    controls.minPolarAngle = opts.minPolarAngle != null ? opts.minPolarAngle : 0.22;
    controls.maxPolarAngle = opts.maxPolarAngle != null ? opts.maxPolarAngle : Math.PI / 2 - 0.05;
    controls.target.copy(initialTarget);

    var palette = {
      paper: new THREE.Color(tokenColor("--color-paper-2")),
      paper3: new THREE.Color(tokenColor("--color-paper-3")),
      ink: new THREE.Color(tokenColor("--color-ink")),
      muted: new THREE.Color(tokenColor("--color-muted")),
      accent: new THREE.Color(tokenColor("--color-accent")),
      accent2: new THREE.Color(tokenColor("--color-accent-2")),
      water: new THREE.Color(tokenColor("--color-water"))
    };
    makeLights(scene, palette, opts);
    if (opts.shadowY != null) { addShadowFloor(scene, opts.shadowY, opts.shadowOpacity); }

    var figure = container.closest("figure");
    var fallback = container.querySelector(".tool__fallback");
    var visible = true;
    var state = { paused: false, speed: 1, time: 0, hovered: null };
    var updaters = [];
    var clock = new THREE.Clock();
    var pointer = new THREE.Vector2();
    var raycaster = new THREE.Raycaster();
    var tooltip = document.createElement("div");
    tooltip.className = "scene-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.innerHTML = '<p class="scene-tooltip__title"></p><p class="scene-tooltip__text"></p><span class="scene-tooltip__meta"></span>';
    container.appendChild(tooltip);
    var tipTitle = tooltip.querySelector(".scene-tooltip__title");
    var tipText = tooltip.querySelector(".scene-tooltip__text");
    var tipMeta = tooltip.querySelector(".scene-tooltip__meta");

    var hint = document.createElement("p");
    hint.className = "scene-hint";
    hint.textContent = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
      ? "Ziehen: drehen · Zwei Finger: zoomen"
      : "Ziehen: drehen · Mausrad: zoomen";
    container.appendChild(hint);

    var dock = document.createElement("div");
    dock.className = "scene-ui";
    dock.innerHTML =
      '<div class="scene-ui__group">' +
        '<button class="btn btn--quiet btn--small" type="button" data-scene-pause aria-pressed="false" data-tip="Hält die Animation an, ohne die Kamera zu sperren. Mit „Weiter“ läuft sie an derselben Stelle weiter.">Pause</button>' +
        '<span class="scene-ui__speed" role="group" aria-label="Animationsgeschwindigkeit">' +
          '<button class="btn btn--quiet btn--small" type="button" data-scene-speed="0.5" aria-pressed="false" aria-label="Halbe Geschwindigkeit" data-tip="0,5-fache Geschwindigkeit: gut zum genauen Beobachten.">0,5×</button>' +
          '<button class="btn btn--quiet btn--small" type="button" data-scene-speed="1" aria-pressed="true" aria-label="Normale Geschwindigkeit" data-tip="Normale Geschwindigkeit: entspricht dem didaktischen Modell.">1×</button>' +
          '<button class="btn btn--quiet btn--small" type="button" data-scene-speed="2" aria-pressed="false" aria-label="Doppelte Geschwindigkeit" data-tip="Doppelte Geschwindigkeit: zeigt schnelle Abläufe im Überblick.">2×</button>' +
        '</span>' +
        '<button class="btn btn--quiet btn--small scene-ui__reset" type="button" data-scene-reset data-tip="Setzt Kamera und Modellparameter weich auf den Ausgangszustand zurück.">Ansicht zurücksetzen</button>' +
      '</div>';
    container.appendChild(dock);

    var pauseButton = dock.querySelector("[data-scene-pause]");
    var speedButtons = $$("[data-scene-speed]", dock);
    var resetButton = dock.querySelector("[data-scene-reset]");
    function setPaused(value) {
      state.paused = value;
      pauseButton.textContent = value ? "Weiter" : "Pause";
      pauseButton.setAttribute("aria-pressed", value ? "true" : "false");
      pauseButton.setAttribute("data-tip", value ? "Startet die Animation wieder." : "Hält die Animation an, ohne die Kamera zu sperren.");
    }
    if (pauseButton) {
      pauseButton.addEventListener("click", function () { setPaused(!state.paused); });
    }
    speedButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        state.speed = Number(button.dataset.sceneSpeed) || 1;
        speedButtons.forEach(function (inner) { inner.setAttribute("aria-pressed", inner === button ? "true" : "false"); });
      });
    });

    function hideTip() {
      if (state.hovered) { restoreHighlight(state.hovered); }
      state.hovered = null;
      tooltip.classList.remove("is-visible");
      tooltip.setAttribute("aria-hidden", "true");
      renderer.domElement.style.cursor = "";
    }
    function materialStore(root) {
      var list = [];
      root.traverse(function (object) {
        if (!object.isMesh || !object.material) { return; }
        var material = object.material;
        if (!material.userData.sceneBase) {
          material.userData.sceneBase = {
            color: material.color ? material.color.clone() : null,
            emissive: material.emissive ? material.emissive.clone() : null,
            emissiveIntensity: material.emissiveIntensity
          };
        }
        list.push(material);
      });
      return list;
    }
    function highlight(root) {
      var materials = materialStore(root);
      var accent = palette.accent;
      materials.forEach(function (material) {
        if (material.emissive) {
          material.emissive.copy(accent);
          material.emissiveIntensity = 0.52;
        } else if (material.color) {
          material.color.lerp(accent, 0.42);
        }
      });
    }
    function restoreHighlight(root) {
      root.traverse(function (object) {
        if (!object.isMesh || !object.material) { return; }
        var material = object.material;
        var base = material.userData.sceneBase;
        if (!base) { return; }
        if (base.color && material.color) { material.color.copy(base.color); }
        if (base.emissive && material.emissive) { material.emissive.copy(base.emissive); }
        material.emissiveIntensity = base.emissiveIntensity;
      });
    }
    function showTip(root, tip, event) {
      tipTitle.textContent = tip.name;
      tipText.textContent = tip.text;
      tipMeta.textContent = tip.meta || "";
      tooltip.classList.add("is-visible");
      tooltip.setAttribute("aria-hidden", "false");
      var rect = container.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var width = tooltip.offsetWidth;
      var height = tooltip.offsetHeight;
      var left = x > rect.width * 0.58 ? x - width - 16 : x + 16;
      var top = y - height - 14;
      if (top < 8) { top = y + 18; }
      tooltip.style.left = clamp(left, 8, Math.max(8, rect.width - width - 8)) + "px";
      tooltip.style.top = clamp(top, 8, Math.max(8, rect.height - height - 8)) + "px";
    }
    function registerTip(root, name, text, meta) {
      var tip = { name: name, text: text, meta: meta || "" };
      root.userData.sceneTip = tip;
      root.traverse(function (object) {
        if (object.isMesh) {
          object.userData.sceneTip = tip;
          object.userData.hoverRoot = root;
        }
      });
      return root;
    }
    function pointerFor(event) {
      var rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    }
    function isVisibleInScene(object) {
      var node = object;
      while (node) {
        if (node.visible === false) { return false; }
        node = node.parent;
      }
      return true;
    }
    function pick(event) {
      pointerFor(event);
      camera.updateMatrixWorld();
      scene.updateMatrixWorld();
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(scene.children, true);
      for (var i = 0; i < hits.length; i += 1) {
        var hit = hits[i];
        if (isVisibleInScene(hit.object) && hit.object.userData.sceneTip) {
          return { root: hit.object.userData.hoverRoot || hit.object, tip: hit.object.userData.sceneTip };
        }
      }
      return null;
    }
    renderer.domElement.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") { return; }
      var result = pick(event);
      if (!result) {
        if (state.hovered) { hideTip(); }
        return;
      }
      if (state.hovered !== result.root) {
        if (state.hovered) { restoreHighlight(state.hovered); }
        state.hovered = result.root;
        highlight(result.root);
      }
      renderer.domElement.style.cursor = "pointer";
      showTip(result.root, result.tip, event);
    });
    renderer.domElement.addEventListener("pointerleave", hideTip);
    renderer.domElement.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "touch") {
        var result = pick(event);
        if (result) {
          if (state.hovered) { restoreHighlight(state.hovered); }
          state.hovered = result.root;
          highlight(result.root);
          showTip(result.root, result.tip, event);
          window.setTimeout(hideTip, 3200);
        }
      }
      hint.classList.add("is-quiet");
    });
    controls.addEventListener("start", function () { hideTip(); hint.classList.add("is-quiet"); });

    var tween = null;
    function resetView() {
      hideTip();
      if (opts.onReset) { opts.onReset(); }
      tween = {
        t: 0,
        duration: 0.7,
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPosition: initialPosition.clone(),
        toTarget: initialTarget.clone()
      };
      controls.enabled = false;
      hint.classList.remove("is-quiet");
    }
    if (resetButton) { resetButton.addEventListener("click", resetView); }

    function resize() {
      fit(renderer, camera, container);
      if (fallback && container.clientWidth > 1 && container.clientHeight > 1) {
        fallback.hidden = true;
        container.classList.add("scene-ready");
      }
    }
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(container); }
    window.addEventListener("resize", resize);
    resize();
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting; });
      }, { rootMargin: "80px" }).observe(container);
    }
    function frame() {
      var realDt = Math.min(clock.getDelta(), 0.05);
      var sceneActive = container.offsetParent !== null;
      if (!state.paused && sceneActive) {
        var dt = realDt * state.speed;
        state.time += dt;
        updaters.forEach(function (update) { update(dt, state.time, realDt); });
      }
      if (tween) {
        tween.t += realDt / tween.duration;
        var k = easeInOutCubic(clamp(tween.t, 0, 1));
        camera.position.lerpVectors(tween.fromPosition, tween.toPosition, k);
        controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
        if (tween.t >= 1) {
          tween = null;
          controls.enabled = true;
        }
      }
      controls.update();
      if (container.offsetParent !== null) {
        ensureCanvasSize(renderer, resize);
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        var bounds = container.getBoundingClientRect();
        var onScreen = bounds.bottom > 0 && bounds.top < viewportHeight && bounds.right > 0 && bounds.left < viewportWidth;
        if (visible || onScreen) { renderer.render(scene, camera); }
      }
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
    return {
      renderer: renderer,
      scene: scene,
      camera: camera,
      controls: controls,
      palette: palette,
      state: state,
      figure: figure,
      onUpdate: function (update) { updaters.push(update); return update; },
      registerTip: registerTip,
      resetView: resetView,
      hideTip: hideTip,
      setPaused: setPaused,
      reducedMotion: reducedMotion
    };
  }

  function neuronScene(container) {
    var base = setup(container, [2.3, 3.1, 14.6], [2.25, 0, 0], {
      minDistance: 8,
      maxDistance: 25,
      shadowY: -2.8,
      onReset: function () {
        if (myelinInput) { myelinInput.checked = true; }
        myelinOn = true;
        reset();
      }
    });
    if (!base) { return null; }
    var P = base.palette;
    var scene = base.scene;
    var figure = base.figure;
    var soma = new THREE.Mesh(
      new THREE.SphereGeometry(1.22, 32, 24),
      standard(P.paper3, { roughness: 0.46, metalness: 0.06, transparent: true, opacity: 0.84 })
    );
    soma.castShadow = true;
    scene.add(soma);
    base.registerTip(soma, "Zellkörper (Soma)", "Im Zellkörper liegen Zellkern und Organellen. Er steuert den Stoffwechsel der Nervenzelle.", "Bau der Nervenzelle");
    var somaWire = new THREE.Mesh(
      new THREE.SphereGeometry(1.235, 28, 20),
      basic(P.muted, { wireframe: true, transparent: true, opacity: 0.16 })
    );
    scene.add(somaWire);
    var nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 20, 16),
      standard(P.accent, { roughness: 0.38, metalness: 0.02, emissive: P.accent, emissiveIntensity: 0.18 })
    );
    nucleus.position.set(-0.08, 0.08, 0.86);
    nucleus.castShadow = true;
    scene.add(nucleus);
    base.registerTip(nucleus, "Zellkern", "Der Zellkern enthält die Erbinformation (DNA) und steuert die Bildung von Proteinen.", "Bau der Nervenzelle");
    var nucleusCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 12),
      standard(P.paper, { roughness: 0.5 })
    );
    nucleusCore.position.copy(nucleus.position);
    nucleusCore.position.z += 0.18;
    scene.add(nucleusCore);
    base.registerTip(nucleusCore, "Kernkörperchen", "Im Kernkörperchen werden Teile der Ribosomen gebildet. Für die 8. Klasse reicht: Der Zellkern steuert die Zelle.", "Bau der Nervenzelle");

    var dendrites = new THREE.Group();
    scene.add(dendrites);
    function branch(start, direction, length, depth, group) {
      var end = start.clone().add(direction.clone().normalize().multiplyScalar(length));
      var dir = new THREE.Vector3().subVectors(end, start);
      var cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055 * depth, 0.105 * depth, dir.length(), 8),
        standard(P.ink, { roughness: 0.55 })
      );
      cylinder.position.copy(start).add(end).multiplyScalar(0.5);
      cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      cylinder.castShadow = true;
      group.add(cylinder);
      if (depth > 1) {
        var left = direction.clone().add(new THREE.Vector3(0.4, 0.7, 0.1)).normalize();
        var right = direction.clone().add(new THREE.Vector3(-0.3, 0.5, -0.2)).normalize();
        branch(end, left, length * 0.62, depth - 1, group);
        branch(end, right, length * 0.55, depth - 1, group);
      } else {
        var tip = new THREE.Mesh(new THREE.SphereGeometry(0.055 * depth, 8, 6), standard(P.accent, { emissive: P.accent, emissiveIntensity: 0.18 }));
        tip.position.copy(end);
        group.add(tip);
      }
    }
    [
      new THREE.Vector3(-1, 0.72, 0.2), new THREE.Vector3(-0.82, -0.68, -0.3), new THREE.Vector3(-0.42, 1, -0.22),
      new THREE.Vector3(-0.18, -1, 0.42), new THREE.Vector3(-1, 0.1, 0.8), new THREE.Vector3(-0.9, -0.2, -0.8)
    ].forEach(function (direction) {
      branch(new THREE.Vector3(-0.9, 0, 0), direction, 1.62, 3, dendrites);
    });
    base.registerTip(dendrites, "Dendriten", "Kurze, stark verzweigte Fortsätze. Sie nehmen Signale von anderen Nervenzellen auf und leiten sie zum Zellkörper.", "Bau der Nervenzelle");

    var axon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 7.7, 12),
      standard(P.ink, { roughness: 0.5 })
    );
    axon.position.set(4.95, 0, 0);
    axon.rotation.z = Math.PI / 2;
    axon.castShadow = true;
    scene.add(axon);
    base.registerTip(axon, "Axon", "Der lange Fortsatz leitet das Aktionspotential vom Zellkörper zu den Endknöpfchen. Die Erregung läuft nur in eine Richtung.", "Bau der Nervenzelle");

    var myelinGroup = new THREE.Group();
    scene.add(myelinGroup);
    var sheaths = [];
    for (var m = 0; m < 5; m += 1) {
      var sheath = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 1.06, 12),
        standard(P.muted, { roughness: 0.58, transparent: true, opacity: 0.97 })
      );
      sheath.position.set(2.45 + m * 1.38, 0, 0);
      sheath.rotation.z = Math.PI / 2;
      sheath.castShadow = true;
      myelinGroup.add(sheath);
      sheaths.push(sheath);
    }
    base.registerTip(myelinGroup, "Myelinscheiden", "Isolierschichten um das Axon. Die Erregung springt von Schnürring zu Schnürring. Dadurch ist die Weiterleitung schneller, ohne dass das Axon dicker werden muss.", "Bau der Nervenzelle");

    var terminals = new THREE.Group();
    scene.add(terminals);
    [
      new THREE.Vector3(9.4, 0.78, 0.38), new THREE.Vector3(9.4, -0.78, -0.38), new THREE.Vector3(9.4, 0, 0.9)
    ].forEach(function (position) {
      var terminal = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 12),
        standard(P.accent, { roughness: 0.4, metalness: 0.04, emissive: P.accent, emissiveIntensity: 0.14 })
      );
      terminal.position.copy(position);
      terminal.castShadow = true;
      terminals.add(terminal);
      var stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.06, 0.75, 6),
        standard(P.ink, { roughness: 0.55 })
      );
      stem.position.set(8.9, position.y * 0.5, position.z * 0.5);
      stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), position.clone().sub(new THREE.Vector3(8.65, 0, 0)).normalize());
      terminals.add(stem);
    });
    base.registerTip(terminals, "Endknöpfchen", "An den Endknöpfchen endet das Axon. Hier wird das elektrische Signal über eine Synapse an die nächste Zelle weitergegeben.", "Bau der Nervenzelle");

    var pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 18, 14),
      standard(P.accent2, { roughness: 0.28, transparent: true, opacity: 0.98, emissive: P.accent, emissiveIntensity: 1.5 })
    );
    pulse.visible = false;
    scene.add(pulse);
    var pulseLight = new THREE.PointLight(P.accent, 0.9, 4.2, 2);
    pulseLight.visible = false;
    scene.add(pulseLight);

    var fireButton = figure ? figure.querySelector("[data-neuron-fire]") : null;
    var resetButton = figure ? figure.querySelector("[data-neuron-reset]") : null;
    var myelinInput = figure ? figure.querySelector("[data-neuron-myelin]") : null;
    var readout = figure ? figure.querySelector("[data-neuron-readout]") : null;
    var running = false;
    var progress = 0;
    var myelinOn = myelinInput ? myelinInput.checked : true;
    var myelinValues = sheaths.map(function () { return myelinOn ? 1 : 0.001; });
    function setReadout(html) { if (readout) { readout.innerHTML = html; } }
    function fire() {
      running = true;
      progress = 0;
      pulse.visible = true;
      pulseLight.visible = true;
      setReadout("<strong>Reiz unterwegs.</strong> Der Reiz läuft vom Soma über das Axon zu den Endknöpfchen. " + (myelinOn ? "Die Myelinscheiden lassen die Erregung schneller von Schnürring zu Schnürring springen." : "Ohne Myelin läuft die Erregung kontinuierlich entlang des Axons und ist langsamer."));
    }
    function reset() {
      running = false;
      progress = 0;
      pulse.visible = false;
      pulseLight.visible = false;
      setReadout("Drücke „Reiz auslösen“, um die Weiterleitung zu starten.");
      base.hideTip();
    }
    if (fireButton) { fireButton.addEventListener("click", fire); }
    if (resetButton) { resetButton.addEventListener("click", reset); }
    if (myelinInput) {
      myelinInput.addEventListener("change", function () {
        myelinOn = myelinInput.checked;
        setReadout(myelinOn ? "Mit Myelin: Die Erregung springt schneller von Schnürring zu Schnürring." : "Ohne Myelin: Die Erregung läuft kontinuierlich entlang des Axons und ist langsamer.");
      });
    }
    setReadout("Drücke „Reiz auslösen“, um die Weiterleitung zu starten. Ziehe am Modell, um es zu drehen.");
    base.onUpdate(function (dt, time) {
      sheaths.forEach(function (sheath, index) {
        var target = myelinOn ? 1 : 0.001;
        myelinValues[index] = damp(myelinValues[index], target, 11, dt);
        sheath.scale.setScalar(myelinValues[index]);
        sheath.visible = myelinValues[index] > 0.04;
      });
      dendrites.rotation.z = Math.sin(time * 0.42) * 0.008;
      soma.rotation.y = Math.sin(time * 0.26) * 0.035;
      nucleus.rotation.y = Math.sin(time * 0.26 + 1) * 0.05;
      if (running) {
        progress += dt * (myelinOn ? 0.23 : 0.12);
        var p = clamp(progress, 0, 1);
        var travel = easeInOutSine(p);
        if (myelinOn) {
          var jumps = Math.floor(travel * 7) / 7;
          travel = travel * 0.55 + jumps * 0.45;
        }
        var x = -0.8 + travel * 10.2;
        pulse.position.set(x, Math.sin(p * Math.PI * 7) * 0.07, Math.sin(p * Math.PI * 4) * 0.05);
        var pulseScale = 1 + Math.sin(time * 8) * 0.1;
        pulse.scale.setScalar(pulseScale);
        pulseLight.position.copy(pulse.position);
        if (progress >= 1) {
          running = false;
          pulse.visible = false;
          pulseLight.visible = false;
          setReadout("<strong>Angekommen.</strong> An den Endknöpfchen wird der elektrische Reiz auf die nächste Zelle übertragen, meist über eine Synapse. " + (myelinOn ? "Die Erregung ist schnell von Schnürring zu Schnürring gesprungen." : "Ohne Myelin war die Weiterleitung deutlich langsamer."));
        }
      }
    });
    return { fire: fire, reset: reset, base: base };
  }

  function eyeScene(container) {
    var base = setup(container, [0, 0.45, 11.6], [0, 0, 0], {
      minDistance: 6.5,
      maxDistance: 18,
      shadowY: -3.35,
      maxPolarAngle: Math.PI / 2 - 0.04,
      onReset: function () { setMode("far"); }
    });
    if (!base) { return null; }
    var P = base.palette;
    var scene = base.scene;
    var figure = base.figure;
    var sclera = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 36, 28),
      standard(P.paper, { transparent: true, opacity: 0.13, roughness: 0.4, depthWrite: false })
    );
    scene.add(sclera);
    var wire = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 24, 18),
      basic(P.muted, { wireframe: true, transparent: true, opacity: 0.18 })
    );
    scene.add(wire);
    var cornea = new THREE.Mesh(
      new THREE.SphereGeometry(2.05, 28, 18),
      standard(P.accent, { transparent: true, opacity: 0.06, roughness: 0.18, metalness: 0.05, depthWrite: false })
    );
    cornea.scale.set(1, 1, 0.34);
    cornea.position.z = 2.18;
    scene.add(cornea);
    var retina = new THREE.Mesh(
      new THREE.CircleGeometry(2.24, 40),
      standard(P.muted, { transparent: true, opacity: 0.42, roughness: 0.7, side: THREE.DoubleSide })
    );
    retina.position.z = -2.2;
    scene.add(retina);
    base.registerTip(retina, "Netzhaut", "Auf der Netzhaut liegen Stäbchen und Zapfen. Sie wandeln Licht in Nervensignale um. Hier muss das Bild scharf entstehen.", "Auge");
    var macula = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 24),
      basic(P.accent, { transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    macula.position.set(0, 0.1, -2.18);
    scene.add(macula);
    base.registerTip(macula, "Gelber Fleck", "Der gelbe Fleck ist die Stelle des schärfsten Sehens. Dort liegen besonders viele Zapfen.", "Auge");
    var iris = new THREE.Mesh(
      new THREE.TorusGeometry(1.02, 0.18, 10, 40),
      standard(P.accent, { roughness: 0.38, metalness: 0.08, emissive: P.accent, emissiveIntensity: 0.08 })
    );
    iris.position.z = 2.43;
    scene.add(iris);
    base.registerTip(iris, "Iris", "Die Iris regelt die Pupillenweite und damit die Lichtmenge, die ins Auge fällt. Sie ist der farbige Teil des Auges.", "Auge");
    var pupil = new THREE.Mesh(new THREE.CircleGeometry(0.43, 28), basic(P.ink));
    pupil.position.z = 2.445;
    scene.add(pupil);
    base.registerTip(pupil, "Pupille", "Die Pupille ist die Öffnung in der Iris. Bei hellem Licht wird sie kleiner, bei Dunkelheit größer.", "Auge");
    var lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 28, 20),
      standard(P.paper3, { transparent: true, opacity: 0.78, roughness: 0.22, metalness: 0.05 })
    );
    lens.position.z = 1.45;
    lens.scale.z = 0.48;
    lens.castShadow = true;
    scene.add(lens);
    base.registerTip(lens, "Linse", "Die Linse bündelt das Licht. Beim Nahsehen wird sie stärker gekrümmt, beim Fernsehen flacher. Das nennt man Akkommodation.", "Auge");
    var nerve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.34, 3.3, 12),
      standard(P.ink, { roughness: 0.55 })
    );
    nerve.position.set(1.7, 0.25, -3.3);
    nerve.rotation.x = Math.PI / 2;
    nerve.castShadow = true;
    scene.add(nerve);
    base.registerTip(nerve, "Sehnerv", "Der Sehnerv leitet die Nervensignale von der Netzhaut zum Gehirn. Dort entsteht der bewusste Seheindruck.", "Auge");

    var rayMaterial = new THREE.LineBasicMaterial({ color: P.accent, transparent: true, opacity: 0.9 });
    var rayGeometryTop = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.62, 0, 6), new THREE.Vector3(-0.62, 0, 1.45), new THREE.Vector3(0, 0, -2.2)
    ]);
    var rayGeometryBottom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.62, 0, 6), new THREE.Vector3(0.62, 0, 1.45), new THREE.Vector3(0, 0, -2.2)
    ]);
    var rayTop = new THREE.Line(rayGeometryTop, rayMaterial);
    var rayBottom = new THREE.Line(rayGeometryBottom, rayMaterial);
    scene.add(rayTop, rayBottom);
    var focusDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 10),
      basic(P.accent, { transparent: true, opacity: 0.92 })
    );
    focusDot.position.set(0, 0, -2.2);
    scene.add(focusDot);
    var focusHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.13, 0.18, 24),
      basic(P.accent, { transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    focusHalo.position.set(0, 0, -2.2);
    scene.add(focusHalo);

    var buttons = figure ? $$("[data-eye-mode]", figure) : [];
    var readout = figure ? figure.querySelector("[data-eye-readout]") : null;
    var modes = {
      near: { lens: 0.88, focus: -2.2, label: "Nah", text: "Nahsehen: Die Linse ist stärker gekrümmt. Das Licht wird stärker gebrochen und trifft scharf auf der Netzhaut auf." },
      far: { lens: 0.48, focus: -2.2, label: "Fern", text: "Fernsehen: Die Linse ist flacher. Das Licht wird weniger stark gebrochen und trifft scharf auf der Netzhaut auf." },
      myopia: { lens: 0.96, focus: -1.18, label: "Kurzsichtig", text: "Kurzsichtigkeit: Das Bild entsteht vor der Netzhaut. Ferne Gegenstände sind unscharf; eine Zerstreuungslinse kann das Licht wieder auf die Netzhaut bringen." },
      hyperopia: { lens: 0.3, focus: -3.35, label: "Weitsichtig", text: "Weitsichtigkeit: Das Bild würde hinter der Netzhaut entstehen. Nahe Gegenstände sind unscharf; eine Sammellinse kann korrigieren." }
    };
    var targetLens = modes.far.lens;
    var targetFocus = modes.far.focus;
    var currentLens = targetLens;
    var currentFocus = targetFocus;
    var modeKey = "far";
    function updateRays(focus) {
      var top = rayGeometryTop.attributes.position;
      top.setXYZ(0, -0.62, 0, 6);
      top.setXYZ(1, -0.62, 0, 1.45);
      top.setXYZ(2, 0, 0, focus);
      top.needsUpdate = true;
      var bottom = rayGeometryBottom.attributes.position;
      bottom.setXYZ(0, 0.62, 0, 6);
      bottom.setXYZ(1, 0.62, 0, 1.45);
      bottom.setXYZ(2, 0, 0, focus);
      bottom.needsUpdate = true;
      focusDot.position.z = focus;
      focusHalo.position.z = focus;
    }
    function setMode(key) {
      var mode = modes[key] || modes.far;
      modeKey = key;
      targetLens = mode.lens;
      targetFocus = mode.focus;
      buttons.forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.eyeMode === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + mode.label + ".</strong> " + mode.text; }
      base.hideTip();
    }
    buttons.forEach(function (button) { button.addEventListener("click", function () { setMode(button.dataset.eyeMode); }); });
    setMode("far");
    updateRays(currentFocus);
    base.onUpdate(function (dt, time) {
      currentLens = damp(currentLens, targetLens, 7.5, dt);
      currentFocus = damp(currentFocus, targetFocus, 7.5, dt);
      lens.scale.z = currentLens;
      updateRays(currentFocus);
      var pulse = 1 + Math.sin(time * 3.2) * 0.12;
      focusDot.scale.setScalar(pulse);
      focusHalo.scale.setScalar(pulse);
      focusHalo.material.opacity = 0.34 + Math.sin(time * 3.2) * 0.12;
      iris.rotation.z = Math.sin(time * 0.32) * 0.03;
      pupil.scale.setScalar(1 + Math.sin(time * 0.45) * 0.02);
      if (modeKey === "myopia" || modeKey === "hyperopia") {
        rayMaterial.opacity = 0.65 + Math.sin(time * 2.2) * 0.12;
      } else {
        rayMaterial.opacity = 0.9;
      }
    });
    return { setMode: setMode, base: base };
  }

  function earScene(container) {
    var base = setup(container, [0, 3.6, 14.6], [0, 0, 0], {
      minDistance: 8,
      maxDistance: 26,
      shadowY: -3.05,
      onReset: function () {
        loud = false;
        high = false;
        if (loudButton) { loudButton.setAttribute("aria-pressed", "false"); }
        if (highButton) { highButton.setAttribute("aria-pressed", "false"); }
        stop();
        setReadout("Starte einen Ton. Die Schallwellen wandern vom Außenohr über das Trommelfell und die Gehörknöchelchen zur Cochlea.");
      }
    });
    if (!base) { return null; }
    var P = base.palette;
    var scene = base.scene;
    var figure = base.figure;
    var pinna = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.28, 16, 48),
      standard(P.paper3, { roughness: 0.58, metalness: 0.03 })
    );
    pinna.position.x = -4.35;
    pinna.rotation.y = Math.PI / 2;
    pinna.scale.y = 1.26;
    pinna.scale.z = 0.86;
    pinna.castShadow = true;
    scene.add(pinna);
    base.registerTip(pinna, "Ohrmuschel", "Die Ohrmuschel fängt Schallwellen auf und bündelt sie. Sie hilft auch dabei, die Richtung einer Schallquelle zu unterscheiden.", "Ohr");
    var pinnaInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.14, 12, 36),
      standard(P.muted, { roughness: 0.55 })
    );
    pinnaInner.position.set(-4.42, 0.05, 0);
    pinnaInner.rotation.y = Math.PI / 2;
    pinnaInner.scale.y = 1.3;
    scene.add(pinnaInner);
    var canal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.32, 3.3, 14),
      standard(P.paper3, { roughness: 0.55 })
    );
    canal.position.x = -2.45;
    canal.rotation.z = Math.PI / 2;
    canal.castShadow = true;
    scene.add(canal);
    base.registerTip(canal, "Gehörgang", "Der Gehörgang leitet die Schallwellen vom Außenohr zum Trommelfell. Ohrenschmalz und feine Härchen halten Staub zurück.", "Ohr");
    var drum = new THREE.Mesh(
      new THREE.CircleGeometry(0.84, 28),
      standard(P.paper3, { roughness: 0.48, side: THREE.DoubleSide, emissive: P.muted, emissiveIntensity: 0.06 })
    );
    drum.position.x = -0.7;
    drum.rotation.y = Math.PI / 2;
    scene.add(drum);
    base.registerTip(drum, "Trommelfell", "Das Trommelfell ist eine dünne Membran. Schallwellen bringen es zum Schwingen; diese Bewegung wird auf die Gehörknöchelchen übertragen.", "Ohr");
    var ossicles = new THREE.Group();
    scene.add(ossicles);
    var bonePositions = [new THREE.Vector3(-0.12, 0.25, 0), new THREE.Vector3(0.62, -0.08, 0.18), new THREE.Vector3(1.33, 0.2, -0.1)];
    bonePositions.forEach(function (position, index) {
      var bone = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 - index * 0.025, 14, 11),
        standard(P.paper3, { roughness: 0.48, metalness: 0.06 })
      );
      bone.position.copy(position);
      bone.scale.set(1, 1.2, 0.9);
      bone.castShadow = true;
      ossicles.add(bone);
    });
    for (var oi = 0; oi < bonePositions.length - 1; oi += 1) {
      var start = bonePositions[oi];
      var end = bonePositions[oi + 1];
      var dir = new THREE.Vector3().subVectors(end, start);
      var connector = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.06, dir.length(), 6),
        standard(P.muted, { roughness: 0.55 })
      );
      connector.position.copy(start).add(end).multiplyScalar(0.5);
      connector.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      ossicles.add(connector);
    }
    base.registerTip(ossicles, "Gehörknöchelchen", "Hammer, Amboss und Steigbügel verbinden Trommelfell und Innenohr. Sie verstärken die Schwingung und passen sie an die Flüssigkeit in der Cochlea an.", "Ohr");
    var cochleaPoints = [];
    for (var c = 0; c <= 160; c += 1) {
      var t = c / 160;
      var angle = t * 5 * Math.PI * 2;
      var radius = 0.82 * (1 - t * 0.58);
      cochleaPoints.push(new THREE.Vector3(2.35 + t * 1.55, Math.cos(angle) * radius, Math.sin(angle) * radius));
    }
    var cochlea = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cochleaPoints), 220, 0.15, 8, false),
      standard(P.accent, { roughness: 0.42, metalness: 0.04, emissive: P.accent, emissiveIntensity: 0.1 })
    );
    cochlea.castShadow = true;
    scene.add(cochlea);
    base.registerTip(cochlea, "Cochlea (Hörschnecke)", "In der Cochlea sitzen die Haarzellen. Sie wandeln Schwingungen in Nervensignale um. Hohe Töne werden am Anfang, tiefe Töne weiter innen wahrgenommen.", "Ohr");
    var nerve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.26, 2.6, 12),
      standard(P.ink, { roughness: 0.55 })
    );
    nerve.position.set(4.85, 0, 0);
    nerve.rotation.z = Math.PI / 2;
    nerve.castShadow = true;
    scene.add(nerve);
    base.registerTip(nerve, "Hörnerv", "Der Hörnerv leitet die Signale aus der Cochlea zum Gehirn. Dort werden sie als Ton, Klang und Lautstärke verarbeitet.", "Ohr");

    var waves = new THREE.Group();
    scene.add(waves);
    var rings = [];
    for (var w = 0; w < 6; w += 1) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.035, 6, 36),
        basic(P.accent, { transparent: true, opacity: 0.55 })
      );
      ring.position.x = -8 - w * 0.55;
      ring.rotation.y = Math.PI / 2;
      waves.add(ring);
      rings.push(ring);
    }
    waves.visible = false;

    var playButton = figure ? figure.querySelector("[data-ear-play]") : null;
    var loudButton = figure ? figure.querySelector("[data-ear-loud]") : null;
    var highButton = figure ? figure.querySelector("[data-ear-high]") : null;
    var readout = figure ? figure.querySelector("[data-ear-readout]") : null;
    var playing = false;
    var loud = false;
    var high = false;
    var phase = 0;
    var waveStrength = 0;
    function setReadout(html) { if (readout) { readout.innerHTML = html; } }
    function play() {
      playing = true;
      waves.visible = true;
      phase = 0;
      if (playButton) {
        playButton.textContent = "Ton stoppen";
        playButton.setAttribute("aria-pressed", "true");
      }
      setReadout("<strong>Schall unterwegs.</strong> Die Schallwellen treffen auf das Trommelfell. Die Gehörknöchelchen übertragen die Schwingung auf die Cochlea, dort entstehen Nervensignale." + (loud ? " Bei hoher Lautstärke steigt das Risiko für Hörschäden." : ""));
    }
    function stop() {
      playing = false;
      waves.visible = false;
      if (playButton) {
        playButton.textContent = "Ton abspielen";
        playButton.setAttribute("aria-pressed", "false");
      }
      setReadout("Ton gestoppt. Starte einen Ton, um die Schallwellen vom Außenohr bis zur Cochlea zu verfolgen.");
    }
    if (playButton) {
      playButton.addEventListener("click", function () {
        if (playing) { stop(); } else { play(); }
      });
    }
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
    base.onUpdate(function (dt, time) {
      waveStrength = damp(waveStrength, playing ? 1 : 0, 8, dt);
      if (playing) { phase += dt * (high ? 3.6 : 2.1); }
      rings.forEach(function (ring, index) {
        var travel = ((phase * (high ? 1.35 : 1) + index * 1.05) % 4.4);
        var x = -8.8 + travel;
        ring.position.x = x;
        var proximity = clamp((x + 8.8) / 4.4, 0, 1);
        var scale = (high ? 0.54 : 0.9) + proximity * 0.8;
        ring.scale.setScalar(scale);
        ring.material.opacity = waveStrength * (loud ? 0.92 : 0.5) * (1 - proximity * 0.55);
        ring.visible = waveStrength > 0.02;
      });
      pinna.rotation.z = Math.sin(time * 0.35) * 0.012;
      drum.scale.setScalar(playing ? 1 + Math.sin(time * (high ? 9 : 5.2)) * (loud ? 0.05 : 0.025) : 1);
      ossicles.rotation.z = playing ? Math.sin(time * (high ? 7 : 4.4)) * 0.018 : 0;
    });
    return { play: play, base: base };
  }

  function synapseScene(container) {
    var base = setup(container, [0, 1.6, 13.2], [0, 0, 0], {
      minDistance: 7,
      maxDistance: 22,
      shadowY: -3.05,
      onReset: function () { reset(); }
    });
    if (!base) { return null; }
    var P = base.palette;
    var scene = base.scene;
    var figure = base.figure;
    var terminal = new THREE.Mesh(
      new THREE.SphereGeometry(2.12, 32, 24),
      standard(P.paper3, { transparent: true, opacity: 0.28, roughness: 0.48, depthWrite: false })
    );
    terminal.position.x = -2.9;
    scene.add(terminal);
    base.registerTip(terminal, "Endknöpfchen", "Das Endknöpfchen enthält Vesikel mit Neurotransmittern. Wenn das Aktionspotential ankommt, verschmelzen Vesikel mit der Membran und setzen Botenstoffe frei.", "Synapse");
    var terminalWire = new THREE.Mesh(
      new THREE.SphereGeometry(2.13, 24, 18),
      basic(P.muted, { wireframe: true, transparent: true, opacity: 0.16 })
    );
    terminalWire.position.x = -2.9;
    scene.add(terminalWire);
    var terminalRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.055, 8, 40),
      basic(P.accent, { transparent: true, opacity: 0.65 })
    );
    terminalRing.position.x = -0.82;
    terminalRing.rotation.y = Math.PI / 2;
    scene.add(terminalRing);
    var membrane = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 4.4, 3.35),
      standard(P.paper3, { roughness: 0.55 })
    );
    membrane.position.x = 1.92;
    membrane.castShadow = true;
    scene.add(membrane);
    base.registerTip(membrane, "Membran der nächsten Zelle", "Die Membran der nächsten Zelle trägt die Rezeptoren. An ihr wird das chemische Signal wieder in ein elektrisches Signal umgewandelt.", "Synapse");
    var nextCell = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 4.7, 3.5),
      standard(P.paper, { transparent: true, opacity: 0.1, roughness: 0.6, depthWrite: false })
    );
    nextCell.position.x = 2.75;
    scene.add(nextCell);
    base.registerTip(nextCell, "Nächste Zelle", "Die nächste Zelle kann eine weitere Nervenzelle oder ein Erfolgsorgan sein, zum Beispiel eine Muskelzelle.", "Synapse");
    var receptors = new THREE.Group();
    scene.add(receptors);
    for (var r = 0; r < 4; r += 1) {
      var receptor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.21, 0.56, 9),
        standard(P.accent, { roughness: 0.44, emissive: P.accent, emissiveIntensity: 0.08 })
      );
      receptor.position.set(1.66, -1.2 + r * 0.8, 0.5);
      receptor.rotation.z = Math.PI / 2;
      receptor.castShadow = true;
      receptors.add(receptor);
      var receptorTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 8),
        standard(P.accent, { roughness: 0.4, emissive: P.accent, emissiveIntensity: 0.12 })
      );
      receptorTip.position.set(1.45, -1.2 + r * 0.8, 0.5);
      receptors.add(receptorTip);
    }
    base.registerTip(receptors, "Rezeptoren", "Rezeptoren sind Bindungsstellen für Neurotransmitter. Nur ein passender Botenstoff dockt an – wie ein Schlüssel in ein Schloss.", "Schlüssel-Schloss-Modell");
    var vesicles = new THREE.Group();
    scene.add(vesicles);
    var vesicleGeo = new THREE.SphereGeometry(0.17, 12, 10);
    var vesicleMaterial = standard(P.accent, { roughness: 0.4, transparent: true, opacity: 0.92, emissive: P.accent, emissiveIntensity: 0.1 });
    for (var v = 0; v < 10; v += 1) {
      var vesicle = new THREE.Mesh(vesicleGeo, vesicleMaterial.clone());
      var vx = -4.05 + (v % 3) * 0.55;
      var vy = -1.1 + Math.floor(v / 3) * 0.62;
      var vz = 0.32 + ((v + 1) % 3) * 0.16;
      vesicle.position.set(vx, vy, vz);
      vesicle.userData.origin = new THREE.Vector3(vx, vy, vz);
      vesicle.userData.phase = v * 0.7;
      vesicles.add(vesicle);
    }
    var transmitters = new THREE.Group();
    scene.add(transmitters);
    var transmitterGeo = new THREE.SphereGeometry(0.105, 10, 8);
    var transmitterList = [];
    for (var t = 0; t < 10; t += 1) {
      var transmitter = new THREE.Mesh(
        transmitterGeo,
        standard(P.accent2, { roughness: 0.35, transparent: true, opacity: 1, emissive: P.accent, emissiveIntensity: 0.2 })
      );
      transmitter.visible = false;
      transmitter.userData.start = new THREE.Vector3(-1.9, -1.35 + (t % 5) * 0.68, 0.34 + (t % 3) * 0.13);
      transmitter.userData.end = new THREE.Vector3(1.48, -1.35 + (t % 5) * 0.68, 0.5);
      transmitter.userData.index = t;
      transmitter.position.copy(transmitter.userData.start);
      transmitters.add(transmitter);
      transmitterList.push(transmitter);
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
      transmitterList.forEach(function (transmitter) {
        transmitter.visible = true;
        transmitter.position.copy(transmitter.userData.start);
        transmitter.material.opacity = 1;
      });
      setReadout("<strong>Signal angekommen.</strong> Die Vesikel verschmelzen mit der Membran, Neurotransmitter werden in den synaptischen Spalt freigesetzt und binden an die Rezeptoren der nächsten Zelle.");
    }
    function reset() {
      running = false;
      progress = 0;
      transmitterList.forEach(function (transmitter) {
        transmitter.visible = false;
        transmitter.position.copy(transmitter.userData.start);
        transmitter.material.opacity = 1;
      });
      receptors.children.forEach(function (receptor) {
        if (receptor.material && receptor.material.emissiveIntensity != null) { receptor.material.emissiveIntensity = 0.08; }
      });
      setReadout("Drücke „Signal senden“, um die Übertragung an der Synapse zu starten.");
      base.hideTip();
    }
    if (sendButton) { sendButton.addEventListener("click", send); }
    if (resetButton) { resetButton.addEventListener("click", reset); }
    setReadout("Drücke „Signal senden“, um die Übertragung an der Synapse zu starten. Der synaptische Spalt ist im Modell stark vergrößert.");
    base.onUpdate(function (dt, time) {
      vesicles.children.forEach(function (vesicle, index) {
        var origin = vesicle.userData.origin;
        var bob = Math.sin(time * 1.5 + vesicle.userData.phase) * 0.05;
        var push = running ? Math.min(1, progress * 2.2) : 0;
        vesicle.position.x = origin.x + push * 0.62;
        vesicle.position.y = origin.y + bob;
        vesicle.position.z = origin.z + Math.cos(time * 1.2 + index) * 0.03;
        var glow = running ? 0.14 + Math.sin(time * 8 + index) * 0.08 : 0.1;
        vesicle.material.emissiveIntensity = glow;
      });
      if (running) {
        progress += dt * 0.24;
        transmitterList.forEach(function (transmitter, index) {
          var startAt = index * 0.018;
          var local = clamp((progress - startAt) / 0.72, 0, 1);
          var eased = easeOutCubic(local);
          var start = transmitter.userData.start;
          var end = transmitter.userData.end;
          transmitter.position.x = start.x + (end.x - start.x) * eased;
          transmitter.position.y = start.y + (end.y - start.y) * eased + Math.sin(local * Math.PI) * 0.09;
          transmitter.material.opacity = local < 0.86 ? 1 : 1 - (local - 0.86) * 0.62;
        });
        receptors.children.forEach(function (receptor, index) {
          if (!receptor.material || receptor.material.emissiveIntensity == null) { return; }
          var target = 0.08 + clamp((progress - 0.52 - index * 0.02) / 0.4, 0, 1) * 0.65;
          receptor.material.emissiveIntensity = damp(receptor.material.emissiveIntensity, target, 7, dt);
        });
        if (progress >= 1.18) {
          running = false;
          setReadout("<strong>Übertragen.</strong> Die Bindung an den Rezeptoren löst in der nächsten Zelle ein neues elektrisches Signal aus. Danach werden die Neurotransmitter abgebaut oder wieder aufgenommen.");
        }
      } else {
        receptors.children.forEach(function (receptor) {
          if (receptor.material && receptor.material.emissiveIntensity != null) {
            receptor.material.emissiveIntensity = damp(receptor.material.emissiveIntensity, 0.08, 4, dt);
          }
        });
      }
    });
    return { send: send, reset: reset, base: base };
  }

  function ecosystemScene(container) {
    var base = setup(container, [0, 10.5, 17.5], [0, 0, 0], {
      minDistance: 11,
      maxDistance: 31,
      maxPolarAngle: Math.PI / 2 - 0.06,
      onReset: function () { reset(); }
    });
    if (!base) { return null; }
    var P = base.palette;
    var scene = base.scene;
    var figure = base.figure;
    function terrainHeight(x, z) {
      return 0.35 * Math.sin(x * 0.42) * Math.cos(z * 0.34) + 0.18 * Math.sin(x * 0.9 + z * 0.5);
    }
    var geometry = new THREE.PlaneGeometry(16.5, 12.5, 56, 44);
    geometry.rotateX(-Math.PI / 2);
    var position = geometry.attributes.position;
    var colors = [];
    var colorLow = new THREE.Color(P.paper3);
    var colorHigh = new THREE.Color(P.muted);
    var colorAccent = new THREE.Color(P.accent);
    for (var i = 0; i < position.count; i += 1) {
      var x = position.getX(i);
      var z = position.getZ(i);
      var h = terrainHeight(x, z);
      position.setY(i, h);
      var mix = clamp(0.36 + h * 0.7 + 0.16 * Math.sin(x * 1.3 + z * 1.1), 0, 1);
      var color = colorLow.clone().lerp(colorHigh, mix);
      color.lerp(colorAccent, 0.05 + 0.04 * Math.sin(x * 0.8));
      colors.push(color.r, color.g, color.b);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    var terrain = new THREE.Mesh(
      geometry,
      standard(0xffffff, { roughness: 0.9, metalness: 0.02, vertexColors: true })
    );
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    scene.add(terrain);
    base.registerTip(terrain, "Biotop", "Der Biotop ist der unbelebte Lebensraum: Boden, Wasser, Klima und Licht. Zusammen mit der Biozönose bildet er das Ökosystem.", "Ökosystem");

    function riverCurve(straight) {
      var points = [];
      for (var rp = 0; rp <= 22; rp += 1) {
        var z = -5.9 + (rp / 22) * 11.8;
        points.push(new THREE.Vector3(straight ? 0 : Math.sin(z * 0.55) * 1.9, 0.18, z));
      }
      return new THREE.CatmullRomCurve3(points);
    }
    var straightMaterial = standard(P.water, { roughness: 0.28, metalness: 0.08, transparent: true, opacity: 0, emissive: P.water, emissiveIntensity: 0.12, depthWrite: false });
    var meanderMaterial = standard(P.water, { roughness: 0.28, metalness: 0.08, transparent: true, opacity: 1, emissive: P.water, emissiveIntensity: 0.12, depthWrite: false });
    var riverStraight = new THREE.Mesh(new THREE.TubeGeometry(riverCurve(true), 120, 0.34, 9, false), straightMaterial);
    var riverMeander = new THREE.Mesh(new THREE.TubeGeometry(riverCurve(false), 160, 0.34, 9, false), meanderMaterial);
    riverStraight.position.y = 0.03;
    riverMeander.position.y = 0.03;
    riverStraight.castShadow = true;
    riverMeander.castShadow = true;
    scene.add(riverStraight, riverMeander);
    base.registerTip(riverStraight, "Begradigter Fluss", "Ein begradigter Fluss fließt schneller. Auen trocknen aus, Lebensräume gehen verloren und Hochwasser wird stromabwärts verstärkt.", "Menschlicher Eingriff");
    base.registerTip(riverMeander, "Mäandrierender Fluss", "Ein natürlicher Fluss bildet Schleifen. Er fließt langsamer, schafft Kiesbänke und Überschwemmungsflächen und bietet vielen Arten Lebensraum.", "Naturnaher Fluss");

    function seeded(index) {
      var value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
      return value - Math.floor(value);
    }
    var trees = new THREE.Group();
    scene.add(trees);
    var treePositions = [];
    var treeIndex = 0;
    for (var tx = -6.2; tx <= 6.2; tx += 2.05) {
      for (var tz = -4.4; tz <= 4.4; tz += 2.2) {
        if (Math.abs(tx - Math.sin(tz * 0.55) * 1.9) < 1.35) { continue; }
        treePositions.push([tx + (seeded(treeIndex) - 0.5) * 0.55, tz + (seeded(treeIndex + 20) - 0.5) * 0.55]);
        treeIndex += 1;
      }
    }
    treePositions.forEach(function (pos, index) {
      var tree = new THREE.Group();
      var trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.12, 1.2, 7),
        standard(P.ink, { roughness: 0.7 })
      );
      trunk.position.y = 0.6;
      trunk.castShadow = true;
      tree.add(trunk);
      var crownMaterial = standard(P.muted, { roughness: 0.68 });
      var crown = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.55, 8), crownMaterial);
      crown.position.y = 1.66;
      crown.castShadow = true;
      tree.add(crown);
      var crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.15, 8), crownMaterial.clone());
      crown2.position.y = 2.28;
      crown2.castShadow = true;
      tree.add(crown2);
      tree.position.set(pos[0], terrainHeight(pos[0], pos[1]) + 0.05, pos[1]);
      tree.userData.target = 1;
      tree.userData.phase = index * 0.7;
      tree.userData.scale = 1;
      trees.add(tree);
      base.registerTip(tree, "Baum", "Bäume sind Produzenten und bieten Lebensraum. In der Sukzession dominieren sie erst im späteren Verlauf; Landwirtschaft kann den Wald zurückdrängen.", "Sukzession");
    });

    var fields = new THREE.Group();
    scene.add(fields);
    fields.visible = true;
    var fieldMeshes = [];
    for (var fx = -5.6; fx <= 5.6; fx += 3.2) {
      for (var fz = -3.4; fz <= 3.4; fz += 3.1) {
        if (Math.abs(fx - Math.sin(fz * 0.55) * 1.9) < 1.2) { continue; }
        var field = new THREE.Mesh(
          new THREE.BoxGeometry(2.5, 0.08, 2.1),
          standard(P.paper, { roughness: 0.82, transparent: true, opacity: 0 })
        );
        field.position.set(fx, terrainHeight(fx, fz) + 0.08, fz);
        field.castShadow = true;
        field.receiveShadow = true;
        field.userData.target = 0;
        field.userData.opacity = 0;
        fields.add(field);
        fieldMeshes.push(field);
        for (var row = -0.8; row <= 0.8; row += 0.4) {
          var crop = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.03, 0.05),
            standard(P.accent, { roughness: 0.7, transparent: true, opacity: 0 })
          );
          crop.position.set(0, 0.07, row);
          field.add(crop);
        }
        base.registerTip(field, "Ackerfläche", "Äcker liefern Nahrung, verdrängen aber Wald und verringern oft die Artenvielfalt. Blühstreifen und Fruchtwechsel können die Folgen mildern.", "Kulturlandschaft");
      }
    }
    fields.visible = true;

    var birds = new THREE.Group();
    scene.add(birds);
    for (var b = 0; b < 4; b += 1) {
      var birdGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.25, 0, 0), new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0.25, 0, 0)
      ]);
      var bird = new THREE.Line(birdGeometry, new THREE.LineBasicMaterial({ color: P.ink, transparent: true, opacity: 0.45 }));
      bird.userData.phase = b * 1.7;
      bird.userData.radius = 3.2 + b * 1.05;
      birds.add(bird);
    }

    var stage = 3;
    var agriculture = false;
    var straightened = false;
    var autoPlay = false;
    var stageTimer = 0;
    var stageButtons = figure ? $$("[data-eco-stage]", figure) : [];
    var agricultureInput = figure ? figure.querySelector("[data-eco-agriculture]") : null;
    var riverInput = figure ? figure.querySelector("[data-eco-river]") : null;
    var readout = figure ? figure.querySelector("[data-eco-readout]") : null;
    var playButton = figure ? figure.querySelector("[data-eco-play]") : null;
    function setReadout(html) { if (readout) { readout.innerHTML = html; } }
    function treeTargetFor(currentStage) {
      if (agriculture) { return 0; }
      if (currentStage <= 1) { return 0; }
      if (currentStage === 2) { return 0.46; }
      return 1;
    }
    function update(immediate) {
      var treeTarget = treeTargetFor(stage);
      var snap = immediate || base.state.paused;
      trees.children.forEach(function (tree, index) {
        tree.userData.target = index < Math.ceil(trees.children.length * treeTarget) ? 1 : 0;
      });
      fields.visible = true;
      fieldMeshes.forEach(function (field) {
        field.userData.target = agriculture ? 1 : 0;
        if (agriculture) { field.visible = true; }
        if (snap) {
          field.userData.opacity = field.userData.target;
          field.material.opacity = field.userData.target;
          field.visible = field.userData.target > 0.02;
          field.children.forEach(function (crop) { crop.material.opacity = field.userData.target * 0.65; });
        }
      });
      if (snap) {
        trees.children.forEach(function (tree) {
          tree.userData.scale = tree.userData.target;
          tree.scale.setScalar(tree.userData.target);
          tree.visible = tree.userData.target > 0.02;
        });
      }
      if (snap) {
        straightMaterial.opacity = straightened ? 1 : 0;
        meanderMaterial.opacity = straightened ? 0 : 1;
        riverStraight.visible = straightened;
        riverMeander.visible = !straightened;
      }
      stageButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", Number(button.dataset.ecoStage) === stage ? "true" : "false");
      });
      if (playButton) {
        playButton.textContent = autoPlay ? "Sukzession pausieren" : "Sukzession abspielen";
        playButton.setAttribute("aria-pressed", autoPlay ? "true" : "false");
      }
      var stageText = [
        "Rohboden: kaum Vegetation, Pionierarten beginnen.",
        "Grasland: Gräser und Kräuter bedecken den Boden.",
        "Gebüsch: Sträucher und erste Bäume verdrängen das Gras.",
        "Wald: Bäume dominieren; die Sukzession ist noch nicht endgültig abgeschlossen."
      ][stage];
      setReadout("<strong>" + stageText + "</strong> " + (agriculture ? "Die Landwirtschaft hat die Bäume entfernt und Felder angelegt." : "Ohne landwirtschaftlichen Eingriff bleibt die Vegetation stehen.") + " " + (straightened ? "Der Fluss ist begradigt." : "Der Fluss mäandriert.") + " Sukzession ist ein Prozess, kein Endzustand.");
    }
    stageButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        stage = Number(button.dataset.ecoStage);
        autoPlay = false;
        update(false);
      });
    });
    if (agricultureInput) {
      agricultureInput.addEventListener("change", function () {
        agriculture = agricultureInput.checked;
        update(false);
      });
    }
    if (riverInput) {
      riverInput.addEventListener("change", function () {
        straightened = riverInput.checked;
        update(false);
      });
    }
    if (playButton) {
      playButton.addEventListener("click", function () {
        autoPlay = !autoPlay;
        stageTimer = 0;
        update(false);
      });
    }
    function reset() {
      stage = 3;
      agriculture = false;
      straightened = false;
      autoPlay = false;
      stageTimer = 0;
      if (agricultureInput) { agricultureInput.checked = false; }
      if (riverInput) { riverInput.checked = false; }
      update(false);
      base.hideTip();
    }
    update(true);
    base.onUpdate(function (dt, time) {
      if (autoPlay) {
        stageTimer += dt;
        if (stageTimer > 2.7) {
          stageTimer = 0;
          stage = (stage + 1) % 4;
          update(false);
        }
      }
      trees.children.forEach(function (tree, index) {
        var target = tree.userData.target;
        tree.userData.scale = damp(tree.userData.scale, target, 4.2, dt);
        var s = tree.userData.scale;
        tree.scale.setScalar(Math.max(0.001, s));
        tree.visible = s > 0.02;
        tree.rotation.z = Math.sin(time * 0.45 + tree.userData.phase) * 0.012;
        tree.rotation.x = Math.cos(time * 0.36 + tree.userData.phase) * 0.008;
      });
      fieldMeshes.forEach(function (field) {
        field.userData.opacity = damp(field.userData.opacity, field.userData.target, 4.5, dt);
        field.material.opacity = field.userData.opacity;
        field.visible = field.userData.opacity > 0.02;
        field.children.forEach(function (crop) { crop.material.opacity = field.userData.opacity * 0.65; });
      });
      straightMaterial.opacity = damp(straightMaterial.opacity, straightened ? 1 : 0, 5, dt);
      meanderMaterial.opacity = damp(meanderMaterial.opacity, straightened ? 0 : 1, 5, dt);
      riverStraight.visible = straightMaterial.opacity > 0.02;
      riverMeander.visible = meanderMaterial.opacity > 0.02;
      riverStraight.material.emissiveIntensity = 0.09 + Math.sin(time * 1.3) * 0.04;
      riverMeander.material.emissiveIntensity = 0.09 + Math.sin(time * 1.3 + 1) * 0.04;
      birds.children.forEach(function (bird, index) {
        var angle = time * 0.18 + bird.userData.phase;
        var radius = bird.userData.radius;
        bird.position.set(Math.cos(angle) * radius, 5.2 + Math.sin(angle * 1.4 + index) * 0.35, Math.sin(angle) * radius * 0.55 - 1);
        bird.rotation.y = -angle + Math.PI / 2;
        bird.rotation.z = Math.sin(time * 2 + index) * 0.08;
      });
    });
    return { update: update, reset: reset, base: base };
  }

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
