#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
  echo "Run this installer as your normal user, not with sudo." >&2
  exit 1
fi

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
UUID="backlight-zero@local"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

if [[ ! -d /sys/class/backlight/intel_backlight ]]; then
  echo "Expected /sys/class/backlight/intel_backlight was not found; this build targets the laptop discussed." >&2
  exit 1
fi

# Disable an already-loaded copy before updating its files.
if command -v gnome-extensions >/dev/null 2>&1; then
  if gnome-extensions list --enabled 2>/dev/null | grep -Fxq "$UUID"; then
    echo "Disabling the loaded Backlight Zero copy before updating..."
    gnome-extensions disable "$UUID" || true
  fi
fi

sudo install -o root -g root -m 0755 "$HERE/backlight-zero-helper" /usr/libexec/backlight-zero-helper
sudo install -o root -g root -m 0644 "$HERE/org.local.backlightzero.policy" /usr/share/polkit-1/actions/org.local.backlightzero.policy
install -d "$DEST"
install -m 0644 "$HERE/$UUID/metadata.json" "$DEST/metadata.json"
install -m 0644 "$HERE/$UUID/extension.js" "$DEST/extension.js"

# Persist enablement for the next login.
if command -v gsettings >/dev/null 2>&1 && gsettings writable org.gnome.shell enabled-extensions >/dev/null 2>&1; then
  current="$(gsettings get org.gnome.shell enabled-extensions)"
  updated="$(python3 - "$current" "$UUID" <<'PY'
import ast, sys
values = ast.literal_eval(sys.argv[1])
uuid = sys.argv[2]
if uuid not in values:
    values.append(uuid)
print('[' + ', '.join(repr(v) for v in values) + ']')
PY
)"
  gsettings set org.gnome.shell enabled-extensions "$updated"
fi

printf '\nBacklight Zero v5 installed.\n'
printf 'Normal GNOME/Mutter handling is preserved for all non-zero brightness values.\n'
printf 'Only exact slider minimum (0) writes literal 0 to intel_backlight.\n'
printf 'Log out of GNOME and log back in to load the new code. Keep other brightness extensions disabled while testing.\n'
printf 'A PolicyKit authentication prompt may appear when the helper starts.\n'
