package handlers

import (
	"net/http"
	"strings"
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

func courseCompID(a, b *MarketCourseDTO, flip bool) int {
	if a.ID < b.ID {
		if !flip {
			return Before
		}
		return After
	} else if a.ID > b.ID {
		if !flip {
			return After
		}
		return Before
	}
	return Equal
}

func courseCompPublishDate(a, b *MarketCourseDTO, flip bool) int {
	if a.PublishDate.Before(b.PublishDate) {
		if !flip {
			return Before
		}
		return After
	} else if a.PublishDate.After(b.PublishDate) {
		if !flip {
			return After
		}
		return Before
	}
	return Equal
}

func courseCompName(a, b *MarketCourseDTO, flip bool) int {
	an := strings.ToLower(a.Name)
	bn := strings.ToLower(b.Name)

	if an < bn {
		if !flip {
			return Before
		}
		return After
	} else if an > bn {
		if !flip {
			return After
		}
		return Before
	}
	return Equal
}

func courseCompOwner(a, b *MarketCourseDTO, flip bool) int {
	ao := strings.ToLower(a.CourseOwner)
	bo := strings.ToLower(b.CourseOwner)

	if ao < bo {
		if !flip {
			return Before
		}
		return After
	} else if ao > bo {
		if !flip {
			return After
		}
		return Before
	}
	return Equal
}

func courseCompModules(a, b *MarketCourseDTO, flip bool) int {
	if a.NumModules < b.NumModules {
		if !flip {
			return Before
		}
		return After
	} else if a.NumModules > b.NumModules {
		if !flip {
			return After
		}
		return Before
	}
	return Equal
}

func courseCompTopics(a, b *MarketCourseDTO, flip bool) int {
	if a.NumTopics < b.NumTopics {
		if !flip {
			return Before
		}
		return After
	} else if a.NumTopics > b.NumTopics {
		if !flip {
			return After
		}
		return Before
	}
	return Equal
}
