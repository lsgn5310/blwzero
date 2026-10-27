# Below Zero

**Reach true 0% display backlight on GNOME.**

Below Zero is a GNOME Shell extension that aims to let you turn your laptop's physical display backlight all the way down to zero using the standard GNOME brightness slider and keyboard brightness controls.

## Usage

Once installed, use GNOME's regular brightness controls:
Brightness slider: Open the system menu and move the brightness slider all the way down.
Brightness keys: Use your laptop's brightness-down key until the brightness reaches its minimum.

## Installation

The project includes an installation script and a privileged helper.

1. Download or clone this repository.
2. Review the source code and installation scripts.
3. Follow the installation instructions provided with the project.

**Warning:** This extension uses elevated privileges to change the hardware backlight. Compatibility depends on your system's backlight interface. Make sure you know how to restore your brightness if the screen becomes too dark.
Me personally - i`m using default brightness buttons on my 'f1-f12' keys.

## The problem

I used Mac for many years and i really liked that you can turn off the screen completely just with brightness slider, unfortunately in most cases you can`t do that on regular laptops.

So. Below Zero was created to address this limitation by allowing the hardware backlight to reach 0%, instead of simply placing a dark overlay over the screen. (Because not all laptops have cool OLED screens obviously)

## Features

- Use the familiar GNOME brightness slider.
- Use your laptop's standard brightness keys.
- Set the physical backlight to zero when minimum brightness is requested.
- Keep normal GNOME brightness handling for non-zero levels.

## Compatibility

Initially tested on:

- Fedora Linux 44
- GNOME Shell 50
- Intel integrated graphics with the `intel_backlight` interface

## Hardware compatibility

Currently, Below Zero only supports systems using the `intel_backlight` interface.

AMD, NVIDIA, ACPI, and other backlight interfaces are **not officially supported** or tested.

I'm too lazy to implement support for every backlight interface myself so yeah :)) 
Feel free to add support for other hardware yourself — contributions are welcome! 

If you get it working on other hardware, feel free to open a pull request.

## Uninstallation

Use the included `uninstall.sh` script and follow its instructions.

## Project status

This is an early-stage community project. It has been tested on the developer's laptop, but it is not an official GNOME extension yet.
Bug reports, testing, and contributions are welcome as i mentioned.

## License

Licensed under the GNU General Public License v3.0 or later. See [LICENSE](LICENSE) for details.
