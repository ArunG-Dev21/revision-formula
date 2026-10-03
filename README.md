# Revision Formula

A spaced-revision tracker built on the 1-3-7-15-30 rule: add a topic the day you study it, then revise it 1, 3, 7, 15 and 30 days later. It runs entirely in the browser, works offline, and can be installed as an app.

**Live app:** https://arung-dev21.github.io/revision-formula/

## What it does

- **Today** lists exactly what is due, with overdue items first, a progress ring and a daily streak.
- **Topics** shows every topic with its five-step revision route, search and subject filters.
- **Reminders** send one notification a day at a time you choose, plus a calendar file (`.ics`) as a backup alarm.
- If you revise late, the remaining revisions shift so the gaps stay the same. "Forgot it" restarts a topic from Day 1.
- The gaps are editable (for example `2, 5, 10, 20`), and there are light, dark and system themes.

## Your data

Everything is stored on your device (IndexedDB, mirrored to localStorage). Nothing is uploaded. Use **Settings → Export** to save a backup file and **Restore** to load it on another device.

## Install

Open the live app in Chrome or Edge and choose **Install app** from the browser menu. On iPhone or iPad, open it in Safari, tap **Share**, then **Add to Home Screen**.

## Run locally

There is no build step. Serve the folder with any static server (a service worker needs `http://localhost` or HTTPS, not `file://`):

```sh
npx serve .
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app: markup, styles and script |
| `sw.js` | Service worker for offline caching and the background daily check |
| `manifest.webmanifest` | Install metadata, icons and shortcuts |
| `*.png` | App icons |

When you change `index.html` or the icons, bump `CACHE` in `sw.js` so installed copies pick up the new version.
