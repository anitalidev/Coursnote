package persistence

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLCourseRepository struct {
	db *sql.DB
}

func NewSQLCourseRepository(db *sql.DB) *SQLCourseRepository {
	return &SQLCourseRepository{db: db}
}

func (r *SQLCourseRepository) GetCourseByID(id string) (*models.Course, error) {
	c := &models.Course{CourseID: id}
	err := r.db.QueryRow(`SELECT name, description, user_id, left_colour, right_colour, static_course_id FROM courses WHERE course_id = ?`, id).
		Scan(&c.Name, &c.Description, &c.UserID, &c.LeftColour, &c.RightColour, &c.StaticCourseID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	if err != nil {
		return nil, err
	}
	c.ModuleIDs, err = r.moduleIDsForCourse(id)
	return c, err
}

func (r *SQLCourseRepository) CreateCourse(info *CourseInfo) (*models.Course, error) {
	res, err := r.db.Exec(
		`INSERT INTO courses (name, description, user_id, left_colour, right_colour) VALUES (?, ?, ?, ?, ?)`,
		info.Name, info.Description, info.UserID, info.LeftColour, info.RightColour,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.Course{
		CourseID:    fmt.Sprintf("%d", id),
		Name:        info.Name,
		Description: info.Description,
		UserID:      info.UserID,
		LeftColour:  info.LeftColour,
		RightColour: info.RightColour,
		ModuleIDs:   []string{},
	}, nil
}

func (r *SQLCourseRepository) UpdateCourse(id string, name string, description string, leftColour string,
	rightColour string, StaticCourseID string) error {
	res, err := r.db.Exec(
		`UPDATE courses SET name = ?, description = ?, left_colour = ?, right_colour = ?, static_course_id = ? WHERE course_id = ?`,
		name, description, leftColour, rightColour, StaticCourseID, id,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}

func (r *SQLCourseRepository) DeleteCourseByID(id string) error {
	res, err := r.db.Exec(`DELETE FROM courses WHERE course_id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}

func (r *SQLCourseRepository) moduleIDsForCourse(courseID string) ([]string, error) {
	rows, err := r.db.Query(`SELECT module_id FROM modules WHERE course_id = ?`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if ids == nil {
		ids = []string{}
	}
	return ids, rows.Err()
}
