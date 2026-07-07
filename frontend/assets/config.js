'use strict';

// Centralised URL configuration. Override at deployment time by injecting
// window.__API_BASE__ and/or window.__APP_BASE__ into the served HTML before
// this script runs.
const Config = {
  apiBase: window.__API_BASE__ || 'http://localhost:8081/api',
  appBase: window.__APP_BASE__ || 'http://localhost:3334',
};
