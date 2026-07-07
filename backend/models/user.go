package models

type User struct {
	UserID string `json:"userID"` // self

	Username  string   `json:"username"`
	AvatarURL string   `json:"avatarURL,omitempty"`
	CourseIDs []string `json:"courseIDs"` // owns
}

func (user *User) addCourse(courseID string) {
	user.CourseIDs = append(user.CourseIDs, courseID)
}
