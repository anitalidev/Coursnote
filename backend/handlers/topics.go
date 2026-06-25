package handlers

import "net/http"

type TopicDTO struct {
	TopicID string `json:"topicID"`

	Name          string `json:"name"`
	Description   string `json:"description"`
	ModuleID      string `json:"moduleID"`
	PrivateNoteID string `json:"privateNoteID"`
	CoursePageID  string `json:"coursePageID"`
}

func TopicHandler(w http.ResponseWriter, r *http.Request) {

}
