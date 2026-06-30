package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/persistence"
)

type CourseDTO struct {
	CourseID       string    `json:"courseID"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	ModuleIDs      []string  `json:"moduleIDs"`
	StaticCourseID string    `json:"staticCourseID"`
	PublishDate    time.Time `json:"publishDate,omitempty"`
	UserID         string    `json:"userID"`
	PCompleted     float32   `json:"pcompleted"`
	NTopics        int       `json:"ntopics"`
	LeftColour     string    `json:"leftColour"`
	RightColour    string    `json:"rightColour"`
}

func randomHex() string {
	return fmt.Sprintf("#%06x", rand.Intn(0xffffff+1))
}

func CourseHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.RLock()
		defer store.mu.RUnlock()

		course, err := store.repos.Courses.GetCourseByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}

		dto := CourseDTO{
			CourseID:       course.CourseID,
			Name:           course.Name,
			Description:    course.Description,
			ModuleIDs:      course.ModuleIDs,
			StaticCourseID: course.StaticCourseID,
			UserID:         course.UserID,
			PCompleted:     PercentageCompleted(course),
			NTopics:        TopicCount(course),
			LeftColour:     course.LeftColour,
			RightColour:    course.RightColour,
		}

		publishDate, err := store.repos.StaticCourses.GetPublishDateByID(course.StaticCourseID)
		if err == nil {
			dto.PublishDate = publishDate
		}

		writeJSON(w, http.StatusOK, dto)

	case http.MethodPost:
		var course *models.Course
		if strings.HasSuffix(r.URL.Path, "/publish") {
			id := r.URL.Query().Get("id")
			if id == "" {
				writeError(w, http.StatusBadRequest, "id query param required")
				return
			}

			store.mu.Lock()
			defer store.mu.Unlock()

			var body struct {
				PublishedContent string `json:"publishedContent"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)

			var err error
			course, err = store.repos.Courses.GetCourseByID(id)
			if err != nil {
				writeError(w, http.StatusNotFound, "invalid course id")
				return
			}

			newStaticContent, err := store.repos.StaticContents.Create(&persistence.StaticContentInfo{
				PublishedContent: body.PublishedContent,
			})
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}

			newStaticCourse, err := store.repos.StaticCourses.Create(&persistence.StaticCourseInfo{
				CourseID:    course.CourseID,
				ContentID:   newStaticContent.ID,
				Name:        course.Name,
				Description: course.Description,
				LeftColour:  course.LeftColour,
				RightColour: course.RightColour,
				PublishDate: time.Now(),
				NumModules:  len(course.ModuleIDs),
				NumTopics:   TopicCount(course),
				CourseOwner: func() string {
					username, _ := store.repos.Users.GetUsernameByID(course.UserID)
					return username
				}(),
				IsActive: true,
			})
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}

			if course.StaticCourseID != "" {
				if err := store.repos.StaticCourses.SetActive(course.StaticCourseID, false); err != nil {
					writeError(w, http.StatusInternalServerError, err.Error())
					return
				}
			}

			if err := store.repos.Courses.UpdateCourse(course.CourseID, course.Name, course.Description,
				course.LeftColour, course.RightColour, newStaticCourse.ID); err != nil {

				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}

			course, err = store.repos.Courses.GetCourseByID(id) // get updated version of the course
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}

		} else {
			var body struct {
				Name        string `json:"name"`
				Description string `json:"description"`
				UserID      string `json:"userID"`
				LeftColour  string `json:"leftColour"`
				RightColour string `json:"rightColour"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" || body.UserID == "" {
				writeError(w, http.StatusBadRequest, "name and userID required")
				return
			}
			if body.LeftColour == "" {
				body.LeftColour = randomHex()
			}
			if body.RightColour == "" {
				body.RightColour = randomHex()
			}
			store.mu.Lock()
			defer store.mu.Unlock()

			var err error
			course, err = store.repos.Courses.CreateCourse(&persistence.CourseInfo{
				Name:        body.Name,
				Description: body.Description,
				UserID:      body.UserID,
				LeftColour:  body.LeftColour,
				RightColour: body.RightColour,
			})
			if err != nil {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
		}

		dto := CourseDTO{
			CourseID:       course.CourseID,
			Name:           course.Name,
			Description:    course.Description,
			ModuleIDs:      course.ModuleIDs,
			StaticCourseID: course.StaticCourseID,
			UserID:         course.UserID,
			PCompleted:     PercentageCompleted(course),
			NTopics:        TopicCount(course),
			LeftColour:     course.LeftColour,
			RightColour:    course.RightColour,
		}

		publishDate, err := store.repos.StaticCourses.GetPublishDateByID(course.StaticCourseID)
		if err == nil {
			dto.PublishDate = publishDate
		}

		writeJSON(w, http.StatusOK, dto)

	case http.MethodPut:
		var body struct {
			ID             string `json:"id"`
			Name           string `json:"name"`
			Description    string `json:"description"`
			StaticCourseID string `json:"staticCourseID"`
			LeftColour     string `json:"leftColour"`
			RightColour    string `json:"rightColour"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" || body.Name == "" {
			writeError(w, http.StatusBadRequest, "id and name required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.Courses.UpdateCourse(body.ID, body.Name, body.Description, body.LeftColour, body.RightColour, body.StaticCourseID); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		course, _ := store.repos.Courses.GetCourseByID(body.ID)
		dto := CourseDTO{
			CourseID:       course.CourseID,
			Name:           course.Name,
			Description:    course.Description,
			ModuleIDs:      course.ModuleIDs,
			StaticCourseID: course.StaticCourseID,
			UserID:         course.UserID,
			PCompleted:     PercentageCompleted(course),
			NTopics:        TopicCount(course),
			LeftColour:     course.LeftColour,
			RightColour:    course.RightColour,
		}

		publishDate, err := store.repos.StaticCourses.GetPublishDateByID(course.StaticCourseID)
		if err == nil {
			dto.PublishDate = publishDate
		}

		writeJSON(w, http.StatusOK, dto)

	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if _, err := store.repos.Courses.GetCourseByID(id); err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		cascadeDeleteCourse(id)
		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func UpdateEnrollHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		UserID         string `json:"userID"`
		StaticCourseID string `json:"staticCourseID"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == "" || body.StaticCourseID == "" {
		writeError(w, http.StatusBadRequest, "userID and staticCourseID required")
		return
	}

	store.mu.Lock()
	defer store.mu.Unlock()

	newSC, err := store.repos.StaticCourses.GetByID(body.StaticCourseID)
	if err != nil {
		writeError(w, http.StatusNotFound, "staticCourseID not found")
		return
	}

	user, err := store.repos.Users.GetUserByID(body.UserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	for _, scID := range user.StaticCourseIDs {
		sc, err := store.repos.StaticCourses.GetByID(scID)
		if err != nil {
			continue
		}
		if sc.CourseID == newSC.CourseID {
			store.repos.Users.UnenrollUser(body.UserID, scID)
		}
	}

	if err := store.repos.Users.EnrollUser(body.UserID, body.StaticCourseID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func EnrolledCoursesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID := r.URL.Query().Get("userID")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "userID query param required")
		return
	}
	store.mu.RLock()
	defer store.mu.RUnlock()

	user, err := store.repos.Users.GetUserByID(userID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	dtos := make([]MarketCourseDTO, 0, len(user.StaticCourseIDs))
	for _, scID := range user.StaticCourseIDs {
		sc, err := store.repos.StaticCourses.GetByID(scID)
		if err != nil {
			continue
		}
		dtos = append(dtos, MarketCourseDTO{
			ID:          sc.ID,
			CourseID:    sc.CourseID,
			ContentID:   sc.ContentID,
			Name:        sc.Name,
			Description: sc.Description,
			LeftColour:  sc.LeftColour,
			RightColour: sc.RightColour,
			PublishDate: sc.PublishDate,
			NumModules:  sc.NumModules,
			NumTopics:   sc.NumTopics,
			CourseOwner: sc.CourseOwner,
			IsActive:    sc.IsActive,
		})
	}
	writeJSON(w, http.StatusOK, dtos)
}

func EnrollHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		UserID         string `json:"userID"`
		StaticCourseID string `json:"staticCourseID"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == "" || body.StaticCourseID == "" {
		writeError(w, http.StatusBadRequest, "userID and staticCourseID required")
		return
	}
	store.mu.Lock()
	defer store.mu.Unlock()

	if err := store.repos.Users.EnrollUser(body.UserID, body.StaticCourseID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func CourseVersionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id query param required")
		return
	}
	store.mu.RLock()
	defer store.mu.RUnlock()

	versions, err := store.repos.StaticCourses.GetVersionsByCourseID(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, versions)
}

// Helpers

// PercentageCompleted returns the fraction of topics completed across all modules in a course (0.0–1.0).
// Returns 0 if the course has no topics.
func PercentageCompleted(course *models.Course) float32 {
	completed := 0
	total := 0
	for _, moduleID := range course.ModuleIDs {
		module, err := store.repos.Modules.GetModuleByID(moduleID)
		if err != nil {
			continue
		}
		c, t := completedCountForModule(module)
		completed += c
		total += t
	}
	if total == 0 {
		return 0
	}
	return float32(completed) / float32(total)
}

func TopicCount(course *models.Course) int {
	total := 0
	for _, moduleID := range course.ModuleIDs {
		module, err := store.repos.Modules.GetModuleByID(moduleID)
		if err != nil {
			continue
		}
		total += len(module.TopicIDs)
	}
	return total
}

func completedCountForModule(module *models.Module) (completed, total int) {
	for _, topicID := range module.TopicIDs {
		topic, err := store.repos.Topics.GetTopicByID(topicID)
		if err != nil {
			continue
		}
		total++
		if topic.Completed {
			completed++
		}
	}
	return
}
