/* Three.js instruments for Biologie 10.
   Every scene is user-controlled, has a still fallback in the markup, and stops when its station is hidden. */
(function () {
  "use strict";

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
  function makeRenderer(container) {
    if (!window.THREE) { return null; }
    try {
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      if ("outputEncoding" in renderer && THREE.sRGBEncoding !== undefined) {
        renderer.outputEncoding = THREE.sRGBEncoding;
      }
      renderer.domElement.className = "scene-canvas";
      renderer.domElement.setAttribute("aria-hidden", "true");
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
  function setup(container, cameraPosition, target, options) {
    var renderer = makeRenderer(container);
    if (!renderer) { return null; }
    var opts = options || {};
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(opts.cameraFov || 36, 1, 0.1, 160);
    camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
    var initialPosition = camera.position.clone();
    var initialTarget = new THREE.Vector3(target[0], target[1], target[2]);
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = reducedMotion() ? 0.22 : 0.08;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.8;
    var initialDistance = initialPosition.distanceTo(initialTarget);
    controls.minDistance = opts.minDistance || Math.max(2.8, initialDistance * 0.36);
    controls.maxDistance = opts.maxDistance || initialDistance * 3.1;
    controls.minPolarAngle = opts.minPolarAngle === undefined ? 0.08 : opts.minPolarAngle;
    controls.maxPolarAngle = opts.maxPolarAngle === undefined ? Math.PI * 0.5 : opts.maxPolarAngle;
    controls.target.copy(initialTarget);
    controls.autoRotate = Boolean(opts.autoRotate);
    controls.autoRotateSpeed = opts.autoRotateSpeed || 0.65;
    if (opts.enhancedLighting) {
      var hemisphere = new THREE.HemisphereLight(0xffffff, tokenColor("--color-paper-3"), 0.58);
      scene.add(hemisphere);
      var ambient = new THREE.AmbientLight(0xffffff, 0.28);
      scene.add(ambient);
      var key = new THREE.DirectionalLight(0xffffff, 0.92);
      key.position.set(opts.keyPosition && opts.keyPosition[0] || 6, opts.keyPosition && opts.keyPosition[1] || 13, opts.keyPosition && opts.keyPosition[2] || 9);
      if (opts.shadows) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        key.castShadow = true;
        key.shadow.mapSize.width = 1024;
        key.shadow.mapSize.height = 1024;
        key.shadow.camera.near = 1;
        key.shadow.camera.far = 40;
        key.shadow.camera.left = -12;
        key.shadow.camera.right = 12;
        key.shadow.camera.top = 12;
        key.shadow.camera.bottom = -12;
        key.shadow.bias = -0.0007;
      }
      scene.add(key);
      var fill = new THREE.DirectionalLight(0xffffff, 0.3);
      fill.position.set(-9, 5, -7);
      scene.add(fill);
      var rim = new THREE.DirectionalLight(0xffffff, 0.18);
      rim.position.set(0, 2, -12);
      scene.add(rim);
    } else {
      scene.add(new THREE.AmbientLight(0xffffff, 0.82));
      var light = new THREE.DirectionalLight(0xffffff, 0.7);
      light.position.set(6, 12, 8);
      scene.add(light);
    }
    var fallback = container.querySelector(".tool__fallback");
    var visible = true;
    var cameraTween = null;
    function resize() {
      fit(renderer, camera, container);
      if (fallback && container.clientWidth > 1 && container.clientHeight > 1) { fallback.hidden = true; }
    }
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(container); } else { window.addEventListener("resize", resize); }
    window.addEventListener("orientationchange", resize);
    resize();
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting; });
      }, { rootMargin: "80px" }).observe(container);
    }
    function resetCamera(duration) {
      var seconds = Math.max(0, (duration === undefined ? 680 : duration) / 1000);
      if (reducedMotion() || seconds === 0) {
        camera.position.copy(initialPosition);
        controls.target.copy(initialTarget);
        controls.update();
        return;
      }
      cameraTween = {
        fromPosition: camera.position.clone(),
        toPosition: initialPosition.clone(),
        fromTarget: controls.target.clone(),
        toTarget: initialTarget.clone(),
        elapsed: 0,
        duration: seconds
      };
      controls.enabled = false;
    }
    function stepCameraTween(delta) {
      if (!cameraTween) { return; }
      cameraTween.elapsed += delta;
      var t = Math.min(1, cameraTween.elapsed / cameraTween.duration);
      var eased = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
      controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
      if (t >= 1) {
        cameraTween = null;
        controls.enabled = true;
      }
    }
    var clock = new THREE.Clock();
    function loop(update) {
      var renderedOnce = false;
      var elapsed = 0;
      function frame() {
        var delta = Math.min(clock.getDelta(), 0.06);
        if (visible && container.offsetParent !== null) {
          ensureCanvasSize(renderer, resize);
          elapsed += delta;
          stepCameraTween(delta);
          if (update) { update(delta, elapsed); }
          controls.update();
          renderer.render(scene, camera);
          renderedOnce = true;
        } else if (!renderedOnce && container.offsetParent !== null && container.clientWidth > 1 && container.clientHeight > 1) {
          ensureCanvasSize(renderer, resize);
          if (update) { update(0, 0); }
          renderer.render(scene, camera);
          renderedOnce = true;
        }
        window.requestAnimationFrame(frame);
      }
      window.requestAnimationFrame(frame);
    }
    return {
      renderer: renderer,
      scene: scene,
      camera: camera,
      controls: controls,
      resize: resize,
      loop: loop,
      resetCamera: resetCamera,
      visible: function () { return visible; }
    };
  }

  /* One shared raycasting and tooltip layer for the interactive 3D instruments.
     targets: [{ object, key, title, text, enter, leave, select }] */
  function installHover(base, targets, options) {
    var opts = options || {};
    var canvas = base.renderer.domElement;
    var raycaster = new THREE.Raycaster();
    var pointer = new THREE.Vector2();
    var allMeshes = [];
    var current = null;
    var down = null;
    targets.forEach(function (target) {
      if (!target.object) { return; }
      target.meshes = [];
      target.object.traverse(function (child) {
        if (child.isMesh) {
          child.userData.__bioTipTarget = target;
          target.meshes.push(child);
          allMeshes.push(child);
        }
      });
    });
    function pick(event) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      raycaster.setFromCamera(pointer, base.camera);
      var hits = raycaster.intersectObjects(allMeshes, false);
      if (!hits.length) { return null; }
      return hits[0].object.userData.__bioTipTarget || null;
    }
    function enter(target, event) {
      current = target;
      canvas.classList.add("is-hovering");
      if (target.enter) { target.enter(); }
      if (window.BioTips) {
        window.BioTips.show(target.title, target.text, event.clientX, event.clientY);
      }
    }
    function leave() {
      if (current) {
        if (current.leave) { current.leave(); }
        current = null;
      }
      canvas.classList.remove("is-hovering");
      if (window.BioTips) { window.BioTips.hide(); }
    }
    function onPointerMove(event) {
      var target = pick(event);
      if (target !== current) {
        leave();
        if (target) { enter(target, event); }
      } else if (current && window.BioTips) {
        window.BioTips.move(event.clientX, event.clientY);
      }
    }
    function onPointerDown(event) {
      down = { x: event.clientX, y: event.clientY, time: Date.now() };
    }
    function onPointerUp(event) {
      if (!down) { return; }
      var distance = Math.abs(event.clientX - down.x) + Math.abs(event.clientY - down.y);
      var duration = Date.now() - down.time;
      down = null;
      if (distance > 7 || duration > 900) { return; }
      var target = pick(event);
      if (!target) { return; }
      if (target.select) { target.select(); }
      else if (opts.onSelect) { opts.onSelect(target); }
    }
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    return {
      refresh: function () {
        allMeshes = [];
        targets.forEach(function (target) {
          target.meshes = [];
          if (!target.object) { return; }
          target.object.traverse(function (child) {
            if (child.isMesh) {
              child.userData.__bioTipTarget = target;
              target.meshes.push(child);
              allMeshes.push(child);
            }
          });
        });
      },
      clear: leave
    };
  }

  function setEmissive(material, color, intensity) {
    if (!material) { return; }
    if (material.emissive) {
      material.emissive.copy(color);
      material.emissiveIntensity = intensity;
    }
  }
  function highlightMaterials(materials, color, intensity) {
    materials.forEach(function (material) { setEmissive(material, color, intensity); });
  }

  function neuronScene(container) {
    var base = setup(container, [2, 3, 14], [2, 0, 0]);
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
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
    var muted = new THREE.Color(tokenColor("--color-muted"));
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
    var paper = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
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

  function microbeScene(container) {
    var base = setup(container, [0, 2.2, 10], [0, 0, 0]);
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper = new THREE.Color(tokenColor("--color-paper"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var bodyMat = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.7, transparent: true, opacity: 0.38, depthWrite: false });
    var wallMat = new THREE.MeshBasicMaterial({ color: muted, wireframe: true, transparent: true, opacity: 0.28 });
    var accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.45 });
    var mutedMat = new THREE.MeshStandardMaterial({ color: muted, roughness: 0.6 });

    var bacterium = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 3.4, 24), bodyMat);
    body.rotation.z = Math.PI / 2;
    bacterium.add(body);
    var capLeft = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14), bodyMat);
    capLeft.position.x = -1.7;
    bacterium.add(capLeft);
    var capRight = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14), bodyMat);
    capRight.position.x = 1.7;
    bacterium.add(capRight);
    var wall = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 3.4, 16), wallMat);
    wall.rotation.z = Math.PI / 2;
    bacterium.add(wall);
    var wallLeft = new THREE.Mesh(new THREE.SphereGeometry(1.24, 12, 8), wallMat);
    wallLeft.position.x = -1.7;
    bacterium.add(wallLeft);
    var wallRight = new THREE.Mesh(new THREE.SphereGeometry(1.24, 12, 8), wallMat);
    wallRight.position.x = 1.7;
    bacterium.add(wallRight);
    var nucleoid = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.1, 64, 8, 2, 3), accentMat);
    nucleoid.rotation.x = Math.PI / 2;
    bacterium.add(nucleoid);
    for (var p = 0; p < 3; p += 1) {
      var plasmid = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 24), accentMat);
      plasmid.position.set(-0.6 + p * 0.6, 0.4 - p * 0.3, 0.2);
      plasmid.rotation.set(p * 0.7, p * 0.5, p * 0.3);
      bacterium.add(plasmid);
    }
    for (var r = 0; r < 14; r += 1) {
      var ribosome = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mutedMat);
      ribosome.position.set(-1.2 + (r % 7) * 0.4, -0.5 + Math.floor(r / 7) * 0.9, 0.4);
      bacterium.add(ribosome);
    }
    var flagPoints = [];
    for (var f = 0; f <= 20; f += 1) {
      var t = f / 20;
      flagPoints.push(new THREE.Vector3(1.9 + t * 2.2, Math.sin(t * Math.PI * 3) * 0.5, Math.cos(t * Math.PI * 2) * 0.3));
    }
    var flagellum = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(flagPoints), 40, 0.06, 6, false), mutedMat);
    bacterium.add(flagellum);
    base.scene.add(bacterium);

    var yeast = new THREE.Group();
    var cell = new THREE.Mesh(new THREE.SphereGeometry(1.8, 32, 24), new THREE.MeshStandardMaterial({ color: paper3, transparent: true, opacity: 0.45, roughness: 0.5, depthWrite: false }));
    yeast.add(cell);
    var cellWall = new THREE.Mesh(new THREE.SphereGeometry(1.85, 20, 14), new THREE.MeshBasicMaterial({ color: muted, wireframe: true, transparent: true, opacity: 0.35 }));
    yeast.add(cellWall);
    var nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), accentMat);
    nucleus.position.set(-0.3, 0.2, 0);
    yeast.add(nucleus);
    var vacuole = new THREE.Mesh(new THREE.SphereGeometry(0.65, 20, 14), new THREE.MeshStandardMaterial({ color: paper, transparent: true, opacity: 0.55, roughness: 0.4 }));
    vacuole.position.set(0.55, -0.3, 0.2);
    yeast.add(vacuole);
    for (var m = 0; m < 3; m += 1) {
      var mitochondrion = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mutedMat);
      mitochondrion.scale.set(1.8, 0.7, 0.7);
      mitochondrion.position.set(-0.8 + m * 0.8, -0.9 + m * 0.2, 0.5 - m * 0.4);
      yeast.add(mitochondrion);
    }
    var bud = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 18), new THREE.MeshStandardMaterial({ color: paper3, transparent: true, opacity: 0.55, roughness: 0.5, depthWrite: false }));
    bud.position.set(1.5, 0.9, 0);
    yeast.add(bud);
    var budNucleus = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10), accentMat);
    budNucleus.position.set(1.5, 0.9, 0);
    yeast.add(budNucleus);
    yeast.visible = false;
    base.scene.add(yeast);

    var readout = figure ? figure.querySelector("[data-microbe-readout]") : null;
    var buttons = figure ? $$("[data-microbe-mode]", figure) : [];
    var modes = {
      bacterium: ["Bakterium", "Prokaryot: Ringchromosom und Plasmide, Zellwand aus Murein, keine Mitochondrien. Geißeln dienen der Fortbewegung."],
      yeast: ["Hefe", "Eukaryot: echter Zellkern, Mitochondrien, Vakuole und Zellwand. Vermehrung durch Knospung."]
    };
    function setMode(key) {
      var entry = modes[key];
      if (!entry) { return; }
      bacterium.visible = key === "bacterium";
      yeast.visible = key === "yeast";
      buttons.forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.microbeMode === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + entry[0] + ".</strong> " + entry[1]; }
    }
    buttons.forEach(function (button) { button.addEventListener("click", function () { setMode(button.dataset.microbeMode); }); });
    setMode("bacterium");
    base.loop(null);
    return { setMode: setMode };
  }

  function insectScene(container) {
    var base = setup(container, [0, 3.2, 11], [0, 0, 0]);
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var bodyMat = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.55, metalness: 0.05 });
    var darkMat = new THREE.MeshStandardMaterial({ color: muted, roughness: 0.6 });
    var eyeMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 });
    var wingMat = new THREE.MeshStandardMaterial({ color: paper3, transparent: true, opacity: 0.35, side: THREE.DoubleSide, roughness: 0.4 });
    var insect = new THREE.Group();
    base.scene.add(insect);

    var head = new THREE.Group();
    head.position.set(-3.2, 0.2, 0);
    insect.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), bodyMat));
    var eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), eyeMat);
    eyeLeft.position.set(-0.45, 0.35, 0.75);
    head.add(eyeLeft);
    var eyeRight = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), eyeMat);
    eyeRight.position.set(-0.45, 0.35, -0.75);
    head.add(eyeRight);
    function antenna(sign) {
      var points = [
        new THREE.Vector3(-0.7, 0.7, sign * 0.25),
        new THREE.Vector3(-1.4, 1.5, sign * 0.7),
        new THREE.Vector3(-2.0, 2.0, sign * 1.1)
      ];
      var mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.06, 6, false), darkMat);
      head.add(mesh);
    }
    antenna(1);
    antenna(-1);
    function mouthpart(sign) {
      var cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 8), darkMat);
      cone.position.set(-0.9, -0.55, sign * 0.22);
      cone.rotation.z = Math.PI / 2;
      head.add(cone);
    }
    mouthpart(1);
    mouthpart(-1);

    var thorax = new THREE.Group();
    insect.add(thorax);
    var thoraxMesh = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 18), bodyMat);
    thoraxMesh.scale.set(1.1, 0.9, 1.0);
    thorax.add(thoraxMesh);

    var legs = new THREE.Group();
    insect.add(legs);
    function limb(start, end, radius) {
      var dir = new THREE.Vector3().subVectors(end, start);
      var mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 8), darkMat);
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      return mesh;
    }
    [-0.8, 0, 0.8].forEach(function (x) {
      [1, -1].forEach(function (sign) {
        var start = new THREE.Vector3(x, -0.75, sign * 0.8);
        var knee = new THREE.Vector3(x + 0.2, -1.8, sign * 1.8);
        var foot = new THREE.Vector3(x + 0.4, -2.6, sign * 2.4);
        legs.add(limb(start, knee, 0.09));
        legs.add(limb(knee, foot, 0.07));
      });
    });

    var wings = new THREE.Group();
    insect.add(wings);
    [1, -1].forEach(function (sign) {
      var wing = new THREE.Mesh(new THREE.CircleGeometry(1.35, 28), wingMat);
      wing.scale.set(1.5, 0.75, 1);
      wing.rotation.x = -Math.PI / 2 + 0.28;
      wing.rotation.z = sign * 0.18;
      wing.position.set(0.2, 1.25, sign * 1.15);
      wings.add(wing);
    });

    var abdomen = new THREE.Group();
    insect.add(abdomen);
    [2.0, 2.8, 3.6, 4.3].forEach(function (x, index) {
      var segment = new THREE.Mesh(new THREE.SphereGeometry(1.0 - index * 0.15, 20, 14), index % 2 === 0 ? bodyMat : darkMat);
      segment.scale.set(1.2, 0.95, 0.95);
      segment.position.set(x, -0.1, 0);
      abdomen.add(segment);
    });

    var highlight = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.16, depthWrite: false }));
    highlight.visible = false;
    base.scene.add(highlight);

    var parts = {
      head: ["Kopf", "Der Kopf trägt die Sinnesorgane: Facettenaugen, Antennen und Mundwerkzeuge.", [-3.2, 0.2, 0], 1.5],
      thorax: ["Thorax", "Der Thorax ist der Bewegungsmittelpunkt. Hier setzen drei Beinpaare und die Flügel an.", [0, 0, 0], 1.9],
      abdomen: ["Abdomen", "Der Abdomen enthält den Großteil der Organe, darunter das Tracheensystem und den Darm.", [3.1, -0.1, 0], 1.9],
      legs: ["Beine", "Drei Beinpaare mit Gelenken und Muskeln. Das Außenskelett aus Chitin gibt Halt und Schutz.", [0, -1.6, 0], 2.8],
      wings: ["Flügel", "Die Flügel sind dünne, chitinhaltige Häute. Sie werden von Muskeln im Thorax bewegt.", [0.2, 1.3, 0], 2.5],
      eyes: ["Facettenaugen", "Facettenaugen bestehen aus vielen Einzelaugen. Sie nehmen Bewegungen und Farben wahr.", [-3.7, 0.55, 0], 1.5]
    };
    var readout = figure ? figure.querySelector("[data-insect-readout]") : null;
    var buttons = figure ? $$("[data-insect-part]", figure) : [];
    function show(key) {
      var entry = parts[key];
      if (!entry) { return; }
      highlight.position.set(entry[2][0], entry[2][1], entry[2][2]);
      highlight.scale.setScalar(entry[3]);
      highlight.visible = true;
      buttons.forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.insectPart === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + entry[0] + ".</strong> " + entry[1]; }
    }
    buttons.forEach(function (button) { button.addEventListener("click", function () { show(button.dataset.insectPart); }); });
    show("head");
    base.loop(null);
    return { show: show };
  }

  function soilScene(container) {
    var base = setup(container, [0, 5, 12], [0, 0, 0]);
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink2 = new THREE.Color(tokenColor("--color-ink-2"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var rule2 = new THREE.Color(tokenColor("--color-rule-2"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var block = new THREE.Group();
    base.scene.add(block);
    function layer(y, height, color) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(8, height, 6), new THREE.MeshStandardMaterial({ color: color, roughness: 0.85 }));
      mesh.position.y = y;
      block.add(mesh);
      return mesh;
    }
    var oLayer = layer(2.3, 0.4, ink2);
    var aLayer = layer(1.7, 0.8, muted);
    var bLayer = layer(0.6, 1.4, paper3);
    var cLayer = layer(-0.6, 1.0, rule2);
    var rLayer = layer(-1.5, 0.8, ink2);
    var grassMat = new THREE.MeshStandardMaterial({ color: muted, roughness: 0.7 });
    for (var gx = -3.6; gx <= 3.6; gx += 0.6) {
      for (var gz = -2.6; gz <= 2.6; gz += 0.9) {
        var blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.55, 4), grassMat);
        blade.position.set(gx + (Math.random() - 0.5) * 0.2, 2.75, gz + (Math.random() - 0.5) * 0.2);
        block.add(blade);
      }
    }
    var rootMat = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.7 });
    [-2.4, -0.8, 0.8, 2.4].forEach(function (x) {
      var points = [
        new THREE.Vector3(x, 2.5, 2.95),
        new THREE.Vector3(x + 0.35, 2.0, 3.0),
        new THREE.Vector3(x - 0.2, 1.4, 3.02),
        new THREE.Vector3(x + 0.15, 0.9, 3.03)
      ];
      block.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 30, 0.045, 6, false), rootMat));
    });
    var wormPoints = [
      new THREE.Vector3(-1.2, 1.65, 3.06),
      new THREE.Vector3(-0.6, 1.5, 3.07),
      new THREE.Vector3(0.2, 1.7, 3.06),
      new THREE.Vector3(1.0, 1.55, 3.07)
    ];
    var worm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wormPoints), 40, 0.09, 8, false), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5 }));
    block.add(worm);
    var organismMat = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.6 });
    [[-2.0, 1.8, 3.08], [-0.2, 1.9, 3.08], [1.8, 1.75, 3.08], [2.6, 1.55, 3.08]].forEach(function (pos) {
      var organism = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), organismMat);
      organism.position.set(pos[0], pos[1], pos[2]);
      block.add(organism);
    });
    var highlight = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1, 6.2), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.14, depthWrite: false }));
    highlight.visible = false;
    base.scene.add(highlight);
    var layers = {
      o: ["O-Horizont", "Streuauflage aus Blättern, Nadeln und abgestorbenen Pflanzenteilen. Hier beginnt der Abbau.", 2.3, 0.45],
      a: ["A-Horizont", "Oberboden mit Humus, Wurzeln und Bodenleben. Hier ist die biologische Aktivität am größten.", 1.7, 0.85],
      b: ["B-Horizont", "Unterboden, in den Ton und Nährstoffe eingewaschen werden. Weniger Humus, weniger Leben.", 0.6, 1.45],
      c: ["C-Horizont", "Verwittertes Ausgangsgestein. Hier beginnt die Bodenbildung.", -0.6, 1.05],
      life: ["Bodenleben", "Bakterien, Pilze, Regenwürmer, Milben und Springschwänze zersetzen Streu, bilden Humus und durchmischen den Boden.", 1.7, 0.85]
    };
    var readout = figure ? figure.querySelector("[data-soil-readout]") : null;
    var buttons = figure ? $$("[data-soil-layer]", figure) : [];
    function show(key) {
      var entry = layers[key];
      if (!entry) { return; }
      highlight.position.set(0, entry[2], 0);
      highlight.scale.y = entry[3];
      highlight.visible = true;
      buttons.forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.soilLayer === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + entry[0] + ".</strong> " + entry[1]; }
    }
    buttons.forEach(function (button) { button.addEventListener("click", function () { show(button.dataset.soilLayer); }); });
    show("o");
    base.loop(null);
    return { show: show };
  }


  function phototropismScene(container) {
    var base = setup(container, [0, 3.25, 13.2], [0, 1.6, 0], {
      minDistance: 8,
      maxDistance: 23,
      maxPolarAngle: Math.PI * 0.48,
      enhancedLighting: true,
      shadows: true,
      keyPosition: [6, 14, 9]
    });
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper = new THREE.Color(tokenColor("--color-paper"));
    var paper2 = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var noEmission = new THREE.Color(0x000000);

    var state = {
      lightOn: false,
      playing: true,
      speed: 1,
      bend: 0,
      time: 0
    };

    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(8.6, 64),
      new THREE.MeshStandardMaterial({ color: paper2, roughness: 0.96 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    base.scene.add(ground);
    var groundRing = new THREE.Mesh(
      new THREE.RingGeometry(7.3, 7.36, 80),
      new THREE.MeshBasicMaterial({ color: muted, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = -0.04;
    base.scene.add(groundRing);

    function makePlant(x, experimental) {
      var group = new THREE.Group();
      group.position.set(x, 0, 0);
      var potMaterial = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.78 });
      var soilMaterial = new THREE.MeshStandardMaterial({ color: ink, roughness: 1 });
      var stemMaterial = new THREE.MeshStandardMaterial({ color: muted, roughness: 0.62 });
      var leafMaterial = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.58, side: THREE.DoubleSide });
      var pot = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.74, 24), potMaterial);
      pot.position.y = 0.37;
      pot.castShadow = true;
      pot.receiveShadow = true;
      group.add(pot);
      var rim = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 24), potMaterial);
      rim.position.y = 0.74;
      rim.castShadow = true;
      group.add(rim);
      var soil = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 24), soilMaterial);
      soil.position.y = 0.75;
      group.add(soil);
      var stemRoot = new THREE.Group();
      stemRoot.position.y = 0.78;
      group.add(stemRoot);
      var segments = [];
      var leaves = [];
      var parent = stemRoot;
      var segmentLength = 0.34;
      var count = 8;
      for (var index = 0; index < count; index += 1) {
        var segment = new THREE.Group();
        if (index > 0) { segment.position.y = segmentLength; }
        var radius = 0.052 - index * 0.0038;
        var stem = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.78, radius, segmentLength, 8), stemMaterial);
        stem.position.y = segmentLength / 2;
        stem.castShadow = true;
        segment.add(stem);
        if (index >= 1 && index <= 6) {
          var side = index % 2 === 0 ? -1 : 1;
          var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), leafMaterial);
          leaf.scale.set(1.55, 0.16, 0.66);
          leaf.position.set(side * 0.29, segmentLength * 0.72, 0);
          leaf.rotation.z = side * 0.52;
          leaf.rotation.y = (index % 3 - 1) * 0.42;
          leaf.castShadow = true;
          leaf.userData.baseRotation = leaf.rotation.z;
          segment.add(leaf);
          leaves.push(leaf);
        }
        parent.add(segment);
        parent = segment;
        segments.push(segment);
      }
      var bud = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), leafMaterial);
      bud.position.y = segmentLength;
      bud.castShadow = true;
      parent.add(bud);
      var materials = [potMaterial, soilMaterial, stemMaterial, leafMaterial];
      base.scene.add(group);
      return {
        group: group,
        segments: segments,
        leaves: leaves,
        materials: materials,
        experimental: experimental
      };
    }

    var experimentalPlant = makePlant(-2.6, true);
    var controlPlant = makePlant(2.6, false);

    function makeCone(from, to, radius, color) {
      var direction = new THREE.Vector3().subVectors(from, to);
      var material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.055,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      var mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, direction.length(), 28, 1, true), material);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      mesh.renderOrder = 2;
      base.scene.add(mesh);
      return mesh;
    }

    function makeSideLamp() {
      var group = new THREE.Group();
      group.position.set(-5.15, 0, 1.15);
      var metal = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.55, metalness: 0.12 });
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 3.65, 10), metal);
      pole.position.y = 1.83;
      pole.castShadow = true;
      group.add(pole);
      var basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.68, 0.14, 24), metal);
      basePlate.position.y = 0.07;
      basePlate.castShadow = true;
      group.add(basePlate);
      var arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.075, 0.075), metal);
      arm.position.set(0.48, 3.62, 0);
      arm.castShadow = true;
      group.add(arm);
      var head = new THREE.Group();
      head.position.set(0.98, 3.44, 0);
      group.add(head);
      var shadeMaterial = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.5, side: THREE.DoubleSide });
      var shade = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.5, 24, 1, true), shadeMaterial);
      shade.rotation.z = Math.PI;
      shade.castShadow = true;
      head.add(shade);
      var bulbMaterial = new THREE.MeshBasicMaterial({ color: muted });
      var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), bulbMaterial);
      bulb.position.y = -0.27;
      head.add(bulb);
      var point = new THREE.PointLight(0xfff3df, 0.0, 9, 2);
      point.position.set(0.98, 3.16, 0);
      group.add(point);
      base.scene.add(group);
      return {
        group: group,
        shadeMaterial: shadeMaterial,
        bulbMaterial: bulbMaterial,
        bulb: bulb,
        light: point,
        cone: makeCone(new THREE.Vector3(-4.17, 3.38, 1.15), new THREE.Vector3(-2.6, 2.45, 0), 1.4, accent)
      };
    }

    function makeTopLamp() {
      var group = new THREE.Group();
      group.position.set(2.6, 0, 0);
      var metal = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.55, metalness: 0.12 });
      var cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.3, 6), metal);
      cord.position.y = 4.85;
      group.add(cord);
      var head = new THREE.Group();
      head.position.y = 4.2;
      group.add(head);
      var shadeMaterial = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.5, side: THREE.DoubleSide });
      var shade = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.55, 28, 1, true), shadeMaterial);
      shade.castShadow = true;
      head.add(shade);
      var bulbMaterial = new THREE.MeshBasicMaterial({ color: accent });
      var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), bulbMaterial);
      bulb.position.y = -0.25;
      head.add(bulb);
      var point = new THREE.PointLight(0xfff8ee, 0.65, 8, 2);
      point.position.set(0, 3.85, 0);
      group.add(point);
      base.scene.add(group);
      return {
        group: group,
        shadeMaterial: shadeMaterial,
        bulbMaterial: bulbMaterial,
        bulb: bulb,
        light: point,
        cone: makeCone(new THREE.Vector3(2.6, 3.88, 0), new THREE.Vector3(2.6, 1.9, 0), 1.05, paper3)
      };
    }

    var sideLamp = makeSideLamp();
    var topLamp = makeTopLamp();
    topLamp.cone.material.color.copy(paper3);

    var rulerMaterial = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.5, metalness: 0.08 });
    var ruler = new THREE.Group();
    ruler.position.set(0.05, 0, -1.35);
    var rulerBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.1, 0.12), rulerMaterial);
    rulerBody.position.y = 1.55;
    rulerBody.castShadow = true;
    ruler.add(rulerBody);
    for (var tick = 0; tick <= 15; tick += 1) {
      var mark = new THREE.Mesh(
        new THREE.BoxGeometry(tick % 5 === 0 ? 0.46 : 0.26, 0.035, 0.16),
        new THREE.MeshBasicMaterial({ color: tick % 5 === 0 ? ink : muted })
      );
      mark.position.set(0, 0.2 + tick * 0.19, 0);
      ruler.add(mark);
    }
    var rulerTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.24), new THREE.MeshBasicMaterial({ color: accent }));
    rulerTop.position.y = 3.16;
    ruler.add(rulerTop);
    base.scene.add(ruler);

    var particlesGeometry = new THREE.BufferGeometry();
    var particlePositions = [];
    for (var particle = 0; particle < 70; particle += 1) {
      particlePositions.push((Math.random() - 0.5) * 12, Math.random() * 4.8, (Math.random() - 0.5) * 7);
    }
    particlesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    var particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({ color: accent, size: 0.032, transparent: true, opacity: 0.38, depthWrite: false })
    );
    base.scene.add(particles);

    var readout = figure ? figure.querySelector("[data-photo-readout]") : null;
    function say(html) { if (readout) { readout.innerHTML = html; } }

    function setPlantHighlight(plant, active) {
      highlightMaterials(plant.materials, active ? accent : noEmission, active ? 0.22 : 0);
    }
    function setLampHighlight(lamp, active) {
      setEmissive(lamp.shadeMaterial, active ? accent : noEmission, active ? 0.25 : 0);
      lamp.bulb.scale.setScalar(active ? 1.28 : 1);
    }
    function setRulerHighlight(active) {
      setEmissive(rulerMaterial, active ? accent : noEmission, active ? 0.24 : 0);
    }

    var hover = installHover(base, [
      {
        object: experimentalPlant.group,
        key: "experimental",
        title: "Versuchsgruppe",
        text: "Sie bekommt seitliches Licht. Die Pflanze wächst in Richtung der Lichtquelle. Das ist Phototropismus.",
        enter: function () { setPlantHighlight(experimentalPlant, true); },
        leave: function () { setPlantHighlight(experimentalPlant, false); },
        select: function () {
          say("<strong>Versuchsgruppe.</strong> Hier veränderst du die Lichtrichtung. Die Biegung zum Licht ist die beobachtete Reaktion.");
        }
      },
      {
        object: controlPlant.group,
        key: "control",
        title: "Kontrollgruppe",
        text: "Sie bekommt Licht von oben. Alle anderen Bedingungen bleiben gleich. So siehst du, was ohne die seitliche Lichtquelle passiert.",
        enter: function () { setPlantHighlight(controlPlant, true); },
        leave: function () { setPlantHighlight(controlPlant, false); },
        select: function () {
          say("<strong>Kontrollgruppe.</strong> Sie wird gleich behandelt, bekommt aber kein seitliches Licht. Der Vergleich macht den Effekt eindeutig.");
        }
      },
      {
        object: sideLamp.group,
        key: "side-lamp",
        title: "Seitliche Lichtquelle",
        text: "Ihre Richtung ist die unabhängige Variable. Du kannst sie ein- und ausschalten und die Reaktion der Versuchsgruppe beobachten.",
        enter: function () { setLampHighlight(sideLamp, true); },
        leave: function () { setLampHighlight(sideLamp, false); },
        select: function () { toggleLight(); }
      },
      {
        object: topLamp.group,
        key: "top-lamp",
        title: "Licht von oben",
        text: "Diese Bedingung bleibt in der Kontrollgruppe gleich. Sie liefert den Vergleichswert für die Versuchsgruppe.",
        enter: function () { setLampHighlight(topLamp, true); },
        leave: function () { setLampHighlight(topLamp, false); },
        select: function () {
          say("<strong>Kontrollbedingung.</strong> Licht von oben bleibt gleich. Nur die Lichtrichtung der Versuchsgruppe wird verändert.");
        }
      },
      {
        object: ruler,
        key: "ruler",
        title: "Messlatte",
        text: "Die Höhe wird in Zentimetern gemessen. Sie ist die abhängige Variable, weil sie auf die Lichtrichtung reagieren kann.",
        enter: function () { setRulerHighlight(true); },
        leave: function () { setRulerHighlight(false); },
        select: function () {
          say("<strong>Messlatte.</strong> Die Pflanzenhöhe ist messbar. Eine Beobachtung wird erst durch eine geeignete Messgröße überprüfbar.");
        }
      }
    ]);

    var lightButton = figure ? figure.querySelector("[data-photo-light]") : null;
    var playButton = figure ? figure.querySelector("[data-photo-play]") : null;
    var resetButton = figure ? figure.querySelector("[data-photo-reset]") : null;
    var statusNode = figure ? figure.querySelector("[data-photo-status]") : null;
    var speedButtons = figure ? $$("[data-photo-speed]", figure) : [];

    function syncControls() {
      if (lightButton) {
        lightButton.setAttribute("aria-pressed", state.lightOn ? "true" : "false");
        lightButton.textContent = state.lightOn ? "Seitliches Licht ausschalten" : "Seitliches Licht einschalten";
      }
      if (playButton) {
        playButton.textContent = state.playing ? "Pause" : "Weiter";
      }
      if (statusNode) {
        statusNode.textContent = state.playing ? "Animation läuft" : "Animation pausiert";
        statusNode.setAttribute("data-state", state.playing ? "running" : "paused");
      }
      speedButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", Number(button.dataset.photoSpeed) === state.speed ? "true" : "false");
      });
    }

    function toggleLight() {
      state.lightOn = !state.lightOn;
      syncControls();
      if (state.lightOn) {
        say("<strong>Seitliches Licht an.</strong> Die Versuchsgruppe wächst in Richtung Lichtquelle. Die Kontrollgruppe bleibt aufrecht. Die Lichtrichtung ist die unabhängige Variable.");
      } else {
        say("<strong>Seitliches Licht aus.</strong> Die Versuchsgruppe richtet sich wieder auf. Ohne den seitlichen Reiz fehlt die typische Biegung.");
      }
    }

    if (lightButton) { lightButton.addEventListener("click", toggleLight); }
    if (playButton) {
      playButton.addEventListener("click", function () {
        state.playing = !state.playing;
        syncControls();
        say(state.playing ? "<strong>Weiter.</strong> Die Animation läuft mit der gewählten Geschwindigkeit." : "<strong>Pause.</strong> Die Kamera lässt sich weiterhin drehen; die Pflanzen stehen still.");
      });
    }
    speedButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        state.speed = Number(button.dataset.photoSpeed) || 1;
        syncControls();
        say("<strong>Tempo " + String(state.speed).replace(".", ",") + "×.</strong> Die Biegung und die Lichtbewegung laufen entsprechend schneller oder langsamer.");
      });
    });
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        state.lightOn = false;
        state.playing = true;
        state.speed = 1;
        state.bend = 0;
        syncControls();
        if (hover) { hover.clear(); }
        base.resetCamera(680);
        say("<strong>Ansicht zurückgesetzt.</strong> Die Pflanzen stehen wieder aufrecht. Schalte die seitliche Lichtquelle ein, um den Versuch erneut zu starten.");
      });
    }

    function applyPlant(plant, experimental) {
      var bend = experimental ? state.bend : 0;
      plant.segments.forEach(function (segment, index) {
        var angle = experimental ? bend * (0.055 + index * 0.0115) : 0;
        angle += Math.sin(state.time * 0.9 + index * 0.42) * (state.playing ? 0.005 : 0);
        segment.rotation.z = angle;
      });
      plant.leaves.forEach(function (leaf, index) {
        leaf.rotation.z = leaf.userData.baseRotation + Math.sin(state.time * 1.25 + index * 0.7) * (state.playing ? 0.025 : 0);
      });
    }

    syncControls();
    say("<strong>Start.</strong> Die Kontrollgruppe bekommt Licht von oben. Schalte die seitliche Lichtquelle ein und beobachte, ob sich die Versuchsgruppe zum Licht neigt.");

    base.loop(function (delta) {
      if (state.playing) {
        state.time += delta * state.speed;
      }
      if (state.playing) {
        var targetBend = state.lightOn ? 1 : 0;
        state.bend += (targetBend - state.bend) * (1 - Math.exp(-delta * state.speed * 2.6));
      }
      applyPlant(experimentalPlant, true);
      applyPlant(controlPlant, false);
      var pulse = state.playing ? 0.5 + Math.sin(state.time * 2.8) * 0.5 : 0.5;
      sideLamp.light.intensity = state.lightOn ? 0.55 + pulse * 0.18 : 0;
      sideLamp.cone.visible = state.lightOn;
      if (state.lightOn) {
        sideLamp.cone.material.opacity = 0.045 + pulse * 0.025;
        sideLamp.bulbMaterial.color.copy(accent);
        sideLamp.bulb.scale.setScalar(1 + pulse * 0.05);
      } else {
        sideLamp.bulbMaterial.color.copy(muted);
        sideLamp.bulb.scale.setScalar(1);
      }
      topLamp.light.intensity = 0.5 + pulse * 0.12;
      topLamp.cone.material.opacity = 0.035 + pulse * 0.02;
      topLamp.bulb.scale.setScalar(1 + pulse * 0.04);
      if (state.playing) {
        particles.rotation.y += delta * 0.015 * state.speed;
      }
      particles.position.y = Math.sin(state.time * 0.4) * 0.06;
    });

    return {
      toggleLight: toggleLight,
      reset: function () { if (resetButton) { resetButton.click(); } }
    };
  }

  function virusScene(container) {
    var base = setup(container, [0, 3.1, 12.4], [0, -0.25, 0], {
      minDistance: 6.5,
      maxDistance: 22,
      maxPolarAngle: Math.PI * 0.53,
      enhancedLighting: true,
      shadows: true,
      keyPosition: [5, 13, 9]
    });
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper = new THREE.Color(tokenColor("--color-paper"));
    var paper2 = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var noEmission = new THREE.Color(0x000000);

    var state = {
      selected: "capsid",
      hovered: null,
      playing: true,
      speed: 1,
      time: 0
    };

    var membraneGeometry = new THREE.RingGeometry(0.012, 4.9, 96, 24);
    membraneGeometry.rotateX(-Math.PI / 2);
    var membranePositions = membraneGeometry.attributes.position;
    for (var vertex = 0; vertex < membranePositions.count; vertex += 1) {
      var vx = membranePositions.getX(vertex);
      var vz = membranePositions.getZ(vertex);
      var radius = Math.sqrt(vx * vx + vz * vz);
      membranePositions.setY(vertex, -3.35 + Math.pow(radius / 4.9, 2) * 0.6);
    }
    membranePositions.needsUpdate = true;
    membraneGeometry.computeVertexNormals();
    var membraneMaterial = new THREE.MeshStandardMaterial({
      color: paper3,
      roughness: 0.92,
      metalness: 0.02,
      side: THREE.DoubleSide
    });
    var membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
    membrane.receiveShadow = true;
    base.scene.add(membrane);

    var rim = new THREE.Mesh(
      new THREE.TorusGeometry(4.9, 0.055, 8, 96),
      new THREE.MeshBasicMaterial({ color: muted, transparent: true, opacity: 0.48 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -2.75;
    base.scene.add(rim);

    function membraneHeight(x, z) {
      var r = Math.sqrt(x * x + z * z);
      return -3.35 + Math.pow(r / 4.9, 2) * 0.6;
    }

    var receptors = new THREE.Group();
    base.scene.add(receptors);
    var receptorMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.48 });
    for (var receptorIndex = 0; receptorIndex < 14; receptorIndex += 1) {
      var receptorAngle = (receptorIndex / 14) * Math.PI * 2 + 0.18;
      var receptorRadius = 1.0 + (receptorIndex % 4) * 0.48;
      var receptorX = Math.cos(receptorAngle) * receptorRadius;
      var receptorZ = Math.sin(receptorAngle) * receptorRadius;
      var receptorY = membraneHeight(receptorX, receptorZ);
      var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.34, 7), receptorMaterial);
      stem.position.set(receptorX, receptorY + 0.17, receptorZ);
      stem.castShadow = true;
      receptors.add(stem);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), receptorMaterial);
      head.position.set(receptorX, receptorY + 0.36, receptorZ);
      head.castShadow = true;
      receptors.add(head);
    }

    var virus = new THREE.Group();
    virus.position.y = 0.08;
    base.scene.add(virus);
    var virusShell = new THREE.Group();
    virus.add(virusShell);

    var capsidMat = new THREE.MeshStandardMaterial({
      color: paper,
      roughness: 0.42,
      metalness: 0.04,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    var genomeMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.38, metalness: 0.05 });
    var spikeMat = new THREE.MeshStandardMaterial({ color: muted, roughness: 0.46, metalness: 0.08 });
    var wireMaterial = new THREE.MeshBasicMaterial({ color: muted, wireframe: true, transparent: true, opacity: 0.28 });
    var capsid = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 2), capsidMat);
    capsid.castShadow = false;
    virusShell.add(capsid);
    var capsidWire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.225, 1), wireMaterial);
    virusShell.add(capsidWire);
    var genome = new THREE.Mesh(new THREE.TorusKnotGeometry(0.82, 0.145, 96, 10, 2, 3), genomeMat);
    genome.rotation.x = Math.PI / 2;
    genome.castShadow = true;
    virusShell.add(genome);
    var spikes = new THREE.Group();
    virusShell.add(spikes);
    var directions = [];
    for (var i = 0; i < 22; i += 1) {
      var phi = Math.acos(1 - 2 * (i + 0.5) / 22);
      var theta = Math.PI * (1 + Math.sqrt(5)) * i;
      directions.push(new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)));
    }
    var spikeProxyMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false
    });
    directions.forEach(function (direction) {
      var spike = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.72, 8), spikeMat);
      spike.position.copy(direction.clone().multiplyScalar(2.54));
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      spike.castShadow = true;
      spikes.add(spike);
      var proxy = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), spikeProxyMaterial);
      proxy.position.copy(direction.clone().multiplyScalar(2.78));
      spikes.add(proxy);
    });

    var particleGeometry = new THREE.BufferGeometry();
    var particlePositions = [];
    for (var particle = 0; particle < 46; particle += 1) {
      particlePositions.push((Math.random() - 0.5) * 12, (Math.random() - 0.2) * 7, (Math.random() - 0.5) * 9);
    }
    particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    var particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: accent, size: 0.045, transparent: true, opacity: 0.42, depthWrite: false })
    );
    base.scene.add(particles);

    var parts = {
      capsid: ["Kapsid", "Die Proteinhülle schützt das virale Genom und bestimmt die Form des Virus. Sie ist kein Lebewesen und hat keinen eigenen Stoffwechsel."],
      genome: ["Genom", "Das Erbmaterial enthält die Bauanleitung für neue Viren. Es kann aus DNA oder RNA bestehen und wird in der Wirtszelle vervielfältigt."],
      spikes: ["Spikes", "Oberflächenproteine binden an Rezeptoren der Wirtszelle. Sie bestimmen, welche Zellen befallen werden – das ist die Wirtsspezifität."],
      cell: ["Wirtszelle", "Die Membran trägt Rezeptoren. Nur Viren mit passenden Oberflächenproteinen können andocken. Diese Passung ist die Grundlage der Wirtsspezifität."]
    };
    var readout = figure ? figure.querySelector("[data-virus-readout]") : null;
    var buttons = figure ? $$("[data-virus-part]", figure) : [];
    var playButton = figure ? figure.querySelector("[data-virus-play]") : null;
    var resetButton = figure ? figure.querySelector("[data-virus-reset]") : null;
    var statusNode = figure ? figure.querySelector("[data-virus-status]") : null;
    var speedButtons = figure ? $$("[data-virus-speed]", figure) : [];

    function say(html) { if (readout) { readout.innerHTML = html; } }

    function clearHighlights() {
      setEmissive(capsidMat, noEmission, 0);
      setEmissive(genomeMat, noEmission, 0);
      setEmissive(spikeMat, noEmission, 0);
      setEmissive(membraneMaterial, noEmission, 0);
      setEmissive(receptorMaterial, noEmission, 0);
      capsid.scale.setScalar(1);
      genome.scale.setScalar(1);
      spikes.scale.setScalar(1);
      capsuleOpacity(state.selected === "genome" ? 0.18 : 0.38);
    }
    function capsuleOpacity(value) {
      capsidMat.opacity = value;
      wireMaterial.opacity = value < 0.3 ? 0.16 : 0.28;
    }
    function applySelection() {
      clearHighlights();
      capsidMat.color.copy(paper);
      genomeMat.color.copy(accent);
      spikeMat.color.copy(muted);
      if (state.selected === "capsid") {
        capsidMat.color.copy(accent);
        capsidMat.opacity = 0.52;
        capsid.scale.setScalar(1.025);
        wireMaterial.opacity = 0.46;
      } else if (state.selected === "genome") {
        capsidMat.color.copy(paper);
        capsidMat.opacity = 0.17;
        genome.scale.setScalar(1.18);
        wireMaterial.opacity = 0.16;
      } else if (state.selected === "spikes") {
        spikeMat.color.copy(accent);
        spikes.scale.setScalar(1.04);
      } else if (state.selected === "cell") {
        setEmissive(membraneMaterial, accent, 0.18);
        setEmissive(receptorMaterial, accent, 0.26);
      } else {
        capsidMat.color.copy(paper);
        spikeMat.color.copy(muted);
        genomeMat.color.copy(accent);
      }
      if (state.hovered === "capsid") { setEmissive(capsidMat, accent, 0.26); }
      if (state.hovered === "genome") { setEmissive(genomeMat, accent, 0.3); }
      if (state.hovered === "spikes") { setEmissive(spikeMat, accent, 0.3); }
      if (state.hovered === "membrane") { setEmissive(membraneMaterial, accent, 0.16); }
      if (state.hovered === "receptors") { setEmissive(receptorMaterial, accent, 0.3); }
      capsid.raycast = state.selected === "genome" ? function () {} : THREE.Mesh.prototype.raycast;
      capsidWire.raycast = state.selected === "genome" ? function () {} : THREE.Mesh.prototype.raycast;
    }

    function show(key) {
      var entry = parts[key];
      if (!entry) { return; }
      state.selected = key;
      applySelection();
      buttons.forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.virusPart === key ? "true" : "false"); });
      say("<strong>" + entry[0] + ".</strong> " + entry[1]);
    }

    buttons.forEach(function (button) { button.addEventListener("click", function () { show(button.dataset.virusPart); }); });

    var hover = installHover(base, [
      {
        object: capsid,
        key: "capsid",
        title: "Kapsid",
        text: parts.capsid[1],
        enter: function () { state.hovered = "capsid"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("capsid"); }
      },
      {
        object: genome,
        key: "genome",
        title: "Genom",
        text: parts.genome[1],
        enter: function () { state.hovered = "genome"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("genome"); }
      },
      {
        object: spikes,
        key: "spikes",
        title: "Spikes",
        text: parts.spikes[1],
        enter: function () { state.hovered = "spikes"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("spikes"); }
      },
      {
        object: membrane,
        key: "membrane",
        title: "Wirtszelle",
        text: "Die Membran trägt Rezeptoren. Nur Viren mit passenden Oberflächenproteinen können andocken. Das erklärt die Wirtsspezifität.",
        enter: function () { state.hovered = "membrane"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("cell"); }
      },
      {
        object: receptors,
        key: "receptors",
        title: "Rezeptoren",
        text: "Rezeptoren sind Erkennungsstrukturen auf der Wirtszelle. Passen die Spikes, kann das Virus eindringen; sonst bleibt es außen.",
        enter: function () { state.hovered = "receptors"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("cell"); }
      }
    ]);

    function syncControls() {
      if (playButton) { playButton.textContent = state.playing ? "Pause" : "Weiter"; }
      if (statusNode) {
        statusNode.textContent = state.playing ? "Rotation läuft" : "Rotation pausiert";
        statusNode.setAttribute("data-state", state.playing ? "running" : "paused");
      }
      speedButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", Number(button.dataset.virusSpeed) === state.speed ? "true" : "false");
      });
    }
    if (playButton) {
      playButton.addEventListener("click", function () {
        state.playing = !state.playing;
        syncControls();
        say(state.playing ? "<strong>Weiter.</strong> Das Virus dreht sich langsam. Du kannst die Kamera weiterhin frei bewegen." : "<strong>Pause.</strong> Die Rotation steht still; die Kamera bleibt bedienbar.");
      });
    }
    speedButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        state.speed = Number(button.dataset.virusSpeed) || 1;
        syncControls();
        say("<strong>Tempo " + String(state.speed).replace(".", ",") + "×.</strong> Die Rotation und die innere Bewegung passen sich an.");
      });
    });
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        state.selected = "capsid";
        state.hovered = null;
        state.playing = true;
        state.speed = 1;
        state.time = 0;
        virus.rotation.set(0, 0, 0);
        virusShell.rotation.set(0, 0, 0);
        genome.rotation.set(Math.PI / 2, 0, 0);
        if (hover) { hover.clear(); }
        base.resetCamera(720);
        applySelection();
        syncControls();
        buttons.forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.virusPart === "capsid" ? "true" : "false"); });
        say("<strong>Ansicht zurückgesetzt.</strong> Wähle ein Bauteil oder fahre mit dem Zeiger über das Modell, um seine Funktion zu lesen.");
      });
    }

    applySelection();
    syncControls();
    say("<strong>Kapsid ausgewählt.</strong> " + parts.capsid[1] + " Fahre mit dem Zeiger über ein anderes Bauteil oder klicke es an.");

    base.loop(function (delta) {
      if (state.playing) {
        state.time += delta * state.speed;
        virus.rotation.y += delta * state.speed * 0.16;
        virusShell.rotation.y += delta * state.speed * 0.08;
        capsidWire.rotation.y -= delta * state.speed * 0.18;
        genome.rotation.z += delta * state.speed * 0.35;
        spikes.rotation.y = Math.sin(state.time * 0.55) * 0.05;
      }
      virus.position.y = 0.08 + Math.sin(state.time * 0.85) * 0.075;
      if (state.playing) {
        particles.rotation.y += delta * 0.012 * state.speed;
      }
      particles.position.y = Math.sin(state.time * 0.35) * 0.04;
    });

    return { show: show };
  }


  function heartScene(container) {
    var base = setup(container, [0, 3.55, 11.8], [0, 0.05, 0], {
      minDistance: 6.4,
      maxDistance: 21,
      maxPolarAngle: Math.PI * 0.5,
      enhancedLighting: true,
      shadows: true,
      keyPosition: [6, 14, 9]
    });
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper = new THREE.Color(tokenColor("--color-paper"));
    var paper2 = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var noEmission = new THREE.Color(0x000000);

    var state = {
      selected: "right-atrium",
      hovered: null,
      playing: true,
      autoBeat: true,
      bloodFlow: true,
      speed: 1,
      time: 0,
      manual: 0,
      phase: "Diastole"
    };

    var platform = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.4, 0.14, 64),
      new THREE.MeshStandardMaterial({ color: paper2, roughness: 0.94 })
    );
    platform.position.y = -3.12;
    platform.receiveShadow = true;
    base.scene.add(platform);
    var platformRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.22, 0.045, 8, 96),
      new THREE.MeshBasicMaterial({ color: muted, transparent: true, opacity: 0.45 })
    );
    platformRing.rotation.x = Math.PI / 2;
    platformRing.position.y = -3.03;
    base.scene.add(platformRing);

    var myocardiumMat = new THREE.MeshStandardMaterial({ color: paper, roughness: 0.62 });
    var vesselMat = new THREE.MeshStandardMaterial({ color: muted, roughness: 0.48 });
    var valveMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4 });
    var septumMat = new THREE.MeshStandardMaterial({ color: muted, roughness: 0.58 });
    var heart = new THREE.Group();
    base.scene.add(heart);

    function partMaterial(material) { return material.clone(); }
    function makeCast(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

    var rightAtrium = new THREE.Group();
    rightAtrium.position.set(-1.12, 1.5, 0);
    var raMat = partMaterial(myocardiumMat);
    rightAtrium.add(makeCast(new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 20), raMat)));
    heart.add(rightAtrium);

    var leftAtrium = new THREE.Group();
    leftAtrium.position.set(1.12, 1.5, 0);
    var laMat = partMaterial(myocardiumMat);
    leftAtrium.add(makeCast(new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 20), laMat)));
    heart.add(leftAtrium);

    var rightVentricle = new THREE.Group();
    rightVentricle.position.set(-1.02, -0.92, 0);
    var rvMat = partMaterial(myocardiumMat);
    var rvMesh = makeCast(new THREE.Mesh(new THREE.SphereGeometry(1.18, 32, 24), rvMat));
    rvMesh.scale.set(1, 1.25, 1);
    rightVentricle.add(rvMesh);
    heart.add(rightVentricle);

    var leftVentricle = new THREE.Group();
    leftVentricle.position.set(1.05, -0.98, 0);
    var lvMat = partMaterial(myocardiumMat);
    var lvMesh = makeCast(new THREE.Mesh(new THREE.SphereGeometry(1.32, 32, 24), lvMat));
    lvMesh.scale.set(1, 1.3, 1);
    leftVentricle.add(lvMesh);
    heart.add(leftVentricle);

    var septum = makeCast(new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.52, 1.32), septumMat));
    septum.position.set(0, -0.6, 0);
    heart.add(septum);

    var valves = new THREE.Group();
    var valveLeft = makeCast(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 10, 24), valveMat));
    valveLeft.rotation.x = Math.PI / 2;
    valveLeft.position.set(-1.12, 0.22, 0);
    valves.add(valveLeft);
    var valveRight = makeCast(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 10, 24), valveMat));
    valveRight.rotation.x = Math.PI / 2;
    valveRight.position.set(1.15, 0.22, 0);
    valves.add(valveRight);
    heart.add(valves);

    var aortaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.2, 0.1, 0),
      new THREE.Vector3(1.2, 1.8, 0),
      new THREE.Vector3(0.9, 2.7, 0),
      new THREE.Vector3(0.2, 3.0, 0),
      new THREE.Vector3(-0.5, 2.6, 0)
    ]);
    var aorta = new THREE.Group();
    var aortaMesh = makeCast(new THREE.Mesh(new THREE.TubeGeometry(aortaCurve, 48, 0.28, 12, false), vesselMat.clone()));
    aortaMesh.material.color.copy(paper3);
    aorta.add(aortaMesh);
    heart.add(aorta);

    var pulmonaryCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.0, 0.2, 0),
      new THREE.Vector3(-1.0, 1.7, 0),
      new THREE.Vector3(-0.6, 2.5, 0),
      new THREE.Vector3(0.1, 2.7, 0)
    ]);
    var pulmonary = new THREE.Group();
    var pulmMesh = makeCast(new THREE.Mesh(new THREE.TubeGeometry(pulmonaryCurve, 36, 0.22, 12, false), vesselMat.clone()));
    pulmMesh.material.color.copy(ink);
    pulmonary.add(pulmMesh);
    heart.add(pulmonary);

    var bloodFlow = new THREE.Group();
    base.scene.add(bloodFlow);
    var arterialParticles = [];
    var venousParticles = [];
    var arterialMaterial = new THREE.MeshBasicMaterial({ color: accent });
    var venousMaterial = new THREE.MeshBasicMaterial({ color: ink });
    for (var flowIndex = 0; flowIndex < 6; flowIndex += 1) {
      var arterial = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), arterialMaterial);
      arterial.userData.offset = flowIndex / 6;
      bloodFlow.add(arterial);
      arterialParticles.push(arterial);
      var venous = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 6), venousMaterial);
      venous.userData.offset = flowIndex / 6;
      bloodFlow.add(venous);
      venousParticles.push(venous);
    }

    var parts = {
      "right-atrium": ["Rechter Vorhof", "Sammelt sauerstoffarmes Blut aus dem Körper und gibt es an die rechte Kammer weiter.", rightAtrium, raMat],
      "right-ventricle": ["Rechte Kammer", "Pumpt sauerstoffarmes Blut über die Lungenarterie in die Lunge.", rightVentricle, rvMat],
      "left-atrium": ["Linker Vorhof", "Sammelt sauerstoffreiches Blut aus der Lunge und gibt es an die linke Kammer weiter.", leftAtrium, laMat],
      "left-ventricle": ["Linke Kammer", "Pumpt sauerstoffreiches Blut über die Aorta in den Körper. Ihre Wand ist besonders kräftig.", leftVentricle, lvMat],
      valves: ["Herzklappen", "Sie verhindern den Rückfluss des Blutes zwischen Vorhöfen, Kammern und großen Gefäßen.", valves, valveMat],
      aorta: ["Aorta", "Die Hauptschlagader führt sauerstoffreiches Blut aus der linken Kammer in den Körper.", aorta, aortaMesh.material],
      pulmonary: ["Lungenarterie", "Sie führt sauerstoffarmes Blut von der rechten Kammer zur Lunge. Sie ist die wichtige Ausnahme von der Regel „Arterien führen sauerstoffreiches Blut“.", pulmonary, pulmMesh.material],
      septum: ["Herzscheidewand", "Sie trennt die rechte und die linke Herzhälfte. So bleiben sauerstoffarmes und sauerstoffreiches Blut getrennt.", septum, septumMat]
    };
    var readout = figure ? figure.querySelector("[data-heart-readout]") : null;
    var buttons = figure ? $$("[data-heart-part]", figure) : [];
    var pulseButton = figure ? figure.querySelector("[data-heart-pulse]") : null;
    var playButton = figure ? figure.querySelector("[data-heart-play]") : null;
    var autoButton = figure ? figure.querySelector("[data-heart-auto]") : null;
    var flowButton = figure ? figure.querySelector("[data-heart-flow]") : null;
    var resetButton = figure ? figure.querySelector("[data-heart-reset]") : null;
    var statusNode = figure ? figure.querySelector("[data-heart-status]") : null;
    var phaseNode = figure ? figure.querySelector("[data-heart-phase]") : null;
    var speedButtons = figure ? $$("[data-heart-speed]", figure) : [];

    function say(html) { if (readout) { readout.innerHTML = html; } }

    function clearEmissive() {
      [raMat, laMat, rvMat, lvMat, valveMat, aortaMesh.material, pulmMesh.material, septumMat].forEach(function (material) {
        setEmissive(material, noEmission, 0);
      });
    }
    function applySelection() {
      clearEmissive();
      [raMat, laMat, rvMat, lvMat].forEach(function (material) { material.color.copy(paper); });
      valveMat.color.copy(accent);
      aortaMesh.material.color.copy(paper3);
      pulmMesh.material.color.copy(ink);
      septumMat.color.copy(muted);
      var entry = parts[state.selected];
      if (entry && entry[3]) { entry[3].color.copy(accent); }
      var hoverEntry = parts[state.hovered];
      if (hoverEntry && hoverEntry[3]) { setEmissive(hoverEntry[3], accent, 0.28); }
      if (state.hovered === "septum") { setEmissive(septumMat, accent, 0.24); }
    }

    function show(key) {
      var entry = parts[key];
      if (!entry) { return; }
      state.selected = key;
      applySelection();
      buttons.forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.heartPart === key ? "true" : "false"); });
      say("<strong>" + entry[0] + ".</strong> " + entry[1]);
    }

    buttons.forEach(function (button) { button.addEventListener("click", function () { show(button.dataset.heartPart); }); });

    var hover = installHover(base, [
      {
        object: rightAtrium, key: "right-atrium", title: parts["right-atrium"][0], text: parts["right-atrium"][1],
        enter: function () { state.hovered = "right-atrium"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("right-atrium"); }
      },
      {
        object: rightVentricle, key: "right-ventricle", title: parts["right-ventricle"][0], text: parts["right-ventricle"][1],
        enter: function () { state.hovered = "right-ventricle"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("right-ventricle"); }
      },
      {
        object: leftAtrium, key: "left-atrium", title: parts["left-atrium"][0], text: parts["left-atrium"][1],
        enter: function () { state.hovered = "left-atrium"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("left-atrium"); }
      },
      {
        object: leftVentricle, key: "left-ventricle", title: parts["left-ventricle"][0], text: parts["left-ventricle"][1],
        enter: function () { state.hovered = "left-ventricle"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("left-ventricle"); }
      },
      {
        object: valves, key: "valves", title: parts.valves[0], text: parts.valves[1],
        enter: function () { state.hovered = "valves"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("valves"); }
      },
      {
        object: aorta, key: "aorta", title: parts.aorta[0], text: parts.aorta[1],
        enter: function () { state.hovered = "aorta"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("aorta"); }
      },
      {
        object: pulmonary, key: "pulmonary", title: parts.pulmonary[0], text: parts.pulmonary[1],
        enter: function () { state.hovered = "pulmonary"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("pulmonary"); }
      },
      {
        object: septum, key: "septum", title: parts.septum[0], text: parts.septum[1],
        enter: function () { state.hovered = "septum"; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { show("septum"); }
      }
    ]);

    function syncControls() {
      if (playButton) { playButton.textContent = state.playing ? "Pause" : "Weiter"; }
      if (autoButton) { autoButton.setAttribute("aria-pressed", state.autoBeat ? "true" : "false"); }
      if (flowButton) { flowButton.setAttribute("aria-pressed", state.bloodFlow ? "true" : "false"); }
      if (statusNode) {
        var label = state.playing ? (state.autoBeat ? "Herzzyklus läuft" : "Herzschlag manuell") : "Herzzyklus pausiert";
        statusNode.textContent = label;
        statusNode.setAttribute("data-state", state.playing ? "running" : "paused");
      }
      speedButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", Number(button.dataset.heartSpeed) === state.speed ? "true" : "false");
      });
      bloodFlow.visible = state.bloodFlow;
    }
    function syncPhase(label) {
      if (phaseNode) { phaseNode.textContent = label; }
    }

    if (pulseButton) {
      pulseButton.addEventListener("click", function () {
        state.manual = 1;
        say("<strong>Herzschlag.</strong> Die Kammern ziehen sich zusammen (Systole) und treiben Blut aus. Danach entspannen sie sich wieder (Diastole).");
      });
    }
    if (playButton) {
      playButton.addEventListener("click", function () {
        state.playing = !state.playing;
        syncControls();
        syncPhase(state.playing ? state.phase : "Pause");
        say(state.playing ? "<strong>Weiter.</strong> Der Herzzyklus läuft mit der gewählten Geschwindigkeit." : "<strong>Pause.</strong> Der Herzzyklus steht still; die Kamera bleibt bedienbar.");
      });
    }
    if (autoButton) {
      autoButton.addEventListener("click", function () {
        state.autoBeat = !state.autoBeat;
        syncControls();
        say(state.autoBeat ? "<strong>Automatik an.</strong> Der Herzzyklus läuft fortlaufend. Beobachte den Wechsel von Systole und Diastole." : "<strong>Automatik aus.</strong> Nutze „Herzschlag“, um einen einzelnen Zyklus auszulösen.");
      });
    }
    if (flowButton) {
      flowButton.addEventListener("click", function () {
        state.bloodFlow = !state.bloodFlow;
        syncControls();
        say(state.bloodFlow ? "<strong>Blutfluss an.</strong> Sauerstoffarmes Blut fließt über die Lungenarterie zur Lunge, sauerstoffreiches Blut über die Aorta in den Körper." : "<strong>Blutfluss aus.</strong> Du kannst die Gefäße und Klappen ohne Bewegung betrachten.");
      });
    }
    speedButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        state.speed = Number(button.dataset.heartSpeed) || 1;
        syncControls();
        say("<strong>Tempo " + String(state.speed).replace(".", ",") + "×.</strong> Herzzyklus und Blutfluss laufen entsprechend schneller oder langsamer.");
      });
    });
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        state.selected = "right-atrium";
        state.hovered = null;
        state.playing = true;
        state.autoBeat = true;
        state.bloodFlow = true;
        state.speed = 1;
        state.time = 0;
        state.manual = 0;
        state.phase = "Diastole";
        if (hover) { hover.clear(); }
        base.resetCamera(720);
        applySelection();
        syncControls();
        syncPhase("Diastole");
        buttons.forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.heartPart === "right-atrium" ? "true" : "false"); });
        say("<strong>Ansicht zurückgesetzt.</strong> Der rechte Vorhof ist ausgewählt. Wähle eine Struktur oder fahre mit dem Zeiger über das Modell.");
      });
    }

    function updateBloodFlow() {
      arterialParticles.forEach(function (particle) {
        var t = (particle.userData.offset + state.time * 0.09) % 1;
        var point = aortaCurve.getPoint(t);
        point.z += 0.31;
        particle.position.copy(point);
      });
      venousParticles.forEach(function (particle) {
        var t = (particle.userData.offset + state.time * 0.075) % 1;
        var point = pulmonaryCurve.getPoint(t);
        point.z += 0.25;
        particle.position.copy(point);
      });
    }

    applySelection();
    syncControls();
    syncPhase("Diastole");
    say("<strong>Rechter Vorhof ausgewählt.</strong> " + parts["right-atrium"][1] + " Fahre mit dem Zeiger über eine Struktur oder klicke sie an.");

    base.loop(function (delta) {
      if (state.playing) {
        state.time += delta * state.speed;
        state.manual = Math.max(0, state.manual - delta * state.speed * 1.7);
      }
      var autoPulse = 0;
      var phase = "Diastole";
      if (state.autoBeat && state.playing) {
        var cycle = (state.time * 0.86) % 1;
        autoPulse = Math.exp(-Math.pow((cycle - 0.16) / 0.075, 2)) * 0.9 + Math.exp(-Math.pow((cycle - 0.29) / 0.09, 2)) * 0.35;
        autoPulse = Math.min(1, autoPulse);
        phase = cycle < 0.34 ? "Systole" : "Diastole";
      } else if (state.playing && state.manual > 0) {
        phase = "Systole";
      } else {
        phase = state.playing ? "Diastole" : "Pause";
      }
      var manualPulse = Math.sin((1 - state.manual) * Math.PI);
      var contraction = Math.min(1, Math.max(autoPulse, manualPulse));
      var ventricularScale = 1 - contraction * 0.072;
      var atrialScale = 1 - contraction * 0.026;
      rightVentricle.scale.setScalar(ventricularScale);
      leftVentricle.scale.setScalar(ventricularScale);
      rightAtrium.scale.setScalar(atrialScale);
      leftAtrium.scale.setScalar(atrialScale);
      if (phase !== state.phase) {
        state.phase = phase;
        syncPhase(phase);
      }
      updateBloodFlow();
      bloodFlow.visible = state.bloodFlow;
    });

    return { show: show };
  }

  function fossilScene(container) {
    var base = setup(container, [6.2, 5.6, 12.7], [0, 2.2, 0], {
      minDistance: 9,
      maxDistance: 26,
      maxPolarAngle: Math.PI * 0.49,
      enhancedLighting: true,
      shadows: true,
      keyPosition: [7, 15, 10]
    });
    if (!base) { return null; }
    var figure = container.closest("figure");
    var paper = new THREE.Color(tokenColor("--color-paper"));
    var paper2 = new THREE.Color(tokenColor("--color-paper-2"));
    var paper3 = new THREE.Color(tokenColor("--color-paper-3"));
    var ink = new THREE.Color(tokenColor("--color-ink"));
    var muted = new THREE.Color(tokenColor("--color-muted"));
    var accent = new THREE.Color(tokenColor("--color-accent"));
    var noEmission = new THREE.Color(0x000000);

    var state = {
      playing: true,
      speed: 1,
      separated: false,
      separation: 0,
      selectedFossil: null,
      selectedLayer: null,
      hovered: null,
      time: 0
    };

    var floor = new THREE.Mesh(
      new THREE.BoxGeometry(10.4, 0.16, 6.1),
      new THREE.MeshStandardMaterial({ color: paper2, roughness: 0.95 })
    );
    floor.position.y = -0.16;
    floor.receiveShadow = true;
    base.scene.add(floor);
    var floorEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(10.4, 0.16, 6.1)),
      new THREE.LineBasicMaterial({ color: muted, transparent: true, opacity: 0.5 })
    );
    floorEdge.position.y = -0.16;
    base.scene.add(floorEdge);

    var layerDefinitions = [
      { key: "layer4", label: "Schicht 4", position: "unten", age: "ca. 3,2 Mio. Jahre", height: 1.4, color: ink, fossil: "afarensis" },
      { key: "layer3", label: "Schicht 3", position: "unter der Mitte", age: "ca. 130.000 Jahre", height: 1.2, color: muted, fossil: "neanderthalensis" },
      { key: "layer2", label: "Schicht 2", position: "über der Mitte", age: "ca. 100.000 Jahre", height: 1.0, color: paper2, fossil: "sapiens" },
      { key: "layer1", label: "Schicht 1", position: "oben", age: "ca. 50.000 Jahre", height: 0.8, color: paper3, fossil: "tool" }
    ];
    var layerGroups = [];
    var layers = Object.create(null);
    var runningHeight = 0;
    layerDefinitions.forEach(function (definition, index) {
      var group = new THREE.Group();
      group.userData.baseY = 0;
      group.userData.index = index;
      base.scene.add(group);
      var material = new THREE.MeshStandardMaterial({ color: definition.color, roughness: 0.9 });
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(8, definition.height, 4.4), material);
      mesh.position.y = runningHeight + definition.height / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      var outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(8.02, definition.height + 0.01, 4.42)),
        new THREE.LineBasicMaterial({ color: definition.color === ink ? paper3 : ink, transparent: true, opacity: 0.32 })
      );
      outline.position.y = mesh.position.y;
      group.add(outline);
      definition.mesh = mesh;
      definition.material = material;
      definition.group = group;
      definition.center = mesh.position.y;
      definition.base = runningHeight;
      runningHeight += definition.height;
      layers[definition.key] = definition;
      layerGroups.push(group);
    });
    var blockHeight = runningHeight;

    function addFossilMaterial(group, materials, color) {
      var material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.58 });
      materials.push(material);
      return material;
    }

    function makeSkull(variant) {
      var group = new THREE.Group();
      var materials = [];
      var bone = addFossilMaterial(group, materials, paper);
      var dark = addFossilMaterial(group, materials, ink);
      var cranium = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 16), bone);
      cranium.scale.set(variant === "neanderthalensis" ? 1.12 : 1.04, variant === "neanderthalensis" ? 0.84 : 0.94, 0.94);
      cranium.position.y = 0.22;
      cranium.castShadow = true;
      group.add(cranium);
      var face = new THREE.Mesh(new THREE.BoxGeometry(variant === "neanderthalensis" ? 0.54 : 0.48, 0.34, 0.3), bone);
      face.position.set(0, -0.02, 0.33);
      face.castShadow = true;
      group.add(face);
      var brow = new THREE.Mesh(new THREE.BoxGeometry(variant === "neanderthalensis" ? 0.66 : 0.56, 0.09, 0.16), bone);
      brow.position.set(0, variant === "neanderthalensis" ? 0.17 : 0.12, 0.42);
      brow.castShadow = true;
      group.add(brow);
      [-1, 1].forEach(function (side) {
        var eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), dark);
        eye.position.set(side * 0.16, 0.07, 0.48);
        group.add(eye);
      });
      var jaw = new THREE.Mesh(new THREE.BoxGeometry(variant === "neanderthalensis" ? 0.46 : 0.4, 0.12, 0.28), bone);
      jaw.position.set(0, -0.3, 0.32);
      jaw.castShadow = true;
      group.add(jaw);
      for (var tooth = 0; tooth < 4; tooth += 1) {
        var toothMesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.05), bone);
        toothMesh.position.set(-0.15 + tooth * 0.1, -0.235, 0.47);
        group.add(toothMesh);
      }
      return { group: group, materials: materials };
    }

    function makeJaw() {
      var group = new THREE.Group();
      var materials = [];
      var bone = addFossilMaterial(group, materials, paper);
      var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.38, 0.12, 0),
        new THREE.Vector3(-0.28, -0.18, 0.02),
        new THREE.Vector3(0, -0.28, 0.03),
        new THREE.Vector3(0.28, -0.18, 0.02),
        new THREE.Vector3(0.38, 0.12, 0)
      ]);
      var jaw = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.075, 7, false), bone);
      jaw.castShadow = true;
      group.add(jaw);
      for (var pointIndex = 0; pointIndex <= 6; pointIndex += 1) {
        var point = curve.getPoint(pointIndex / 6);
        var tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), bone);
        tooth.position.set(point.x, point.y + 0.08, point.z + 0.04);
        group.add(tooth);
      }
      return { group: group, materials: materials };
    }

    function makeTool() {
      var group = new THREE.Group();
      var materials = [];
      var stone = addFossilMaterial(group, materials, muted);
      var blade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 4), stone);
      blade.scale.set(0.88, 1, 0.28);
      blade.rotation.z = 0.24;
      blade.position.y = 0.08;
      blade.castShadow = true;
      group.add(blade);
      var chip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 4), stone);
      chip.scale.set(0.8, 1, 0.25);
      chip.rotation.z = -0.65;
      chip.position.set(0.2, -0.12, 0.05);
      chip.castShadow = true;
      group.add(chip);
      return { group: group, materials: materials };
    }

    var fossilDefinitions = {
      tool: {
        title: "Steinwerkzeug",
        layer: "layer1",
        age: "ca. 50.000 Jahre",
        method: "Radiokarbon an begleitender Holzkohle oder OSL an Sediment",
        text: "Ein bearbeiteter Stein belegt Werkzeuggebrauch, aber nicht automatisch, welche Menschenart ihn hergestellt hat. Die Datierung erfolgt über begleitende Funde oder das Sediment.",
        build: makeTool
      },
      sapiens: {
        title: "Homo sapiens",
        layer: "layer2",
        age: "ca. 100.000 Jahre",
        method: "OSL an Sediment oder Uran-Thorium an begleitendem Kalzit",
        text: "Der moderne Mensch lebte in Afrika und wanderte später aus. Schädelmerkmale wie ein runder Schädel und ein kleineres Gesicht werden im Modell stark vereinfacht.",
        build: function () { return makeSkull("sapiens"); }
      },
      neanderthalensis: {
        title: "Homo neanderthalensis",
        layer: "layer3",
        age: "ca. 130.000 Jahre",
        method: "OSL oder Uran-Thorium an begleitenden Sedimenten",
        text: "Neandertaler waren an ein kaltes Klima angepasst. Sie lebten zeitweise gleichzeitig mit Homo sapiens; Fossilien und Werkzeuge zeigen komplexe Kultur.",
        build: function () { return makeSkull("neanderthalensis"); }
      },
      afarensis: {
        title: "Australopithecus afarensis",
        layer: "layer4",
        age: "ca. 3,2 Mio. Jahre",
        method: "Kalium-Argon an vulkanischen Schichten",
        text: "Der aufrechte Gang ist an Becken und Hinterhauptloch erkennbar. Das Gehirn war kleiner als beim modernen Menschen. „Lucy“ ist ein bekannter Fund.",
        build: makeJaw
      }
    };

    var fossilPositions = {
      tool: { x: 1.6, z: 2.42, scale: 0.95 },
      sapiens: { x: -1.8, z: 2.42, scale: 0.92 },
      neanderthalensis: { x: 1.7, z: 2.42, scale: 1.02 },
      afarensis: { x: -1.7, z: 2.42, scale: 1.04 }
    };

    var fossils = Object.create(null);
    Object.keys(fossilDefinitions).forEach(function (key) {
      var definition = fossilDefinitions[key];
      var layer = layers[definition.layer];
      var built = definition.build();
      var position = fossilPositions[key];
      built.group.position.set(position.x, layer.base + layer.height * 0.5, position.z);
      built.group.scale.setScalar(position.scale);
      built.group.userData.fossilKey = key;
      layer.group.add(built.group);
      definition.group = built.group;
      definition.materials = built.materials;
      fossils[key] = definition;
    });

    var ruler = new THREE.Group();
    ruler.position.set(-4.45, 0, 2.45);
    var rulerMaterial = new THREE.MeshStandardMaterial({ color: paper3, roughness: 0.5, metalness: 0.05 });
    var rulerBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, blockHeight + 0.3, 0.08), rulerMaterial);
    rulerBody.position.y = blockHeight / 2;
    rulerBody.castShadow = true;
    ruler.add(rulerBody);
    for (var tickIndex = 0; tickIndex <= 12; tickIndex += 1) {
      var tickMesh = new THREE.Mesh(
        new THREE.BoxGeometry(tickIndex % 3 === 0 ? 0.34 : 0.2, 0.03, 0.1),
        new THREE.MeshBasicMaterial({ color: tickIndex % 3 === 0 ? ink : muted })
      );
      tickMesh.position.set(0, (tickIndex / 12) * blockHeight, 0);
      ruler.add(tickMesh);
    }
    var rulerTop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: accent }));
    rulerTop.position.y = blockHeight + 0.15;
    ruler.add(rulerTop);
    base.scene.add(ruler);

    var dustGeometry = new THREE.BufferGeometry();
    var dustPositions = [];
    for (var dust = 0; dust < 60; dust += 1) {
      dustPositions.push((Math.random() - 0.5) * 10, Math.random() * 6.5, (Math.random() - 0.5) * 7);
    }
    dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
    var dustPoints = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: accent, size: 0.035, transparent: true, opacity: 0.32, depthWrite: false })
    );
    base.scene.add(dustPoints);

    var readout = figure ? figure.querySelector("[data-fossil-readout]") : null;
    var separateButton = figure ? figure.querySelector("[data-fossil-separate]") : null;
    var playButton = figure ? figure.querySelector("[data-fossil-play]") : null;
    var resetButton = figure ? figure.querySelector("[data-fossil-reset]") : null;
    var statusNode = figure ? figure.querySelector("[data-fossil-status]") : null;
    var speedButtons = figure ? $$("[data-fossil-speed]", figure) : [];

    function say(html) { if (readout) { readout.innerHTML = html; } }
    function clearHighlight() {
      Object.keys(fossils).forEach(function (key) {
        fossils[key].materials.forEach(function (material) { setEmissive(material, noEmission, 0); });
      });
      layerDefinitions.forEach(function (definition) { setEmissive(definition.material, noEmission, 0); });
      setEmissive(rulerMaterial, noEmission, 0);
    }
    function applySelection() {
      clearHighlight();
      if (state.selectedFossil && fossils[state.selectedFossil]) {
        fossils[state.selectedFossil].materials.forEach(function (material) { setEmissive(material, accent, 0.28); });
      }
      if (state.selectedLayer && layers[state.selectedLayer]) {
        setEmissive(layers[state.selectedLayer].material, accent, 0.14);
      }
      if (state.hovered && state.hovered.type === "fossil" && fossils[state.hovered.key]) {
        fossils[state.hovered.key].materials.forEach(function (material) { setEmissive(material, accent, 0.34); });
      }
      if (state.hovered && state.hovered.type === "layer" && layers[state.hovered.key]) {
        setEmissive(layers[state.hovered.key].material, accent, 0.16);
      }
      if (state.hovered && state.hovered.type === "ruler") {
        setEmissive(rulerMaterial, accent, 0.24);
      }
    }

    function selectFossil(key) {
      var entry = fossils[key];
      if (!entry) { return; }
      state.selectedFossil = key;
      state.selectedLayer = null;
      applySelection();
      say("<strong>" + entry.title + ".</strong> Gefunden in " + layers[entry.layer].label + ", " + entry.age + ". Datierung: " + entry.method + ". " + entry.text);
    }
    function selectLayer(key) {
      var entry = layers[key];
      if (!entry) { return; }
      state.selectedLayer = key;
      state.selectedFossil = null;
      applySelection();
      var orderText = key === "layer1" ? "Sie ist die oberste Schicht und damit die jüngste." : key === "layer4" ? "Sie ist die unterste Schicht und damit die älteste." : "Sie liegt zwischen zwei anderen Schichten. Nach dem Lagerungsgesetz ist sie älter als die Schicht darüber und jünger als die Schicht darunter.";
      say("<strong>" + entry.label + " (" + entry.position + ").</strong> " + orderText + " Geschätztes Alter: " + entry.age + ". Die relative Datierung nutzt die Lagerung; die absolute Datierung braucht eine Messung, zum Beispiel über radioaktive Isotope.");
    }

    var hover = installHover(base, Object.keys(fossils).map(function (key) {
      var entry = fossils[key];
      return {
        object: entry.group,
        key: key,
        title: entry.title,
        text: entry.age + " · " + layers[entry.layer].label + ". Klicke das Fossil an, um Datierung und Fundschicht zu lesen.",
        enter: function () { state.hovered = { type: "fossil", key: key }; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { selectFossil(key); }
      };
    }).concat(layerDefinitions.map(function (definition) {
      return {
        object: definition.mesh,
        key: definition.key,
        title: definition.label,
        text: definition.position + " · " + definition.age + ". Klicke die Schicht an, um ihre Lage im Profil zu prüfen.",
        enter: function () { state.hovered = { type: "layer", key: definition.key }; applySelection(); },
        leave: function () { state.hovered = null; applySelection(); },
        select: function () { selectLayer(definition.key); }
      };
    })).concat([{
      object: ruler,
      key: "ruler",
      title: "Tiefenskala",
      text: "Tiefer liegende Schichten sind meist älter. Das ist das Prinzip der relativen Datierung – ohne eine einzige Jahreszahl.",
      enter: function () { state.hovered = { type: "ruler", key: "ruler" }; applySelection(); },
      leave: function () { state.hovered = null; applySelection(); },
      select: function () {
        say("<strong>Relative Datierung.</strong> Die Lage im Profil ordnet die Schichten: unten älter, oben jünger. Die absolute Datierung liefert zusätzlich ein Alter in Jahren, etwa über radioaktive Isotope.");
      }
    }]));

    function syncControls() {
      if (separateButton) {
        separateButton.setAttribute("aria-pressed", state.separated ? "true" : "false");
        separateButton.textContent = state.separated ? "Schichten schließen" : "Schichten trennen";
      }
      if (playButton) { playButton.textContent = state.playing ? "Pause" : "Weiter"; }
      if (statusNode) {
        var label = !state.playing ? "Profil pausiert" : state.separated ? "Schichten getrennt" : "Profil geschlossen";
        statusNode.textContent = label;
        statusNode.setAttribute("data-state", state.playing ? "running" : "paused");
      }
      speedButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", Number(button.dataset.fossilSpeed) === state.speed ? "true" : "false");
      });
    }

    if (separateButton) {
      separateButton.addEventListener("click", function () {
        state.separated = !state.separated;
        if (!state.playing) { state.separation = state.separated ? 1 : 0; }
        syncControls();
        say(state.separated ? "<strong>Schichten getrennt.</strong> Die Fossilien bleiben in ihrer Schicht. So wird die Abfolge sichtbar: oben jung, unten alt. Die Jahreszahlen stammen aus der absoluten Datierung." : "<strong>Schichten geschlossen.</strong> Das Profil zeigt wieder die ursprüngliche Lagerung. Die Reihenfolge allein ist ein relatives Alter.");
      });
    }
    if (playButton) {
      playButton.addEventListener("click", function () {
        state.playing = !state.playing;
        syncControls();
        say(state.playing ? "<strong>Weiter.</strong> Die Schichten bewegen sich mit der gewählten Geschwindigkeit." : "<strong>Pause.</strong> Das Profil steht still; die Kamera bleibt bedienbar.");
      });
    }
    speedButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        state.speed = Number(button.dataset.fossilSpeed) || 1;
        syncControls();
        say("<strong>Tempo " + String(state.speed).replace(".", ",") + "×.</strong> Die Bewegung der Schichten und der Staub passen sich an.");
      });
    });
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        state.playing = true;
        state.speed = 1;
        state.separated = false;
        state.separation = 0;
        state.selectedFossil = null;
        state.selectedLayer = null;
        state.hovered = null;
        state.time = 0;
        if (hover) { hover.clear(); }
        base.resetCamera(720);
        applySelection();
        syncControls();
        say("<strong>Ansicht zurückgesetzt.</strong> Wähle ein Fossil oder eine Schicht. Die Lage im Profil zeigt das relative Alter; die Isotopenwerte liefern das absolute Alter.");
      });
    }

    applySelection();
    syncControls();
    say("<strong>Grabungsprofil.</strong> Fahre über ein Fossil oder eine Schicht und klicke sie an. Die Lage im Profil zeigt das relative Alter; die Isotopenwerte liefern das absolute Alter.");

    base.loop(function (delta) {
      if (state.playing) {
        state.time += delta * state.speed;
        var target = state.separated ? 1 : 0;
        state.separation += (target - state.separation) * (1 - Math.exp(-delta * state.speed * 2.2));
      }
      layerGroups.forEach(function (group) {
        group.position.y = state.separation * group.userData.index * 0.62;
      });
      if (state.playing) {
        dustPoints.rotation.y += delta * 0.012 * state.speed;
      }
      dustPoints.position.y = Math.sin(state.time * 0.4) * 0.05;
    });

    return { selectFossil: selectFossil, selectLayer: selectLayer };
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
      if (type === "microbe") { api = microbeScene(container); }
      if (type === "insect") { api = insectScene(container); }
      if (type === "soil") { api = soilScene(container); }
      if (type === "phototropism") { api = phototropismScene(container); }
      if (type === "virus") { api = virusScene(container); }
      if (type === "heart") { api = heartScene(container); }
      if (type === "fossil") { api = fossilScene(container); }
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
