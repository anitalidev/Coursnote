package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/persistence"
)

// DTO format that will be sent to frontend to represent a module
type ModuleDTO struct {
	ModuleID    string   `json:"moduleID"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	TopicIDs    []string `json:"topicIDs"`
	CourseID    string   `json:"courseID"`
}

// HTTP Request Handlers

// OVERALL: GET a module by ID
// QPARAM: id (non-empty)
// BADREQ: if id query parameter doesn't exist/empty
// NOTFND: if no module with that id exists
// WRITES: JSON representing a single ModuleDTO
func GetModule(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}

	module, err := store.repos.Modules.GetModuleByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, ModuleDTO{
		ModuleID:    module.ModuleID,
		Name:        module.Name,
		Description: module.Description,
		TopicIDs:    module.TopicIDs,
		CourseID:    module.CourseID,
	})
}

// OVERALL: POST (create) a module inside a course
// RQBODY: name, courseID (required); description (optional)
// BADREQ: if name or courseID is missing, or courseID does not exist
// SERVER: if an internal error occurs
// WRITES: JSON representing a single ModuleDTO (of the newly created module)
func PostModule(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		CourseID    string `json:"courseID"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" || body.CourseID == "" {
		writeError(w, http.StatusBadRequest, "name and courseID required")
		return
	}

	module, err := store.repos.Modules.CreateModule(&persistence.ModuleInfo{
		Name:        body.Name,
		Description: body.Description,
		CourseID:    body.CourseID,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, ModuleDTO{
		ModuleID:    module.ModuleID,
		Name:        module.Name,
		Description: module.Description,
		TopicIDs:    module.TopicIDs,
		CourseID:    module.CourseID,
	})
}

// OVERALL: PUT (update) a module's name and/or description
// RQBODY: id, name (required); description (optional)
// BADREQ: if id or name is missing
// NOTFND: if no module with that id exists
// SERVER: if an internal error occurs
// WRITES: JSON representing the full updated ModuleDTO
func PutModule(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" || body.Name == "" {
		writeError(w, http.StatusBadRequest, "id and name required")
		return
	}

	if err := store.repos.Modules.UpdateModule(body.ID, body.Name, body.Description); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	// Re-fetch to return the full up-to-date module (includes topicIDs, courseID, etc.)
	module, _ := store.repos.Modules.GetModuleByID(body.ID)
	writeJSON(w, http.StatusOK, ModuleDTO{
		ModuleID:    module.ModuleID,
		Name:        module.Name,
		Description: module.Description,
		TopicIDs:    module.TopicIDs,
		CourseID:    module.CourseID,
	})
}

// OVERALL: DELETE a module and cascade-delete all its topics
// QPARAM: id (non-empty)
// BADREQ: if id query parameter doesn't exist/empty
// NOTFND: if no module with that id exists
// SERVER: if an internal error occurs during deletion
func DeleteModule(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}

	// Confirm the module exists before attempting deletion
	if _, err := store.repos.Modules.GetModuleByID(id); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	// Delete module (cascade-deletes all topics via FK)
	if err := store.repos.Modules.DeleteModuleByID(id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
