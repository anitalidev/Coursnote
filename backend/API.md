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
  "userID":      "1"
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
  "userID":      "1"
}
```

`description` is optional. `name` and `userID` are required.

**Response `201 Created`:**
```json
{
  "courseID":    "3",
  "name":        "Data Structures",
  "description": "Trees, graphs, sorting algorithms",
  "moduleIDs":   [],
  "userID":      "1"
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| `400`  | Missing `name` or `userID`, or `userID` does not exist |

---

### `PUT /api/course`

Updates a course's name and/or description.

**Request body:**
```json
{
  "id":          "3",
  "name":        "Data Structures & Algorithms",
  "description": "Updated description"
}
```

`id` and `name` are required. `description` is optional.

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
  "privateNoteID": "50"
}
```

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

Updates a topic's name and/or description. Does **not** update the name or description of the associated CoursePage or PrivateNote — those are updated independently via their own PUT endpoints.

**Request body:**
```json
{
  "id":          "20",
  "name":        "Dynamic Arrays & Amortised Analysis",
  "description": "Updated description"
}
```

`id` and `name` are required. `description` is optional.

**Response `200 OK`:** Full updated topic object (same shape as GET).

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

## Cascade Delete Summary

| Endpoint | Also deletes |
|----------|-------------|
| `DELETE /api/user` | All courses → modules → topics → course pages + private notes |
| `DELETE /api/course` | All modules → topics → course pages + private notes |
| `DELETE /api/module` | All topics → course pages + private notes |
| `DELETE /api/topic` | Its course page + private note |
| `DELETE /api/coursepages` | Nothing |
| `DELETE /api/privatenotes` | Nothing |
