package models

type CoursePage struct {
	CoursePageID string `json:"coursePageID"` // self

	Name        string `json:"name"`
	Description string `json:"description"`
	TopicID     string `json:"topicID"` // owner
}

func newCoursePage(coursePageID string, name string, desc string, topicID string) *CoursePage {
	return &CoursePage{
		CoursePageID: coursePageID,
		Name:         name,
		Description:  desc,
		TopicID:      topicID,
	}
}
