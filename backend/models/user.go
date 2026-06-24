package models

type User struct {
	Username  string   `json:"username"`
	UserID    string   `json:"userID"`    // self
	CourseIDs []string `json:"courseIDs"` // owns
}
