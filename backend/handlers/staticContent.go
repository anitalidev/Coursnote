package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/models"
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
<script>window.ENROLLMENT_DATA = %s;</script>
<script src="/static/assets/config.js"></script>
<script src="/static/assets/storage.js"></script>
<script src="/static/assets/runtime.js"></script>
<script src="/static/assets/state.js"></script>
<script src="/static/assets/api.js"></script>
<script src="/static/assets/utils.js"></script>
<script src="/static/assets/data.js"></script>
<script src="/static/assets/notebook.js"></script>
<script src="/static/assets/completion.js"></script>
<script src="/static/assets/views.js"></script>
<script src="/static/assets/render.js"></script>
<script src="/static/assets/navigation.js"></script>
<script src="/static/assets/static-init.js"></script>
</body>
</html>`

// HTTP Request Handlers

// OVERALL: GET the static course viewer page for a given content ID
// QPARAM: id (non-empty); userID (optional — if provided, enrollment is embedded in the page)
// BADREQ: if id query param is missing/empty
// NOTFND: if no static content with that id exists, or if content exists but has not been published yet
// WRITES: HTML page (staticShell) with COURSE_DATA and ENROLLMENT_DATA injected as JS globals
func GetStaticContent(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}

	store.mu.RLock()
	defer store.mu.RUnlock()

	// Fetch the published content blob for this content ID
	content, err := store.repos.StaticContents.GetByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	// A StaticContent row can exist before its content is published (empty blob)
	if len(content.Content) == 0 {
		writeError(w, http.StatusNotFound, "course content not yet published")
		return
	}

	// Resolve enrollment: StaticContent → StaticCourse → Enrollment for this user.
	// enrollmentJSON stays "null" when userID is absent or no enrollment is found;
	// the frontend checks window.ENROLLMENT_DATA for null to decide between
	// server-persisted progress and localStorage-only (preview) mode.
	enrollmentJSON := "null"
	if userID := r.URL.Query().Get("userID"); userID != "" {
		if sc, err := store.repos.StaticCourses.GetByContentID(id); err == nil && sc != nil {
			if e, err := store.repos.Enrollments.GetByUserAndStaticCourseID(userID, sc.ID); err == nil && e != nil {
				payload := struct {
					UserID         string                    `json:"userID"`
					StaticCourseID string                    `json:"staticCourseID"`
					Progress       models.EnrollmentProgress `json:"progress"`
				}{e.UserID, e.StaticCourseID, e.Progress}
				if b, err := json.Marshal(payload); err == nil {
					enrollmentJSON = string(b)
				}
			}
		}
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, staticShell, string(content.Content), enrollmentJSON)
}
