package models

type CoursePage struct {
	Name         string `json:"name"`
	Description  string `json:"description"`
	CoursePageID string `json:"moduleID"` // self

	TopicID string `json:"courseID"` // owner
}
