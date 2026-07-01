gpackage models

type User struct {
	UserID string `json:"userID"` // self

	Username  string   `json:"username"`
	AvatarURL string   `json:"avatarURL,omitempty"`
	CourseIDs []string `json:"courseIDs"` // owns
}

func newUser(userID string, username string) *User {
	return &User{
		Username:  username,
		UserID:    userID,
		CourseIDs: make([]string, 0, 15),
	}
}

func (user *User) addCourse(courseID string) {
	user.CourseIDs = append(user.CourseIDs, courseID)
}
