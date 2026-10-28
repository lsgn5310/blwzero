import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const HELPER = '/usr/libexec/backlight-zero-helper';
const PKEXEC = '/usr/bin/pkexec';
const VALUE_SCALE = 1_000_000;
// Only intercept the exact bottom of GNOME's 0..1 slider. All non-zero values
// go through GNOME/Mutter's original backlight implementation unchanged.
const ZERO_EPSILON = 1e-9;

export default class BacklightZeroExtension extends Extension {
    enable() {
        this._stopping = false;
        this._helperReady = false;
        this._proc = null;
        this._stdin = null;
        this._stdout = null;
        this._patches = new Map();
        this._manager = Main.brightnessManager;

        this._managerChangedId = this._manager.connect('changed', () => {
            this._patchCurrentBacklightScale();
        });

        this._startHelper();
    }

    disable() {
        this._stopping = true;
        if (this._manager && this._managerChangedId) {
            this._manager.disconnect(this._managerChangedId);
            this._managerChangedId = 0;
        }
        this._restorePatches();

        try {
            if (this._stdin) {
                this._stdin.put_string('QUIT\n', null);
                this._stdin.flush(null);
                this._stdin.close(null);
            }
        } catch (e) {
            // The helper may already have exited.
        }

        this._stdin = null;
        this._stdout = null;
        this._proc = null;
        this._helperReady = false;
        this._manager = null;
    }

    _startHelper() {
        try {
            const flags = Gio.SubprocessFlags.STDIN_PIPE |
                Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_MERGE;
            this._proc = Gio.Subprocess.new([PKEXEC, HELPER], flags);
            this._stdin = new Gio.DataOutputStream({
                base_stream: this._proc.get_stdin_pipe(),
            });
            this._stdout = new Gio.DataInputStream({
                base_stream: this._proc.get_stdout_pipe(),
            });
            this._readLine();
        } catch (e) {
            console.error(`[Below Zero] Could not start privileged helper: ${e.message}`);
        }
    }

    _readLine() {
        if (!this._stdout || this._stopping)
            return;

        this._stdout.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, result) => {
            let line = null;
            try {
                [line] = stream.read_line_finish_utf8(result);
            } catch (e) {
                if (!this._stopping)
                    console.error(`[Below Zero] Helper communication failed: ${e.message}`);
            }

            if (line === null) {
                this._helperReady = false;
                this._restorePatches();
                if (!this._stopping)
                    console.error('[Below Zero] Privileged helper exited. Disable and re-enable the extension to try again.');
                return;
            }

            if (line.startsWith('READY ')) {
                this._helperReady = true;
                this._patchCurrentBacklightScale();
                console.log(`[Below Zero] Helper is ready (${line.slice(6)}).`);
            } else if (line.startsWith('ERROR ')) {
                console.error(`[Below Zero] ${line.slice(6)}`);
            }

            this._readLine();
        });
    }

    _patchCurrentBacklightScale() {
        if (!this._helperReady || !this._manager)
            return;

        const scale = this._manager.scales.find(candidate => {
            try {
                return candidate.monitor.get_monitors().some(m =>
                    m.is_active() && m.get_backlight());
            } catch (e) {
                return false;
            }
        });

        for (const [oldScale] of this._patches) {
            if (oldScale !== scale)
                this._restoreScale(oldScale);
        }

        if (!scale || this._patches.has(scale))
            return;

        const hadOwn = Object.prototype.hasOwnProperty.call(scale, 'setBacklight');
        const original = scale.setBacklight;
        this._patches.set(scale, {original, hadOwn});

        scale.setBacklight = (...args) => {
            const requested = args[0];

            // Crucial behavior in v5:
            // - Missing, invalid, or positive/non-zero values: delegate to GNOME.
            // - Only when GNOME explicitly requests the slider minimum (0), write
            //   physical sysfs brightness 0 through our restricted root helper.
            // This avoids replacing normal brightness handling while dragging.
            const isSliderAtMinimum = typeof requested === 'number' &&
                Number.isFinite(requested) && requested >= 0 &&
                requested <= ZERO_EPSILON;

            if (!isSliderAtMinimum || !this._helperReady) {
                return original.apply(scale, args);
            }

            if (!this._sendSet(0)) {
                return original.apply(scale, args);
            }

            // Mutter/GNOME normally clamps the backlight API to brightnessMin
            // (usually 1) when slider=0. Keep its internal change detector aligned
            // with that logical value while sysfs itself is set to literal zero.
            try {
                const backlight = scale._getBacklights()[0];
                if (backlight)
                    scale._currentBacklightBrightness = backlight.brightnessMin;
            } catch (e) {
                // Don't interfere with GNOME's state if its internals differ.
            }
        };
    }

    _sendSet(value) {
        if (!this._helperReady || !this._stdin)
            return false;
        const scaled = Math.max(0, Math.min(VALUE_SCALE, Math.round(value * VALUE_SCALE)));
        try {
            this._stdin.put_string(`SET ${scaled}\n`, null);
            this._stdin.flush(null);
            return true;
        } catch (e) {
            this._helperReady = false;
            console.error(`[Below Zero] Could not send brightness: ${e.message}`);
            this._restorePatches();
            return false;
        }
    }

    _restoreScale(scale) {
        const patch = this._patches.get(scale);
        if (!patch)
            return;
        try {
            if (patch.hadOwn)
                scale.setBacklight = patch.original;
            else
                delete scale.setBacklight;
        } catch (e) {
            console.error(`[Below Zero] Could not restore GNOME brightness handler: ${e.message}`);
        }
        this._patches.delete(scale);
    }

    _restorePatches() {
        for (const scale of [...this._patches.keys()])
            this._restoreScale(scale);
    }
}
