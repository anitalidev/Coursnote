# COURSE_DATA Format

`window.COURSE_DATA` is a JSON blob injected into the static course viewer page. It is assembled client-side by `publishCourse` / `downloadCourse` in `actions.js` and stored verbatim by the backend as a `StaticCourseContent` row.

`static-init.js` reads it as `window.COURSE_DATA` (also exposed as `window._CD`) and builds fast-lookup maps (`courseMap`, `moduleMap`, `topicMap`) on top of it.

---

## Top-level shape

```json
{
  "course":       { },
  "modules":      [ ],
  "topics":       { },
  "privateNotes": { }
}
```

| Field          | Type             | Description |
|----------------|------------------|-------------|
| `course`       | Object           | The course object (same shape as `GET /api/course`) |
| `modules`      | Array of objects | Ordered list of module objects (same shape as `GET /api/module`) |
| `topics`       | Object           | Map of `topicID → topic object` (same shape as `GET /api/topic`) |
| `privateNotes` | Object           | Map of `privateNoteID → private note object` |

---

## `course`

```json
{
  "courseID":    "3",
  "name":        "Introduction to Python",
  "description": "Variables, loops, functions, and more",
  "moduleIDs":   ["10", "11", "12"],
  "userID":      "1",
  "pcompleted":  0,
  "ntopics":     8,
  "leftColour":  "#4B8BBE",
  "rightColour": "#FFD43B"
}
```

## `modules` (array, ordered)

```json
[
  {
    "moduleID":    "10",
    "name":        "Control Flow",
    "description": "Conditionals and loops",
    "courseID":    "3",
    "topicIDs":    ["20", "21", "22"]
  }
]
```

## `topics` (keyed map)

```json
{
  "20": {
    "topicID":        "20",
    "name":           "If / Elif / Else",
    "description":    "Conditional branching",
    "moduleID":       "10",
    "coursePageID":   "40",
    "privateNoteID":  "50",
    "rawElements":    [ ],
    "compTypes": [
      { "type": "self_reported",              "config": null },
      { "type": "read_to_bottom",             "config": null },
      { "type": "timed",                      "config": 60   },
      { "type": "percentage_questions_correct","config": 80  }
    ]
  }
}
```

`rawElements` is `null` when no content has been saved. Per-user progress (`marked_manually`, `time_spent`, `read_to_bottom`) is not stored here — it lives in `ENROLLMENT_DATA.progress`.

`compTypes` mirrors the `compRules` sent on create/update. Supported rule types:

| `type` | `config` | Description |
|--------|----------|-------------|
| `self_reported` | `null` | User manually marks topic complete |
| `read_to_bottom` | `null` | User scrolls to the bottom of the topic |
| `timed` | Number (seconds) | User spends at least this many seconds on the topic |
| `percentage_questions_correct` | Number (0–100) | User answers at least this percentage of embedded questions correctly |

`read_to_bottom`, `time_spent`, and `marked_manually` are runtime fields added by `static-init.js` when loading saved progress — they are not meaningful in the stored blob itself.

---

## `privateNotes` (keyed map)

```json
{
  "50": {
    "privateNoteID": "50",
    "topicID":       "20",
    "rawElements":   [ ]
  }
}
```

---

## Runtime-added lookup maps

`static-init.js` adds three lookup maps directly onto `window.COURSE_DATA` (also exposed as `window._CD`) after the page loads:

| Map         | Key        | Value         |
|-------------|------------|---------------|
| `courseMap` | `courseID` | course object |
| `moduleMap` | `moduleID` | module object |
| `topicMap`  | `topicID`  | topic object  |

`window._CD` is used by `views.js` to resolve topic element data when evaluating completion rules for topics other than the currently open one (e.g. sidebar completeness indicators).

These maps are not part of the stored blob — they are built at runtime from the arrays/maps above.
