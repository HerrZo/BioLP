# BioLP - AI Architecture & Guidelines

## 1. Project Overview & Philosophy
BioLP ist das zentrale Biologie-Lehrplan- und Lernpfad-Portal für das Johannes-Scharrer-Gymnasium. Es bietet eine strukturierte Übersicht über alle Themen des Fachs Biologie (NuT 5/6 sowie Biologie 8 bis 13 nach LehrplanPLUS Bayern) und verlinkt auf die jeweiligen Unterseiten der einzelnen Jahrgangsstufen und Lernbereiche.

Die Architektur entspricht exakt dem bewährten Aufbau von `BioApps`:
- **Modulare Ordnerstruktur:** Jede Jahrgangsstufe bzw. jeder Lernpfad liegt in einem eigenen, unabhängigen Unterordner (z. B. `NUT5/`, `Bio8/`, `Bio9/`, `Bio10/`, `Bio12/`). Es gibt **keine Root-`package.json` und kein Monorepo**.
- **Flexibler Unterseiten-Aufbau:** Unterordner können entweder als reine statische HTML/CSS/JS-Lernpfade (mit eigenem `index.html` und Kapitel-HTMLs) oder als Vite/React-Singlefile-Apps (`vite-plugin-singlefile`) angelegt werden.
- **GitHub Pages & Offline Ready:** Alle Seiten funktionieren sofort auf GitHub Pages sowie lokal per Doppelklick (`file://`).

---

## 2. Directory Structure
```
BioLP/
├── index.html                   # Hauptseite: Fachübersicht & Jahrgangsstufen-Portal
├── shared/                      
│   ├── dark-mode.css            # Globale CSS-Overrides für Dark Mode (Forest Theme)
│   ├── dark-mode.js             # Globales toggleDarkMode() & localStorage-Synchronisation
│   ├── animations.css           # Keyframe-Animationen (fadeIn, slideUp, float)
│   └── tailwind-config.js       # Gemeinsame Tailwind-Konfiguration (Forest-Palette)
├── [Jahrgangsstufe / Thema]/    # z. B. Bio8/, Bio9/, Bio10/, NUT5/
│   ├── index.html               # Startseite der Jahrgangsstufe
│   └── ...                      # Weitere Kapitel-Seiten oder Assets
├── build_all.py                 # Optionales Build-Skript für Vite-basierte Unterordner
└── AI_README.md                 # Diese Datei
```

---

## 3. UI/UX & Design System (Bio / Forest Theme)
- **Schriftart:** "Inter" (sans-serif)
- **Farbwelt:** `forest` Farbpalette (`forest-50` bis `forest-950`, Smaragd- und Naturgrün)
- **Stil & Illustrationen:** Biologische Motive (Pflanzen, Blätter, Tiere, Zelle, DNA, Ökosysteme) als saubere Inline-SVGs ohne externe Icon-Abhängigkeiten
- **Dark Mode:** Gesteuert über `shared/dark-mode.js` (`data-dark-toggle`) und `shared/dark-mode.css`

---

## 4. Hinzufügen einer neuen Jahrgangsstufe / Unterseite
1. Neuen Unterordner `[Ordnername]/` mit einer `index.html` anlegen.
2. In der Root-`index.html` im Array `const projects = [...]` den entsprechenden Eintrag ergänzen bzw. `link` und `subpages` eintragen und `available: true` setzen.
