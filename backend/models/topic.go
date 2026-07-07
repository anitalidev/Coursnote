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
	CompRules     []CompletionRule   `json:"compTypes"`
}
