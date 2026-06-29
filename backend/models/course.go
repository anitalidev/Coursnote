package models

type Course struct {
	CourseID string `json:"courseID"` // self

	Name           string   `json:"name"`
	Description    string   `json:"description"`
	ModuleIDs      []string `json:"moduleIDs"`      // owns
	StaticCourseID string   `json:"staticCourseID"` // owns
	UserID         string   `json:"userID"`         // owner

	// UI details
	LeftColour  string `json:"leftColour"`
	RightColour string `json:"rightColour"`
}

/*
func newCourse(courseID string, name string, desc string, userID string) *Course {
	return &Course{
		CourseID:    courseID,
		Name:        name,
		Description: desc,
		ModuleIDs:   make([]string, 0, 15),
		UserID:      userID,
	}
}
*/

func (course *Course) addModule(moduleID string) {
	course.ModuleIDs = append(course.ModuleIDs, moduleID)
}

func (course *Course) publishCourse() {

}
