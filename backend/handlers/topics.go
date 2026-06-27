package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/models/elements"
	"github.com/anitalidev/Coursnote/backend/persistence"
)

type TopicDTO struct {
	TopicID       string          `json:"topicID"`
	Name          string          `json:"name"`
	Description   string          `json:"description"`
	ModuleID      string          `json:"moduleID"`
	PrivateNoteID string          `json:"privateNoteID"`
	CoursePageID  string          `json:"coursePageID"`
	Completed     bool            `json:"completed"`
	RawElements   json.RawMessage `json:"rawElements"`
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
			Completed:     topic.Completed,
			RawElements:   topic.RawElements,
		})

	case http.MethodPost:
		var body struct {
			Name        string `json:"name"`
			Description string `json:"description"`
			ModuleID    string `json:"moduleID"`
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
		})
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		coursePage, err := store.repos.CoursePages.CreateCoursePage(&persistence.CoursePageInfo{
			Name:        body.Name,
			Description: body.Description,
			TopicID:     topic.TopicID,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		privateNote, err := store.repos.PrivateNotes.CreatePrivateNote(&persistence.PrivateNoteInfo{
			Name:        body.Name,
			Description: body.Description,
			TopicID:     topic.TopicID,
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
			Completed:     topic.Completed,
			RawElements:   topic.RawElements,
		})

	case http.MethodPut:
		var body struct {
			ID          string          `json:"id"`
			Name        string          `json:"name"`
			Description string          `json:"description"`
			Completed   *bool           `json:"completed"`
			RawElements json.RawMessage `json:"elements"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" || body.Name == "" {
			writeError(w, http.StatusBadRequest, "id and name required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.Topics.UpdateTopic(body.ID, body.Name, body.Description); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		if body.Completed != nil {
			if err := store.repos.Topics.SetTopicCompleted(body.ID, *body.Completed); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
		}
		if len(body.RawElements) > 0 {
			elems, err := elements.UnmarshalElements(body.RawElements)
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid elements: "+err.Error())
				return
			}
			if err := store.repos.Topics.SaveTopicElements(body.ID, elems); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
		}
		topic, _ := store.repos.Topics.GetTopicByID(body.ID)
		writeJSON(w, http.StatusOK, TopicDTO{
			TopicID:       topic.TopicID,
			Name:          topic.Name,
			Description:   topic.Description,
			ModuleID:      topic.ModuleID,
			PrivateNoteID: topic.PrivateNoteID,
			CoursePageID:  topic.CoursePageID,
			Completed:     topic.Completed,
			RawElements:   topic.RawElements,
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
		cascadeDeleteTopic(id)
		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
