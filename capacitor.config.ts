import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mattiacinelli.workoutbuddy',
  appName: 'Workout Buddy',
  webDir: 'dist',
  // The app is served internally over a virtual https://localhost origin.
  // Without both of these, the WebView blocks fetches to a real http://
  // self-hosted sync server:
  //   - server.cleartext: permits cleartext (HTTP) requests from the
  //     WebView at all (Android disables this by default since API 28,
  //     separately from the same-named manifest attribute).
  //   - android.allowMixedContent: the specific setting for an
  //     https-origin page (the app's own virtual origin) fetching an
  //     http:// resource — a distinct check from plain cleartext, and the
  //     one that was actually blocking this (confirmed via logcat: "Mixed
  //     Content: ... blocked"). Not intended for production per Capacitor's
  //     own docs; acceptable here since this is a self-built, self-installed
  //     personal app, not something distributed via the Play Store.
  server: {
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
