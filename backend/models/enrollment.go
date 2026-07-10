package models

import "time"

// EnrollmentProgress is the per-user progress through an enrolled course,
// stored as a single JSON blob on the enrollment. All keys are topic IDs or
// persistent element IDs from the enrolled StaticCourseContent snapshot.
// Keys that no longer exist after a republish are kept but ignored.
type EnrollmentProgress struct {
	ManuallyMarked     map[string]bool    `json:"marked_manually"`
	ManuallyOverridden map[string]string  `json:"manually_overridden"`
	TimeSpent          map[string]float64 `json:"time_spent"`
	ReadToBottom       map[string]bool    `json:"read_to_bottom"`
	LastAnswered       map[string]int     `json:"lastAnswered"`
	CorrectlyAnswered  map[string]int     `json:"correctlyAnswered"`
}

// EnsureMaps replaces nil maps with empty ones so JSON output is always
// objects rather than nulls.
func (p *EnrollmentProgress) EnsureMaps() {
	if p.ManuallyMarked == nil {
		p.ManuallyMarked = map[string]bool{}
	}
	if p.ManuallyOverridden == nil {
		p.ManuallyOverridden = map[string]string{}
	}
	if p.TimeSpent == nil {
		p.TimeSpent = map[string]float64{}
	}
	if p.ReadToBottom == nil {
		p.ReadToBottom = map[string]bool{}
	}
	if p.LastAnswered == nil {
		p.LastAnswered = map[string]int{}
	}
	if p.CorrectlyAnswered == nil {
		p.CorrectlyAnswered = map[string]int{}
	}
}

type CourseEnrollment struct {
	ID                  string             `json:"id"`
	UserID              string             `json:"userID"`
	StaticCourseID      string             `json:"staticCourseID"`
	EnrolledAt          time.Time          `json:"enrolledAt"`
	Progress            EnrollmentProgress `json:"progress"`
	CompletedPercentage int                `json:"completedPercentage"`
}
