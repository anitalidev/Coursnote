# Coursnote API Reference

Base URL: `http://localhost:8081/api`

All request bodies are JSON (`Content-Type: application/json`).  
All responses are JSON. Errors always return `{ "error": "<message>" }`.

CORS is enabled for all origins.

---

## Data Model

The ownership hierarchy is:

```
User
 └── Course (many)
      └── Module (many)
           └── Topic (many)
                ├── CoursePage (one, auto-created with Topic)
                └── PrivateNote (one, auto-created with Topic)
```

Each resource carries its own ID, its parent's ID, and (where applicable) an array of child IDs. Deleting any resource **cascade-deletes** everything it owns.

---

## Users

### `GET /api/user`

Returns one user or all users depending on query parameters.

**Query parameters (all optional):**

| Parameter  | Description                              |
|------------|------------------------------------------|
| `id`       | Return the user with this ID             |
| `username` | Return the user with this username       |
| *(none)*   | Return all users as an array             |

`id` takes precedence over `username`. If neither is provided, all users are returned.

**Response — single user `200 OK`:**
```json
{
  "id":        "1",
  "username":  "alice",
  "courseIDs": ["3", "7"]
}
```

**Response — all users `200 OK`:**
```json
[
  { "id": "1", "username": "alice", "courseIDs": ["3"] },
  { "id": "2", "username": "bob",   "courseIDs": [] }
]
```

**Errors:**
| Status | Condition |
|--------|-----------|
| `404`  | `id` or `username` not found |

---

### `POST /api/user`

Creates a new user.

**Request body:**
```json
{ "username": "alice" }
```

