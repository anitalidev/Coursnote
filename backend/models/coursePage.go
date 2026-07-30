package models

import "encoding/json"

// A struct representing a course page. Belongs to a Topic
type CoursePage struct {
	CoursePageID string `json:"coursePageID"` // self
	TopicID      string `json:"topicID"`      // owner

	Name        string          `json:"name"`
	Description string          `json:"description"`
	RawElements json.RawMessage `json:"rawElements"`
}
