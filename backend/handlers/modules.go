package handlers

import "net/http"

type ModuleDTO struct {
	ModuleID string `json:"moduleID"`

	Name        string   `json:"name"`
	Description string   `json:"description"`
	TopicIDs    []string `json:"topicIDs"`
	CourseID    string   `json:"courseID"`
}

func ModuleHandler(w http.ResponseWriter, r *http.Request) {

}
