#!/usr/bin/env bash
set -euo pipefail
UUID="backlight-zero@local"

if command -v gsettings >/dev/null 2>&1 && gsettings writable org.gnome.shell enabled-extensions >/dev/null 2>&1; then
  current="$(gsettings get org.gnome.shell enabled-extensions)"
  updated="$(python3 - "$current" "$UUID" <<'PY'
import ast, sys
values = ast.literal_eval(sys.argv[1])
uuid = sys.argv[2]
print('[' + ', '.join(repr(v) for v in values if v != uuid) + ']')
PY
)"
  gsettings set org.gnome.shell enabled-extensions "$updated"
fi

gnome-extensions disable "$UUID" 2>/dev/null || true
rm -rf "$HOME/.local/share/gnome-shell/extensions/$UUID"
sudo rm -f /usr/libexec/backlight-zero-helper /usr/share/polkit-1/actions/org.local.backlightzero.policy
printf 'Backlight Zero removed. Log out and back in to reload GNOME Shell.\n'
