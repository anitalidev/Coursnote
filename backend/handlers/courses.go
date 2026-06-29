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

			var err error
			course, err = store.repos.Courses.GetCourseByID(id)
			if err != nil {
				writeError(w, http.StatusNotFound, "invalid course id")
				return
			}

			newStaticContent, err := store.repos.StaticContents.Create(&persistence.StaticContentInfo{
				PublishedContent: "<!DOCTYPE html><html><body><p>Hello world</p></body></html>",
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
			})
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}

			if course.StaticCourseID != "" {
				// delete the current published version of this course (replace with new)
				err := store.repos.StaticCourses.DeleteByID(course.StaticCourseID)
				if err != nil {
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
