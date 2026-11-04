/* 3D-Funktionsschnittmodell Auge · Biologie 8
   Anatomically styled cutaway with refraction, accommodation, pupil reflex,
   retinal transduction, optic-nerve spikes and a live oscilloscope. */
(function () {
  "use strict";

  var container = document.getElementById("eye-stage");
  if (!container || !window.THREE || !window.Lab3D) { return; }
  var Lab = window.Lab3D;

  var lab = Lab.createScene(container, {
    camera: [3.4, 3.2, 14.8],
    target: [0, 0, -0.2],
    minDistance: 2.2,
    maxDistance: 27,
    shadowY: -3.35,
    shadowOpacity: 0.24,
    ambient: 0.33,
    hemi: 0.42,
    keyLight: 1.12,
    onReset: function () { resetAll(); }
  });
  if (!lab) { return; }

  var scene = lab.scene;
  var palette = lab.palette;

  function mat(color, options) {
    options = options || {};
    options.side = options.side || THREE.DoubleSide;
    return options.physical ? Lab.physical(color, options) : Lab.standard(color, options);
  }
  function glass(color, options) {
    options = options || {};
    options.physical = true;
    options.side = options.side || THREE.DoubleSide;
    return Lab.physical(color, options);
  }
  function add(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  var eyeRoot = new THREE.Group();
  scene.add(eyeRoot);
  var anteriorGroup = new THREE.Group();
  var posteriorGroup = new THREE.Group();
  eyeRoot.add(anteriorGroup, posteriorGroup);

  /* ---------- three concentric layers, opened by a side wedge ---------- */
  var wedgeStart = Math.PI * 148 / 180;
  var wedgeLength = Math.PI * 1.5;
  var sclera = add(new THREE.Mesh(
    new THREE.SphereGeometry(2.42, 96, 64, wedgeStart, wedgeLength),
    mat(palette.ink, { roughness: 0.52, metalness: 0.03, side: THREE.DoubleSide, opacity: 0.96, transparent: true })
  ));
  sclera.scale.set(1, 1, 1.07);
  sclera.name = "sclera";
  lab.addTip(sclera, {
    name: "Lederhaut (Sklera)",
    term: "äußere Augenhaut",
    text: "Die feste, weiße Hülle schützt das Auge und gibt ihm seine Form. Vorne geht sie in die klare Hornhaut über."
  });

  var choroid = add(new THREE.Mesh(
    new THREE.SphereGeometry(2.31, 96, 64, wedgeStart, wedgeLength),
    mat(new THREE.Color("#793b34"), { roughness: 0.72, metalness: 0.01, side: THREE.DoubleSide })
  ));
  choroid.scale.set(1, 1, 1.07);
  choroid.name = "choroid";
  lab.addTip(choroid, {
    name: "Aderhaut (Choroidea)",
    term: "mittlere Augenhaut",
    text: "Die Aderhaut ist stark durchblutet. Sie versorgt die Netzhaut mit Sauerstoff und Nährstoffen und liegt zwischen Lederhaut und Netzhaut."
  });

  var retina = add(new THREE.Mesh(
    new THREE.SphereGeometry(2.20, 96, 64, wedgeStart, wedgeLength),
    mat(new THREE.Color("#b8642f"), { roughness: 0.58, metalness: 0.01, side: THREE.DoubleSide })
  ));
  retina.scale.set(1, 1, 1.07);
  retina.name = "retina";
  lab.addTip(retina, {
    name: "Netzhaut (Retina)",
    term: "innere Augenhaut",
    text: "In der Netzhaut liegen die Lichtsinneszellen. Sie wandeln Licht in elektrische Nervensignale um. Der gelbe Fleck ist die Stelle des schärfsten Sehens."
  });

  /* cut edges show the three layer thicknesses */
  var cutRimGroup = new THREE.Group();
  posteriorGroup.add(cutRimGroup);
  function cutEdge(radius, phi, color, tubeRadius) {
    var points = [];
    for (var ei = 0; ei <= 48; ei += 1) {
      var theta = (ei / 48) * Math.PI;
      points.push(new THREE.Vector3(
        -radius * Math.cos(phi) * Math.sin(theta),
        radius * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta) * 1.07
      ));
    }
    var edge = Lab.tube(points, tubeRadius, new THREE.MeshBasicMaterial({ color: color }), { segments: 64, radialSegments: 5 });
    cutRimGroup.add(edge);
  }
  [0.05, 0.045, 0.04].forEach(function (tubeRadius, index) {
    var radius = [2.42, 2.31, 2.20][index];
    var color = index === 0 ? palette.ink : index === 1 ? new THREE.Color("#793b34") : new THREE.Color("#b8642f");
    cutEdge(radius, wedgeStart, color, tubeRadius);
    cutEdge(radius, wedgeStart + wedgeLength, color, tubeRadius);
  });

  /* ---------- cornea, iris, pupil ---------- */
  var corneaGeometry = new THREE.SphereGeometry(1.10, 64, 36, 0, Math.PI * 2, 0, Math.PI / 2.35);
  corneaGeometry.rotateX(Math.PI / 2);
  var cornea = new THREE.Mesh(
    corneaGeometry,
    glass(new THREE.Color("#d8f1f2"), {
      transmission: 0.92,
      roughness: 0.055,
      thickness: 0.5,
      ior: 1.376,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      opacity: 0.62,
      transparent: true,
      depthWrite: false
    })
  );
  cornea.position.z = 1.62;
  cornea.castShadow = false;
  anteriorGroup.add(cornea);
  lab.addTip(cornea, {
    name: "Hornhaut (Cornea)",
    term: "vorderer Teil der äußeren Augenhaut",
    text: "Die klare, uhrglasartig gewölbte Hornhaut bricht das einfallende Licht und schützt das Auge. Sie ist nicht durchblutet und heilt langsam."
  });
  var limbus = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.035, 8, 96),
    new THREE.MeshBasicMaterial({ color: palette.muted, transparent: true, opacity: 0.55 })
  );
  limbus.position.z = 1.70;
  anteriorGroup.add(limbus);

  var irisMaterial = mat(new THREE.Color("#8a5b3e"), { roughness: 0.55, metalness: 0.02 });
  var iris = new THREE.Mesh(new THREE.RingGeometry(0.50, 1.09, 128, 8), irisMaterial);
  iris.position.z = 1.93;
  anteriorGroup.add(iris);
  lab.addTip(iris, {
    name: "Regenbogenhaut (Iris)",
    term: "Pupillenmuskel",
    text: "Die Iris ist eine farbige Muskelschicht. Ihre Ring- und Radiärmuskeln verändern die Pupillenweite und steuern so die Lichtmenge."
  });
  var irisFibers = [];
  for (var fi = 0; fi < 150; fi += 1) {
    var angle = (fi / 150) * Math.PI * 2 + Math.sin(fi * 2.3) * 0.02;
    var inner = 0.53;
    var outer = 0.99 + Math.sin(fi * 3.7) * 0.05;
    var geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(angle) * inner, Math.sin(angle) * inner, 1.935),
      new THREE.Vector3(Math.cos(angle) * outer, Math.sin(angle) * outer, 1.935)
    ]);
    var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: new THREE.Color("#4f3427"), transparent: true, opacity: 0.55 }));
    anteriorGroup.add(line);
    irisFibers.push(line);
  }
  var irisRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.06, 0.035, 8, 96),
    mat(new THREE.Color("#6f4a35"), { roughness: 0.5 })
  );
  irisRim.position.z = 1.935;
  anteriorGroup.add(irisRim);
  var pupilBacking = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 48),
    new THREE.MeshBasicMaterial({ color: 0x090b09, side: THREE.DoubleSide })
  );
  pupilBacking.position.z = 0.62;
  anteriorGroup.add(pupilBacking);
  var pupil = new THREE.Mesh(
    new THREE.CircleGeometry(0.50, 64),
    new THREE.MeshBasicMaterial({ color: 0x050706, side: THREE.DoubleSide, transparent: true, opacity: 0.22, depthWrite: false })
  );
  pupil.position.z = 1.94;
  anteriorGroup.add(pupil);
  var pupilRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.50, 0.018, 6, 64),
    new THREE.MeshBasicMaterial({ color: 0x050706 })
  );
  pupilRim.position.z = 1.945;
  anteriorGroup.add(pupilRim);
  lab.addTip(pupil, {
    name: "Pupille",
    term: "Sehloch",
    text: "Die Pupille ist die Öffnung in der Iris. Bei hellem Licht wird sie kleiner, bei Dunkelheit größer. So reguliert das Auge die einfallende Lichtmenge."
  });

  /* ---------- lens, ciliary muscle, zonules ---------- */
  var lensPoints = [];
  var lensRadius = 0.78;
  var lensThickness = 0.72;
  for (var li = 0; li <= 64; li += 1) {
    var u = li / 64;
    var y = (u - 0.5) * lensThickness;
    var radius = lensRadius * Math.sqrt(Math.max(0, 1 - Math.pow((2 * y) / lensThickness, 2)));
    lensPoints.push(new THREE.Vector2(Math.max(0.001, radius), y));
  }
  var lensGeometry = new THREE.LatheGeometry(lensPoints, 64);
  lensGeometry.rotateX(Math.PI / 2);
  var lens = new THREE.Mesh(
    lensGeometry,
    glass(new THREE.Color("#f6dc91"), {
      transmission: 0.36,
      roughness: 0.16,
      thickness: 0.55,
      ior: 1.42,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      opacity: 0.96,
      transparent: true,
      emissive: new THREE.Color("#6b4b12"),
      emissiveIntensity: 0.35,
      depthWrite: false
    })
  );
  lens.position.z = 1.23;
  lens.castShadow = true;
  anteriorGroup.add(lens);
  var lensRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.79, 0.024, 7, 64),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#d8b25f"), transparent: true, opacity: 0.8 })
  );
  lensRim.position.z = 1.23;
  lensRim.rotation.x = 0;
  anteriorGroup.add(lensRim);
  lab.addTip(lens, {
    name: "Augenlinse",
    term: "bikonvexe Linse",
    text: "Die elastische Linse bündelt das Licht. Beim Nahsehen wird sie stärker gekrümmt, beim Fernsehen flacher. Diese Anpassung heißt Akkommodation."
  });
  var lensNucleus = new THREE.Mesh(
    new THREE.SphereGeometry(0.39, 32, 20),
    glass(new THREE.Color("#d6bc76"), { transmission: 0.45, roughness: 0.22, opacity: 0.26, transparent: true, depthWrite: false, clippingPlanes: false })
  );
  lensNucleus.scale.z = 0.65;
  lensNucleus.position.z = 1.23;
  anteriorGroup.add(lensNucleus);

  var ciliary = new THREE.Mesh(
    new THREE.TorusGeometry(1.22, 0.13, 12, 80),
    mat(new THREE.Color("#a9554d"), { roughness: 0.55, metalness: 0.02 })
  );
  ciliary.position.z = 1.42;
  anteriorGroup.add(ciliary);
  lab.addTip(ciliary, {
    name: "Ziliarmuskel",
    term: "Ringmuskel",
    text: "Der ringförmige Ziliarmuskel zieht sich beim Nahsehen zusammen. Dadurch entspannen sich die Zonulafasern, und die Linse wird stärker gekrümmt."
  });
  var ciliaryRidges = new THREE.Group();
  for (var ci = 0; ci < 36; ci += 1) {
    var ca = (ci / 36) * Math.PI * 2;
    var ridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 0.24, 5),
      mat(new THREE.Color("#c47a70"), { roughness: 0.6 })
    );
    ridge.position.set(Math.cos(ca) * 1.22, Math.sin(ca) * 1.22, 1.42);
    ridge.rotation.z = ca - Math.PI / 2;
    ciliaryRidges.add(ridge);
  }
  anteriorGroup.add(ciliaryRidges);

  var zonuleGroup = new THREE.Group();
  for (var zi = 0; zi < 32; zi += 1) {
    var za = (zi / 32) * Math.PI * 2;
    var zInner = 0.78;
    var zOuter = 1.09;
    var zonule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, zOuter - zInner, 4),
      new THREE.MeshBasicMaterial({ color: palette.ink2, transparent: true, opacity: 0.72 })
    );
    zonule.position.set(Math.cos(za) * ((zInner + zOuter) / 2), Math.sin(za) * ((zInner + zOuter) / 2), 1.42);
    zonule.rotation.z = za - Math.PI / 2;
    zonuleGroup.add(zonule);
  }
  anteriorGroup.add(zonuleGroup);
  lab.addTip(zonuleGroup, {
    name: "Zonulafasern",
    term: "Aufhängebänder der Linse",
    text: "Feine Fasern halten die Linse am Ziliarmuskel. Erschlafft der Muskel, werden die Fasern lockerer und die Linse wölbt sich stärker."
  });

  var vitreous = new THREE.Mesh(
    new THREE.SphereGeometry(2.06, 64, 48),
    glass(new THREE.Color("#bfd8d8"), { transmission: 0.42, roughness: 0.16, opacity: 0.10, transparent: true, depthWrite: false })
  );
  vitreous.scale.set(1, 1, 1.04);
  vitreous.position.z = -0.05;
  anteriorGroup.add(vitreous);
  lab.addTip(vitreous, {
    name: "Glaskörper",
    term: "gelartiger Innenraum",
    text: "Der Glaskörper füllt den Raum hinter der Linse. Er ist klar und gelartig und hält die Netzhaut von innen in Form."
  });

  /* ---------- fovea, optic disc, nerve ---------- */
  var fovea = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#f0b65d"), side: THREE.DoubleSide })
  );
  fovea.position.set(-0.35, 0, -2.20);
  posteriorGroup.add(fovea);
  lab.addTip(fovea, {
    name: "Gelber Fleck (Fovea centralis)",
    term: "Ort des schärfsten Sehens",
    text: "Hier liegen besonders viele Zapfen. Der gelbe Fleck liegt auf der Sehachse und liefert das schärfste und farbigste Bild."
  });
  var foveaRim = new THREE.Mesh(
    new THREE.RingGeometry(0.27, 0.36, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#a7662f"), side: THREE.DoubleSide })
  );
  foveaRim.position.set(-0.35, 0, -2.195);
  posteriorGroup.add(foveaRim);

  var disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#e4d2ad"), side: THREE.DoubleSide })
  );
  disc.position.set(-0.82, -0.18, -2.15);
  posteriorGroup.add(disc);
  var discRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.022, 6, 40),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#8f6036") })
  );
  discRing.position.set(-0.82, -0.18, -2.14);
  posteriorGroup.add(discRing);
  lab.addTip(disc, {
    name: "Blinder Fleck (Papille)",
    term: "Austrittsstelle des Sehnervs",
    text: "Hier verlässt der Sehnerv das Auge. An dieser Stelle fehlen Lichtsinneszellen; das Gehirn ergänzt die Lücke."
  });

  var nerveGroup = new THREE.Group();
  var nerveCurves = [];
  for (var ni = 0; ni < 11; ni += 1) {
    var spread = (ni - 5) * 0.055;
    var start = new THREE.Vector3(-0.82 + spread * 0.35, -0.18 + spread * 0.35, -2.13);
    var mid = new THREE.Vector3(-1.05 + spread * 0.6, -0.22 + spread * 0.6, -3.4);
    var end = new THREE.Vector3(-1.55 + spread * 0.9, -0.35 + spread * 0.9, -5.7);
    var curve = new THREE.CatmullRomCurve3([start, mid, end]);
    nerveCurves.push(curve);
    var strand = Lab.tube(curve, 0.024 + (ni % 3) * 0.005, mat(palette.ink, { roughness: 0.56, clippingPlanes: false }), { segments: 64, radialSegments: 6 });
    strand.castShadow = true;
    nerveGroup.add(strand);
  }
  var nerveCore = Lab.tube(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.82, -0.18, -2.14),
    new THREE.Vector3(-1.08, -0.24, -3.5),
    new THREE.Vector3(-1.55, -0.35, -5.7)
  ]), 0.075, new THREE.MeshStandardMaterial({ color: new THREE.Color("#d9c8a8"), roughness: 0.54 }), { segments: 64, radialSegments: 8 });
  nerveGroup.add(nerveCore);
  var nerveSheath = Lab.tube(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.82, -0.18, -2.14),
    new THREE.Vector3(-1.08, -0.24, -3.5),
    new THREE.Vector3(-1.55, -0.35, -5.7)
  ]), 0.19, new THREE.MeshStandardMaterial({
    color: new THREE.Color("#e2d5bb"),
    roughness: 0.5,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  }), { segments: 64, radialSegments: 10 });
  nerveGroup.add(nerveSheath);
  var artery = Lab.tube(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.8, -0.1, -2.14), new THREE.Vector3(-1.2, -0.1, -3.2), new THREE.Vector3(-1.55, -0.22, -5.4)
  ]), 0.022, new THREE.MeshBasicMaterial({ color: new THREE.Color("#b5534d") }), { segments: 48, radialSegments: 5 });
  var vein = Lab.tube(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.84, -0.22, -2.14), new THREE.Vector3(-1.2, -0.36, -3.2), new THREE.Vector3(-1.58, -0.45, -5.4)
  ]), 0.025, new THREE.MeshBasicMaterial({ color: new THREE.Color("#5a83a0") }), { segments: 48, radialSegments: 5 });
  nerveGroup.add(artery, vein);
  posteriorGroup.add(nerveGroup);
  lab.addTip(nerveGroup, {
    name: "Sehnerv (Nervus opticus)",
    term: "Hirnnerv II",
    text: "Der Sehnerv bündelt die Fortsätze der Ganglienzellen und leitet die Signale zum Gehirn. Die zentralen Blutgefäße versorgen die Netzhaut."
  });

  /* a few visible scleral vessels */
  var vesselMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color("#a34f4b"), transparent: true, opacity: 0.6 });
  [
    [[-1.9, 1.2, 1.0], [-1.7, 1.8, 0.2], [-1.2, 2.05, -0.8]],
    [[-2.1, -0.4, 1.0], [-2.2, 0.5, 0.1], [-1.8, 1.3, -0.9]],
    [[-1.3, -1.7, 1.0], [-1.6, -1.9, 0.0], [-1.3, -1.8, -1.0]]
  ].forEach(function (points) {
    var vessel = Lab.tube(points.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }), 0.018, vesselMaterial, { segments: 32, radialSegments: 4 });
    posteriorGroup.add(vessel);
  });

  /* ---------- movable object and light rays ---------- */
  var objectGroup = new THREE.Group();
  var objectGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 16),
    new THREE.MeshBasicMaterial({ color: palette.accent })
  );
  objectGroup.add(objectGlow);
  var objectHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.24, 32),
    new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
  );
  objectGroup.add(objectHalo);
  var objectArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.44, 12),
    new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.8 })
  );
  objectArrow.rotation.x = -Math.PI / 2;
  objectArrow.position.z = 0.35;
  objectGroup.add(objectArrow);
  var objectLight = new THREE.PointLight(palette.accent, 0.55, 4.5, 2);
  objectGroup.add(objectLight);
  scene.add(objectGroup);

  var rayCount = 7;
  var rayPositions = new Float32Array(rayCount * 2 * 2 * 3);
  var rayGeometry = new THREE.BufferGeometry();
  rayGeometry.setAttribute("position", new THREE.BufferAttribute(rayPositions, 3));
  var rayMaterial = new THREE.LineBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false });
  var rays = new THREE.LineSegments(rayGeometry, rayMaterial);
  rays.frustumCulled = false;
  scene.add(rays);
  var photonGeometry = new THREE.SphereGeometry(0.045, 10, 8);
  var photonMaterial = new THREE.MeshBasicMaterial({ color: palette.accent2, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  var photons = [];
  for (var pi = 0; pi < 21; pi += 1) {
    var photon = new THREE.Mesh(photonGeometry, photonMaterial);
    photon.visible = false;
    scene.add(photon);
    photons.push(photon);
  }

  var focusGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    Lab.glowMaterial(palette.accent, { opacity: 0, pulse: 0.16 })
  );
  focusGlow.position.set(-0.2, 0, -2.18);
  focusGlow.renderOrder = 4;
  scene.add(focusGlow);

  var nervePulses = [];
  for (var np = 0; np < 16; np += 1) {
    var pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 8),
      new THREE.MeshBasicMaterial({ color: palette.accent2, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    pulse.visible = false;
    scene.add(pulse);
    nervePulses.push({ mesh: pulse, curveIndex: np % nerveCurves.length, offset: (np / 16) * 0.9 });
  }

  /* ---------- micro-zoom retina group ---------- */
  var detailGroup = new THREE.Group();
  detailGroup.position.set(-0.38, 0.05, -2.04);
  detailGroup.visible = false;
  scene.add(detailGroup);
  var detailBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 1.65, 0.08),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#3d2418") })
  );
  detailBase.position.z = -0.18;
  detailGroup.add(detailBase);
  var detailLight = new THREE.PointLight(0xffffff, 0.7, 7, 2);
  detailLight.position.set(0, 0, 1.8);
  detailGroup.add(detailLight);

  var rodsGroup = new THREE.Group();
  var conesGroup = new THREE.Group();
  var bipolarGroup = new THREE.Group();
  var ganglionGroup = new THREE.Group();
  detailGroup.add(rodsGroup, conesGroup, bipolarGroup, ganglionGroup);
  var rodMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color("#a9d2de"), roughness: 0.4, emissive: new THREE.Color("#286173"), emissiveIntensity: 0.35 });
  var coneMaterials = [
    new THREE.MeshStandardMaterial({ color: new THREE.Color("#d94b3f"), roughness: 0.36, emissive: new THREE.Color("#8c1d14"), emissiveIntensity: 0.42 }),
    new THREE.MeshStandardMaterial({ color: new THREE.Color("#6dad4f"), roughness: 0.36, emissive: new THREE.Color("#366d1f"), emissiveIntensity: 0.42 }),
    new THREE.MeshStandardMaterial({ color: new THREE.Color("#527fd1"), roughness: 0.36, emissive: new THREE.Color("#1f3f8a"), emissiveIntensity: 0.42 })
  ];
  for (var ri = 0; ri < 7; ri += 1) {
    var rod = new THREE.Group();
    var rodBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.55, 8), rodMaterial);
    rodBody.position.z = 0.28;
    rod.add(rodBody);
    var rodTip = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), rodMaterial);
    rodTip.position.z = 0.58;
    rod.add(rodTip);
    rod.position.set(-0.82 + ri * 0.25, -0.52, 0);
    rodsGroup.add(rod);
  }
  for (var co = 0; co < 4; co += 1) {
    var cone = new THREE.Group();
    var coneBody = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.48, 12), coneMaterials[co % 3]);
    coneBody.rotation.x = Math.PI / 2;
    coneBody.position.z = 0.24;
    cone.add(coneBody);
    var coneTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), coneMaterials[co % 3]);
    coneTip.position.z = 0.49;
    cone.add(coneTip);
    cone.position.set(-0.55 + co * 0.32, -0.25, 0.02);
    conesGroup.add(cone);
  }
  var bipolarMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color("#d3a13e"), roughness: 0.42, emissive: new THREE.Color("#71500b"), emissiveIntensity: 0.3 });
  var ganglionMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color("#9fc45d"), roughness: 0.42, emissive: new THREE.Color("#4e6818"), emissiveIntensity: 0.3 });
  for (var bi = 0; bi < 5; bi += 1) {
    var bipolar = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), bipolarMaterial);
    bipolar.position.set(-0.72 + bi * 0.36, 0.06, 0.55);
    bipolar.scale.z = 1.5;
    bipolarGroup.add(bipolar);
  }
  for (var gi = 0; gi < 4; gi += 1) {
    var ganglion = new THREE.Group();
    var soma = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), ganglionMaterial);
    soma.scale.set(1, 1, 0.9);
    ganglion.add(soma);
    var axon = Lab.tube([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.16, 0.1, 0.35),
      new THREE.Vector3(0.28, 0.2, 0.9)
    ], 0.018, new THREE.MeshBasicMaterial({ color: palette.accent }), { segments: 18, radialSegments: 4 });
    ganglion.add(axon);
    ganglion.position.set(-0.65 + gi * 0.42, 0.5, 0.98);
    ganglionGroup.add(ganglion);
  }
  lab.addTip(rodsGroup, {
    name: "Stäbchen",
    term: "Lichtsinneszelle für Hell-Dunkel",
    text: "Stäbchen sind sehr lichtempfindlich, unterscheiden aber keine Farben. Sie helfen beim Sehen in der Dämmerung."
  });
  lab.addTip(conesGroup, {
    name: "Zapfen",
    term: "Lichtsinneszelle für Farben",
    text: "Zapfen brauchen mehr Licht, ermöglichen aber Farbsehen und Schärfe. Es gibt Rot-, Grün- und Blau-Zapfen."
  });
  lab.addTip(bipolarGroup, {
    name: "Bipolare Zellen",
    term: "Zwischenzellen der Netzhaut",
    text: "Bipolare Zellen verbinden die Lichtsinneszellen mit den Ganglienzellen. Sie leiten das Signal weiter."
  });
  lab.addTip(ganglionGroup, {
    name: "Ganglienzellen",
    term: "Ausgangszellen der Netzhaut",
    text: "Ganglienzellen bündeln die Signale vieler Sinneszellen. Ihre Fortsätze bilden den Sehnerv."
  });
  var detailAnchors = {
    rods: new THREE.Object3D(), cones: new THREE.Object3D(), bipolar: new THREE.Object3D(), ganglion: new THREE.Object3D()
  };
  detailAnchors.rods.position.set(-0.82, -0.35, 0.56); rodsGroup.add(detailAnchors.rods);
  detailAnchors.cones.position.set(-0.55, -0.06, 0.52); conesGroup.add(detailAnchors.cones);
  detailAnchors.bipolar.position.set(-0.35, 0.08, 0.78); bipolarGroup.add(detailAnchors.bipolar);
  detailAnchors.ganglion.position.set(-0.42, 0.52, 1.30); ganglionGroup.add(detailAnchors.ganglion);
  lab.addPin(detailAnchors.rods, "Stäbchen", { name: "Stäbchen", term: "Hell-Dunkel-Sehen", text: "Sehr lichtempfindlich, aber ohne Farbunterscheidung." });
  lab.addPin(detailAnchors.cones, "Zapfen", { name: "Zapfen", term: "Farbsehen", text: "Drei Typen für Rot, Grün und Blau; brauchen mehr Licht." });
  lab.addPin(detailAnchors.bipolar, "Bipolare Zellen", { name: "Bipolare Zellen", term: "Zwischenzellen", text: "Verbinden Lichtsinneszellen und Ganglienzellen." });
  lab.addPin(detailAnchors.ganglion, "Ganglienzellen", { name: "Ganglienzellen", term: "Sehnerv-Ursprung", text: "Bündeln die Signale und leiten sie in den Sehnerv." });

  /* ---------- interaction state ---------- */
  var state = {
    signalOn: false,
    signalTime: 0,
    phase: 0,
    accommodation: 0.5,
    light: 0.5,
    distanceCm: 313,
    pupilScale: 1,
    lensScale: 1,
    ciliaryScale: 1,
    zoom: false,
    section: true,
    irisColor: "brown",
    layers: { sclera: true, choroid: true, retina: true, vitreous: true }
  };
  var targetPupil = 1;
  var targetLens = 1;
  var targetCiliary = 1;
  var objectZ = 7.2;
  var pointerAcc = state.accommodation;
  var pointerLight = state.light;

  function formatDistance(cm) {
    if (cm >= 100) { return (cm / 100).toFixed(1).replace(".", ",") + " m"; }
    return Math.round(cm) + " cm";
  }
  function setPhaseUI(active) {
    document.querySelectorAll("[data-eye-phase]").forEach(function (button) {
      var index = Number(button.dataset.eyePhase);
      button.classList.toggle("is-active", active && index === state.phase);
      button.setAttribute("aria-pressed", active && index === state.phase ? "true" : "false");
    });
  }

  function updateRayGeometry() {
    var array = rayGeometry.attributes.position.array;
    var focus = new THREE.Vector3(-0.2, -0.16, -2.18);
    var pupilRadius = 0.39;
    var object = new THREE.Vector3(0, 0.26, objectZ);
    for (var i = 0; i < rayCount; i += 1) {
      var a = (i / rayCount) * Math.PI * 2;
      var pupilPoint = new THREE.Vector3(Math.cos(a) * pupilRadius, Math.sin(a) * pupilRadius, 1.94);
      var offset = i * 12;
      array[offset] = object.x; array[offset + 1] = object.y; array[offset + 2] = object.z;
      array[offset + 3] = pupilPoint.x; array[offset + 4] = pupilPoint.y; array[offset + 5] = pupilPoint.z;
      array[offset + 6] = pupilPoint.x; array[offset + 7] = pupilPoint.y; array[offset + 8] = pupilPoint.z;
      array[offset + 9] = focus.x + (pupilPoint.x * 0.05); array[offset + 10] = focus.y + (pupilPoint.y * 0.05); array[offset + 11] = focus.z;
    }
    rayGeometry.attributes.position.needsUpdate = true;
    rays.geometry.computeBoundingSphere();
  }

  function updateObjectAndRays() {
    objectZ = 7.2 - 4.25 * state.accommodation;
    objectGroup.position.set(0, 0.26, objectZ);
    objectGroup.scale.setScalar(0.9 + state.accommodation * 0.12);
    updateRayGeometry();
  }

  function setAccommodation(value) {
    state.accommodation = Lab.clamp(value, 0, 1);
    state.distanceCm = 600 - 575 * state.accommodation;
    pointerAcc = state.accommodation;
    updateObjectAndRays();
    var distanceOutput = document.getElementById("eye-distance-out");
    var distanceLabel = document.getElementById("eye-distance-label");
    if (distanceOutput) { distanceOutput.textContent = formatDistance(state.distanceCm); }
    if (distanceLabel) { distanceLabel.textContent = state.accommodation < 0.35 ? "Fern" : state.accommodation > 0.68 ? "Nah" : "Mittel"; }
    var lensOut = document.getElementById("eye-lens-out");
    var ciliaryOut = document.getElementById("eye-ciliary-out");
    if (lensOut) { lensOut.textContent = state.accommodation > 0.6 ? "stark gewölbt" : state.accommodation < 0.35 ? "flach" : "mittel"; }
    if (ciliaryOut) { ciliaryOut.textContent = state.accommodation > 0.6 ? "kontrahiert" : state.accommodation < 0.35 ? "entspannt" : "mittel"; }
  }

  function setLight(value) {
    state.light = Lab.clamp(value, 0, 1);
    pointerLight = state.light;
    targetPupil = 1.28 - state.light * 0.74;
    var lightOut = document.getElementById("eye-light-out");
    var pupilOut = document.getElementById("eye-pupil-out");
    if (lightOut) { lightOut.textContent = state.light < 0.25 ? "dunkel" : state.light > 0.7 ? "hell" : "mittel"; }
    if (pupilOut) { pupilOut.textContent = (2.8 + targetPupil * 3.6).toFixed(1).replace(".", ",") + " mm"; }
    rayMaterial.opacity = 0.23 + state.light * 0.6;
    objectGlow.material.opacity = 0.6 + state.light * 0.4;
  }

  function setSignalOn(value) {
    state.signalOn = Boolean(value);
    state.signalTime = 0;
    state.phase = state.signalOn ? 1 : 0;
    var toggle = document.getElementById("eye-toggle-signal");
    if (toggle) {
      toggle.setAttribute("aria-pressed", state.signalOn ? "true" : "false");
      toggle.textContent = state.signalOn ? "Reizumwandlung stoppen" : "Reizumwandlung & Signalweg aktivieren";
    }
    setPhaseUI(state.signalOn);
  }

  function setPhase(index) {
    state.phase = Lab.clamp(Number(index) || 1, 1, 3);
    state.signalTime = (state.phase - 1) * 2.4;
    if (!state.signalOn) {
      state.signalOn = true;
      var toggle = document.getElementById("eye-toggle-signal");
      if (toggle) {
        toggle.setAttribute("aria-pressed", "true");
        toggle.textContent = "Reizumwandlung stoppen";
      }
    }
    setPhaseUI(true);
  }

  function setIrisColor(name) {
    state.irisColor = name;
    var colors = { brown: "#8a5b3e", blue: "#4f8ea8", green: "#5f8a5a" };
    irisMaterial.color.set(colors[name] || colors.brown);
    irisFibers.forEach(function (line) {
      line.material.color.set(name === "blue" ? "#2d5a70" : name === "green" ? "#355b39" : "#4f3427");
    });
    document.querySelectorAll("[data-iris-color]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.irisColor === name ? "true" : "false");
      button.classList.toggle("is-active", button.dataset.irisColor === name);
    });
  }

  function setLayer(name, visible) {
    state.layers[name] = visible;
    var map = { sclera: sclera, choroid: choroid, retina: retina, vitreous: vitreous };
    if (map[name]) { map[name].visible = visible && !state.zoom; }
  }

  function setSection(enabled) {
    state.section = Boolean(enabled);
    cutRimGroup.visible = state.section && !state.zoom;
    var button = document.getElementById("eye-section-toggle");
    if (button) {
      button.textContent = state.section ? "Schnittkanten: an" : "Schnittkanten: aus";
      button.setAttribute("aria-pressed", state.section ? "true" : "false");
    }
  }

  function setZoom(value) {
    state.zoom = Boolean(value);
    detailGroup.visible = state.zoom;
    anteriorGroup.visible = !state.zoom;
    sclera.visible = !state.zoom && state.layers.sclera;
    choroid.visible = !state.zoom && state.layers.choroid;
    retina.visible = !state.zoom && state.layers.retina;
    vitreous.visible = !state.zoom && state.layers.vitreous;
    cutRimGroup.visible = !state.zoom && state.section;
    var button = document.getElementById("eye-zoom");
    if (button) {
      button.textContent = state.zoom ? "Mikro-Zoom beenden" : "Mikro-Zoom Netzhaut";
      button.setAttribute("aria-pressed", state.zoom ? "true" : "false");
      button.classList.toggle("is-active", state.zoom);
    }
    if (state.zoom) {
      rays.visible = false;
      objectGroup.visible = false;
      focusGlow.visible = false;
      photons.forEach(function (photon) { photon.visible = false; });
      nervePulses.forEach(function (entry) { entry.mesh.visible = false; });
      lab.tweenCamera([0.15, 0.15, 4.2], [-0.38, 0.05, -1.9], 1.0);
    } else {
      rays.visible = true;
      objectGroup.visible = true;
      focusGlow.visible = true;
      lab.tweenCamera(lab.homePosition.toArray(), lab.homeTarget.toArray(), 0.9);
    }
  }

  function tour(key) {
    setZoom(false);
    var positions = {
      overview: [[3.4, 3.2, 14.8], [0, 0, -0.2]],
      cornea: [[2.2, 1.6, 7.0], [0, 0, 1.9]],
      iris: [[1.8, 1.2, 6.0], [0, 0, 1.8]],
      retina: [[3.4, 2.0, -1.2], [-0.2, 0, -2.0]],
      nerve: [[-9, 5.5, -10], [-1.2, -0.2, -3.4]]
    };
    var entry = positions[key] || positions.overview;
    lab.tweenCamera(entry[0], entry[1], 0.95);
    document.querySelectorAll("[data-eye-tour]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.eyeTour === key);
      button.setAttribute("aria-pressed", button.dataset.eyeTour === key ? "true" : "false");
    });
  }

  function resetAll() {
    state.accommodation = 0.5;
    state.light = 0.5;
    pointerAcc = 0.5;
    pointerLight = 0.5;
    state.signalOn = false;
    state.signalTime = 0;
    state.phase = 0;
    setZoom(false);
    setSection(true);
    setSignalOn(false);
    var distance = document.getElementById("eye-distance");
    var light = document.getElementById("eye-light");
    if (distance) { distance.value = "50"; }
    if (light) { light.value = "50"; }
    setAccommodation(0.5);
    setLight(0.5);
    ["sclera", "choroid", "retina", "vitreous"].forEach(function (name) {
      state.layers[name] = true;
      setLayer(name, true);
    });
    document.querySelectorAll("[data-eye-layer]").forEach(function (button) {
      button.setAttribute("aria-pressed", "true");
      button.classList.add("is-active");
    });
    setIrisColor("brown");
    tour("overview");
  }

  /* ---------- UI wiring ---------- */
  var toggle = document.getElementById("eye-toggle-signal");
  if (toggle) { toggle.addEventListener("click", function () { setSignalOn(!state.signalOn); }); }
  document.querySelectorAll("[data-eye-phase]").forEach(function (button) {
    button.addEventListener("click", function () { setPhase(button.dataset.eyePhase); });
  });
  var distanceSlider = document.getElementById("eye-distance");
  if (distanceSlider) { distanceSlider.addEventListener("input", function () { setAccommodation(Number(distanceSlider.value) / 100); }); }
  var lightSlider = document.getElementById("eye-light");
  if (lightSlider) { lightSlider.addEventListener("input", function () { setLight(Number(lightSlider.value) / 100); }); }
  document.querySelectorAll("[data-iris-color]").forEach(function (button) {
    button.addEventListener("click", function () { setIrisColor(button.dataset.irisColor); });
  });
  document.querySelectorAll("[data-eye-layer]").forEach(function (button) {
    button.addEventListener("click", function () {
      var name = button.dataset.eyeLayer;
      var next = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", next ? "true" : "false");
      button.classList.toggle("is-active", next);
      setLayer(name, next);
    });
  });
  var sectionToggle = document.getElementById("eye-section-toggle");
  if (sectionToggle) { sectionToggle.addEventListener("click", function () { setSection(!state.section); }); }
  var zoomButton = document.getElementById("eye-zoom");
  if (zoomButton) { zoomButton.addEventListener("click", function () { setZoom(!state.zoom); }); }
  document.querySelectorAll("[data-eye-tour]").forEach(function (button) {
    button.addEventListener("click", function () { tour(button.dataset.eyeTour); });
  });
  var pinsToggle = document.getElementById("eye-pins-toggle");
  if (pinsToggle) {
    pinsToggle.addEventListener("click", function () {
      var visible = pinsToggle.getAttribute("aria-pressed") !== "true";
      pinsToggle.setAttribute("aria-pressed", visible ? "true" : "false");
      pinsToggle.textContent = visible ? "Hotspots: an" : "Hotspots: aus";
      lab.setPinsVisible(visible);
    });
  }

  /* pins for the main anatomical landmarks */
  lab.addPin(sclera, "Lederhaut", { name: "Lederhaut (Sklera)", term: "äußere Augenhaut", text: "Feste weiße Hülle; schützt das Auge und gibt ihm Form." }, [-1.8, 1.25, 0.8]);
  lab.addPin(cornea, "Hornhaut", { name: "Hornhaut (Cornea)", term: "klare Frontscheibe", text: "Stark gewölbt; bricht das Licht und schützt das Auge." }, [-0.55, 0.55, 0.2]);
  lab.addPin(iris, "Iris & Pupille", { name: "Regenbogenhaut & Pupille", term: "Lichtblende", text: "Die Iris regelt über die Pupille, wie viel Licht ins Auge gelangt." }, [-0.85, 0.6, 0.1]);
  lab.addPin(lens, "Linse", { name: "Augenlinse", term: "Akkommodation", text: "Verändert ihre Krümmung: stark für die Nähe, flach für die Ferne." }, [-0.55, -0.45, 0.2]);
  lab.addPin(fovea, "Gelber Fleck", { name: "Gelber Fleck (Fovea)", term: "schärfstes Sehen", text: "Hier liegen besonders viele Zapfen; das Bild ist am schärfsten." }, [-0.25, 0.25, 0.1]);
  lab.addPin(nerveGroup, "Sehnerv", { name: "Sehnerv (Nervus opticus)", term: "Signalweg zum Gehirn", text: "Leitet die Sehsignale gebündelt zum Gehirn." }, [-0.8, 0.4, -1.2]);
  lab.addPin(disc, "Blinder Fleck", { name: "Blinder Fleck (Papille)", term: "keine Lichtsinneszellen", text: "Austrittsstelle des Sehnervs; das Gehirn ergänzt die Lücke." }, [-0.35, 0.2, 0.1]);

  /* ---------- scope ---------- */
  var scopeCanvas = document.getElementById("eye-scope");
  var scope = scopeCanvas ? Lab.createScope(scopeCanvas) : null;
  var scopeRate = document.getElementById("eye-scope-rate");

  /* ---------- animation ---------- */
  setAccommodation(state.accommodation);
  setLight(state.light);
  setIrisColor("brown");
  setSection(true);
  setSignalOn(false);
  setZoom(false);
  tour("overview");

  lab.onUpdate(function (dt, time) {
    targetLens = 0.86 + state.accommodation * 0.38;
    targetCiliary = 1 - state.accommodation * 0.16;
    state.lensScale = Lab.damp(state.lensScale, targetLens, 7, dt);
    state.ciliaryScale = Lab.damp(state.ciliaryScale, targetCiliary, 7, dt);
    state.pupilScale = Lab.damp(state.pupilScale, targetPupil, 6, dt);
    lens.scale.set(1 + (state.lensScale - 1) * 0.35, 1 + (state.lensScale - 1) * 0.35, state.lensScale);
    lensNucleus.scale.set(1 + (state.lensScale - 1) * 0.35, 1 + (state.lensScale - 1) * 0.35, 0.62 + (state.lensScale - 1) * 0.4);
    ciliary.scale.set(state.ciliaryScale, state.ciliaryScale, 1);
    ciliaryRidges.scale.set(state.ciliaryScale, state.ciliaryScale, 1);
    zonuleGroup.scale.set(1 + (1 - state.ciliaryScale) * 0.4, 1 + (1 - state.ciliaryScale) * 0.4, 1);
    pupil.scale.setScalar(state.pupilScale);
    pupilBacking.scale.setScalar(Math.max(0.9, state.pupilScale));
    iris.rotation.z = Math.sin(time * 0.2) * 0.008;
    objectHalo.rotation.z = time * 0.55;
    objectHalo.scale.setScalar(1 + Math.sin(time * 2.2) * 0.08);
    objectArrow.position.z = 0.35 + Math.sin(time * 2.4) * 0.03;
    focusGlow.material.uniforms.uTime.value = time;
    focusGlow.material.uniforms.uOpacity.value = Lab.damp(focusGlow.material.uniforms.uOpacity.value, state.signalOn && state.phase >= 2 && !state.zoom ? 0.82 : 0.0, 6, dt);
    focusGlow.scale.setScalar(1 + Math.sin(time * 8) * 0.15);

    if (state.signalOn) {
      state.signalTime += dt;
      if (state.signalTime < 2.4) { state.phase = 1; }
      else if (state.signalTime < 4.8) { state.phase = 2; }
      else { state.phase = 3; }
      setPhaseUI(true);
    } else {
      state.phase = 0;
      setPhaseUI(false);
    }

    var showPhotons = state.signalOn && state.phase >= 1 && !state.zoom;
    var frequency = 4 + state.light * 30;
    var travelSpeed = 0.22 + state.light * 0.25;
    photons.forEach(function (photon, index) {
      photon.visible = showPhotons;
      if (!showPhotons) { return; }
      var total = (time * travelSpeed + index * 0.047) % 1;
      var rayIndex = index % rayCount;
      var a = (rayIndex / rayCount) * Math.PI * 2;
      var object = new THREE.Vector3(0, 0.26, objectZ);
      var pupilPoint = new THREE.Vector3(Math.cos(a) * 0.39, Math.sin(a) * 0.39, 1.94);
      var focus = new THREE.Vector3(-0.2, -0.16, -2.18);
      if (total < 0.55) {
        var k = total / 0.55;
        photon.position.lerpVectors(object, pupilPoint, k);
      } else {
        var k2 = (total - 0.55) / 0.45;
        photon.position.lerpVectors(pupilPoint, focus, k2);
      }
      photon.material.opacity = 0.55 + Math.sin(total * Math.PI) * 0.45;
    });

    if (state.signalOn && state.phase >= 2) {
      var receptorPulse = 0.5 + Math.sin(time * 9) * 0.35;
      rodsGroup.children.forEach(function (rod, index) {
        rod.scale.setScalar(1 + receptorPulse * 0.08);
        rod.rotation.z = Math.sin(time * 2.5 + index) * 0.03;
      });
      conesGroup.children.forEach(function (cone, index) {
        cone.scale.setScalar(1 + receptorPulse * 0.12);
        cone.rotation.z = Math.cos(time * 2.2 + index) * 0.035;
      });
    } else {
      rodsGroup.children.forEach(function (rod) { rod.scale.setScalar(1); });
      conesGroup.children.forEach(function (cone) { cone.scale.setScalar(1); });
    }

    nervePulses.forEach(function (entry, index) {
      var active = state.signalOn && state.phase >= 3;
      entry.mesh.visible = active;
      if (!active) { return; }
      var t = (time * (0.25 + state.light * 0.55) + entry.offset) % 1;
      var curve = nerveCurves[entry.curveIndex];
      var point = curve.getPoint(t);
      entry.mesh.position.copy(point);
      entry.mesh.material.opacity = 0.55 + Math.sin(t * Math.PI) * 0.45;
    });

    if (scope) {
      scope.draw(time, frequency, 0.3 + state.light * 0.6, state.signalOn && state.phase >= 3);
      if (scopeRate) { scopeRate.textContent = Math.round(frequency) + " Impulse/s"; }
    }
  });

  /* public debug surface, useful for the station/tour and for tests */
  window.EyeLab = {
    state: state,
    lab: lab,
    setAccommodation: setAccommodation,
    setLight: setLight,
    setSignalOn: setSignalOn,
    setPhase: setPhase,
    setIrisColor: setIrisColor,
    setSection: setSection,
    setZoom: setZoom,
    tour: tour
  };
})();
