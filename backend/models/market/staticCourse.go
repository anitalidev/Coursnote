package market

import (
	"encoding/json"
	"time"
)

// Belongs/owned by a course, but the course may not record it's presence
type StaticCourse struct {
	ID        string `json:"id"`        // self
	CourseID  string `json:"courseId"`  // "owner"
	ContentID string `json:"contentId"` // owns

	Name        string `json:"name"`
	Description string `json:"description"`
	LeftColour  string `json:"leftColour"`
	RightColour string `json:"rightColour"`
	NumModules  int    `json:"numModules"`
	NumTopics   int    `json:"numTopics"`
	CourseOwner string `json:"courseOwner"`

	PublishDate time.Time `json:"publishDate"`
	IsActive    bool      `json:"isActive"`
}

type StaticCourseContent struct {
	ID      string          `json:"id"`
	Content json.RawMessage `json:"content"`
}
