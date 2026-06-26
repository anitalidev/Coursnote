package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/persistence"
)

type CourseDTO struct {
	CourseID    string   `json:"courseID"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	ModuleIDs   []string `json:"moduleIDs"`
	UserID      string   `json:"userID"`
}

func CourseHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
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
		writeJSON(w, http.StatusOK, CourseDTO{
			CourseID:    course.CourseID,
			Name:        course.Name,
			Description: course.Description,
			ModuleIDs:   course.ModuleIDs,
			UserID:      course.UserID,
		})

	case http.MethodPost:
		var body struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			UserID      string `json:"userID"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" || body.UserID == "" {
			writeError(w, http.StatusBadRequest, "name and userID required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		course, err := store.repos.Courses.CreateCourse(&persistence.CourseInfo{
			Name:        body.Name,
			Description: body.Description,
			UserID:      body.UserID,
		})
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, CourseDTO{
			CourseID:    course.CourseID,
			Name:        course.Name,
			Description: course.Description,
			ModuleIDs:   course.ModuleIDs,
			UserID:      course.UserID,
		})

	case http.MethodPut:
		var body struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" || body.Name == "" {
			writeError(w, http.StatusBadRequest, "id and name required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.Courses.UpdateCourse(body.ID, body.Name, body.Description); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		course, _ := store.repos.Courses.GetCourseByID(body.ID)
		writeJSON(w, http.StatusOK, CourseDTO{
			CourseID:    course.CourseID,
			Name:        course.Name,
			Description: course.Description,
			ModuleIDs:   course.ModuleIDs,
			UserID:      course.UserID,
		})

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if _, err := store.repos.Courses.GetCourseByID(id); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		cascadeDeleteCourse(id)
		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
