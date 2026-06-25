package persistence

import (
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLCourseRepository struct {
	db *DatabaseData
}

func (repo *SQLCourseRepository) GetCourseByID(id string) (*models.Course, error) {
	course, ok := repo.db.Courses[id]
	if !ok {
		return nil, errors.New("id does not exist")
	}
	return course, nil
}

func (repo *SQLCourseRepository) CreateCourse(info *CourseInfo) (*models.Course, error) {
	user, ok := repo.db.Users[info.UserID]
	if !ok {
		return nil, errors.New("user id does not exist")
	}
	repo.db.NextCourseId++
	id := fmt.Sprintf("%d", repo.db.NextCourseId)
	course := &models.Course{
		CourseID:    id,
		Name:        info.Name,
		Description: info.Description,
		ModuleIDs:   make([]string, 0),
		UserID:      info.UserID,
	}
	repo.db.Courses[id] = course
	user.CourseIDs = append(user.CourseIDs, id)
	return course, nil
}

func (repo *SQLCourseRepository) DeleteCourseByID(id string) error {
	if _, ok := repo.db.Courses[id]; !ok {
		return errors.New("id does not exist")
	}
	delete(repo.db.Courses, id)
	return nil
}

func NewSQLCourseRepository(db *DatabaseData) *SQLCourseRepository {
	return &SQLCourseRepository{db: db}
}
