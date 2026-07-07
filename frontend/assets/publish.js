'use strict';

// ── Course publishing and static download ─────────────────────────────────────
// Extracted from actions.js.

async function publishCourse(id) {
  const course = S.data.courses.find(c => c.courseID === id);
  if (!course) return;

  const modules = await loadAll('/module?id=', course.moduleIDs || []);
  const allTopics = await loadAllTopicsFromModulesWithCompleted(modules);
  const topicMap = {};
  const privateNotes = {};
  await Promise.all(allTopics.map(async t => {
    topicMap[t.topicID] = t;
    if (t.privateNoteID) {
      const pn = await GET('/privatenotes?id=' + t.privateNoteID);
      if (pn) privateNotes[t.privateNoteID] = pn;
    }
  }));
  const courseData = { course, modules, topics: topicMap, privateNotes };

  const updated = await POST('/course/publish?id=' + id, { courseData });
  S.data.courses = S.data.courses.map(c => c.courseID === id ? updated : c);
  render();
  toast('Course published!');
}

async function downloadCourse(id) {
  const course = S.data.courses.find(c => c.courseID === id);
  if (!course) return;

  const modules = await loadAll('/module?id=', course.moduleIDs || []);
  const allTopics = await loadAllTopicsFromModulesWithCompleted(modules);

  const topicMap = {};
  const privateNotes = {};
  await Promise.all(allTopics.map(async t => {
    topicMap[t.topicID] = t;
    if (t.privateNoteID) {
      const pn = await GET('/privatenotes?id=' + t.privateNoteID);
      if (pn) privateNotes[t.privateNoteID] = pn;
    }
  }));

  const courseData = { course, modules, topics: topicMap, privateNotes };

  // CSS is fetched from the Go backend (/static/assets/) which serves raw files,
  // bypassing Vite's HMR transform that wraps CSS in a JS module.
  const assetFiles = [
    'styles.css', 'toolbar.css',
    'config.js', 'storage.js', 'runtime.js',
    'state.js', 'api.js', 'utils.js', 'data.js',
    'notebook.js', 'completion.js',
    'views.js', 'render.js',
    'navigation.js', 'static-init.js', 'static-main.js',
  ];
  const fetchURL = f => (f.endsWith('.css') ? `${Config.apiBase.replace('/api', '')}/static/assets/${f}` : `/assets/${f}`);
  const fetched = await Promise.all(assetFiles.map(f => fetch(fetchURL(f)).then(r => r.text())));
  const fileMap = Object.fromEntries(assetFiles.map((f, i) => [f, fetched[i]]));

  const zip = new window.JSZip();
  const folder = zip.folder(course.name.replace(/[^a-z0-9]/gi, '_'));
  const assets = folder.folder('assets');
  folder.file('index.html', buildStaticIndex(course, courseData, fileMap));
  for (const f of assetFiles.filter(f => !f.endsWith('.css') && f !== 'static-main.js')) {
    assets.file(f, fileMap[f]);
  }
  assets.file('styles.css',  fileMap['styles.css']);
  assets.file('toolbar.css', fileMap['toolbar.css']);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${course.name.replace(/[^a-z0-9]/gi, '_')}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildStaticIndex(course, courseData, fileMap) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(course.name)}</title>
<link rel="stylesheet" href="assets/styles.css">
<link rel="stylesheet" href="assets/toolbar.css">
</head>
<body>
<nav id="sidebar">
  <div id="sidebar-header">
    <h2>Coursnote</h2>
    <p>Your course notes</p>
  </div>
  <div id="sidebar-nav"></div>
  <div id="sidebar-footer"></div>
  <div id="sidebar-back"></div>
</nav>
<main id="main"></main>
<div id="toast"></div>
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js"><\/script>
<script>
  require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
  require(['vs/editor/editor.main'], function() { window.dispatchEvent(new Event('monaco-ready')); });
<\/script>
<script type="module">${fileMap['static-main.js']}<\/script>
<script>window.COURSE_DATA = ${JSON.stringify(courseData)};<\/script>
<script src="assets/config.js"><\/script>
<script src="assets/storage.js"><\/script>
<script src="assets/runtime.js"><\/script>
<script src="assets/state.js"><\/script>
<script src="assets/api.js"><\/script>
<script src="assets/utils.js"><\/script>
<script src="assets/data.js"><\/script>
<script src="assets/notebook.js"><\/script>
<script src="assets/completion.js"><\/script>
<script src="assets/views.js"><\/script>
<script src="assets/render.js"><\/script>
<script src="assets/navigation.js"><\/script>
<script src="assets/static-init.js"><\/script>
</body>
</html>`;
}
