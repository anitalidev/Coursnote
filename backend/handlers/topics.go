package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/persistence"
)

type TopicDTO struct {
	TopicID       string                  `json:"topicID"`
	Name          string                  `json:"name"`
	Description   string                  `json:"description"`
	ModuleID      string                  `json:"moduleID"`
	PrivateNoteID string                  `json:"privateNoteID"`
	CoursePageID  string                  `json:"coursePageID"`
	CompRules     []models.CompletionRule `json:"compTypes"`
}

func TopicHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.RLock()
		defer store.mu.RUnlock()

		topic, err := store.repos.Topics.GetTopicByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, TopicDTO{
			TopicID:       topic.TopicID,
			Name:          topic.Name,
			Description:   topic.Description,
			ModuleID:      topic.ModuleID,
			PrivateNoteID: topic.PrivateNoteID,
			CoursePageID:  topic.CoursePageID,
			CompRules:     topic.CompRules,
		})

	case http.MethodPost:
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
		store.mu.Lock()
		defer store.mu.Unlock()

		// Topic must be created first so course_page and private_note can reference its ID via FK
		topic, err := store.repos.Topics.CreateTopic(&persistence.TopicInfo{
			Name:        body.Name,
			Description: body.Description,
			ModuleID:    body.ModuleID,
			CompRules:   body.CompRules,
		})
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		coursePage, err := store.repos.CoursePages.CreateCoursePage(&persistence.CoursePageInfo{
			Name:    body.Name,
			TopicID: topic.TopicID,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		privateNote, err := store.repos.PrivateNotes.CreatePrivateNote(&persistence.PrivateNoteInfo{
			Name:        body.Name,
			TopicID:     topic.TopicID,
			Description: json.RawMessage(`{ "type": "doc", "content": [] }`),
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
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
		})

	case http.MethodPut:
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
		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.Topics.UpdateTopic(body.ID, body.Name, body.Description, body.CompRules); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}

		topic, _ := store.repos.Topics.GetTopicByID(body.ID)
		writeJSON(w, http.StatusOK, TopicDTO{
			TopicID:       topic.TopicID,
			Name:          topic.Name,
			Description:   topic.Description,
			ModuleID:      topic.ModuleID,
			PrivateNoteID: topic.PrivateNoteID,
			CoursePageID:  topic.CoursePageID,
			CompRules:     topic.CompRules,
		})

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if _, err := store.repos.Topics.GetTopicByID(id); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		if err := store.repos.Topics.DeleteTopicByID(id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
