package models

import (
	"encoding/json"

	"github.com/anitalidev/Coursnote/backend/models/elements"
)

type CompletionRule struct {
	Type   CompletionRuleType `json:"type"`
	Config json.RawMessage    `json:"config"`
}

type CompletionRuleType string

const (
	RuleTimed                CompletionRuleType = "timed"
	RuleSelfReported         CompletionRuleType = "self_reported"
	RuleReadToBottom         CompletionRuleType = "read_to_bottom"
	RuleAnsweredAllQuestions CompletionRuleType = "percentage_questions_correct"
)

type Topic struct {
	TopicID string `json:"topicID"` // self

	Name          string             `json:"name"`
	Description   string             `json:"description"`
	PrivateNoteID string             `json:"privateNoteID"` // owns
	CoursePageID  string             `json:"coursePageID"`  // owns
	ModuleID      string             `json:"moduleID"`      // owner
	Elements      []elements.Element `json:"-"`
	RawElements   json.RawMessage    `json:"rawElements"`
	CompRules     []CompletionRule   `json:"compTypes"`
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
