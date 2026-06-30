package models

import "time"

type CourseEnrollment struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userID"`
	StaticCourseID string    `json:"staticCourseID"`
	EnrolledAt     time.Time `json:"enrolledAt"`
}
