package models

import (
	"encoding/json"

	"github.com/anitalidev/Coursnote/backend/models/elements"
)

// A struct representing a topic. Belongs to a module and contains a Private Note,
// a Course Page, and other topic details
type Topic struct {
	TopicID       string `json:"topicID"`       // self
	ModuleID      string `json:"moduleID"`      // owner
	PrivateNoteID string `json:"privateNoteID"` // owns
	CoursePageID  string `json:"coursePageID"`  // owns

	Name        string             `json:"name"`
	Description string             `json:"description"`
	Elements    []elements.Element `json:"-"`
	CompRules   []CompletionRule   `json:"compTypes"` // REQUIRES: at least one completion rule. Default manual if none
	// TODO ^ scary requirement
}
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
