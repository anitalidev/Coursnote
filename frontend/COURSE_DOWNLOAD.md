# Course Downloading

Triggered from the course card menu → **Download**. Calls `downloadCourse(courseID)` in `actions.js`.

---

## What gets bundled

The download produces a self-contained `.zip` file named after the course (non-alphanumeric characters replaced with `_`). Inside the zip:

```
CourseName/
├── index.html
└── assets/
    ├── styles.css
    ├── toolbar.css
    ├── state.js
    ├── api.js
    ├── utils.js
    ├── data.js
    ├── notebook.js
    ├── views.js
    ├── render.js
    ├── navigation.js
    └── static-init.js
```

## Steps inside `downloadCourse`

1. **Fetch course data** — loads all modules and topics for the course via the API. For each topic, also fetches its private note if one exists.

2. **Build `COURSE_DATA`** — uses fetched course data to assemble a single JSON object:
   ```js
   { course, modules, topics: { [topicID]: topic }, privateNotes: { [id]: note } }
   ```
   This becomes `window.COURSE_DATA` embedded in the HTML.

3. **Fetch asset files** — fetches every JS/CSS file listed in `assetFiles` from the running dev server. CSS files are fetched from the Go backend (`localhost:8081/static/assets/`) instead of Vite, because Vite wraps CSS in a JS HMR module rather than serving raw text.
- Drops save.js and some other editing-related JS that would not be relevant
- Replace boostrap.js with static.js
  - bootstrap.js uses Go backend API, static.js uses the COURSE_DATA that will be stored in the .html

4. **Build `index.html`** via `buildStaticIndex()` — produces a standalone HTML page that:
   - Links to the bundled CSS files
   - Inlines `static-main.js` as a `<script type="module">` (handles TipTap + JSZip imports from esm.sh CDN)
   - Embeds `COURSE_DATA` as a global variable
   - Loads all asset JS files in the correct order

5. **Zip and trigger download** — uses JSZip to create the archive in-browser, generates a Blob URL, clicks a temporary `<a>` element to trigger the browser download, then revokes the URL.

---

## Static mode (`STATIC_MODE = true`)

When the downloaded `index.html` is opened, `static-init.js` runs before the rest of the app and sets `window.STATIC_MODE = true`. This causes:

- **API shim** — `api.js` reads from `COURSE_DATA` instead of making network requests. The course, modules, and topics are all served from the pre-built maps (`courseMap`, `moduleMap`, `topicMap`).
- **Synthetic user** — a fake user object is created so the app skips the login screen and goes straight to the course overview.
- **Navigation stubs** — `goCourses`, `goHome`, `goMarket`, `goSettings` all redirect to the course overview since there is only one course available.
- **Edit mode disabled** — `S.editMode = false` and all form-binding functions are stubbed out (no-ops).
- **Progress tracking** — topic completion is tracked in `localStorage` keyed by `cn_progress_<courseID>`, so progress persists across page reloads without a backend.

---

## Adding new asset files to the download

If you add a new JS/CSS file that the app needs:

1. Add the filename to the `assetFiles` array in `downloadCourse`.
2. Add a corresponding `assets.file(...)` call in the zip-building block.
3. Add a `<script src="assets/...">` tag in `buildStaticIndex` at the correct load order position.
4. If the file uses any live-app-only features (API calls, edit forms, etc.), add stubs for them in `static-init.js`.



When publishing courses, the COURSE_DATA will be stored in a StaticContent object attached to each StaticCourse object (one-to-one relationship). 
Then, when enrolled, there will be an Enrollment object created pointing to a StaticCourse object, and this object may contain more user-specific data regarding an enrollment.
When viewing an enrolled course, the COURSE_DATA will be inserted into the constant html template used across ALL users, and the enrollment object will be used to provide more user-specific data (eg. question answer history)