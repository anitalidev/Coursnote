package models

import "time"

// EnrollmentProgress is the per-user progress through an enrolled course,
// stored as a single JSON blob on the enrollment. Keys reference ids inside
// the enrolled StaticCourseContent snapshot: Completed is keyed by topic id,
// LastAnswered by persistent element/question id (the selected option index).
// Keys that no longer exist after a republish are kept but ignored.
type EnrollmentProgress struct {
	Completed    map[string]bool `json:"completed"`
	LastAnswered map[string]int  `json:"lastAnswered"`
}

// EnsureMaps replaces nil maps with empty ones so JSON output is always
// {"completed":{},"lastAnswered":{}} rather than nulls.
func (p *EnrollmentProgress) EnsureMaps() {
	if p.Completed == nil {
		p.Completed = map[string]bool{}
	}
	if p.LastAnswered == nil {
		p.LastAnswered = map[string]int{}
	}
}

type CourseEnrollment struct {
	ID             string             `json:"id"`
	UserID         string             `json:"userID"`
	StaticCourseID string             `json:"staticCourseID"`
	EnrolledAt     time.Time          `json:"enrolledAt"`
	Progress       EnrollmentProgress `json:"progress"`
}
