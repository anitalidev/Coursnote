package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/models/market"
	"github.com/anitalidev/Coursnote/backend/persistence"
)

type userDTO struct {
	ID              string   `json:"id"`
	Username        string   `json:"username"`
	CourseIDs       []string `json:"courseIDs"`
	StaticCourseIDs []string `json:"staticCourseIDs"`
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
			writeJSON(w, http.StatusOK, userDTO{ID: user.UserID, Username: user.Username, CourseIDs: user.CourseIDs, StaticCourseIDs: user.StaticCourseIDs})
		} else {
			// No user id is specified for the search
			username := r.URL.Query().Get("username") // try username instead

			if username != "" {
				// return user based on username
				store.mu.RLock()
				defer store.mu.RUnlock()
				user, err := store.repos.Users.GetUserByUsername(username)
				if err == nil {
					writeJSON(w, http.StatusOK, userDTO{ID: user.UserID, Username: user.Username, CourseIDs: user.CourseIDs, StaticCourseIDs: user.StaticCourseIDs})
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
						ID:              u.UserID,
						Username:        u.Username,
						CourseIDs:       u.CourseIDs,
						StaticCourseIDs: u.StaticCourseIDs,
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
		writeJSON(w, http.StatusCreated, userDTO{ID: user.UserID, Username: user.Username, CourseIDs: user.CourseIDs, StaticCourseIDs: user.StaticCourseIDs})

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

		cascadeDeleteUser(id)

		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func GetStaticCourses(u *models.User) ([]*market.StaticCourse, error) {
	var staticCourses []*market.StaticCourse
	for _, staticCourseID := range u.StaticCourseIDs {
		staticCourse, err := store.repos.StaticCourses.GetByID(staticCourseID)
		if err != nil {
			return nil, err
		}

		staticCourses = append(staticCourses, staticCourse)
	}
	return staticCourses, nil
}
