package handlers

import (
	"net/http"
	"time"
)

type MarketCourseDTO struct {
	ID          string    `json:"id"`
	CourseID    string    `json:"courseId"`
	ContentID   string    `json:"contentId"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	LeftColour  string    `json:"leftColour"`
	RightColour string    `json:"rightColour"`
	PublishDate time.Time `json:"publishDate"`
	NumModules  int       `json:"numModules"`
	NumTopics   int       `json:"numTopics"`
	CourseOwner string    `json:"courseOwner"`
}

func MarketHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		store.mu.RLock()
		defer store.mu.RUnlock()

		staticCourses, err := store.repos.StaticCourses.GetAllStaticCourse()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		dtos := make([]MarketCourseDTO, 0, len(staticCourses))
		for _, sc := range staticCourses {
			dto := MarketCourseDTO{
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
			}
			if course, err := store.repos.Courses.GetCourseByID(sc.CourseID); err == nil {
				dto.NumModules = len(course.ModuleIDs)
				dto.NumTopics = TopicCount(course)
			}
			dtos = append(dtos, dto)
		}

		writeJSON(w, http.StatusOK, dtos)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
