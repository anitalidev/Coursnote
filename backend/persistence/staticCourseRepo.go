package persistence

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/anitalidev/Coursnote/backend/models/market"
)

type SQLStaticCourseRepository struct {
	db *sql.DB
}

func NewSQLStaticCourseRepository(db *sql.DB) *SQLStaticCourseRepository {
	return &SQLStaticCourseRepository{db: db}
}

func (r *SQLStaticCourseRepository) GetByID(id string) (*market.StaticCourse, error) {
	sc := &market.StaticCourse{ID: id}
	err := r.db.QueryRow(
		`SELECT course_id, content_id, name, description, left_colour, right_colour, publish_date FROM static_courses WHERE static_course_id = ?`, id,
	).Scan(&sc.CourseID, &sc.ContentID, &sc.Name, &sc.Description, &sc.LeftColour, &sc.RightColour, &sc.PublishDate)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	if err != nil {
		return nil, err
	}
	return sc, nil
}

func (r *SQLStaticCourseRepository) GetPublishDateByID(id string) (time.Time, error) {
	var t time.Time
	err := r.db.QueryRow(
		`SELECT publish_date FROM static_courses WHERE static_course_id = ?`, id,
	).Scan(&t)
	if errors.Is(err, sql.ErrNoRows) {
		return time.Time{}, errors.New("id does not exist")
	}
	if err != nil {
		return time.Time{}, err
	}
	return t, nil
}

func (r *SQLStaticCourseRepository) Create(info *StaticCourseInfo) (*market.StaticCourse, error) {
	res, err := r.db.Exec(
		`INSERT INTO static_courses (course_id, content_id, name, description, left_colour, right_colour, publish_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		info.CourseID, info.ContentID, info.Name, info.Description, info.LeftColour, info.RightColour, info.PublishDate,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &market.StaticCourse{
		ID:          fmt.Sprintf("%d", id),
		CourseID:    info.CourseID,
		ContentID:   info.ContentID,
		Name:        info.Name,
		Description: info.Description,
		LeftColour:  info.LeftColour,
		RightColour: info.RightColour,
		PublishDate: info.PublishDate,
	}, nil
}

func (r *SQLStaticCourseRepository) DeleteByID(id string) error {
	res, err := r.db.Exec(`DELETE FROM static_courses WHERE static_course_id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}

func (r *SQLStaticCourseRepository) GetAllStaticCourse(courseID string) ([]*market.StaticCourse, error) {
	rows, err := r.db.Query(
		`SELECT static_course_id, content_id, name, description, left_colour, right_colour, publish_date FROM static_courses WHERE course_id = ?`, courseID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*market.StaticCourse
	for rows.Next() {
		sc := &market.StaticCourse{CourseID: courseID}
		if err := rows.Scan(&sc.ID, &sc.ContentID, &sc.Name, &sc.Description, &sc.LeftColour, &sc.RightColour, &sc.PublishDate); err != nil {
			return nil, err
		}
		results = append(results, sc)
	}
	if results == nil {
		results = []*market.StaticCourse{}
	}
	return results, rows.Err()
}
