package persistence

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
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
		`SELECT course_id, content_id, name, description, left_colour, right_colour, num_modules, num_topics, course_owner, publish_date, is_active FROM static_courses WHERE static_course_id = ?`, id,
	).Scan(&sc.CourseID, &sc.ContentID, &sc.Name, &sc.Description, &sc.LeftColour, &sc.RightColour, &sc.NumModules, &sc.NumTopics, &sc.CourseOwner, &sc.PublishDate, &sc.IsActive)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	if err != nil {
		return nil, err
	}
	return sc, nil
}

// GetByIDs fetches multiple static courses in a single query. Returns only
// the courses that exist; order is not guaranteed.
func (r *SQLStaticCourseRepository) GetByIDs(ids []string) ([]*market.StaticCourse, error) {
	if len(ids) == 0 {
		return []*market.StaticCourse{}, nil
	}
	placeholders := strings.Repeat("?,", len(ids))
	placeholders = placeholders[:len(placeholders)-1]
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	rows, err := r.db.Query(
		`SELECT static_course_id, course_id, content_id, name, description, left_colour, right_colour, num_modules, num_topics, course_owner, publish_date, is_active FROM static_courses WHERE static_course_id IN (`+placeholders+`)`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []*market.StaticCourse
	for rows.Next() {
		sc := &market.StaticCourse{}
		if err := rows.Scan(&sc.ID, &sc.CourseID, &sc.ContentID, &sc.Name, &sc.Description, &sc.LeftColour, &sc.RightColour, &sc.NumModules, &sc.NumTopics, &sc.CourseOwner, &sc.PublishDate, &sc.IsActive); err != nil {
			return nil, err
		}
		results = append(results, sc)
	}
	if results == nil {
		results = []*market.StaticCourse{}
	}
	return results, rows.Err()
}

// GetByContentID returns the static course owning the given content blob
// (one-to-one), or nil if none exists.
func (r *SQLStaticCourseRepository) GetByContentID(contentID string) (*market.StaticCourse, error) {
	sc := &market.StaticCourse{ContentID: contentID}
	err := r.db.QueryRow(
		`SELECT static_course_id, course_id, name, description, left_colour, right_colour, num_modules, num_topics, course_owner, publish_date, is_active FROM static_courses WHERE content_id = ?`, contentID,
	).Scan(&sc.ID, &sc.CourseID, &sc.Name, &sc.Description, &sc.LeftColour, &sc.RightColour, &sc.NumModules, &sc.NumTopics, &sc.CourseOwner, &sc.PublishDate, &sc.IsActive)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return sc, nil
}

func (r *SQLStaticCourseRepository) GetPublishDatesByIDs(ids []string) (map[string]time.Time, error) {
	if len(ids) == 0 {
		return map[string]time.Time{}, nil
	}
	placeholders := strings.Repeat("?,", len(ids))
	placeholders = placeholders[:len(placeholders)-1]
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	rows, err := r.db.Query(`SELECT static_course_id, publish_date FROM static_courses WHERE static_course_id IN (`+placeholders+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make(map[string]time.Time, len(ids))
	for rows.Next() {
		var id string
		var t time.Time
		if err := rows.Scan(&id, &t); err != nil {
			return nil, err
		}
		result[id] = t
	}
	return result, rows.Err()
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
		`INSERT INTO static_courses (course_id, content_id, name, description, left_colour, right_colour, num_modules, num_topics, course_owner, publish_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		info.CourseID, info.ContentID, info.Name, info.Description, info.LeftColour, info.RightColour, info.NumModules, info.NumTopics, info.CourseOwner, info.PublishDate, info.IsActive,
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
		NumModules:  info.NumModules,
		NumTopics:   info.NumTopics,
		CourseOwner: info.CourseOwner,
		PublishDate: info.PublishDate,
		IsActive:    info.IsActive,
	}, nil
}

func (r *SQLStaticCourseRepository) GetVersionsByCourseID(courseID string) ([]*market.StaticCourse, error) {
	rows, err := r.db.Query(
		`SELECT static_course_id, course_id, content_id, name, description, left_colour, right_colour, num_modules, num_topics, course_owner, publish_date, is_active FROM static_courses WHERE course_id = ? ORDER BY publish_date DESC`,
		courseID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []*market.StaticCourse
	for rows.Next() {
		sc := &market.StaticCourse{}
		if err := rows.Scan(&sc.ID, &sc.CourseID, &sc.ContentID, &sc.Name, &sc.Description, &sc.LeftColour, &sc.RightColour, &sc.NumModules, &sc.NumTopics, &sc.CourseOwner, &sc.PublishDate, &sc.IsActive); err != nil {
			return nil, err
		}
		results = append(results, sc)
	}
	if results == nil {
		results = []*market.StaticCourse{}
	}
	return results, rows.Err()
}

func (r *SQLStaticCourseRepository) SetActive(id string, active bool) error {
	res, err := r.db.Exec(`UPDATE static_courses SET is_active = ? WHERE static_course_id = ?`, active, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
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

func (r *SQLStaticCourseRepository) GetAllActiveStaticCourses() ([]*market.StaticCourse, error) {
	rows, err := r.db.Query(
		`SELECT static_course_id, course_id, content_id, name, description, left_colour, right_colour, num_modules, num_topics, course_owner, publish_date, is_active FROM static_courses WHERE is_active = TRUE`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*market.StaticCourse
	for rows.Next() {
		sc := &market.StaticCourse{}
		if err := rows.Scan(&sc.ID, &sc.CourseID, &sc.ContentID, &sc.Name, &sc.Description, &sc.LeftColour, &sc.RightColour, &sc.NumModules, &sc.NumTopics, &sc.CourseOwner, &sc.PublishDate, &sc.IsActive); err != nil {
			return nil, err
		}
		results = append(results, sc)
	}
	if results == nil {
		results = []*market.StaticCourse{}
	}
	return results, rows.Err()
}
