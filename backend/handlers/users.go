package handlers

import (
	"encoding/json"
	"log"
	"net/http"

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
	username := r.URL.Query().Get("username") // try username instead

	if username == "" {
		writeError(w, http.StatusBadRequest, "no username query specified")
		return
	}
	// return user based on username
	store.mu.RLock()
	defer store.mu.RUnlock()
	user, err := store.repos.Users.GetUserByUsername(username)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	settings, err := store.repos.Settings.GetByID(user.SettingsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, userDTO{ID: user.UserID, Username: user.Username, AvatarURL: user.AvatarURL, CourseIDs: user.CourseIDs, Settings: *settings})
}

// OVERALL: GET user by ID
// PTHVAL: id (non-empty)
// BADREQ: if id path value doesn't exist/empty
// NOTFND: if no user of that id exists
// SERVER: if an internal error occurs
// WRITES: JSON representing a single UserDTO
func GetUserByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "No ID specified")
		return
	}
	// Find user based on id
	store.mu.RLock()
	defer store.mu.RUnlock()

	user, err := store.repos.Users.GetUserByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	settings, err := store.repos.Settings.GetByID(user.SettingsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, userDTO{ID: user.UserID, Username: user.Username, AvatarURL: user.AvatarURL, CourseIDs: user.CourseIDs, Settings: *settings})
}

// OVERALL: POST a user with the provided username
// RQBODY: var body struct { Username string `json:"username"` }
// BADREQ: no username/empty username specified
// CNFLCT: user with username already exists
// SERVER: if an internal error occurs
// WRITES: JSON representing a single UserDTO (of the newly created user)
func PostUser(w http.ResponseWriter, r *http.Request) {
	var body struct { // this is the form of JSON that frontend will send back
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Username == "" {
		writeError(w, http.StatusBadRequest, "username required")
		return
	}
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, err := store.repos.Users.GetUserByUsername(body.Username); err == nil {
		writeError(w, http.StatusConflict, "username already exists")
		return
	}

	user, err := store.repos.Users.CreateUser(&persistence.UserInfo{
		Username: body.Username,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	settings, err := store.repos.Settings.GetByID(user.SettingsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

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

	store.mu.Lock()
	defer store.mu.Unlock()

	_, err := store.repos.Users.GetUserByID(id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	if err := store.repos.Users.DeleteUserByID(id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
