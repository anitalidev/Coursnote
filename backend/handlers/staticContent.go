package handlers

import (
	"fmt"
	"net/http"
)

const staticShell = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Coursnote</title>
<link rel="stylesheet" href="/static/assets/styles.css">
<link rel="stylesheet" href="/static/assets/toolbar.css">
</head>
<body>
<nav id="sidebar">
  <div id="sidebar-header"><h2>Coursnote</h2><p>Your course notes</p></div>
  <div id="sidebar-nav"></div>
  <div id="sidebar-footer"></div>
  <div id="sidebar-back"></div>
</nav>
<main id="main"></main>
<div id="toast"></div>
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js"></script>
<script>
  require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } });
  require(['vs/editor/editor.main'], function() { window.dispatchEvent(new Event('monaco-ready')); });
</script>
<script type="module" src="/static/assets/static-main.js"></script>
<script>window.COURSE_DATA = %s;</script>
<script src="/static/assets/state.js"></script>
<script src="/static/assets/api.js"></script>
<script src="/static/assets/utils.js"></script>
<script src="/static/assets/data.js"></script>
<script src="/static/assets/notebook.js"></script>
<script src="/static/assets/views.js"></script>
<script src="/static/assets/render.js"></script>
<script src="/static/assets/navigation.js"></script>
<script src="/static/assets/static-init.js"></script>
</body>
</html>`

func StaticContentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}

	store.mu.RLock()
	defer store.mu.RUnlock()

	content, err := store.repos.StaticContents.GetByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, staticShell, string(content.Content))
}
