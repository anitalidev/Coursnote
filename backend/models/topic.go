package models

type Topic struct {
	Name          string `json:"name"`
	Description   string `json:"description"`
	CourseID      string `json:"courseID"`      // self
	PrivateNoteID string `json:"privateNoteID"` // owns
	CoursePageID  string `json:"coursePageID"`  // owns

	UserID string `json:"userID"` // owner
}
