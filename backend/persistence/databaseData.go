package persistence

import "github.com/anitalidev/Coursnote/backend/models"

type DatabaseData struct {
	Users        map[string]*models.User        `json:"users"`
	Courses      map[string]*models.Course      `json:"courses"`
	Modules      map[string]*models.Module      `json:"modules"`
	Topics       map[string]*models.Topic       `json:"topics"`
	CoursePages  map[string]*models.CoursePage  `json:"coursePages"`
	PrivateNotes map[string]*models.PrivateNote `json:"privateNotes"`

	NextUserId        int `json:"nextUserId"`
	NextCourseId      int `json:"nextCourseId"`
	NextModuleId      int `json:"nextModuleId"`
	NextTopicId       int `json:"nextTopicId"`
	NextCoursePageId  int `json:"nextCoursePageId"`
	NextPrivateNoteId int `json:"nextPrivateNoteID"`
	NextElementId     int `json:"nextElementID"`
}
