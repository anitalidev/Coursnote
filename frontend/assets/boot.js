'use strict';

(async () => {
  const saved = Storage.loadUser();
  if (saved) {
    const parsed = saved;
    try {
      const fresh = await GET('/user?id=' + parsed.id);
      S.data.user = { id: fresh.id, username: fresh.username, avatarURL: fresh.avatarURL || '', courseIDs: fresh.courseIDs || [], settings: fresh.settings || null };
      if (fresh.settings) {
        const r = document.documentElement;
        const bg  = _hexToRGB(fresh.settings.backgroundColour);
        const bl  = _hexToRGB(fresh.settings.primaryColour);
        const pur = _hexToRGB(fresh.settings.gradientColour);
        if (bg)  r.style.setProperty('--col-bg',       bg);
        if (bl)  r.style.setProperty('--col-blue',     bl);
        if (pur) r.style.setProperty('--col-purple',   pur);
        if (fresh.settings.primaryColour) r.style.setProperty('--accent-hover', _darkenHex(fresh.settings.primaryColour));
      }
      Storage.saveUser(S.data.user);
      if (location.hash && location.hash !== '#courses') {
        await restoreFromHash(location.hash);
      } else {
        await goCourses();
      }
      return;
    } catch {
      try {
        await handleLogin(parsed.username);
        return;
      } catch {
        Storage.clearUser();
      }
    }
  }
  render();
})();
