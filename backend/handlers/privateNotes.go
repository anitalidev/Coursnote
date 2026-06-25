package handlers

import "net/http"

type PrivateNoteDTO struct {
	PrivateNoteID string `json:"privateNoteID"`

	Name        string `json:"name"`
	Description string `json:"description"`
	TopicID     string `json:"topicID"`
}

func PrivateNoteHandler(w http.ResponseWriter, r *http.Request) {

}
