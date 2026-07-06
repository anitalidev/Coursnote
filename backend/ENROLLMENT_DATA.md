# ENROLLMENT_DATA Format

`window.ENROLLMENT_DATA` is injected by the backend into the static course viewer page when the requesting user is enrolled in the course being viewed. It is `null` for downloaded ZIP files and for unenrolled viewers.

Its presence switches the viewer's progress persistence from `localStorage`-only to also saving via `PUT /api/course/progress`.

---

## Shape

```json
{
  "userID":         "1",
  "staticCourseID": "7",
  "progress": {
    "marked_manually": { "20": true },
    "time_spent":      { "20": 142.3 },
    "read_to_bottom":  { "20": true },
    "lastAnswered":    { "el_3f8a1c9b2d": 2, "el_9b1c4e7f0a": 0 }
  }
}
```

| Field            | Type   | Description |
|------------------|--------|-------------|
| `userID`         | String | The enrolled user's ID |
| `staticCourseID` | String | The static course version ID (not the mutable `courseID`) |
| `progress`       | Object | The user's progress blob — owned entirely by the frontend |

---

## `progress` fields

| Field             | Type   | Description |
|-------------------|--------|-------------|
| `marked_manually` | Object | `topicID → true` — topics the user has explicitly marked complete via the "Mark Complete" button |
| `time_spent`      | Object | `topicID → seconds` — cumulative seconds the user has spent on each topic |
| `read_to_bottom`  | Object | `topicID → true` — topics where the user has scrolled to the bottom |
| `lastAnswered`    | Object | `elementID → selectedOptionIndex` — most recent answer per question; key is the persistent element `id` (`el_` + 10 hex chars), or a positional fallback key (`pos_<topicID>_<cellIdx>_<qi>`) for snapshots published before element ids existed |

All fields default to `{}` when no progress has been recorded.

---

## Architectural note — what the backend actually persists

The backend stores the progress blob verbatim as a JSON column on the enrollment. However, the current Go struct (`EnrollmentProgress`) only has typed fields `Completed` and `LastAnswered`, so **`marked_manually`, `time_spent`, and `read_to_bottom` are silently dropped when saved to the server**.

In practice this means:
- `lastAnswered` (quiz answers) is fully server-persisted — survives across devices and localStorage clears
- `marked_manually`, `time_spent`, `read_to_bottom` are **localStorage-only** — survive page refreshes on the same browser, but lost if localStorage is cleared or a different device is used
- On load, the frontend merges localStorage and server data, so a mark made just before a refresh survives (localStorage beats the server for these fields)

The intended fix is to change `EnrollmentProgress` to `json.RawMessage` so the backend is a transparent blob store and all fields survive.

---

## How it is used in `static-init.js`

```javascript
var _ED = window.ENROLLMENT_DATA || null;
```

| Condition        | Progress storage |
|------------------|------------------|
| `_ED` present    | Initialise `_progress` by merging `_ED.progress` (server) with localStorage (local), taking the best value for each field. Save via `PUT /api/course/progress` debounced 800 ms. |
| `_ED` is `null`  | Read/write `localStorage` only, under key `cn_progress_<courseID>` |

On `pagehide` / `beforeunload`, any pending debounced save is flushed immediately with `keepalive: true`.

### Merge strategy on load (enrolled mode)

| Field             | Merge rule |
|-------------------|------------|
| `marked_manually` | Union of local + server (local as base, server overrides) |
| `time_spent`      | `Math.max(local, server)` per topic |
| `read_to_bottom`  | Union of local + server |
| `lastAnswered`    | Server wins (most authoritative for quiz answers) |

---

## Persistence endpoint

```
PUT /api/course/progress
Body: { "userID": "1", "staticCourseID": "7", "progress": { ... } }
```

Whole-object replace (last write wins). See API.md for details.
