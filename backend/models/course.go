package models

type Course struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	CourseID    string   `json:"courseID"`  // self
	ModuleIDs   []string `json:"moduleIDs"` // owns
	UserID      string   `json:"userID"`    // owner
}
