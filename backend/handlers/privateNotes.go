package handlers

import (
	"encoding/json"
	"net/http"
)

type PrivateNoteDTO struct {
	PrivateNoteID string          `json:"privateNoteID"`
	Name          string          `json:"name"`
	Description   json.RawMessage `json:"description"`
	TopicID       string          `json:"topicID"`
}

func PrivateNoteHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.RLock()
		defer store.mu.RUnlock()

		note, err := store.repos.PrivateNotes.GetPrivateNoteByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, PrivateNoteDTO{
			PrivateNoteID: note.PrivateNoteID,
			Name:          note.Name,
			Description:   note.Description,
			TopicID:       note.TopicID,
		})

	case http.MethodPut:
		var body struct {
			ID          string          `json:"id"`
			Description json.RawMessage `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" {
			writeError(w, http.StatusBadRequest, "id required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.PrivateNotes.UpdatePrivateNoteDescription(body.ID, body.Description); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		note, _ := store.repos.PrivateNotes.GetPrivateNoteByID(body.ID)
		writeJSON(w, http.StatusOK, PrivateNoteDTO{
			PrivateNoteID: note.PrivateNoteID,
			Name:          note.Name,
			Description:   note.Description,
			TopicID:       note.TopicID,
		})

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.PrivateNotes.DeletePrivateNoteByID(id); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
