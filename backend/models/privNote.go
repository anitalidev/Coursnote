package models

type PrivateNote struct {
	PrivateNoteID string `json:"privateNoteID"` // self

	Name        string `json:"name"`
	Description string `json:"description"`
	TopicID     string `json:"topicID"` // owner
}

func newPrivateNote(privNoteID string, name string, desc string, topicID string) *PrivateNote {
	return &PrivateNote{
		PrivateNoteID: privNoteID,
		Name:          name,
		Description:   desc,
		TopicID:       topicID,
	}
}
