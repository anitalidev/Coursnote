package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/persistence"
)

// DTO format that will be sent to frontend to represent a course
type userDTO struct {
	ID        string                 `json:"id"`
	Username  string                 `json:"username"`
	AvatarURL string                 `json:"avatarURL,omitempty"`
	CourseIDs []string               `json:"courseIDs"`
	Settings  models.UserWebSettings `json:"settings"`
}

// Handles HTTP requests regarding users:

// OVERALL: GET user by username
// QPARAM: username (non-empty)
// BADREQ: if username query parameter doesn't exist/empty
// NOTFND: if no user of that username exists
// SERVER: if an internal error occurs
// WRITES: JSON representing a single UserDTO
func GetUserByUsername(w http.ResponseWriter, r *http.Request) {
	// normalise: lowercase + trim so lookups are case/whitespace-insensitive
	username := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("username")))
	if username == "" {
		writeError(w, http.StatusBadRequest, "no username query specified")
		return
	}

	// search for user in DB
	user, err := store.repos.Users.GetUserByUsername(username)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	// search for the user's settings in DB
	settings, err := store.repos.Settings.GetByID(user.SettingsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	// combine user + their settings to write + return DTO
	writeJSON(w, http.StatusOK, userDTO{ID: user.UserID, Username: user.Username, AvatarURL: user.AvatarURL, CourseIDs: user.CourseIDs, Settings: *settings})
}

// OVERALL: GET user by ID
// PTHVAL: id (non-empty)
// BADREQ: if id path value doesn't exist/empty
// NOTFND: if no user of that id exists
// SERVER: if an internal error occurs
// WRITES: JSON representing a single UserDTO
func GetUserByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id") // try to obtain the id being searched user
	if id == "" {
		writeError(w, http.StatusBadRequest, "No ID specified")
		return
	}

	// Find user in DB based on id
	user, err := store.repos.Users.GetUserByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	// Find user settings for that user in DB
	settings, err := store.repos.Settings.GetByID(user.SettingsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Combine user + their settings to write + return as DTO
	writeJSON(w, http.StatusOK, userDTO{ID: user.UserID, Username: user.Username, AvatarURL: user.AvatarURL, CourseIDs: user.CourseIDs, Settings: *settings})
}

// OVERALL: POST a user with the provided username
// RQBODY: var body struct { Username string `json:"username"` }
// BADREQ: no username/empty username specified
// CNFLCT: user with username already exists
// SERVER: if an internal error occurs
// WRITES: JSON representing a single UserDTO (of the newly created user)
func PostUser(w http.ResponseWriter, r *http.Request) {
	// this is the form of JSON that frontend will include in request
	var body struct {
		Username string `json:"username"`
	}
	// deserialize
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Username == "" {
		writeError(w, http.StatusBadRequest, "username required")
		return
	}
	// normalise: lowercase + trim so stored usernames are case/whitespace-insensitive
	body.Username = strings.ToLower(strings.TrimSpace(body.Username))

	// Ensure that username is unique
	if _, err := store.repos.Users.GetUserByUsername(body.Username); err == nil {
		writeError(w, http.StatusConflict, "username already exists")
		return
	}

	// Create the user
	user, err := store.repos.Users.CreateUser(&persistence.UserInfo{
		Username: body.Username,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Grab its settings
	settings, err := store.repos.Settings.GetByID(user.SettingsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Write the DTO of the user just created
	writeJSON(w, http.StatusCreated, userDTO{
		ID: user.UserID, Username: user.Username, CourseIDs: user.CourseIDs, AvatarURL: user.AvatarURL,
		Settings: models.UserWebSettings{
			BackgroundColour: settings.BackgroundColour,
			PrimaryColour:    settings.PrimaryColour,
			GradientColour:   settings.GradientColour,
		},
	})
}

// OVERALL: DELETE the user with the provided ID (and cascade delete things belonging to it)
// PTHVAL: id (non-empty)
// NOTFND: No user with that ID
// SERVER: if an internal error occurs
func DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id path param required")
		return
	}

	// Confirm the user exists before attempting deletion
	_, err := store.repos.Users.GetUserByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	// Delete user (cascade-deletes all owned courses, modules, topics, etc.)
	if err := store.repos.Users.DeleteUserByID(id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
