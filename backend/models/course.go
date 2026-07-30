package models

// a struct representing a course. A course is owned by a user and owns a staticCourse version if applicable
// and also owns modules
type Course struct {
	CourseID       string   `json:"courseID"`       // self
	UserID         string   `json:"userID"`         // owner
	ModuleIDs      []string `json:"moduleIDs"`      // owns
	StaticCourseID string   `json:"staticCourseID"` // owns

	Name        string `json:"name"`
	Description string `json:"description"`

	// UI details
	LeftColour  string `json:"leftColour"`
	RightColour string `json:"rightColour"`
}

func (course *Course) addModule(moduleID string) {
	course.ModuleIDs = append(course.ModuleIDs, moduleID)
}

func (course *Course) publishCourse() {

}
