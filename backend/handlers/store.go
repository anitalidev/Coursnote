package handlers

import (
	"database/sql"
	"sync"

	"github.com/anitalidev/Coursnote/backend/persistence"
)

type repositories struct {
	Users          persistence.UserRepository
	Enrollments    persistence.EnrollmentRepository
	Courses        persistence.CourseRepository
	Modules        persistence.ModuleRepository
	Topics         persistence.TopicRepository
	CoursePages    persistence.CoursePageRepository
	PrivateNotes   persistence.PrivateNoteRepository
	StaticCourses  persistence.StaticCourseRepository
	StaticContents persistence.StaticContentRepository
}

type Store struct {
	repos repositories
	mu    sync.RWMutex
}

func newStore(db *sql.DB) *Store {
	return &Store{
		repos: repositories{
			Users:          persistence.NewSQLUserRepository(db),
			Enrollments:    persistence.NewSQLEnrollmentRepository(db),
			Courses:        persistence.NewSQLCourseRepository(db),
			Modules:        persistence.NewSQLModuleRepository(db),
			Topics:         persistence.NewSQLTopicRepository(db),
			CoursePages:    persistence.NewSQLCoursePageRepository(db),
			PrivateNotes:   persistence.NewSQLPrivateNoteRepository(db),
			StaticCourses:  persistence.NewSQLStaticCourseRepository(db),
			StaticContents: persistence.NewSQLStaticContentRepository(db),
		},
	}
}

var store *Store

func InitStore(db *sql.DB) {
	store = newStore(db)
}
