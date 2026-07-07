package models

import "encoding/json"

// TODO: Add "Content" of type Text element (?) or just have it be json.RawMessage

type PrivateNote struct {
	PrivateNoteID string `json:"privateNoteID"` // self

	Name        string          `json:"name"`
	Description json.RawMessage `json:"description"` // (Is actually content)
	TopicID     string          `json:"topicID"`     // owner
}
