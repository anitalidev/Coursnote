package handlers

import (
	"encoding/json"
	"net/http"
)

type CoursePageDTO struct {
	CoursePageID string `json:"coursePageID"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	TopicID      string `json:"topicID"`
}

func CoursePageHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.RLock()
		defer store.mu.RUnlock()

		page, err := store.repos.CoursePages.GetCoursePageByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, CoursePageDTO{
			CoursePageID: page.CoursePageID,
			Name:         page.Name,
			Description:  page.Description,
			TopicID:      page.TopicID,
		})

	case http.MethodPut:
		var body struct {
			ID          string `json:"id"`
			Description string `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" {
			writeError(w, http.StatusBadRequest, "id required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.CoursePages.UpdateCoursePageDescription(body.ID, body.Description); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		page, _ := store.repos.CoursePages.GetCoursePageByID(body.ID)
		writeJSON(w, http.StatusOK, CoursePageDTO{
			CoursePageID: page.CoursePageID,
			Name:         page.Name,
			Description:  page.Description,
			TopicID:      page.TopicID,
		})

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.CoursePages.DeleteCoursePageByID(id); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
