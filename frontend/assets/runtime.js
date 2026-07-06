'use strict';

const Runtime = {
  editable: true,
  canSave: true,
  canNavigateApp: true,
  canLogin: true,
  showUserMenu: true,
  hasPrivateNotes: true,
  trackProgress: false,
  navigateFallback: null,
};

// No-ops overridden by static-init.js when trackProgress is true.
function _startTopicTracking(topicID) {}
function _injectDebugPanel() {}
function _getTopicLiveTime(topicID) { return 0; }
