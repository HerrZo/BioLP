/* Interactive tools for the biology learning pages.
   Each tool reads its markup, adds controls, and writes a plain-language readout.
   The static markup remains the no-script fallback. */
(function () {
  "use strict";

  var BODY_FONT = getComputedStyle(document.body).fontFamily || "Georgia, serif";
  function de(value, digits) {
    return Number(value).toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function button(label, value, active) {
    return '<button class="btn btn--quiet btn--small" type="button" data-tool-choice="' + esc(value) + '" aria-pressed="' + (active ? "true" : "false") + '">' + esc(label) + "</button>";
  }
  function setReadout(figure, html) {
    var node = figure.querySelector("[data-tool-readout], [data-level-readout], [data-exp-readout], [data-model-readout], [data-chart-readout], [data-source-readout], [data-eval-readout], [data-base-readout]");
    if (node) { node.innerHTML = html; }
  }
  function initOnce(figure, key) {
    if (figure.dataset[key] === "true") { return false; }
    figure.dataset[key] = "true";
    return true;
  }

  var initializers = {};

  initializers["system-levels"] = function (figure) {
    if (!initOnce(figure, "initLevels")) { return; }
    var data = {
      molekuel: ["Molekül", "Ein Enzym, ein DNA-Abschnitt oder ein Pigment. Typische Frage: Wie ist der Stoff aufgebaut, und welche Funktion hat diese Struktur?"],
      zelle: ["Zelle", "Eine Nervenzelle, eine Bakterienzelle oder eine Pflanzenzelle. Typische Frage: Wie arbeiten Organellen und Membranen zusammen?"],
      gewebe: ["Gewebe", "Ein Verband gleichartiger Zellen, etwa Muskel- oder Nervengewebe. Typische Frage: Wie entsteht aus Zellen eine gemeinsame Leistung?"],
      organ: ["Organ", "Herz, Lunge oder Blatt. Typische Frage: Wie trägt der Bau des Organs zu seiner Aufgabe im Organismus bei?"],
      organismus: ["Organismus", "Ein einzelnes Lebewesen. Typische Frage: Wie koordiniert der Körper Reize, Stoffwechsel und Verhalten?"],
      population: ["Population", "Alle Individuen einer Art in einem Gebiet. Typische Frage: Wie verändern sich Allelfrequenzen über Generationen?"],
      oekosystem: ["Ökosystem", "Eine Biozönose mit ihrem Lebensraum. Typische Frage: Wie fließen Stoffe und Energie zwischen Organismen und Umwelt?"],
      biosphaere: ["Biosphäre", "Die Gesamtheit der lebenden Systeme auf der Erde. Typische Frage: Wie wirken globale Stoffkreisläufe und Klima zusammen?"]
    };
    var buttons = $$("[data-level-btn]", figure);
    function show(key) {
      var entry = data[key];
      if (!entry) { return; }
      buttons.forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.levelBtn === key ? "true" : "false"); });
      setReadout(figure, "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]));
    }
    buttons.forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.levelBtn); }); });
    show("molekuel");
  };

  initializers["experiment"] = function (figure) {
    if (!initOnce(figure, "initExperiment")) { return; }
    var question = figure.querySelector("#exp-question");
    var uv = figure.querySelector("#exp-uv");
    var av = figure.querySelector("#exp-av");
    var control = figure.querySelector("#exp-control");
    var sample = figure.querySelector("#exp-n");
    var controls = figure.querySelector("[data-tool-controls]");
    if (controls) {
      controls.innerHTML = '<button class="btn btn--quiet btn--small" type="button" data-exp-check>Plan prüfen</button>';
    }
    function evaluate() {
      var correct = {
        uv: "farbe",
        av: "rate",
        control: "gleich",
        sample: "gross"
      };
      var points = 0;
      var notes = [];
      if (uv && uv.value === correct.uv) { points += 1; } else { notes.push("Die unabhängige Variable ist die Lichtfarbe, nicht die gemessene Rate."); }
      if (av && av.value === correct.av) { points += 1; } else { notes.push("Die abhängige Variable ist die Fotosyntheserate."); }
      if (control && control.value === correct.control) { points += 1; } else { notes.push("Alle anderen Bedingungen müssen gleich bleiben, sonst ist der Effekt nicht eindeutig."); }
      if (sample && sample.value === correct.sample) { points += 1; } else { notes.push("Mehrere Pflanzen pro Gruppe sind nötig, um Zufall auszuschließen."); }
      var verdict = points === 4 ? "Der Plan ist testbar." : points >= 2 ? "Der Plan ist teilweise testbar, aber noch nicht sauber." : "Der Plan ist so nicht testbar.";
      setReadout(figure, "<strong>" + esc(verdict) + "</strong> " + esc(notes.join(" ")));
    }
    var check = figure.querySelector("[data-exp-check]");
    if (check) { check.addEventListener("click", evaluate); }
    [uv, av, control, sample].forEach(function (select) { if (select) { select.addEventListener("change", evaluate); } });
    evaluate();
  };

  initializers["model-compare"] = function (figure) {
    if (!initOnce(figure, "initModels")) { return; }
    var models = {
      dna: ["DNA-Doppelhelix", "Stärke: Speicherung, Basenpaarung, Replikation. Grenze: Genregulation und Chromatinstruktur werden nicht gezeigt."],
      enzyme: ["Schlüssel-Schloss", "Stärke: räumliche Spezifität von Enzym und Substrat. Grenze: Flexibilität, Kinetik und Denaturierung brauchen ein erweitertes Modell."],
      selection: ["Selektionsmodell", "Stärke: Veränderung von Merkmalen in Populationen über Generationen. Grenze: Es erklärt nicht die Entstehung eines einzelnen Fossils."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    if (controls) {
      controls.innerHTML = button("DNA", "dna", true) + button("Enzym", "enzyme", false) + button("Selektion", "selection", false);
    }
    function show(key) {
      var entry = models[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      setReadout(figure, "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]));
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("dna");
  };

  initializers["chart-read"] = function (figure) {
    if (!initOnce(figure, "initChart")) { return; }
    var statements = {
      a: ["Die Rate steigt mit der Lichtintensität und erreicht ein Plateau.", true, "Die Kurve steigt zunächst und flacht dann ab. Das ist eine Beschreibung des Musters."],
      b: ["Mehr Licht führt immer zu mehr Fotosynthese.", false, "Die Kurve erreicht ein Plateau. Ab einem Punkt bringt mehr Licht keinen weiteren Anstieg."],
      c: ["Die Pflanze verbraucht bei hoher Lichtintensität mehr Licht.", false, "Das Diagramm zeigt die Rate, nicht den Verbrauch. Diese Aussage ist aus den Daten nicht ableitbar."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    if (controls) {
      controls.innerHTML = button("Aussage A", "a", true) + button("Aussage B", "b", false) + button("Aussage C", "c", false);
    }
    function show(key) {
      var entry = statements[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      setReadout(figure, "<strong>" + (entry[1] ? "Von den Daten getragen." : "Nicht von den Daten getragen.") + "</strong> " + esc(entry[2]));
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("a");
  };

  initializers["source-check"] = function (figure) {
    if (!initOnce(figure, "initSources")) { return; }
    var sources = {
      study: ["Originalstudie", "Höchste Nachprüfbarkeit: Methode, Stichprobe und Interessen sind dokumentiert. Grenze: Das Setting ist oft eng, die Übertragbarkeit muss geprüft werden."],
      article: ["Wissenschaftsartikel", "Guter Überblick über mehrere Studien. Grenze: Vereinfachung und Auswahl durch die Autorin oder den Autor."],
      post: ["Social-Media-Post", "Schnelle Verbreitung, aber keine nachprüfbare Methode, keine Stichprobe und kein Datum. Für eine biologische Argumentation ungeeignet."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    if (controls) {
      controls.innerHTML = button("Originalstudie", "study", true) + button("Wissenschaftsartikel", "article", false) + button("Social-Media-Post", "post", false);
    }
    function show(key) {
      var entry = sources[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      setReadout(figure, "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]));
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("study");
  };

  initializers["evaluation"] = function (figure) {
    if (!initOnce(figure, "initEvaluation")) { return; }
    var weights = { health: 4, safety: 4, access: 3, cost: 2 };
    var optionA = { health: 5, safety: 4, access: 3, cost: 2 };
    var optionB = { health: 4, safety: 2, access: 5, cost: 4 };
    var labels = { health: "Wirksamkeit", safety: "Sicherheit", access: "Gerechtigkeit", cost: "Kosten" };
    function score(option) {
      var sum = 0;
      var weightSum = 0;
      Object.keys(weights).forEach(function (key) {
        sum += weights[key] * option[key];
        weightSum += weights[key];
      });
      return weightSum ? sum / weightSum : 0;
    }
    function update() {
      $$("[data-weight]", figure).forEach(function (input) {
        weights[input.dataset.weight] = Number(input.value);
        var output = figure.querySelector('[data-weight-out="' + input.dataset.weight + '"]');
        if (output) { output.textContent = input.value; }
      });
      var a = score(optionA);
      var b = score(optionB);
      var winner = a === b ? "Die Optionen liegen gleichauf." : a > b ? "Die strengere Zulassung liegt vorn." : "Die breite Zulassung liegt vorn.";
      setReadout(figure, "<strong>" + esc(winner) + "</strong> Strengere Zulassung: " + de(a, 1) + " von 5. Breite Zulassung: " + de(b, 1) + " von 5. Die Gewichtung entscheidet mit; begründe sie.");
    }
    $$("[data-weight]", figure).forEach(function (input) { input.addEventListener("input", update); });
    update();
  };

  initializers["base-pair"] = function (figure) {
    if (!initOnce(figure, "initBasePair")) { return; }
    var pairs = { A: ["T", "U"], T: ["A", "A"], G: ["C", "C"], C: ["G", "G"] };
    var buttons = $$("[data-base]", figure);
    var selected = figure.querySelector("[data-base-selected]");
    var at = figure.querySelector("[data-base-pair-at]");
    var gc = figure.querySelector("[data-base-pair-gc]");
    function show(base) {
      var pair = pairs[base];
      buttons.forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.base === base ? "true" : "false"); });
      if (selected) { selected.textContent = "Gewählt: " + base + ". Partner: " + pair[0] + "."; }
      if (at && gc) {
        var isGC = base === "G" || base === "C";
        at.hidden = isGC;
        gc.hidden = !isGC;
      }
      setReadout(figure, "<strong>" + esc(base) + " paart mit " + esc(pair[0]) + " in der DNA und mit " + esc(pair[1]) + " in der RNA.</strong> A und T bilden zwei, G und C drei Wasserstoffbrücken. Die Strukturformeln sind schematisch; die Wasserstoffbrücken sind hervorgehoben.");
    }
    buttons.forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.base); }); });
    show("A");
  };

  var CODONS = {
    UUU: "Phe", UUC: "Phe", UUA: "Leu", UUG: "Leu",
    CUU: "Leu", CUC: "Leu", CUA: "Leu", CUG: "Leu",
    AUU: "Ile", AUC: "Ile", AUA: "Ile", AUG: "Met",
    GUU: "Val", GUC: "Val", GUA: "Val", GUG: "Val",
    UCU: "Ser", UCC: "Ser", UCA: "Ser", UCG: "Ser",
    CCU: "Pro", CCC: "Pro", CCA: "Pro", CCG: "Pro",
    ACU: "Thr", ACC: "Thr", ACA: "Thr", ACG: "Thr",
    GCU: "Ala", GCC: "Ala", GCA: "Ala", GCG: "Ala",
    UAU: "Tyr", UAC: "Tyr", UAA: "Stopp", UAG: "Stopp",
    CAU: "His", CAC: "His", CAA: "Gln", CAG: "Gln",
    AAU: "Asn", AAC: "Asn", AAA: "Lys", AAG: "Lys",
    GAU: "Asp", GAC: "Asp", GAA: "Glu", GAG: "Glu",
    UGU: "Cys", UGC: "Cys", UGA: "Stopp", UGG: "Trp",
    CGU: "Arg", CGC: "Arg", CGA: "Arg", CGG: "Arg",
    AGU: "Ser", AGC: "Ser", AGA: "Arg", AGG: "Arg",
    GGU: "Gly", GGC: "Gly", GGA: "Gly", GGG: "Gly"
  };
  function complementDNA(base) {
    return ({ A: "U", T: "A", G: "C", C: "G" })[base] || "";
  }
  initializers["codon"] = function (figure) {
    if (!initOnce(figure, "initCodon")) { return; }
    var input = figure.querySelector("#codon-input");
    var mode = figure.querySelector("#codon-mode");
    var output = figure.querySelector("[data-codon-output]");
    var run = figure.querySelector("[data-codon-run]");
    function translate() {
      if (!input || !output) { return; }
      var raw = input.value.toUpperCase().replace(/[^ATGCU]/g, "");
      if (!raw) {
        output.textContent = "Bitte eine Sequenz aus A, T, G, C oder U eingeben.";
        return;
      }
      var mrna = "";
      if (mode.value === "dna-template") {
        mrna = raw.split("").map(complementDNA).join("");
      } else if (mode.value === "dna-coding") {
        mrna = raw.replace(/T/g, "U");
      } else {
        mrna = raw.replace(/T/g, "U");
      }
      var start = mrna.indexOf("AUG");
      var from = start >= 0 ? start : 0;
      var coding = mrna.slice(from);
      var codons = [];
      var amino = [];
      for (var i = 0; i + 3 <= coding.length; i += 3) {
        var codon = coding.slice(i, i + 3);
        var aa = CODONS[codon] || "?";
        codons.push(codon);
        amino.push(aa);
        if (aa === "Stopp") { break; }
      }
      var grouped = codons.join(" ");
      var protein = amino.join(" ");
      var note = start >= 0 ? "Startcodon AUG gefunden." : "Kein AUG gefunden; die Übersetzung beginnt am ersten Triplett.";
      if (coding.length % 3 !== 0) { note += " Der Rest von " + (coding.length % 3) + " Base(n) am Ende wird nicht übersetzt."; }
      output.innerHTML = '<div><strong>mRNA:</strong> <span class="base">' + esc(grouped) + '</span></div>' +
        '<div><strong>Protein:</strong> <span class="aa">' + esc(protein) + '</span></div>' +
        '<div class="tool__note">' + esc(note) + '</div>';
    }
    if (run) { run.addEventListener("click", translate); }
    if (input) { input.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); translate(); } }); }
    if (mode) { mode.addEventListener("change", translate); }
    translate();
  };

  function cssColor(name) {
    var probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.backgroundColor = "var(" + name + ")";
    document.body.appendChild(probe);
    var value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value || "#333";
  }
  function setupCanvas(canvas) {
    if (!canvas) { return null; }
    var ctx = canvas.getContext("2d");
    if (!ctx) { return null; }
    return ctx;
  }

  initializers["central-dogma"] = function (figure) {
    if (!initOnce(figure, "initDogma")) { return; }
    var canvas = figure.querySelector("canvas");
    var ctx = setupCanvas(canvas);
    if (!ctx) { return; }
    var readout = figure.querySelector("[data-dogma-readout]");
    var play = figure.querySelector("[data-dogma-play]");
    var stepButton = figure.querySelector("[data-dogma-step]");
    var reset = figure.querySelector("[data-dogma-reset]");
    var step = 0;
    var timer = null;
    var texts = [
      "Schritt 1: Die RNA-Polymerase bindet an den Promotor der DNA.",
      "Schritt 2: Die DNA wird abgelesen; die prä-mRNA entsteht.",
      "Schritt 3: Die mRNA verlässt den Zellkern durch die Kernpore.",
      "Schritt 4: Das Ribosom liest die mRNA; tRNA bringt Aminosäuren.",
      "Schritt 5: Die Polypeptidkette faltet sich zum Protein."
    ];
    function draw() {
      var w = canvas.width;
      var h = canvas.height;
      var ink = cssColor("--color-ink");
      var muted = cssColor("--color-muted");
      var accent = cssColor("--color-accent");
      var rule = cssColor("--color-rule-2");
      var sheet = cssColor("--color-sheet");
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = sheet;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = rule;
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 34, 300, 250);
      ctx.fillStyle = muted;
      ctx.font = "13px " + BODY_FONT;
      ctx.fillText("Zellkern", 48, 56);
      ctx.fillText("Zellplasma", 390, 56);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var x = 70; x <= 300; x += 4) {
        var y = 105 + Math.sin((x - 70) / 18) * 12;
        if (x === 70) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.font = "12px " + BODY_FONT;
      ctx.fillText("DNA", 72, 145);
      if (step >= 1) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (var mx = 190; mx <= 300; mx += 4) {
          var my = 105 + Math.sin((mx - 190) / 14) * 10;
          if (mx === 190) { ctx.moveTo(mx, my); } else { ctx.lineTo(mx, my); }
        }
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(180, 105, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = muted;
        ctx.fillText("RNA-Polymerase", 145, 185);
      }
      if (step >= 2) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(300, 160);
        ctx.bezierCurveTo(340, 160, 340, 160, 380, 160);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(318, 160, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = muted;
        ctx.fillText("Kernpore", 300, 200);
      }
      if (step >= 3) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(380, 160);
        ctx.bezierCurveTo(410, 130, 430, 190, 460, 160);
        ctx.stroke();
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(485, 145, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(515, 175, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = sheet;
        ctx.font = "11px " + BODY_FONT;
        ctx.fillText("Ribosom", 480, 210);
        ctx.fillStyle = muted;
        ctx.fillText("mRNA", 400, 145);
      }
      if (step >= 4) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(500, 120);
        ctx.bezierCurveTo(540, 80, 560, 110, 580, 70);
        ctx.stroke();
        for (var i = 0; i < 6; i += 1) {
          ctx.fillStyle = i % 2 ? muted : accent;
          ctx.beginPath();
          ctx.arc(520 + i * 14, 100 - i * 6, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = muted;
        ctx.fillText("Polypeptid", 520, 150);
      }
      if (readout) { readout.textContent = texts[step]; }
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      if (play) { play.textContent = "Abspielen"; play.setAttribute("aria-pressed", "false"); }
    }
    function next() {
      step = Math.min(4, step + 1);
      draw();
      if (step === 4) { stop(); }
    }
    function start() {
      if (timer) { stop(); return; }
      if (step === 4) { step = 0; draw(); }
      play.textContent = "Pause";
      play.setAttribute("aria-pressed", "true");
      timer = setInterval(next, 1400);
    }
    if (play) { play.addEventListener("click", start); }
    if (stepButton) { stepButton.addEventListener("click", function () { stop(); next(); }); }
    if (reset) { reset.addEventListener("click", function () { stop(); step = 0; draw(); }); }
    draw();
  };

  initializers["gene-switch"] = function (figure) {
    if (!initOnce(figure, "initGeneSwitch")) { return; }
    var boxes = $$("[data-gene]", figure);
    var flower = figure.querySelector("[data-flower]");
    var result = figure.querySelector("[data-gene-result]");
    function update() {
      var on = {};
      boxes.forEach(function (box) { on[box.dataset.gene] = box.checked; });
      if (!on.A) {
        if (flower) { flower.style.setProperty("--petal", "var(--color-sheet)"); flower.classList.remove("pattern"); }
        if (result) { result.textContent = "Gen A aus: Der Vorläufer bleibt farblos. Die Kette stoppt vor dem ersten Farbstoff."; }
      } else if (!on.B) {
        if (flower) { flower.style.setProperty("--petal", "var(--color-paper-3)"); flower.classList.remove("pattern"); }
        if (result) { result.textContent = "Gen B aus: Das Zwischenprodukt entsteht, aber der magenta Farbstoff fehlt."; }
      } else if (!on.C) {
        if (flower) { flower.style.setProperty("--petal", "var(--color-accent)"); flower.classList.remove("pattern"); }
        if (result) { result.textContent = "Gen C aus: Der magenta Farbstoff entsteht, aber das Muster fehlt."; }
      } else {
        if (flower) { flower.style.setProperty("--petal", "var(--color-accent)"); flower.classList.add("pattern"); }
        if (result) { result.textContent = "Alle Gene aktiv: magenta Blüte mit Muster."; }
      }
    }
    boxes.forEach(function (box) { box.addEventListener("change", update); });
    update();
  };

  initializers["chromatin"] = function (figure) {
    if (!initOnce(figure, "initChromatin")) { return; }
    var methylButton = figure.querySelector("[data-methyl-toggle]");
    var acetylButton = figure.querySelector("[data-acetyl-toggle]");
    var beads = $$("[data-chromatin-beads] circle", figure);
    var readout = figure.querySelector("[data-chromatin-readout]");
    var methylOn = false;
    var acetylOn = true;
    function update() {
      var expression = Math.max(0, Math.min(5, (acetylOn ? 4 : 0) - (methylOn ? 2 : 0) + 1));
      beads.forEach(function (bead) {
        bead.style.fill = expression >= 3 ? "var(--color-paper-3)" : "var(--color-ink)";
        bead.style.opacity = expression >= 3 ? "1" : "0.72";
      });
      if (methylButton) { methylButton.setAttribute("aria-pressed", methylOn ? "true" : "false"); }
      if (acetylButton) { acetylButton.setAttribute("aria-pressed", acetylOn ? "true" : "false"); }
      if (readout) {
        readout.innerHTML = "<strong>Genexpression: " + expression + " von 5.</strong> Methylierung: " + (methylOn ? "an" : "aus") + ", Acetylierung: " + (acetylOn ? "an" : "aus") + ". " +
          (expression >= 4 ? "Das Chromatin ist offen; die RNA-Polymerase kann binden." :
            expression >= 2 ? "Das Chromatin ist teilweise zugänglich; die Expression ist mittel." :
              "Das Chromatin ist dicht; das Gen wird kaum abgelesen.");
      }
      if (window.Bio3D && window.Bio3D.scenes["chromatin-scene"]) {
        window.Bio3D.scenes["chromatin-scene"].setState({ methyl: methylOn, acetyl: acetylOn });
      }
    }
    if (methylButton) { methylButton.addEventListener("click", function () { methylOn = !methylOn; update(); }); }
    if (acetylButton) { acetylButton.addEventListener("click", function () { acetylOn = !acetylOn; update(); }); }
    update();
  };

  initializers["pcr"] = function (figure) {
    if (!initOnce(figure, "initPCR")) { return; }
    var output = figure.querySelector("[data-pcr-cycles]");
    var readout = figure.querySelector("[data-pcr-readout]");
    var bars = $$("[data-pcr-bar]", figure);
    var minus = figure.querySelector("[data-pcr-minus]");
    var plus = figure.querySelector("[data-pcr-plus]");
    var run = figure.querySelector("[data-pcr-run]");
    var cycles = 0;
    var timer = null;
    function update() {
      var copies = Math.pow(2, cycles);
      if (output) { output.textContent = String(cycles); }
      bars.forEach(function (bar, index) {
        var value = Math.min(30, index * 5);
        var height = 8 + (value / 30) * 150;
        bar.setAttribute("height", String(height));
        bar.setAttribute("y", String(180 - height));
      });
      if (readout) {
        readout.innerHTML = "<strong>Nach " + cycles + " Zyklen:</strong> 2 hoch " + cycles + " = " +
          new Intl.NumberFormat("de-DE").format(copies) + " Kopien der Zielsequenz. " +
          (cycles >= 30 ? "Das ist die theoretische Obergrenze; in der Praxis sättigt die Reaktion." : "Jeder Zyklus verdoppelt die Zielsequenz.");
      }
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      if (run) { run.textContent = "10 Zyklen"; }
    }
    if (minus) { minus.addEventListener("click", function () { stop(); cycles = Math.max(0, cycles - 1); update(); }); }
    if (plus) { plus.addEventListener("click", function () { stop(); cycles = Math.min(30, cycles + 1); update(); }); }
    if (run) {
      run.addEventListener("click", function () {
        if (timer) { stop(); return; }
        var target = Math.min(30, cycles + 10);
        run.textContent = "Anhalten";
        timer = setInterval(function () {
          cycles = Math.min(target, cycles + 1);
          update();
          if (cycles >= target) { stop(); }
        }, 160);
      });
    }
    update();
  };

  initializers["cell-cycle"] = function (figure) {
    if (!initOnce(figure, "initCellCycle")) { return; }
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-cell-readout]");
    var phases = {
      G1: "G1-Phase: Die Zelle wächst und bereitet die DNA-Replikation vor. Kontrollpunkt: Ist genug Energie und Material vorhanden?",
      S: "S-Phase: Die DNA wird repliziert. Jedes Chromosom besteht danach aus zwei Schwesterchromatiden.",
      G2: "G2-Phase: Die Zelle prüft die Replikation und bereitet die Mitose vor. Kontrollpunkt: Ist die DNA vollständig und korrekt kopiert?",
      M: "M-Phase: Mitose und Zellteilung. Die Chromosomen werden auf zwei Tochterzellen verteilt. Kontrollpunkt: Sitzen die Chromosomen korrekt an der Spindel?"
    };
    if (controls) {
      controls.innerHTML = Object.keys(phases).map(function (key) {
        return '<button class="btn btn--quiet btn--small" type="button" data-cell-phase="' + key + '">' + key + "</button>";
      }).join("");
    }
    function show(key) {
      $$("[data-cell-phase]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.cellPhase === key ? "true" : "false"); });
      if (readout) { readout.textContent = phases[key]; }
    }
    $$("[data-cell-phase]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.cellPhase); }); });
    show("G1");
  };

  initializers["meiosis"] = function (figure) {
    if (!initOnce(figure, "initMeiosis")) { return; }
    var canvas = figure.querySelector("canvas");
    var ctx = setupCanvas(canvas);
    if (!ctx) { return; }
    var readout = figure.querySelector("[data-meiosis-readout]");
    var prev = figure.querySelector("[data-meiosis-prev]");
    var next = figure.querySelector("[data-meiosis-next]");
    var reset = figure.querySelector("[data-meiosis-reset]");
    var step = 0;
    var texts = [
      "Interphase: Die Chromosomen werden verdoppelt. Jedes Chromosom besteht aus zwei Schwesterchromatiden.",
      "Prophase I: Homologe Chromosomen paaren sich. Beim Crossing-over werden Abschnitte ausgetauscht.",
      "Metaphase I: Die homologen Paare ordnen sich an der Äquatorialebene an.",
      "Anaphase I und Telophase I: Die homologen Chromosomen werden getrennt. Es entstehen zwei haploide Zellen.",
      "Meiose II: Die Schwesterchromatiden werden getrennt.",
      "Ergebnis: Vier haploide Keimzellen mit neuen Allelkombinationen."
    ];
    function chromosome(x, y, color, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle || 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-10, -20); ctx.lineTo(-10, 20);
      ctx.moveTo(10, -20); ctx.lineTo(10, 20);
      ctx.stroke();
      ctx.restore();
    }
    function cell(x, y, r) {
      ctx.strokeStyle = cssColor("--color-rule-2");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    function draw() {
      var w = canvas.width;
      var h = canvas.height;
      var ink = cssColor("--color-ink");
      var accent = cssColor("--color-accent");
      var muted = cssColor("--color-muted");
      var sheet = cssColor("--color-sheet");
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = sheet;
      ctx.fillRect(0, 0, w, h);
      if (step <= 2) {
        cell(360, 170, 120);
        chromosome(320, 150, ink, -0.2);
        chromosome(400, 150, accent, 0.2);
        chromosome(320, 220, ink, 0.2);
        chromosome(400, 220, accent, -0.2);
        if (step === 1) {
          ctx.strokeStyle = muted;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(340, 165); ctx.lineTo(380, 165);
          ctx.moveTo(340, 205); ctx.lineTo(380, 205);
          ctx.stroke();
          ctx.fillStyle = muted;
          ctx.font = "13px " + BODY_FONT;
          ctx.fillText("Crossing-over", 330, 300);
        }
      } else if (step === 3) {
        cell(230, 170, 100);
        cell(490, 170, 100);
        chromosome(210, 160, ink, 0);
        chromosome(250, 180, accent, 0);
        chromosome(470, 160, ink, 0);
        chromosome(510, 180, accent, 0);
      } else {
        cell(170, 120, 62); cell(350, 120, 62); cell(170, 250, 62); cell(350, 250, 62);
        chromosome(160, 115, ink, 0); chromosome(180, 125, accent, 0);
        chromosome(340, 115, ink, 0); chromosome(360, 125, accent, 0);
        chromosome(160, 245, ink, 0); chromosome(180, 255, accent, 0);
        chromosome(340, 245, ink, 0); chromosome(360, 255, accent, 0);
        ctx.fillStyle = muted;
        ctx.font = "13px " + BODY_FONT;
        ctx.fillText("vier haploide Zellen", 250, 320);
      }
      if (readout) { readout.textContent = texts[step]; }
    }
    if (prev) { prev.addEventListener("click", function () { step = Math.max(0, step - 1); draw(); }); }
    if (next) { next.addEventListener("click", function () { step = Math.min(5, step + 1); draw(); }); }
    if (reset) { reset.addEventListener("click", function () { step = 0; draw(); }); }
    draw();
  };

  initializers["karyogram"] = function (figure) {
    if (!initOnce(figure, "initKaryogram")) { return; }
    var grid = figure.querySelector("[data-karyogram]");
    var readout = figure.querySelector("[data-karyogram-readout]");
    var controls = figure.querySelector("[data-tool-controls]");
    var sets = {
      typical: { label: "Typisch", pairs: {}, note: "46 Chromosomen, 23 Paare. Gonosomen: XX." },
      trisomy21: { label: "Trisomie 21", pairs: { 21: 3 }, note: "Drei Kopien von Chromosom 21. Gonosomen: XX." },
      turner: { label: "Turner, 45,X", pairs: { 23: 1 }, note: "Nur ein X-Chromosom. 45 Chromosomen." },
      klinefelter: { label: "Klinefelter, 47,XXY", pairs: { 23: 3 }, note: "Zwei X- und ein Y-Chromosom. 47 Chromosomen." }
    };
    var current = "typical";
    function render() {
      if (!grid) { return; }
      var config = sets[current];
      var html = "";
      for (var pair = 1; pair <= 23; pair += 1) {
        var count = config.pairs[pair] || 2;
        var extra = count !== 2;
        var label = pair === 23 ? (count === 1 ? "X" : count === 3 ? "XXY" : "XX") : String(pair);
        html += '<button type="button" class="chromosome' + (extra ? " extra" : "") + '" data-chromosome="' + pair + '" aria-pressed="false"><span>' + label + '</span></button>';
      }
      grid.innerHTML = html;
      if (readout) { readout.innerHTML = "<strong>" + esc(config.label) + ":</strong> " + esc(config.note); }
      $$("[data-chromosome]", grid).forEach(function (btn) {
        btn.addEventListener("click", function () {
          $$("[data-chromosome]", grid).forEach(function (other) { other.setAttribute("aria-pressed", "false"); });
          btn.setAttribute("aria-pressed", "true");
          var pair = Number(btn.dataset.chromosome);
          var count = config.pairs[pair] || 2;
          var name = pair === 23 ? "Gonosomen" : "Chromosom " + pair;
          if (readout) {
            readout.innerHTML = "<strong>" + esc(name) + ":</strong> " + count + " Chromosom" + (count === 1 ? "" : "en") + ". " +
              (pair === 21 && count === 3 ? "Das ist eine Trisomie 21." : pair === 23 && count === 1 ? "Das ist ein Turner-Syndrom (45,X)." : pair === 23 && count === 3 ? "Das ist ein Klinefelter-Syndrom (47,XXY)." : "Für dieses Paar ist die Zahl typisch.");
          }
        });
      });
    }
    if (controls) {
      controls.innerHTML = Object.keys(sets).map(function (key) {
        return '<button class="btn btn--quiet btn--small" type="button" data-karyotype="' + key + '">' + sets[key].label + "</button>";
      }).join("");
      $$("[data-karyotype]", controls).forEach(function (btn) {
        btn.addEventListener("click", function () {
          current = btn.dataset.karyotype;
          $$("[data-karyotype]", controls).forEach(function (other) { other.setAttribute("aria-pressed", other.dataset.karyotype === current ? "true" : "false"); });
          render();
        });
      });
      $$("[data-karyotype]", controls)[0].setAttribute("aria-pressed", "true");
    }
    render();
  };

  initializers["punnett"] = function (figure) {
    if (!initOnce(figure, "initPunnett")) { return; }
    var mode = figure.querySelector("[data-punnett-mode]");
    var bControls = figure.querySelector("[data-punnett-b-controls]");
    var output = figure.querySelector("[data-punnett-output]");
    var parentA = figure.querySelector('[data-punnett-parent="0"]');
    var parentB = figure.querySelector('[data-punnett-parent="1"]');
    var geneBA = figure.querySelector('[data-punnett-b-parent="0"]');
    var geneBB = figure.querySelector('[data-punnett-b-parent="1"]');
    function gametes(genotype) {
      var set = new Set();
      for (var i = 0; i < genotype.length; i += 1) {
        var first = genotype[i];
        if (i + 1 < genotype.length) {
          var second = genotype[i + 1];
          if (first.toLowerCase() === second.toLowerCase()) { continue; }
          set.add(first + second);
        } else {
          set.add(first);
        }
      }
      return Array.from(set);
    }
    function mono() {
      var g1 = parentA.value;
      var g2 = parentB.value;
      var gam1 = Array.from(new Set([g1[0], g1[1]]));
      var gam2 = Array.from(new Set([g2[0], g2[1]]));
      var rows = [];
      var counts = {};
      gam1.forEach(function (a) {
        gam2.forEach(function (b) {
          var genotype = [a, b].sort(function (x, y) { return x.toLowerCase() === y.toLowerCase() ? (x === x.toUpperCase() ? -1 : 1) : x.toLowerCase().localeCompare(y.toLowerCase()); }).join("");
          counts[genotype] = (counts[genotype] || 0) + 1;
          rows.push({ a: a, b: b, genotype: genotype });
        });
      });
      var total = gam1.length * gam2.length;
      var dominant = Object.keys(counts).filter(function (key) { return key.indexOf("A") >= 0; }).reduce(function (sum, key) { return sum + counts[key]; }, 0);
      var recessive = total - dominant;
      if (output) {
        output.innerHTML = '<table class="punnett"><thead><tr><th class="head"></th><th class="head">' + gam2.join('</th><th class="head">') + '</th></tr></thead><tbody>' +
          gam1.map(function (a) {
            return '<tr><th class="head">' + a + '</th>' + gam2.map(function (b) {
              var genotype = rows.find(function (row) { return row.a === a && row.b === b; }).genotype;
              return '<td class="cell ' + (genotype.indexOf("A") >= 0 ? "dom" : "") + '">' + genotype + "</td>";
            }).join("") + "</tr>";
          }).join("") + "</tbody></table>" +
          '<p class="tool__note">Genotypen: ' + Object.keys(counts).map(function (key) { return key + " " + counts[key]; }).join(", ") + '. Phänotypen: dominant ' + dominant + ", rezessiv " + recessive + ".</p>";
      }
    }
    function di() {
      var a1 = parentA.value;
      var a2 = parentB.value;
      var b1 = geneBA.value;
      var b2 = geneBB.value;
      var gam1 = [];
      var gam2 = [];
      a1.split("").forEach(function (a) { b1.split("").forEach(function (b) { gam1.push(a + b); }); });
      a2.split("").forEach(function (a) { b2.split("").forEach(function (b) { gam2.push(a + b); }); });
      var counts = {};
      var phenotypes = { "A-B-": 0, "A-bb": 0, "aaB-": 0, "aabb": 0 };
      var cells = [];
      gam1.forEach(function (g1) {
        gam2.forEach(function (g2) {
          var genotype = [g1[0], g2[0]].sort(function (x, y) { return x.toLowerCase().localeCompare(y.toLowerCase()); }).join("") +
            [g1[1], g2[1]].sort(function (x, y) { return x.toLowerCase().localeCompare(y.toLowerCase()); }).join("");
          counts[genotype] = (counts[genotype] || 0) + 1;
          var hasA = genotype.indexOf("A") >= 0;
          var hasB = genotype.indexOf("B") >= 0;
          var key = hasA && hasB ? "A-B-" : hasA ? "A-bb" : hasB ? "aaB-" : "aabb";
          phenotypes[key] += 1;
          cells.push({ g1: g1, g2: g2, genotype: genotype });
        });
      });
      if (output) {
        output.innerHTML = '<table class="punnett"><thead><tr><th class="head"></th><th class="head">' + gam2.join('</th><th class="head">') + '</th></tr></thead><tbody>' +
          gam1.map(function (g1) {
            return '<tr><th class="head">' + g1 + '</th>' + gam2.map(function (g2) {
              var cell = cells.find(function (entry) { return entry.g1 === g1 && entry.g2 === g2; });
              return '<td class="cell ' + (cell.genotype.indexOf("A") >= 0 && cell.genotype.indexOf("B") >= 0 ? "dom" : "") + '">' + cell.genotype + "</td>";
            }).join("") + "</tr>";
          }).join("") + "</tbody></table>" +
          '<p class="tool__note">Phänotypen: A-B- ' + phenotypes["A-B-"] + ", A-bb " + phenotypes["A-bb"] + ", aaB- " + phenotypes["aaB-"] + ", aabb " + phenotypes["aabb"] + ".</p>";
      }
    }
    function update() {
      if (bControls) { bControls.hidden = mode.value !== "di"; }
      if (mode.value === "di") { di(); } else { mono(); }
    }
    [mode, parentA, parentB, geneBA, geneBB].forEach(function (node) { if (node) { node.addEventListener("change", update); } });
    update();
  };

  initializers["gel"] = function (figure) {
    if (!initOnce(figure, "initGel")) { return; }
    var lanes = figure.querySelector("[data-gel-lanes]");
    var readout = figure.querySelector("[data-gel-readout]");
    var data = [
      { id: "mother", label: "Mutter", bands: [2, 4, 6] },
      { id: "father", label: "Vater", bands: [1, 3, 5] },
      { id: "child1", label: "Kind 1", bands: [2, 4, 6] },
      { id: "child2", label: "Kind 2", bands: [1, 3, 5] },
      { id: "child3", label: "Kind 3", bands: [2, 3, 5] }
    ];
    if (!lanes) { return; }
    lanes.innerHTML = data.map(function (lane) {
      var slots = "";
      for (var i = 1; i <= 8; i += 1) {
        slots += '<span class="gel__slot">' + (lane.bands.indexOf(i) >= 0 ? '<span class="gel__band"></span>' : "") + "</span>";
      }
      return '<button type="button" class="gel__lane" data-gel-lane="' + lane.id + '" aria-label="' + lane.label + '"><span class="gel__label">' + lane.label + "</span>" + slots + "</button>";
    }).join("");
    $$("[data-gel-lane]", lanes).forEach(function (button) {
      button.addEventListener("click", function () {
        var lane = data.find(function (entry) { return entry.id === button.dataset.gelLane; });
        $$("[data-gel-lane]", lanes).forEach(function (other) { other.classList.toggle("is-selected", other === button); });
        var match = "";
        if (lane.id === "child1") { match = " Das Muster passt zur Mutter."; }
        if (lane.id === "child2") { match = " Das Muster passt zum Vater."; }
        if (lane.id === "child3") { match = " Das Muster enthält Banden von beiden Eltern."; }
        if (readout) { readout.innerHTML = "<strong>" + esc(lane.label) + ":</strong> Banden bei Position " + lane.bands.join(", ") + "." + esc(match); }
      });
    });
  };

  initializers["homology"] = function (figure) {
    if (!initOnce(figure, "initHomology")) { return; }
    var examples = [
      { text: "Menschlicher Arm und Walflosse", answer: "homolog", why: "Beide haben denselben Grundbau aus Oberarm, Unterarm und Handknochen. Die Funktion ist verschieden, die Abstammung gemeinsam." },
      { text: "Vogelflügel und Insektenflügel", answer: "analog", why: "Beide dienen dem Fliegen, haben aber keine gemeinsame Abstammung. Die Ähnlichkeit entstand unabhängig." },
      { text: "DNA-Sequenzen von Mensch und Schimpanse", answer: "homolog", why: "Die Ähnlichkeit beruht auf gemeinsamer Abstammung. Je ähnlicher die Sequenzen, desto näher die Verwandtschaft." },
      { text: "Dornen von Rosen und Kakteen", answer: "analog", why: "Beide schützen, entstehen aber aus unterschiedlichen Organen. Die Funktion ist gleich, die Herkunft verschieden." }
    ];
    var current = 0;
    var controls = figure.querySelector("[data-tool-controls]");
    var text = figure.querySelector("[data-homology-text]");
    var readout = figure.querySelector("[data-homology-readout]");
    if (controls) {
      controls.innerHTML = examples.map(function (example, index) {
        return '<button class="btn btn--quiet btn--small" type="button" data-homology-example="' + index + '">' + (index + 1) + "</button>";
      }).join("");
    }
    function show(index) {
      current = index;
      $$("[data-homology-example]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.homologyExample) === index ? "true" : "false"); });
      if (text) { text.textContent = examples[index].text; }
      if (readout) { readout.textContent = "Homolog oder analog?"; }
    }
    $$("[data-homology-example]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { show(Number(btn.dataset.homologyExample)); });
    });
    $$("[data-homology-answer]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var example = examples[current];
        var correct = btn.dataset.homologyAnswer === example.answer;
        if (readout) {
          readout.innerHTML = "<strong>" + (correct ? "Richtig." : "Noch nicht richtig.") + "</strong> " + esc(example.why);
        }
      });
    });
    show(0);
  };

  initializers["theory"] = function (figure) {
    if (!initOnce(figure, "initTheory")) { return; }
    var statements = [
      { text: "Organe, die oft gebraucht werden, werden stärker und diese Veränderung wird vererbt.", answer: "lamarck", why: "Das ist die Lamarcksche Vorstellung von Gebrauch und Vererbung erworbener Merkmale." },
      { text: "Individuen einer Population unterscheiden sich; manche haben mehr Nachkommen als andere.", answer: "darwin", why: "Variation und unterschiedlicher Fortpflanzungserfolg sind zentrale Elemente der Darwinschen Selektion." },
      { text: "Eine Giraffe streckt den Hals, um an hohe Blätter zu kommen; der längere Hals wird vererbt.", answer: "lamarck", why: "Die gerichtete Veränderung durch Gebrauch ist Lamarck. Darwin würde Variation und Selektion betonen." },
      { text: "Die Umwelt wählt unter vorhandenen Varianten aus, statt sie gezielt zu erzeugen.", answer: "darwin", why: "Selektion wirkt auf vorhandene Variation. Sie erzeugt keine gezielte Anpassung." }
    ];
    var current = 0;
    var controls = figure.querySelector("[data-tool-controls]");
    var text = figure.querySelector("[data-theory-text]");
    var readout = figure.querySelector("[data-theory-readout]");
    var panels = $$("[data-theory-panel]", figure);
    if (controls) {
      controls.innerHTML = statements.map(function (statement, index) {
        return '<button class="btn btn--quiet btn--small" type="button" data-theory-example="' + index + '">' + (index + 1) + "</button>";
      }).join("");
    }
    function show(index) {
      current = index;
      $$("[data-theory-example]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.theoryExample) === index ? "true" : "false"); });
      panels.forEach(function (panel) { panel.classList.remove("is-active"); });
      if (text) { text.textContent = statements[index].text; }
      if (readout) { readout.textContent = "Lamarck oder Darwin?"; }
    }
    $$("[data-theory-example]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { show(Number(btn.dataset.theoryExample)); });
    });
    $$("[data-theory-answer]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var statement = statements[current];
        var correct = btn.dataset.theoryAnswer === statement.answer;
        panels.forEach(function (panel) { panel.classList.toggle("is-active", panel.dataset.theoryPanel === statement.answer); });
        if (readout) {
          readout.innerHTML = "<strong>" + (correct ? "Richtig." : "Noch nicht richtig.") + "</strong> " + esc(statement.why);
        }
      });
    });
    show(0);
  };

  initializers["isolation"] = function (figure) {
    if (!initOnce(figure, "initIsolation")) { return; }
    var barrier = figure.querySelector("[data-isolation-barrier]");
    var stepButton = figure.querySelector("[data-isolation-step]");
    var resetButton = figure.querySelector("[data-isolation-reset]");
    var readout = figure.querySelector("[data-isolation-readout]");
    var islandA = figure.querySelector("[data-island-a]");
    var islandB = figure.querySelector("[data-island-b]");
    var pA = 0.5;
    var pB = 0.5;
    var n = 20;
    function drawIsland(node, p) {
      if (!node) { return; }
      var accent = Math.round(p * n);
      var html = "";
      for (var i = 0; i < n; i += 1) {
        html += '<span class="dot' + (i >= accent ? " alt" : "") + '"></span>';
      }
      node.innerHTML = html;
    }
    function draw() {
      drawIsland(islandA, pA);
      drawIsland(islandB, pB);
      var island = figure.querySelector("[data-island]");
      if (island) { island.classList.toggle("is-barrier", Boolean(barrier && barrier.checked)); }
      if (readout) {
        readout.innerHTML = "<strong>Population A:</strong> " + (pA * 100).toFixed(0) + " % Allel 1. <strong>Population B:</strong> " + (pB * 100).toFixed(0) + " % Allel 1. <strong>Unterschied:</strong> " + (Math.abs(pA - pB) * 100).toFixed(0) + " Prozentpunkte. " +
          (barrier && barrier.checked ? "Die Barriere verhindert den Austausch." : "Ohne Barriere gleichen sich die Populationen an.");
      }
    }
    function drift(p) {
      var draws = 0;
      for (var i = 0; i < n; i += 1) { if (Math.random() < p) { draws += 1; } }
      return draws / n;
    }
    function step() {
      if (barrier && barrier.checked) {
        pA = drift(pA);
        pB = drift(pB);
      } else {
        var mean = (pA + pB) / 2;
        pA = Math.max(0, Math.min(1, mean + (Math.random() - 0.5) * 0.06));
        pB = Math.max(0, Math.min(1, mean + (Math.random() - 0.5) * 0.06));
      }
      draw();
    }
    function reset() {
      pA = 0.5;
      pB = 0.5;
      draw();
    }
    if (stepButton) { stepButton.addEventListener("click", step); }
    if (resetButton) { resetButton.addEventListener("click", reset); }
    if (barrier) { barrier.addEventListener("change", draw); }
    draw();
  };

  initializers["coevolution"] = function (figure) {
    if (!initOnce(figure, "initCoevolution")) { return; }
    var pairs = [
      { label: "Blüte und Bestäuber", a: "Blüte", b: "Bestäuber", note: "Mutualismus", aSteps: ["tiefere Blüte", "mehr Nektar", "längere Blüte"], bSteps: ["längerer Rüssel", "gezieltere Bestäubung", "längerer Rüssel"], text: "Die Blüte bietet Nektar, der Bestäuber überträgt Pollen. Beide profitieren: mutualistische Koevolution." },
      { label: "Wirt und Parasit", a: "Wirt", b: "Parasit", note: "Antagonismus", aSteps: ["Abwehr", "stärkere Abwehr", "neue Abwehr"], bSteps: ["Anpassung", "Umgehung", "neue Anpassung"], text: "Der Parasit passt sich an den Wirt an, der Wirt entwickelt Abwehrmechanismen. Antagonistische Koevolution." },
      { label: "Räuber und Beute", a: "Beute", b: "Räuber", note: "Antagonismus", aSteps: ["Tarnung", "bessere Tarnung", "neue Tarnung"], bSteps: ["Sehleistung", "bessere Sehleistung", "neue Sehleistung"], text: "Der Räuber wird schneller oder besser getarnt, die Beute entwickelt Flucht- oder Tarnstrategien. Ein Wettrüsten." },
      { label: "Pflanze und Herbivore", a: "Pflanze", b: "Herbivore", note: "Antagonismus", aSteps: ["Giftstoff", "stärkeres Gift", "neues Gift"], bSteps: ["Enzym", "besseres Enzym", "neues Enzym"], text: "Die Pflanze bildet Giftstoffe, der Herbivore Enzyme zum Abbau. Antagonistische Koevolution." }
    ];
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-coevolution-readout]");
    var visual = figure.querySelector("[data-coevolution-visual]");
    if (controls) {
      controls.innerHTML = pairs.map(function (pair, index) {
        return '<button class="btn btn--quiet btn--small" type="button" data-coevolution-pair="' + index + '">' + esc(pair.label) + "</button>";
      }).join("");
    }
    function visualFor(pair) {
      var xs = [110, 320, 530];
      var aSteps = pair.aSteps.map(function (step, index) {
        return '<text class="cv-label" x="' + xs[index] + '" y="65" text-anchor="middle">' + esc(step) + "</text>";
      }).join("");
      var bSteps = pair.bSteps.map(function (step, index) {
        return '<text class="cv-label" x="' + xs[index] + '" y="225" text-anchor="middle">' + esc(step) + "</text>";
      }).join("");
      var arrows = xs.map(function (x, index) {
        var fromA = index % 2 === 0;
        var y1 = fromA ? 90 : 190;
        var y2 = fromA ? 190 : 90;
        var marker = fromA ? "cv-arrow-a" : "cv-arrow-b";
        var cls = fromA ? "cv-a" : "cv-b";
        return '<line class="' + cls + '" x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke-width="2" marker-end="url(#' + marker + ')"></line>';
      }).join("");
      return '<svg viewBox="0 0 640 280" role="img" aria-label="Schema der Koevolution: ' + esc(pair.a) + ' und ' + esc(pair.b) + ', wechselseitige Anpassungen">' +
        '<defs><marker id="cv-arrow-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="cv-arrow"></path></marker>' +
        '<marker id="cv-arrow-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="cv-arrow-b"></path></marker></defs>' +
        '<text class="cv-title" x="60" y="28">' + esc(pair.a) + '</text>' +
        '<text class="cv-title" x="580" y="28" text-anchor="end">' + esc(pair.b) + '</text>' +
        '<line class="cv-a" x1="60" y1="80" x2="580" y2="80" stroke-width="2"></line>' +
        '<line class="cv-b" x1="60" y1="200" x2="580" y2="200" stroke-width="2"></line>' +
        aSteps + bSteps + arrows +
        '<text class="cv-small" x="320" y="252" text-anchor="middle">wechselseitiger Selektionsdruck</text>' +
        '<text class="cv-small" x="320" y="270" text-anchor="middle">' + esc(pair.note) + '</text>' +
        '</svg>';
    }
    function show(index) {
      $$("[data-coevolution-pair]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.coevolutionPair) === index ? "true" : "false"); });
      if (visual) { visual.innerHTML = visualFor(pairs[index]); }
      if (readout) { readout.innerHTML = "<strong>" + esc(pairs[index].label) + ".</strong> " + esc(pairs[index].text); }
    }
    $$("[data-coevolution-pair]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { show(Number(btn.dataset.coevolutionPair)); });
    });
    show(0);
  };

  initializers["timeline"] = function (figure) {
    if (!initOnce(figure, "initTimeline")) { return; }
    var range = figure.querySelector("[data-timeline-range]");
    var point = figure.querySelector("[data-timeline-point]");
    var drop = figure.querySelector("[data-timeline-drop]");
    var skull = figure.querySelector("[data-timeline-skull]");
    var readout = figure.querySelector("[data-timeline-readout]");
    var stations = [
      { at: 0, cc: 450, title: "vor etwa 7 Mio. Jahren", text: "Die Linien von Mensch und Schimpanse trennen sich. Frühe Homininen leben in Afrika." },
      { at: 30, cc: 550, title: "vor etwa 4 Mio. Jahren", text: "Australopithecus zeigt einen aufrechten Gang. Das Becken und die Fußstellung verändern sich." },
      { at: 55, cc: 800, title: "vor etwa 2 Mio. Jahren", text: "Homo habilis und Homo erectus erscheinen. Werkzeuge und größere Gehirne werden wichtig." },
      { at: 75, cc: 1350, title: "vor etwa 300.000 Jahren", text: "Homo sapiens entsteht in Afrika. Die Art ist erdgeschichtlich jung." },
      { at: 90, cc: 1400, title: "vor etwa 70.000 Jahren", text: "Homo sapiens breitet sich über die Welt aus. Kulturelle Weitergabe wird immer bedeutender." },
      { at: 100, cc: 1400, title: "heute", text: "Der moderne Mensch lebt in einer Welt, die er selbst stark verändert. Biologische und kulturelle Evolution wirken zusammen." }
    ];
    function update() {
      var value = Number(range.value);
      var station = stations[0];
      stations.forEach(function (entry) { if (value >= entry.at) { station = entry; } });
      var x = 60 + (station.at / 100) * 540;
      var y = 210 - ((station.cc - 300) / 1400) * 150;
      if (point) { point.setAttribute("cx", x); point.setAttribute("cy", y); }
      if (drop) { drop.setAttribute("x1", x); drop.setAttribute("x2", x); drop.setAttribute("y1", y); drop.setAttribute("y2", 210); }
      if (skull) {
        var scale = 0.55 + ((station.cc - 400) / 1100) * 0.8;
        skull.setAttribute("transform", "translate(50 50) scale(" + scale.toFixed(3) + ")");
      }
      if (readout) { readout.innerHTML = "<strong>" + esc(station.title) + ".</strong> " + esc(station.text) + " Schädelvolumen ca. " + new Intl.NumberFormat("de-DE").format(station.cc) + " cm³."; }
    }
    if (range) { range.addEventListener("input", update); }
    update();
  };

  initializers["foraging"] = function (figure) {
    if (!initOnce(figure, "initForaging")) { return; }
    var scenario = figure.querySelector("[data-forage-scenario]");
    var riskToggle = figure.querySelector("[data-forage-risk-toggle]");
    var readout = figure.querySelector("[data-forage-readout]");
    var scenarios = { near: [8, 5, 2], far: [9, 7, 8], big: [10, 8, 5] };
    function update() {
      var values = scenarios[scenario.value] || scenarios.near;
      var a = values[0];
      var b = values[1];
      var t = values[2];
      var r = riskToggle && riskToggle.checked ? 8 : 0;
      var netA = a * 1.2 - t * 0.5 - r * 0.6;
      var netB = b * 1.2 - t * 0.5 - r * 0.6;
      var rateA = netA / (1 + t);
      var rateB = netB / (1 + t);
      var better = rateA === rateB ? "Beide Patches sind gleich gut." : rateA > rateB ? "Patch A ist die bessere Wahl." : "Patch B ist die bessere Wahl.";
      if (readout) {
        readout.innerHTML = "<strong>" + esc(better) + "</strong> Netto-Gewinn pro Zeit: A " + de(rateA, 1) + ", B " + de(rateB, 1) + ". Wegzeit und Risiko sind bereits abgezogen. " +
          (r > 0 ? "Das Risiko macht beide Patches unattraktiver." : "Ohne Risiko zählt vor allem der Ertrag pro Zeit.");
      }
    }
    if (scenario) { scenario.addEventListener("change", update); }
    if (riskToggle) { riskToggle.addEventListener("change", update); }
    update();
  };

  initializers["hamilton"] = function (figure) {
    if (!initOnce(figure, "initHamilton")) { return; }
    var r = figure.querySelector("[data-hamilton-r]");
    var b = figure.querySelector("[data-hamilton-b]");
    var c = figure.querySelector("[data-hamilton-c]");
    var readout = figure.querySelector("[data-hamilton-readout]");
    function update() {
      var relatedness = Number(r.value);
      var benefit = Number(b.value);
      var cost = Number(c.value);
      var left = relatedness * benefit;
      var favored = left > cost;
      if (readout) {
        readout.innerHTML = "<strong>rB = " + de(left, 1) + ", C = " + de(cost, 1) + ".</strong> " +
          (favored ? "Altruismus ist unter diesen Bedingungen begünstigt, weil der Verwandtschaftsnutzen die Kosten übersteigt." : "Altruismus ist unter diesen Bedingungen nicht begünstigt, weil die Kosten den Verwandtschaftsnutzen übersteigen.");
      }
    }
    [r, b, c].forEach(function (node) {
      if (!node) { return; }
      node.addEventListener("input", update);
      node.addEventListener("change", update);
    });
    update();
  };

  initializers["communication"] = function (figure) {
    if (!initOnce(figure, "initCommunication")) { return; }
    var signals = [
      { label: "Balzgesang", type: "sound", honest: true, text: "Sender: Männchen. Empfänger: Weibchen. Der Gesang ist akustisch und oft ehrlich, weil er Energie kostet und nur ein gesunder Sender ihn durchhält." },
      { label: "Warnruf", type: "sound", honest: true, text: "Sender: Gruppenmitglied. Empfänger: Verwandte. Der Ruf kann den Sender gefährden, aber Verwandte retten. Das passt zur Verwandtenselektion." },
      { label: "Pheromon", type: "chemical", honest: null, text: "Sender: Insekt. Empfänger: Artgenossen. Chemische Signale sind langlebig und können über weite Strecken wirken. Sie können ehrlich oder manipulierend sein." },
      { label: "Mimikry", type: "visual", honest: false, text: "Sender: ungiftige Art. Empfänger: Räuber. Das Signal täuscht eine giftige Art vor. Der Empfänger wird getäuscht, der Sender profitiert." }
    ];
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-communication-readout]");
    var visual = figure.querySelector("[data-communication-visual]");
    if (controls) {
      controls.innerHTML = signals.map(function (signal, index) {
        return '<button class="btn btn--quiet btn--small" type="button" data-communication-signal="' + index + '">' + esc(signal.label) + "</button>";
      }).join("");
    }
    function visualFor(signal) {
      var signalPath = "";
      if (signal.type === "sound") {
        signalPath = '<path class="cv-signal" d="M220 80 Q260 110 220 140"></path><path class="cv-signal" d="M260 65 Q315 110 260 155"></path><path class="cv-signal" d="M300 50 Q370 110 300 170"></path>';
      } else if (signal.type === "chemical") {
        for (var i = 0; i < 8; i += 1) {
          signalPath += '<circle class="cv-dot" cx="' + (200 + i * 35) + '" cy="' + (110 + Math.sin(i) * 18) + '" r="4"></circle>';
        }
      } else {
        signalPath = '<rect x="260" y="80" width="120" height="60" fill="var(--color-paper-2)" stroke="var(--color-accent)" stroke-width="2"></rect>' +
          '<line x1="260" y1="95" x2="380" y2="95" stroke="var(--color-accent)" stroke-width="6"></line>' +
          '<line x1="260" y1="110" x2="380" y2="110" stroke="var(--color-ink)" stroke-width="6"></line>' +
          '<line x1="260" y1="125" x2="380" y2="125" stroke="var(--color-accent)" stroke-width="6"></line>' +
          '<text class="cv-small" x="320" y="158" text-anchor="middle">kopiertes Signal</text>';
      }
      var tag = signal.honest === true
        ? '<text class="cv-honest" x="320" y="200" text-anchor="middle">ehrliches Signal</text>'
        : signal.honest === false
          ? '<text class="cv-deceptive" x="320" y="200" text-anchor="middle">täuschendes Signal</text>'
          : '<text class="cv-small" x="320" y="200" text-anchor="middle">kann ehrlich oder manipulierend sein</text>';
      return '<svg viewBox="0 0 640 220" role="img" aria-label="Sender-Empfänger-Modell: ' + esc(signal.label) + '">' +
        '<circle class="cv-node" cx="100" cy="110" r="38"></circle>' +
        '<text class="cv-title" x="100" y="114" text-anchor="middle">Sender</text>' +
        '<circle class="cv-node" cx="540" cy="110" r="38"></circle>' +
        '<text class="cv-title" x="540" y="114" text-anchor="middle">Empfänger</text>' +
        signalPath +
        '<text class="cv-label" x="320" y="40" text-anchor="middle">' + esc(signal.label) + '</text>' +
        tag +
        '</svg>';
    }
    function show(index) {
      $$("[data-communication-signal]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.communicationSignal) === index ? "true" : "false"); });
      if (visual) { visual.innerHTML = visualFor(signals[index]); }
      if (readout) { readout.innerHTML = "<strong>" + esc(signals[index].label) + ".</strong> " + esc(signals[index].text); }
    }
    $$("[data-communication-signal]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { show(Number(btn.dataset.communicationSignal)); });
    });
    show(0);
  };

  initializers["hawk-dove"] = function (figure) {
    if (!initOnce(figure, "initHawkDove")) { return; }
    var scenario = figure.querySelector("[data-hawk-scenario]");
    var p = figure.querySelector("[data-hawk-p]");
    var ff = figure.querySelector("[data-hawk-ff]");
    var fd = figure.querySelector("[data-hawk-fd]");
    var df = figure.querySelector("[data-hawk-df]");
    var dd = figure.querySelector("[data-hawk-dd]");
    var readout = figure.querySelector("[data-hawk-readout]");
    var scenarios = { high: [9, 4], low: [3, 14], balanced: [6, 10] };
    function update() {
      var values = scenarios[scenario.value] || scenarios.balanced;
      var value = values[0];
      var cost = values[1];
      var hawkShare = Number(p.value) / 100;
      var payoffFF = (value - cost) / 2;
      var payoffFD = value;
      var payoffDF = 0;
      var payoffDD = value / 2;
      if (ff) { ff.textContent = de(payoffFF, 1); }
      if (fd) { fd.textContent = de(payoffFD, 1); }
      if (df) { df.textContent = de(payoffDF, 1); }
      if (dd) { dd.textContent = de(payoffDD, 1); }
      var hawk = hawkShare * payoffFF + (1 - hawkShare) * payoffFD;
      var dove = hawkShare * payoffDF + (1 - hawkShare) * payoffDD;
      var equilibrium = value < cost ? (value / cost) : null;
      if (readout) {
        readout.innerHTML = "<strong>Erwartete Auszahlung:</strong> Falke " + de(hawk, 1) + ", Taube " + de(dove, 1) + ". " +
          (equilibrium !== null ? "Gleichgewicht bei einem Falkenanteil von etwa " + (equilibrium * 100).toFixed(0) + " %." : "Bei V größer als C kann sich Falke durchsetzen.") +
          " Die Auszahlungen sind ein Modell, keine Messung.";
      }
    }
    if (scenario) { scenario.addEventListener("change", update); }
    if (p) { p.addEventListener("input", update); }
    update();
  };

  initializers["mating"] = function (figure) {
    if (!initOnce(figure, "initMating")) { return; }
    var readout = figure.querySelector("[data-mating-readout]");
    var modes = { female: [8, 2], equal: [5, 5], male: [2, 8] };
    var current = "female";
    function update() {
      var pair = modes[current];
      var f = pair[0];
      var m = pair[1];
      var text = "";
      if (f > m + 1) {
        text = "Die Weibchen investieren mehr. In diesem Modell sind sie oft wählerischer, während die Männchen stärker um Partner konkurrieren.";
      } else if (m > f + 1) {
        text = "Die Männchen investieren mehr. In diesem Modell können sich die Rollen umkehren: Die Männchen sind wählerischer, die Weibchen konkurrieren stärker.";
      } else {
        text = "Die Investitionen sind ähnlich. Die Erwartungen an Partnerwahl und Konkurrenz sind weniger stark asymmetrisch.";
      }
      $$("[data-mating-mode]", figure).forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.matingMode === current ? "true" : "false"); });
      if (readout) {
        readout.innerHTML = "<strong>Elternaufwand:</strong> Weibchen " + f + ", Männchen " + m + ". " + esc(text) + " Der relative Aufwand ist ein Modell, kein Naturgesetz.";
      }
    }
    $$("[data-mating-mode]", figure).forEach(function (button) {
      button.addEventListener("click", function () { current = button.dataset.matingMode; update(); });
    });
    update();
  };

  initializers["primate"] = function (figure) {
    if (!initOnce(figure, "initPrimate")) { return; }
    var examples = [
      { label: "Werkzeuggebrauch", text: "Schimpansen nutzen Stöcke und Steine. Biologische Grundlagen: flexible Hände, Lernen durch Nachahmung. Kulturelle Anteile: unterschiedliche Werkzeugtraditionen in verschiedenen Gruppen." },
      { label: "Rangordnung", text: "Bei Pavianen entsteht eine Hierarchie aus Kämpfen und Allianzen. Biologische Faktoren: Körpergröße, Hormone. Soziale Faktoren: verwandtschaftliche Unterstützung und Koalitionen." },
      { label: "Sprache", text: "Menschliche Sprache ist symbolisch und grammatisch. Biologische Grundlagen: Kehlkopf, Gehirn, FOXP2. Kulturelle Anteile: Wortschatz, Grammatik und Erzähltraditionen werden gelernt." },
      { label: "Kooperation", text: "Bonobos und Schimpansen kooperieren in unterschiedlichen Kontexten. Biologische Faktoren: Verwandtschaft, Rang. Soziale Faktoren: Gruppengeschichte und Ressourcenverteilung." }
    ];
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-primate-readout]");
    if (controls) {
      controls.innerHTML = examples.map(function (example, index) {
        return '<button class="btn btn--quiet btn--small" type="button" data-primate-example="' + index + '">' + esc(example.label) + "</button>";
      }).join("");
    }
    function show(index) {
      $$("[data-primate-example]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.primateExample) === index ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(examples[index].label) + ".</strong> " + esc(examples[index].text); }
    }
    $$("[data-primate-example]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { show(Number(btn.dataset.primateExample)); });
    });
    show(0);
  };

  initializers["fitness-map"] = function (figure) {
    if (!initOnce(figure, "initFitnessMap")) { return; }
    var svg = figure.querySelector(".fitness-map");
    var point = figure.querySelector("[data-fitness-point]");
    var path = figure.querySelector("[data-fitness-path]");
    var readout = figure.querySelector("[data-fitness-readout]");
    var climbButton = figure.querySelector("[data-fitness-climb]");
    var resetButton = figure.querySelector("[data-fitness-reset]");
    var start = { x: 320, y: 160 };
    var current = { x: start.x, y: start.y };
    var trail = [[start.x, start.y]];
    var timer = null;
    function fitnessAt(x, y) {
      return 0.2 +
        1.8 * Math.exp(-((x - 430) * (x - 430) + (y - 120) * (y - 120)) / 5000) +
        1.4 * Math.exp(-((x - 190) * (x - 190) + (y - 220) * (y - 220)) / 4500) +
        1.1 * Math.exp(-((x - 480) * (x - 480) + (y - 245) * (y - 245)) / 3500);
    }
    function updateReadout() {
      if (!readout) { return; }
      var value = fitnessAt(current.x, current.y);
      readout.innerHTML = "<strong>Position:</strong> " + de(current.x, 0) + " / " + de(current.y, 0) + ", <strong>Fitness:</strong> " + de(value, 2) + ". " +
        (value > 1.65 ? "Du bist nahe an einem Gipfel." : "Der Punkt ist noch im Anstieg.") +
        " Fitness ist hier der relative erwartete Fortpflanzungserfolg.";
    }
    function draw() {
      if (point) {
        point.setAttribute("cx", current.x);
        point.setAttribute("cy", current.y);
      }
      if (path) {
        path.setAttribute("points", trail.map(function (entry) { return entry[0].toFixed(1) + "," + entry[1].toFixed(1); }).join(" "));
      }
      updateReadout();
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function place(x, y, resetTrail) {
      current = { x: Math.max(20, Math.min(620, x)), y: Math.max(20, Math.min(300, y)) };
      if (resetTrail) { trail = [[current.x, current.y]]; } else { trail.push([current.x, current.y]); }
      draw();
    }
    function climb() {
      stop();
      var steps = 0;
      trail = [[current.x, current.y]];
      timer = setInterval(function () {
        var dx = (fitnessAt(current.x + 2, current.y) - fitnessAt(current.x - 2, current.y)) / 4;
        var dy = (fitnessAt(current.x, current.y + 2) - fitnessAt(current.x, current.y - 2)) / 4;
        var length = Math.hypot(dx, dy);
        if (length < 0.002 || steps > 140) { stop(); return; }
        place(current.x + (dx / length) * 2.2, current.y + (dy / length) * 2.2, false);
        steps += 1;
      }, 28);
    }
    if (svg) {
      svg.addEventListener("click", function (event) {
        stop();
        var pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        var loc = pt.matrixTransform(svg.getScreenCTM().inverse());
        place(loc.x, loc.y, true);
      });
    }
    if (climbButton) { climbButton.addEventListener("click", climb); }
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        stop();
        place(start.x, start.y, true);
      });
    }
    draw();
  };

  initializers["cladogram"] = function (figure) {
    if (!initOnce(figure, "initCladogram")) { return; }
    var host = figure.querySelector("[data-cladogram]");
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-cladogram-readout]");
    var traits = [
      { key: "jaw", label: "Kiefer", groups: ["Fische", "Amphibien", "Reptilien", "Vögel", "Säugetiere"], text: "Die Kieferlosen haben keinen Kiefer. Bei allen anderen Wirbeltieren ist der Kiefer ein abgeleitetes Merkmal." },
      { key: "lung", label: "Lunge", groups: ["Amphibien", "Reptilien", "Vögel", "Säugetiere"], text: "Lungen sind bei den Tetrapoden ausgebildet. Fische nutzen Kiemen." },
      { key: "amnion", label: "Amnion", groups: ["Reptilien", "Vögel", "Säugetiere"], text: "Das Amnion schützt den Embryo vor Austrocknung. Es verbindet Reptilien, Vögel und Säugetiere." },
      { key: "feather", label: "Federn", groups: ["Vögel"], text: "Federn sind ein Merkmal der Vögel. Sie sind aus Schuppen entstanden." },
      { key: "hair", label: "Haare", groups: ["Säugetiere"], text: "Haare sind ein Merkmal der Säugetiere." }
    ];
    var branches = [
      { d: "M40 180 H160", key: "root" },
      { d: "M160 180 V70", key: "none" },
      { d: "M160 180 H300", key: "jaw" },
      { d: "M300 180 V110", key: "none" },
      { d: "M300 180 H440", key: "lung" },
      { d: "M440 180 V145", key: "none" },
      { d: "M440 180 H520", key: "amnion" },
      { d: "M520 180 V120", key: "none" },
      { d: "M520 180 H620", key: "feather" },
      { d: "M620 180 V260", key: "hair" }
    ];
    var taxa = [
      { label: "Kieferlose", x: 170, y: 74 },
      { label: "Fische", x: 310, y: 114 },
      { label: "Amphibien", x: 450, y: 149 },
      { label: "Reptilien", x: 530, y: 124 },
      { label: "Vögel", x: 630, y: 184 },
      { label: "Säugetiere", x: 630, y: 264 }
    ];
    var markers = [
      { key: "jaw", x: 230, y: 180, label: "Kiefer", lx: 230, ly: 168, anchor: "middle" },
      { key: "lung", x: 370, y: 180, label: "Lunge", lx: 370, ly: 168, anchor: "middle" },
      { key: "amnion", x: 480, y: 180, label: "Amnion", lx: 480, ly: 168, anchor: "middle" },
      { key: "feather", x: 580, y: 180, label: "Federn", lx: 580, ly: 168, anchor: "middle" },
      { key: "hair", x: 620, y: 220, label: "Haare", lx: 630, ly: 224, anchor: "start" }
    ];
    if (host) {
      host.innerHTML = '<svg viewBox="0 0 720 320" role="img" aria-label="Vereinfachtes Kladogramm der Wirbeltiere mit den Merkmalen Kiefer, Lunge, Amnion, Federn und Haare">' +
        branches.map(function (branch) { return '<path class="branch" data-branch="' + branch.key + '" d="' + branch.d + '"></path>'; }).join("") +
        taxa.map(function (taxon) { return '<text x="' + taxon.x + '" y="' + taxon.y + '">' + esc(taxon.label) + "</text>"; }).join("") +
        markers.map(function (marker) {
          return '<circle class="trait" data-trait="' + marker.key + '" cx="' + marker.x + '" cy="' + marker.y + '" r="6"></circle>' +
            '<text class="trait-label" x="' + marker.lx + '" y="' + marker.ly + '" text-anchor="' + marker.anchor + '">' + esc(marker.label) + "</text>";
        }).join("") +
        "</svg>";
    }
    if (controls) {
      controls.innerHTML = traits.map(function (trait) {
        return '<button class="btn btn--quiet btn--small" type="button" data-cladogram-trait="' + trait.key + '">' + esc(trait.label) + "</button>";
      }).join("");
    }
    function show(key) {
      $$("[data-branch]", host).forEach(function (branch) { branch.classList.toggle("is-active", branch.dataset.branch === key); });
      $$("[data-trait]", host).forEach(function (marker) { marker.classList.toggle("is-active", marker.dataset.trait === key); });
      $$("[data-cladogram-trait]", figure).forEach(function (button) { button.setAttribute("aria-pressed", button.dataset.cladogramTrait === key ? "true" : "false"); });
      var trait = traits.filter(function (entry) { return entry.key === key; })[0];
      if (readout && trait) {
        readout.innerHTML = "<strong>" + esc(trait.label) + ":</strong> " + esc(trait.groups.join(", ")) + ". " + esc(trait.text);
      }
    }
    $$("[data-cladogram-trait]", figure).forEach(function (button) {
      button.addEventListener("click", function () { show(button.dataset.cladogramTrait); });
    });
    $$("[data-trait]", host).forEach(function (marker) {
      marker.addEventListener("click", function () { show(marker.dataset.trait); });
    });
    show("jaw");
  };

  initializers["observation-sort"] = function (figure) {
    if (!initOnce(figure, "initObservation")) { return; }
    var examples = [
      { text: "Die Pflanze wächst zum Fenster.", type: "beobachtung", why: "Das kann man sehen. Es ist eine Beschreibung." },
      { text: "Die Pflanze mag das Licht.", type: "deutung", why: "Das ist eine Erklärung. Man kann sie nicht direkt sehen." },
      { text: "Auf dem Brot sind grüne Flecken.", type: "beobachtung", why: "Das kann man sehen. Es ist eine Beschreibung." },
      { text: "Der Schimmel kommt von der Feuchtigkeit.", type: "deutung", why: "Das ist eine Erklärung, die man prüfen muss." },
      { text: "Der Puls ist nach dem Laufen höher.", type: "beobachtung", why: "Das kann man messen. Es ist eine Beobachtung." },
      { text: "Sport ist gesund.", type: "deutung", why: "Das ist eine Bewertung. Sie braucht Belege und Kriterien." }
    ];
    var current = 0;
    var controls = figure.querySelector("[data-tool-controls]");
    var text = figure.querySelector("[data-obs-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = examples.map(function (example, index) {
        return '<button class="btn btn--quiet btn--small" type="button" data-obs-example="' + index + '">' + (index + 1) + "</button>";
      }).join("");
    }
    function show(index) {
      current = index;
      $$("[data-obs-example]", figure).forEach(function (button) { button.setAttribute("aria-pressed", Number(button.dataset.obsExample) === index ? "true" : "false"); });
      if (text) { text.textContent = examples[index].text; }
      if (readout) { readout.textContent = "Beobachtung oder Deutung?"; }
    }
    $$("[data-obs-example]", figure).forEach(function (button) {
      button.addEventListener("click", function () { show(Number(button.dataset.obsExample)); });
    });
    $$("[data-obs-answer]", figure).forEach(function (button) {
      button.addEventListener("click", function () {
        var example = examples[current];
        var correct = button.dataset.obsAnswer === example.type;
        if (readout) { readout.innerHTML = "<strong>" + (correct ? "Richtig." : "Noch nicht richtig.") + "</strong> " + esc(example.why); }
      });
    });
    show(0);
  };

  initializers["experiment8"] = function (figure) {
    if (!initOnce(figure, "initExperiment8")) { return; }
    var question = figure.querySelector("[data-exp8-question]");
    var uv = figure.querySelector("[data-exp8-uv]");
    var av = figure.querySelector("[data-exp8-av]");
    var control = figure.querySelector("[data-exp8-control]");
    var sample = figure.querySelector("[data-exp8-sample]");
    var check = figure.querySelector("[data-exp8-check]");
    var readout = figure.querySelector("[data-tool-readout]");
    var scenarios = {
      light: { uv: "licht", av: "pflanzenhoehe", label: "Pflanzen und Licht" },
      mold: { uv: "feuchtigkeit", av: "schimmel", label: "Schimmel und Feuchtigkeit" },
      pulse: { uv: "sport", av: "puls", label: "Puls und Sport" }
    };
    function evaluate() {
      var scenario = scenarios[question.value] || scenarios.light;
      var points = 0;
      var notes = [];
      if (uv.value === scenario.uv) { points += 1; } else { notes.push("Die unabhängige Variable ist " + (scenario.uv === "licht" ? "das Licht" : scenario.uv === "feuchtigkeit" ? "die Feuchtigkeit" : "die Bewegung") + "."); }
      if (av.value === scenario.av) { points += 1; } else { notes.push("Die abhängige Variable ist " + (scenario.av === "pflanzenhoehe" ? "die Pflanzenhöhe" : scenario.av === "schimmel" ? "das Schimmelwachstum" : "der Puls") + "."); }
      if (control.value === "gleich") { points += 1; } else { notes.push("Alle anderen Bedingungen müssen gleich bleiben."); }
      if (sample.value === "mehrere") { points += 1; } else { notes.push("Mehrere Wiederholungen sind nötig, um Zufall auszuschließen."); }
      var verdict = points === 4 ? "Der Plan ist testbar." : points >= 2 ? "Der Plan ist teilweise testbar, aber noch nicht sauber." : "Der Plan ist so nicht testbar.";
      if (readout) { readout.innerHTML = "<strong>" + esc(verdict) + "</strong> " + esc(notes.join(" ")); }
    }
    if (check) { check.addEventListener("click", evaluate); }
    [question, uv, av, control, sample].forEach(function (node) { if (node) { node.addEventListener("change", evaluate); } });
    evaluate();
  };

  initializers["model8"] = function (figure) {
    if (!initOnce(figure, "initModel8")) { return; }
    var models = {
      cell: ["Zellmodell", "Stärke: Es zeigt Organellen und ihre Lage. Grenze: Es bewegt sich nicht und zeigt nicht alle Stoffwechselvorgänge."],
      eye: ["Augenmodell", "Stärke: Es zeigt Linse, Netzhaut und den Weg des Lichts. Grenze: Es zeigt nicht, wie das Gehirn das Bild verarbeitet."],
      ecosystem: ["Ökosystemmodell", "Stärke: Es zeigt Nahrungsbeziehungen und Stoffflüsse. Grenze: Es enthält nicht jede Art und nicht jeden Einfluss."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Zelle", "cell", true) + button("Auge", "eye", false) + button("Ökosystem", "ecosystem", false);
    }
    function show(key) {
      var entry = models[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("cell");
  };

  initializers["chart8"] = function (figure) {
    if (!initOnce(figure, "initChart8")) { return; }
    var statements = {
      a: ["Die Pflanze wächst in den ersten Wochen stärker als am Ende.", true, "Die Kurve steigt zunächst steiler und flacht dann ab. Das ist eine Beschreibung des Musters."],
      b: ["Die Pflanze wächst immer gleich schnell.", false, "Die Kurve ist nicht gerade. Das Wachstum wird langsamer."],
      c: ["Mehr Licht ist die Ursache für das Wachstum.", false, "Das Diagramm zeigt nur die Höhe über die Zeit. Eine Ursache ist daraus nicht ablesbar."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Aussage A", "a", true) + button("Aussage B", "b", false) + button("Aussage C", "c", false);
    }
    function show(key) {
      var entry = statements[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + (entry[1] ? "Von den Daten getragen." : "Nicht von den Daten getragen.") + "</strong> " + esc(entry[2]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("a");
  };

  initializers["source8"] = function (figure) {
    if (!initOnce(figure, "initSource8")) { return; }
    var sources = {
      study: ["Originalstudie", "Höchste Nachprüfbarkeit: Methode, Stichprobe und Interessen sind dokumentiert. Grenze: Das Setting ist oft eng."],
      website: ["Gesundheitswebsite", "Guter Überblick über mehrere Studien. Grenze: Vereinfachung und Auswahl durch die Autorin oder den Autor."],
      ad: ["Werbeanzeige", "Schnelle Verbreitung, aber keine nachprüfbare Methode, keine Stichprobe und kein Datum. Für eine biologische Argumentation ungeeignet."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Originalstudie", "study", true) + button("Gesundheitswebsite", "website", false) + button("Werbeanzeige", "ad", false);
    }
    function show(key) {
      var entry = sources[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("study");
  };

  initializers["reflex8"] = function (figure) {
    if (!initOnce(figure, "initReflex8")) { return; }
    var nodes = $$("[data-reflex-node]", figure);
    var fire = figure.querySelector("[data-reflex-fire]");
    var reset = figure.querySelector("[data-reflex-reset]");
    var readout = figure.querySelector("[data-tool-readout]");
    var timers = [];
    var labels = [
      ["Reiz", "Die Hand berührt eine heiße Herdplatte. Der Hitzereiz ist der Auslöser."],
      ["Rezeptor", "Nozizeptoren in der Haut erkennen den Hitzereiz und wandeln ihn in ein elektrisches Signal um."],
      ["afferentes Neuron", "Das Signal läuft über die sensible Nervenbahn zum Rückenmark."],
      ["Rückenmark", "Hier wird der Reflex verschaltet. Das Gehirn ist an dieser schnellen Reaktion noch nicht bewusst beteiligt."],
      ["efferentes Neuron", "Die motorische Nervenbahn leitet das Signal vom Rückenmark zum Muskel."],
      ["Muskel", "Der Muskel zieht sich zusammen. Die Hand bewegt sich weg, bevor der Schmerz bewusst wird."]
    ];
    function clearTimers() {
      timers.forEach(function (timer) { clearTimeout(timer); });
      timers = [];
    }
    function resetAll() {
      clearTimers();
      nodes.forEach(function (node) { node.classList.remove("is-active"); });
      if (readout) { readout.textContent = "Drücke „Reiz auslösen“, um den Reflexbogen zu starten."; }
    }
    function fireReflex() {
      resetAll();
      nodes.forEach(function (node, index) {
        timers.push(setTimeout(function () {
          nodes.forEach(function (inner, innerIndex) {
            inner.classList.toggle("is-active", innerIndex <= index);
          });
          if (readout) {
            readout.innerHTML = "<strong>" + esc(labels[index][0]) + ".</strong> " + esc(labels[index][1]);
          }
        }, index * 620));
      });
      timers.push(setTimeout(function () {
        if (readout) {
          readout.innerHTML = "<strong>Reflex abgeschlossen.</strong> Die Hand ist weg, bevor der Schmerz bewusst wird. Das Gehirn erhält später eine Kopie des Signals und ordnet den Schmerz ein.";
        }
      }, nodes.length * 620 + 260));
    }
    if (fire) { fire.addEventListener("click", fireReflex); }
    if (reset) { reset.addEventListener("click", resetAll); }
    resetAll();
  };

  initializers["hearing8"] = function (figure) {
    if (!initOnce(figure, "initHearing8")) { return; }
    var scenarios = {
      headphones: ["Kopfhörer", "Lange Hörzeit bei hoher Lautstärke. Die Belastung summiert sich über den Tag. Leiser hören und Pausen machen senken das Risiko."],
      concert: ["Konzert", "Kurze, sehr laute Belastung. Abstand zur Bühne, Gehörschutz und Pausen machen einen großen Unterschied."],
      traffic: ["Straßenverkehr", "Dauerhafte mittlere Belastung. Auch sie kann das Gehör stressen, besonders über viele Stunden."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Kopfhörer", "headphones", true) + button("Konzert", "concert", false) + button("Straßenverkehr", "traffic", false);
    }
    function show(key) {
      var entry = scenarios[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("headphones");
  };

  initializers["hormone8"] = function (figure) {
    if (!initOnce(figure, "initHormone8")) { return; }
    var hormones = {
      insulin: ["Insulin", "Zielzellen: Leber, Muskel- und Fettzellen. Insulin fördert die Aufnahme von Glucose und senkt den Blutzucker."],
      glucagon: ["Glucagon", "Zielzelle: Leber. Glucagon fördert die Freisetzung von Glucose und erhöht den Blutzucker."],
      adrenalin: ["Adrenalin", "Zielzellen: Herz, Lunge, Muskeln und Gefäße. Adrenalin macht den Körper kurzfristig leistungsbereit."],
      cortisol: ["Cortisol", "Zielzellen: viele Gewebe. Cortisol wirkt bei längerer Belastung und beeinflusst Stoffwechsel und Immunsystem."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var label = figure.querySelector("[data-hormone-label]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Insulin", "insulin", true) + button("Glucagon", "glucagon", false) + button("Adrenalin", "adrenalin", false) + button("Cortisol", "cortisol", false);
    }
    function show(key) {
      var entry = hormones[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (label) { label.textContent = entry[0]; }
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("insulin");
  };

  initializers["bloodsugar8"] = function (figure) {
    if (!initOnce(figure, "initBloodsugar8")) { return; }
    var line = figure.querySelector("[data-sugar-line]");
    var points = figure.querySelector("[data-sugar-points]");
    var readout = figure.querySelector("[data-tool-readout]");
    var reset = figure.querySelector("[data-sugar-reset]");
    var actions = {
      eat: { delta: 45, text: "Essen: Der Blutzucker steigt. Die Bauchspeicheldrüse schüttet Insulin aus, die Zellen nehmen Glucose auf." },
      sport: { delta: -20, text: "Sport: Die Muskeln verbrauchen Glucose. Der Blutzucker sinkt." },
      insulin: { delta: -35, text: "Insulin: Die Zellen nehmen mehr Glucose auf, die Leber speichert Glucose. Der Blutzucker sinkt." },
      glucagon: { delta: 25, text: "Glucagon: Die Leber setzt Glucose frei. Der Blutzucker steigt." }
    };
    var value = 90;
    var history = [90];
    function clamp(number) { return Math.max(60, Math.min(180, number)); }
    function yFor(number) { return 250 - ((clamp(number) - 60) / 120) * 220; }
    function xFor(index) { return 60 + (index * 540) / Math.max(1, history.length - 1); }
    function render() {
      if (!line || !points) { return; }
      var coords = history.map(function (entry, index) { return xFor(index).toFixed(1) + "," + yFor(entry).toFixed(1); });
      line.setAttribute("points", coords.join(" "));
      points.innerHTML = history.map(function (entry, index) {
        return '<circle class="point" cx="' + xFor(index).toFixed(1) + '" cy="' + yFor(entry).toFixed(1) + '" r="4"></circle>';
      }).join("");
    }
    function apply(key) {
      var action = actions[key];
      if (!action) { return; }
      value = clamp(value + action.delta);
      history.push(value);
      if (history.length > 8) { history.shift(); }
      render();
      if (readout) {
        readout.innerHTML = "<strong>" + esc(action.text.split(":")[0]) + ".</strong> " + esc(action.text.split(":").slice(1).join(":").trim()) + " Modellwert: " + de(value, 0) + " mg/dl.";
      }
    }
    $$("[data-sugar-action]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { apply(btn.dataset.sugarAction); });
    });
    if (reset) {
      reset.addEventListener("click", function () {
        value = 90;
        history = [90];
        render();
        if (readout) { readout.innerHTML = "<strong>Ausgangswert.</strong> Der Blutzucker liegt im Modell bei 90 mg/dl. Wähle eine Aktion und beobachte die Kurve."; }
      });
    }
    render();
    if (readout) { readout.innerHTML = "<strong>Ausgangswert.</strong> Der Blutzucker liegt im Modell bei 90 mg/dl. Wähle eine Aktion und beobachte die Kurve."; }
  };

  initializers["stress8"] = function (figure) {
    if (!initOnce(figure, "initStress8")) { return; }
    var organs = $$("[data-stress-organ]", figure);
    var fire = figure.querySelector("[data-stress-fire]");
    var calm = figure.querySelector("[data-stress-calm]");
    var readout = figure.querySelector("[data-tool-readout]");
    function setStress(on, initial) {
      organs.forEach(function (organ) {
        var key = organ.dataset.stressOrgan;
        organ.classList.toggle("is-active", on && key !== "digestion");
        organ.classList.toggle("is-reduced", on && key === "digestion");
      });
      if (!readout) { return; }
      if (initial) {
        readout.innerHTML = "Starte den Stress und beobachte, welche Organe reagieren. Danach kannst du die Erholung einleiten.";
      } else if (on) {
        readout.innerHTML = "<strong>Alarm.</strong> Adrenalin und Cortisol werden ausgeschüttet. Herz und Atmung werden schneller, die Muskeln besser durchblutet und die Verdauung gedrosselt. Die Pupillen weiten sich.";
      } else {
        readout.innerHTML = "<strong>Erholung.</strong> Der Körper schaltet zurück. Puls und Atmung sinken, die Verdauung kommt wieder in Gang. Erholung ist ein wichtiger Teil der Stressantwort.";
      }
    }
    if (fire) { fire.addEventListener("click", function () { setStress(true, false); }); }
    if (calm) { calm.addEventListener("click", function () { setStress(false, false); }); }
    setStress(false, true);
  };

  initializers["nerve-disease8"] = function (figure) {
    if (!initOnce(figure, "initNerveDisease8")) { return; }
    var diseases = {
      alzheimer: ["Alzheimer", "Betroffene Struktur: Großhirn, besonders Hippocampus und Cortex.", "Was passiert: Proteinablagerungen und Verlust von Synapsen. Nervenzellen sterben nach und nach ab.", "Typische Zeichen: Gedächtnisprobleme, Wortfindungsstörungen, Orientierungsschwierigkeiten."],
      parkinson: ["Parkinson", "Betroffene Struktur: Mittelhirn, besonders die Substantia nigra.", "Was passiert: Nervenzellen, die Dopamin bilden, sterben ab. Die Bewegungssteuerung wird gestört.", "Typische Zeichen: Ruhezittern, Muskelsteifheit, langsame Bewegungen."],
      ms: ["Multiple Sklerose", "Betroffene Struktur: Myelinscheiden im zentralen Nervensystem.", "Was passiert: Das Immunsystem greift die Isolierung der Nervenbahnen an. Signale werden langsamer oder gestört.", "Typische Zeichen: Sehstörungen, Gefühlsstörungen, Schwäche, oft in Schüben."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var panels = $$("[data-disease-panel]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Alzheimer", "alzheimer", true) + button("Parkinson", "parkinson", false) + button("Multiple Sklerose", "ms", false);
    }
    function show(key) {
      var entry = diseases[key];
      if (!entry) { return; }
      panels.forEach(function (panel) { panel.classList.toggle("is-active", panel.dataset.diseasePanel === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) {
        readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]) + " " + esc(entry[2]) + " " + esc(entry[3]);
      }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("alzheimer");
  };

  initializers["puberty8"] = function (figure) {
    if (!initOnce(figure, "initPuberty8")) { return; }
    var items = [
      { text: "Der Körper wächst in die Höhe und die Muskeln verändern sich.", accept: ["koerper"], why: "Wachstum und Muskelaufbau sind körperliche Veränderungen." },
      { text: "Die Stimme wird tiefer und der Bartwuchs beginnt.", accept: ["koerper"], why: "Stimmbruch und Bartwuchs sind körperliche Veränderungen, die nicht bei allen gleich stark auftreten." },
      { text: "Die Brust entwickelt sich und die Hüften werden breiter.", accept: ["koerper"], why: "Auch diese Veränderungen sind körperlich und individuell verschieden." },
      { text: "Die Stimmung schwankt stärker und Gefühle werden intensiver.", accept: ["psyche"], why: "Emotionale Veränderungen gehören zur psychischen Entwicklung." },
      { text: "Das Selbstbild und die eigene Identität verändern sich.", accept: ["psyche"], why: "Die Auseinandersetzung mit sich selbst ist ein psychischer Prozess." },
      { text: "Freundschaften und die Meinung der Gruppe werden wichtiger.", accept: ["sozial"], why: "Die Peergroup und soziale Beziehungen gewinnen an Bedeutung." },
      { text: "Die erste Menstruation oder der erste Samenerguss können auftreten.", accept: ["koerper"], why: "Beides sind körperliche Zeichen der Geschlechtsreife." },
      { text: "Der Wunsch nach Nähe und Beziehungen wird stärker.", accept: ["psyche", "sozial"], why: "Nähe und Beziehungen betreffen sowohl Gefühle als auch soziale Beziehungen." }
    ];
    var current = 0;
    var controls = figure.querySelector("[data-tool-controls]");
    var text = figure.querySelector("[data-puberty-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = items.map(function (item, index) {
        return '<button class="btn btn--quiet btn--small" type="button" data-puberty-item="' + index + '">' + (index + 1) + "</button>";
      }).join("");
    }
    function show(index) {
      current = index;
      $$("[data-puberty-item]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.pubertyItem) === index ? "true" : "false"); });
      if (text) { text.textContent = items[index].text; }
      if (readout) { readout.textContent = "Körper, Psyche oder Sozial?"; }
    }
    $$("[data-puberty-item]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { show(Number(btn.dataset.pubertyItem)); });
    });
    $$("[data-puberty-answer]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = items[current];
        var correct = item.accept.indexOf(btn.dataset.pubertyAnswer) !== -1;
        if (readout) { readout.innerHTML = "<strong>" + (correct ? "Passt." : "Nicht die beste Zuordnung.") + "</strong> " + esc(item.why); }
      });
    });
    show(0);
  };

  initializers["anatomy8"] = function (figure) {
    if (!initOnce(figure, "initAnatomy8")) { return; }
    var views = {
      weiblich: ["Vulva und Vagina", "Die Vulva umfasst die äußeren Geschlechtsorgane. Die Vagina ist der innere Muskelkanal. Gebärmutter, Eileiter und Eierstöcke liegen im Becken. Die Klitoris ist größtenteils innerlich."],
      maennlich: ["Penis und Hoden", "Penis, Eichel und Hodensack sind äußere Organe. Hoden, Nebenhoden, Samenleiter und Prostata liegen teilweise im Körper. Die Hoden liegen außen, weil die Spermienproduktion kühlere Temperaturen braucht."]
    };
    var panels = $$("[data-anatomy-panel]", figure);
    var buttons = $$("[data-anatomy-view]", figure);
    var toggle = figure.querySelector("[data-anatomy-toggle]");
    var readout = figure.querySelector("[data-tool-readout]");
    function show(key) {
      var entry = views[key];
      if (!entry) { return; }
      panels.forEach(function (panel) { panel.hidden = panel.dataset.anatomyPanel !== key; });
      buttons.forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.anatomyView === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    buttons.forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.anatomyView); }); });
    if (toggle) {
      toggle.setAttribute("aria-pressed", "false");
      toggle.addEventListener("click", function () {
        var hidden = figure.classList.toggle("labels-hidden");
        toggle.textContent = hidden ? "Beschriftungen einblenden" : "Beschriftungen ausblenden";
        toggle.setAttribute("aria-pressed", hidden ? "true" : "false");
      });
    }
    show("weiblich");
  };

  initializers["cycle8"] = function (figure) {
    if (!initOnce(figure, "initCycle8")) { return; }
    var range = figure.querySelector("[data-cycle-range]");
    var output = figure.querySelector("[data-cycle-day]");
    var marker = figure.querySelector("[data-cycle-marker]");
    var dot = figure.querySelector("[data-cycle-dot]");
    var label = figure.querySelector("[data-cycle-marker-label]");
    var lining = figure.querySelector("[data-cycle-lining]");
    var readout = figure.querySelector("[data-tool-readout]");
    var phaseButtons = $$("[data-cycle-phase]", figure);
    var heights = [5, 4, 4, 3, 3, 4, 6, 8, 11, 14, 17, 20, 23, 26, 26, 26, 26, 26, 25, 24, 23, 22, 20, 17, 12, 8, 5, 4];
    var bars = [];
    if (lining) {
      for (var index = 0; index < 28; index += 1) {
        var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", (70 + index * 21).toFixed(1));
        rect.setAttribute("y", (280 - heights[index]).toFixed(1));
        rect.setAttribute("width", "14");
        rect.setAttribute("height", heights[index]);
        rect.setAttribute("class", "lining");
        lining.appendChild(rect);
        bars.push(rect);
      }
    }
    function phaseFor(day) {
      if (day <= 5) {
        return { name: "Menstruation", text: "Die Gebärmutterschleimhaut wird abgestoßen. Östrogen und Progesteron sind niedrig; FSH steigt langsam." };
      }
      if (day <= 13) {
        return { name: "Follikelreifung", text: "Im Eierstock reift ein Follikel. Östrogen steigt und baut die Gebärmutterschleimhaut auf. Kurz vor dem Eisprung steigt LH stark an." };
      }
      if (day === 14) {
        return { name: "Eisprung", text: "Ein LH-Schub löst die Freisetzung der Eizelle aus. Die Eizelle ist etwa 12 bis 24 Stunden befruchtungsfähig; Spermien können bis zu 5 Tage überleben." };
      }
      return { name: "Gelbkörperphase", text: "Der Gelbkörper bildet Progesteron. Die Schleimhaut wird dick und gut durchblutet. Ohne Befruchtung bildet sich der Gelbkörper zurück; die Hormone fallen, und die nächste Menstruation beginnt." };
    }
    function update(day) {
      day = Math.max(1, Math.min(28, Number(day) || 1));
      if (range && Number(range.value) !== day) { range.value = String(day); }
      if (output) { output.textContent = String(day); }
      var x = 70 + ((day - 1) / 27) * 590;
      if (marker) {
        marker.setAttribute("x1", x.toFixed(1));
        marker.setAttribute("x2", x.toFixed(1));
      }
      if (dot) { dot.setAttribute("cx", x.toFixed(1)); }
      if (label) {
        label.setAttribute("x", x.toFixed(1));
        label.textContent = "Tag " + day;
      }
      bars.forEach(function (bar, barIndex) { bar.classList.toggle("is-current", barIndex === day - 1); });
      var phase = phaseFor(day);
      if (readout) { readout.innerHTML = "<strong>Tag " + day + ": " + esc(phase.name) + ".</strong> " + esc(phase.text); }
    }
    if (range) { range.addEventListener("input", function () { update(range.value); }); }
    phaseButtons.forEach(function (btn) { btn.addEventListener("click", function () { update(btn.dataset.cyclePhase); }); });
    update(range ? range.value : 14);
  };

  initializers["gender8"] = function (figure) {
    if (!initOnce(figure, "initGender8")) { return; }
    var aspects = {
      biologisch: ["Biologisches Geschlecht", "Chromosomen, Hormone und Geschlechtsorgane. Es wird bei der Geburt meist als männlich, weiblich oder inter* eingeordnet. Es ist nicht dasselbe wie die Geschlechtsidentität."],
      identitaet: ["Geschlechtsidentität", "Das Geschlecht, als das sich ein Mensch fühlt und versteht, zum Beispiel Frau, Mann, nicht-binär oder trans*. Sie muss nicht mit dem bei der Geburt zugewiesenen Geschlecht übereinstimmen."],
      ausdruck: ["Geschlechtsausdruck", "Wie sich ein Mensch kleidet, verhält oder darstellt, zum Beispiel feminin, maskulin, androgyn oder geschlechtsneutral. Ausdruck und Identität müssen nicht zusammenpassen."],
      orientierung: ["Sexuelle Orientierung", "Zu wem sich ein Mensch romantisch oder sexuell hingezogen fühlt, zum Beispiel hetero, homo, bi, pan oder asexuell. Orientierung ist nicht dasselbe wie Geschlechtsidentität."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var nodes = $$("[data-gender-node]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Biologisches Geschlecht", "biologisch", true) + button("Geschlechtsidentität", "identitaet", false) + button("Geschlechtsausdruck", "ausdruck", false) + button("Sexuelle Orientierung", "orientierung", false);
    }
    function show(key) {
      var entry = aspects[key];
      if (!entry) { return; }
      nodes.forEach(function (node) { node.classList.toggle("is-active", node.dataset.genderNode === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]) + " Keine Kombination ist richtiger als eine andere."; }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("biologisch");
  };

  initializers["media8"] = function (figure) {
    if (!initOnce(figure, "initMedia8")) { return; }
    var media = {
      werbung: ["Werbung", ["Körper werden oft idealisiert und bearbeitet.", "Produkte werden mit Attraktivität und Erfolg verbunden.", "Vielfalt fehlt häufig: Körperformen, Hautfarben, Behinderungen, Alter.", "Frage: Wer wird gezeigt, wer nicht?"]],
      musikvideo: ["Musikvideo", ["Sexualität wird oft als Inszenierung gezeigt.", "Machtgefälle und Grenzüberschreitungen können als normal erscheinen.", "Körper werden häufig sexualisiert und auf Aussehen reduziert.", "Frage: Wird Konsens gezeigt oder nur angedeutet?"]],
      pornografie: ["Pornografie", ["Zeigt Sexualität als Performance, nicht als Beziehung.", "Oft unrealistische Körper, fehlende Verhütung und fehlende Konsensverhandlung.", "Kann Erwartungen und Selbstbild beeinflussen.", "Frage: Was fehlt: Nähe, Kommunikation, Schutz, Grenzen?"]]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-media-title]");
    var list = figure.querySelector("[data-media-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Werbung", "werbung", true) + button("Musikvideo", "musikvideo", false) + button("Pornografie", "pornografie", false);
    }
    function show(key) {
      var entry = media[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (list) { list.innerHTML = entry[1].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Kritische Frage.</strong> Medien zeigen Ausschnitte. Pornografie ist kein Aufklärungsmaterial; für verlässliche Informationen nutze BZgA, pro familia oder Schulbücher."; }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("werbung");
  };

  initializers["consent8"] = function (figure) {
    if (!initOnce(figure, "initConsent8")) { return; }
    var scenarios = [
      { text: "Lena (15) ist mit Marie (21) zusammen. Marie hat ein Auto und eine eigene Wohnung. Als Lena mit Freundinnen auf ein Konzert will, sagt Marie: „Musst du wirklich zu diesem Kindergeburtstag? Deine Freundinnen sind doch total unreif. Bleib lieber bei mir.“", correct: [2, 3], feedback: "Machtgefälle, Abwertung der Freundinnen und Isolation sind Warnsignale. Die Szene kann in eine klare Grenzüberschreitung übergehen." },
      { text: "Jonas (16) und Sarah (16) sind auf einer Party. Sarah spricht lachend mit einem Mitschüler. Danach ist Jonas tagelang distanziert und sagt: „Ich will nicht, dass andere Typen dich anmachen. Wenn du mich respektierst, hältst du dich von ihm fern.“", correct: [2], feedback: "Eifersucht als Liebesbeweis und Kontrolle über Kontakte sind Warnsignale. Liebe bedeutet nicht, jemanden zu kontrollieren." },
      { text: "Ben (18) arbeitet und verdient Geld. Seine Freundin Maya (15) geht zur Schule. Ben bezahlt Essen und teure Sneaker. Nach dem Kino drängt er sie im Auto zu körperlicher Nähe: „Ich stecke mein halbes Geld in dich, da kann ich doch wohl etwas erwarten.“", correct: [3], feedback: "Geschenke begründen keine sexuelle Zustimmung. Das ist eine klare Grenzüberschreitung; Maya darf jederzeit Nein sagen." },
      { text: "Tim (17) und Emilia (16) sind seit einem halben Jahr zusammen. Emilia möchte nicht zu einer Party mit Tims Fußballkollegen. Tim sagt: „Schade, aber ich will nicht, dass du dich unwohl fühlst. Ich gehe zwei Stunden hin und komme danach zu dir.“", correct: [1], feedback: "Tim akzeptiert Emilias Grenze und schlägt einen Kompromiss vor. Das ist respektvolle Kommunikation auf Augenhöhe." }
    ];
    var current = 0;
    var controls = figure.querySelector("[data-tool-controls]");
    var text = figure.querySelector("[data-consent-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = scenarios.map(function (scenario, index) {
        return '<button class="btn btn--quiet btn--small" type="button" data-consent-scene="' + index + '">Szene ' + (index + 1) + "</button>";
      }).join("");
    }
    function show(index) {
      current = index;
      $$("[data-consent-scene]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.consentScene) === index ? "true" : "false"); });
      if (text) { text.textContent = scenarios[index].text; }
      if (readout) { readout.textContent = "Ordne die Szene ein: 1 = gesund, 2 = Warnsignal, 3 = klare Grenzüberschreitung."; }
      $$("[data-consent-rating]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", "false"); });
    }
    $$("[data-consent-scene]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { show(Number(btn.dataset.consentScene)); });
    });
    $$("[data-consent-rating]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var scenario = scenarios[current];
        var rating = Number(btn.dataset.consentRating);
        var correct = scenario.correct.indexOf(rating) !== -1;
        $$("[data-consent-rating]", figure).forEach(function (inner) { inner.setAttribute("aria-pressed", inner === btn ? "true" : "false"); });
        if (readout) { readout.innerHTML = "<strong>" + (correct ? "Passt." : "Noch nicht die beste Einordnung.") + "</strong> " + esc(scenario.feedback); }
      });
    });
    show(0);
  };

  initializers["contraception8"] = function (figure) {
    if (!initOnce(figure, "initContraception8")) { return; }
    var methods = {
      kondom: ["Kondom", "2 bis 12", "Ja", "vor jedem Sex", "Schützt vor STIs und Schwangerschaft. Auf Größe, Haltbarkeit und richtige Handhabung achten."],
      pille: ["Pille", "0,1 bis 0,9", "Nein", "täglich", "Hormonelle Methode; muss regelmäßig eingenommen werden. Rezeptpflichtig. Kein Schutz vor STIs."],
      spirale: ["Spirale", "0,1 bis 0,8", "Nein", "langfristig", "Wird von einer Arztpraxis eingesetzt. Kann die Periode verändern. Kein STI-Schutz."],
      implantat: ["Implantat", "0,1 bis 0,4", "Nein", "3 Jahre", "Hormonstäbchen unter der Haut. Sehr sicher, aber kein STI-Schutz."],
      diaphragma: ["Diaphragma", "6 bis 18", "Nein", "vor jedem Sex", "Muss passend angepasst werden. Anwendungsfehler erhöhen den Pearl Index."],
      natural: ["Natürliche Methoden", "2 bis 25", "Nein", "täglich beobachten", "Erfordert Zykluswissen und Disziplin. Nicht für alle zuverlässig; kein STI-Schutz."],
      emergency: ["Pille danach", "keine reguläre Methode", "Nein", "so schnell wie möglich", "Notfallverhütung nach ungeschütztem Sex. Wirkt, bevor der Eisprung stattfindet; ersetzt keine regelmäßige Verhütung."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var name = figure.querySelector("[data-method-name]");
    var pearl = figure.querySelector("[data-method-pearl]");
    var sti = figure.querySelector("[data-method-sti]");
    var use = figure.querySelector("[data-method-use]");
    var text = figure.querySelector("[data-method-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Kondom", "kondom", true) + button("Pille", "pille", false) + button("Spirale", "spirale", false) + button("Implantat", "implantat", false) + button("Diaphragma", "diaphragma", false) + button("Natürliche Methoden", "natural", false) + button("Pille danach", "emergency", false);
    }
    function show(key) {
      var entry = methods[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (name) { name.textContent = entry[0]; }
      if (pearl) { pearl.textContent = entry[1]; }
      if (sti) { sti.textContent = entry[2]; }
      if (use) { use.textContent = entry[3]; }
      if (text) { text.textContent = entry[4]; }
      if (readout) { readout.innerHTML = "<strong>Nur Kondome schützen zuverlässig vor STIs.</strong> Für viele Menschen ist eine Kombination aus Kondom und einer sicheren Schwangerschaftsverhütung sinnvoll."; }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("kondom");
  };

  initializers["pregnancy8"] = function (figure) {
    if (!initOnce(figure, "initPregnancy8")) { return; }
    var stages = {
      befruchtung: ["Befruchtung", "Im Eileiter verschmelzen die Kerne von Eizelle und Spermium. Es entsteht eine Zygote, die sich teilt und Richtung Gebärmutter wandert."],
      einnistung: ["Einnistung", "Etwa 6 bis 10 Tage nach der Befruchtung nistet sich die Blastozyste in der Gebärmutterschleimhaut ein. Die Plazenta beginnt zu entstehen."],
      embryo: ["Embryo", "Bis zur 8. Woche werden die Organe angelegt. Herz, Gehirn, Arme und Beine entwickeln sich. Die Plazenta versorgt den Embryo über die Nabelschnur."],
      fetus: ["Fetus", "Ab der 9. Woche spricht man von einem Fetus. Er wächst und reift; Bewegungen werden spürbar. Die Lunge reift bis zur Geburt."],
      geburt: ["Geburt", "Wehen öffnen den Muttermund. Das Baby wird geboren; danach löst sich die Plazenta. Stillen und Bonding unterstützen die erste Zeit."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var nodes = $$("[data-pregnancy-node]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Befruchtung", "befruchtung", true) + button("Einnistung", "einnistung", false) + button("Embryo", "embryo", false) + button("Fetus", "fetus", false) + button("Geburt", "geburt", false);
    }
    function show(key) {
      var entry = stages[key];
      if (!entry) { return; }
      nodes.forEach(function (node) { node.classList.toggle("is-active", node.dataset.pregnancyNode === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("befruchtung");
  };

  initializers["sti8"] = function (figure) {
    if (!initOnce(figure, "initSti8")) { return; }
    var infections = {
      chlamydien: ["Chlamydien", "Sex ohne Kondom, auch Oral- und Analverkehr", "oft keine; Ausfluss, Brennen, Unterbauchschmerzen", "Kondom reduziert das Risiko", "Test in der Arztpraxis, Antibiotika; Partner mitbehandeln", "Chlamydien sind Bakterien. Eine unbehandelte Infektion kann die Eileiter schädigen und Unfruchtbarkeit verursachen."],
      hpv: ["HPV", "Haut- und Schleimhautkontakt", "oft keine; Feigwarzen möglich; einige Typen erhöhen das Krebsrisiko", "Impfung; Kondom reduziert das Risiko", "Warzen behandeln; Vorsorgeuntersuchungen", "HPV ist weit verbreitet. Die Impfung schützt vor den häufigsten krebserregenden Typen."],
      hiv: ["HIV", "Blut, Sperma, Vaginalsekret, Muttermilch", "anfangs oft grippeähnlich, dann oft symptomlos", "Kondom, PrEP, saubere Nadeln", "Test, antiretrovirale Therapie; bei erfolgreicher Behandlung nicht übertragbar (U=U)", "HIV ist heute gut behandelbar. U=U bedeutet: Bei erfolgreicher Therapie ist das Virus nicht mehr übertragbar."],
      herpes: ["Herpes", "Haut- und Schleimhautkontakt", "Bläschen, Jucken, Schmerzen; kann ohne Symptome übertragen werden", "Kondom reduziert das Risiko", "Antivirale Mittel; Ausbrüche können wiederkehren", "Herpes kann auch ohne sichtbare Bläschen übertragen werden."],
      syphilis: ["Syphilis", "Sex ohne Kondom, auch Oralverkehr", "schmerzloses Geschwür, später Hautausschlag; unbehandelt gefährlich", "Kondom reduziert das Risiko", "Test, Antibiotika; Partner mitbehandeln", "Syphilis ist mit Antibiotika gut behandelbar, besonders früh."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var name = figure.querySelector("[data-sti-name]");
    var transmission = figure.querySelector("[data-sti-transmission]");
    var symptoms = figure.querySelector("[data-sti-symptoms]");
    var protection = figure.querySelector("[data-sti-protection]");
    var treatment = figure.querySelector("[data-sti-treatment]");
    var text = figure.querySelector("[data-sti-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Chlamydien", "chlamydien", true) + button("HPV", "hpv", false) + button("HIV", "hiv", false) + button("Herpes", "herpes", false) + button("Syphilis", "syphilis", false);
    }
    function show(key) {
      var entry = infections[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (name) { name.textContent = entry[0]; }
      if (transmission) { transmission.textContent = entry[1]; }
      if (symptoms) { symptoms.textContent = entry[2]; }
      if (protection) { protection.textContent = entry[3]; }
      if (treatment) { treatment.textContent = entry[4]; }
      if (text) { text.textContent = entry[5]; }
      if (readout) { readout.innerHTML = "<strong>Viele STIs verlaufen ohne Symptome.</strong> Ein Test gibt Sicherheit; Kondome und Lecktücher reduzieren das Risiko."; }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("chlamydien");
  };

  initializers["behavior-sort8"] = function (figure) {
    if (!initOnce(figure, "initBehaviorSort8")) { return; }
    var items = [
      { text: "Eine Spinne baut ihr Netz ohne Vorbild.", accept: ["angeboren"], why: "Der Netzbau ist artspezifisch und tritt auch ohne Beobachtung auf." },
      { text: "Ein Hund lernt, auf „Sitz“ zu hören.", accept: ["erlernt"], why: "Der Hund verknüpft das Wort mit einer Belohnung oder Übung." },
      { text: "Ein Eichhörnchen erkennt Nüsse als Nahrung, verbessert aber die Öffnungstechnik durch Übung.", accept: ["angeboren", "erlernt"], why: "Die Nahrungserkennung ist angeboren, die Technik wird durch Übung verbessert." },
      { text: "Ein Papagei lernt Wörter nachzusprechen.", accept: ["erlernt"], why: "Wörter werden durch Nachahmung und Übung gelernt." },
      { text: "Zugvögel orientieren sich am Magnetfeld.", accept: ["angeboren"], why: "Die Orientierung ist artspezifisch und tritt ohne Vorbild auf." },
      { text: "Ein Kind lernt Fahrradfahren.", accept: ["erlernt"], why: "Gleichgewicht und Koordination werden durch Übung erlernt." },
      { text: "Ein Kuckucksküken bettelt mit seinem roten Rachen um Futter.", accept: ["angeboren"], why: "Der rote Rachen ist ein Schlüsselreiz; das Betteln ist angeboren." },
      { text: "Eine junge Graugans folgt dem ersten bewegten Objekt.", accept: ["praegung"], why: "Das ist Prägung: Lernen in einer sensiblen Phase." }
    ];
    var current = 0;
    var controls = figure.querySelector("[data-tool-controls]");
    var text = figure.querySelector("[data-behavior-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = items.map(function (item, index) {
        return '<button class="btn btn--quiet btn--small" type="button" data-behavior-item="' + index + '">' + (index + 1) + "</button>";
      }).join("");
    }
    function show(index) {
      current = index;
      $$("[data-behavior-item]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.behaviorItem) === index ? "true" : "false"); });
      if (text) { text.textContent = items[index].text; }
      if (readout) { readout.textContent = "Angeboren, erlernt oder Prägung?"; }
    }
    $$("[data-behavior-item]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { show(Number(btn.dataset.behaviorItem)); });
    });
    $$("[data-behavior-answer]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = items[current];
        var correct = item.accept.indexOf(btn.dataset.behaviorAnswer) !== -1;
        if (readout) { readout.innerHTML = "<strong>" + (correct ? "Passt." : "Nicht die beste Zuordnung.") + "</strong> " + esc(item.why); }
      });
    });
    show(0);
  };

  initializers["attrappen8"] = function (figure) {
    if (!initOnce(figure, "initAttrappen8")) { return; }
    var stimuli = {
      normal: ["Normaler Kopf mit rotem Punkt", 60, "Der rote Punkt am Schnabel ist der Schlüsselreiz. Das Küken pickt dagegen, und die Eltern würgen Futter hervor."],
      nopoint: ["Kopf ohne roten Punkt", 10, "Ohne den roten Punkt fehlt der Schlüsselreiz. Das Küken pickt deutlich seltener."],
      super: ["Übergroßer roter Stab", 90, "Ein übergroßer roter Stab ist ein supernormaler Reiz. Er löst mehr Pickreaktionen aus als der natürliche Schnabel."],
      blue: ["Kopf mit blauem Punkt", 15, "Die Farbe ist Teil des Schlüsselreizes. Ein blauer Punkt löst weniger Reaktionen aus."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var bars = figure.querySelector("[data-attrappen-bars]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Normaler Kopf", "normal", true) + button("Ohne Punkt", "nopoint", false) + button("Roter Stab", "super", false) + button("Blauer Punkt", "blue", false);
    }
    if (bars) {
      bars.innerHTML = Object.keys(stimuli).map(function (key) {
        var entry = stimuli[key];
        return '<div class="attrappen-bar" data-attrappen-bar="' + key + '"><span>' + esc(entry[0]) + '</span><div class="attrappen-bar__track"><i class="attrappen-bar__fill" style="width:' + entry[1] + '%"></i></div><output>' + entry[1] + "</output></div>";
      }).join("");
    }
    function show(key) {
      var entry = stimuli[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      $$("[data-attrappen-bar]", figure).forEach(function (bar) { bar.classList.toggle("is-active", bar.dataset.attrappenBar === key); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[2]) + " Pickreaktionen pro Minute: " + entry[1] + "."; }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("normal");
  };

  initializers["imprinting8"] = function (figure) {
    if (!initOnce(figure, "initImprinting8")) { return; }
    var days = {
      1: ["Tag 1", "Das Küken ist in der sensiblen Phase. Das erste bewegte Objekt, das Laute von sich gibt, wird als Mutterfigur geprägt. Die Bindung ist später kaum veränderbar.", true],
      3: ["Tag 3", "Die sensible Phase ist noch offen. Prägung ist möglich, aber die Bindung wird schwächer, je später sie erfolgt.", true],
      7: ["Tag 7", "Die sensible Phase ist weitgehend vorbei. Das Küken folgt einem neuen Objekt nicht mehr zuverlässig; es zeigt eher Angst oder Ignorieren.", false],
      14: ["Tag 14", "Die Prägung ist abgeschlossen. Ein neues Mutterbild wird nicht mehr angenommen. Prägung ist irreversibel.", false]
    };
    var buttons = $$("[data-imprinting-day]", figure);
    var marker = figure.querySelector("[data-imprinting-marker] circle");
    var follow = figure.querySelector("[data-imprinting-follow]");
    var readout = figure.querySelector("[data-tool-readout]");
    function show(day) {
      var entry = days[day];
      if (!entry) { return; }
      buttons.forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.imprintingDay) === day ? "true" : "false"); });
      var x = 60 + ((day - 1) / 13) * 520;
      if (marker) { marker.setAttribute("cx", x.toFixed(1)); }
      if (follow) {
        follow.style.display = entry[2] ? "" : "none";
        follow.setAttribute("x1", "195");
        follow.setAttribute("x2", "515");
      }
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    buttons.forEach(function (btn) { btn.addEventListener("click", function () { show(Number(btn.dataset.imprintingDay)); }); });
    show(1);
  };

  initializers["pavlov8"] = function (figure) {
    if (!initOnce(figure, "initPavlov8")) { return; }
    var trials = 0;
    var bellAlone = 0;
    var salivation = 0;
    var bar = figure.querySelector("[data-pavlov-bar]");
    var value = figure.querySelector("[data-pavlov-value]");
    var drops = $$("[data-pavlov-drop]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    function render() {
      if (bar) { bar.style.transform = "scaleX(" + (salivation / 100) + ")"; }
      if (value) { value.textContent = salivation + " %"; }
      drops.forEach(function (drop) { drop.style.opacity = String(Math.min(1, salivation / 80)); });
    }
    function set(text) {
      if (readout) { readout.innerHTML = text; }
      render();
    }
    function bell() {
      if (trials >= 3) {
        bellAlone += 1;
        if (bellAlone >= 3) {
          salivation = Math.max(10, salivation - 30);
          set("<strong>Löschung.</strong> Die Glocke wird ohne Futter wiederholt. Die bedingte Reaktion schwächt sich ab.");
        } else {
          salivation = 75;
          set("<strong>CS → CR.</strong> Die Glocke allein löst Speichelfluss aus. Die Kopplung hat gewirkt.");
        }
      } else {
        salivation = 10;
        set("<strong>NS → keine spezifische Reaktion.</strong> Die Glocke ist noch neutral. Es fehlt die Kopplung mit Futter.");
      }
    }
    function food() {
      salivation = 90;
      bellAlone = 0;
      set("<strong>UCS → UCR.</strong> Das Futter löst ohne Lernen Speichelfluss aus.");
    }
    function pair() {
      trials += 1;
      bellAlone = 0;
      salivation = 90;
      if (trials >= 3) {
        set("<strong>Die Glocke wird zum CS.</strong> Ab jetzt löst sie allein Speichelfluss aus. Kopplungen: " + trials + ".");
      } else {
        set("<strong>Kopplung.</strong> Glocke und Futter werden gemeinsam gezeigt. Der Hund speichelt. Kopplungen: " + trials + ".");
      }
    }
    function reset() {
      trials = 0;
      bellAlone = 0;
      salivation = 0;
      set("<strong>Ausgangszustand.</strong> Die Glocke ist neutral. Das Futter löst Speichelfluss aus.");
    }
    $$("[data-pavlov-action]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.dataset.pavlovAction;
        if (action === "bell") { bell(); }
        else if (action === "food") { food(); }
        else if (action === "pair") { pair(); }
        else { reset(); }
      });
    });
    reset();
  };

  initializers["skinner8"] = function (figure) {
    if (!initOnce(figure, "initSkinner8")) { return; }
    var mode = "futter";
    var presses = 0;
    var history = [];
    var line = figure.querySelector("[data-skinner-line]");
    var points = figure.querySelector("[data-skinner-points]");
    var lever = figure.querySelector("[data-skinner-lever]");
    var readout = figure.querySelector("[data-tool-readout]");
    var modeButtons = $$("[data-skinner-mode]", figure);
    function render() {
      if (!line || !points) { return; }
      var coords = history.map(function (entry, index) {
        var x = 60 + (index / 9) * 540;
        var y = 160 - (entry / 10) * 130;
        return x.toFixed(1) + "," + y.toFixed(1);
      });
      line.setAttribute("points", coords.join(" "));
      points.innerHTML = history.map(function (entry, index) {
        var x = 60 + (index / 9) * 540;
        var y = 160 - (entry / 10) * 130;
        return '<circle class="point" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4"></circle>';
      }).join("");
    }
    function set(text) {
      if (readout) { readout.innerHTML = text; }
      render();
    }
    function press() {
      if (presses >= 10) {
        set("<strong>Durchlauf beendet.</strong> Setze zurück, um erneut zu starten.");
        return;
      }
      presses += 1;
      history.push(presses);
      if (lever) {
        lever.classList.add("is-pressed");
        setTimeout(function () { lever.classList.remove("is-pressed"); }, 180);
      }
      if (mode === "futter") {
        set("<strong>Positive Verstärkung.</strong> Auf den Hebeldruck folgt Futter. Die Rate steigt. Drücke: " + presses + ".");
      } else if (mode === "ton") {
        set("<strong>Positive Bestrafung.</strong> Auf den Hebeldruck folgt ein unangenehmer Ton. In einem echten Versuch würde die Rate sinken. Drücke: " + presses + ".");
      } else {
        set("<strong>Keine Konsequenz.</strong> Der Hebeldruck wird nicht verstärkt. Die Rate bleibt niedrig. Drücke: " + presses + ".");
      }
    }
    modeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        mode = btn.dataset.skinnerMode;
        modeButtons.forEach(function (inner) { inner.setAttribute("aria-pressed", inner === btn ? "true" : "false"); });
        if (mode === "futter") { set("<strong>Futter gewählt.</strong> Positive Verstärkung: Ein angenehmer Reiz folgt auf das Verhalten."); }
        else if (mode === "ton") { set("<strong>Ton gewählt.</strong> Positive Bestrafung: Ein unangenehmer Reiz folgt auf das Verhalten."); }
        else { set("<strong>Keine Konsequenz gewählt.</strong> Das Verhalten wird nicht verstärkt."); }
      });
    });
    var pressButton = figure.querySelector("[data-skinner-press]");
    if (pressButton) { pressButton.addEventListener("click", press); }
    var reset = figure.querySelector("[data-skinner-reset]");
    if (reset) {
      reset.addEventListener("click", function () {
        presses = 0;
        history = [];
        render();
        set("<strong>Zurückgesetzt.</strong> Wähle eine Konsequenz und drücke den Hebel.");
      });
    }
    set("<strong>Ausgangszustand.</strong> Wähle eine Konsequenz und drücke den Hebel.");
  };

  initializers["learning8"] = function (figure) {
    if (!initOnce(figure, "initLearning8")) { return; }
    var strategies = {
      wiederholen: ["Wiederholen", "Wiederholung hilft, aber verteilt und aktiv ist sie viel wirksamer als bloßes Lesen.", ["Spaced Repetition: Verteile Wiederholungen über mehrere Tage.", "Active Recall: Versuche, den Stoff ohne Vorlage abzurufen.", "Karteikarten: Frage zuerst, Antwort danach.", "Nicht nur markieren: Markieren allein erzeugt kein tieferes Verständnis."], "Starte mit einer kurzen Abfrage, bevor du erneut liest."],
      organisieren: ["Organisieren", "Reduziere und strukturiere den Stoff, damit Zusammenhänge sichtbar werden.", ["Schreibe eine Zusammenfassung in eigenen Worten.", "Erstelle eine Mindmap oder Tabelle.", "Unterscheide Hauptideen von Details.", "Nutze Skizzen für Prozesse und Strukturen."], "Eine gute Zusammenfassung ist kürzer als der Originaltext."],
      erklaeren: ["Erklären", "Erklären zeigt, ob du den Stoff wirklich verstanden hast.", ["Erkläre einer anderen Person, ohne Notizen.", "Nutze eigene Beispiele.", "Stelle dir Prüfungsfragen und beantworte sie.", "Erkläre, warum etwas so ist, nicht nur was passiert."], "Wenn du ins Stocken gerätst, hast du eine Lücke gefunden."],
      metakognition: ["Metakognition", "Plane, überwache und passe deinen Lernprozess an.", ["Setze konkrete Ziele für jede Lerneinheit.", "Prüfe am Ende, was du schon kannst.", "Passe den Plan an, wenn eine Methode nicht funktioniert.", "Reflektiere Fehler: Was war die Ursache?"], "Plane lieber kleine, konkrete Schritte als ein großes Ziel."],
      pausen: ["Pausen", "Kurze Pausen ohne Ablenkung helfen dem Gehirn, Gelerntes zu festigen.", ["Arbeite in Blöcken von etwa 25 bis 45 Minuten.", "Mache nach spätestens 90 Minuten eine längere Pause.", "Micro-Pausen: 10 Sekunden innehalten, nicht zum Handy greifen.", "Bewegung an der frischen Luft unterstützt die Konzentration."], "Pausen sind Teil der Arbeit, nicht das Gegenteil."],
      schlaf: ["Schlaf", "Schlaf ist kein Luxus, sondern Teil des Lernens.", ["Schlafe regelmäßig und ausreichend.", "Lerne nicht die ganze Nacht vor einer Prüfung.", "Wiederhole den Stoff am Abend und schlafe darüber.", "Vermeide Bildschirme direkt vor dem Schlafen."], "Schlaf festigt Gelerntes; ein All-nighter kostet mehr, als er bringt."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-learning-title]");
    var text = figure.querySelector("[data-learning-text]");
    var list = figure.querySelector("[data-learning-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Wiederholen", "wiederholen", true) + button("Organisieren", "organisieren", false) + button("Erklären", "erklaeren", false) + button("Metakognition", "metakognition", false) + button("Pausen", "pausen", false) + button("Schlaf", "schlaf", false);
    }
    function show(key) {
      var entry = strategies[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Tipp.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("wiederholen");
  };

  initializers["use-continuum8"] = function (figure) {
    if (!initOnce(figure, "initUseContinuum8")) { return; }
    var stages = {
      genuss: ["Genuss", "Angenehmes Erleben ohne zwingende negative Folgen. Du behältst die Kontrolle und kannst aufhören."],
      gewoehnung: ["Gewöhnung", "Das Verhalten wird zur Routine. Bei Substanzen braucht man oft mehr für die gleiche Wirkung, das ist Toleranz."],
      missbrauch: ["Missbrauch", "Es entstehen negative Folgen für Gesundheit, Schule, Beziehungen oder Finanzen. Die Kontrolle ist eingeschränkt, aber nicht vollständig verloren."],
      abhaengigkeit: ["Abhängigkeit", "Craving, Kontrollverlust, Toleranz, Entzug und fortgesetzter Konsum trotz Schäden. Sucht ist eine Erkrankung."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var nodes = $$("[data-continuum-node]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Genuss", "genuss", true) + button("Gewöhnung", "gewoehnung", false) + button("Missbrauch", "missbrauch", false) + button("Abhängigkeit", "abhaengigkeit", false);
    }
    function show(key) {
      var entry = stages[key];
      if (!entry) { return; }
      nodes.forEach(function (node) { node.classList.toggle("is-active", node.dataset.continuumNode === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("genuss");
  };

  initializers["tank8"] = function (figure) {
    if (!initOnce(figure, "initTank8")) { return; }
    var resources = {
      friends: ["Freundschaft", 0.8, "Stabile Beziehungen geben Sicherheit und Zugehörigkeit. Sie füllen den Tank nachhaltig."],
      movement: ["Bewegung", 0.7, "Bewegung reduziert Stress und hebt die Stimmung. Sie wirkt langfristig."],
      sleep: ["Schlaf", 0.75, "Schlaf reguliert Emotionen und Energie. Ohne Schlaf wird der Tank schnell leer."],
      music: ["Musik", 0.5, "Musik kann beruhigen oder Energie geben; sie ist eine gesunde Ressource, wenn sie nicht zur Vermeidung wird."],
      substance: ["Substanz", 0.3, "Eine Substanz füllt den Tank nur kurz. Danach folgen oft ein Tief, Toleranz und neue Probleme."],
      social: ["Social Media", 0.25, "Endloses Scrollen kann kurz ablenken, aber Schlaf, Konzentration und Stimmung belasten."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var fill = figure.querySelector("[data-tank-fill]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Freundschaft", "friends", true) + button("Bewegung", "movement", false) + button("Schlaf", "sleep", false) + button("Musik", "music", false) + button("Substanz", "substance", false) + button("Social Media", "social", false);
    }
    function show(key) {
      var entry = resources[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (fill) { fill.style.transform = "scaleY(" + entry[1] + ")"; }
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[2]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("friends");
  };

  initializers["addiction-triangle8"] = function (figure) {
    if (!initOnce(figure, "initAddictionTriangle8")) { return; }
    var corners = {
      person: ["Person", "Selbstwert, Frustrationstoleranz, psychische Gesundheit und genetische Veranlagung.", "Schutz: gute Selbstwahrnehmung, Problemlösefähigkeit, stabile Ziele. Risiko: Impulsivität, fehlende Bewältigungsstrategien, psychische Erkrankung."],
      mittel: ["Suchtmittel", "Verfügbarkeit, Preis, Werbung und Wirkung.", "Schutz: geringe Verfügbarkeit, Aufklärung, hohe Preise, klare Regeln. Risiko: leichter Zugang, stark suchtfördernde Wirkung, Werbung."],
      umfeld: ["Umfeld", "Familie, Freundeskreis, Schule und Gesellschaft.", "Schutz: stabile Familie, soziale Integration, positive Vorbilder. Risiko: Konflikte, Vernachlässigung, Einsamkeit, Gruppendruck."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var nodes = $$("[data-triangle-node]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Person", "person", true) + button("Suchtmittel", "mittel", false) + button("Umfeld", "umfeld", false);
    }
    function show(key) {
      var entry = corners[key];
      if (!entry) { return; }
      nodes.forEach(function (node) { node.classList.toggle("is-active", node.dataset.triangleNode === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]) + " " + esc(entry[2]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("person");
  };

  initializers["substances8"] = function (figure) {
    if (!initOnce(figure, "initSubstances8")) { return; }
    var substances = {
      alcohol: ["Alkohol", "dämpfend und enthemmend; beeinträchtigt Urteil, Koordination und Reaktion", "Leber, Gehirn, Herz, Krebsrisiko, Unfälle, Abhängigkeit; in der Schwangerschaft besonders schädlich", "hoch", "legal ab 16/18 mit Regeln", "Alkohol ist die am weitesten verbreitete legale Droge. Es gibt kein risikofreies Konsummuster.", "In der Schwangerschaft gilt: null Alkohol."],
      nicotine: ["Nikotin", "anregend und beruhigend zugleich; stark abhängig machend", "Lunge, Herz-Kreislauf, Krebs, Haut, Zahnfleisch; Vaping ist nicht harmlos", "sehr hoch", "legal ab 18", "Nikotin erreicht das Gehirn in Sekunden. Der Drang zu rauchen oder zu dampfen entsteht schnell.", "Professionelle Unterstützung erhöht die Chance, mit dem Rauchen aufzuhören."],
      cannabis: ["Cannabis", "THC kann entspannen, aber auch Angst, Paranoia und Psychosen auslösen; beeinträchtigt Gedächtnis und Koordination", "Psychosen bei vulnerablen Menschen, Abhängigkeit, Atemwege, Unfälle, Schwangerschaft", "mittel bis hoch", "für Jugendliche verboten; für Erwachsene strenge Regeln", "Cannabis ist nicht harmlos. Das Gehirn von Jugendlichen reagiert besonders empfindlich auf THC.", "Bei Jugendlichen kann THC die Entwicklung des Gehirns beeinträchtigen."],
      caffeine: ["Koffein", "anregend; steigert Wachheit und Herzfrequenz", "Schlafprobleme, Unruhe, Angst, Herzklopfen; hohe Dosen sind riskant", "gering bis mittel", "legal; in Energy Drinks oft hoch dosiert", "Koffein ist in Kaffee, Tee, Cola und Energy Drinks. Moderate Mengen sind für die meisten Erwachsenen unproblematisch.", "Energy Drinks sind keine Durstlöscher; achte auf die Dosis."],
      ecstasy: ["Ecstasy / MDMA", "stimulierend und empathogen; kann Energie und Nähegefühl verstärken", "Überhitzung, Dehydration, Serotonin-Syndrom, Depression, Herzrhythmusstörungen; unbekannte Beimischungen", "mittel bis hoch", "illegal", "Ecstasy ist oft mit anderen Stoffen verunreinigt. Die Wirkung ist nicht kontrollierbar.", "Bei Überhitzung: an einen kühlen Ort, Wasser, Hilfe rufen."],
      cocaine: ["Kokain", "stark stimulierend; kurze Euphorie, gesteigerte Wachheit", "Herzinfarkt, Schlaganfall, Angst, Paranoia, Nasenschäden, Abhängigkeit", "sehr hoch", "illegal", "Kokain kann das Herz-Kreislauf-System stark belasten. Die Wirkung hält nur kurz an, der Drang nach mehr wächst.", "Bei Brustschmerz, Atemnot oder Krampfanfall: sofort 112."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var name = figure.querySelector("[data-substance-name]");
    var effect = figure.querySelector("[data-substance-effect]");
    var risks = figure.querySelector("[data-substance-risks]");
    var addiction = figure.querySelector("[data-substance-addiction]");
    var legal = figure.querySelector("[data-substance-legal]");
    var text = figure.querySelector("[data-substance-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Alkohol", "alcohol", true) + button("Nikotin", "nicotine", false) + button("Cannabis", "cannabis", false) + button("Koffein", "caffeine", false) + button("Ecstasy", "ecstasy", false) + button("Kokain", "cocaine", false);
    }
    function show(key) {
      var entry = substances[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (name) { name.textContent = entry[0]; }
      if (effect) { effect.textContent = entry[1]; }
      if (risks) { risks.textContent = entry[2]; }
      if (addiction) { addiction.textContent = entry[3]; }
      if (legal) { legal.textContent = entry[4]; }
      if (text) { text.textContent = entry[5]; }
      if (readout) { readout.innerHTML = "<strong>Wichtig.</strong> " + esc(entry[6]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("alcohol");
  };

  initializers["behavior-addiction8"] = function (figure) {
    if (!initOnce(figure, "initBehaviorAddiction8")) { return; }
    var behaviors = {
      gaming: ["Gaming", "Spiele können entspannen, fordern und verbinden. Problematisch wird es, wenn Spielen andere Lebensbereiche verdrängt.", ["Kontrollverlust über Spielzeit", "Vernachlässigung von Schule, Schlaf, Freundschaften", "Unruhe oder Gereiztheit ohne Spiel", "Weiterspielen trotz negativer Folgen"], "Setze klare Zeitfenster, schalte Benachrichtigungen aus und plane Offline-Aktivitäten."],
      social: ["Social Media", "Plattformen nutzen variable Belohnungen, Endless Scroll und Vergleiche. Das kann Aufmerksamkeit binden.", ["Ständiges Prüfen, Unruhe ohne Handy", "Schlafprobleme, Konzentrationsprobleme", "Vergleich mit idealisierten Bildern", "Vernachlässigung realer Kontakte"], "Begrenze die Bildschirmzeit, lege das Handy nachts weg und plane bewusste Pausen."],
      gambling: ["Glücksspiel", "Zufällige Gewinne und Verluste aktivieren das Belohnungssystem besonders stark. Verluste werden oft durch weiteres Spielen zurückgeholt.", ["Jagd nach Verlusten", "Lügen über Geld oder Spielzeit", "Schulden, Beschaffungskriminalität", "Unruhe, wenn nicht gespielt wird"], "Glücksspiel ist für Minderjährige verboten. Bei Problemen hilft eine Suchtberatung."],
      shopping: ["Shopping", "Kaufen kann kurzfristig Belohnung und Kontrolle vermitteln. Problematisch wird es bei zwanghaftem Kaufen trotz finanzieller Folgen.", ["Kaufen als Stressbewältigung", "Finanzielle Probleme", "Verstecken von Einkäufen", "Schuldgefühle danach"], "Nutze Einkaufslisten und Wartefristen und suche Alternativen zum Kaufen."],
      work: ["Arbeit", "Arbeit kann Sinn, Anerkennung und Struktur geben. Workaholismus wird problematisch, wenn Erholung, Gesundheit und Beziehungen verloren gehen.", ["Ständige Erreichbarkeit", "Keine Pausen, Schlafmangel", "Arbeit trotz Erschöpfung", "Schuldgefühle bei Freizeit"], "Setze Grenzen, plane Pausen und suche Unterstützung."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var name = figure.querySelector("[data-behavior-addiction-name]");
    var text = figure.querySelector("[data-behavior-addiction-text]");
    var list = figure.querySelector("[data-behavior-addiction-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Gaming", "gaming", true) + button("Social Media", "social", false) + button("Glücksspiel", "gambling", false) + button("Shopping", "shopping", false) + button("Arbeit", "work", false);
    }
    function show(key) {
      var entry = behaviors[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (name) { name.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Tipp.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("gaming");
  };

  initializers["lifeskills8"] = function (figure) {
    if (!initOnce(figure, "initLifeskills8")) { return; }
    var skills = {
      self: ["Selbstwahrnehmung", "Eigene Gefühle, Bedürfnisse und Grenzen erkennen.", ["Wie fühle ich mich gerade?", "Was brauche ich?", "Wann sage ich Nein?"], "Führe ein kurzes Stimmungsprotokoll."],
      empathy: ["Empathie", "Sich in andere hineinversetzen, ohne die eigenen Grenzen zu verlieren.", ["Zuhören, ohne sofort zu bewerten.", "Nachfragen statt raten.", "Unterschiedliche Perspektiven anerkennen."], "Frage: „Wie geht es dir damit?“"],
      communication: ["Kommunikation", "Eigene Bedürfnisse klar und respektvoll ausdrücken.", ["Ich-Botschaften verwenden.", "Konkret sagen, was man möchte.", "Aufmerksam zuhören."], "Sage „Ich brauche …“ statt „Du machst immer …“."],
      relationships: ["Beziehungsfähigkeit", "Stabile, respektvolle Beziehungen aufbauen und pflegen.", ["Grenzen respektieren.", "Konflikte ansprechen.", "Verlässlich sein."], "Investiere Zeit in Menschen, die dir guttun."],
      decision: ["Entscheidungsfähigkeit", "Optionen prüfen und Folgen abwägen.", ["Informationen sammeln.", "Alternativen vergleichen.", "Konsequenzen bedenken."], "Frage: „Wie würde ich in einem Jahr darüber denken?“"],
      problem: ["Problemlösefähigkeit", "Probleme Schritt für Schritt angehen.", ["Problem benennen.", "Lösungen sammeln.", "Eine Lösung testen und auswerten."], "Zerlege ein großes Problem in kleine Schritte."],
      creative: ["Kreatives Denken", "Neue Lösungen finden und Perspektiven wechseln.", ["Brainstorming ohne Bewertung.", "Ungewöhnliche Ideen zulassen.", "Ideen kombinieren."], "Schreibe zuerst alle Ideen auf, bewerte später."],
      critical: ["Kritisches Denken", "Informationen prüfen und Manipulation erkennen.", ["Quellen prüfen.", "Interessen hinterfragen.", "Zwischen Meinung und Fakt unterscheiden."], "Frage: „Wer profitiert von dieser Botschaft?“"],
      stress: ["Stressbewältigung", "Mit Belastung umgehen und Erholung einplanen.", ["Pausen machen.", "Bewegung und Schlaf.", "Hilfe holen."], "Plane Erholung so fest wie Termine."],
      emotions: ["Umgang mit Gefühlen", "Gefühle wahrnehmen und regulieren.", ["Gefühle benennen.", "Nicht sofort reagieren.", "Unterstützung suchen."], "Atme erst, dann entscheide."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var name = figure.querySelector("[data-lifeskills-name]");
    var text = figure.querySelector("[data-lifeskills-text]");
    var list = figure.querySelector("[data-lifeskills-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Selbstwahrnehmung", "self", true) + button("Empathie", "empathy", false) + button("Kommunikation", "communication", false) + button("Beziehungen", "relationships", false) + button("Entscheiden", "decision", false) + button("Problemlösen", "problem", false) + button("Kreativität", "creative", false) + button("Kritisches Denken", "critical", false) + button("Stress", "stress", false) + button("Gefühle", "emotions", false);
    }
    function show(key) {
      var entry = skills[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (name) { name.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Tipp.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("self");
  };

  initializers["foodweb8"] = function (figure) {
    if (!initOnce(figure, "initFoodweb8")) { return; }
    var species = {
      plants: ["Pflanzen", "Produzenten. Wenn sie verschwinden, fehlt die Nahrungsgrundlage für Insekten und viele andere Arten. Das gesamte Netz gerät ins Wanken."],
      insects: ["Insekten", "Primärkonsumenten. Ohne sie finden Frösche und Vögel weniger Nahrung; Pflanzen können sich stärker vermehren."],
      frogs: ["Frösche", "Sekundärkonsumenten. Ohne sie vermehren sich Insekten stärker; Vögel verlieren eine Nahrungsquelle."],
      birds: ["Vögel", "Sie fressen Insekten und Frösche. Ohne sie können sich beide stärker vermehren; der Fuchs verliert eine Nahrungsquelle."],
      fox: ["Fuchs", "Top-Prädator. Ohne ihn können sich Vögel und Frösche stärker vermehren; das ganze Netz verändert sich."],
      fungi: ["Pilze und Bakterien", "Destruenten. Ohne sie werden abgestorbene Stoffe nicht abgebaut; Nährstoffe fehlen den Pflanzen."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var nodes = $$("[data-foodweb-node]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Pflanzen", "plants", true) + button("Insekten", "insects", false) + button("Frösche", "frogs", false) + button("Vögel", "birds", false) + button("Fuchs", "fox", false) + button("Pilze", "fungi", false);
    }
    function show(key) {
      var entry = species[key];
      if (!entry) { return; }
      nodes.forEach(function (node) { node.classList.toggle("is-selected", node.dataset.foodwebNode === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("plants");
  };

  initializers["landuse8"] = function (figure) {
    if (!initOnce(figure, "initLanduse8")) { return; }
    var uses = {
      agriculture: ["Landwirtschaft", "Äcker und Weiden liefern Nahrung, können aber Biodiversität senken, Böden verdichten und Wasser belasten.", ["Nahrung und Einkommen", "Lebensraum für einige Arten", "Belastung durch Pestizide und Dünger", "Bodenverdichtung"], "Trade-off: Ernährungssicherheit vs. Artenvielfalt. Lösungen: Fruchtwechsel, Blühstreifen, reduzierte Pestizide."],
      forestry: ["Forstwirtschaft", "Wälder liefern Holz und speichern CO₂. Monokulturen sind anfälliger für Schädlinge und bieten weniger Lebensraum.", ["Holz und Kohlenstoffspeicherung", "Erholung und Wasserhaushalt", "Monokulturen mit geringer Vielfalt", "Bodenverdichtung durch Maschinen"], "Trade-off: Holzproduktion vs. naturnahe Wälder. Lösungen: Mischwald, Totholz, Naturverjüngung."],
      river: ["Flussregulierung", "Begradigte Flüsse leiten Wasser schneller ab, zerstören aber Auen und Lebensräume. Hochwasser wird stromabwärts verstärkt.", ["Schutz für Siedlungen", "Schifffahrt und Landwirtschaft", "Verlust von Auen", "Schnellerer Abfluss"], "Trade-off: Schifffahrt und Siedlungsschutz vs. Hochwasserschutz und Biodiversität. Lösungen: Renaturierung, Flutpolder."],
      settlement: ["Zersiedelung", "Neue Straßen und Häuser versiegeln Böden, zerschneiden Lebensräume und erhöhen den Verkehr.", ["Wohnraum und Infrastruktur", "Versiegelung von Böden", "Zerschneidung von Lebensräumen", "Mehr Verkehr"], "Trade-off: Wohnraum vs. Flächenverbrauch. Lösungen: Innenentwicklung, kompakte Siedlungen, Grünzüge."],
      restoration: ["Renaturierung", "Rückbau von Ufern, Wiedervernässung, Auwald und Mischwald schaffen Lebensräume und verbessern den Wasserhaushalt.", ["Mehr Lebensräume", "Besserer Hochwasserschutz", "Saubereres Wasser", "Kurzfristige Kosten"], "Trade-off: kurzfristige Kosten vs. langfristiger Nutzen. Lösungen: Förderprogramme, Bürgerbeteiligung."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var name = figure.querySelector("[data-landuse-name]");
    var text = figure.querySelector("[data-landuse-text]");
    var list = figure.querySelector("[data-landuse-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Landwirtschaft", "agriculture", true) + button("Forstwirtschaft", "forestry", false) + button("Flussregulierung", "river", false) + button("Zersiedelung", "settlement", false) + button("Renaturierung", "restoration", false);
    }
    function show(key) {
      var entry = uses[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (name) { name.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Zielkonflikt.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("agriculture");
  };

  initializers["restore8"] = function (figure) {
    if (!initOnce(figure, "initRestore8")) { return; }
    var measures = {
      meander: ["Fluss mäandern", "Der Fluss fließt langsamer, bildet Kiesbänke und bietet mehr Lebensräume. Hochwasser wird abgefedert."],
      trees: ["Auwald pflanzen", "Auwald spendet Schatten, stabilisiert die Ufer und bietet Lebensraum für Vögel, Insekten und Amphibien."],
      pond: ["Teiche anlegen", "Teiche und Feuchtflächen schaffen Laichplätze für Amphibien und Lebensraum für Libellen."],
      floodplain: ["Überflutungsflächen", "Überflutungsflächen geben dem Fluss Raum. Hochwasser wird abgefedert, statt stromabwärts zu eskalieren."],
      flowers: ["Blühstreifen", "Blühstreifen bieten Nahrung für Bestäuber und Nützlinge. Sie verbinden Lebensräume."]
    };
    var selected = {};
    var straight = figure.querySelector("[data-restore-river-straight]");
    var meander = figure.querySelector("[data-restore-river-meander]");
    var buttons = $$("[data-restore]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    function render() {
      var keys = Object.keys(selected).filter(function (key) { return selected[key]; });
      if (straight && meander) {
        straight.style.display = selected.meander ? "none" : "";
        meander.style.display = selected.meander ? "" : "none";
      }
      $$("[data-restore-group]", figure).forEach(function (group) {
        group.style.display = selected[group.dataset.restoreGroup] ? "" : "none";
      });
      buttons.forEach(function (btn) { btn.setAttribute("aria-pressed", selected[btn.dataset.restore] ? "true" : "false"); });
      if (!readout) { return; }
      if (!keys.length) {
        readout.innerHTML = "<strong>Ausgangszustand.</strong> Der Fluss ist begradigt, die Ufer sind kahl. Wähle Maßnahmen.";
      } else {
        readout.innerHTML = "<strong>Maßnahmen:</strong> " + keys.map(function (key) { return esc(measures[key][0]); }).join(", ") + ". " + keys.map(function (key) { return esc(measures[key][1]); }).join(" ");
      }
    }
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        selected[btn.dataset.restore] = !selected[btn.dataset.restore];
        render();
      });
    });
    var reset = figure.querySelector("[data-restore-reset]");
    if (reset) {
      reset.addEventListener("click", function () {
        selected = {};
        render();
      });
    }
    render();
  };

  initializers["footprint8"] = function (figure) {
    if (!initOnce(figure, "initFootprint8")) { return; }
    var selects = $$("[data-footprint]", figure);
    var fill = figure.querySelector("[data-footprint-fill]");
    var marker = figure.querySelector("[data-footprint-marker]");
    var result = figure.querySelector("[data-footprint-result]");
    var readout = figure.querySelector("[data-tool-readout]");
    function update() {
      var values = selects.map(function (select) { return Number(select.value) || 2; });
      var score = values.reduce(function (sum, value) { return sum + value; }, 0);
      var earths = score / 4;
      if (result) { result.textContent = de(earths, 1) + " Erden"; }
      var pct = Math.max(0, Math.min(100, ((earths - 1) / 2) * 100));
      if (fill) { fill.style.transform = "scaleX(" + (pct / 100) + ")"; }
      if (marker) { marker.style.left = pct + "%"; }
      var labels = ["Wohnen", "Mobilität", "Ernährung", "Konsum"];
      var max = Math.max.apply(null, values);
      var tips = [];
      values.forEach(function (value, index) { if (value === max && max >= 3) { tips.push(labels[index]); } });
      var tipText = tips.length ? "Die größten Hebel liegen bei: " + tips.join(", ") + "." : "Du hast schon gute Ansatzpunkte. Prüfe, wo du weiter reduzieren kannst.";
      if (readout) {
        readout.innerHTML = "<strong>Ergebnis.</strong> Wenn alle so leben würden, bräuchten wir " + de(earths, 1) + " Erden. " + esc(tipText);
      }
    }
    selects.forEach(function (select) { select.addEventListener("change", update); });
    update();
  };

  initializers["microscope9"] = function (figure) {
    if (!initOnce(figure, "initMicroscope9")) { return; }
    var specimens = {
      onion: ["Zwiebelzellen", "Zwiebelzellen sind eukaryotische Pflanzenzellen. Du siehst Zellwände, Zellkerne und große Vakuolen. Bei 40× siehst du die regelmäßige Anordnung, bei 400× einzelne Kerne."],
      bacteria: ["Bakterien", "Bakterien sind prokaryotisch: kein Zellkern, dafür ein ringförmiges Chromosom. Bei 400× erkennst du Stäbchenformen; die genaue Form braucht oft eine Färbung."],
      yeast: ["Hefe", "Hefe sind eukaryotische Einzeller. Du siehst ovale Zellen, Zellkerne und Knospen. Bei 400× lassen sich Sprossungen erkennen."]
    };
    var zooms = {
      40: [1, "Übersicht: viele Zellen, wenig Detail."],
      100: [1.5, "Mehr Detail: Zellwände und Kerne werden sichtbar."],
      400: [2.2, "Hohe Vergrößerung: einzelne Strukturen, aber nur ein kleiner Ausschnitt."]
    };
    var specimen = "onion";
    var zoom = 40;
    var focused = false;
    var svg = figure.querySelector(".micro-svg");
    var groups = $$("[data-micro-group]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    var focusButton = figure.querySelector("[data-micro-focus]");
    function render() {
      groups.forEach(function (group) {
        var active = group.dataset.microGroup === specimen;
        group.hidden = !active;
        group.style.transform = active ? "scale(" + zooms[zoom][0] + ")" : "scale(1)";
      });
      if (svg) { svg.classList.toggle("is-blurred", !focused); }
      $$("[data-micro-specimen]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.microSpecimen === specimen ? "true" : "false"); });
      $$("[data-micro-zoom]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.microZoom) === zoom ? "true" : "false"); });
      if (focusButton) { focusButton.textContent = focused ? "Unscharf stellen" : "Scharf stellen"; }
      if (!readout) { return; }
      var entry = specimens[specimen];
      var zoomText = zooms[zoom][1];
      if (!focused) {
        readout.innerHTML = "<strong>" + esc(entry[0]) + " bei " + zoom + "×.</strong> Das Bild ist unscharf. Klicke auf „Scharf stellen“.";
      } else {
        readout.innerHTML = "<strong>" + esc(entry[0]) + " bei " + zoom + "×.</strong> " + esc(entry[1]) + " " + esc(zoomText);
      }
    }
    $$("[data-micro-specimen]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { specimen = btn.dataset.microSpecimen; render(); });
    });
    $$("[data-micro-zoom]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { zoom = Number(btn.dataset.microZoom); render(); });
    });
    if (focusButton) {
      focusButton.addEventListener("click", function () { focused = !focused; render(); });
    }
    render();
  };

  initializers["growth9"] = function (figure) {
    if (!initOnce(figure, "initGrowth9")) { return; }
    var line = figure.querySelector("[data-growth-line]");
    var points = figure.querySelector("[data-growth-points]");
    var marker = figure.querySelector("[data-growth-marker]");
    var dot = figure.querySelector("[data-growth-dot]");
    var maxLabel = figure.querySelector("[data-growth-max]");
    var readout = figure.querySelector("[data-tool-readout]");
    var generation = figure.querySelector("[data-growth-generation]");
    var timeButtons = $$("[data-growth-time]", figure);
    var time = 0;
    function countAt(hours, gen) { return 10 * Math.pow(2, (hours * 60) / gen); }
    function render() {
      var gen = Number(generation ? generation.value : 30) || 30;
      var max = countAt(6, gen);
      var coords = [];
      for (var i = 0; i <= 12; i += 1) {
        var hours = i * 0.5;
        var count = countAt(hours, gen);
        var x = 70 + (hours / 6) * 590;
        var y = 250 - (count / max) * 210;
        coords.push(x.toFixed(1) + "," + y.toFixed(1));
      }
      if (line) { line.setAttribute("points", coords.join(" ")); }
      if (points) {
        points.innerHTML = [0, 1, 2, 3, 4, 5, 6].map(function (h) {
          var count = countAt(h, gen);
          var x = 70 + (h / 6) * 590;
          var y = 250 - (count / max) * 210;
          return '<circle class="point" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4"></circle>';
        }).join("");
      }
      if (maxLabel) { maxLabel.textContent = "max. " + de(max, 0); }
      timeButtons.forEach(function (btn) { btn.setAttribute("aria-pressed", Number(btn.dataset.growthTime) === time ? "true" : "false"); });
      var count = countAt(time, gen);
      var x = 70 + (time / 6) * 590;
      var y = 250 - (count / max) * 210;
      if (marker) {
        marker.style.display = time === 0 ? "none" : "";
        marker.setAttribute("x1", x.toFixed(1));
        marker.setAttribute("x2", x.toFixed(1));
      }
      if (dot) {
        dot.style.display = "";
        dot.setAttribute("cx", x.toFixed(1));
        dot.setAttribute("cy", y.toFixed(1));
      }
      if (readout) {
        if (time === 0) {
          readout.innerHTML = "<strong>Start.</strong> 10 Bakterien. Wähle eine Zeit, um die Vermehrung zu berechnen.";
        } else {
          var doublings = (time * 60) / gen;
          readout.innerHTML = "<strong>Nach " + time + " h.</strong> 10 × 2<sup>" + doublings + "</sup> = " + de(count, 0) + " Bakterien bei " + gen + " min Generationszeit.";
        }
      }
    }
    timeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () { time = Number(btn.dataset.growthTime); render(); });
    });
    if (generation) { generation.addEventListener("change", render); }
    render();
  };

  initializers["fermentation9"] = function (figure) {
    if (!initOnce(figure, "initFermentation9")) { return; }
    var ways = {
      lactic: ["Milchsäuregärung", "Glucose → Milchsäure + Energie", ["Mikroorganismen: Milchsäurebakterien", "Bedingung: ohne Sauerstoff", "Produkte: Milchsäure", "Anwendung: Joghurt, Sauerkraut, Silage", "Energie: wenig (2 ATP pro Glucose)"], "Die Säure senkt den pH-Wert und hemmt viele andere Mikroorganismen."],
      alcohol: ["Alkoholische Gärung", "Glucose → Ethanol + Kohlenstoffdioxid + Energie", ["Mikroorganismen: Hefen", "Bedingung: ohne Sauerstoff", "Produkte: Ethanol und CO₂", "Anwendung: Brot, Bier, Wein", "Energie: wenig (2 ATP pro Glucose)"], "Das CO₂ lässt den Brotteig aufgehen; der Alkohol verdampft beim Backen."],
      respiration: ["Zellatmung", "Glucose + Sauerstoff → Kohlenstoffdioxid + Wasser + Energie", ["Mikroorganismen: viele, z. B. Hefen und Bakterien", "Bedingung: mit Sauerstoff", "Produkte: CO₂ und Wasser", "Anwendung: Abbau organischer Stoffe, Kläranlage", "Energie: viel (etwa 30 ATP pro Glucose)"], "Mit Sauerstoff wachsen viele Mikroorganismen schneller; das ist für die Haltbarkeit wichtig."],
      biogas: ["Biogas", "Organische Stoffe → Methan + Kohlenstoffdioxid + Energie", ["Mikroorganismen: Methanbildner", "Bedingung: ohne Sauerstoff", "Produkte: Methan und CO₂", "Anwendung: Energie aus Abfällen", "Energie: im Methan gespeichert"], "Biogas ist erneuerbar, aber die Anlage muss sicher betrieben werden."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-ferment-title]");
    var equation = figure.querySelector("[data-ferment-equation]");
    var list = figure.querySelector("[data-ferment-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Milchsäure", "lactic", true) + button("Alkohol", "alcohol", false) + button("Zellatmung", "respiration", false) + button("Biogas", "biogas", false);
    }
    function show(key) {
      var entry = ways[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (equation) { equation.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("lactic");
  };

  initializers["preservation9"] = function (figure) {
    if (!initOnce(figure, "initPreservation9")) { return; }
    var methods = {
      cooling: ["Kühlen", "Kälte verlangsamt den Stoffwechsel der Mikroorganismen. Sie werden nicht unbedingt abgetötet.", ["Temperatur: etwa 4 °C", "Beispiele: Milch, Fleisch, Salat", "Grenze: Kühlkette darf nicht unterbrochen werden"], "Kühlen hemmt, tötet aber nicht. Nach dem Auftauen können sich Keime schnell vermehren."],
      freezing: ["Gefrieren", "Bei -18 °C wird die Vermehrung gestoppt; viele Mikroorganismen überleben.", ["Temperatur: -18 °C oder kälter", "Beispiele: Gemüse, Fleisch, Fisch", "Grenze: Auftauwasser wegschütten, nicht wieder einfrieren"], "Gefrorene Lebensmittel sind nicht steril."],
      pasteurization: ["Pasteurisieren", "Kurzes Erhitzen tötet viele, aber nicht alle Mikroorganismen.", ["Temperatur: etwa 70 bis 85 °C", "Beispiele: Milch, Saft", "Grenze: Produkt bleibt kühlpflichtig"], "Pasteurisierte Milch ist nicht steril."],
      sterilization: ["Sterilisieren", "Erhitzen auf über 100 °C tötet alle vermehrungsfähigen Mikroorganismen.", ["Temperatur: 121 °C im Autoklaven", "Beispiele: Konserven", "Grenze: Vitamine und Geschmack leiden"], "Sterile Konserven sind lange haltbar, wenn die Dose dicht bleibt."],
      drying: ["Trocknen", "Wasserentzug entzieht Mikroorganismen die Lebensgrundlage.", ["Prinzip: Wasseraktivität sinkt", "Beispiele: Trockenobst, Mehl, Gewürze", "Grenze: Schimmel bei Feuchtigkeit"], "Trockene Lebensmittel müssen trocken gelagert werden."],
      salting: ["Salzen", "Salz entzieht Wasser und hemmt das Wachstum.", ["Prinzip: Osmose, niedrige Wasseraktivität", "Beispiele: Salzfleisch, Käse, Salzgurken", "Grenze: hoher Salzgehalt ist gesundheitlich problematisch"], "Salzen ist kein Ersatz für Kühlung."],
      acid: ["Säuern", "Säure senkt den pH-Wert und hemmt viele Mikroorganismen.", ["Prinzip: pH-Wert unter 4,5", "Beispiele: Essiggurken, Sauerkraut", "Grenze: nicht alle Keime sterben"], "Säurekonservierung nutzt oft Milchsäuregärung."],
      vacuum: ["Vakuum / Schutzgas", "Sauerstoffentzug hemmt aerobe Mikroorganismen.", ["Prinzip: kein Sauerstoff", "Beispiele: Vakuumverpackung, Schutzgas", "Grenze: Anaerobier können trotzdem wachsen"], "Vakuumverpackte Lebensmittel müssen gekühlt werden."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-preserve-title]");
    var text = figure.querySelector("[data-preserve-text]");
    var list = figure.querySelector("[data-preserve-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Kühlen", "cooling", true) + button("Gefrieren", "freezing", false) + button("Pasteurisieren", "pasteurization", false) + button("Sterilisieren", "sterilization", false) + button("Trocknen", "drying", false) + button("Salzen", "salting", false) + button("Säuern", "acid", false) + button("Vakuum", "vacuum", false);
    }
    function show(key) {
      var entry = methods[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Wichtig.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("cooling");
  };

  initializers["dna9"] = function (figure) {
    if (!initOnce(figure, "initDna9")) { return; }
    var pairs = { A: "T", T: "A", G: "C", C: "G" };
    var bonds = { A: 2, T: 2, G: 3, C: 3 };
    var strand = [];
    var partner = [];
    var strandNode = figure.querySelector("[data-dna-strand]");
    var partnerNode = figure.querySelector("[data-dna-partner]");
    var pairsNode = figure.querySelector("[data-dna-pairs]");
    var text = figure.querySelector("[data-dna-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    function render() {
      if (strandNode) { strandNode.textContent = "5\u2032 " + (strand.length ? strand.join(" ") : "…") + " 3\u2032"; }
      if (partnerNode) { partnerNode.textContent = "3\u2032 " + (partner.length ? partner.join(" ") : "…") + " 5\u2032"; }
      if (pairsNode) {
        pairsNode.innerHTML = strand.map(function (base, index) {
          return '<span class="dna-pair"><span>' + esc(base) + '</span><i></i><span>' + esc(partner[index]) + '</span></span>';
        }).join("");
      }
    }
    function add(base) {
      if (strand.length >= 10) { return; }
      var comp = pairs[base];
      strand.push(base);
      partner.push(comp);
      render();
      if (text) { text.textContent = base + " paart mit " + comp + " (" + bonds[base] + " Wasserstoffbrücken)."; }
      if (readout) { readout.innerHTML = "<strong>Komplementär.</strong> " + base + " bindet an " + comp + ". Die Stränge sind komplementär und können als Vorlage dienen."; }
    }
    $$("[data-dna-base]", figure).forEach(function (btn) { btn.addEventListener("click", function () { add(btn.dataset.dnaBase); }); });
    var reset = figure.querySelector("[data-dna-reset]");
    if (reset) {
      reset.addEventListener("click", function () {
        strand = [];
        partner = [];
        render();
        if (text) { text.textContent = "Wähle eine Base. A paart mit T, G mit C."; }
        if (readout) { readout.innerHTML = "<strong>Zurückgesetzt.</strong> Wähle eine Base für den neuen Strang."; }
      });
    }
    render();
  };

  initializers["proteinsynth9"] = function (figure) {
    if (!initOnce(figure, "initProteinSynth9")) { return; }
    var dna = "tac aaa ggg";
    var mrna = "aug uuu ccc";
    var protein = "Met, Phe, Pro";
    var step = 0;
    var dnaNode = figure.querySelector("[data-synth-dna]");
    var mrnaNode = figure.querySelector("[data-synth-mrna]");
    var proteinNode = figure.querySelector("[data-synth-protein]");
    var mrnaRow = figure.querySelector('[data-synth-row="mrna"]');
    var proteinRow = figure.querySelector('[data-synth-row="protein"]');
    var readout = figure.querySelector("[data-tool-readout]");
    function render() {
      if (dnaNode) { dnaNode.textContent = dna; }
      if (mrnaNode) { mrnaNode.textContent = step >= 1 ? mrna : "…"; }
      if (proteinNode) { proteinNode.textContent = step >= 2 ? protein : "…"; }
      if (mrnaRow) { mrnaRow.classList.toggle("is-done", step >= 1); }
      if (proteinRow) { proteinRow.classList.toggle("is-done", step >= 2); }
    }
    function show(text) { render(); if (readout) { readout.innerHTML = text; } }
    $$("[data-synth-step]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.dataset.synthStep;
        if (action === "transcription") {
          step = 1;
          show("<strong>Transkription.</strong> Die DNA-Sequenz tac aaa ggg wird in die mRNA aug uuu ccc umgeschrieben. Uracil ersetzt Thymin.");
        } else if (action === "translation") {
          if (step < 1) {
            show("<strong>Noch keine mRNA.</strong> Führe zuerst die Transkription aus.");
          } else {
            step = 2;
            show("<strong>Translation.</strong> aug codiert Methionin (Start), uuu Phenylalanin, ccc Prolin. Das Protein beginnt mit Met, Phe, Pro.");
          }
        }
      });
    });
    var reset = figure.querySelector("[data-synth-reset]");
    if (reset) {
      reset.addEventListener("click", function () {
        step = 0;
        show("<strong>Zurückgesetzt.</strong> Starte mit der Transkription.");
      });
    }
    render();
    if (readout) { readout.innerHTML = "<strong>Start.</strong> Die DNA liegt vor. Führe die Transkription aus."; }
  };

  initializers["cellcycle9"] = function (figure) {
    if (!initOnce(figure, "initCellcycle9")) { return; }
    var phases = {
      g1: ["G1-Phase", "Die Zelle wächst, bildet Organellen und bereitet die DNA-Verdopplung vor."],
      s: ["S-Phase", "Die DNA wird repliziert. Jedes Chromosom besteht danach aus zwei Chromatiden."],
      g2: ["G2-Phase", "Die Zelle prüft die DNA und bereitet die Mitose vor."],
      m: ["Mitose", "Prophase, Metaphase, Anaphase und Telophase trennen die Chromatiden. Es entstehen zwei genetisch gleiche Tochterzellen."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var arcs = $$("[data-cycle-phase]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("G1", "g1", true) + button("S", "s", false) + button("G2", "g2", false) + button("Mitose", "m", false);
    }
    function show(key) {
      var entry = phases[key];
      if (!entry) { return; }
      arcs.forEach(function (arc) { arc.classList.toggle("is-active", arc.dataset.cyclePhase === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("g1");
  };

  initializers["meiosis9"] = function (figure) {
    if (!initOnce(figure, "initMeiosis9")) { return; }
    var stages = {
      prophase1: ["Prophase I", "Homologe Chromosomen paaren sich. Beim Crossing-over werden Abschnitte zwischen Chromatiden ausgetauscht."],
      metaphase1: ["Metaphase I", "Die homologen Chromosomenpaare ordnen sich in der Äquatorialebene an."],
      anaphase1: ["Anaphase I", "Die homologen Chromosomen werden getrennt und zu den Polen gezogen. Die Zelle wird haploid."],
      meiosis2: ["Meiose II", "Die Schwesterchromatiden werden getrennt. Es entstehen vier haploide Keimzellen."],
      gametes: ["Keimzellen", "Vier haploide Zellen mit unterschiedlicher genetischer Kombination. Bei der Befruchtung entsteht wieder eine diploide Zygote."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var groups = $$("[data-meiosis-stage]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Prophase I", "prophase1", true) + button("Metaphase I", "metaphase1", false) + button("Anaphase I", "anaphase1", false) + button("Meiose II", "meiosis2", false) + button("Keimzellen", "gametes", false);
    }
    function show(key) {
      var entry = stages[key];
      if (!entry) { return; }
      groups.forEach(function (group) {
        var circle = group.querySelector(".stage");
        if (circle) { circle.classList.toggle("is-active", group.dataset.meiosisStage === key); }
      });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("prophase1");
  };

  initializers["karyogram9"] = function (figure) {
    if (!initOnce(figure, "initKaryogram9")) { return; }
    var container = figure.querySelector("[data-karyo-pairs]");
    var readout = figure.querySelector("[data-tool-readout]");
    var mode = "normal";
    function build() {
      if (!container) { return; }
      var ns = "http://www.w3.org/2000/svg";
      container.innerHTML = "";
      for (var i = 1; i <= 23; i += 1) {
        var col = (i - 1) % 8;
        var row = Math.floor((i - 1) / 8);
        var x = 50 + col * 80;
        var y = 20 + row * 75;
        var group = document.createElementNS(ns, "g");
        group.setAttribute("data-karyo-pair", String(i));
        var left = document.createElementNS(ns, "rect");
        left.setAttribute("class", "pair");
        left.setAttribute("x", x);
        left.setAttribute("y", y);
        left.setAttribute("width", 8);
        left.setAttribute("height", 34);
        left.setAttribute("rx", 3);
        group.appendChild(left);
        var right = document.createElementNS(ns, "rect");
        right.setAttribute("class", "pair");
        right.setAttribute("x", x + 12);
        right.setAttribute("y", y);
        right.setAttribute("width", 8);
        right.setAttribute("height", 34);
        right.setAttribute("rx", 3);
        group.appendChild(right);
        if (i === 21) {
          var extra = document.createElementNS(ns, "rect");
          extra.setAttribute("class", "extra");
          extra.setAttribute("x", x + 24);
          extra.setAttribute("y", y);
          extra.setAttribute("width", 8);
          extra.setAttribute("height", 34);
          extra.setAttribute("rx", 3);
          extra.setAttribute("data-karyo-extra", "true");
          extra.style.display = mode === "trisomy21" ? "" : "none";
          group.appendChild(extra);
        }
        var label = document.createElementNS(ns, "text");
        label.setAttribute("class", "pair-label");
        label.setAttribute("x", x + 10);
        label.setAttribute("y", y + 50);
        label.textContent = String(i);
        group.appendChild(label);
        container.appendChild(group);
      }
      var pair21 = container.querySelector('[data-karyo-pair="21"]');
      if (pair21) {
        Array.prototype.forEach.call(pair21.querySelectorAll(".pair, .extra"), function (bar) {
          bar.classList.toggle("is-highlighted", mode === "trisomy21");
        });
      }
    }
    function setMode(key) {
      mode = key;
      build();
      $$("[data-karyo-mode]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.karyoMode === key ? "true" : "false"); });
      if (readout) {
        readout.innerHTML = key === "trisomy21"
          ? "<strong>Trisomie 21.</strong> Drei Kopien von Chromosom 21. Ursache ist meist eine fehlerhafte Trennung in der Meiose. Der Phänotyp ist unterschiedlich; ein Karyogramm ist keine Prognose."
          : "<strong>Typisches Karyogramm.</strong> 46 Chromosomen, 23 Paare. Die Geschlechtschromosomen sind hier nicht unterschieden; das Schema zeigt die Autosomen.";
      }
    }
    $$("[data-karyo-mode]", figure).forEach(function (btn) { btn.addEventListener("click", function () { setMode(btn.dataset.karyoMode); }); });
    setMode("normal");
  };

  initializers["genetech9"] = function (figure) {
    if (!initOnce(figure, "initGenetech9")) { return; }
    var steps = {
      identify: ["1. Gen identifizieren", "Zuerst muss bekannt sein, welches Gen das gewünschte Protein codiert.", ["Quelle: z. B. menschliche Insulinzellen", "Werkzeug: Gendatenbank, Sequenzanalyse", "Frage: Ist das Gen in einem geeigneten Organismus verfügbar?"], "Ohne klare Zielsequenz ist keine gezielte Übertragung möglich."],
      cut: ["2. DNA schneiden", "Restriktionsenzyme schneiden die DNA an definierten Sequenzen.", ["Restriktionsenzym", "spezifische Schnittstelle", "klebende Enden"], "Die Schnittstelle muss zum Vektor passen."],
      insert: ["3. Plasmid einfügen", "Das Gen wird in ein Plasmid eingefügt und mit Ligase verbunden.", ["Vektor: Plasmid", "Ligase", "rekombinantes Plasmid"], "Das Plasmid ist der Transportvektor in die Bakterienzelle."],
      transform: ["4. Bakterien transformieren", "Bakterien nehmen das Plasmid auf.", ["Transformation", "Selektionsmarker", "Kontrollen"], "Nur ein Teil der Bakterien nimmt das Plasmid auf; der Marker hilft bei der Auswahl."],
      produce: ["5. Protein produzieren", "Die Bakterien werden vermehrt, und das Protein wird gereinigt.", ["Fermentation", "Reinigung", "Qualitätskontrolle"], "Das Protein muss auf Reinheit und Wirkung geprüft werden."],
      evaluate: ["6. Bewerten", "Chancen und Risiken der Anwendung werden geprüft.", ["Medizin", "Landwirtschaft", "Umwelt", "Ethik und Recht"], "Die Bewertung hängt von der konkreten Anwendung ab."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-genetech-title]");
    var text = figure.querySelector("[data-genetech-text]");
    var list = figure.querySelector("[data-genetech-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Gen", "identify", true) + button("Schneiden", "cut", false) + button("Einfügen", "insert", false) + button("Transformieren", "transform", false) + button("Produzieren", "produce", false) + button("Bewerten", "evaluate", false);
    }
    function show(key) {
      var entry = steps[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Prinzip.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("identify");
  };

  initializers["fossil9"] = function (figure) {
    if (!initOnce(figure, "initFossil9")) { return; }
    var examples = {
      tiktaalik: ["Tiktaalik", "Tiktaalik (ca. 375 Mio. Jahre): Fischmerkmale wie Schuppen und Kiemen, aber auch tetrapodenartige Gliedmaßen und ein beweglicher Hals. Ein Übergang zwischen Fischen und Landwirbeltieren."],
      archaeopteryx: ["Archaeopteryx", "Archaeopteryx (ca. 150 Mio. Jahre): Federn und Flügel wie Vögel, aber Zähne, Krallen und ein langer Schwanz wie Reptilien. Ein Beleg für die Verwandtschaft von Dinosauriern und Vögeln."],
      whale: ["Wal-Reihe", "Pakicetus, Ambulocetus und Basilosaurus zeigen den Übergang von landlebenden Säugetieren zu vollständig aquatischen Walen. Knochen und Gene stützen die Verwandtschaft."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var nodes = $$("[data-fossil-node]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Tiktaalik", "tiktaalik", true) + button("Archaeopteryx", "archaeopteryx", false) + button("Wal-Reihe", "whale", false);
    }
    function show(key) {
      var entry = examples[key];
      if (!entry) { return; }
      nodes.forEach(function (group) {
        var circle = group.querySelector(".node");
        if (circle) { circle.classList.toggle("is-active", group.dataset.fossilNode === key); }
      });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("tiktaalik");
  };

  initializers["selection9"] = function (figure) {
    if (!initOnce(figure, "initSelection9")) { return; }
    var light = 50;
    var dark = 50;
    var generation = 1;
    var background = "light";
    var lightBar = figure.querySelector("[data-selection-light]");
    var darkBar = figure.querySelector("[data-selection-dark]");
    var lightValue = figure.querySelector("[data-selection-light-value]");
    var darkValue = figure.querySelector("[data-selection-dark-value]");
    var generationNode = figure.querySelector("[data-selection-generation]");
    var readout = figure.querySelector("[data-tool-readout]");
    function render() {
      if (lightBar) { lightBar.style.transform = "scaleX(" + (light / 100) + ")"; }
      if (darkBar) { darkBar.style.transform = "scaleX(" + (dark / 100) + ")"; }
      if (lightValue) { lightValue.textContent = de(light, 0) + " %"; }
      if (darkValue) { darkValue.textContent = de(dark, 0) + " %"; }
      if (generationNode) { generationNode.textContent = "Generation " + generation; }
    }
    function setText(text) { render(); if (readout) { readout.innerHTML = text; } }
    function reset() {
      light = 50;
      dark = 50;
      generation = 1;
      setText("<strong>Start.</strong> 50 % helle und 50 % dunkle Käfer. Wähle einen Untergrund und starte die nächste Generation.");
    }
    function next() {
      if (generation >= 6) {
        setText("<strong>Modellende.</strong> Setze zurück, um einen neuen Durchlauf zu starten.");
        return;
      }
      var lightSurvival = background === "light" ? 0.9 : 0.5;
      var darkSurvival = background === "light" ? 0.5 : 0.9;
      var total = light * lightSurvival + dark * darkSurvival;
      light = (light * lightSurvival / total) * 100;
      dark = 100 - light;
      generation += 1;
      var text = background === "light"
        ? "<strong>Heller Untergrund.</strong> Dunkle Käfer sind leichter zu sehen und haben weniger Nachkommen. Der Anteil heller Käfer steigt."
        : "<strong>Dunkler Untergrund.</strong> Helle Käfer sind leichter zu sehen und haben weniger Nachkommen. Der Anteil dunkler Käfer steigt.";
      setText(text);
    }
    $$("[data-selection-bg]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        background = btn.dataset.selectionBg;
        $$("[data-selection-bg]", figure).forEach(function (inner) { inner.setAttribute("aria-pressed", inner === btn ? "true" : "false"); });
        reset();
        setText(background === "light" ? "<strong>Heller Untergrund gewählt.</strong> Starte die nächste Generation." : "<strong>Dunkler Untergrund gewählt.</strong> Starte die nächste Generation.");
      });
    });
    var nextButton = figure.querySelector("[data-selection-next]");
    if (nextButton) { nextButton.addEventListener("click", next); }
    var resetButton = figure.querySelector("[data-selection-reset]");
    if (resetButton) { resetButton.addEventListener("click", reset); }
    reset();
  };

  initializers["isolation9"] = function (figure) {
    if (!initOnce(figure, "initIsolation9")) { return; }
    var left = 50;
    var right = 50;
    var generation = 1;
    var mode = "isolated";
    var leftGroup = figure.querySelector("[data-isolation-dots-left]");
    var rightGroup = figure.querySelector("[data-isolation-dots-right]");
    var bridge = figure.querySelector("[data-isolation-bridge]");
    var status = figure.querySelector("[data-isolation-status]");
    var readout = figure.querySelector("[data-tool-readout]");
    function clamp(value) { return Math.max(5, Math.min(95, value)); }
    function drawDots(group, frequency, offsetX) {
      if (!group) { return; }
      var ns = "http://www.w3.org/2000/svg";
      group.innerHTML = "";
      var lightCount = Math.round(frequency / 10);
      for (var i = 0; i < 10; i += 1) {
        var dot = document.createElementNS(ns, "circle");
        dot.setAttribute("class", i < lightCount ? "dot" : "dot is-dark");
        dot.setAttribute("cx", offsetX + (i % 5) * 45);
        dot.setAttribute("cy", 70 + Math.floor(i / 5) * 50);
        dot.setAttribute("r", 12);
        group.appendChild(dot);
      }
    }
    function render() {
      drawDots(leftGroup, left, 70);
      drawDots(rightGroup, right, 450);
      if (bridge) { bridge.style.display = mode === "connected" ? "" : "none"; }
      if (status) { status.textContent = mode === "isolated" ? "Isolation: Die Populationen sind getrennt." : "Genfluss: Eine Brücke verbindet die Populationen."; }
    }
    function setText(text) { render(); if (readout) { readout.innerHTML = text; } }
    function next() {
      if (generation >= 8) {
        setText("<strong>Modellende.</strong> Setze zurück, um einen neuen Durchlauf zu starten.");
        return;
      }
      if (mode === "isolated") {
        left = clamp(left + 6);
        right = clamp(right - 5);
      } else {
        var mean = (left + right) / 2;
        left = clamp(left + (mean - left) * 0.35);
        right = clamp(right + (mean - right) * 0.35);
      }
      generation += 1;
      setText(mode === "isolated"
        ? "<strong>Isolation.</strong> Kein Genfluss: Die Populationen entwickeln sich unterschiedlich. Die Allelhäufigkeiten driften auseinander."
        : "<strong>Genfluss.</strong> Die Populationen tauschen Gene aus. Die Allelhäufigkeiten nähern sich an.");
    }
    $$("[data-isolation-mode]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        mode = btn.dataset.isolationMode;
        $$("[data-isolation-mode]", figure).forEach(function (inner) { inner.setAttribute("aria-pressed", inner === btn ? "true" : "false"); });
        setText(mode === "isolated" ? "<strong>Isolation gewählt.</strong> Der Fluss trennt die Populationen." : "<strong>Genfluss gewählt.</strong> Eine Brücke verbindet die Populationen.");
      });
    });
    var nextButton = figure.querySelector("[data-isolation-next]");
    if (nextButton) { nextButton.addEventListener("click", next); }
    var resetButton = figure.querySelector("[data-isolation-reset]");
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        left = 50;
        right = 50;
        generation = 1;
        setText("<strong>Start.</strong> Beide Populationen haben 50 % helle und 50 % dunkle Varianten.");
      });
    }
    setText("<strong>Start.</strong> Beide Populationen haben 50 % helle und 50 % dunkle Varianten.");
  };

  initializers["trachea9"] = function (figure) {
    if (!initOnce(figure, "initTrachea9")) { return; }
    var systems = {
      trachea: ["Tracheen", "Feine Luftröhren bringen Sauerstoff direkt zu den Zellen. Stigmen an der Körperoberfläche verbinden sie mit der Luft; der Gasaustausch läuft über Diffusion."],
      circulation: ["Offener Blutkreislauf", "Hämolymphe fließt teilweise frei in der Körperhöhle. Das dorsale Gefäß pumpt sie. Sie transportiert Nährstoffe und Hormone, aber kaum Sauerstoff."],
      comparison: ["Vergleich mit Wirbeltieren", "Wirbeltiere haben einen geschlossenen Kreislauf und Lungen oder Kiemen. Insekten haben Tracheen und einen offenen Kreislauf."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var groups = $$("[data-trachea-part]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Tracheen", "trachea", true) + button("Blutkreislauf", "circulation", false) + button("Vergleich", "comparison", false);
    }
    function show(key) {
      var entry = systems[key];
      if (!entry) { return; }
      groups.forEach(function (group) {
        var active = group.dataset.tracheaPart === key || (key === "comparison" && (group.dataset.tracheaPart === "trachea" || group.dataset.tracheaPart === "circulation"));
        group.classList.toggle("is-active", active);
      });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("trachea");
  };

  initializers["mouthparts9"] = function (figure) {
    if (!initOnce(figure, "initMouthparts9")) { return; }
    var types = {
      biting: ["Beißend-kauend", "Kräftige Mandibeln zerkleinern feste Nahrung.", ["Beispiel: Heuschrecke", "Nahrung: Blätter und Gräser", "Bedeutung: mögliche Pflanzenschädlinge"], "Die Mundwerkzeuge sind an feste Pflanzennahrung angepasst."],
      sucking: ["Saugend", "Ein langer Rüssel saugt Nektar aus Blüten.", ["Beispiel: Schmetterling", "Nahrung: Nektar", "Bedeutung: Bestäubung"], "Beim Nektarsaugen werden Pollen übertragen."],
      piercing: ["Stechend-saugend", "Ein feiner Stechrüssel durchdringt Haut und saugt Blut.", ["Beispiel: Stechmücke", "Nahrung: Blut", "Bedeutung: mögliche Krankheitsübertragung"], "Stechmücken können Krankheitserreger übertragen."],
      licking: ["Leckend", "Ein behaarter Rüssel leckt Nektar und süße Flüssigkeiten.", ["Beispiel: Biene", "Nahrung: Nektar", "Bedeutung: Bestäubung und Honig"], "Bienen sind wichtige Bestäuber."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-mouth-title]");
    var text = figure.querySelector("[data-mouth-text]");
    var list = figure.querySelector("[data-mouth-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Beißend", "biting", true) + button("Saugend", "sucking", false) + button("Stechend", "piercing", false) + button("Leckend", "licking", false);
    }
    function show(key) {
      var entry = types[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Bedeutung.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("biting");
  };

  initializers["metamorphosis9"] = function (figure) {
    if (!initOnce(figure, "initMetamorphosis9")) { return; }
    var paths = {
      incomplete: ["Unvollkommene Verwandlung", "Ei, Nymphe, adult. Die Nymphe ähnelt dem adulten Tier und häutet sich mehrmals. Beispiel: Heuschrecke.", ["egg-incomplete", "nymph", "adult-incomplete"]],
      complete: ["Vollkommene Verwandlung", "Ei, Larve, Puppe, adult. Die Larve lebt und frisst anders als das adulte Tier. Beispiel: Schmetterling, Käfer, Biene.", ["egg-complete", "larva", "pupa", "adult-complete"]],
      larva: ["Larve", "Die Larve ist die Wachstumsphase. Sie häutet sich mehrmals und verpuppt sich bei vollkommener Verwandlung.", ["larva"]],
      pupa: ["Puppe", "In der Puppe werden die larvalen Organe umgebaut. Aus ihr schlüpft das adulte Tier.", ["pupa"]]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var groups = $$("[data-metamorphosis-stage]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Unvollkommen", "incomplete", true) + button("Vollkommen", "complete", false) + button("Larve", "larva", false) + button("Puppe", "pupa", false);
    }
    function show(key) {
      var entry = paths[key];
      if (!entry) { return; }
      groups.forEach(function (group) {
        var circle = group.querySelector(".stage");
        if (circle) { circle.classList.toggle("is-active", entry[2].indexOf(group.dataset.metamorphosisStage) !== -1); }
      });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("incomplete");
  };

  initializers["communication9"] = function (figure) {
    if (!initOnce(figure, "initCommunication9")) { return; }
    var signals = {
      optical: ["Optische Signale", "Farben, Muster, Leuchtsignale oder Bewegungen.", ["Glühwürmchen: Leuchtsignale zur Partnersuche", "Bienen: Tanzsprache zur Orientierung", "Warnfarben und Tarnung"], "Optische Signale wirken oft über kurze Distanz."],
      acoustic: ["Akustische Signale", "Töne, Gesänge oder Vibrationen.", ["Zikaden: laute Gesänge", "Grillen: Stridulation", "Mücken: Flugton"], "Akustische Signale können über weite Distanzen wirken."],
      chemical: ["Chemische Signale", "Pheromone und Duftstoffe.", ["Bienen: Alarmpheromone", "Schmetterlinge: Sexuallockstoffe", "Ameisen: Duftspuren"], "Pheromone sind oft artspezifisch und sehr wirksam."],
      tactile: ["Taktile Signale", "Berührung und Vibration.", ["Bienen: Schwänzeltanz mit Vibration", "Ameisen: Fühlerkontakt", "Wasserläufer: Wellen"], "Taktile Signale sind wichtig in Staaten."],
      mimicry: ["Mimikry und Mimese", "Nachahmung von Signalen oder Umgebung.", ["Mimikry: Nachahmung eines gefährlichen Vorbilds", "Mimese: Tarnung als Umgebung", "Beispiel: Schwebfliege ähnelt Wespe"], "Tarnung und Warnsignale sind Anpassungen an Fressfeinde."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-comm-title]");
    var text = figure.querySelector("[data-comm-text]");
    var list = figure.querySelector("[data-comm-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Optisch", "optical", true) + button("Akustisch", "acoustic", false) + button("Chemisch", "chemical", false) + button("Taktil", "tactile", false) + button("Mimikry", "mimicry", false);
    }
    function show(key) {
      var entry = signals[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Funktion.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("optical");
  };

  initializers["soilfoodweb9"] = function (figure) {
    if (!initOnce(figure, "initSoilfoodweb9")) { return; }
    var groups = {
      microbes: ["Bakterien und Pilze", "Sie bauen organische Stoffe ab und mineralisieren Nährstoffe.", ["Bakterien: abbauen leicht lösliche Stoffe", "Pilze: zersetzen schwer abbaubare Stoffe wie Lignin", "Mykorrhiza: Pilze versorgen Pflanzen mit Nährstoffen"], "Ohne Mikroorganismen würde sich Streu nicht abbauen."],
      earthworm: ["Regenwurm", "Er frisst Streu und Boden, durchmischt die Horizonte und hinterlässt nährstoffreiche Ausscheidungen.", ["Baut Gangsysteme", "Durchmischt Boden und Streu", "Fördert Wasserinfiltration"], "Regenwürmer sind Ingenieure des Bodens."],
      microarthropods: ["Milben und Springschwänze", "Kleine Bodenbewohner, die Streu zerkleinern und Pilze fressen.", ["Zerkleinern Streu", "Fressen Pilze und Bakterien", "Dienen größeren Tieren als Nahrung"], "Sie beschleunigen den Abbau."],
      roots: ["Wurzeln", "Sie versorgen Pflanzen, stabilisieren den Boden und geben organische Stoffe ab.", ["Aufnahme von Wasser und Nährstoffen", "Bildung von Wurzelraum", "Abgabe von Zucker an Mykorrhiza"], "Wurzeln sind Teil des Bodenlebens."],
      foodweb: ["Nahrungsnetz", "Bodenorganismen sind vielfältig verbunden. Störungen können Kettenreaktionen auslösen.", ["Produzenten: Pflanzen", "Destruenten: Bakterien und Pilze", "Konsumenten: Regenwürmer, Milben, Springschwänze", "Räuber: Laufkäfer, Spinnen"], "Ein gesunder Boden braucht viele Akteure."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-soilfood-title]");
    var text = figure.querySelector("[data-soilfood-text]");
    var list = figure.querySelector("[data-soilfood-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Mikroben", "microbes", true) + button("Regenwurm", "earthworm", false) + button("Milben", "microarthropods", false) + button("Wurzeln", "roots", false) + button("Nahrungsnetz", "foodweb", false);
    }
    function show(key) {
      var entry = groups[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Bedeutung.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("microbes");
  };

  initializers["carbon9"] = function (figure) {
    if (!initOnce(figure, "initCarbon9")) { return; }
    var processes = {
      photosynthesis: ["Photosynthese", "Pflanzen nehmen CO₂ auf und bauen organische Stoffe. Kohlenstoff wird in Biomasse gespeichert."],
      respiration: ["Zellatmung", "Pflanzen, Tiere und Mikroorganismen setzen CO₂ frei, wenn sie organische Stoffe abbauen."],
      decomposition: ["Abbau", "Destruenten zersetzen abgestorbene Biomasse. Ein Teil des Kohlenstoffs wird als CO₂ freigesetzt, ein Teil wird Humus."],
      humus: ["Humus", "Organische Substanz im Boden speichert Kohlenstoff über lange Zeit. Humus verbessert Wasserhaltung und Fruchtbarkeit."],
      combustion: ["Verbrennung", "Fossile Brennstoffe setzen Kohlenstoff frei, der lange im Boden gespeichert war. Das erhöht den CO₂-Gehalt der Atmosphäre."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var paths = $$("[data-carbon-path]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Photosynthese", "photosynthesis", true) + button("Zellatmung", "respiration", false) + button("Abbau", "decomposition", false) + button("Humus", "humus", false) + button("Verbrennung", "combustion", false);
    }
    function show(key) {
      var entry = processes[key];
      if (!entry) { return; }
      paths.forEach(function (path) { path.classList.toggle("is-active", path.dataset.carbonPath === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("photosynthesis");
  };

  initializers["soilimpact9"] = function (figure) {
    if (!initOnce(figure, "initSoilimpact9")) { return; }
    var impacts = {
      fertilization: ["Düngung", "Nährstoffe steigern Erträge, können aber ins Grundwasser gelangen und Gewässer belasten.", ["Stickstoff und Phosphat", "Überdüngung", "Eutrophierung"], "Bedarfsgerecht düngen, Zwischenfrüchte anbauen."],
      pesticides: ["Pestizide", "Sie bekämpfen Schädlinge, können aber Nützlinge und Bodenleben schädigen.", ["Insektizide", "Herbizide", "Fungizide"], "Integrierten Pflanzenschutz nutzen."],
      compaction: ["Verdichtung", "Schwere Maschinen pressen Bodenporen zusammen; Wasser und Luft können schlechter eindringen.", ["Schwere Erntemaschinen", "Zu feuchte Böden", "Weniger Wurzelwachstum"], "Befahrung reduzieren und den Boden schonen."],
      sealing: ["Versiegelung", "Straßen und Gebäude bedecken Boden; seine Funktionen gehen verloren.", ["Flächenverbrauch", "Mehr Oberflächenabfluss", "Verlust von Lebensraum"], "Innenentwicklung statt neuer Flächen."],
      erosion: ["Erosion", "Wasser und Wind tragen Boden ab, besonders auf geneigten, unbedeckten Flächen.", ["Regen", "Wind", "Hanglage"], "Bodenbedeckung, Hecken und Terrassen."],
      monoculture: ["Monokultur", "Immer dieselbe Kulturart kann Schädlinge fördern und die Bodenfruchtbarkeit verringern.", ["Geringe Vielfalt", "Schädlingsdruck", "Nährstoffverarmung"], "Fruchtwechsel und Vielfalt."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-impact-title]");
    var text = figure.querySelector("[data-impact-text]");
    var list = figure.querySelector("[data-impact-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Düngung", "fertilization", true) + button("Pestizide", "pesticides", false) + button("Verdichtung", "compaction", false) + button("Versiegelung", "sealing", false) + button("Erosion", "erosion", false) + button("Monokultur", "monoculture", false);
    }
    function show(key) {
      var entry = impacts[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Tipp.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("fertilization");
  };

  initializers["soilmanage9"] = function (figure) {
    if (!initOnce(figure, "initSoilmanage9")) { return; }
    var measures = {
      rotation: ["Fruchtwechsel", "Verschiedene Kulturen in Folge brechen Schädlingszyklen und schonen Nährstoffe.", ["Abwechslung", "Weniger Schädlinge", "Bessere Bodenstruktur"], "Mehrjährige Fruchtfolgen planen."],
      cover: ["Zwischenfrüchte", "Pflanzen bedecken den Boden zwischen den Hauptkulturen und schützen vor Erosion.", ["Bodenschutz", "Nährstoffbindung", "Lebensraum"], "Zwischenfrüchte nicht zu spät säen."],
      mulch: ["Mulch", "Eine Schutzschicht aus organischem Material hält Feuchtigkeit und schützt vor Erosion.", ["Weniger Verdunstung", "Unkrautunterdrückung", "Nahrung für Bodenleben"], "Mulch nicht zu dick auftragen."],
      organic: ["Organische Düngung", "Kompost und Mist liefern Nährstoffe und Humus.", ["Nährstoffe", "Humusaufbau", "Bodenleben"], "Nicht überdüngen."],
      tillage: ["Reduzierte Bodenbearbeitung", "Weniger Pflügen schont Bodenstruktur und Bodenleben.", ["Weniger Erosion", "Mehr Bodenleben", "Kohlenstoffspeicherung"], "Nicht bei zu nassem Boden bearbeiten."],
      agroforestry: ["Agroforst", "Bäume und Ackerbau auf derselben Fläche schützen den Boden und erhöhen die Vielfalt.", ["Windschutz", "Schatten", "Mehr Biodiversität"], "Standortgerechte Gehölze wählen."],
      renaturation: ["Renaturierung", "Moore, Auen und Brachen wiederherstellen, um Boden und Wasser zu schützen.", ["Wasserrückhalt", "Kohlenstoffspeicher", "Lebensraum"], "Langfristig planen und die Entwicklung beobachten."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-manage-title]");
    var text = figure.querySelector("[data-manage-text]");
    var list = figure.querySelector("[data-manage-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Fruchtwechsel", "rotation", true) + button("Zwischenfrüchte", "cover", false) + button("Mulch", "mulch", false) + button("Kompost", "organic", false) + button("Bearbeitung", "tillage", false) + button("Agroforst", "agroforestry", false) + button("Renaturierung", "renaturation", false);
    }
    function show(key) {
      var entry = measures[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (text) { text.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Tipp.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("rotation");
  };

  initializers["decision10"] = function (figure) {
    if (!initOnce(figure, "initDecision10")) { return; }
    var cases = {
      impfung: {
        title: "Impfung",
        options: ["Impfen", "Nicht impfen", "Später entscheiden"],
        criteria: [
          ["Schutz vor schwerer Krankheit", [3, 1, 1]],
          ["Nebenwirkungen", [2, 3, 2]],
          ["Aufwand und Termin", [2, 3, 3]],
          ["Beitrag zur Herdenimmunität", [3, 1, 1]]
        ],
        text: "Die Matrix spricht für das Impfen, weil der Schutz und der Beitrag zur Gemeinschaft hoch gewichtet sind. Nebenwirkungen und Aufwand sind real, aber im Verhältnis geringer. Die Empfehlung ersetzt kein ärztliches Gespräch."
      },
      ernaehrung: {
        title: "Ernährung",
        options: ["Ausgewogen", "Fast Food", "Vegetarisch"],
        criteria: [
          ["Nährstoffversorgung", [3, 1, 3]],
          ["Zeitaufwand", [2, 3, 2]],
          ["Kosten", [2, 2, 3]],
          ["Umweltbelastung", [2, 1, 3]]
        ],
        text: "Ausgewogen und vegetarisch schneiden bei Nährstoffen und Umwelt besser ab; Fast Food ist schnell, aber schwächer bei der Versorgung. Die beste Wahl hängt von Zeit, Budget und persönlichen Bedürfnissen ab."
      },
      bildschirmzeit: {
        title: "Bildschirmzeit",
        options: ["Klar begrenzen", "Frei nutzen", "Handyfreie Zonen"],
        criteria: [
          ["Konzentration", [3, 1, 3]],
          ["Sozialkontakt", [2, 3, 3]],
          ["Erholung und Schlaf", [3, 1, 2]],
          ["Selbstbestimmung", [2, 3, 2]]
        ],
        text: "Klare Grenzen und handyfreie Zonen schützen Konzentration und Schlaf, ohne den Sozialkontakt zu verbieten. Freie Nutzung maximiert die Selbstbestimmung, kann aber Erholung und Konzentration belasten."
      }
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var titleNode = figure.querySelector("[data-decision-title]");
    var matrixNode = figure.querySelector("[data-decision-matrix]");
    var textNode = figure.querySelector("[data-decision-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Impfung", "impfung", true) + button("Ernährung", "ernaehrung", false) + button("Bildschirmzeit", "bildschirmzeit", false);
    }
    function show(key) {
      var entry = cases[key];
      if (!entry) { return; }
      var totals = entry.options.map(function () { return 0; });
      var rows = entry.criteria.map(function (criterion) {
        var scores = criterion[1];
        scores.forEach(function (score, index) { totals[index] += score; });
        return "<tr><th scope=\"row\">" + esc(criterion[0]) + "</th>" + scores.map(function (score) {
          return "<td>" + score + "</td>";
        }).join("") + "</tr>";
      }).join("");
      var best = totals.indexOf(Math.max.apply(null, totals));
      var totalRow = "<tr><th scope=\"row\">Gesamt</th>" + totals.map(function (total, index) {
        return '<td class="' + (index === best ? "is-best" : "") + '">' + total + "</td>";
      }).join("") + "</tr>";
      if (titleNode) { titleNode.textContent = entry.title; }
      if (matrixNode) {
        matrixNode.innerHTML = '<table><thead><tr><th scope="col">Kriterium</th>' + entry.options.map(function (option) {
          return '<th scope="col">' + esc(option) + "</th>";
        }).join("") + "</tr></thead><tbody>" + rows + totalRow + "</tbody></table>";
      }
      if (textNode) { textNode.textContent = entry.text; }
      if (readout) {
        readout.innerHTML = "<strong>Empfehlung im Modell: " + esc(entry.options[best]) + ".</strong> Die Summe gewichtet alle Kriterien gleich. Eine andere Gewichtung kann die Empfehlung verändern.";
      }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("impfung");
  };


  initializers["microbiome10"] = function (figure) {
    if (!initOnce(figure, "initMicrobiome10")) { return; }
    var sites = {
      skin: ["Haut", "Die Haut ist trocken bis fettig und leicht sauer. Viele Bakterien und Pilze leben in den Poren und auf der Oberfläche.", ["Staphylococcus epidermidis: häufigster Hautbewohner", "Corynebacterium: an Feuchtstellen", "Malassezia: Hefe auf der Haut", "Säureschutzmantel hemmt viele Pathogene"], "Häufiges Waschen mit aggressiven Produkten kann die Hautflora stören."],
      mouth: ["Mund", "Der Mund ist feucht, warm und nährstoffreich. Bakterien bilden dort eine vielfältige Gemeinschaft und einen Biofilm auf den Zähnen.", ["Streptococcus: frühe Besiedler", "Veillonella: nutzt Stoffwechselprodukte anderer Bakterien", "Candida: Hefe, meist harmlos", "Zahnbelag ist ein Biofilm"], "Regelmäßiges Zähneputzen stört schädliche Biofilme, nicht die gesamte Mundflora."],
      gut: ["Darm", "Der Darm beherbergt die artenreichste Gemeinschaft. Bakterien verwerten Ballaststoffe und bilden kurzkettige Fettsäuren.", ["Bacteroides und Firmicutes: große Gruppen", "Lactobacillus und Bifidobacterium: Milchsäurebakterien", "Ballaststoffe werden zu Fettsäuren vergoren", "Das Immunsystem lernt an der Darmwand"], "Antibiotika können die Darmflora verändern; die Gemeinschaft erholt sich oft, aber nicht immer vollständig."],
      respiratory: ["Atemwege", "Die Atemwege sind mit Schleimhaut ausgekleidet. Das Mikrobiom ist ärmer als im Darm, aber wichtig für die Abwehr.", ["Streptococcus und Neisseria: typische Bewohner", "Haemophilus: kann bei geschwächter Abwehr Krankheiten auslösen", "Flimmerhärchen transportieren Schleim ab", "Viren können die Schleimhaut schädigen"], "Rauchen und Feinstaub schädigen die Schleimhaut und verändern die Gemeinschaft."],
      vagina: ["Vagina", "Die Vagina hat ein eigenes Mikrobiom. Milchsäurebakterien bilden Milchsäure und halten den pH-Wert niedrig.", ["Lactobacillus: dominant bei vielen Menschen", "Milchsäure senkt den pH-Wert", "Niedriger pH-Wert hemmt viele Pathogene", "Die Zusammensetzung ist individuell verschieden"], "Die Vagina ist kein steriler Raum. Eine gesunde Gemeinschaft ist wichtiger als Keimfreiheit."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-microbiome-title]");
    var textNode = figure.querySelector("[data-microbiome-text]");
    var list = figure.querySelector("[data-microbiome-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Haut", "skin", true) + button("Mund", "mouth", false) + button("Darm", "gut", false) + button("Atemwege", "respiratory", false) + button("Vagina", "vagina", false);
    }
    function show(key) {
      var entry = sites[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (textNode) { textNode.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>Wichtig.</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("skin");
  };

  initializers["bacteria10"] = function (figure) {
    if (!initOnce(figure, "initBacteria10")) { return; }
    var bacteria = {
      lactobacillus: ["Lactobacillus", "Symbiont", "natürliche Besiedlung", "keine", "keine", "Milchsäurebakterien vergären Zucker zu Milchsäure. Sie kommen in Joghurt, Sauerkraut und im Mikrobiom vor."],
      ecoli: ["E. coli", "Kommensale und Pathogen", "fäkal-oral", "Harnwegsinfekt, Durchfall", "Flüssigkeit, ggf. Antibiotikum", "Viele Stämme sind harmlos. Bestimmte Stämme bilden Toxine oder haften an Harnwegen und Darm."],
      streptococcus: ["Streptococcus pyogenes", "Pathogen", "Tröpfchen- und Schmierinfektion", "Rachenentzündung, Scharlach", "Antibiotikum", "Bildet Toxine und besitzt Oberflächenstrukturen, die der Immunabwehr ausweichen."],
      borrelia: ["Borrelia burgdorferi", "Pathogen", "Zeckenstich", "Borreliose", "Antibiotikum", "Die Bakterien wandern durch das Gewebe und lösen Entzündungen aus. Ein früher Zeckenstich ist ein Risiko."],
      tuberculosis: ["Mycobacterium tuberculosis", "Pathogen", "Tröpfcheninfektion", "Tuberkulose", "mehrere Antibiotika, lange Therapie", "Die Zellwand ist schwer angreifbar. Resistenzen sind ein globales Problem."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-bacteria-title]");
    var textNode = figure.querySelector("[data-bacteria-text]");
    var list = figure.querySelector("[data-bacteria-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Lactobacillus", "lactobacillus", true) + button("E. coli", "ecoli", false) + button("Streptococcus", "streptococcus", false) + button("Borrelia", "borrelia", false) + button("Tuberkulose", "tuberculosis", false);
    }
    function show(key) {
      var entry = bacteria[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (textNode) { textNode.textContent = entry[5]; }
      if (list) {
        list.innerHTML = [
          "Rolle: " + entry[1],
          "Übertragung: " + entry[2],
          "Krankheit: " + entry[3],
          "Behandlung: " + entry[4]
        ].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join("");
      }
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> Rolle: " + esc(entry[1]) + ". Übertragung: " + esc(entry[2]) + "."; }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("lactobacillus");
  };

  initializers["lytic10"] = function (figure) {
    if (!initOnce(figure, "initLytic10")) { return; }
    var stages = {
      attach: ["Anheftung", "Das Virus bindet mit Oberflächenproteinen an Rezeptoren der Wirtszelle. Diese Bindung entscheidet, welche Zellen befallen werden."],
      enter: ["Eindringen", "Das Virus dringt in die Zelle ein oder schleust sein Genom durch die Membran. Die Wirtszelle wird zur Vermehrung genutzt."],
      replicate: ["Vermehrung", "Das virale Genom wird vervielfältigt, und die Wirtszelle produziert virale Proteine. Die Maschinerie der Wirtszelle wird umgeleitet."],
      assemble: ["Zusammenbau", "Neue Genome und Proteine werden zu Viruspartikeln zusammengesetzt. Die Wirtszelle füllt sich mit Viren."],
      release: ["Freisetzung", "Die Wirtszelle platzt oder setzt Viren frei. Die neuen Partikel können weitere Zellen infizieren."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var groups = $$("[data-lytic-stage]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Anheftung", "attach", true) + button("Eindringen", "enter", false) + button("Vermehrung", "replicate", false) + button("Zusammenbau", "assemble", false) + button("Freisetzung", "release", false);
    }
    function show(key) {
      var entry = stages[key];
      if (!entry) { return; }
      groups.forEach(function (group) {
        var circle = group.querySelector(".stage");
        if (circle) { circle.classList.toggle("is-active", group.dataset.lyticStage === key); }
      });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("attach");
  };

  initializers["immune10"] = function (figure) {
    if (!initOnce(figure, "initImmune10")) { return; }
    var modes = {
      unspecific: ["Unspezifische Abwehr", "Sie wirkt schnell und gegen viele Erreger. Sie unterscheidet nicht zwischen einzelnen Antigenen.", ["Haut und Schleimhäute als Barriere", "Magensäure und antimikrobielle Proteine", "Fresszellen wie Makrophagen", "Entzündung und Fieber"], "Die unspezifische Abwehr ist angeboren und die erste Linie."],
      specific: ["Spezifische Abwehr", "Sie erkennt bestimmte Antigene und bildet ein immunologisches Gedächtnis.", ["B-Zellen bilden Antikörper", "T-Zellen erkennen infizierte Zellen", "Plasmazellen produzieren Antikörper", "Gedächtniszellen für die Zweitantwort"], "Die spezifische Abwehr braucht einige Tage, ist dafür aber sehr genau."],
      allergy: ["Allergie", "Das Immunsystem reagiert übertrieben auf einen eigentlich harmlosen Stoff.", ["Allergen wird als Gefahr erkannt", "Histamin wird freigesetzt", "Juckreiz, Niesen, Schwellung, Atemprobleme", "Antihistaminika können lindern"], "Allergien sind Fehlreaktionen, keine Schwäche."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-immune-title]");
    var textNode = figure.querySelector("[data-immune-text]");
    var list = figure.querySelector("[data-immune-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Unspezifisch", "unspecific", true) + button("Spezifisch", "specific", false) + button("Allergie", "allergy", false);
    }
    function show(key) {
      var entry = modes[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (textNode) { textNode.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[3]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("unspecific");
  };

  initializers["vaccine10"] = function (figure) {
    if (!initOnce(figure, "initVaccine10")) { return; }
    var modes = {
      primary: ["Erstkontakt", "Nach dem ersten Kontakt dauert es Tage, bis Antikörper gebildet werden. Danach sinkt der Titer langsam.", [[0, 0], [1, 0], [2, 0.05], [3, 0.2], [4, 0.55], [5, 0.75], [6, 0.6], [7, 0.4], [8, 0.28], [9, 0.2], [10, 0.15]], 200],
      secondary: ["Zweitkontakt", "Gedächtniszellen reagieren schnell. Die zweite Antwort ist stärker und hält länger.", [[0, 0], [1, 0], [2, 0.05], [3, 0.15], [4, 0.3], [5, 0.25], [6, 0.3], [7, 0.7], [8, 0.95], [9, 0.8], [10, 0.55]], 560],
      passive: ["Passive Immunisierung", "Fertige Antikörper wirken sofort, werden aber abgebaut. Es entstehen keine Gedächtniszellen.", [[0, 0], [1, 0.9], [2, 0.95], [3, 0.8], [4, 0.6], [5, 0.45], [6, 0.3], [7, 0.2], [8, 0.12], [9, 0.06], [10, 0.02]], 120]
    };
    var line = figure.querySelector("[data-vaccine-line]");
    var marker = figure.querySelector("[data-vaccine-marker]");
    var bar = figure.querySelector("[data-vaccine-bar]");
    var value = figure.querySelector("[data-vaccine-value]");
    var readout = figure.querySelector("[data-tool-readout]");
    function render(key) {
      var entry = modes[key];
      if (!entry) { return; }
      var points = entry[2];
      var coords = points.map(function (point) {
        var x = 70 + (point[0] / 10) * 590;
        var y = 250 - point[1] * 210;
        return x.toFixed(1) + "," + y.toFixed(1);
      });
      if (line) { line.setAttribute("points", coords.join(" ")); }
      if (marker) {
        marker.setAttribute("x1", entry[3].toFixed(1));
        marker.setAttribute("x2", entry[3].toFixed(1));
      }
      var peak = Math.max.apply(null, points.map(function (point) { return point[1]; }));
      if (bar) { bar.style.transform = "scaleX(" + peak + ")"; }
      if (value) { value.textContent = de(peak * 100, 0) + " %"; }
      $$("[data-vaccine-mode]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.vaccineMode === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-vaccine-mode]", figure).forEach(function (btn) { btn.addEventListener("click", function () { render(btn.dataset.vaccineMode); }); });
    render("primary");
  };

  initializers["antibiotic10"] = function (figure) {
    if (!initOnce(figure, "initAntibiotic10")) { return; }
    var sensitive = 50;
    var resistant = 50;
    var generation = 1;
    var treating = false;
    var sensitiveBar = figure.querySelector("[data-antibiotic-sensitive]");
    var resistantBar = figure.querySelector("[data-antibiotic-resistant]");
    var sensitiveValue = figure.querySelector("[data-antibiotic-sensitive-value]");
    var resistantValue = figure.querySelector("[data-antibiotic-resistant-value]");
    var generationNode = figure.querySelector("[data-antibiotic-generation]");
    var readout = figure.querySelector("[data-tool-readout]");
    function render() {
      if (sensitiveBar) { sensitiveBar.style.transform = "scaleX(" + (sensitive / 100) + ")"; }
      if (resistantBar) { resistantBar.style.transform = "scaleX(" + (resistant / 100) + ")"; }
      if (sensitiveValue) { sensitiveValue.textContent = de(sensitive, 0) + " %"; }
      if (resistantValue) { resistantValue.textContent = de(resistant, 0) + " %"; }
      if (generationNode) { generationNode.textContent = "Generation " + generation + (treating ? " · Antibiotikum wirkt" : " · keine Behandlung"); }
    }
    function setText(text) { render(); if (readout) { readout.innerHTML = text; } }
    function treat() {
      if (generation >= 8) {
        setText("<strong>Modellende.</strong> Setze zurück, um einen neuen Durchlauf zu starten.");
        return;
      }
      treating = true;
      var total = sensitive * 0.25 + resistant * 0.9;
      sensitive = (sensitive * 0.25 / total) * 100;
      resistant = 100 - sensitive;
      generation += 1;
      setText("<strong>Antibiotikum.</strong> Empfindliche Bakterien sterben häufiger. Resistente Varianten überleben und vermehren sich stärker.");
    }
    function stop() {
      treating = false;
      setText("<strong>Behandlung beendet.</strong> Ohne Antibiotikum haben resistente und empfindliche Bakterien ähnliche Chancen. Die Resistenz bleibt aber in der Population.");
    }
    function reset() {
      sensitive = 50;
      resistant = 50;
      generation = 1;
      treating = false;
      setText("<strong>Start.</strong> 50 % empfindliche und 50 % resistente Bakterien. Behandle die Population und beobachte die Verschiebung.");
    }
    var treatButton = figure.querySelector("[data-antibiotic-treat]");
    var stopButton = figure.querySelector("[data-antibiotic-stop]");
    var resetButton = figure.querySelector("[data-antibiotic-reset]");
    if (treatButton) { treatButton.addEventListener("click", treat); }
    if (stopButton) { stopButton.addEventListener("click", stop); }
    if (resetButton) { resetButton.addEventListener("click", reset); }
    reset();
  };


  initializers["nutrients10"] = function (figure) {
    if (!initOnce(figure, "initNutrients10")) { return; }
    var groups = {
      carbs: ["Kohlenhydrate", "Kohlenhydrate sind die wichtigste schnelle Energiequelle. Sie bestehen aus Zuckermolekülen.", ["Bausteine: Monosaccharide, Disaccharide, Polysaccharide", "Energie: etwa 4 kcal pro Gramm", "Funktion: schnelle Energie, Glykogenspeicher", "Beispiele: Brot, Reis, Nudeln, Obst"]],
      fats: ["Fette", "Fette sind energiereich und wichtig für Zellmembranen, Hormone und die Aufnahme fettlöslicher Vitamine.", ["Bausteine: Glycerin und Fettsäuren", "Energie: etwa 9 kcal pro Gramm", "Funktion: Energiespeicher, Membranen, Isolierung", "Beispiele: Öl, Nüsse, Butter, Avocado"]],
      proteins: ["Proteine", "Proteine sind Baustoffe und übernehmen viele Funktionen als Enzyme, Transportmoleküle und Signalstoffe.", ["Bausteine: Aminosäuren", "Energie: etwa 4 kcal pro Gramm", "Funktion: Baustoffe, Enzyme, Transport", "Beispiele: Hülsenfrüchte, Fisch, Eier, Fleisch"]],
      vitamins: ["Vitamine", "Vitamine sind Mikronährstoffe. Sie liefern keine Energie, sind aber für viele Reaktionen notwendig.", ["Keine Energie", "Funktion: Coenzyme, Sehstoff, Immunsystem", "Fettlöslich: A, D, E, K", "Wasserlöslich: B-Gruppe, C"]],
      minerals: ["Mineralsalze", "Mineralsalze sind anorganische Mikronährstoffe. Sie sind für Knochen, Nerven, Muskeln und Enzyme wichtig.", ["Keine Energie", "Funktion: Knochen, Nerven, Muskelkontraktion", "Beispiele: Calcium, Eisen, Magnesium", "Mangel kann zu Beschwerden führen"]],
      fiber: ["Ballaststoffe", "Ballaststoffe werden weitgehend nicht verdaut. Sie fördern die Verdauung und die Darmflora.", ["Keine verwertbare Energie", "Funktion: Sättigung, Darmbewegung, Darmflora", "Beispiele: Vollkorn, Gemüse, Hülsenfrüchte", "Wichtig für eine ausgewogene Ernährung"]]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-nutrient-title]");
    var textNode = figure.querySelector("[data-nutrient-text]");
    var list = figure.querySelector("[data-nutrient-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Kohlenhydrate", "carbs", true) + button("Fette", "fats", false) + button("Proteine", "proteins", false) + button("Vitamine", "vitamins", false) + button("Mineralsalze", "minerals", false) + button("Ballaststoffe", "fiber", false);
    }
    function show(key) {
      var entry = groups[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (textNode) { textNode.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("carbs");
  };

  initializers["enzyme10"] = function (figure) {
    if (!initOnce(figure, "initEnzyme10")) { return; }
    var enzymes = {
      amylase: { name: "Amylase", optTemp: 37, optPh: 7, unit: "°C" },
      pepsin: { name: "Pepsin", optTemp: 37, optPh: 2, unit: "°C" },
      trypsin: { name: "Trypsin", optTemp: 37, optPh: 8, unit: "°C" }
    };
    var variable = "temperature";
    var enzyme = "amylase";
    var value = 37;
    var line = figure.querySelector("[data-enzyme-line]");
    var marker = figure.querySelector("[data-enzyme-marker]");
    var dot = figure.querySelector("[data-enzyme-dot]");
    var range = figure.querySelector("[data-enzyme-range]");
    var output = figure.querySelector("[data-enzyme-value]");
    var sliderLabel = figure.querySelector("[data-enzyme-slider-label]");
    var xlabel = figure.querySelector("[data-enzyme-xlabel]");
    var readout = figure.querySelector("[data-tool-readout]");
    function rateAt(v, key) {
      var entry = enzymes[enzyme];
      if (key === "temperature") {
        var base = Math.exp(-Math.pow((v - entry.optTemp) / 12, 2));
        if (v > 45) { base *= Math.exp(-(v - 45) / 6); }
        return Math.max(0, base);
      }
      if (key === "ph") { return Math.exp(-Math.pow((v - entry.optPh) / 1.6, 2)); }
      return v / (v + 20);
    }
    function variableConfig() {
      if (variable === "temperature") { return { min: 0, max: 80, value: 37, label: "Temperatur", unit: "°C", xlabel: "Temperatur (°C)" }; }
      if (variable === "ph") { return { min: 0, max: 14, value: enzymes[enzyme].optPh, label: "pH-Wert", unit: "", xlabel: "pH-Wert" }; }
      return { min: 0, max: 100, value: 50, label: "Substratkonzentration", unit: "%", xlabel: "Substratkonzentration (%)" };
    }
    function render() {
      var cfg = variableConfig();
      if (range) {
        range.min = String(cfg.min);
        range.max = String(cfg.max);
        range.step = variable === "ph" ? "0.1" : "1";
        range.value = String(value);
      }
      if (sliderLabel) { sliderLabel.textContent = cfg.label; }
      if (xlabel) { xlabel.textContent = cfg.xlabel; }
      if (output) { output.textContent = de(value, variable === "ph" ? 1 : 0) + (cfg.unit ? " " + cfg.unit : ""); }
      var coords = [];
      var steps = 60;
      for (var i = 0; i <= steps; i += 1) {
        var v = cfg.min + ((cfg.max - cfg.min) * i) / steps;
        var rate = rateAt(v, variable);
        var x = 70 + (i / steps) * 590;
        var y = 250 - rate * 210;
        coords.push(x.toFixed(1) + "," + y.toFixed(1));
      }
      if (line) { line.setAttribute("points", coords.join(" ")); }
      var frac = (value - cfg.min) / (cfg.max - cfg.min);
      var x = 70 + frac * 590;
      var y = 250 - rateAt(value, variable) * 210;
      if (marker) { marker.setAttribute("x1", x.toFixed(1)); marker.setAttribute("x2", x.toFixed(1)); }
      if (dot) { dot.setAttribute("cx", x.toFixed(1)); dot.setAttribute("cy", y.toFixed(1)); }
      var entry = enzymes[enzyme];
      var rate = Math.round(rateAt(value, variable) * 100);
      var optimum = variable === "temperature" ? entry.optTemp : variable === "ph" ? entry.optPh : 100;
      var text = "<strong>" + entry.name + " bei " + cfg.label + " " + de(value, variable === "ph" ? 1 : 0) + (cfg.unit ? " " + cfg.unit : "") + ":</strong> " + rate + " % Aktivität.";
      if (variable === "temperature" && value > 45) { text += " Das Enzym denaturiert; die Aktivität sinkt stark."; }
      else if (variable === "temperature" && value < 20) { text += " Die Reaktion läuft langsam; das Enzym ist aber nicht zerstört."; }
      else if (variable === "ph" && Math.abs(value - entry.optPh) > 3) { text += " Der pH-Wert liegt weit vom Optimum entfernt."; }
      else if (variable === "substrate" && value >= 80) { text += " Die Enzyme sind weitgehend gesättigt; mehr Substrat bringt kaum mehr Geschwindigkeit."; }
      else { text += " Das liegt nahe am Optimum."; }
      if (readout) { readout.innerHTML = text; }
      $$("[data-enzyme-type]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.enzymeType === enzyme ? "true" : "false"); });
      $$("[data-enzyme-variable]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.enzymeVariable === variable ? "true" : "false"); });
    }
    function setVariable(key) {
      variable = key;
      var cfg = variableConfig();
      value = cfg.value;
      render();
    }
    $$("[data-enzyme-type]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () {
        enzyme = btn.dataset.enzymeType;
        var cfg = variableConfig();
        value = cfg.value;
        render();
      });
    });
    $$("[data-enzyme-variable]", figure).forEach(function (btn) {
      btn.addEventListener("click", function () { setVariable(btn.dataset.enzymeVariable); });
    });
    if (range) {
      range.addEventListener("input", function () { value = Number(range.value); render(); });
    }
    render();
  };

  initializers["digestion10"] = function (figure) {
    if (!initOnce(figure, "initDigestion10")) { return; }
    var organs = {
      mouth: ["Mund", "pH etwa 7", "Amylase (Stärke zu Zuckern)", "Zähne zerkleinern, Speichel befeuchtet; die Verdauung beginnt.", "Amylase wird von den Speicheldrüsen gebildet."],
      esophagus: ["Speiseröhre", "pH etwa 7", "keine Verdauungsenzyme", "Peristaltik transportiert den Bissen zum Magen.", "Die Speiseröhre ist ein Transportrohr, kein Verdauungsraum."],
      stomach: ["Magen", "pH etwa 1 bis 3", "Pepsin (Proteine)", "Salzsäure tötet Keime, Pepsin beginnt den Proteinabbau.", "Die Magenschleimhaut schützt sich mit Schleim vor der Säure."],
      small: ["Dünndarm", "pH etwa 6 bis 8", "Amylase, Lipase, Proteasen; Bürstensaumenzyme", "Hauptort der Verdauung und Resorption; Darmzotten und Mikrovilli vergrößern die Oberfläche.", "Galle aus der Leber emulgiert Fette."],
      liver: ["Leber", "pH etwa 7", "keine Verdauungsenzyme", "Bildet Galle, speichert Glykogen, entgiftet Stoffe.", "Galle wird in der Gallenblase gespeichert und in den Dünndarm abgegeben."],
      pancreas: ["Bauchspeicheldrüse", "pH etwa 8", "Amylase, Lipase, Proteasen", "Gibt Verdauungsenzyme und Hydrogencarbonat in den Dünndarm ab.", "Der pH-Wert wird neutralisiert, damit die Enzyme arbeiten können."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Mund", "mouth", true) + button("Speiseröhre", "esophagus", false) + button("Magen", "stomach", false) + button("Dünndarm", "small", false) + button("Leber", "liver", false) + button("Bauchspeicheldrüse", "pancreas", false);
    }
    function show(key) {
      var entry = organs[key];
      if (!entry) { return; }
      $$("[data-digest-organ]", figure).forEach(function (organ) { organ.classList.toggle("is-active", organ.dataset.digestOrgan === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) {
        readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[3]) + " <em>pH:</em> " + esc(entry[1]) + ". <em>Enzyme:</em> " + esc(entry[2]) + ". " + esc(entry[4]);
      }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("mouth");
  };

  initializers["breathing10"] = function (figure) {
    if (!initOnce(figure, "initBreathing10")) { return; }
    var situations = {
      rest: ["Ruhe", "Die Atmung ist ruhig. Der Sauerstoffpartialdruck in den Alveolen ist hoch, im Blut niedriger. Diffusion läuft normal.", ["O₂ in der Alveole: etwa 100 mmHg", "O₂ im Blut: etwa 40 mmHg", "CO₂ im Blut: etwa 46 mmHg", "CO₂ in der Alveole: etwa 40 mmHg"]],
      exercise: ["Belastung", "Die Muskeln verbrauchen mehr Sauerstoff und produzieren mehr CO₂. Das Konzentrationsgefälle wird größer, die Diffusion nimmt zu.", ["O₂-Verbrauch steigt", "CO₂-Produktion steigt", "Atemfrequenz und Herzfrequenz steigen", "Das Gefälle wird steiler"]],
      altitude: ["Höhe", "In großer Höhe ist der Sauerstoffpartialdruck der Luft niedriger. Das Gefälle wird kleiner, die Sauerstoffaufnahme sinkt.", ["O₂-Partialdruck der Luft sinkt", "Geringeres Konzentrationsgefälle", "Die Atmung kann nicht alle Defizite ausgleichen", "Anpassung braucht Zeit"]]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var o2 = figure.querySelector("[data-breathing-o2]");
    var co2 = figure.querySelector("[data-breathing-co2]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Ruhe", "rest", true) + button("Belastung", "exercise", false) + button("Höhe", "altitude", false);
    }
    function show(key) {
      var entry = situations[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (o2) { o2.style.opacity = key === "altitude" ? "0.45" : "1"; }
      if (co2) { co2.style.opacity = key === "exercise" ? "1" : "0.7"; }
      if (readout) {
        readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]) + " <ul>" + entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join("") + "</ul>";
      }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("rest");
  };

  initializers["atp10"] = function (figure) {
    if (!initOnce(figure, "initAtp10")) { return; }
    var modes = {
      sprint: ["Sprint", "Kurze, explosive Belastung: Der ATP-Vorrat und die anaerobe Energiebereitstellung dominieren.", [70, 25, 5]],
      middle: ["Mittelstrecke", "Mittlere Belastung: Anaerobe und aerobe Systeme arbeiten zusammen.", [10, 40, 50]],
      endurance: ["Ausdauer", "Längere, moderate Belastung: Die aerobe Zellatmung liefert den größten Anteil.", [5, 10, 85]]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var store = figure.querySelector("[data-atp-store]");
    var anaerobic = figure.querySelector("[data-atp-anaerobic]");
    var aerobic = figure.querySelector("[data-atp-aerobic]");
    var storeValue = figure.querySelector("[data-atp-store-value]");
    var anaerobicValue = figure.querySelector("[data-atp-anaerobic-value]");
    var aerobicValue = figure.querySelector("[data-atp-aerobic-value]");
    var textNode = figure.querySelector("[data-atp-text]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Sprint", "sprint", true) + button("Mittelstrecke", "middle", false) + button("Ausdauer", "endurance", false);
    }
    function show(key) {
      var entry = modes[key];
      if (!entry) { return; }
      var values = entry[2];
      if (store) { store.style.transform = "scaleX(" + (values[0] / 100) + ")"; }
      if (anaerobic) { anaerobic.style.transform = "scaleX(" + (values[1] / 100) + ")"; }
      if (aerobic) { aerobic.style.transform = "scaleX(" + (values[2] / 100) + ")"; }
      if (storeValue) { storeValue.textContent = values[0] + " %"; }
      if (anaerobicValue) { anaerobicValue.textContent = values[1] + " %"; }
      if (aerobicValue) { aerobicValue.textContent = values[2] + " %"; }
      if (textNode) { textNode.textContent = entry[1]; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("sprint");
  };


  initializers["timeline10"] = function (figure) {
    if (!initOnce(figure, "initTimeline10")) { return; }
    var events = {
      origin: ["Leben", "Vor etwa 3,5 bis 3,8 Milliarden Jahren entstehen die ersten Einzeller. Sie sind prokaryotisch und leben im Wasser."],
      oxygen: ["Sauerstoff", "Vor etwa 2,4 Milliarden Jahren reichert sich Sauerstoff in der Atmosphäre an. Fotosynthese treibt diesen Prozess an."],
      eukaryotes: ["Eukaryoten", "Vor etwa 1,8 Milliarden Jahren entstehen Zellen mit Zellkern und Organellen. Mitochondrien und Chloroplasten gehen auf Endosymbiose zurück."],
      land: ["Landgang", "Vor etwa 470 Millionen Jahren besiedeln Pflanzen und später Tiere das Land. Es entstehen neue Lebensräume und Anpassungen."],
      dinosaurs: ["Dinosaurier", "Vor etwa 230 Millionen Jahren erscheinen die ersten Dinosaurier. Sie dominieren lange, bis vor etwa 66 Millionen Jahren ein Massenaussterben folgt."],
      humans: ["Homo sapiens", "Vor etwa 300.000 Jahren entsteht der moderne Mensch in Afrika. Er ist im Vergleich zur Erdgeschichte eine sehr junge Art."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var groups = $$("[data-timeline-event]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Leben", "origin", true) + button("Sauerstoff", "oxygen", false) + button("Eukaryoten", "eukaryotes", false) + button("Landgang", "land", false) + button("Dinosaurier", "dinosaurs", false) + button("Homo sapiens", "humans", false);
    }
    function show(key) {
      var entry = events[key];
      if (!entry) { return; }
      groups.forEach(function (group) {
        var circle = group.querySelector(".event");
        if (circle) { circle.classList.toggle("is-active", group.dataset.timelineEvent === key); }
      });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("origin");
  };

  initializers["system10"] = function (figure) {
    if (!initOnce(figure, "initSystem10")) { return; }
    var levels = {
      reich: ["Reich: Animalia", "Tiere sind vielzellige, heterotrophe Eukaryoten. Sie nehmen organische Stoffe auf und haben oft Sinnesorgane und Muskeln."],
      stamm: ["Stamm: Chordata", "Chordatiere haben in der Embryonalentwicklung eine Chorda dorsalis, ein Neuralrohr und Kiemenspalten. Dazu gehören Wirbeltiere und einige Wirbellose."],
      klasse: ["Klasse: Mammalia", "Säugetiere haben Haare, Milchdrüsen und ein dreigliedriges Mittelohr. Sie sind warmblütig und gebären meist lebende Junge."],
      ordnung: ["Ordnung: Primates", "Primaten haben Greifhände, einen großen Sehapparat und ein relativ großes Gehirn. Sie leben oft in sozialen Gruppen."],
      familie: ["Familie: Hominidae", "Menschenartige umfassen Menschen, Schimpansen, Gorillas und Orang-Utans. Gemeinsame Merkmale sind ein großes Gehirn und komplexes Sozialverhalten."],
      gattung: ["Gattung: Homo", "Die Gattung Homo umfasst den modernen Menschen und ausgestorbene Arten wie Homo erectus und Homo neanderthalensis. Die Art ist Homo sapiens."]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var nodes = $$("[data-system-node]", figure);
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Reich", "reich", true) + button("Stamm", "stamm", false) + button("Klasse", "klasse", false) + button("Ordnung", "ordnung", false) + button("Familie", "familie", false) + button("Gattung", "gattung", false);
    }
    function show(key) {
      var entry = levels[key];
      if (!entry) { return; }
      nodes.forEach(function (node) { node.classList.toggle("is-active", node.dataset.systemNode === key); });
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("reich");
  };

  initializers["hominin10"] = function (figure) {
    if (!initOnce(figure, "initHominin10")) { return; }
    var species = {
      afarensis: ["Australopithecus afarensis", "Vor etwa 3,9 bis 3,0 Millionen Jahren. Aufrechter Gang, kleines Gehirn, lange Arme. Bekannt durch das Fossil „Lucy“.", ["Zeitraum: etwa 3,9 bis 3,0 Mio. Jahre", "Gehirnvolumen: etwa 400 bis 500 cm³", "Fortbewegung: aufrecht, aber auch kletternd", "Werkzeuge: einfache Steine möglich", "Fundorte: Ostafrika"]],
      habilis: ["Homo habilis", "Vor etwa 2,4 bis 1,5 Millionen Jahren. Größeres Gehirn als Australopithecus, erste einfache Steinwerkzeuge.", ["Zeitraum: etwa 2,4 bis 1,5 Mio. Jahre", "Gehirnvolumen: etwa 600 cm³", "Fortbewegung: aufrecht", "Werkzeuge: einfache Abschläge", "Fundorte: Ost- und Südafrika"]],
      erectus: ["Homo erectus", "Vor etwa 1,9 Millionen bis 100.000 Jahren. Größeres Gehirn, komplexere Werkzeuge, Feuer, Ausbreitung aus Afrika.", ["Zeitraum: etwa 1,9 Mio. bis 100.000 Jahre", "Gehirnvolumen: etwa 900 cm³", "Fortbewegung: aufrecht, ausdauernd", "Werkzeuge: Faustkeile, Feuer", "Fundorte: Afrika, Asien, Europa"]],
      neanderthalensis: ["Homo neanderthalensis", "Vor etwa 400.000 bis 40.000 Jahren. An kaltes Klima angepasst, komplexe Werkzeuge, Bestattungen, enge Verwandtschaft mit Homo sapiens.", ["Zeitraum: etwa 400.000 bis 40.000 Jahre", "Gehirnvolumen: etwa 1.500 cm³", "Fortbewegung: aufrecht", "Werkzeuge: komplexe Steinwerkzeuge", "Fundorte: Europa und Westasien"]],
      sapiens: ["Homo sapiens", "Vor etwa 300.000 Jahren in Afrika entstanden. Große kulturelle Vielfalt, Sprache, Kunst, Wissenschaft; heute weltweit verbreitet.", ["Zeitraum: seit etwa 300.000 Jahren", "Gehirnvolumen: etwa 1.350 cm³", "Fortbewegung: aufrecht", "Werkzeuge: sehr vielfältig", "Fundorte: weltweit"]]
    };
    var controls = figure.querySelector("[data-tool-controls]");
    var title = figure.querySelector("[data-hominin-title]");
    var textNode = figure.querySelector("[data-hominin-text]");
    var list = figure.querySelector("[data-hominin-list]");
    var readout = figure.querySelector("[data-tool-readout]");
    if (controls) {
      controls.innerHTML = button("Australopithecus", "afarensis", true) + button("Homo habilis", "habilis", false) + button("Homo erectus", "erectus", false) + button("Neandertaler", "neanderthalensis", false) + button("Homo sapiens", "sapiens", false);
    }
    function show(key) {
      var entry = species[key];
      if (!entry) { return; }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === key ? "true" : "false"); });
      if (title) { title.textContent = entry[0]; }
      if (textNode) { textNode.textContent = entry[1]; }
      if (list) { list.innerHTML = entry[2].map(function (line) { return "<li>" + esc(line) + "</li>"; }).join(""); }
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]); }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(btn.dataset.toolChoice); }); });
    show("afarensis");
  };

  initializers["culture10"] = function (figure) {
    if (!initOnce(figure, "initCulture10")) { return; }
    var points = [[1800, 1.0], [1850, 1.2], [1900, 1.6], [1950, 2.5], [1980, 4.4], [2000, 6.1], [2024, 8.2]];
    var milestones = {
      1800: ["1800", "Etwa 1 Milliarde Menschen. Landwirtschaft prägt die meisten Gesellschaften; Industrie beginnt sich zu entwickeln."],
      1900: ["1900", "Etwa 1,6 Milliarden Menschen. Industrialisierung, Medizin und Städtewachstum verändern das Leben."],
      1950: ["1950", "Etwa 2,5 Milliarden Menschen. Nach dem Zweiten Weltkrieg steigen Bevölkerung, Medizin und Technik schnell."],
      2000: ["2000", "Etwa 6,1 Milliarden Menschen. Globalisierung, digitale Technik und internationale Zusammenarbeit nehmen zu."],
      2024: ["Heute", "Über 8 Milliarden Menschen. Klimawandel, Ressourcen, Gesundheit und Gerechtigkeit sind zentrale Zukunftsfragen."]
    };
    var line = figure.querySelector("[data-culture-line]");
    var marker = figure.querySelector("[data-culture-marker]");
    var dot = figure.querySelector("[data-culture-dot]");
    var readout = figure.querySelector("[data-tool-readout]");
    var controls = figure.querySelector("[data-tool-controls]");
    if (controls) {
      controls.innerHTML = button("1800", "1800", false) + button("1900", "1900", false) + button("1950", "1950", false) + button("2000", "2000", false) + button("Heute", "2024", true);
    }
    function xFor(year) { return 70 + ((year - 1800) / 224) * 590; }
    function yFor(value) { return 250 - (value / 9) * 210; }
    var coords = points.map(function (point) { return xFor(point[0]).toFixed(1) + "," + yFor(point[1]).toFixed(1); });
    if (line) { line.setAttribute("points", coords.join(" ")); }
    function show(year) {
      var entry = milestones[year];
      if (!entry) { return; }
      var point = points.reduce(function (best, current) { return Math.abs(current[0] - year) < Math.abs(best[0] - year) ? current : best; });
      var x = xFor(point[0]);
      var y = yFor(point[1]);
      if (marker) { marker.setAttribute("x1", x.toFixed(1)); marker.setAttribute("x2", x.toFixed(1)); }
      if (dot) { dot.setAttribute("cx", x.toFixed(1)); dot.setAttribute("cy", y.toFixed(1)); }
      $$("[data-tool-choice]", figure).forEach(function (btn) { btn.setAttribute("aria-pressed", btn.dataset.toolChoice === String(year) ? "true" : "false"); });
      if (readout) { readout.innerHTML = "<strong>" + esc(entry[0]) + ".</strong> " + esc(entry[1]) + " Die Kurve zeigt die geschätzte Weltbevölkerung."; }
    }
    $$("[data-tool-choice]", figure).forEach(function (btn) { btn.addEventListener("click", function () { show(Number(btn.dataset.toolChoice)); }); });
    show(2024);
  };

  function initAll() {
    $$("[data-tool]").forEach(function (figure) {
      var type = figure.dataset.tool;
      if (initializers[type]) { initializers[type](figure); }
    });
  }

  window.BioTools = { initAll: initAll, initializers: initializers };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
