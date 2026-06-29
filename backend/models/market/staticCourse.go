package market

import "time"

type StaticCourse struct {
	ID               string    `json:"id"`       // self
	CourseID         string    `json:"courseId"` // owner
	PublishDate      time.Time `json:"publishDate"`
	PublishedContent string    `json:publishedContent`
}
