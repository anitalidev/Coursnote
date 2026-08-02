package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/persistence"
)

// ── DTO ───────────────────────────────────────────────────────────────────────

// DTO format sent to the frontend to represent a course
type CourseDTO struct {
	CourseID       string    `json:"courseID"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	ModuleIDs      []string  `json:"moduleIDs"`
	StaticCourseID string    `json:"staticCourseID"`
	PublishDate    time.Time `json:"publishDate,omitempty"`
	UserID         string    `json:"userID"`
	NTopics        int       `json:"ntopics"`
	LeftColour     string    `json:"leftColour"`
	RightColour    string    `json:"rightColour"`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func randomHex() string {
	return fmt.Sprintf("#%06x", rand.Intn(0xffffff+1))
}

// courseToDTO converts a Course model to a CourseDTO, computing derived fields
// (topic count, publish date). Called while the store lock is already held.
func courseToDTO(course *models.Course) CourseDTO {
	dto := CourseDTO{
		CourseID:       course.CourseID,
		Name:           course.Name,
		Description:    course.Description,
		ModuleIDs:      course.ModuleIDs,
		StaticCourseID: course.StaticCourseID,
		UserID:         course.UserID,
		NTopics:        TopicCount(course),
		LeftColour:     course.LeftColour,
		RightColour:    course.RightColour,
	}
	if date, err := store.repos.StaticCourses.GetPublishDateByID(course.StaticCourseID); err == nil {
		dto.PublishDate = date
	}
	return dto
}

// TopicCount returns the total number of topics across all of a course's modules.
// Called while the store lock is already held.
func TopicCount(course *models.Course) int {
	total := 0
	for _, moduleID := range course.ModuleIDs {
		module, err := store.repos.Modules.GetModuleByID(moduleID)
		if err != nil {
			continue
		}
		total += len(module.TopicIDs)
	}
	return total
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// OVERALL: GET all courses belonging to a user
// QPARAM: userID (non-empty)
// BADREQ: if userID query param is missing/empty
// SERVER: if an internal error occurs fetching courses
// WRITES: JSON representing a []CourseDTO
func GetCoursesByUser(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userID")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "userID query param required")
		return
	}
	store.mu.RLock()
	defer store.mu.RUnlock()

	courses, err := store.repos.Courses.GetCoursesByUserID(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	dtos := make([]CourseDTO, 0, len(courses))
	for _, course := range courses {
		dtos = append(dtos, courseToDTO(course))
	}
	writeJSON(w, http.StatusOK, dtos)
}

// OVERALL: GET a single course by ID
// QPARAM: id (non-empty)
// BADREQ: if id query param is missing/empty
// NOTFND: if no course with that id exists
// WRITES: JSON representing a single CourseDTO
func GetCourse(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}
	store.mu.RLock()
	defer store.mu.RUnlock()

	course, err := store.repos.Courses.GetCourseByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, courseToDTO(course))
}

// OVERALL: POST (create) a new course owned by a user
// RQBODY: name, userID (required); description, leftColour, rightColour (optional — colours default to random hex)
// BADREQ: if name or userID is missing
// SERVER: if an internal error occurs
// WRITES: JSON representing a single CourseDTO (of the newly created course)
func PostCourse(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		UserID      string `json:"userID"`
		LeftColour  string `json:"leftColour"`
		RightColour string `json:"rightColour"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" || body.UserID == "" {
		writeError(w, http.StatusBadRequest, "name and userID required")
		return
	}
	if body.LeftColour == "" {
		body.LeftColour = randomHex()
	}
	if body.RightColour == "" {
		body.RightColour = randomHex()
	}
	store.mu.Lock()
	defer store.mu.Unlock()

	course, err := store.repos.Courses.CreateCourse(&persistence.CourseInfo{
		Name:        body.Name,
		Description: body.Description,
		UserID:      body.UserID,
		LeftColour:  body.LeftColour,
		RightColour: body.RightColour,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, courseToDTO(course))
}

