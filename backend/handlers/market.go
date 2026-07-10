package handlers

import (
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/anitalidev/Coursnote/backend/models"
)

// intQueryParam parses an integer query parameter; ok is false when the
// parameter is absent or not a number.
func intQueryParam(r *http.Request, name string) (int, bool) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return 0, false
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, false
	}
	return n, true
}

type MarketCourseDTO struct {
	ID                  string    `json:"id"`
	CourseID            string    `json:"courseId"`
	ContentID           string    `json:"contentId"`
	Name                string    `json:"name"`
	Description         string    `json:"description"`
	LeftColour          string    `json:"leftColour"`
	RightColour         string    `json:"rightColour"`
	PublishDate         time.Time `json:"publishDate"`
	NumModules          int       `json:"numModules"`
	NumTopics           int       `json:"numTopics"`
	CourseOwner         string    `json:"courseOwner"`
	IsActive            bool      `json:"isActive"`
	Status              string    `json:"status"` // Status is either "enrolled", "", or "update"
	CompletedPercentage int            `json:"completedPercentage"`
	ModuleProgress      map[string]int `json:"moduleProgress,omitempty"`

	// Progress and EnrolledAt are only set on enrolled-course listings.
	Progress   *models.EnrollmentProgress `json:"progress,omitempty"`
	EnrolledAt *time.Time                 `json:"enrolledAt,omitempty"`
}

func MarketHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:

		store.mu.RLock()
		defer store.mu.RUnlock()

		staticCourses, err := store.repos.StaticCourses.GetAllActiveStaticCourses()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		enrolledStatic := map[string]bool{} // StaticCourseID -> owns
		enrolledCourse := map[string]bool{} // CourseID -> owns some version

		if userID := r.URL.Query().Get("userID"); userID != "" {
			if enrollments, err := store.repos.Enrollments.GetByUserID(userID); err == nil {
				for _, e := range enrollments {
					enrolledStatic[e.StaticCourseID] = true
					if sc, err := store.repos.StaticCourses.GetByID(e.StaticCourseID); err == nil {
						enrolledCourse[sc.CourseID] = true
					}
				}
			}
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
				IsActive:    sc.IsActive,
				Status:      "",
			}
			if course, err := store.repos.Courses.GetCourseByID(sc.CourseID); err == nil {
				dto.NumModules = len(course.ModuleIDs)
				dto.NumTopics = TopicCount(course)
			}
			if enrolledStatic[sc.ID] {
				dto.Status = "enrolled"
			} else if enrolledCourse[sc.CourseID] {
				dto.Status = "update"
			}

			dtos = append(dtos, dto)
		}

		total := len(dtos)

		// Server-side filtering: free-text search over name/description/owner,
		// author substring, and module-count bounds.
		search := strings.ToLower(r.URL.Query().Get("search"))
		author := strings.ToLower(r.URL.Query().Get("author"))
		status := r.URL.Query().Get("status")
		sizeModMin, hasModMin := intQueryParam(r, "modSizeMin")
		sizeTopMin, hasTopMin := intQueryParam(r, "topSizeMin")
		sizeModMax, hasModMax := intQueryParam(r, "modSizeMax")
		sizeTopMax, hasTopMax := intQueryParam(r, "topSizeMax")

		filtered := dtos[:0]
		for _, dto := range dtos {
			// Searching for courses by content
			if search != "" &&
				!strings.Contains(strings.ToLower(dto.Name), search) &&
				!strings.Contains(strings.ToLower(dto.Description), search) &&
				!strings.Contains(strings.ToLower(dto.CourseOwner), search) {
				continue
			}

			// Searching for courses by author
			if author != "" && !strings.Contains(strings.ToLower(dto.CourseOwner), author) {
				continue
			}

			// Searching for courses with some status:
			// "enrolled", "update", or "not enrolled" (the DTO stores
			// not-enrolled as an empty string).
			if status != "" {
				want := status
				if want == "not enrolled" {
					want = ""
				}
				if dto.Status != want {
					continue
				}
			}

			// Courses with # of modules between modSizeMin and modSizeMax (if specified, inclusive)
			if hasModMin && dto.NumModules < sizeModMin {
				continue
			}
			if hasModMax && dto.NumModules > sizeModMax {
				continue
			}

			// Courses with # of topics between topSizeMin and topSizeMax (if specified, inclusive)
			if hasTopMin && dto.NumTopics < sizeTopMin {
				continue
			}
			if hasTopMax && dto.NumTopics > sizeTopMax {
				continue
			}

			// If pass all filters, add to final filtered out list
			filtered = append(filtered, dto)
		}
		dtos = filtered

		// Now sort the filtered list

		sortByFields := make([]string, 0)
		sortFlips := make([]bool, 0)
		for _, s := range strings.Split(r.URL.Query().Get("sortBy"), ",") {
			if s == "" {
				continue
			}
			if strings.HasPrefix(s, "-") {
				sortFlips = append(sortFlips, true)
				s = s[1:]
			} else {
				sortFlips = append(sortFlips, false)
			}
			sortByFields = append(sortByFields, s)
		}

		comps := make([]func(*MarketCourseDTO, *MarketCourseDTO, bool) int, 0)
		for _, s := range sortByFields {
			switch s {
			case "id":
				comps = append(comps, courseCompID)
			case "publishDate":
				comps = append(comps, courseCompPublishDate)
			case "AtoZ":
				comps = append(comps, courseCompName)
			case "owner":
				comps = append(comps, courseCompOwner)
			case "modules":
				comps = append(comps, courseCompModules)
			case "topics":
				comps = append(comps, courseCompTopics)
			case "status":
				comps = append(comps, courseCompStatus)
			}
		}

		if len(comps) > 0 {
			sort.Slice(dtos, func(a, b int) bool {
				for i, comp := range comps {
					res := comp(&dtos[a], &dtos[b], sortFlips[i])
					if res == Before {
						return true
					}
					if res == After {
						return false
					}
				}
				return false
			})
		}

		writeJSON(w, http.StatusOK, struct {
			Total   int               `json:"total"`
			Courses []MarketCourseDTO `json:"courses"`
		}{total, dtos})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// Filter functions:

// Comparator Functions:
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

// courseCompStatus orders enrolled first, then update, then not enrolled.
func courseCompStatus(a, b *MarketCourseDTO, flip bool) int {
	rank := func(s string) int {
		switch s {
		case "enrolled":
			return 0
		case "update":
			return 1
		default:
			return 2
		}
	}
	ra, rb := rank(a.Status), rank(b.Status)
	if ra < rb {
		if !flip {
			return Before
		}
		return After
	} else if ra > rb {
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
