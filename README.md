# Habitly

A minimalist daily habit tracker. Build streaks and see your progress at a glance.

**Try it in the browser:** https://themukhammadali.github.io/habitly/

## Features

- Create habits with a name, description, icon and color
- Tick off each day with one tap
- Current streak, best streak, completion rate and total days for every habit
- Month calendar, weekly pattern and full-year grid views
- Light, dark and system themes
- Works fully offline, with no account, no tracking and no server: your data stays on your device
- Install as a PWA from the browser, or as an Android app

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS and zustand. The PWA uses vite-plugin-pwa, and the Android app is wrapped with Capacitor.

## Development

```bash
npm install
npm run dev
```

### Web build

```bash
npm run build
```

This outputs to `dist/` and is served from `/habitly/` on GitHub Pages. Pushing to `main` deploys automatically.

### Android APK

Requires JDK 21 and the Android SDK (`ANDROID_HOME` set, or `sdk.dir` in `android/local.properties`).

```bash
npm run apk
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## Contributing

Issues and pull requests are welcome. If you publish your own fork, please use a different name and icon so it isn't confused with the official Habitly app.

## License

[MIT](LICENSE) © 2026 Muhammadali
