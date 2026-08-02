package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/persistence"
)

// DTO format that will be sent to frontend to represent a topic
type TopicDTO struct {
	TopicID       string                  `json:"topicID"`
	Name          string                  `json:"name"`
	Description   string                  `json:"description"`
	ModuleID      string                  `json:"moduleID"`
	PrivateNoteID string                  `json:"privateNoteID"`
	CoursePageID  string                  `json:"coursePageID"`
	CompRules     []models.CompletionRule `json:"compTypes"`
	// field derived from handlers (ensureCompRules(...) helper function)
	Warning string `json:"warning,omitempty"`
}

// HTTP Request Handlers

// OVERALL: GET a topic by ID
// QPARAM: id (non-empty)
// BADREQ: if id query parameter doesn't exist/empty
// NOTFND: if no topic with that id exists
// WRITES: JSON representing a single TopicDTO
func GetTopic(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}

	// Find topic in DB
	topic, err := store.repos.Topics.GetTopicByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, TopicDTO{
		TopicID: topic.TopicID, Name: topic.Name, Description: topic.Description, ModuleID: topic.ModuleID,
		PrivateNoteID: topic.PrivateNoteID, CoursePageID: topic.CoursePageID, CompRules: topic.CompRules,
	})
}

// OVERALL: POST (create) a topic inside a module
// RQBODY: name, moduleID (required); description, compRules (optional)
// BADREQ: if name or moduleID is missing, or moduleID does not exist
// SERVER: if an internal error occurs creating the auto-generated CoursePage or PrivateNote
// WRITES: JSON representing a single TopicDTO (of the newly created topic)
func PostTopic(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string                  `json:"name"`
		Description string                  `json:"description"`
		ModuleID    string                  `json:"moduleID"`
		CompRules   []models.CompletionRule `json:"compRules"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" || body.ModuleID == "" {
		writeError(w, http.StatusBadRequest, "name and moduleID required")
		return
	}

	// Guarantee at least one completion rule exists (defaults to self_reported)
	compRules, warn := ensureCompRules(body.CompRules)

	// Topic must be created first so CoursePage and PrivateNote can reference its ID via FK
	topic, err := store.repos.Topics.CreateTopic(&persistence.TopicInfo{
		Name:        body.Name,
		Description: body.Description,
		ModuleID:    body.ModuleID,
		CompRules:   compRules,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Auto-create the shared CoursePage for this topic
	coursePage, err := store.repos.CoursePages.CreateCoursePage(&persistence.CoursePageInfo{
		Name:    body.Name,
		TopicID: topic.TopicID,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Auto-create the PrivateNote for this topic (empty TipTap doc as initial content)
	privateNote, err := store.repos.PrivateNotes.CreatePrivateNote(&persistence.PrivateNoteInfo{
		Name:        body.Name,
		TopicID:     topic.TopicID,
		Description: json.RawMessage(`{ "type": "doc", "content": [] }`),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Patch in the IDs that were only available after creation
	topic.CoursePageID = coursePage.CoursePageID
	topic.PrivateNoteID = privateNote.PrivateNoteID
	writeJSON(w, http.StatusCreated, TopicDTO{
		TopicID:       topic.TopicID,
		Name:          topic.Name,
		Description:   topic.Description,
		ModuleID:      topic.ModuleID,
		PrivateNoteID: topic.PrivateNoteID,
		CoursePageID:  topic.CoursePageID,
		CompRules:     topic.CompRules,
		Warning:       warn,
	})
}

// OVERALL: PUT (update) a topic's name, description, and/or completion rules
// RQBODY: id, name (required); description, compRules (optional)
// BADREQ: if id or name is missing, or description exceeds 100 characters
// NOTFND: if no topic with that id exists
// SERVER: if a DB or serialization error occurs during update
// WRITES: JSON representing the full updated TopicDTO
func PutTopic(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID          string                  `json:"id"`
		Name        string                  `json:"name"`
		Description string                  `json:"description"`
		CompRules   []models.CompletionRule `json:"compRules"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" || body.Name == "" {
		writeError(w, http.StatusBadRequest, "id and name required")
		return
	}
	if len([]rune(body.Description)) > 100 {
		writeError(w, http.StatusBadRequest, "description must be 100 characters or fewer")
		return
	}

	// Guarantee at least one completion rule exists (defaults to self_reported)
	compRules, warn := ensureCompRules(body.CompRules)

	if err := store.repos.Topics.UpdateTopic(body.ID, body.Name, body.Description, compRules); err != nil {
		if errors.Is(err, persistence.ErrNotFound) {
			writeError(w, http.StatusNotFound, "topic not found")
		} else {
			writeError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	// Re-fetch to return the full up-to-date topic (includes coursePageID, privateNoteID, etc.)
	topic, _ := store.repos.Topics.GetTopicByID(body.ID)
	writeJSON(w, http.StatusOK, TopicDTO{
		TopicID: topic.TopicID, Name: topic.Name, Description: topic.Description, ModuleID: topic.ModuleID,
		PrivateNoteID: topic.PrivateNoteID, CoursePageID: topic.CoursePageID, CompRules: topic.CompRules, Warning: warn,
	})
}

// OVERALL: DELETE a topic and cascade-delete its CoursePage and PrivateNote
// QPARAM: id (non-empty)
// BADREQ: if id query parameter doesn't exist/empty
// NOTFND: if no topic with that id exists
// SERVER: if an internal error occurs during deletion
func DeleteTopic(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}

	// Confirm the topic exists before attempting deletion
	if _, err := store.repos.Topics.GetTopicByID(id); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	// Delete topic (cascade-deletes CoursePage and PrivateNote via FK)
	if err := store.repos.Topics.DeleteTopicByID(id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Helper Functions

// Checks that a list of completion rules contains at least one rule. If it doesn't, it default adds manual completion as the only rule
// Fallback in case frontend sends wrong.
func ensureCompRules(rules []models.CompletionRule) ([]models.CompletionRule, string) {
	if len(rules) == 0 {
		return []models.CompletionRule{{Type: models.RuleSelfReported}}, "No completion rules provided; manual completion was set automatically."
	}
	return rules, ""
}
