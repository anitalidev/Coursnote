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

func (course *Course) addModule(moduleID string) {
	course.ModuleIDs = append(course.ModuleIDs, moduleID)
}

func (course *Course) publishCourse() {

}
