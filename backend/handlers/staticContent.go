package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

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
<script>
  (function () {
    try {
      var u = JSON.parse(localStorage.getItem('coursnote_user'));
      if (!u || !u.settings) return;
      var s = u.settings;
      var r = document.documentElement;
      function toRGB(hex) {
        if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
        var n = parseInt(hex.slice(1), 16);
        return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
      }
      var bg = toRGB(s.backgroundColour), bl = toRGB(s.primaryColour), pur = toRGB(s.gradientColour);
      if (bg)  r.style.setProperty('--col-bg',     bg);
      if (bl)  r.style.setProperty('--col-blue',   bl);
      if (pur) r.style.setProperty('--col-purple', pur);
      if (s.navColour)           r.style.setProperty('--col-nav',    s.navColour);
      if (s.cardColour)          r.style.setProperty('--col-card',   s.cardColour);
      if (s.textColour)          r.style.setProperty('--col-text',   s.textColour);
      if (s.accentColour)        r.style.setProperty('--col-border', s.accentColour);
      if (s.secondaryTextColour) r.style.setProperty('--col-text2',  s.secondaryTextColour);
    } catch (e) {}
  })();
</script>
</head>
<body>

<div id="app-loading" style="position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;align-items:center;justify-content:center;gap:10px">
  <div style="width:10px;height:10px;border-radius:50%;background:rgb(var(--col-blue));animation:_ld .9s ease-in-out infinite"></div>
  <div style="width:10px;height:10px;border-radius:50%;background:rgb(var(--col-blue));animation:_ld .9s ease-in-out .2s infinite"></div>
  <div style="width:10px;height:10px;border-radius:50%;background:rgb(var(--col-blue));animation:_ld .9s ease-in-out .4s infinite"></div>
</div>
<style>@keyframes _ld{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}</style>

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
<script>window.COURSE_DATA = __COURSE_DATA__;</script>
<script>window.ENROLLMENT_DATA = __ENROLLMENT_DATA__;</script>
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

	// Escape the JSON for safe inline <script> injection.
	// Without this, a "</script>" string inside the course content would break
	// out of the script tag and render the rest of the JSON as visible page text.
	var safeCourse, safeEnrollment bytes.Buffer
	json.HTMLEscape(&safeCourse, content.Content)
	json.HTMLEscape(&safeEnrollment, []byte(enrollmentJSON))

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	out := strings.NewReplacer(
		"__COURSE_DATA__",     safeCourse.String(),
		"__ENROLLMENT_DATA__", safeEnrollment.String(),
	).Replace(staticShell)
	io.WriteString(w, out)
}
