'use strict';

(async () => {
  const saved = Storage.loadUser();
  if (saved) {
    // Apply cached settings immediately so colours are correct before the network
    // round-trip completes, preventing a flash of the default dark theme.
    if (saved.settings) applyAllColours(saved.settings);
    try {
      const fresh = await GET('/user/' + saved.id);
      S.data.user = { id: fresh.id, username: fresh.username, avatarURL: fresh.avatarURL || '', courseIDs: fresh.courseIDs || [], settings: fresh.settings || null };
      if (fresh.settings) applyAllColours(fresh.settings);
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
