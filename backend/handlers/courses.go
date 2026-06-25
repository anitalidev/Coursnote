package handlers

import "net/http"

type CourseDTO struct {
	CourseID string `json:"courseID"` // self

	Name        string   `json:"name"`
	Description string   `json:"description"`
	ModuleIDs   []string `json:"moduleIDs"` // owns
	UserID      string   `json:"userID"`    // owner
}

func CourseHandler(w http.ResponseWriter, r *http.Request) {

}
