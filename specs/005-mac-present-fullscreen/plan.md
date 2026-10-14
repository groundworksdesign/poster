# Implementation Plan: Mac Present Fullscreen
**Tech**: Electron main IPC `present:toggle-fullscreen`; renderer keydown in Present route; preload bridge.
**Structure**: electron main window module, preload, Present route, release notes.
**Testing**: unit for key handler routing; Electron smoke on macOS.
