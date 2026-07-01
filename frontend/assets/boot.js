'use strict';

(async () => {
  const saved = localStorage.getItem('coursnote_user');
  if (saved) {
    const parsed = JSON.parse(saved);
    try {
      const fresh = await GET('/user?id=' + parsed.id);
      S.user = { id: fresh.id, username: fresh.username, avatarURL: fresh.avatarURL || '', courseIDs: fresh.courseIDs || [] };
      localStorage.setItem('coursnote_user', JSON.stringify(S.user));
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
        localStorage.removeItem('coursnote_user');
      }
    }
  }
  render();
})();
