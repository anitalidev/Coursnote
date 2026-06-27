package persistence

import (
	"encoding/json"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/models/elements"
)

// Calls to any non-repo-creation MUST hold lock when calling.

// General information:
// GETTERS: Get the info... that's about it
// SETTERS/SAVERS: Update nextID (ie. increment it), creates/saves ___ to database, then returns it
//                 ^ careful of duplicate ids because of this
// DELTERS: Delete from database, and will cascade delete things contained by it
//          (eg. pages delete their page versions)

// Types to help pass creation info

type UserInfo struct {
	Username string
}

type CourseInfo struct {
	Name        string
	Description string
	UserID      string
}

type ModuleInfo struct {
	Name        string
	Description string
	CourseID    string
}

type TopicInfo struct {
	Name          string
	Description   string
	ModuleID      string
	PrivateNoteID string
	CoursePageID  string
	RawElements   json.RawMessage
}

type CoursePageInfo struct {
	Name        string
	Description string
	TopicID     string
}

type PrivateNoteInfo struct {
	Name        string
	Description string
	TopicID     string
}

type UserRepository interface {
	GetUserByID(id string) (*models.User, error)
	GetUserByUsername(username string) (*models.User, error)
	CreateUser(user *UserInfo) (*models.User, error)
	DeleteUserByID(id string) error
	GetAllUsers() ([]*models.User, error)
}

type CourseRepository interface {
	GetCourseByID(id string) (*models.Course, error)
	CreateCourse(course *CourseInfo) (*models.Course, error)
	DeleteCourseByID(id string) error
	UpdateCourse(id string, name string, description string) error
}

type ModuleRepository interface {
	GetModuleByID(id string) (*models.Module, error)
	CreateModule(module *ModuleInfo) (*models.Module, error)
	DeleteModuleByID(id string) error
	UpdateModule(id string, name string, description string) error
}

type TopicRepository interface {
	GetTopicByID(id string) (*models.Topic, error)
	CreateTopic(topic *TopicInfo) (*models.Topic, error)
	DeleteTopicByID(id string) error
	UpdateTopic(id string, name string, description string) error
	SaveTopicElements(id string, elems []elements.Element) error
}

type CoursePageRepository interface {
	GetCoursePageByID(id string) (*models.CoursePage, error)
	CreateCoursePage(page *CoursePageInfo) (*models.CoursePage, error)
	DeleteCoursePageByID(id string) error
	UpdateCoursePageDescription(id string, description string) error
}

type PrivateNoteRepository interface {
	GetPrivateNoteByID(id string) (*models.PrivateNote, error)
	CreatePrivateNote(note *PrivateNoteInfo) (*models.PrivateNote, error)
	DeletePrivateNoteByID(id string) error
	UpdatePrivateNoteDescription(id string, description string) error
}
