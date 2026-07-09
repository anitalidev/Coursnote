package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/persistence"
)

type userDTO struct {
	ID        string                 `json:"id"`
	Username  string                 `json:"username"`
	AvatarURL string                 `json:"avatarURL,omitempty"`
	CourseIDs []string               `json:"courseIDs"`
	Settings  models.UserWebSettings `json:"settings"`
}

func UsersHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// Get user : one (via id OR username), or all
		id := r.URL.Query().Get("id")
		if id != "" {
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
		} else {
			// No user id is specified for the search
			username := r.URL.Query().Get("username") // try username instead

			if username != "" {
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
			} else {
				// nothing is specified so return all
				store.mu.RLock()
				defer store.mu.RUnlock()
				users, err := store.repos.Users.GetAllUsers()
				if err != nil {
					writeError(w, http.StatusInternalServerError, err.Error())
					return
				}

				result := make([]userDTO, 0, len(users))
				for _, u := range users {
					settings, err := store.repos.Settings.GetByID(u.SettingsID)
					if err != nil {
						writeError(w, http.StatusNotFound, err.Error())
						return
					} // TODO: fix N + 1 issue

					result = append(result, userDTO{
						ID:        u.UserID,
						Username:  u.Username,
						AvatarURL: u.AvatarURL,
						CourseIDs: u.CourseIDs,
						Settings:  *settings,
					})
				}

				writeJSON(w, http.StatusOK, result)
			}
		}

	case http.MethodPost: // creates new user with JSON body { "username": "name" }
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
			writeError(w, http.StatusNotFound, err.Error())
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

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
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

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func UserSettingsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPut:
		var body struct { // this is the form of JSON that frontend will send back
			BackgroundColour string `json:"backgroundColour"`
			PrimaryColour    string `json:"primaryColour"`
			GradientColour   string `json:"gradientColour"`
			NavColour        string `json:"navColour"`
			CardColour       string `json:"cardColour"`
			TextColour       string `json:"textColour"`
			AccentColour          string `json:"accentColour"`
			SecondaryTextColour   string `json:"secondaryTextColour"`
		}

		err := json.NewDecoder(r.Body).Decode(&body)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}

		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.Settings.UpdateSettingsByID(id, body.BackgroundColour, body.PrimaryColour, body.GradientColour, body.NavColour, body.CardColour, body.TextColour, body.AccentColour, body.SecondaryTextColour); err != nil {
			if err.Error() == "settings not found" {
				writeError(w, http.StatusNotFound, err.Error())
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
