package models

type Topic struct {
	TopicID string `json:"topicID"` // self

	Name          string `json:"name"`
	Description   string `json:"description"`
	PrivateNoteID string `json:"privateNoteID"` // owns
	CoursePageID  string `json:"coursePageID"`  // owns
	ModuleID      string `json:"moduleID"`      // owner
}

func newTopic(topicID string, name string, desc string, moduleID string,
	privateNoteID string, coursePageID string) *Topic {
	return &Topic{
		TopicID:       topicID,
		Name:          name,
		Description:   desc,
		ModuleID:      moduleID,
		PrivateNoteID: privateNoteID,
		CoursePageID:  coursePageID,
	}
}
