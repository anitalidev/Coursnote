package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/persistence"
)

type TopicDTO struct {
	TopicID       string `json:"topicID"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	ModuleID      string `json:"moduleID"`
	PrivateNoteID string `json:"privateNoteID"`
	CoursePageID  string `json:"coursePageID"`
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

		// CoursePage and PrivateNote are created alongside the topic since they have no independent existence
		coursePage, err := store.repos.CoursePages.CreateCoursePage(&persistence.CoursePageInfo{
			Name:        body.Name,
			Description: body.Description,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		privateNote, err := store.repos.PrivateNotes.CreatePrivateNote(&persistence.PrivateNoteInfo{
			Name:        body.Name,
			Description: body.Description,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		topic, err := store.repos.Topics.CreateTopic(&persistence.TopicInfo{
			Name:          body.Name,
			Description:   body.Description,
			ModuleID:      body.ModuleID,
			CoursePageID:  coursePage.CoursePageID,
			PrivateNoteID: privateNote.PrivateNoteID,
		})
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, TopicDTO{
			TopicID:       topic.TopicID,
			Name:          topic.Name,
			Description:   topic.Description,
			ModuleID:      topic.ModuleID,
			PrivateNoteID: topic.PrivateNoteID,
			CoursePageID:  topic.CoursePageID,
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

		if err := store.repos.Topics.UpdateTopic(body.ID, body.Name, body.Description); err != nil {
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
