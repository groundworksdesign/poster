# Poster auto-update

Packaged Electron builds check [GitHub Releases](https://github.com/groundworksdesign/poster/releases) for a newer version after launch (and via **Check for Updates…** in the app menu).

## Windows and Linux

When a newer release exists, Poster offers **Download and install**. Confirming uses [`electron-updater`](https://www.electron.build/auto-update) against the Release assets (`latest.yml` / `latest-linux.yml`, installer + `.blockmap`). After download, **Restart and install** replaces the current install in place.

Library data under `~/.poster` is not part of the app bundle and survives updates.

AppImage is the Linux in-app update path; `.deb` remains available for manual install.

## macOS (alert only)

Until Apple Developer ID signing and notarization are configured, Mac builds **do not** download or overwrite in-app. Poster still detects a newer release and shows a dialog with **Open download page** (GitHub Releases) or **Later**.

After installing a new DMG manually, Gatekeeper / quarantine steps still apply — see [`macos-install-unsigned.txt`](macos-install-unsigned.txt).

## Release packaging

`electron-builder.yml` declares `publish.provider: github` for `groundworksdesign/poster`. The Release workflow uploads Win/Linux updater metadata (`latest.yml`, `latest-linux.yml`, `*.blockmap`) alongside installers. Mac stays DMG-only for this cycle (no `latest-mac.yml` / zip auto-install).

## Development

Update checks are skipped for unpackaged `electron .` launches unless the operator uses **Check for Updates…** (still allowed for manual testing). Failures are logged to `poster-main.log` under the Electron userData directory.
