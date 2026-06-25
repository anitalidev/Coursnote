package handlers

import "net/http"

type CoursePageDTO struct {
	CoursePageID string `json:"coursePageID"`

	Name        string `json:"name"`
	Description string `json:"description"`
	TopicID     string `json:"topicID"`
}

func CoursePageHandler(w http.ResponseWriter, r *http.Request) {

}
