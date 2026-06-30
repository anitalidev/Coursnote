package persistence

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLEnrollmentRepository struct {
	db *sql.DB
}

func NewSQLEnrollmentRepository(db *sql.DB) *SQLEnrollmentRepository {
	return &SQLEnrollmentRepository{db: db}
}

func (r *SQLEnrollmentRepository) Create(userID string, staticCourseID string) (*models.CourseEnrollment, error) {
	now := time.Now()
	res, err := r.db.Exec(
		`INSERT INTO course_enrollments (user_id, static_course_id, enrolled_at) VALUES (?, ?, ?)`,
		userID, staticCourseID, now,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.CourseEnrollment{
		ID:             fmt.Sprintf("%d", id),
		UserID:         userID,
		StaticCourseID: staticCourseID,
		EnrolledAt:     now,
	}, nil
}

func (r *SQLEnrollmentRepository) GetByUserID(userID string) ([]*models.CourseEnrollment, error) {
	rows, err := r.db.Query(
		`SELECT enrollment_id, user_id, static_course_id, enrolled_at FROM course_enrollments WHERE user_id = ?`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	enrollments := []*models.CourseEnrollment{}
	for rows.Next() {
		e := &models.CourseEnrollment{}
		if err := rows.Scan(&e.ID, &e.UserID, &e.StaticCourseID, &e.EnrolledAt); err != nil {
			return nil, err
		}
		enrollments = append(enrollments, e)
	}
	return enrollments, rows.Err()
}

// GetByUserAndCourseID returns the enrollment for a user where the enrolled static course
// belongs to the given courseID, or nil if no such enrollment exists.
func (r *SQLEnrollmentRepository) GetByUserAndCourseID(userID string, courseID string) (*models.CourseEnrollment, error) {
	e := &models.CourseEnrollment{}
	err := r.db.QueryRow(
		`SELECT ce.enrollment_id, ce.user_id, ce.static_course_id, ce.enrolled_at
		 FROM course_enrollments ce
		 JOIN static_courses sc ON sc.static_course_id = ce.static_course_id
		 WHERE ce.user_id = ? AND sc.course_id = ?`,
		userID, courseID,
	).Scan(&e.ID, &e.UserID, &e.StaticCourseID, &e.EnrolledAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (r *SQLEnrollmentRepository) UpdateStaticCourse(enrollmentID string, staticCourseID string) error {
	res, err := r.db.Exec(
		`UPDATE course_enrollments SET static_course_id = ? WHERE enrollment_id = ?`,
		staticCourseID, enrollmentID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("enrollment not found")
	}
	return nil
}

func (r *SQLEnrollmentRepository) Delete(enrollmentID string) error {
	_, err := r.db.Exec(`DELETE FROM course_enrollments WHERE enrollment_id = ?`, enrollmentID)
	return err
}