// OVERALL: POST (publish) a course, creating a new immutable static version of it
// QPARAM: id (non-empty) — the course to publish
// RQBODY: courseData (optional — serialised course content blob to store)
// BADREQ: if id is missing
// NOTFND: if no course with that id exists
// SERVER: if creating the static content or static course record fails
// WRITES: JSON representing a single CourseDTO with the new staticCourseID stamped in
func PublishCourse(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}

	var body struct {
		CourseData json.RawMessage `json:"courseData"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	store.mu.Lock()
	defer store.mu.Unlock()

	course, err := store.repos.Courses.GetCourseByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "invalid course id")
		return
	}

	newStaticContent, err := store.repos.StaticContents.Create(&persistence.StaticContentInfo{
		PublishedContent: string(body.CourseData),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	newStaticCourse, err := store.repos.StaticCourses.Create(&persistence.StaticCourseInfo{
		CourseID:    course.CourseID,
		ContentID:   newStaticContent.ID,
		Name:        course.Name,
		Description: course.Description,
		LeftColour:  course.LeftColour,
		RightColour: course.RightColour,
		PublishDate: time.Now(),
		NumModules:  len(course.ModuleIDs),
		NumTopics:   TopicCount(course),
		CourseOwner: func() string {
			username, _ := store.repos.Users.GetUsernameByID(course.UserID)
			return username
		}(),
		IsActive: true,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Mark the previous active version inactive before linking the new one
	if course.StaticCourseID != "" {
		if err := store.repos.StaticCourses.SetActive(course.StaticCourseID, false); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	if err := store.repos.Courses.UpdateCourse(course.CourseID, course.Name, course.Description,
		course.LeftColour, course.RightColour, newStaticCourse.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Re-fetch to return the course with the new staticCourseID stamped in
	course, err = store.repos.Courses.GetCourseByID(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, courseToDTO(course))
}

// OVERALL: PUT (update) a course's name, description, colours, or staticCourseID
// RQBODY: id, name (required); description, staticCourseID, leftColour, rightColour (optional)
// BADREQ: if id or name is missing
// NOTFND: if no course with that id exists
// WRITES: JSON representing the full updated CourseDTO
func PutCourse(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID             string `json:"id"`
		Name           string `json:"name"`
		Description    string `json:"description"`
		StaticCourseID string `json:"staticCourseID"`
		LeftColour     string `json:"leftColour"`
		RightColour    string `json:"rightColour"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" || body.Name == "" {
		writeError(w, http.StatusBadRequest, "id and name required")
		return
	}
	store.mu.Lock()
	defer store.mu.Unlock()

	if err := store.repos.Courses.UpdateCourse(body.ID, body.Name, body.Description,
		body.LeftColour, body.RightColour, body.StaticCourseID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	course, _ := store.repos.Courses.GetCourseByID(body.ID)
	writeJSON(w, http.StatusOK, courseToDTO(course))
}

// OVERALL: DELETE a course and cascade-delete all its modules, topics, and pages
// QPARAM: id (non-empty)
// BADREQ: if id query param is missing/empty
// NOTFND: if no course with that id exists
// SERVER: if an internal error occurs during deletion
func DeleteCourse(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}
	store.mu.Lock()
	defer store.mu.Unlock()

	// Confirm the course exists before attempting deletion
	if _, err := store.repos.Courses.GetCourseByID(id); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if err := store.repos.Courses.DeleteCourseByID(id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// OVERALL: GET all published (static) versions of a course, newest first
// QPARAM: id (non-empty) — the parent course ID
// BADREQ: if id query param is missing/empty
// SERVER: if an internal error occurs
// WRITES: JSON representing a []*market.StaticCourse ordered by publish date descending
func GetCourseVersions(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}
	store.mu.RLock()
	defer store.mu.RUnlock()

	versions, err := store.repos.StaticCourses.GetVersionsByCourseID(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, versions)
}
