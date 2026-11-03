import os
import sys
import subprocess
import shutil

# Ensure UTF-8 output on Windows consoles
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

base_dir = os.path.dirname(os.path.abspath(__file__))
nodejs_dir = r"C:\Program Files\nodejs"
os.environ["PATH"] = nodejs_dir + os.pathsep + os.environ.get("PATH", "")
npm_path = os.path.join(nodejs_dir, "npm.cmd") if os.path.exists(os.path.join(nodejs_dir, "npm.cmd")) else "npm"

# Automatically find all subdirectories that have a package.json
dirs = [
    d for d in os.listdir(base_dir)
    if os.path.isdir(os.path.join(base_dir, d))
    and os.path.exists(os.path.join(base_dir, d, "package.json"))
]
dirs.sort()

print(f"Found {len(dirs)} apps to build: {', '.join(dirs)}\n")

success_count = 0
for d in dirs:
    full_path = os.path.join(base_dir, d)
    print(f"--- Building {d} ---")
    try:
        backup_html = os.path.join(full_path, "index_dev.html")
        main_html = os.path.join(full_path, "index.html")
        if os.path.exists(backup_html):
            shutil.copy2(backup_html, main_html)
        subprocess.run([npm_path, "run", "build"], cwd=full_path, check=True, shell=True)
        dist_html = os.path.join(full_path, "dist", "index.html")
        if os.path.exists(dist_html):
            main_html = os.path.join(full_path, "index.html")
            backup_html = os.path.join(full_path, "index_dev.html")
            if os.path.exists(main_html) and not os.path.exists(backup_html):
                shutil.copy2(main_html, backup_html)
            shutil.copy2(dist_html, main_html)

            # Ensure shared dark-mode assets remain injected in deployed index.html
            with open(main_html, 'r', encoding='utf-8', errors='ignore') as f:
                html_content = f.read()
            html_changed = False
            if 'shared/dark-mode.css' not in html_content:
                if '</head>' in html_content:
                    html_content = html_content.replace('</head>', '  <link rel="stylesheet" href="../shared/dark-mode.css">\n</head>', 1)
                    html_changed = True
            if 'shared/dark-mode.js' not in html_content:
                if '</body>' in html_content:
                    html_content = html_content.replace('</body>', '  <script src="../shared/dark-mode.js"></script>\n</body>', 1)
                    html_changed = True
            if html_changed:
                with open(main_html, 'w', encoding='utf-8') as f:
                    f.write(html_content)

            print(f"[OK] Deployed {d}/index.html\n")
            success_count += 1
        else:
            print(f"[FAIL] dist/index.html not found for {d}\n")
    except Exception as e:
        print(f"[FAIL] Failed {d}: {e}\n")

print(f"All done! Successfully built {success_count}/{len(dirs)} apps.")
