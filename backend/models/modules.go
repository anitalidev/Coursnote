package models

type Module struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	ModuleID    string   `json:"moduleID"` // self
	TopicIDs    []string `json:"topicIDs"` // owns

	CourseID string `json:"courseID"` // owner
}
