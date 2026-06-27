package persistence

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLCoursePageRepository struct {
	db *sql.DB
}

func NewSQLCoursePageRepository(db *sql.DB) *SQLCoursePageRepository {
	return &SQLCoursePageRepository{db: db}
}

func (r *SQLCoursePageRepository) GetCoursePageByID(id string) (*models.CoursePage, error) {
	p := &models.CoursePage{CoursePageID: id}
	err := r.db.QueryRow(`SELECT name, description, topic_id FROM course_pages WHERE course_page_id = ?`, id).
		Scan(&p.Name, &p.Description, &p.TopicID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	return p, err
}

func (r *SQLCoursePageRepository) CreateCoursePage(info *CoursePageInfo) (*models.CoursePage, error) {
	res, err := r.db.Exec(
		`INSERT INTO course_pages (name, description, topic_id) VALUES (?, ?, ?)`,
		info.Name, info.Description, info.TopicID,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.CoursePage{
		CoursePageID: fmt.Sprintf("%d", id),
		Name:         info.Name,
		Description:  info.Description,
		TopicID:      info.TopicID,
	}, nil
}

func (r *SQLCoursePageRepository) UpdateCoursePageDescription(id string, description string) error {
	res, err := r.db.Exec(`UPDATE course_pages SET description = ? WHERE course_page_id = ?`, description, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}

func (r *SQLCoursePageRepository) DeleteCoursePageByID(id string) error {
	res, err := r.db.Exec(`DELETE FROM course_pages WHERE course_page_id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}
