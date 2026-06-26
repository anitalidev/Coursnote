package models

import (
	"encoding/json"

	"github.com/anitalidev/Coursnote/backend/models/elements"
)

type Topic struct {
	TopicID string `json:"topicID"` // self

	Name          string `json:"name"`
	Description   string `json:"description"`
	PrivateNoteID string `json:"privateNoteID"` // owns
	CoursePageID  string `json:"coursePageID"`  // owns
	ModuleID      string `json:"moduleID"`      // owner

	Elements    []elements.Element `json:"-"`
	RawElements json.RawMessage    `json:"rawElements"`
}

func newTopic(topicID string, name string, desc string, moduleID string,
	privateNoteID string, coursePageID string, elementsJSON json.RawMessage) *Topic {
	return &Topic{
		TopicID:       topicID,
		Name:          name,
		Description:   desc,
		ModuleID:      moduleID,
		PrivateNoteID: privateNoteID,
		CoursePageID:  coursePageID,
		RawElements:   elementsJSON,
	}
}
