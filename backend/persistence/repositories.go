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
	// Create initializes a new UserWebSettings record with default values.
	Create() (*models.UserWebSettings, error)
	// GetByID retrieves web settings for the given settings ID.
	GetByID(id string) (*models.UserWebSettings, error)
	// UpdateSettingsByID replaces all colour fields for the given settings ID.
	UpdateSettingsColourByID(id string, c *ColourContent) error
}

type UserRepository interface {
	// GetUserByID retrieves a user by their unique ID.
	GetUserByID(id string) (*models.User, error)
	// GetUsernameByID retrieves only the username for the given user ID.
	GetUsernameByID(id string) (string, error)
	// GetUserByUsername looks up a user by their username.
	GetUserByUsername(username string) (*models.User, error)
	// CreateUser creates a new user record and returns it with its assigned ID.
	CreateUser(user *UserInfo) (*models.User, error)
	// DeleteUserByID removes the user and cascades to owned resources.
	DeleteUserByID(id string) error
	// GetAllUsers returns every user in the system.
	GetAllUsers() ([]*models.User, error)
	// SetAvatarURL updates the stored avatar URL for the given user.
	SetAvatarURL(id string, url string) error
}

type EnrollmentRepository interface {
	// Create enrolls a user in a static course version.
	Create(userID string, staticCourseID string) (*models.CourseEnrollment, error)
	// GetByUserID returns all enrollments for the given user.
	GetByUserID(userID string) ([]*models.CourseEnrollment, error)
	// GetByUserAndCourseID finds the enrollment linking a user to a course (any version).
	GetByUserAndCourseID(userID string, courseID string) (*models.CourseEnrollment, error)
	// GetByUserAndStaticCourseID finds the enrollment for a specific static course version.
	GetByUserAndStaticCourseID(userID string, staticCourseID string) (*models.CourseEnrollment, error)
	// UpdateStaticCourse points an existing enrollment to a different static course version.
	UpdateStaticCourse(enrollmentID string, staticCourseID string) error
	// UpdatePercentageCompleted sets the overall completion percentage for the enrollment, replace per-
	// module progress map, and replaces full-progress snapshot
	UpdateProgress(userID string, staticCourseID string, percentage int,
		moduleProgress map[string]int, progress models.EnrollmentProgress) error
	// Delete removes the enrollment record.
	Delete(enrollmentID string) error
}

type CourseCounts struct {
	NumModules int
	NumTopics  int
}

type CourseRepository interface {
	// GetCourseByID retrieves a course by its unique ID.
	GetCourseByID(id string) (*models.Course, error)
	// GetCoursesByUserID returns all courses owned by the given user.
	GetCoursesByUserID(userID string) ([]*models.Course, error)
	// GetCourseCountsByIDs returns module and topic counts keyed by course ID.
	GetCourseCountsByIDs(ids []string) (map[string]CourseCounts, error)
	// CreateCourse creates a new course record and returns it with its assigned ID.
	CreateCourse(course *CourseInfo) (*models.Course, error)
	// DeleteCourseByID removes the course and cascades to its modules and topics.
	DeleteCourseByID(id string) error
	// UpdateCourse replaces the editable fields of an existing course.
	UpdateCourse(id string, name string, description string, leftColour string, rightColour string,
		StaticCourseID string) error
}

type ModuleRepository interface {
	// GetModuleByID retrieves a module by its unique ID.
	GetModuleByID(id string) (*models.Module, error)
	// GetModulesByCourseID returns all modules belonging to the given course.
	GetModulesByCourseID(courseID string) ([]*models.Module, error)
	// CreateModule creates a new module record and returns it with its assigned ID.
	CreateModule(module *ModuleInfo) (*models.Module, error)
	// DeleteModuleByID removes the module and cascades to its topics.
	DeleteModuleByID(id string) error
	// UpdateModule replaces the name and description of an existing module.
	UpdateModule(id string, name string, description string) error
}

type TopicRepository interface {
	// GetTopicByID retrieves a topic by its unique ID.
	GetTopicByID(id string) (*models.Topic, error)
	// CreateTopic creates a new topic record and returns it with its assigned ID.
	CreateTopic(topic *TopicInfo) (*models.Topic, error)
	// DeleteTopicByID removes the topic and cascades to its course page and private note.
	DeleteTopicByID(id string) error
	// UpdateTopic replaces the name, description, and completion rules of an existing topic.
	UpdateTopic(id string, name string, description string, compRules []models.CompletionRule) error
}

type CoursePageRepository interface {
	// GetCoursePageByID retrieves a course page by its unique ID.
	GetCoursePageByID(id string) (*models.CoursePage, error)
	// CreateCoursePage creates a new course page record and returns it with its assigned ID.
	CreateCoursePage(page *CoursePageInfo) (*models.CoursePage, error)
	// DeleteCoursePageByID removes the course page and its stored elements.
	DeleteCoursePageByID(id string) error
	// UpdateCoursePageDescription replaces the description text of a course page.
	UpdateCoursePageDescription(id string, description string) error
	// SaveCourseElements persists the full element list for the given course page.
	SaveCourseElements(id string, elems []elements.Element) error
}

type StaticCourseRepository interface {
	// GetByID retrieves a published static course snapshot by its unique ID.
	GetByID(id string) (*market.StaticCourse, error)
	// GetByIDs retrieves multiple static course snapshots in one query.
	GetByIDs(ids []string) ([]*market.StaticCourse, error)
	// GetByContentID finds the static course associated with the given static content record.
	GetByContentID(contentID string) (*market.StaticCourse, error)
	// GetPublishDateByID returns the publish timestamp for a single static course.
	GetPublishDateByID(id string) (time.Time, error)
	// GetPublishDatesByIDs returns publish timestamps keyed by static course ID.
	GetPublishDatesByIDs(ids []string) (map[string]time.Time, error)
	// Create publishes a new static course snapshot and returns it with its assigned ID.
	Create(info *StaticCourseInfo) (*market.StaticCourse, error)
	// DeleteByID removes the static course snapshot and its associated static content.
	DeleteByID(id string) error
	// GetAllActiveStaticCourses returns every static course currently marked active.
	GetAllActiveStaticCourses() ([]*market.StaticCourse, error)
	// GetVersionsByCourseID returns all published snapshots for the given course.
	GetVersionsByCourseID(courseID string) ([]*market.StaticCourse, error)
	// SetActive marks a static course as active or inactive in the marketplace.
	SetActive(id string, active bool) error
}

type StaticContentRepository interface {
	// GetByID retrieves the published course content blob by its unique ID.
	GetByID(id string) (*market.StaticCourseContent, error)
	// Create stores a new published content blob and returns it with its assigned ID.
	Create(info *StaticContentInfo) (*market.StaticCourseContent, error)
	// DeleteByID removes the static content blob.
	DeleteByID(id string) error
}

type PrivateNoteRepository interface {
	// GetPrivateNoteByID retrieves a private note by its unique ID.
	GetPrivateNoteByID(id string) (*models.PrivateNote, error)
	// CreatePrivateNote creates a new private note record and returns it with its assigned ID.
	CreatePrivateNote(note *PrivateNoteInfo) (*models.PrivateNote, error)
	// DeletePrivateNoteByID removes the private note record.
	DeletePrivateNoteByID(id string) error
	// UpdatePrivateNoteDescription replaces the JSON description body of a private note.
	UpdatePrivateNoteDescription(id string, description json.RawMessage) error
}
