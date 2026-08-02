package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/models/elements"
)

// ── DTO ───────────────────────────────────────────────────────────────────────

// DTO format sent to the frontend to represent a course page and its elements
type CoursePageDTO struct {
	CoursePageID string          `json:"coursePageID"`
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	TopicID      string          `json:"topicID"`
	RawElements  json.RawMessage `json:"rawElements"`
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// OVERALL: GET a course page by ID
// QPARAM: id (non-empty)
// BADREQ: if id query param is missing/empty
// NOTFND: if no course page with that id exists
// WRITES: JSON representing a single CoursePageDTO
func GetCoursePage(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}

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
		RawElements:  page.RawElements,
	})
}

// OVERALL: PUT (update) a course page's description and/or element content
// RQBODY: id (required); description (optional), elements (optional — JSON array of course elements)
// BADREQ: if id is missing, or elements cannot be deserialised
// NOTFND: if no course page with that id exists
// SERVER: if saving the elements fails
// WRITES: JSON representing the full updated CoursePageDTO
func PutCoursePage(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID          string          `json:"id"`
		Description string          `json:"description"`
		RawElements json.RawMessage `json:"elements"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" {
		writeError(w, http.StatusBadRequest, "id required")
		return
	}

	if err := store.repos.CoursePages.UpdateCoursePageDescription(body.ID, body.Description); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	if len(body.RawElements) > 0 {
		elems, err := elements.UnmarshalElements(body.RawElements)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid elements: "+err.Error())
			return
		}
		if err := store.repos.CoursePages.SaveCourseElements(body.ID, elems); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// Re-fetch to return the full up-to-date page
	page, _ := store.repos.CoursePages.GetCoursePageByID(body.ID)
	writeJSON(w, http.StatusOK, CoursePageDTO{
		CoursePageID: page.CoursePageID,
		Name:         page.Name,
		Description:  page.Description,
		RawElements:  page.RawElements,
		TopicID:      page.TopicID,
	})
}

// OVERALL: DELETE a course page by ID
// QPARAM: id (non-empty)
// BADREQ: if id query param is missing/empty
// NOTFND: if no course page with that id exists
// SERVER: if an internal error occurs during deletion
func DeleteCoursePage(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}

	if err := store.repos.CoursePages.DeleteCoursePageByID(id); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
