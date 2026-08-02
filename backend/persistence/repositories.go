package persistence

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/models/elements"
	"github.com/anitalidev/Coursnote/backend/models/market"
)

// ErrNotFound is returned by repos when a record with the given ID does not exist.
var ErrNotFound = errors.New("not found")

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

type StaticCourseInfo struct {
	CourseID  string
	ContentID string

	Name        string
	Description string
	LeftColour  string
	RightColour string
	NumModules  int
	NumTopics   int
	CourseOwner string

	PublishDate time.Time
	IsActive    bool
}

type StaticContentInfo struct {
	PublishedContent string
}
type CourseInfo struct {
	Name           string
	Description    string
	UserID         string
	LeftColour     string
	RightColour    string
	StaticCourseID string
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
	CompRules     []models.CompletionRule
}

type CoursePageInfo struct {
	Name        string
	Description string
	TopicID     string
	RawElements json.RawMessage
}

type PrivateNoteInfo struct {
	Name        string
	Description json.RawMessage
	TopicID     string
}

type SettingsRepository interface {
	Create() (*models.UserWebSettings, error)
	GetByID(id string) (*models.UserWebSettings, error)
	UpdateSettingsByID(id string, backgroundColour string, primaryColour string, gradientColour string, navColour string, cardColour string, textColour string, accentColour string, secondaryTextColour string) error
}

type UserRepository interface {
	GetUserByID(id string) (*models.User, error)
	GetUsernameByID(id string) (string, error)
	GetUserByUsername(username string) (*models.User, error)
	CreateUser(user *UserInfo) (*models.User, error)
	DeleteUserByID(id string) error
	GetAllUsers() ([]*models.User, error)
	SetAvatarURL(id string, url string) error
}

type EnrollmentRepository interface {
	Create(userID string, staticCourseID string) (*models.CourseEnrollment, error)
	GetByUserID(userID string) ([]*models.CourseEnrollment, error)
	GetByUserAndCourseID(userID string, courseID string) (*models.CourseEnrollment, error)
	GetByUserAndStaticCourseID(userID string, staticCourseID string) (*models.CourseEnrollment, error)
	UpdateStaticCourse(enrollmentID string, staticCourseID string) error
	UpdatePercentageCompleted(userID string, staticCourseID string, percentage int) error
	UpdateModuleProgress(userID string, staticCourseID string, moduleProgress map[string]int) error
	UpdateProgress(userID string, staticCourseID string, progress models.EnrollmentProgress) error
	Delete(enrollmentID string) error
}

type CourseCounts struct {
	NumModules int
	NumTopics  int
}

type CourseRepository interface {
	GetCourseByID(id string) (*models.Course, error)
	GetCoursesByUserID(userID string) ([]*models.Course, error)
	GetCourseCountsByIDs(ids []string) (map[string]CourseCounts, error)
	CreateCourse(course *CourseInfo) (*models.Course, error)
	DeleteCourseByID(id string) error
	UpdateCourse(id string, name string, description string, leftColour string, rightColour string,
		StaticCourseID string) error
}

type ModuleRepository interface {
	GetModuleByID(id string) (*models.Module, error)
	GetModulesByCourseID(courseID string) ([]*models.Module, error)
	CreateModule(module *ModuleInfo) (*models.Module, error)
	DeleteModuleByID(id string) error
	UpdateModule(id string, name string, description string) error
}

type TopicRepository interface {
	GetTopicByID(id string) (*models.Topic, error)
	CreateTopic(topic *TopicInfo) (*models.Topic, error)
	DeleteTopicByID(id string) error
	UpdateTopic(id string, name string, description string, compRules []models.CompletionRule) error
}

type CoursePageRepository interface {
	GetCoursePageByID(id string) (*models.CoursePage, error)
	CreateCoursePage(page *CoursePageInfo) (*models.CoursePage, error)
	DeleteCoursePageByID(id string) error
	UpdateCoursePageDescription(id string, description string) error
	SaveCourseElements(id string, elems []elements.Element) error
}

type StaticCourseRepository interface {
	GetByID(id string) (*market.StaticCourse, error)
	GetByIDs(ids []string) ([]*market.StaticCourse, error)
	GetByContentID(contentID string) (*market.StaticCourse, error)
	GetPublishDateByID(id string) (time.Time, error)
	Create(info *StaticCourseInfo) (*market.StaticCourse, error)
	DeleteByID(id string) error
	GetAllActiveStaticCourses() ([]*market.StaticCourse, error)
	GetVersionsByCourseID(courseID string) ([]*market.StaticCourse, error)
	SetActive(id string, active bool) error
}

type StaticContentRepository interface {
	GetByID(id string) (*market.StaticCourseContent, error)
	Create(info *StaticContentInfo) (*market.StaticCourseContent, error)
	DeleteByID(id string) error
}

type PrivateNoteRepository interface {
	GetPrivateNoteByID(id string) (*models.PrivateNote, error)
	CreatePrivateNote(note *PrivateNoteInfo) (*models.PrivateNote, error)
	DeletePrivateNoteByID(id string) error
	UpdatePrivateNoteDescription(id string, description json.RawMessage) error
}
