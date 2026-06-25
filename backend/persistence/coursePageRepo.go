package persistence

import (
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLCoursePageRepository struct {
	db *DatabaseData
}

func (repo *SQLCoursePageRepository) GetCoursePageByID(id string) (*models.CoursePage, error) {
	page, ok := repo.db.CoursePages[id]
	if !ok {
		return nil, errors.New("id does not exist")
	}
	return page, nil
}

func (repo *SQLCoursePageRepository) CreateCoursePage(info *CoursePageInfo) (*models.CoursePage, error) {
	repo.db.NextCoursePageId++
	id := fmt.Sprintf("%d", repo.db.NextCoursePageId)
	page := &models.CoursePage{
		CoursePageID: id,
		Name:         info.Name,
		Description:  info.Description,
		TopicID:      info.TopicID,
	}
	repo.db.CoursePages[id] = page
	return page, nil
}

func (repo *SQLCoursePageRepository) DeleteCoursePageByID(id string) error {
	if _, ok := repo.db.CoursePages[id]; !ok {
		return errors.New("id does not exist")
	}
	delete(repo.db.CoursePages, id)
	return nil
}

func NewSQLCoursePageRepository(db *DatabaseData) *SQLCoursePageRepository {
	return &SQLCoursePageRepository{db: db}
}
