/* Hallmark 3D-Lab common runtime for Biologie 8.
   Shared camera, lighting, raycasting, pinned labels, tooltips and animation loop.
   Works with Three.js r128 and the local OrbitControls build. */
(function () {
  "use strict";

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function damp(current, target, lambda, dt) { return current + (target - current) * (1 - Math.exp(-lambda * dt)); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

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

  function makeRenderer(container) {
    if (!window.THREE) { return null; }
    try {
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0x000000, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.14;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.localClippingEnabled = true;
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

  function standard(color, opts) {
    opts = opts || {};
    var material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: opts.roughness != null ? opts.roughness : 0.56,
      metalness: opts.metalness != null ? opts.metalness : 0.04,
      transparent: Boolean(opts.transparent),
      opacity: opts.opacity != null ? opts.opacity : 1,
      side: opts.side || THREE.FrontSide,
      depthWrite: opts.depthWrite != null ? opts.depthWrite : true,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity != null ? opts.emissiveIntensity : 1,
      vertexColors: Boolean(opts.vertexColors)
    });
    if (opts.clippingPlanes) {
      material.clippingPlanes = opts.clippingPlanes;
      material.clipShadows = true;
    }
    return material;
  }

  function physical(color, opts) {
    opts = opts || {};
    var material = new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: opts.roughness != null ? opts.roughness : 0.22,
      metalness: opts.metalness != null ? opts.metalness : 0,
      transmission: opts.transmission != null ? opts.transmission : 0,
      thickness: opts.thickness != null ? opts.thickness : 0.4,
      ior: opts.ior != null ? opts.ior : 1.4,
      clearcoat: opts.clearcoat != null ? opts.clearcoat : 0.6,
      clearcoatRoughness: opts.clearcoatRoughness != null ? opts.clearcoatRoughness : 0.2,
      transparent: opts.transparent != null ? opts.transparent : true,
      opacity: opts.opacity != null ? opts.opacity : 1,
      side: opts.side || THREE.FrontSide,
      depthWrite: opts.depthWrite != null ? opts.depthWrite : true,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity != null ? opts.emissiveIntensity : 1,
      vertexColors: Boolean(opts.vertexColors)
    });
    if (opts.clippingPlanes) {
      material.clippingPlanes = opts.clippingPlanes;
      material.clipShadows = true;
    }
    return material;
  }

  function basic(color, opts) {
    opts = opts || {};
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: opts.transparent != null ? opts.transparent : false,
      opacity: opts.opacity != null ? opts.opacity : 1,
      wireframe: Boolean(opts.wireframe),
      side: opts.side || THREE.FrontSide,
      depthWrite: opts.depthWrite != null ? opts.depthWrite : true,
      vertexColors: Boolean(opts.vertexColors)
    });
  }

  /* A small custom-shader halo: radial falloff, additive light and a soft pulse.
     Used for retinal transduction and the cochlear travelling-wave crest. */
  function glowMaterial(color, options) {
    options = options || {};
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: options.opacity != null ? options.opacity : 0.8 },
        uTime: { value: 0 },
        uPulse: { value: options.pulse != null ? options.pulse : 0.18 }
      },
      vertexShader: [
        "varying vec2 vUv;",
        "void main() {",
        "  vUv = uv;",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "varying vec2 vUv;",
        "uniform vec3 uColor;",
        "uniform float uOpacity;",
        "uniform float uTime;",
        "uniform float uPulse;",
        "void main() {",
        "  float d = distance(vUv, vec2(0.5));",
        "  float halo = smoothstep(0.5, 0.0, d);",
        "  float ring = smoothstep(0.20, 0.0, abs(d - 0.30));",
        "  float pulse = 0.82 + uPulse * sin(uTime * 3.4);",
        "  float alpha = (halo * halo * 0.75 + ring * 0.55) * uOpacity * pulse;",
        "  gl_FragColor = vec4(uColor, alpha);",
        "}"
      ].join("\n"),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
  }

  function tube(points, radius, material, options) {
    options = options || {};
    var curve = points instanceof THREE.Curve ? points : new THREE.CatmullRomCurve3(points);
    var geometry = new THREE.TubeGeometry(curve, options.segments || 96, radius, options.radialSegments || 8, Boolean(options.closed));
    return new THREE.Mesh(geometry, material);
  }

  function createScene(container, options) {
    options = options || {};
    var renderer = makeRenderer(container);
    if (!renderer) { return null; }
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(options.fov || 36, 1, 0.05, 140);
    var homePosition = new THREE.Vector3().fromArray(options.camera || [7, 4.5, 11]);
    var homeTarget = new THREE.Vector3().fromArray(options.target || [0, 0, 0]);
    camera.position.copy(homePosition);
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.rotateSpeed = 0.62;
    controls.zoomSpeed = 0.82;
    controls.minDistance = options.minDistance != null ? options.minDistance : 3;
    controls.maxDistance = options.maxDistance != null ? options.maxDistance : 30;
    controls.minPolarAngle = options.minPolarAngle != null ? options.minPolarAngle : 0.22;
    controls.maxPolarAngle = options.maxPolarAngle != null ? options.maxPolarAngle : Math.PI / 2 - 0.04;
    controls.target.copy(homeTarget);

    var palette = {
      paper: new THREE.Color(tokenColor("--color-paper-2")),
      paper3: new THREE.Color(tokenColor("--color-paper-3")),
      sheet: new THREE.Color(tokenColor("--color-sheet")),
      ink: new THREE.Color(tokenColor("--color-ink")),
      ink2: new THREE.Color(tokenColor("--color-ink-2")),
      muted: new THREE.Color(tokenColor("--color-muted")),
      accent: new THREE.Color(tokenColor("--color-accent")),
      accent2: new THREE.Color(tokenColor("--color-accent-2")),
      accentDeep: new THREE.Color(tokenColor("--color-accent-deep")),
      water: new THREE.Color(tokenColor("--color-water")),
      error: new THREE.Color(tokenColor("--color-error")),
      success: new THREE.Color(tokenColor("--color-success")),
      rule: new THREE.Color(tokenColor("--color-rule"))
    };
    renderer.setClearColor(palette.paper, 1);

    var hemi = new THREE.HemisphereLight(0xffffff, 0x2d3e32, options.hemi != null ? options.hemi : 0.46);
    hemi.position.set(0, 18, 0);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0xffffff, options.ambient != null ? options.ambient : 0.3));
    var key = new THREE.DirectionalLight(0xfff4e2, options.keyLight != null ? options.keyLight : 1.12);
    key.position.set(8, 14, 10);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 46;
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 3;
    scene.add(key);
    var fill = new THREE.DirectionalLight(palette.muted, options.fillLight != null ? options.fillLight : 0.36);
    fill.position.set(-10, 6, 7);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(palette.accent, options.rimLight != null ? options.rimLight : 0.4);
    rim.position.set(-6, 7, -10);
    scene.add(rim);

    if (options.shadowY != null) {
      var floor = new THREE.Mesh(
        new THREE.PlaneGeometry(44, 44),
        new THREE.ShadowMaterial({ opacity: options.shadowOpacity != null ? options.shadowOpacity : 0.2 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = options.shadowY;
      floor.receiveShadow = true;
      scene.add(floor);
    }

    var state = { paused: false, speed: 1, time: 0, hovered: null, pinsVisible: true };
    var updaters = [];
    var pins = [];
    var clock = new THREE.Clock();
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var visible = true;
    var tween = null;

    var tooltip = document.createElement("div");
    tooltip.className = "scene-tooltip lab-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("aria-hidden", "true");
    tooltip.innerHTML = '<p class="scene-tooltip__title"></p><p class="scene-tooltip__text"></p><span class="scene-tooltip__meta"></span>';
    container.appendChild(tooltip);
    var tipTitle = tooltip.querySelector(".scene-tooltip__title");
    var tipText = tooltip.querySelector(".scene-tooltip__text");
    var tipMeta = tooltip.querySelector(".scene-tooltip__meta");

    var hint = document.createElement("p");
    hint.className = "scene-hint";
    hint.textContent = window.matchMedia && window.matchMedia("(pointer: coarse)").matches
      ? "Ziehen: drehen · Zwei Finger: zoomen"
      : "Ziehen: drehen · Mausrad: zoomen";
    container.appendChild(hint);

    var dock = document.createElement("div");
    dock.className = "scene-ui";
    dock.innerHTML =
      '<div class="scene-ui__group">' +
        '<button class="btn btn--quiet btn--small" type="button" data-lab-pause aria-pressed="false" title="Animation anhalten oder weiterlaufen lassen">Pause</button>' +
        '<span class="scene-ui__speed" role="group" aria-label="Animationsgeschwindigkeit">' +
          '<button class="btn btn--quiet btn--small" type="button" data-lab-speed="0.5" aria-pressed="false" title="Halbe Geschwindigkeit">0,5×</button>' +
          '<button class="btn btn--quiet btn--small" type="button" data-lab-speed="1" aria-pressed="true" title="Normale Geschwindigkeit">1×</button>' +
          '<button class="btn btn--quiet btn--small" type="button" data-lab-speed="2" aria-pressed="false" title="Doppelte Geschwindigkeit">2×</button>' +
        '</span>' +
        '<button class="btn btn--quiet btn--small scene-ui__reset" type="button" data-lab-reset title="Kamera und Modell auf den Ausgangszustand zurücksetzen">Ansicht zurücksetzen</button>' +
      '</div>';
    container.appendChild(dock);
    var pauseButton = dock.querySelector("[data-lab-pause]");
    var speedButtons = Array.prototype.slice.call(dock.querySelectorAll("[data-lab-speed]"));
    var resetButton = dock.querySelector("[data-lab-reset]");
    function setPaused(value) {
      state.paused = Boolean(value);
      pauseButton.textContent = state.paused ? "Weiter" : "Pause";
      pauseButton.setAttribute("aria-pressed", state.paused ? "true" : "false");
    }
    function setSpeed(value) {
      state.speed = Number(value) || 1;
      speedButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", Number(button.dataset.labSpeed) === state.speed ? "true" : "false");
      });
    }
    pauseButton.addEventListener("click", function () { setPaused(!state.paused); });
    speedButtons.forEach(function (button) {
      button.addEventListener("click", function () { setSpeed(Number(button.dataset.labSpeed)); });
    });

    function isVisibleInScene(object) {
      var node = object;
      while (node) {
        if (node.visible === false) { return false; }
        node = node.parent;
      }
      return true;
    }

    function materialStore(root) {
      var list = [];
      root.traverse(function (object) {
        if (!object.isMesh || !object.material) { return; }
        var material = object.material;
        if (!material.userData.labBase) {
          material.userData.labBase = {
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
      materialStore(root).forEach(function (material) {
        if (material.emissive) {
          material.emissive.copy(palette.accent);
          material.emissiveIntensity = 0.55;
        } else if (material.color) {
          material.color.lerp(palette.accent, 0.45);
        }
      });
    }
    function restore(root) {
      root.traverse(function (object) {
        if (!object.isMesh || !object.material) { return; }
        var material = object.material;
        var base = material.userData.labBase;
        if (!base) { return; }
        if (base.color && material.color) { material.color.copy(base.color); }
        if (base.emissive && material.emissive) { material.emissive.copy(base.emissive); }
        material.emissiveIntensity = base.emissiveIntensity;
      });
    }

    function hideTip() {
      if (state.hovered) { restore(state.hovered); }
      state.hovered = null;
      tooltip.classList.remove("is-visible");
      tooltip.setAttribute("aria-hidden", "true");
      renderer.domElement.style.cursor = "";
    }

    function placeTip(clientX, clientY) {
      var rect = container.getBoundingClientRect();
      var x = clientX - rect.left;
      var y = clientY - rect.top;
      var width = tooltip.offsetWidth;
      var height = tooltip.offsetHeight;
      var left = x > rect.width * 0.56 ? x - width - 16 : x + 16;
      var top = y - height - 14;
      if (top < 8) { top = y + 18; }
      tooltip.style.left = clamp(left, 8, Math.max(8, rect.width - width - 8)) + "px";
      tooltip.style.top = clamp(top, 8, Math.max(8, rect.height - height - 8)) + "px";
    }

    function showTip(tip, clientX, clientY) {
      tipTitle.textContent = tip.name;
      tipText.textContent = tip.text;
      tipMeta.textContent = tip.term || "";
      tooltip.classList.add("is-visible");
      tooltip.setAttribute("aria-hidden", "false");
      placeTip(clientX, clientY);
    }

    function addTip(root, tip) {
      root.userData.labTip = tip;
      root.traverse(function (object) {
        if (object.isMesh) {
          object.userData.labTip = tip;
          object.userData.labHoverRoot = root;
        }
        if (object.isLine || object.isPoints) {
          object.userData.labTip = tip;
          object.userData.labHoverRoot = root;
        }
      });
      return root;
    }

    function addPin(root, label, tip, offset) {
      var pin = document.createElement("button");
      pin.type = "button";
      pin.className = "lab-pin is-hidden";
      pin.innerHTML = '<span class="lab-pin__dot" aria-hidden="true"></span><span class="lab-pin__label" aria-hidden="true"></span>';
      pin.querySelector(".lab-pin__label").textContent = label;
      pin.setAttribute("aria-label", label + ": " + tip.text);
      container.appendChild(pin);
      var record = {
        root: root,
        pin: pin,
        tip: tip,
        offset: offset ? new THREE.Vector3(offset[0], offset[1], offset[2]) : new THREE.Vector3()
      };
      function pinShow(event) {
        if (state.hovered) { restore(state.hovered); }
        state.hovered = root;
        highlight(root);
        showTip(tip, event.clientX || pin.getBoundingClientRect().left + 12, event.clientY || pin.getBoundingClientRect().top + 12);
      }
      pin.addEventListener("mouseenter", pinShow);
      pin.addEventListener("focus", function () {
        var rect = pin.getBoundingClientRect();
        pinShow({ clientX: rect.left + rect.width / 2, clientY: rect.top });
      });
      pin.addEventListener("mouseleave", hideTip);
      pin.addEventListener("blur", hideTip);
      pin.addEventListener("click", function (event) {
        event.preventDefault();
        pinShow(event);
      });
      pins.push(record);
      return pin;
    }

    function updatePins() {
      var rect = container.getBoundingClientRect();
      pins.forEach(function (record) {
        if (!state.pinsVisible || !isVisibleInScene(record.root)) {
          record.pin.classList.add("is-hidden");
          return;
        }
        var world = new THREE.Vector3();
        record.root.getWorldPosition(world);
        world.add(record.offset);
        world.project(camera);
        if (world.z < -1 || world.z > 1) {
          record.pin.classList.add("is-hidden");
          return;
        }
        var x = (world.x * 0.5 + 0.5) * rect.width;
        var y = (-world.y * 0.5 + 0.5) * rect.height;
        if (x < -20 || x > rect.width + 20 || y < -20 || y > rect.height + 20) {
          record.pin.classList.add("is-hidden");
          return;
        }
        record.pin.classList.remove("is-hidden");
        record.pin.style.left = x.toFixed(1) + "px";
        record.pin.style.top = y.toFixed(1) + "px";
      });
    }

    function pointerFor(event) {
      var rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    }
    function pick(event) {
      pointerFor(event);
      camera.updateMatrixWorld();
      scene.updateMatrixWorld();
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(scene.children, true);
      for (var i = 0; i < hits.length; i += 1) {
        var hit = hits[i];
        if (isVisibleInScene(hit.object) && hit.object.userData.labTip) {
          return { root: hit.object.userData.labHoverRoot || hit.object, tip: hit.object.userData.labTip };
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
        if (state.hovered) { restore(state.hovered); }
        state.hovered = result.root;
        highlight(result.root);
      }
      renderer.domElement.style.cursor = "pointer";
      showTip(result.tip, event.clientX, event.clientY);
    });
    renderer.domElement.addEventListener("pointerleave", hideTip);
    renderer.domElement.addEventListener("pointerdown", function (event) {
      hint.classList.add("is-quiet");
      if (event.pointerType === "touch") {
        var result = pick(event);
        if (result) {
          if (state.hovered) { restore(state.hovered); }
          state.hovered = result.root;
          highlight(result.root);
          showTip(result.tip, event.clientX, event.clientY);
          window.setTimeout(hideTip, 3200);
        }
      }
    });
    controls.addEventListener("start", function () { hideTip(); hint.classList.add("is-quiet"); });

    function tweenCamera(position, target, duration, onDone) {
      hideTip();
      tween = {
        t: 0,
        duration: duration || 0.9,
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPosition: new THREE.Vector3().fromArray(position),
        toTarget: new THREE.Vector3().fromArray(target),
        onDone: onDone || null
      };
      controls.enabled = false;
    }
    function resetView() {
      if (options.onReset) { options.onReset(); }
      tweenCamera(homePosition.toArray(), homeTarget.toArray(), 0.8);
    }
    if (resetButton) { resetButton.addEventListener("click", resetView); }

    function setPinsVisible(value) {
      state.pinsVisible = Boolean(value);
      pins.forEach(function (record) { record.pin.classList.toggle("is-hidden", !state.pinsVisible); });
    }

    function resize() {
      fit(renderer, camera, container);
      var fallback = container.querySelector(".lab-fallback");
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
      }, { rootMargin: "100px" }).observe(container);
    }

    function frame() {
      var realDt = Math.min(clock.getDelta(), 0.05);
      var active = container.offsetParent !== null;
      if (!state.paused && active) {
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
          var done = tween.onDone;
          tween = null;
          controls.enabled = true;
          if (done) { done(); }
        }
      }
      controls.update();
      if (container.offsetParent !== null) {
        if (renderer.domElement.width <= 1 || renderer.domElement.height <= 1) { resize(); }
        var bounds = container.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var vw = window.innerWidth || document.documentElement.clientWidth;
        var onScreen = bounds.bottom > 0 && bounds.top < vh && bounds.right > 0 && bounds.left < vw;
        if (visible || onScreen) {
          renderer.render(scene, camera);
          updatePins();
        }
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
      onUpdate: function (update) { updaters.push(update); return update; },
      addTip: addTip,
      addPin: addPin,
      setPinsVisible: setPinsVisible,
      hideTip: hideTip,
      tweenCamera: tweenCamera,
      resetView: resetView,
      setPaused: setPaused,
      setSpeed: setSpeed,
      homePosition: homePosition.clone(),
      homeTarget: homeTarget.clone(),
      resize: resize,
      ease: { inOutCubic: easeInOutCubic, outCubic: easeOutCubic, inOutSine: easeInOutSine }
    };
  }

  /* Simple oscilloscope with one or two stacked channels. */
  function createScope(canvas, options) {
    options = options || {};
    var ctx = canvas.getContext("2d");
    var buffer = [];
    var spikes = [];
    var lastSpike = 0;
    function fitCanvas() {
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    function drawGrid(width, height, top, bottom) {
      ctx.save();
      ctx.strokeStyle = "rgba(215,228,208,0.11)";
      ctx.lineWidth = 1;
      for (var i = 0; i <= 6; i += 1) {
        var x = (width / 6) * i;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }
      for (var j = 0; j <= 4; j += 1) {
        var y = top + ((bottom - top) / 4) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    function draw(time, spikeFrequency, amplitude, signalOn) {
      var width = canvas.clientWidth;
      var height = canvas.clientHeight;
      if (!width || !height) { return; }
      ctx.clearRect(0, 0, width, height);
      drawGrid(width, height, 4, height - 4);
      var mid = height * 0.52;
      ctx.strokeStyle = "rgba(232,241,219,0.95)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var x = 0; x <= width; x += 2) {
        var t = x / width;
        var envelope = signalOn ? (0.35 + 0.65 * Math.exp(-Math.pow((t - 0.5) / 0.35, 2))) : 0;
        var y = mid - Math.sin(t * Math.PI * 14 + time * 5.2) * amplitude * 9 * envelope;
        if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
      if (signalOn) {
        var spikeInterval = 1 / Math.max(4, spikeFrequency);
        var cursor = (time * 0.42) % spikeInterval;
        ctx.strokeStyle = "rgba(216,255,138,0.95)";
        ctx.lineWidth = 1.5;
        for (var sx = 20; sx < width - 8; sx += Math.max(18, width / 22)) {
          var spike = (time * 0.42 + sx / width) % spikeInterval;
          if (spike < 0.08) {
            ctx.beginPath();
            ctx.moveTo(sx - 5, mid + 10);
            ctx.lineTo(sx, mid + 10);
            ctx.lineTo(sx + 1.5, mid - 10);
            ctx.lineTo(sx + 3, mid + 13);
            ctx.lineTo(sx + 6, mid);
            ctx.stroke();
          }
        }
      }
    }
    return { draw: draw, fit: fitCanvas };
  }

  window.Lab3D = {
    createScene: createScene,
    createScope: createScope,
    standard: standard,
    physical: physical,
    basic: basic,
    glowMaterial: glowMaterial,
    tube: tube,
    tokenColor: tokenColor,
    clamp: clamp,
    damp: damp,
    easeInOutCubic: easeInOutCubic,
    easeOutCubic: easeOutCubic,
    easeInOutSine: easeInOutSine
  };
})();
