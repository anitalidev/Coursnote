package handlers

import (
	"sync"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/persistence"
)

type repositories struct {
	Users        persistence.UserRepository
	Courses      persistence.CourseRepository
	Modules      persistence.ModuleRepository
	Topics       persistence.TopicRepository
	CoursePages  persistence.CoursePageRepository
	PrivateNotes persistence.PrivateNoteRepository
}

type Store struct {
	repos repositories
	mu    sync.RWMutex
}

func newStore(db *persistence.DatabaseData) *Store {
	return &Store{
		repos: repositories{
			Users:        persistence.NewSQLUserRepository(db),
			Courses:      persistence.NewSQLCourseRepository(db),
			Modules:      persistence.NewSQLModuleRepository(db),
			Topics:       persistence.NewSQLTopicRepository(db),
			CoursePages:  persistence.NewSQLCoursePageRepository(db),
			PrivateNotes: persistence.NewSQLPrivateNoteRepository(db),
		},
	}
}

var store = newStore(&persistence.DatabaseData{
	Users:        make(map[string]*models.User),
	Courses:      make(map[string]*models.Course),
	Modules:      make(map[string]*models.Module),
	Topics:       make(map[string]*models.Topic),
	CoursePages:  make(map[string]*models.CoursePage),
	PrivateNotes: make(map[string]*models.PrivateNote),
})
