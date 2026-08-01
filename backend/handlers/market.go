package handlers

import (
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/anitalidev/Coursnote/backend/models"
)

// ── DTO ───────────────────────────────────────────────────────────────────────

// DTO format sent to frontend to represent a course listed on the marketplace.
// Status is "enrolled" if the requesting user is enrolled in this exact version,
// "update" if they are enrolled in a different version of the same course, or ""
// if they have no enrollment. Progress and EnrolledAt are only populated on the
// enrolled-courses listing (GET /api/course/enrolled), not the marketplace.
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
	IsActive    bool      `json:"isActive"`

	// "enrolled", "update", or "" — see type-level comment above
	Status              string         `json:"status"`
	CompletedPercentage int            `json:"completedPercentage"`
	ModuleProgress      map[string]int `json:"moduleProgress,omitempty"`

	// Only set when this DTO appears in an enrolled-courses response
	Progress   *models.EnrollmentProgress `json:"progress,omitempty"`
	EnrolledAt *time.Time                 `json:"enrolledAt,omitempty"`
}

// ── Helper ────────────────────────────────────────────────────────────────────

// intQueryParam parses an integer query parameter; ok is false when the
// parameter is absent or not a valid integer.
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

// ── Handler ───────────────────────────────────────────────────────────────────

// OVERALL: GET all active marketplace courses, with optional server-side filtering and sorting
// QPARAM: userID (optional — if provided, each DTO gets an enrollment status)
// QPARAM: search (optional — free-text filter matching name, description, or owner)
// QPARAM: author (optional — substring filter on course owner)
// QPARAM: status (optional — "enrolled", "update", or "not enrolled")
// QPARAM: modSizeMin, modSizeMax (optional — inclusive bounds on number of modules)
// QPARAM: topSizeMin, topSizeMax (optional — inclusive bounds on number of topics)
// QPARAM: sortBy (optional — comma-separated field names; prefix a field with '-' to reverse it)
//
//	valid sort fields: id, publishDate, AtoZ, owner, modules, topics, status
//
// SERVER: if fetching active courses fails
// WRITES: JSON with { total: int, courses: []MarketCourseDTO }
//
//	total is the pre-filter count of all active courses
func MarketHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	store.mu.RLock()
	defer store.mu.RUnlock()

	// ── Fetch all active courses ──────────────────────────────────────────────

	staticCourses, err := store.repos.StaticCourses.GetAllActiveStaticCourses()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Build enrollment lookup maps for the requesting user (if provided).
	// enrolledStatic: the user is enrolled in this exact static-course version.
	// enrolledCourse: the user is enrolled in some version of the parent course.
	enrolledStatic := map[string]bool{}
	enrolledCourse := map[string]bool{}
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

	// Assemble DTOs, overriding stored module/topic counts with live values and
	// stamping each with the user's enrollment status.
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

	// total is captured before filtering so the frontend knows how many courses
	// exist in the marketplace regardless of the active filter set.
	total := len(dtos)

	// ── Filter ────────────────────────────────────────────────────────────────

	search := strings.ToLower(r.URL.Query().Get("search"))
	author := strings.ToLower(r.URL.Query().Get("author"))
	status := r.URL.Query().Get("status")
	sizeModMin, hasModMin := intQueryParam(r, "modSizeMin")
	sizeModMax, hasModMax := intQueryParam(r, "modSizeMax")
	sizeTopMin, hasTopMin := intQueryParam(r, "topSizeMin")
	sizeTopMax, hasTopMax := intQueryParam(r, "topSizeMax")

	filtered := dtos[:0]
	for _, dto := range dtos {
		// Free-text search matches name, description, or owner (any field)
		if search != "" &&
			!strings.Contains(strings.ToLower(dto.Name), search) &&
			!strings.Contains(strings.ToLower(dto.Description), search) &&
			!strings.Contains(strings.ToLower(dto.CourseOwner), search) {
			continue
		}

		// Author filter: substring match on owner name
		if author != "" && !strings.Contains(strings.ToLower(dto.CourseOwner), author) {
			continue
		}

		// Status filter: "not enrolled" maps to the empty-string sentinel stored
		// in the DTO (the frontend sends the human-readable label)
		if status != "" {
			want := status
			if want == "not enrolled" {
				want = ""
			}
			if dto.Status != want {
				continue
			}
		}

		// Module-count bounds (both inclusive)
		if hasModMin && dto.NumModules < sizeModMin {
			continue
		}
		if hasModMax && dto.NumModules > sizeModMax {
			continue
		}

		// Topic-count bounds (both inclusive)
		if hasTopMin && dto.NumTopics < sizeTopMin {
			continue
		}
		if hasTopMax && dto.NumTopics > sizeTopMax {
			continue
		}

		filtered = append(filtered, dto)
	}
	dtos = filtered

	// ── Sort ──────────────────────────────────────────────────────────────────

	// Parse sortBy: comma-separated field names, each optionally prefixed with
	// '-' to reverse the order. Multiple fields are applied left-to-right (the
	// first field that differs between two items determines their order).
	var sortFields []string
	var sortFlips []bool
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
		sortFields = append(sortFields, s)
	}

	// Map each field name to its comparator function
	comps := make([]func(*MarketCourseDTO, *MarketCourseDTO, bool) int, 0, len(sortFields))
	for _, s := range sortFields {
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
}

// ── Comparators ───────────────────────────────────────────────────────────────
//
// Each comparator follows the signature func(a, b *MarketCourseDTO, flip bool) int
// and returns Before, Equal, or After (defined in helpers.go).
// When flip is true the result is inverted, giving descending order.

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

// courseCompStatus orders enrolled first, then update, then not-enrolled.
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
