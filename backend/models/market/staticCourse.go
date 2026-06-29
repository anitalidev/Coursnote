package market

import (
	"encoding/json"
	"time"
)

type StaticCourse struct {
	ID        string `json:"id"`
	CourseID  string `json:"courseId"`
	ContentID string `json:"contentId"`

	Name        string `json:"name"`
	Description string `json:"description"`
	LeftColour  string `json:"leftColour"`
	RightColour string `json:"rightColour"`

	PublishDate time.Time `json:"publishDate"`
}

type StaticCourseContent struct {
	ID      string          `json:"id"`
	Content json.RawMessage `json:"content"`
}
