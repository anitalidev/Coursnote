package models

type User struct {
	UserID string `json:"userID"` // self

	Username        string   `json:"username"`
	CourseIDs       []string `json:"courseIDs"`       // owns
	StaticCourseIDs []string `json:"staticCourseIDs"` // enrolled
}

func newUser(userID string, username string) *User {
	return &User{
		Username:        username,
		UserID:          userID,
		CourseIDs:       make([]string, 0, 15),
		StaticCourseIDs: make([]string, 0),
	}
}

func (user *User) addCourse(courseID string) {
	user.CourseIDs = append(user.CourseIDs, courseID)
}
