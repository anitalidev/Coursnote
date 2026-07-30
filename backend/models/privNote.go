package models

import "encoding/json"

// A struct representing a private note. Belongs to a Topic
type PrivateNote struct {
	PrivateNoteID string `json:"privateNoteID"` // self
	TopicID       string `json:"topicID"`       // owner

	Name    string          `json:"name"`
	Content json.RawMessage `json:"content"` // (Is actually content)
}
