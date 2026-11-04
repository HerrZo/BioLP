/* Biologie 12 learning app: level switch, progress, quizzes, checks, shell.
   No external dependencies. Content is in the HTML; this file only adds state and feedback. */
(function () {
  "use strict";

  var GRADE = document.documentElement.dataset.grade || "12";
  var PAGE = document.body.dataset.page || "";
  var QUIZZES = Object.create(null);
  var CHECKS = Object.create(null);

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function level() { return document.documentElement.dataset.level === "r" ? "r" : "g"; }
  function levelName(value) { return value === "r" ? "erhöht" : "grundlegend"; }
  function pageKey(page, suffix) { return "bio12-" + suffix + "-" + page + "-" + level(); }
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) { return fallback; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }
  function readString(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }
  function writeString(key, value) {
    try { localStorage.setItem(key, value); } catch (error) {}
  }
  function completed(page) {
    var value = readJSON(pageKey(page, "progress"), []);
    return new Set(Array.isArray(value) ? value : []);
  }
  function saveCompleted(page, set) { writeJSON(pageKey(page, "progress"), Array.from(set)); }
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function normalize(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/,/g, ".")
      .replace(/[–—]/g, "-")
      .trim();
  }
  function scrollToTop() {
    var header = $(".masthead");
    var offset = header ? header.getBoundingClientRect().height + 16 : 80;
    window.scrollTo({ top: 0, behavior: "auto" });
    var main = $("#main");
    if (main) {
      var top = main.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    }
  }

  /* ---------- level ---------- */
  function setLevel(value, options) {
    var next = value === "r" ? "r" : "g";
    document.documentElement.dataset.level = next;
    document.body.dataset.level = next;
    writeString("bio12-level", next);
    $$("[data-level-set]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.levelSet === next ? "true" : "false");
    });
    updateProgress();
    if (!options || options.rerender !== false) {
      renderAllQuizzes();
      renderAllChecks();
    }
    document.dispatchEvent(new CustomEvent("bio:level", { detail: { level: next } }));
  }
  function initLevel() {
    var fromUrl = new URLSearchParams(window.location.search).get("level");
    var stored = readString("bio12-level");
    setLevel(fromUrl === "r" || fromUrl === "g" ? fromUrl : (stored === "r" ? "r" : "g"), { rerender: false });
    $$("[data-level-set]").forEach(function (button) {
      button.addEventListener("click", function () { setLevel(button.dataset.levelSet); });
    });
  }

  /* ---------- progress ---------- */
  function trackedStations() {
    return $$('section.station[data-track="true"]');
  }
  function updateProgress() {
    var stations = trackedStations();
    var done = completed(PAGE);
    var total = stations.length;
    var count = stations.filter(function (station) { return done.has(station.id); }).length;
    var ratio = total ? count / total : 0;
    $$("[data-progress-text]").forEach(function (node) { node.textContent = count + " / " + total; });
    $$("[data-progress-inline]").forEach(function (node) { node.textContent = count + " von " + total; });
    $$("[data-progress-bar]").forEach(function (node) { node.style.setProperty("--p", String(ratio)); });
    $$("[data-station-link]").forEach(function (link) {
      var id = link.dataset.stationLink;
      var station = document.getElementById(id);
      var tracked = station && station.dataset.track === "true";
      link.classList.toggle("is-complete", Boolean(tracked && done.has(id)));
    });
    $$("[data-complete]").forEach(function (button) {
      var id = button.dataset.complete;
      var isDone = done.has(id);
      button.setAttribute("aria-pressed", isDone ? "true" : "false");
      button.textContent = isDone ? "Abgeschlossen, zurücksetzen" : "Station abschließen";
      button.classList.toggle("btn--quiet", isDone);
      var status = button.closest(".station__footer") ? button.closest(".station__footer").querySelector("[data-station-status]") : null;
      if (status) {
        status.textContent = isDone ? "Abgeschlossen" : "Noch offen";
        status.classList.toggle("is-complete", isDone);
      }
    });
    updateHubProgress();
  }
  function toggleStation(id) {
    var done = completed(PAGE);
    if (done.has(id)) { done.delete(id); } else { done.add(id); }
    saveCompleted(PAGE, done);
    updateProgress();
    var station = document.getElementById(id);
    if (station) {
      var button = station.querySelector("[data-complete]");
      if (button && done.has(id)) {
        button.focus({ preventScroll: true });
      }
    }
  }
  function initCompleteButtons() {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-complete]");
      if (!button) { return; }
      event.preventDefault();
      toggleStation(button.dataset.complete);
    });
  }
  function updateHubProgress() {
    var areas = $$("[data-area]");
    if (!areas.length) { return; }
    var total = 0;
    var doneTotal = 0;
    areas.forEach(function (area) {
      var page = area.dataset.area;
      var track = Number(area.dataset.track || 0);
      var done = completed(page);
      var count = Math.min(done.size, track);
      total += track;
      doneTotal += count;
      var label = area.querySelector("[data-area-progress]");
      if (label) { label.textContent = count + " / " + track; }
      var bar = area.querySelector("[data-area-bar]");
      if (bar) { bar.style.setProperty("--p", String(track ? count / track : 0)); }
    });
    var ratio = total ? doneTotal / total : 0;
    $$("[data-hub-total]").forEach(function (node) { node.textContent = doneTotal + " von " + total; });
    $$("[data-hub-progress-text]").forEach(function (node) { node.textContent = doneTotal + " / " + total; });
    $$("[data-hub-progress-bar]").forEach(function (node) { node.style.setProperty("--p", String(ratio)); });
  }

  /* ---------- station navigation ---------- */
  function stationFromHash() {
    var id = window.location.hash ? window.location.hash.slice(1) : "";
    return id ? document.getElementById(id) : null;
  }
  function showStation(id, updateHistory, focus) {
    var target = document.getElementById(id);
    if (!target || !target.classList.contains("station")) { return; }
    $$("section.station").forEach(function (station) { station.classList.toggle("is-active", station === target); });
    $$("[data-station-link]").forEach(function (link) { link.classList.toggle("is-active", link.dataset.stationLink === id); });
    if (updateHistory !== false) {
      try { history.replaceState(null, "", "#" + id); } catch (error) { window.location.hash = id; }
    }
    if (focus !== false) {
      var heading = target.querySelector("h1, h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
    scrollToTop();
    writeJSON("bio12-last", { page: PAGE, station: id });
    closeMenu();
  }
  function initStationNav() {
    if (!$$("section.station").length) { return; }
    $$("[data-station-link]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        showStation(link.dataset.stationLink);
      });
    });
    $$("[data-go]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        showStation(link.dataset.go);
      });
    });
    var initial = stationFromHash() || $("section.station.is-active") || $("section.station");
    if (initial) { showStation(initial.id, false, false); }
    window.addEventListener("hashchange", function () {
      var target = stationFromHash();
      if (target) { showStation(target.id, false, true); }
    });
  }

  /* ---------- mobile menu ---------- */
  function closeMenu() {
    var sidebar = $("#sidebar");
    var button = $("[data-menu]");
    if (!sidebar || !button) { return; }
    sidebar.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    syncMenuInert();
  }
  function syncMenuInert() {
    var sidebar = $("#sidebar");
    var button = $("[data-menu]");
    if (!sidebar || !button) { return; }
    var mobile = window.matchMedia("(max-width: 60rem)").matches;
    var inert = Boolean(mobile && !sidebar.classList.contains("is-open"));
    if ("inert" in sidebar) { sidebar.inert = inert; }
    if (inert) { sidebar.setAttribute("aria-hidden", "true"); } else { sidebar.removeAttribute("aria-hidden"); }
  }
  function initMenu() {
    var button = $("[data-menu]");
    var sidebar = $("#sidebar");
    if (!button || !sidebar) { return; }
    syncMenuInert();
    window.addEventListener("resize", syncMenuInert);
    button.addEventListener("click", function () {
      var open = !sidebar.classList.contains("is-open");
      sidebar.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("menu-open", open);
      syncMenuInert();
      if (open) {
        var first = sidebar.querySelector("a, button");
        if (first) { first.focus({ preventScroll: true }); }
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeMenu(); }
    });
    document.addEventListener("click", function (event) {
      if (!sidebar.classList.contains("is-open")) { return; }
      if (!sidebar.contains(event.target) && !button.contains(event.target)) { closeMenu(); }
    });
  }

  /* ---------- reset dialog ---------- */
  function initReset() {
    var dialog = $("[data-reset-dialog]");
    if (!dialog) { return; }
    var open = $("[data-reset-open]");
    var cancel = $("[data-reset-cancel]");
    var confirm = $("[data-reset-confirm]");
    function show() {
      dialog.hidden = false;
      if (confirm) { confirm.focus(); }
    }
    function hide() { dialog.hidden = true; if (open) { open.focus(); } }
    if (open) { open.addEventListener("click", show); }
    if (cancel) { cancel.addEventListener("click", hide); }
    dialog.addEventListener("click", function (event) { if (event.target === dialog) { hide(); } });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !dialog.hidden) { hide(); } });
    if (confirm) {
      confirm.addEventListener("click", function () {
        var pages = [];
        if (PAGE.indexOf("hub-") === 0) {
          $$("[data-area]").forEach(function (area) { pages.push(area.dataset.area); });
        } else {
          pages.push(PAGE);
        }
        pages.forEach(function (page) {
          try { localStorage.removeItem(pageKey(page, "progress")); } catch (error) {}
        });
        try {
          for (var index = localStorage.length - 1; index >= 0; index -= 1) {
            var key = localStorage.key(index);
            if (key && key.indexOf("bio12-best-") === 0 && key.slice(-2) === "-" + level()) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {}
        hide();
        updateProgress();
        renderAllQuizzes();
        renderAllChecks();
      });
    }
  }

  /* ---------- quizzes ---------- */
  function questionsFor(data) {
    return (data.questions || []).filter(function (question) {
      return question.level !== "r" || level() === "r";
    });
  }
  function questionHtml(question, index) {
    var id = "q-" + question.id + "-" + index;
    var type = question.type || "mc";
    var options = question.options || [];
    var body = "";
    if (type === "mc" || type === "tf") {
      body = '<div class="q__options">' + options.map(function (option, optionIndex) {
        return '<label class="opt"><input type="radio" name="' + escapeHtml(id) + '" value="' + optionIndex + '"><span class="opt__mark" aria-hidden="true"></span><span>' + escapeHtml(option) + '</span></label>';
      }).join("") + "</div>";
    } else if (type === "multi") {
      body = '<div class="q__options">' + options.map(function (option, optionIndex) {
        return '<label class="opt"><input type="checkbox" name="' + escapeHtml(id) + '" value="' + optionIndex + '"><span class="opt__mark" aria-hidden="true"></span><span>' + escapeHtml(option) + '</span></label>';
      }).join("") + "</div>";
    } else if (type === "input") {
      body = '<div class="q__input-row"><label class="visually-hidden" for="' + escapeHtml(id) + '">Deine Antwort</label><input class="input" id="' + escapeHtml(id) + '" type="text" data-q-input autocomplete="off" spellcheck="false" placeholder="Antwort eingeben"><span class="tool__note">Kurzantwort, Zahl oder Sequenz</span></div>';
    } else if (type === "match") {
      body = '<div class="q__options">' + (question.pairs || []).map(function (pair, pairIndex) {
        var left = pair[0];
        return '<label class="match-row"><span>' + escapeHtml(left) + '</span><select class="select" data-match="' + pairIndex + '"><option value="">Bitte wählen</option>' + options.map(function (option, optionIndex) {
          return '<option value="' + optionIndex + '">' + escapeHtml(option) + '</option>';
        }).join("") + "</select></label>";
      }).join("") + "</div>";
    } else if (type === "order") {
      var items = (question.items || []).slice().reverse();
      body = '<ol class="order-list" data-order>' + items.map(function (item, itemIndex) {
        return '<li class="order-item"><span>' + escapeHtml(item) + '</span><span class="order-actions"><button class="btn btn--quiet btn--small" type="button" data-order-up aria-label="Nach oben">↑</button><button class="btn btn--quiet btn--small" type="button" data-order-down aria-label="Nach unten">↓</button></span></li>';
      }).join("") + "</ol>";
    }
    return '<article class="q" data-qid="' + escapeHtml(question.id) + '">' +
      '<div class="q__head"><span class="q__num">' + String(index + 1).padStart(2, "0") + '</span>' +
      '<p class="q__prompt">' + escapeHtml(question.prompt) + (question.level === "r" ? '<span class="q__level">R</span>' : "") + '</p></div>' +
      body + '<p class="q__feedback" hidden></p></article>';
  }
  function renderQuizList(container, data) {
    var questions = questionsFor(data);
    var list = container.querySelector(".quiz__list, .check__list");
    if (!list) { return; }
    if (!questions.length) {
      list.innerHTML = '<p class="tool__note">Für dieses Anforderungsniveau sind hier keine Aufgaben hinterlegt.</p>';
      return;
    }
    list.innerHTML = questions.map(questionHtml).join("");
    container.dataset.rendered = "true";
    container.__questions = questions;
  }
  function selectedValues(question, article) {
    if (question.type === "multi") {
      return $$('input[type="checkbox"]:checked', article).map(function (input) { return Number(input.value); }).sort(function (a, b) { return a - b; });
    }
    if (question.type === "match") {
      return $$("[data-match]", article).map(function (select) { return select.value; });
    }
    if (question.type === "order") {
      return $$(".order-item", article).map(function (item) { return item.querySelector("span").textContent; });
    }
    if (question.type === "input") {
      var input = article.querySelector("[data-q-input]");
      return input ? input.value : "";
    }
    var checked = article.querySelector('input[type="radio"]:checked');
    return checked ? Number(checked.value) : null;
  }
  function isCorrect(question, value) {
    if (question.type === "multi") {
      var correct = (question.correct || []).slice().sort(function (a, b) { return a - b; });
      return value.length === correct.length && value.every(function (entry, index) { return entry === correct[index]; });
    }
    if (question.type === "match") {
      return (question.pairs || []).every(function (pair, index) { return String(value[index]) === String(pair[1]); });
    }
    if (question.type === "order") {
      return (question.items || []).every(function (item, index) { return value[index] === item; });
    }
    if (question.type === "input") {
      var normalized = normalize(value);
      return (question.accept || []).some(function (accepted) { return normalize(accepted) === normalized; });
    }
    return value === Number(question.correct);
  }
  function answerText(question) {
    if (question.type === "input") { return question.model || (question.accept || [])[0] || ""; }
    if (question.type === "multi") { return (question.correct || []).map(function (index) { return question.options[index]; }).join(", "); }
    if (question.type === "match") { return (question.pairs || []).map(function (pair) { return pair[0] + ": " + question.options[pair[1]]; }).join("; "); }
    if (question.type === "order") { return (question.items || []).join(" → "); }
    return (question.options || [])[Number(question.correct)] || "";
  }
  function checkContainer(container, data, mode) {
    var questions = container.__questions || questionsFor(data);
    var correctCount = 0;
    var rows = [];
    questions.forEach(function (question, index) {
      var article = container.querySelector('[data-qid="' + question.id + '"]');
      if (!article) { return; }
      var value = selectedValues(question, article);
      var correct = isCorrect(question, value);
      if (correct) { correctCount += 1; }
      article.classList.toggle("is-correct", correct);
      article.classList.toggle("is-wrong", !correct);
      var feedback = article.querySelector(".q__feedback");
      if (feedback) {
        feedback.hidden = false;
        feedback.innerHTML = "<strong>" + (correct ? "Richtig." : "Noch nicht richtig.") + "</strong> " + escapeHtml(question.explain || "") +
          (!correct && question.type === "input" ? " <span class=\"tool__note\">Erwartet: " + escapeHtml(answerText(question)) + "</span>" : "");
      }
      rows.push({ question: question, correct: correct });
    });
    var key = "bio12-best-" + PAGE + "-" + (mode === "check" ? container.dataset.check : container.dataset.quiz) + "-" + level();
    var previous = Number(readString(key) || 0);
    var best = Math.max(previous, correctCount);
    writeString(key, String(best));
    var summary = mode === "check" ? container.querySelector("[data-check-result]") : container.querySelector("[data-quiz-summary]");
    if (summary) {
      summary.innerHTML = '<p><span class="score">' + correctCount + " von " + questions.length + "</span> richtig. Bestwert: " + best + " von " + questions.length + ".</p>";
      if (mode === "check") {
        summary.innerHTML += competencyTable(rows, data);
      }
    }
    if (mode === "check") {
      var result = container.querySelector("[data-check-result]");
      if (result) { result.scrollIntoView({ block: "nearest", behavior: "auto" }); }
    }
  }
  function insertPrintSolutions(container) {
    if (!container || !container.__questions) { return; }
    var old = container.querySelector(".print-only");
    if (old) { old.remove(); }
    container.insertAdjacentHTML("beforeend", printSolutions(container.__questions));
  }
  function competencyTable(rows, data) {
    var labels = data.competencies || {};
    var groups = {};
    rows.forEach(function (row) {
      var key = row.question.competency || "Allgemein";
      if (!groups[key]) { groups[key] = { correct: 0, total: 0, label: labels[key] || key }; }
      groups[key].total += 1;
      if (row.correct) { groups[key].correct += 1; }
    });
    var keys = Object.keys(groups);
    if (!keys.length) { return ""; }
    return '<table class="check__table"><thead><tr><th>Kompetenz</th><th>Treffer</th><th>Stand</th></tr></thead><tbody>' + keys.map(function (key) {
      var group = groups[key];
      var ok = group.correct === group.total;
      return "<tr><td>" + escapeHtml(group.label) + '</td><td class="num">' + group.correct + " / " + group.total + '</td><td class="' + (ok ? "ok" : "no") + '">' + (ok ? "sitzt" : "noch üben") + "</td></tr>";
    }).join("") + "</tbody></table>";
  }
  function printSolutions(questions) {
    return '<div class="print-only"><h3>Lösungen</h3><ol>' + questions.map(function (question) {
      return "<li><strong>" + escapeHtml(question.prompt) + "</strong><br>Lösung: " + escapeHtml(answerText(question)) + "<br>" + escapeHtml(question.explain || "") + "</li>";
    }).join("") + "</ol></div>";
  }
  function renderAllQuizzes() {
    $$("[data-quiz]").forEach(function (container) {
      var id = container.dataset.quiz;
      if (!QUIZZES[id]) {
        var script = document.querySelector('script[data-quiz-data="' + id + '"]');
        if (!script) { return; }
        try { QUIZZES[id] = JSON.parse(script.textContent); } catch (error) { return; }
      }
      renderQuizList(container, QUIZZES[id]);
      container.__data = QUIZZES[id];
    });
  }
  function renderAllChecks() {
    $$("[data-check]").forEach(function (container) {
      var id = container.dataset.check;
      if (!CHECKS[id]) {
        var script = document.querySelector('script[data-check-data="' + id + '"]');
        if (!script) { return; }
        try { CHECKS[id] = JSON.parse(script.textContent); } catch (error) { return; }
      }
      renderQuizList(container, CHECKS[id]);
      container.__data = CHECKS[id];
      var result = container.querySelector("[data-check-result]");
      if (result) { result.innerHTML = ""; }
      insertPrintSolutions(container);
    });
  }
  function initQuizzes() {
    document.addEventListener("click", function (event) {
      var check = event.target.closest("[data-quiz-check]");
      var reset = event.target.closest("[data-quiz-reset]");
      var checkRun = event.target.closest("[data-check-run]");
      var checkReset = event.target.closest("[data-check-reset]");
      if (check) {
        var quiz = check.closest("[data-quiz]");
        if (quiz) { checkContainer(quiz, quiz.__data, "quiz"); }
      }
      if (reset) {
        var quizReset = reset.closest("[data-quiz]");
        if (quizReset) {
          renderQuizList(quizReset, quizReset.__data);
          var summary = quizReset.querySelector("[data-quiz-summary]");
          if (summary) { summary.innerHTML = ""; }
        }
      }
      if (checkRun) {
        var checkBox = checkRun.closest("[data-check]");
        if (checkBox) { checkContainer(checkBox, checkBox.__data, "check"); }
      }
      if (checkReset) {
        var checkBoxReset = checkReset.closest("[data-check]");
        if (checkBoxReset) {
          renderQuizList(checkBoxReset, checkBoxReset.__data);
          var result = checkBoxReset.querySelector("[data-check-result]");
          if (result) { result.innerHTML = ""; }
        }
      }
    });
    document.addEventListener("click", function (event) {
      var up = event.target.closest("[data-order-up]");
      var down = event.target.closest("[data-order-down]");
      if (!up && !down) { return; }
      var item = event.target.closest(".order-item");
      if (!item) { return; }
      var list = item.parentElement;
      if (up && item.previousElementSibling) { list.insertBefore(item, item.previousElementSibling); }
      if (down && item.nextElementSibling) { list.insertBefore(item.nextElementSibling, item); }
    });
  }

  /* ---------- glossary ---------- */
  function initGlossary() {
    $$("[data-glossary-filter]").forEach(function (input) {
      input.addEventListener("input", function () {
        var query = input.value.trim().toLowerCase();
        var scope = input.closest("section") || document;
        var rows = $$(".glossary__row", scope);
        var visible = 0;
        rows.forEach(function (row) {
          row.hidden = Boolean(query) && !row.textContent.toLowerCase().includes(query);
          if (!row.hidden) { visible += 1; }
        });
        var empty = scope.querySelector("[data-glossary-empty]");
        if (empty) { empty.hidden = visible > 0; }
      });
    });
  }

  /* ---------- term tooltips ---------- */
  var TERMS = {
    "Basiskonzept": "Denkwerkzeug, mit dem ein biologischer Sachverhalt strukturiert wird, etwa System oder Struktur und Funktion.",
    "deskriptiv": "Beschreibt einen Sachverhalt, ohne eine Forderung aufzustellen.",
    "Falsifizierbarkeit": "Die Eigenschaft einer Hypothese, durch Daten widerlegt werden zu können.",
    "Hypothese": "Eine begründete, vorläufige Antwort auf eine Frage, die geprüft werden kann.",
    "Kausalität": "Ein ursächlicher Zusammenhang: Eine Veränderung bewirkt eine andere.",
    "Kontrollgruppe": "Vergleichsgruppe ohne die zu prüfende Behandlung.",
    "Korrelation": "Ein gemeinsames Auftreten oder eine statistische Beziehung zweier Größen, ohne dass damit eine Ursache bewiesen ist.",
    "Modell": "Eine vereinfachte Darstellung eines Systems für einen bestimmten Zweck.",
    "naturalistischer Fehlschluss": "Der Fehler, aus einer Beschreibung des Seins direkt eine normative Forderung abzuleiten.",
    "normativ": "Stellt eine Forderung auf oder bewertet, was sein soll.",
    "Peer Review": "Begutachtung einer wissenschaftlichen Arbeit durch Fachleute vor der Veröffentlichung.",
    "Primärquelle": "Eine Originalarbeit, die Daten und Methode selbst berichtet.",
    "proximat": "Erklärt, wie ein Vorgang im Organismus abläuft.",
    "Sekundärquelle": "Eine Zusammenfassung oder ein Überblick über Primärquellen.",
    "ultimate": "Erklärt, warum ein Merkmal in der Evolution begünstigt wurde.",
    "unabhängige Variable": "Die Variable, die im Experiment gezielt verändert wird.",
    "abhängige Variable": "Die Variable, die als Antwort gemessen wird.",
    "Allel": "Variante eines Gens.",
    "Anticodon": "Basentriplett der tRNA, das zum Codon der mRNA passt.",
    "Apoptose": "Programmierter Zelltod, der beschädigte oder überflüssige Zellen entfernt.",
    "CRISPR/Cas": "Molekulares System, das DNA gezielt schneiden kann.",
    "Crossing-over": "Austausch von Abschnitten zwischen homologen Chromosomen.",
    "Epigenetik": "Veränderungen der Genaktivität ohne Änderung der Basensequenz.",
    "Genomutation": "Veränderung der Chromosomenzahl oder Chromosomenstruktur.",
    "Genmutation": "Veränderung der Basensequenz eines Gens.",
    "Genotyp": "Die Kombination der Allele eines Organismus.",
    "Genwirkkette": "Zusammenwirken mehrerer Gene über ihre Proteinprodukte bei der Merkmalsausbildung.",
    "Karyogramm": "Geordnete Darstellung der Chromosomen eines Individuums.",
    "Kodominanz": "Beide Allele werden im Phänotyp sichtbar.",
    "Kopplung": "Gene liegen auf demselben Chromosom und werden häufig gemeinsam vererbt.",
    "Meiose": "Zwei aufeinanderfolgende Teilungen, die haploide Keimzellen erzeugen.",
    "Mitose": "Kernteilung, die die Chromosomenzahl erhält.",
    "Non-Disjunction": "Fehlerhafte Trennung von Chromosomen in der Meiose.",
    "PCR": "Polymerase-Kettenreaktion, die eine Zielsequenz im Labor vervielfältigt.",
    "Phänotyp": "Das sichtbare Merkmal eines Organismus.",
    "Pleiotropie": "Ein Gen beeinflusst mehrere Merkmale.",
    "Promotor": "DNA-Abschnitt, an dem die Transkription beginnt.",
    "Replikation": "Verdopplung der DNA vor der Zellteilung.",
    "Transkription": "Umschreiben eines DNA-Abschnitts in mRNA.",
    "Translation": "Übersetzung der mRNA in eine Aminosäuresequenz am Ribosom.",
    "Trisomie": "Drei Kopien eines Chromosoms statt zwei, zum Beispiel Trisomie 21.",
    "unvollständige Dominanz": "Der heterozygote Phänotyp liegt zwischen den beiden homozygoten Phänotypen.",
    "adaptive Radiation": "Schnelle Entstehung vieler Arten aus einer Ausgangsart in freien Nischen.",
    "allopatrisch": "Artbildung in räumlich getrennten Gebieten.",
    "analog": "Gleiche Funktion bei unterschiedlicher Herkunft.",
    "Fitness": "Relativer Beitrag eines Individuums zum Genpool der nächsten Generation.",
    "Genfluss": "Austausch von Allelen zwischen Populationen durch Migration.",
    "genetische Drift": "Zufällige Veränderung von Allelfrequenzen, besonders in kleinen Populationen.",
    "Homologie": "Gemeinsamer Grundbau aufgrund gemeinsamer Abstammung.",
    "Kladogramm": "Verzweigungsdiagramm nach abgeleiteten Merkmalen.",
    "Koevolution": "Wechselseitige Anpassung von Arten, die sich gegenseitig beeinflussen.",
    "Mutation": "Veränderung der DNA, Quelle neuer Allele.",
    "natürliche Selektion": "Unterschiedlicher Fortpflanzungserfolg von Varianten.",
    "reproduktive Isolation": "Barriere, die erfolgreiche Fortpflanzung zwischen Gruppen verhindert.",
    "Selektion": "Prozess, der die Häufigkeit von Allelen über Fortpflanzungserfolg verändert.",
    "synthetische Evolutionstheorie": "Verbindung von Darwin und Genetik zur Erklärung von Evolution.",
    "sympatrisch": "Artbildung im selben geographischen Gebiet.",
    "adaptiver Wert": "Beitrag eines Verhaltens zur Fitness.",
    "Altruismus": "Verhalten, das die Fitness eines anderen erhöht und die eigene senkt.",
    "direkte Fitness": "Fortpflanzungserfolg durch eigene Nachkommen.",
    "Elternaufwand": "Energie und Zeit, die in Nachkommen investiert werden.",
    "Eltern-Kind-Konflikt": "Unterschiedliche optimale Investition von Eltern und Kind.",
    "Gesamtfitness": "Summe aus direkter und indirekter Fitness.",
    "Hamiltons Regel": "rB &gt; C: Altruismus ist begünstigt, wenn der Verwandtschaftsnutzen die Kosten übersteigt.",
    "Handicap-Prinzip": "Teure Signale sind ehrlich, weil nur fitte Sender sie tragen können.",
    "Hawk-Dove": "Spieltheorie-Modell für Konflikte mit Falken- und Taubenstrategien.",
    "indirekte Fitness": "Beitrag zur Weitergabe eigener Allele über Verwandte.",
    "Kommentkampf": "Ritualisierter Kampf mit geringem Verletzungsrisiko.",
    "Optimalitätsmodell": "Modell, das Verhaltensalternativen nach Kosten und Nutzen vergleicht.",
    "reziproker Altruismus": "Hilfe auf Gegenseitigkeit.",
    "Signal": "Reiz, der das Verhalten eines Empfängers verändert.",
    "Verwandtenselektion": "Förderung von Verwandten aufgrund gemeinsamer Allele."
  };
  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function initTerms() {
    var mains = $$(".protocol__main");
    if (!mains.length) { return; }
    var used = new Set();
    var count = 0;
    var keys = Object.keys(TERMS).sort(function (a, b) { return b.length - a.length; });
    function processNode(node) {
      if (!node || !node.parentNode || count >= 14) { return; }
      var text = node.nodeValue;
      if (!text || !text.trim()) { return; }
      for (var i = 0; i < keys.length; i += 1) {
        var key = keys[i];
        if (used.has(key)) { continue; }
        var regex = new RegExp("(^|[^\\wÄÖÜäöüß-])(" + escapeRegExp(key) + ")(?=$|[^\\wÄÖÜäöüß-])", "i");
        var match = regex.exec(text);
        if (!match) { continue; }
        var start = match.index + match[1].length;
        var end = start + match[2].length;
        var span = document.createElement("span");
        span.className = "term";
        span.dataset.term = key;
        span.tabIndex = 0;
        span.textContent = text.slice(start, end);
        var parent = node.parentNode;
        var beforeNode = document.createTextNode(text.slice(0, start));
        var afterNode = document.createTextNode(text.slice(end));
        parent.insertBefore(beforeNode, node);
        parent.insertBefore(span, node);
        parent.insertBefore(afterNode, node);
        parent.removeChild(node);
        used.add(key);
        count += 1;
        processNode(beforeNode);
        processNode(afterNode);
        return;
      }
    }
    mains.forEach(function (main) {
      var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          var parent = node.parentElement;
          if (!parent) { return NodeFilter.FILTER_REJECT; }
          if (parent.closest("script, style, a, button, label, summary, .term, .q, .check, .tool, .glossary, .note, .station__footer")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.nodeValue.trim()) { return NodeFilter.FILTER_REJECT; }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [];
      while (walker.nextNode()) { nodes.push(walker.currentNode); }
      nodes.forEach(processNode);
    });
    if (count) { initTermPopover(); }
  }
  function initTermPopover() {
    var pop = document.createElement("div");
    pop.className = "term-pop";
    pop.id = "term-pop";
    pop.setAttribute("role", "tooltip");
    pop.hidden = true;
    document.body.appendChild(pop);
    var active = null;
    function show(term) {
      var key = term.dataset.term;
      var definition = TERMS[key];
      if (!definition) { return; }
      active = term;
      pop.innerHTML = "<strong>" + escapeHtml(key) + ".</strong> " + escapeHtml(definition);
      pop.hidden = false;
      term.setAttribute("aria-describedby", "term-pop");
      var rect = term.getBoundingClientRect();
      var width = Math.min(480, window.innerWidth - 32);
      pop.style.width = width + "px";
      var left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.left));
      var top = rect.bottom + 10;
      if (top + pop.offsetHeight > window.innerHeight - 16) { top = rect.top - pop.offsetHeight - 10; }
      pop.style.left = left + "px";
      pop.style.top = Math.max(16, top) + "px";
    }
    function hide() {
      if (active) { active.removeAttribute("aria-describedby"); }
      active = null;
      pop.hidden = true;
    }
    document.addEventListener("mouseover", function (event) {
      var term = event.target.closest(".term");
      if (term) { show(term); }
    });
    document.addEventListener("mouseout", function (event) {
      var term = event.target.closest(".term");
      if (term && !term.contains(event.relatedTarget)) { hide(); }
    });
    document.addEventListener("focusin", function (event) {
      var term = event.target.closest(".term");
      if (term) { show(term); }
    });
    document.addEventListener("focusout", function (event) {
      var term = event.target.closest(".term");
      if (term) { hide(); }
    });
    document.addEventListener("click", function (event) {
      var term = event.target.closest(".term");
      if (term) { event.preventDefault(); show(term); }
      else if (!pop.contains(event.target)) { hide(); }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { hide(); }
    });
  }

  /* ---------- hub ---------- */
  function initHub() {
    if (PAGE.indexOf("hub-") !== 0) { return; }
    var last = readJSON("bio12-last", null);
    var continueLink = $("[data-continue]");
    if (last && continueLink) {
      var area = document.querySelector('[data-area="' + last.page + '"]');
      if (area) {
        var link = area.querySelector("a");
        if (link) { continueLink.href = link.getAttribute("href") + (last.station ? "#" + last.station : ""); }
      }
    }
    updateHubProgress();
  }

  /* ---------- exam timer ---------- */
  function initExamTimer() {
    var timeNode = $("[data-exam-time]");
    if (!timeNode) { return; }
    var total = 90 * 60;
    var left = total;
    var timer = null;
    var running = false;
    var start = $("[data-exam-start]");
    var pause = $("[data-exam-pause]");
    var reset = $("[data-exam-reset]");
    var statusNode = $("[data-exam-status]");
    var barNode = $("[data-exam-bar]");
    function render() {
      var minutes = Math.floor(left / 60);
      var seconds = left % 60;
      var low = left <= 10 * 60;
      timeNode.textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
      timeNode.classList.toggle("is-low", low);
      timeNode.classList.toggle("is-critical", left <= 5 * 60);
      if (statusNode) {
        statusNode.textContent = left <= 0 ? "abgelaufen" : (running ? "läuft" : (left < total ? "pausiert" : "bereit"));
        statusNode.classList.toggle("is-low", low);
      }
      if (barNode) {
        barNode.style.width = Math.max(0, Math.min(100, (left / total) * 100)).toFixed(2) + "%";
        barNode.classList.toggle("is-low", low);
      }
      if (start) { start.disabled = running || left <= 0; }
      if (pause) { pause.disabled = !running; }
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      running = false;
      render();
    }
    if (start) {
      start.addEventListener("click", function () {
        if (running || left <= 0) { return; }
        running = true;
        render();
        timer = setInterval(function () {
          left -= 1;
          if (left <= 0) { left = 0; stop(); }
          render();
        }, 1000);
      });
    }
    if (pause) { pause.addEventListener("click", stop); }
    if (reset) {
      reset.addEventListener("click", function () {
        stop();
        left = total;
        render();
      });
    }
    render();
  }

  /* ---------- print ---------- */
  function initPrint() {
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-print]")) { window.print(); }
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    initLevel();
    initMenu();
    initStationNav();
    initCompleteButtons();
    initReset();
    initQuizzes();
    renderAllQuizzes();
    renderAllChecks();
    initGlossary();
    initPrint();
    initExamTimer();
    initTerms();
    initHub();
    updateProgress();
    document.addEventListener("bio:level", function () { updateProgress(); });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
