'use strict';

const Storage = {
  // ── User session ─────────────────────────────────────────────────────────────
  loadUser() {
    try {
      const raw = localStorage.getItem('coursnote_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  saveUser(user) {
    try { localStorage.setItem('coursnote_user', JSON.stringify(user)); } catch {}
  },
  clearUser() {
    localStorage.removeItem('coursnote_user');
  },

  // ── Downloaded course progress ────────────────────────────────────────────────
  loadDownloadedProgress(courseID) {
    try {
      const raw = localStorage.getItem('cn_progress_' + courseID);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  saveDownloadedProgress(courseID, progress) {
    try { localStorage.setItem('cn_progress_' + courseID, JSON.stringify(progress)); } catch {}
  },

  // ── Downloaded quiz answers (per-question, single-question cells) ─────────────
  loadQuizAnswer(key) {
    const v = localStorage.getItem(key);
    return v == null ? null : Number(v);
  },
  saveQuizAnswer(key, chosen) {
    try { localStorage.setItem(key, chosen); } catch {}
  },
  loadQuizBest(key) {
    const v = localStorage.getItem(key);
    return v == null ? null : Number(v);
  },
  saveQuizBest(key, score) {
    try { localStorage.setItem(key, score); } catch {}
  },
};
