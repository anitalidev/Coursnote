package persistence

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/models/elements"
)

type SQLCoursePageRepository struct {
	db *sql.DB
}

func NewSQLCoursePageRepository(db *sql.DB) *SQLCoursePageRepository {
	return &SQLCoursePageRepository{db: db}
}

func (r *SQLCoursePageRepository) GetCoursePageByID(id string) (*models.CoursePage, error) {
	p := &models.CoursePage{CoursePageID: id}
	var rawElements sql.NullString
	err := r.db.QueryRow(`SELECT name, description, topic_id, raw_elements FROM course_pages WHERE course_page_id = ?`, id).
		Scan(&p.Name, &p.Description, &p.TopicID, &rawElements)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	if err != nil {
		return nil, err
	}
	if rawElements.Valid && len(rawElements.String) > 0 {
		p.RawElements = json.RawMessage(rawElements.String)
	}
	return p, nil
}

func (r *SQLCoursePageRepository) CreateCoursePage(info *CoursePageInfo) (*models.CoursePage, error) {
	var rawElements sql.NullString
	if len(info.RawElements) > 0 {
		rawElements = sql.NullString{String: string(info.RawElements), Valid: true}
	}
	res, err := r.db.Exec(
		`INSERT INTO course_pages (name, description, topic_id, raw_elements) VALUES (?, ?, ?, ?)`,
		info.Name, info.Description, info.TopicID, rawElements,
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
		RawElements:  info.RawElements,
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

func (r *SQLCoursePageRepository) SaveCourseElements(id string, elems []elements.Element) error {
	raw, err := elements.MarshalElements(elems)
	if err != nil {
		return fmt.Errorf("serializing elements for course page %s: %w", id, err)
	}
	res, err := r.db.Exec(`UPDATE course_pages SET raw_elements = ? WHERE course_page_id = ?`, string(raw), id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}
