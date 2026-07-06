'use strict';

(async () => {
  const saved = Storage.loadUser();
  if (saved) {
    const parsed = saved;
    try {
      const fresh = await GET('/user?id=' + parsed.id);
      S.data.user = { id: fresh.id, username: fresh.username, avatarURL: fresh.avatarURL || '', courseIDs: fresh.courseIDs || [] };
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
