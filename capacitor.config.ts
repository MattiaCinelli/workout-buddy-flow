import { existsSync } from 'node:fs';
import type { CapacitorConfig } from '@capacitor/cli';

// Allowing the Android WebView to talk to a sync server over plain HTTP
// means the bearer token and every synced record travel unencrypted —
// sniffable / MITM-able on any shared network. So it is OFF by default:
// point the app at an HTTPS sync server.
//
// A self-hoster who genuinely needs LAN-only HTTP (no TLS on their box)
// opts in, one of two ways:
//   - per build:  WB_ALLOW_INSECURE_SYNC=1 npm run android:sync
//   - permanently on this machine:  touch android/.allow-insecure-sync
//     (git-ignored, so it never reaches CI — release builds stay
//     HTTPS-only regardless).
const allowInsecureSync =
  process.env.WB_ALLOW_INSECURE_SYNC === '1' || existsSync('android/.allow-insecure-sync');

const config: CapacitorConfig = {
  appId: 'com.mattiacinelli.workoutbuddy',
  appName: 'Workout Buddy',
  webDir: 'dist',
  ...(allowInsecureSync
    ? {
        // - server.cleartext: permit cleartext (HTTP) requests from the
        //   WebView at all (Android disables this by default since API 28).
        // - android.allowMixedContent: allow the app's own https-origin page
        //   to fetch an http:// resource — a separate check from plain
        //   cleartext. Not for production per Capacitor's docs.
        server: { cleartext: true },
        android: { allowMixedContent: true },
      }
    : {}),
};

export default config;
