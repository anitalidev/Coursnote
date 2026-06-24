package models

type PrivateNote struct {
	Name          string `json:"name"`
	Description   string `json:"description"`
	PrivateNoteID string `json:"moduleID"` // self

	TopicID string `json:"courseID"` // owner
}
