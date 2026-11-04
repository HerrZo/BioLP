/* 3D-Funktionsschnittmodell Ohr · Biologie 8
   Outer ear funnel, vibrating tympanic membrane, articulated ossicles,
   three orthogonal semicircular canals, logarithmic cochlea, basilar
   membrane travelling wave, hair-cell transduction and auditory nerve. */
(function () {
  "use strict";

  var container = document.getElementById("ear-stage");
  if (!container || !window.THREE || !window.Lab3D) { return; }
  var Lab = window.Lab3D;

  var sectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.06);
  var clipping = [sectionPlane];
  var stageAspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
  var earCamera = stageAspect >= 1.4 ? [7.2, 5.0, 13.8] : stageAspect >= 1.05 ? [8.2, 5.6, 16.8] : [9.5, 6.5, 22.0];
  var lab = Lab.createScene(container, {
    camera: earCamera,
    target: [0.2, 0.1, 0],
    minDistance: 3,
    maxDistance: 36,
    shadowY: -3.6,
    shadowOpacity: 0.22,
    ambient: 0.32,
    hemi: 0.42,
    keyLight: 1.1,
    onReset: function () { resetAll(); }
  });
  if (!lab) { return; }
  var scene = lab.scene;
  var palette = lab.palette;

  function mat(color, options) {
    options = options || {};
    options.side = options.side || THREE.DoubleSide;
    if (options.clipping !== false) { options.clippingPlanes = clipping; }
    return Lab.standard(color, options);
  }
  function bone(color, options) {
    options = options || {};
    options.roughness = options.roughness != null ? options.roughness : 0.48;
    options.metalness = options.metalness != null ? options.metalness : 0.03;
    return mat(color, options);
  }
  function add(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  var outerGroup = new THREE.Group();
  var middleGroup = new THREE.Group();
  var innerGroup = new THREE.Group();
  var nerveGroup = new THREE.Group();
  scene.add(outerGroup, middleGroup, innerGroup, nerveGroup);

  /* ---------- pinna: helix, antihelix, concha ---------- */
  var skin = new THREE.Color("#c88b72");
  var skinDark = new THREE.Color("#9f6554");
  var cartilage = new THREE.Color("#d8b397");
  var helixPoints = [
    new THREE.Vector3(-5.26, 1.72, 0.10),
    new THREE.Vector3(-5.38, 2.18, 0.02),
    new THREE.Vector3(-5.62, 2.34, -0.12),
    new THREE.Vector3(-5.82, 2.08, -0.24),
    new THREE.Vector3(-5.88, 1.48, -0.30),
    new THREE.Vector3(-5.72, 0.76, -0.25),
    new THREE.Vector3(-5.50, 0.18, -0.12),
    new THREE.Vector3(-5.38, -0.56, 0.02),
    new THREE.Vector3(-5.56, -1.12, 0.08),
    new THREE.Vector3(-5.80, -1.30, -0.02),
    new THREE.Vector3(-5.94, -1.02, -0.18),
    new THREE.Vector3(-5.86, -0.40, -0.28),
    new THREE.Vector3(-5.62, 0.22, -0.34)
  ];
  var helix = Lab.tube(helixPoints, 0.16, mat(skin, { roughness: 0.6, clipping: true }), { segments: 180, radialSegments: 9 });
  outerGroup.add(helix);
  var antihelix = Lab.tube([
    new THREE.Vector3(-5.42, 1.55, -0.02),
    new THREE.Vector3(-5.56, 1.08, -0.10),
    new THREE.Vector3(-5.50, 0.52, -0.08),
    new THREE.Vector3(-5.36, -0.06, 0.02),
    new THREE.Vector3(-5.47, -0.62, 0.00)
  ], 0.075, mat(skinDark, { roughness: 0.62 }), { segments: 90, radialSegments: 7 });
  outerGroup.add(antihelix);
  var concha = new THREE.Mesh(
    new THREE.SphereGeometry(0.92, 40, 28, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(cartilage, { roughness: 0.56, side: THREE.DoubleSide })
  );
  concha.rotation.x = Math.PI / 2;
  concha.position.set(-5.48, 0.10, -0.42);
  concha.scale.set(0.72, 0.98, 0.52);
  outerGroup.add(concha);

  var pinnaShape = new THREE.Shape();
  pinnaShape.moveTo(0.0, 2.10);
  pinnaShape.bezierCurveTo(0.62, 2.05, 0.92, 1.18, 0.72, 0.48);
  pinnaShape.bezierCurveTo(0.54, -0.10, 0.78, -0.74, 0.44, -1.28);
  pinnaShape.bezierCurveTo(0.16, -1.74, -0.24, -1.62, -0.38, -0.98);
  pinnaShape.bezierCurveTo(-0.50, -0.24, -0.33, 0.40, -0.40, 0.98);
  pinnaShape.bezierCurveTo(-0.48, 1.58, -0.24, 2.08, 0.0, 2.10);
  var pinnaPlate = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pinnaShape, { depth: 0.10, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 24 }),
    mat(skin, { roughness: 0.62 })
  );
  pinnaPlate.rotation.y = Math.PI / 2;
  pinnaPlate.position.set(-6.02, 0.0, 0.0);
  pinnaPlate.castShadow = true;
  pinnaPlate.receiveShadow = true;
  outerGroup.add(pinnaPlate);
  lab.addTip(outerGroup, {
    name: "Ohrmuschel",
    term: "Aurikula",
    text: "Die gestufte Ohrmuschel fängt Schallwellen auf, bündelt sie und hilft, die Richtung einer Schallquelle zu bestimmen."
  });
  var tragus = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 14),
    mat(skin, { roughness: 0.62 })
  );
  tragus.position.set(-5.70, -0.16, -0.26);
  tragus.scale.set(0.62, 1.15, 0.55);
  outerGroup.add(tragus);

  /* ---------- outer auditory canal, half open by section ---------- */
  var canalCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.28, 0.14, -0.05),
    new THREE.Vector3(-4.55, 0.10, -0.02),
    new THREE.Vector3(-3.72, 0.02, 0.00),
    new THREE.Vector3(-2.72, -0.02, 0.01),
    new THREE.Vector3(-1.72, 0.00, 0.01),
    new THREE.Vector3(-1.34, 0.02, 0.00)
  ]);
  var canal = Lab.tube(canalCurve, 0.36, mat(skinDark, { roughness: 0.62 }), { segments: 120, radialSegments: 12 });
  outerGroup.add(canal);
  var canalLining = Lab.tube(canalCurve, 0.27, mat(new THREE.Color("#6f403a"), { roughness: 0.72, side: THREE.BackSide }), { segments: 120, radialSegments: 10 });
  outerGroup.add(canalLining);
  lab.addTip(canal, {
    name: "Gehörgang",
    term: "Meatus acusticus externus",
    text: "Der leicht geschwungene Gehörgang leitet den Schall zum Trommelfell. Härchen und Ohrenschmalz halten Staub und Fremdkörper zurück."
  });

  /* ---------- tympanic membrane with vertex ripple ---------- */
  var tmSegments = 32;
  var tmRings = 16;
  var tmRadius = 0.68;
  var tmPositions = [0, 0, 0];
  var tmIndices = [];
  var tmBase = [{ y: 0, z: 0, r: 0 }];
  for (var tr = 1; tr <= tmRings; tr += 1) {
    var trr = (tr / tmRings) * tmRadius;
    for (var ts = 0; ts < tmSegments; ts += 1) {
      var ta = (ts / tmSegments) * Math.PI * 2;
      var ty2 = Math.cos(ta) * trr;
      var tz2 = Math.sin(ta) * trr;
      tmBase.push({ y: ty2, z: tz2, r: trr });
      tmPositions.push(0, ty2, tz2);
    }
  }
  for (var ts1 = 0; ts1 < tmSegments; ts1 += 1) {
    var next1 = (ts1 + 1) % tmSegments;
    tmIndices.push(0, 1 + ts1, 1 + next1);
  }
  for (var tr2 = 1; tr2 < tmRings; tr2 += 1) {
    var ringA = 1 + (tr2 - 1) * tmSegments;
    var ringB = 1 + tr2 * tmSegments;
    for (var ts2 = 0; ts2 < tmSegments; ts2 += 1) {
      var next2 = (ts2 + 1) % tmSegments;
      var a0 = ringA + ts2;
      var a1 = ringA + next2;
      var b0 = ringB + ts2;
      var b1 = ringB + next2;
      tmIndices.push(a0, b0, a1, a1, b0, b1);
    }
  }
  var tmGeometry = new THREE.BufferGeometry();
  tmGeometry.setAttribute("position", new THREE.Float32BufferAttribute(tmPositions, 3));
  tmGeometry.setIndex(tmIndices);
  tmGeometry.computeVertexNormals();
  var tmMesh = new THREE.Mesh(
    tmGeometry,
    mat(new THREE.Color("#e5c9a8"), { roughness: 0.52, transparent: true, opacity: 0.86, side: THREE.DoubleSide, clipping: false })
  );
  tmMesh.position.x = -1.34;
  middleGroup.add(tmMesh);
  var tmFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.035, 7, 80),
    bone(palette.ink, { roughness: 0.5 })
  );
  tmFrame.rotation.y = Math.PI / 2;
  tmFrame.position.x = -1.34;
  middleGroup.add(tmFrame);
  lab.addTip(tmMesh, {
    name: "Trommelfell",
    term: "Membrana tympani",
    text: "Das Trommelfell ist eine dünne Membran. Schallwellen bringen es zum Schwingen; die Bewegung wird auf die Gehörknöchelchen übertragen."
  });

  /* ---------- ossicles as articulated composite bodies ---------- */
  var malleusGroup = new THREE.Group();
  var incusGroup = new THREE.Group();
  var stapesGroup = new THREE.Group();
  middleGroup.add(malleusGroup, incusGroup, stapesGroup);

  var malleusHandle = Lab.tube([
    new THREE.Vector3(-1.31, 0.02, 0.00),
    new THREE.Vector3(-1.02, 0.14, 0.01),
    new THREE.Vector3(-0.78, 0.30, 0.02),
    new THREE.Vector3(-0.63, 0.38, 0.02)
  ], 0.07, bone(new THREE.Color("#e3d3b5"), { roughness: 0.44 }), { segments: 52, radialSegments: 8 });
  malleusGroup.add(malleusHandle);
  var malleusHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 20, 16),
    bone(new THREE.Color("#eadcbe"), { roughness: 0.4 })
  );
  malleusHead.position.set(-0.50, 0.43, 0.02);
  malleusHead.scale.set(1.15, 0.86, 0.9);
  malleusGroup.add(malleusHead);
  var malleusNeck = Lab.tube([
    new THREE.Vector3(-0.62, 0.36, 0.01),
    new THREE.Vector3(-0.55, 0.41, 0.02),
    new THREE.Vector3(-0.47, 0.44, 0.02)
  ], 0.065, bone(new THREE.Color("#e6d7b9"), { roughness: 0.44 }), { segments: 18, radialSegments: 6 });
  malleusGroup.add(malleusNeck);
  lab.addTip(malleusGroup, {
    name: "Hammer",
    term: "Malleus",
    text: "Der Hammer ist mit seinem Griff am Trommelfell befestigt. Sein Kopf bildet mit dem Amboss ein Gelenk und überträgt die Schwingung."
  });

  var incusBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.155, 20, 16),
    bone(new THREE.Color("#e1d0ad"), { roughness: 0.44 })
  );
  incusBody.position.set(-0.35, 0.43, 0.02);
  incusBody.scale.set(1.0, 1.1, 0.92);
  incusGroup.add(incusBody);
  var incusLong = Lab.tube([
    new THREE.Vector3(-0.31, 0.39, 0.02),
    new THREE.Vector3(-0.12, 0.34, 0.02),
    new THREE.Vector3(0.02, 0.27, 0.02),
    new THREE.Vector3(0.15, 0.22, 0.02)
  ], 0.058, bone(new THREE.Color("#decbaa"), { roughness: 0.46 }), { segments: 48, radialSegments: 7 });
  incusGroup.add(incusLong);
  var incusShort = Lab.tube([
    new THREE.Vector3(-0.38, 0.47, 0.02),
    new THREE.Vector3(-0.39, 0.62, 0.01),
    new THREE.Vector3(-0.30, 0.70, 0.00)
  ], 0.048, bone(new THREE.Color("#decbaa"), { roughness: 0.46 }), { segments: 26, radialSegments: 6 });
  incusGroup.add(incusShort);
  lab.addTip(incusGroup, {
    name: "Amboss",
    term: "Incus",
    text: "Der Amboss liegt zwischen Hammer und Steigbügel. Sein langer Fortsatz leitet die verstärkte Schwingung zum Steigbügel."
  });

  var stapesHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 16, 12),
    bone(new THREE.Color("#eadcbd"), { roughness: 0.4 })
  );
  stapesHead.position.set(0.22, 0.22, 0.02);
  stapesGroup.add(stapesHead);
  var crusOne = Lab.tube([
    new THREE.Vector3(0.24, 0.26, 0.02),
    new THREE.Vector3(0.52, 0.28, 0.01),
    new THREE.Vector3(0.82, 0.18, 0.00),
    new THREE.Vector3(0.94, 0.10, 0.00)
  ], 0.034, bone(new THREE.Color("#eadcbd"), { roughness: 0.44 }), { segments: 40, radialSegments: 6 });
  stapesGroup.add(crusOne);
  var crusTwo = Lab.tube([
    new THREE.Vector3(0.24, 0.18, 0.02),
    new THREE.Vector3(0.52, 0.12, 0.01),
    new THREE.Vector3(0.82, -0.08, 0.00),
    new THREE.Vector3(0.94, -0.10, 0.00)
  ], 0.034, bone(new THREE.Color("#eadcbd"), { roughness: 0.44 }), { segments: 40, radialSegments: 6 });
  stapesGroup.add(crusTwo);
  var footplate = new THREE.Mesh(
    new THREE.SphereGeometry(0.265, 24, 18),
    bone(new THREE.Color("#e7d8b6"), { roughness: 0.42 })
  );
  footplate.position.set(0.98, 0.0, 0.00);
  footplate.scale.set(0.075, 1.0, 0.68);
  stapesGroup.add(footplate);
  lab.addTip(stapesGroup, {
    name: "Steigbügel",
    term: "Stapes",
    text: "Der Steigbügel ist der kleinste Knochen des Menschen. Seine Fußplatte sitzt am ovalen Fenster und überträgt die Schwingung auf die Flüssigkeit der Cochlea."
  });

  var eustachian = Lab.tube([
    new THREE.Vector3(-0.18, -0.34, 0.00),
    new THREE.Vector3(-0.06, -0.86, 0.10),
    new THREE.Vector3(0.12, -1.55, 0.22),
    new THREE.Vector3(0.28, -2.25, 0.28)
  ], 0.15, mat(skinDark, { roughness: 0.68, opacity: 0.9, transparent: true }), { segments: 70, radialSegments: 9 });
  middleGroup.add(eustachian);
  lab.addTip(eustachian, {
    name: "Ohrtrompete",
    term: "Eustachische Röhre",
    text: "Die Ohrtrompete verbindet das Mittelohr mit dem Rachen. Beim Schlucken oder Gähnen gleicht sie den Druck auf beiden Seiten des Trommelfells aus."
  });

  /* ---------- oval and round windows ---------- */
  var ovalFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.29, 0.045, 8, 64),
    bone(new THREE.Color("#e8d7b8"), { roughness: 0.46 })
  );
  ovalFrame.rotation.y = Math.PI / 2;
  ovalFrame.position.set(1.03, 0.0, 0.00);
  innerGroup.add(ovalFrame);
  var ovalMembrane = new THREE.Mesh(
    new THREE.CircleGeometry(0.27, 40),
    mat(new THREE.Color("#d8a37b"), { roughness: 0.52, transparent: true, opacity: 0.72, side: THREE.DoubleSide, clipping: false })
  );
  ovalMembrane.rotation.y = Math.PI / 2;
  ovalMembrane.position.set(1.04, 0.0, 0.0);
  innerGroup.add(ovalMembrane);
  lab.addTip(ovalMembrane, {
    name: "Ovales Fenster",
    term: "Fenestra ovalis",
    text: "Die Fußplatte des Steigbügels sitzt am ovalen Fenster. Hier wird die mechanische Schwingung auf die Flüssigkeit der Cochlea übertragen."
  });
  var roundFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.035, 7, 52),
    bone(new THREE.Color("#d8c8a9"), { roughness: 0.5 })
  );
  roundFrame.rotation.y = Math.PI / 2;
  roundFrame.position.set(1.05, -0.48, 0.0);
  innerGroup.add(roundFrame);
  var roundMembrane = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 32),
    mat(new THREE.Color("#c58d78"), { roughness: 0.55, transparent: true, opacity: 0.7, side: THREE.DoubleSide, clipping: false })
  );
  roundMembrane.rotation.y = Math.PI / 2;
  roundMembrane.position.set(1.06, -0.48, 0.0);
  innerGroup.add(roundMembrane);
  lab.addTip(roundMembrane, {
    name: "Rundes Fenster",
    term: "Fenestra rotunda",
    text: "Das runde Fenster gibt der Flüssigkeit in der Cochlea nach. Es schwingt gegenphasig zum ovalen Fenster."
  });

  /* ---------- vestibular system: three orthogonal canals ---------- */
  var vestibule = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 32, 24),
    bone(new THREE.Color("#e1d2b4"), { roughness: 0.48 })
  );
  vestibule.position.set(1.55, 0.05, 0.00);
  vestibule.scale.set(1.0, 1.1, 0.95);
  innerGroup.add(vestibule);
  lab.addTip(vestibule, {
    name: "Vorhof",
    term: "Vestibulum",
    text: "Der Vorhof verbindet die Bogengänge mit der Cochlea. Hier liegen auch Sinneszellen für die Wahrnehmung von Lage und Beschleunigung."
  });
  var canalGroup = new THREE.Group();
  innerGroup.add(canalGroup);
  var canalMaterial = bone(new THREE.Color("#dfd0b1"), { roughness: 0.46 });
  var canalSpecs = [
    { position: [1.55, 0.46, 0.00], rotation: [0, 0, 0], color: "#dfd0b1" },
    { position: [1.55, 0.30, 0.00], rotation: [Math.PI / 2, 0, 0], color: "#d8c8a7" },
    { position: [1.55, 0.30, 0.00], rotation: [0, Math.PI / 2, 0], color: "#e4d5b7" }
  ];
  canalSpecs.forEach(function (spec, index) {
    var canal = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.075, 8, 64, Math.PI * 1.58),
      bone(new THREE.Color(spec.color), { roughness: 0.46 })
    );
    canal.position.set(spec.position[0], spec.position[1], spec.position[2]);
    canal.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
    canalGroup.add(canal);
    var ampulla = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 12),
      bone(new THREE.Color("#eadcbf"), { roughness: 0.44 })
    );
    ampulla.position.set(1.55 + (index === 0 ? 0.38 : index === 1 ? 0.18 : 0.0), 0.46 + (index === 2 ? 0.15 : 0.0), index === 0 ? 0.42 : 0.12);
    canalGroup.add(ampulla);
  });
  lab.addTip(canalGroup, {
    name: "Bogengänge",
    term: "Canales semicirculares",
    text: "Die drei Bogengänge stehen fast im 90-Grad-Winkel zueinander. Sie melden Drehbewegungen des Kopfes und helfen beim Gleichgewicht."
  });

  /* ---------- logarithmic cochlea ---------- */
  var cochleaCurvePoints = [];
  var turns = 2.5;
  for (var ci = 0; ci <= 260; ci += 1) {
    var ct = ci / 260;
    var angle = ct * turns * Math.PI * 2;
    var radius = 0.78 * Math.pow(0.43, ct);
    cochleaCurvePoints.push(new THREE.Vector3(1.86 + ct * 2.25, Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  var cochleaCurve = new THREE.CatmullRomCurve3(cochleaCurvePoints);
  function taperedTube(curve, radiusFn, tubularSegments, radialSegments, material) {
    var frames = curve.computeFrenetFrames(tubularSegments, false);
    var vertices = [];
    var normals = [];
    var uvs = [];
    var indices = [];
    for (var i = 0; i <= tubularSegments; i += 1) {
      var t = i / tubularSegments;
      var point = curve.getPointAt(t);
      var radius = radiusFn(t);
      var normal = frames.normals[i];
      var binormal = frames.binormals[i];
      for (var j = 0; j <= radialSegments; j += 1) {
        var a = (j / radialSegments) * Math.PI * 2;
        var sin = Math.sin(a);
        var cos = -Math.cos(a);
        var vertex = new THREE.Vector3(
          point.x + radius * (cos * normal.x + sin * binormal.x),
          point.y + radius * (cos * normal.y + sin * binormal.y),
          point.z + radius * (cos * normal.z + sin * binormal.z)
        );
        vertices.push(vertex.x, vertex.y, vertex.z);
        normals.push(cos * normal.x + sin * binormal.x, cos * normal.y + sin * binormal.y, cos * normal.z + sin * binormal.z);
        uvs.push(t, j / radialSegments);
      }
    }
    for (var ii = 1; ii <= tubularSegments; ii += 1) {
      for (var jj = 1; jj <= radialSegments; jj += 1) {
        var a2 = (radialSegments + 1) * (ii - 1) + (jj - 1);
        var b2 = (radialSegments + 1) * ii + (jj - 1);
        var c2 = (radialSegments + 1) * ii + jj;
        var d2 = (radialSegments + 1) * (ii - 1) + jj;
        indices.push(a2, b2, d2, b2, c2, d2);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return new THREE.Mesh(geo, material);
  }
  var cochleaWallMaterial = bone(new THREE.Color("#e4d5b8"), {
    roughness: 0.44,
    transparent: true,
    opacity: 0.88,
    depthWrite: true,
    side: THREE.DoubleSide
  });
  var cochleaWall = taperedTube(cochleaCurve, function (t) { return 0.25 * (1 - 0.58 * t); }, 260, 12, cochleaWallMaterial);
  innerGroup.add(cochleaWall);
  var cochleaEdgeFrames = cochleaCurve.computeFrenetFrames(160, false);
  [1, -1].forEach(function (side) {
    var edgePoints = [];
    for (var ce = 0; ce <= 160; ce += 1) {
      var cet = ce / 160;
      var cep = cochleaCurve.getPointAt(cet);
      var cer = 0.25 * (1 - 0.58 * cet);
      var cen = cochleaEdgeFrames.normals[ce];
      edgePoints.push(new THREE.Vector3(cep.x + cen.x * cer * side, cep.y + cen.y * cer * side, cep.z + cen.z * cer * side));
    }
    var edgeTube = Lab.tube(new THREE.CatmullRomCurve3(edgePoints), 0.012, new THREE.MeshBasicMaterial({ color: new THREE.Color("#b8a37e") }), { segments: 180, radialSegments: 4 });
    innerGroup.add(edgeTube);
  });
  lab.addTip(cochleaWall, {
    name: "Hörschnecke",
    term: "Cochlea",
    text: "Die Cochlea ist ein flüssigkeitsgefüllter, spiraliger Hohlraum mit 2,5 Windungen. In ihr sitzt das Corti-Organ mit den Haarsinneszellen."
  });
  var cochleaAxis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.10, 2.45, 16),
    bone(new THREE.Color("#cdbb99"), { roughness: 0.5 })
  );
  cochleaAxis.rotation.z = -Math.PI / 2;
  cochleaAxis.position.set(2.98, 0, 0);
  cochleaAxis.visible = false;
  innerGroup.add(cochleaAxis);

  /* basilar membrane ribbon */
  var membraneSegments = 220;
  var membraneFrames = cochleaCurve.computeFrenetFrames(membraneSegments, false);
  var membranePositions = [];
  var membraneNormals = [];
  var membraneBase = [];
  var membraneIndices = [];
  for (var mi = 0; mi <= membraneSegments; mi += 1) {
    var mt = mi / membraneSegments;
    var mp = cochleaCurve.getPointAt(mt);
    var mw = 0.21 * (1 - 0.62 * mt);
    var mNormal = membraneFrames.normals[mi];
    var mBinormal = membraneFrames.binormals[mi];
    var left = mp.clone().addScaledVector(mNormal, mw);
    var right = mp.clone().addScaledVector(mNormal, -mw);
    var dispNormal = mBinormal.clone();
    membraneBase.push(left.clone(), right.clone());
    membraneNormals.push(dispNormal.clone(), dispNormal.clone());
    membranePositions.push(left.x, left.y, left.z, right.x, right.y, right.z);
  }
  for (var mi2 = 0; mi2 < membraneSegments; mi2 += 1) {
    var m0 = mi2 * 2;
    var m1 = m0 + 1;
    var m2 = m0 + 2;
    var m3 = m0 + 3;
    membraneIndices.push(m0, m2, m1, m1, m2, m3);
  }
  var membraneGeometry = new THREE.BufferGeometry();
  membraneGeometry.setAttribute("position", new THREE.Float32BufferAttribute(membranePositions, 3));
  membraneGeometry.setIndex(membraneIndices);
  membraneGeometry.computeVertexNormals();
  var membrane = new THREE.Mesh(
    membraneGeometry,
    mat(new THREE.Color("#d0a160"), { roughness: 0.66, transparent: true, opacity: 0.82, side: THREE.DoubleSide })
  );
  innerGroup.add(membrane);
  lab.addTip(membrane, {
    name: "Basilarmembran",
    term: "Membrana basilaris",
    text: "Die Basilarmembran trägt das Corti-Organ. Hohe Töne erregen sie nahe der Basis, tiefe Töne weiter an der Spitze."
  });

  /* hair cells with stereocilia */
  var hairCellGroup = new THREE.Group();
  innerGroup.add(hairCellGroup);
  var hairCells = [];
  var hairBaseMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color("#d8b25f"), roughness: 0.46, emissive: new THREE.Color("#6f5218"), emissiveIntensity: 0.12 });
  var hairCount = 34;
  for (var hi = 0; hi < hairCount; hi += 1) {
    var ht = hi / (hairCount - 1);
    var hp = cochleaCurve.getPointAt(ht);
    var hNormal = membraneFrames.normals[Math.round(ht * membraneSegments)];
    var cell = new THREE.Group();
    var cellMaterial = hairBaseMaterial.clone();
    var soma = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.033, 0.15, 8), cellMaterial);
    soma.position.y = 0.075;
    cell.add(soma);
    var nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), cellMaterial);
    nucleus.position.y = 0.01;
    cell.add(nucleus);
    for (var si = 0; si < 3; si += 1) {
      var stereo = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.11, 4), cellMaterial);
      stereo.position.set((si - 1) * 0.025, 0.18, 0);
      stereo.rotation.z = (si - 1) * 0.35;
      cell.add(stereo);
    }
    cell.position.copy(hp).addScaledVector(hNormal, 0.08);
    cell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hNormal.clone().normalize());
    hairCellGroup.add(cell);
    hairCells.push({ group: cell, material: cellMaterial, t: ht });
  }
  lab.addTip(hairCellGroup, {
    name: "Haarsinneszellen",
    term: "Sinneszellen in der Hörschnecke",
    text: "Die Haarsinneszellen sitzen auf der Basilarmembran. Werden ihre Stereozilien gebogen, entsteht ein Rezeptorpotential und schließlich ein Aktionspotential im Hörnerv."
  });
  var hairPinAnchor = new THREE.Object3D();
  hairPinAnchor.position.set(2.95, 0.22, 0.0);
  hairCellGroup.add(hairPinAnchor);

  /* ---------- auditory nerve ---------- */
  var nerveCurves = [];
  for (var ni = 0; ni < 8; ni += 1) {
    var offset = (ni - 3.5) * 0.045;
    var start = new THREE.Vector3(4.12 + offset * 0.5, 0.08 + offset, -0.58 + offset * 0.3);
    var mid = new THREE.Vector3(5.10 + offset * 0.7, 0.22 + offset * 1.1, -1.12);
    var end = new THREE.Vector3(6.48 + offset * 0.9, 0.42 + offset * 1.3, -1.68);
    var curve = new THREE.CatmullRomCurve3([start, mid, end]);
    nerveCurves.push(curve);
    var strand = Lab.tube(curve, 0.026 + (ni % 3) * 0.006, bone(palette.ink, { roughness: 0.56, clipping: false }), { segments: 80, radialSegments: 6 });
    nerveGroup.add(strand);
  }
  var nerveCore = Lab.tube(new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.12, 0.08, -0.58),
    new THREE.Vector3(5.10, 0.22, -1.12),
    new THREE.Vector3(6.48, 0.42, -1.68)
  ]), 0.09, new THREE.MeshStandardMaterial({ color: new THREE.Color("#d9c8a8"), roughness: 0.54 }), { segments: 64, radialSegments: 8 });
  nerveGroup.add(nerveCore);
  var nerveSheath = Lab.tube(new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.12, 0.08, -0.58),
    new THREE.Vector3(5.10, 0.22, -1.12),
    new THREE.Vector3(6.48, 0.42, -1.68)
  ]), 0.18, new THREE.MeshStandardMaterial({ color: new THREE.Color("#e2d5bb"), roughness: 0.5, transparent: true, opacity: 0.28, depthWrite: false }), { segments: 64, radialSegments: 10 });
  nerveGroup.add(nerveSheath);
  lab.addTip(nerveGroup, {
    name: "Hörnerv",
    term: "Nervus cochlearis",
    text: "Der Hörnerv bündelt die Fortsätze der Haarsinneszellen. Er leitet die elektrischen Signale zum Gehirn."
  });
  var nervePulses = [];
  for (var np = 0; np < 18; np += 1) {
    var p = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 8),
      new THREE.MeshBasicMaterial({ color: palette.accent2, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    p.visible = false;
    nerveGroup.add(p);
    nervePulses.push({ mesh: p, curveIndex: np % nerveCurves.length, offset: (np / 18) * 0.9 });
  }

  /* ---------- pressure waves in air ---------- */
  var waveGroup = new THREE.Group();
  scene.add(waveGroup);
  var waveRings = [];
  for (var wi = 0; wi < 9; wi += 1) {
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.74, 0.026, 7, 64),
      new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.y = Math.PI / 2;
    waveGroup.add(ring);
    waveRings.push(ring);
  }
  waveGroup.visible = false;

  /* ---------- motion of the middle-ear chain ---------- */
  var middleInitial = middleGroup.position.clone();

  /* ---------- cochlea wave-crest marker ---------- */
  var crest = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 10),
    new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  innerGroup.add(crest);
  crest.visible = false;
  var crestGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    Lab.glowMaterial(palette.accent, { opacity: 0, pulse: 0.22 })
  );
  crestGlow.position.copy(cochleaCurve.getPointAt(0.55));
  crestGlow.renderOrder = 4;
  innerGroup.add(crestGlow);

  /* ---------- state ---------- */
  var state = {
    signalOn: false,
    signalTime: 0,
    phase: 0,
    frequency: 0.45,
    db: 55,
    activeT: 0.55,
    explode: false,
    transparency: 0.88,
    layers: { outer: true, middle: true, inner: true, nerve: true }
  };
  var scopeCanvas = document.getElementById("ear-scope");
  var scopeCtx = scopeCanvas ? scopeCanvas.getContext("2d") : null;
  var scopeRate = document.getElementById("ear-scope-rate");
  var phaseChips = document.querySelectorAll("[data-ear-phase]");
  var currentDb = 55;
  var currentFreq = 0.45;

  function setPhaseUI(active) {
    phaseChips.forEach(function (button) {
      var index = Number(button.dataset.earPhase);
      button.classList.toggle("is-active", active && index === state.phase);
      button.setAttribute("aria-pressed", active && index === state.phase ? "true" : "false");
    });
  }
  function setSignalOn(value) {
    state.signalOn = Boolean(value);
    state.signalTime = 0;
    state.phase = state.signalOn ? 1 : 0;
    waveGroup.visible = state.signalOn;
    var toggle = document.getElementById("ear-toggle-signal");
    if (toggle) {
      toggle.setAttribute("aria-pressed", state.signalOn ? "true" : "false");
      toggle.textContent = state.signalOn ? "Reizumwandlung stoppen" : "Reizumwandlung & Signalweg aktivieren";
    }
    setPhaseUI(state.signalOn);
  }
  function setPhase(index) {
    if (!state.signalOn) { setSignalOn(true); }
    state.phase = Lab.clamp(Number(index) || 1, 1, 4);
    state.signalTime = (state.phase - 1) * 2.1;
    setPhaseUI(true);
  }
  function hzFromNorm(value) {
    return Math.round(100 * Math.pow(80, value));
  }
  function setFrequency(value) {
    state.frequency = Lab.clamp(value, 0, 1);
    currentFreq = state.frequency;
    var hz = hzFromNorm(state.frequency);
    var out = document.getElementById("ear-frequency-out");
    var label = document.getElementById("ear-frequency-label");
    if (out) { out.textContent = hz.toLocaleString("de-DE") + " Hz"; }
    if (label) { label.textContent = state.frequency < 0.33 ? "tief" : state.frequency > 0.66 ? "hoch" : "mittel"; }
    state.activeT = 1 - state.frequency;
    crest.position.copy(cochleaCurve.getPointAt(state.activeT));
    var tonotopy = document.getElementById("ear-tonotopy-out");
    if (tonotopy) { tonotopy.textContent = state.frequency > 0.66 ? "Basis" : state.frequency < 0.33 ? "Helikotrema" : "mittlere Windung"; }
  }
  function setDb(value) {
    state.db = Lab.clamp(value, 0, 110);
    currentDb = state.db;
    var out = document.getElementById("ear-db-out");
    var warning = document.getElementById("ear-warning");
    if (out) { out.textContent = Math.round(state.db) + " dB"; }
    if (warning) {
      warning.classList.toggle("is-warning", state.db > 85);
      warning.innerHTML = state.db > 85
        ? "<strong>Lärmwarnbereich:</strong> Über 85 dB können Haarzellen dauerhaft geschädigt werden. Kürzer hören, leiser stellen und Gehörschutz nutzen."
        : "<strong>Gehörschutz:</strong> Unter 85 dB ist die Belastung meist geringer. Entscheidend sind auch Dauer und Abstand zur Schallquelle.";
    }
    var hairOut = document.getElementById("ear-hair-out");
    if (hairOut) { hairOut.textContent = state.db > 85 ? "stark belastet" : state.db > 65 ? "belastet" : "geschützt"; }
    var ampOut = document.getElementById("ear-amplitude-out");
    if (ampOut) { ampOut.textContent = state.db > 85 ? "stark" : state.db > 65 ? "mittel" : "leise"; }
  }
  function setTransparency(value) {
    state.transparency = Lab.clamp(value, 0.08, 1);
    cochleaWallMaterial.opacity = state.transparency;
    cochleaWallMaterial.depthWrite = state.transparency > 0.8;
    var out = document.getElementById("ear-transparency-out");
    var output = document.getElementById("ear-transparency-output");
    if (out) { out.textContent = Math.round(state.transparency * 100) + " %"; }
    if (output) { output.textContent = Math.round(state.transparency * 100) + " %"; }
  }
  function setLayer(name, visible) {
    state.layers[name] = Boolean(visible);
    var map = { outer: outerGroup, middle: middleGroup, inner: innerGroup, nerve: nerveGroup };
    if (map[name]) { map[name].visible = Boolean(visible); }
  }
  function setExplode(value) {
    state.explode = Boolean(value);
    var button = document.getElementById("ear-explode");
    if (button) {
      button.setAttribute("aria-pressed", state.explode ? "true" : "false");
      button.classList.toggle("is-active", state.explode);
      button.textContent = state.explode ? "Bauteile zusammenführen" : "Bauteile trennen";
    }
  }
  function resetAll() {
    state.signalOn = false;
    state.signalTime = 0;
    state.phase = 0;
    state.explode = false;
    setSignalOn(false);
    setPhaseUI(false);
    var freq = document.getElementById("ear-frequency");
    var db = document.getElementById("ear-db");
    var transparency = document.getElementById("ear-transparency");
    if (freq) { freq.value = "45"; }
    if (db) { db.value = "55"; }
    if (transparency) { transparency.value = "88"; }
    setFrequency(0.45);
    setDb(55);
    setTransparency(0.88);
    document.querySelectorAll("[data-ear-layer]").forEach(function (button) {
      button.setAttribute("aria-pressed", "true");
      button.classList.add("is-active");
      setLayer(button.dataset.earLayer, true);
    });
    setExplode(false);
    document.querySelectorAll("[data-ear-tour]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.earTour === "overview");
      button.setAttribute("aria-pressed", button.dataset.earTour === "overview" ? "true" : "false");
    });
    tour("overview");
  }

  function tour(key) {
    var positions = {
      overview: [lab.homePosition.toArray(), lab.homeTarget.toArray()],
      outer: [[-6.4, 3.0, 6.2], [-4.3, 0.1, 0]],
      middle: [[-0.3, 2.8, 5.2], [-0.3, 0.1, 0]],
      cochlea: [[3.5, 3.2, 6.0], [2.9, 0.05, 0]],
      hair: [[3.1, 1.8, 3.8], [2.9, 0.0, 0]],
      nerve: [[5.8, 2.4, 2.2], [4.5, 0.2, -0.5]]
    };
    var entry = positions[key] || positions.overview;
    lab.tweenCamera(entry[0], entry[1], 0.95);
    document.querySelectorAll("[data-ear-tour]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.earTour === key);
      button.setAttribute("aria-pressed", button.dataset.earTour === key ? "true" : "false");
    });
  }

  /* ---------- UI ---------- */
  var toggle = document.getElementById("ear-toggle-signal");
  if (toggle) { toggle.addEventListener("click", function () { setSignalOn(!state.signalOn); }); }
  phaseChips.forEach(function (button) {
    button.addEventListener("click", function () { setPhase(button.dataset.earPhase); });
  });
  var freqSlider = document.getElementById("ear-frequency");
  if (freqSlider) { freqSlider.addEventListener("input", function () { setFrequency(Number(freqSlider.value) / 100); }); }
  var dbSlider = document.getElementById("ear-db");
  if (dbSlider) { dbSlider.addEventListener("input", function () { setDb(Number(dbSlider.value)); }); }
  var transparencySlider = document.getElementById("ear-transparency");
  if (transparencySlider) { transparencySlider.addEventListener("input", function () { setTransparency(Number(transparencySlider.value) / 100); }); }
  document.querySelectorAll("[data-ear-layer]").forEach(function (button) {
    button.addEventListener("click", function () {
      var name = button.dataset.earLayer;
      var next = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", next ? "true" : "false");
      button.classList.toggle("is-active", next);
      setLayer(name, next);
    });
  });
  document.querySelectorAll("[data-ear-tour]").forEach(function (button) {
    button.addEventListener("click", function () { tour(button.dataset.earTour); });
  });
  var explodeButton = document.getElementById("ear-explode");
  if (explodeButton) { explodeButton.addEventListener("click", function () { setExplode(!state.explode); }); }
  var pinsToggle = document.getElementById("ear-pins-toggle");
  if (pinsToggle) {
    pinsToggle.addEventListener("click", function () {
      var visible = pinsToggle.getAttribute("aria-pressed") !== "true";
      pinsToggle.setAttribute("aria-pressed", visible ? "true" : "false");
      pinsToggle.textContent = visible ? "Hotspots: an" : "Hotspots: aus";
      lab.setPinsVisible(visible);
    });
  }

  /* pins: invisible anchors keep labels attached to the moving groups */
  var pinAnchors = {
    pinna: new THREE.Object3D(), tm: new THREE.Object3D(), malleus: new THREE.Object3D(),
    stapes: new THREE.Object3D(), canals: new THREE.Object3D(), cochlea: new THREE.Object3D(), nerve: new THREE.Object3D()
  };
  pinAnchors.pinna.position.set(-5.48, 0.55, 0.0); outerGroup.add(pinAnchors.pinna);
  pinAnchors.tm.position.set(-1.34, 0.35, 0.0); middleGroup.add(pinAnchors.tm);
  pinAnchors.malleus.position.set(-0.78, 0.35, 0.0); middleGroup.add(pinAnchors.malleus);
  pinAnchors.stapes.position.set(0.82, 0.12, 0.0); middleGroup.add(pinAnchors.stapes);
  pinAnchors.canals.position.set(1.55, 0.62, 0.0); innerGroup.add(pinAnchors.canals);
  pinAnchors.cochlea.position.set(2.95, 0.55, 0.0); innerGroup.add(pinAnchors.cochlea);
  pinAnchors.nerve.position.set(5.45, 0.32, -1.1); nerveGroup.add(pinAnchors.nerve);
  lab.addPin(pinAnchors.pinna, "Ohrmuschel", { name: "Ohrmuschel", term: "Aurikula", text: "Fängt Schallwellen auf und bündelt sie." });
  lab.addPin(pinAnchors.tm, "Trommelfell", { name: "Trommelfell", term: "Membrana tympani", text: "Dünne Membran; schwingt im Takt des Schalls." });
  lab.addPin(pinAnchors.malleus, "Hammer", { name: "Hammer", term: "Malleus", text: "Am Trommelfell befestigt; erstes Glied der Knöchelchenkette." });
  lab.addPin(pinAnchors.stapes, "Steigbügel", { name: "Steigbügel", term: "Stapes", text: "Kleinster Knochen; Fußplatte am ovalen Fenster." });
  lab.addPin(pinAnchors.canals, "Bogengänge", { name: "Bogengänge", term: "Gleichgewichtsorgan", text: "Drei orthogonale Kanäle melden Drehbewegungen." });
  lab.addPin(pinAnchors.cochlea, "Cochlea", { name: "Hörschnecke", term: "Cochlea", text: "2,5 Windungen; hier entstehen aus Schwingungen Nervensignale." });
  lab.addPin(hairPinAnchor, "Haarzellen", { name: "Haarsinneszellen", term: "Corti-Organ", text: "Wandeln die Auslenkung der Basilarmembran in Nervensignale um." });
  lab.addPin(pinAnchors.nerve, "Hörnerv", { name: "Hörnerv", term: "Nervus cochlearis", text: "Leitet die Signale der Haarzellen zum Gehirn." });

  /* ---------- oscilloscope ---------- */
  function fitScope() {
    if (!scopeCanvas) { return; }
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    scopeCanvas.width = Math.max(1, Math.round(scopeCanvas.clientWidth * ratio));
    scopeCanvas.height = Math.max(1, Math.round(scopeCanvas.clientHeight * ratio));
    if (scopeCtx) { scopeCtx.setTransform(ratio, 0, 0, ratio, 0, 0); }
  }
  fitScope();
  window.addEventListener("resize", fitScope);

  function drawScope(time, freq, dbNorm, soundActive, nerveActive) {
    if (!scopeCtx) { return; }
    var w = scopeCanvas.clientWidth;
    var h = scopeCanvas.clientHeight;
    if (!w || !h) { return; }
    scopeCtx.clearRect(0, 0, w, h);
    var top = 4;
    var mid = h * 0.26;
    var bottom = h * 0.94;
    scopeCtx.strokeStyle = "rgba(215,228,208,0.12)";
    scopeCtx.lineWidth = 1;
    for (var i = 0; i <= 6; i += 1) {
      var x = (w / 6) * i;
      scopeCtx.beginPath();
      scopeCtx.moveTo(x, top);
      scopeCtx.lineTo(x, bottom);
      scopeCtx.stroke();
    }
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, mid);
    scopeCtx.lineTo(w, mid);
    scopeCtx.stroke();
    scopeCtx.beginPath();
    scopeCtx.moveTo(0, h * 0.64);
    scopeCtx.lineTo(w, h * 0.64);
    scopeCtx.stroke();
    scopeCtx.fillStyle = "rgba(215,228,208,0.55)";
    scopeCtx.font = "10px Manrope, sans-serif";
    scopeCtx.fillText("Schall", 6, top + 11);
    scopeCtx.fillText("Hörnerv", 6, h * 0.64 + 11);
    var cycles = 1.5 + freq * 6.5;
    var amp = 3 + dbNorm * 14;
    scopeCtx.strokeStyle = "rgba(232,241,219,0.95)";
    scopeCtx.lineWidth = 1.5;
    scopeCtx.beginPath();
    for (var sx = 0; sx <= w; sx += 2) {
      var tx = sx / w;
      var y = mid - Math.sin(tx * Math.PI * 2 * cycles + time * 5.5) * amp * (soundActive ? 1 : 0.18);
      if (sx === 0) { scopeCtx.moveTo(sx, y); } else { scopeCtx.lineTo(sx, y); }
    }
    scopeCtx.stroke();
    if (nerveActive) {
      var spikeY = h * 0.78;
      var rate = 4 + dbNorm * 24 + freq * 4;
      var interval = 1 / rate;
      scopeCtx.strokeStyle = "rgba(216,255,138,0.96)";
      scopeCtx.lineWidth = 1.7;
      for (var q = 0; q < 18; q += 1) {
        var pos = (q / 18 + time * 0.37) % 1;
        var px = pos * w;
        if (Math.sin((time * 0.37 + q / 18) * Math.PI * 2) < 0.2) { continue; }
        scopeCtx.beginPath();
        scopeCtx.moveTo(px - 4, spikeY + 7);
        scopeCtx.lineTo(px, spikeY + 7);
        scopeCtx.lineTo(px + 1.5, spikeY - 7);
        scopeCtx.lineTo(px + 3, spikeY + 9);
        scopeCtx.lineTo(px + 6, spikeY);
        scopeCtx.stroke();
      }
      if (scopeRate) { scopeRate.textContent = Math.round(rate) + " Impulse/s"; }
    } else if (scopeRate) {
      scopeRate.textContent = "Signal aus";
    }
  }

  /* ---------- init ---------- */
  setFrequency(0.45);
  setDb(55);
  setTransparency(0.88);
  setSignalOn(false);
  setPhaseUI(false);
  tour("overview");
  var explodeFactor = 0;
  var tmPhase = 0;
  var membranePhase = 0;

  lab.onUpdate(function (dt, time) {
    var freq = state.frequency;
    var dbNorm = state.db / 110;
    var active = state.signalOn;
    var mechActive = active && state.phase >= 2;
    var innerActive = active && state.phase >= 3;
    var nerveActive = active && state.phase >= 4;
    var omega = 2 * Math.PI * (0.55 + freq * 2.6);
    tmPhase += dt * omega;
    membranePhase += dt * (1.4 + freq * 3.2);
    var amp = 0.012 + dbNorm * 0.085;

    /* Tympanic membrane vertex ripple */
    var tmPos = tmMesh.geometry.attributes.position;
    for (var vi = 0; vi < tmBase.length; vi += 1) {
      var base = tmBase[vi];
      var edge = Math.max(0.1, 1 - base.r / 0.9);
      var wave = Math.sin(base.r * 16 - tmPhase) * amp * edge;
      tmPos.setX(vi, wave * (active ? 1 : 0.25));
    }
    tmPos.needsUpdate = true;
    tmMesh.geometry.computeVertexNormals();

    /* ossicle chain: tiny kinematic rotation + piston motion */
    var lever = mechActive ? Math.sin(tmPhase * 0.96) * amp * 5.4 : 0;
    malleusGroup.rotation.z = lever * 0.22;
    incusGroup.rotation.z = -lever * 0.18;
    stapesGroup.position.x = lever * 0.26;
    stapesGroup.position.y = lever * 0.06;
    ovalMembrane.scale.setScalar(1 + lever * 0.045);
    roundMembrane.scale.setScalar(1 - lever * 0.05);

    /* pressure rings in air */
    var spacing = 1.55 - freq * 1.10;
    waveRings.forEach(function (ring, index) {
      var travel = ((time * (1.15 + freq * 1.5) + index * spacing) % 5.3);
      var x = -9.2 + travel;
      ring.position.set(x, 0.02, 0);
      var scale = 0.85 + Math.min(0.9, Math.max(0, (x + 9.2) / 5.3) * 0.9);
      ring.scale.setScalar(scale * (0.6 + dbNorm * 0.75));
      ring.material.opacity = active ? (0.22 + dbNorm * 0.62) * (1 - Math.min(0.7, Math.max(0, (x + 9.2) / 5.3) * 0.7)) : 0;
      ring.visible = active;
    });

    /* cochlea travelling wave */
    var activeT = state.activeT;
    var waveWidth = 0.14 + freq * 0.12;
    var membranePos = membrane.geometry.attributes.position;
    for (var pi = 0; pi < membraneBase.length; pi += 1) {
      var pbase = membraneBase[pi];
      var pnorm = membraneNormals[pi];
      var t = (Math.floor(pi / 2)) / membraneSegments;
      var envelope = Math.exp(-Math.pow((t - activeT) / waveWidth, 2));
      var displacement = innerActive ? Math.sin(membranePhase - t * Math.PI * 5.5) * amp * 0.72 * envelope : 0;
      membranePos.setXYZ(pi, pbase.x + pnorm.x * displacement, pbase.y + pnorm.y * displacement, pbase.z + pnorm.z * displacement);
    }
    membranePos.needsUpdate = true;
    membrane.geometry.computeVertexNormals();
    crest.position.copy(cochleaCurve.getPointAt(activeT));
    crest.visible = innerActive;
    crest.material.opacity = innerActive ? 0.55 + Math.sin(time * 5) * 0.25 : 0;
    crest.scale.setScalar(1 + Math.sin(time * 4.5) * 0.16);
    crestGlow.position.copy(crest.position);
    crestGlow.material.uniforms.uTime.value = time;
    crestGlow.material.uniforms.uOpacity.value = innerActive ? 0.42 + dbNorm * 0.35 : 0;

    /* hair cells: tonotopic activation and bending */
    hairCells.forEach(function (hair) {
      var distance = Math.abs(hair.t - activeT);
      var near = Math.max(0, 1 - distance / 0.22);
      var glow = innerActive ? near * (0.55 + dbNorm * 0.7) : 0;
      hair.material.emissiveIntensity = 0.1 + glow;
      hair.material.color.set(state.db > 85 && innerActive && near > 0.4 ? "#c65b4e" : "#d8b25f");
      hair.group.rotation.z = Math.sin(membranePhase + hair.t * 8) * (innerActive ? 0.04 + near * 0.09 : 0.008);
      hair.group.scale.setScalar(1 + glow * 0.08);
    });

    /* nerve spikes */
    nervePulses.forEach(function (entry) {
      entry.mesh.visible = nerveActive;
      if (!entry.mesh.visible) { return; }
      var t = (time * (0.35 + dbNorm * 0.7) + entry.offset) % 1;
      var curve = nerveCurves[entry.curveIndex];
      var point = curve.getPoint(t);
      entry.mesh.position.copy(point);
      entry.mesh.material.opacity = 0.55 + Math.sin(t * Math.PI) * 0.45;
    });

    /* explode view */
    var explodeTarget = state.explode ? 1 : 0;
    explodeFactor = Lab.damp(explodeFactor, explodeTarget, 5, dt);
    outerGroup.position.x = -0.55 * explodeFactor;
    middleGroup.position.y = 0.48 * explodeFactor;
    innerGroup.position.x = 0.55 * explodeFactor;
    nerveGroup.position.x = 1.0 * explodeFactor;

    /* phase logic */
    if (state.signalOn) {
      state.signalTime += dt;
      if (state.signalTime < 2.1) { state.phase = 1; }
      else if (state.signalTime < 4.2) { state.phase = 2; }
      else if (state.signalTime < 6.3) { state.phase = 3; }
      else { state.phase = 4; }
      setPhaseUI(true);
    } else {
      state.phase = 0;
      setPhaseUI(false);
    }

    drawScope(time, freq, dbNorm, active, nerveActive);
    if (scopeRate && nerveActive) {
      scopeRate.textContent = Math.round(5 + dbNorm * 28 + freq * 4) + " Impulse/s";
    } else if (scopeRate && active) {
      scopeRate.textContent = "Wandler aktiv";
    }

    /* subtle idle motion */
    canalGroup.rotation.y = Math.sin(time * 0.32) * 0.012;
    cochleaWall.rotation.x = Math.sin(time * 0.26) * 0.01;
  });

  window.EarLab = {
    state: state,
    lab: lab,
    setFrequency: setFrequency,
    setDb: setDb,
    setSignalOn: setSignalOn,
    setPhase: setPhase,
    setTransparency: setTransparency,
    setLayer: setLayer,
    setExplode: setExplode,
    tour: tour
  };
})();
