package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/persistence"
)

type userDTO struct {
	ID        string   `json:"id"`
	Username  string   `json:"username"`
	AvatarURL string   `json:"avatarURL,omitempty"`
	CourseIDs []string `json:"courseIDs"`
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
			writeJSON(w, http.StatusOK, userDTO{ID: user.UserID, Username: user.Username, AvatarURL: user.AvatarURL, CourseIDs: user.CourseIDs})
		} else {
			// No user id is specified for the search
			username := r.URL.Query().Get("username") // try username instead

			if username != "" {
				// return user based on username
				store.mu.RLock()
				defer store.mu.RUnlock()
				user, err := store.repos.Users.GetUserByUsername(username)
				if err == nil {
					writeJSON(w, http.StatusOK, userDTO{ID: user.UserID, Username: user.Username, AvatarURL: user.AvatarURL, CourseIDs: user.CourseIDs})
				} else {
					writeError(w, http.StatusNotFound, err.Error())
					return
				}
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
					result = append(result, userDTO{
						ID:        u.UserID,
						Username:  u.Username,
						AvatarURL: u.AvatarURL,
						CourseIDs: u.CourseIDs,
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

		// Currently creation can not cause error
		user, _ := store.repos.Users.CreateUser(&persistence.UserInfo{
			Username: body.Username,
		})
		writeJSON(w, http.StatusCreated, userDTO{ID: user.UserID, Username: user.Username, CourseIDs: user.CourseIDs, AvatarURL: user.AvatarURL})

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

		if err := store.repos.Users.DeleteUserByID(id); err != nil { writeError(w, http.StatusInternalServerError, err.Error()); return }

		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

