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
		`SELECT course_id, created_at, published_content FROM static_courses WHERE static_course_id = ?`, id,
	).Scan(&sc.CourseID, &sc.PublishDate, &sc.PublishedContent)
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
		`SELECT created_at FROM static_courses WHERE static_course_id = ?`, id,
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
		`INSERT INTO static_courses (course_id, published_content) VALUES (?, ?)`,
		info.CourseID, info.PublishedContent,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &market.StaticCourse{
		ID:               fmt.Sprintf("%d", id),
		CourseID:         info.CourseID,
		PublishDate:      info.PublishDate,
		PublishedContent: info.PublishedContent,
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
