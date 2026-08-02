package handlers

import (
	"encoding/json"
	"net/http"
)

// DTO format that will be sent to frontend to represent a private note
type PrivateNoteDTO struct {
	PrivateNoteID string          `json:"privateNoteID"`
	Name          string          `json:"name"`
	Description   json.RawMessage `json:"description"`
	TopicID       string          `json:"topicID"`
}

// HTTP Request Handlers

// OVERALL: GET a private note by ID
// QPARAM: id (non-empty)
// BADREQ: if id query param is missing/empty
// NOTFND: if no private note with that id exists
// WRITES: JSON representing a single PrivateNoteDTO
func GetPrivateNote(w http.ResponseWriter, r *http.Request) {
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
		Description:   note.Content,
		TopicID:       note.TopicID,
	})
}

// OVERALL: PUT (update) a private note's content
// RQBODY: id (required); description (optional — TipTap JSON doc)
// BADREQ: if id is missing
// NOTFND: if no private note with that id exists
// WRITES: JSON representing the full updated PrivateNoteDTO
func PutPrivateNote(w http.ResponseWriter, r *http.Request) {
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
	// Re-fetch to return the full up-to-date note
	note, _ := store.repos.PrivateNotes.GetPrivateNoteByID(body.ID)
	writeJSON(w, http.StatusOK, PrivateNoteDTO{
		PrivateNoteID: note.PrivateNoteID,
		Name:          note.Name,
		Description:   note.Content,
		TopicID:       note.TopicID,
	})
}

// OVERALL: DELETE a private note by ID
// QPARAM: id (non-empty)
// BADREQ: if id query param is missing/empty
// NOTFND: if no private note with that id exists
func DeletePrivateNote(w http.ResponseWriter, r *http.Request) {
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
}
