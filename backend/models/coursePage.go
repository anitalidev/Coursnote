package models

import "encoding/json"

type CoursePage struct {
	CoursePageID string `json:"coursePageID"` // self

	Name        string          `json:"name"`
	Description string          `json:"description"`
	TopicID     string          `json:"topicID"` // owner
	RawElements json.RawMessage `json:"rawElements"`
}
