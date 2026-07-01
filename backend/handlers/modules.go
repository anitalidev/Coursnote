package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/persistence"
)

type ModuleDTO struct {
	ModuleID    string   `json:"moduleID"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	TopicIDs    []string `json:"topicIDs"`
	CourseID    string   `json:"courseID"`
}

func ModuleHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.RLock()
		defer store.mu.RUnlock()

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

	case http.MethodPost:
		var body struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			CourseID    string `json:"courseID"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" || body.CourseID == "" {
			writeError(w, http.StatusBadRequest, "name and courseID required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

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

		if err := store.repos.Modules.UpdateModule(body.ID, body.Name, body.Description); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		module, _ := store.repos.Modules.GetModuleByID(body.ID)
		writeJSON(w, http.StatusOK, ModuleDTO{
			ModuleID:    module.ModuleID,
			Name:        module.Name,
			Description: module.Description,
			TopicIDs:    module.TopicIDs,
			CourseID:    module.CourseID,
		})

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if _, err := store.repos.Modules.GetModuleByID(id); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		if err := store.repos.Modules.DeleteModuleByID(id); err != nil { writeError(w, http.StatusInternalServerError, err.Error()); return }
		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
