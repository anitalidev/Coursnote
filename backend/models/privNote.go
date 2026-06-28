package models

import "encoding/json"

// TODO: Add "Content" of type Text element (?) or just have it be json.RawMessage

type PrivateNote struct {
	PrivateNoteID string `json:"privateNoteID"` // self

	Name        string          `json:"name"`
	Description json.RawMessage `json:"description"` // (Is actually content)
	TopicID     string          `json:"topicID"`     // owner
}

func newPrivateNote(privNoteID string, name string, desc json.RawMessage, topicID string) *PrivateNote {
	return &PrivateNote{
		PrivateNoteID: privNoteID,
		Name:          name,
		Description:   desc,
		TopicID:       topicID,
	}
}
