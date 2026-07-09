package models

type User struct {
	UserID string `json:"userID"` // self

	Username  string   `json:"username"`
	AvatarURL string   `json:"avatarURL,omitempty"`
	CourseIDs []string `json:"courseIDs"` // owns

	SettingsID string `json:"settings"`
}

func (user *User) addCourse(courseID string) {
	user.CourseIDs = append(user.CourseIDs, courseID)
}

type UserWebSettings struct {
	ID               string `json:"settingsID"`
	BackgroundColour string `json:"backgroundColour"`
	PrimaryColour    string `json:"primaryColour"`
	GradientColour   string `json:"gradientColour"`
	NavColour        string `json:"navColour"`
	CardColour       string `json:"cardColour"`
	TextColour       string `json:"textColour"`
	AccentColour          string `json:"accentColour"`
	SecondaryTextColour   string `json:"secondaryTextColour"`
}