**Response `201 Created`:**
```json
{
  "id":        "1",
  "username":  "alice",
  "courseIDs": []
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing or empty `username` |
| `409`  | Username already taken |

---

### `DELETE /api/user?id=<id>`

Deletes a user and **cascade-deletes** all of their courses, modules, topics, course pages, and private notes.

**Query parameters:**

| Parameter | Required | Description         |
|-----------|----------|---------------------|
| `id`      | Yes      | ID of the user      |

**Response `204 No Content`**

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | User not found |

---

## Courses

### `GET /api/course?id=<id>`

Returns a single course by ID.

**Query parameters:**

| Parameter | Required | Description       |
|-----------|----------|-------------------|
| `id`      | Yes      | ID of the course  |

**Response `200 OK`:**
```json
{
  "courseID":    "3",
  "name":        "Data Structures",
  "description": "Trees, graphs, sorting algorithms",
  "moduleIDs":   ["10", "11"],
  "userID":      "1",
  "pcompleted":  0.8,
  "ntopics":     12,
  "leftColour":  "#f97407",
  "rightColour": "#e88cc2"
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Course not found |

---

### `POST /api/course`

Creates a new course owned by a user. Also appends the new course ID to the user's `courseIDs`.

**Request body:**
```json
{
  "name":        "Data Structures",
  "description": "Trees, graphs, sorting algorithms",
  "userID":      "1",
  "leftColour":  "#f97407",
  "rightColour": "#e88cc2"
}
```

`description`, `leftColour`, and `rightColour` are optional — if omitted, random hex colours are generated for each. `name` and `userID` are required.

**Response `201 Created`:**
```json
{
  "courseID":    "3",
  "name":        "Data Structures",
  "description": "Trees, graphs, sorting algorithms",
  "moduleIDs":   [],
  "userID":      "1",
  "pcompleted":  0,
  "ntopics":     0,
  "leftColour":  "#f97407",
  "rightColour": "#e88cc2"
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `name` or `userID`, or `userID` does not exist |

---

### `PUT /api/course`

Updates a course's name, description, and/or banner colours.

**Request body:**
```json
{
  "id":          "3",
  "name":        "Data Structures & Algorithms",
  "description": "Updated description",
  "leftColour":  "#f97407",
  "rightColour": "#e88cc2"
}
```

`id` and `name` are required. `description`, `leftColour`, and `rightColour` are optional.

**Response `200 OK`:** Full updated course object (same shape as GET).

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` or `name` |
| `404`  | Course not found |

---

### `DELETE /api/course?id=<id>`

Deletes a course and **cascade-deletes** all of its modules, topics, course pages, and private notes.

**Query parameters:**

| Parameter | Required | Description       |
|-----------|----------|-------------------|
| `id`      | Yes      | ID of the course  |

**Response `204 No Content`**

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Course not found |

---

## Modules

### `GET /api/module?id=<id>`

Returns a single module by ID.

**Query parameters:**

| Parameter | Required | Description       |
|-----------|----------|-------------------|
| `id`      | Yes      | ID of the module  |

**Response `200 OK`:**
```json
{
  "moduleID":    "10",
  "name":        "Week 1 — Arrays",
  "description": "Dynamic arrays and amortised analysis",
  "topicIDs":    ["20", "21"],
  "courseID":    "3"
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Module not found |

---

### `POST /api/module`

Creates a new module inside a course. Also appends the new module ID to the course's `moduleIDs`.

**Request body:**
```json
{
  "name":        "Week 1 — Arrays",
  "description": "Dynamic arrays and amortised analysis",
  "courseID":    "3"
}
```

`description` is optional. `name` and `courseID` are required.

**Response `201 Created`:** Full module object (same shape as GET).

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `name` or `courseID`, or `courseID` does not exist |

---

### `PUT /api/module`

Updates a module's name and/or description.

**Request body:**
```json
{
  "id":          "10",
  "name":        "Week 1 — Arrays & Linked Lists",
  "description": "Updated overview"
}
```

`id` and `name` are required. `description` is optional.

**Response `200 OK`:** Full updated module object (same shape as GET).

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` or `name` |
| `404`  | Module not found |

---

### `DELETE /api/module?id=<id>`

Deletes a module and **cascade-deletes** all of its topics, course pages, and private notes.

**Query parameters:**

| Parameter | Required | Description       |
|-----------|----------|-------------------|
| `id`      | Yes      | ID of the module  |

**Response `204 No Content`**

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Module not found |

---

## Topics

### `GET /api/topic?id=<id>`

Returns a single topic by ID.

**Query parameters:**

| Parameter | Required | Description      |
|-----------|----------|------------------|
| `id`      | Yes      | ID of the topic  |

**Response `200 OK`:**
```json
{
  "topicID":       "20",
  "name":          "Dynamic Arrays",
  "description":   "Resizing strategies and Big-O",
  "moduleID":      "10",
  "coursePageID":  "40",
  "privateNoteID": "50",
  "rawElements":   [
    { "type": "text",  "content": "Arrays grow dynamically by doubling capacity." },
    { "type": "table", "cells": [["Operation","Big-O"],["Access","O(1)"],["Insert","O(n)"]] }
  ]
}
```

`rawElements` is `null` when no elements have been saved yet. Each element object always has a `"type"` field, and (for content saved since element ids were introduced) a persistent `"id"` field (`el_` + 10 hex chars) generated by the editor at creation time and preserved across edits. Text values are TipTap JSON docs wrapped as `{"content": <doc>}`. Supported types:

| Type            | Extra fields |
|-----------------|--------------|
| `text`          | `content` — TipTap doc |
| `table`         | `cells` — 2-D array of text values (rows × cols) |
| `card`          | `header`, `content` |
| `cardSlide`     | `cards` — array of `{header, content}` |
| `question`      | `question`, `options` (array), `answer` (correct option index) |
| `questionSlide` | `questions` — array of `{id, question, options, answer}`; each inner question has its own persistent id |
| `codeEditor`    | `code`, `language`, `maxLines` |

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Topic not found |

---

### `POST /api/topic`

Creates a new topic inside a module. **Automatically creates one CoursePage and one PrivateNote** owned by the topic, using the same `name` and `description`. Also appends the new topic ID to the module's `topicIDs`.

**Request body:**
```json
{
  "name":      "Dynamic Arrays",
  "description": "Resizing strategies and Big-O",
  "moduleID":  "10"
}
```

`description` is optional. `name` and `moduleID` are required.

**Response `201 Created`:** Full topic object (same shape as GET), including the auto-generated `coursePageID` and `privateNoteID`.

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `name` or `moduleID`, or `moduleID` does not exist |

---

### `PUT /api/topic`

Updates a topic's name, description, and/or elements. Does **not** update the name or description of the associated CoursePage or PrivateNote — those are updated independently via their own PUT endpoints.

**Request body:**
```json
{
  "id":          "20",
  "name":        "Dynamic Arrays & Amortised Analysis",
  "description": "Updated description",
  "elements": [
    { "type": "text",  "content": "Arrays grow dynamically by doubling capacity." },
    { "type": "table", "cells": [["Operation","Big-O"],["Access","O(1)"]] }
  ]
}
```

`id` and `name` are required. `description` and `elements` are optional. If `elements` is omitted or empty, the stored elements are left unchanged. Each element must have a `"type"` field matching a registered type (see the table under `GET /api/topic`); elements should carry their persistent `"id"` so per-user answer history stays attached to the right question.

**Response `200 OK`:** Full updated topic object (same shape as GET, including `rawElements`).

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` or `name` |
| `404`  | Topic not found |

---

### `DELETE /api/topic?id=<id>`

Deletes a topic and **cascade-deletes** its CoursePage and PrivateNote.

**Query parameters:**

| Parameter | Required | Description      |
|-----------|----------|------------------|
| `id`      | Yes      | ID of the topic  |

**Response `204 No Content`**

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Topic not found |

---

## Course Pages

A CoursePage represents the shared course notes for a topic. It is **always created and deleted alongside its parent Topic** — there is no POST or standalone creation endpoint.

### `GET /api/coursepages?id=<id>`

Returns a single course page by ID.

**Query parameters:**

| Parameter | Required | Description            |
|-----------|----------|------------------------|
| `id`      | Yes      | ID of the course page  |

**Response `200 OK`:**
```json
{
  "coursePageID": "40",
  "name":         "Dynamic Arrays",
  "description":  "Resizing strategies and Big-O",
  "topicID":      "20"
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Course page not found |

---

### `PUT /api/coursepages`

Updates the description (content) of a course page.

**Request body:**
```json
{
  "id":          "40",
  "description": "Updated course notes content…"
}
```

`id` is required. `description` may be empty to clear the content.

**Response `200 OK`:** Full updated course page object (same shape as GET).

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Course page not found |

---

### `DELETE /api/coursepages?id=<id>`

Deletes a course page by ID. Prefer deleting via the parent topic (`DELETE /api/topic`) to keep data consistent.

**Query parameters:**

| Parameter | Required | Description            |
|-----------|----------|------------------------|
| `id`      | Yes      | ID of the course page  |

**Response `204 No Content`**

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Course page not found |

---

## Private Notes

A PrivateNote represents the user's personal notes for a topic. Like CoursePage, it is **always created and deleted alongside its parent Topic**.

### `GET /api/privatenotes?id=<id>`

Returns a single private note by ID.

**Query parameters:**

| Parameter | Required | Description             |
|-----------|----------|-------------------------|
| `id`      | Yes      | ID of the private note  |

**Response `200 OK`:**
```json
{
  "privateNoteID": "50",
  "name":          "Dynamic Arrays",
  "description":   "My personal notes…",
  "topicID":       "20"
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Private note not found |

---

### `PUT /api/privatenotes`

Updates the description (content) of a private note.

**Request body:**
```json
{
  "id":          "50",
  "description": "Updated personal notes…"
}
```

`id` is required. `description` may be empty to clear the content.

**Response `200 OK`:** Full updated private note object (same shape as GET).

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Private note not found |

---

### `DELETE /api/privatenotes?id=<id>`

Deletes a private note by ID. Prefer deleting via the parent topic (`DELETE /api/topic`) to keep data consistent.

**Query parameters:**

| Parameter | Required | Description             |
|-----------|----------|-------------------------|
| `id`      | Yes      | ID of the private note  |

**Response `204 No Content`**

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `id` |
| `404`  | Private note not found |

---

## Publishing & Marketplace

Publishing freezes a course into an immutable snapshot: a `StaticCourse` row (marketplace listing metadata) pointing at a `StaticCourseContent` blob (the full `COURSE_DATA` JSON, assembled client-side). Republishing creates a new snapshot and deactivates the previous one.

### `POST /api/course/publish?id=<courseID>`

Publishes a course.

**Request body:**
```json
{ "courseData": { "course": {}, "modules": [], "topics": {}, "privateNotes": {} } }
```

`courseData` is the snapshot assembled by the frontend (`publishCourse` in actions.js) from the course/module/topic/private-note endpoints. The backend stores it verbatim.

Creates the content blob and static course, deactivates the course's previous static version (if any), and updates the course's `staticCourseID`.

**Response `200 OK`:** the updated course object.

**Errors:** `400` missing `id` · `404` course not found.

---

### `GET /api/market?userID=<id>&sortBy=<fields>`

Returns all **active** static courses as `MarketCourseDTO`s.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `userID`  | No       | If given, sets each DTO's `status`: `"enrolled"` (enrolled in this exact version), `"update"` (enrolled in an older version of the same course), or `""` |
| `sortBy`  | No       | Comma-separated field names; prefix with `-` to reverse |

**`MarketCourseDTO` shape:**
```json
{
  "id": "7", "courseId": "1", "contentId": "7",
  "name": "Introduction to Python", "description": "…",
  "leftColour": "#4B8BBE", "rightColour": "#FFD43B",
  "publishDate": "2025-01-15T09:00:00Z",
  "numModules": 3, "numTopics": 6,
  "courseOwner": "alice", "isActive": true, "status": ""
}
```

---

### `GET /api/course/versions?id=<courseID>`

Returns all published static course versions of a course (active and inactive), newest first.

---

## Enrollment & Progress

Enrolling links a user to a specific static course version. The enrollment also stores the user's progress through that course.

### `POST /api/course/enroll`

**Request body:** `{ "userID": "3", "staticCourseID": "7" }`

Creates an enrollment. **Response `204 No Content`.**

**Errors:** `400` missing fields · `500` on failure.

---

### `POST /api/course/update-enroll`

**Request body:** `{ "userID": "3", "staticCourseID": "8" }`

Moves an existing enrollment for the same underlying course to a newer static version (used when `status` is `"update"` in the market listing); creates the enrollment if none exists. Progress stored on the enrollment survives the move. **Response `204 No Content`.**

**Errors:** `400` missing fields · `404` unknown `staticCourseID`.

---

### `GET /api/course/enrolled?userID=<id>`

Returns the user's enrolled courses as `MarketCourseDTO`s, each additionally carrying the enrollment's progress:

```json
{ "...": "market fields as above", "progress": { "completed": { "42": true }, "lastAnswered": { "el_3f8a1c9b2d": 2 } } }
```

---

### `GET /api/course/progress?userID=<id>&staticCourseID=<id>`

Returns the progress stored on the user's enrollment in that static course.

**Response `200 OK`:**
```json
{ "completed": { "42": true }, "lastAnswered": { "el_3f8a1c9b2d": 2 } }
```

`completed` is keyed by topic id; `lastAnswered` is keyed by persistent element/question id, with the selected option index as the value. Both are `{}` when empty.

**Errors:** `400` missing params · `404` not enrolled.

---

### `PUT /api/course/progress`

Replaces the progress blob on the user's enrollment (whole-object replace, last write wins). Called by the course viewer, debounced, on Mark Complete clicks and question answers.

**Request body:**
```json
{
  "userID": "1",
  "staticCourseID": "7",
  "progress": { "completed": { "42": true }, "lastAnswered": { "el_3f8a1c9b2d": 2 } }
}
```

Body is capped at 1 MB; every map key must match `^[A-Za-z0-9_-]{1,64}$`.

**Response `204 No Content`.**

**Errors:** `400` missing fields or invalid keys · `404` not enrolled.

---

## Course Viewer

### `GET /api/staticcontent?id=<contentID>&userID=<userID>&from=<view>`

The one endpoint that returns **HTML, not JSON**: the standalone course-viewer page for a published snapshot. Opened by full-page navigation (the frontend's `openCourseViewer`).

| Parameter | Required | Description |
|-----------|----------|-------------|
| `id`      | Yes      | `StaticCourseContent` id (the `contentId` on market/enrolled DTOs) |
| `userID`  | No       | If the user is enrolled in the snapshot's static course, their enrollment is embedded as `window.ENROLLMENT_DATA = {userID, staticCourseID, progress}`; otherwise `null` |
| `from`    | No       | Ignored by the backend; read client-side to label the viewer's back button (`home`, `market`, …) |

The response is the shared viewer shell with `window.COURSE_DATA = <snapshot>` and `window.ENROLLMENT_DATA` inlined, followed by the app's asset scripts. With `ENROLLMENT_DATA` present, the viewer persists progress via `PUT /api/course/progress`; without it, progress falls back to `localStorage` (downloaded-zip behavior).

**Errors:** `400` missing `id` · `404` content not found.

---

## Cascade Delete Summary

| Endpoint | Also deletes |
|----------|-------------|
| `DELETE /api/user` | All courses → modules → topics → course pages + private notes |
| `DELETE /api/course` | All modules → topics → course pages + private notes |
| `DELETE /api/module` | All topics → course pages + private notes |
| `DELETE /api/topic` | Its course page + private note |
| `DELETE /api/coursepages` | Nothing |
| `DELETE /api/privatenotes` | Nothing |
