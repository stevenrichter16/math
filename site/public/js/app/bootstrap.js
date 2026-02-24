import { bootLegacyApp } from './legacyApp.js';

let started = false;

function startLegacyApp() {
  if (started) {
    return;
  }
  started = true;
  bootLegacyApp();
}

export function bootApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLegacyApp, { once: true });
    return;
  }
  startLegacyApp();
}
