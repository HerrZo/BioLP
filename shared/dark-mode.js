// Dark Mode System für alle BioLP-Seiten
(function() {
  const html = document.documentElement;
  const STORAGE_KEY = 'bioApps_darkMode';

  function updateToggleButtons(isDark) {
    document.querySelectorAll('[data-dark-toggle]').forEach(btn => {
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.title = isDark ? 'Helles Design' : 'Dunkles Design';
      btn.setAttribute('aria-label', isDark ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren');
      
      const icon = btn.querySelector('.dark-mode-icon');
      if (icon) {
        icon.textContent = isDark ? '☀️' : '🌙';
      } else {
        btn.childNodes.forEach(node => {
          if (node.nodeType === 3 && (node.nodeValue.includes('☀️') || node.nodeValue.includes('🌙'))) {
            node.nodeValue = node.nodeValue.replace(/☀️|🌙/g, isDark ? '☀️' : '🌙');
          }
        });
      }
    });
  }

  function initDarkMode() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const isDark = (saved === 'dark' || (saved === null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches));
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => updateToggleButtons(isDark));
    } else {
      updateToggleButtons(isDark);
    }
  }

  let lastToggleTime = 0;

  window.toggleDarkMode = function() {
    const now = Date.now();
    if (now - lastToggleTime < 180) {
      return;
    }
    lastToggleTime = now;

    const isDark = html.classList.toggle('dark');
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (e) {}

    updateToggleButtons(isDark);
    window.dispatchEvent(new CustomEvent('bioApps_theme_change', { detail: { isDark } }));
  };

  window.isDarkMode = function() {
    return html.classList.contains('dark');
  };

  initDarkMode();

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem(STORAGE_KEY) === null) {
        const isDark = e.matches;
        if (isDark) html.classList.add('dark');
        else html.classList.remove('dark');
        updateToggleButtons(isDark);
        window.dispatchEvent(new CustomEvent('bioApps_theme_change', { detail: { isDark } }));
      }
    });
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.closest && target.closest('[data-dark-toggle]')) {
      window.toggleDarkMode();
    }
  });
})();
