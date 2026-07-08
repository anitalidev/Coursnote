package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/models/market"
)

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

	existing, err := store.repos.Enrollments.GetByUserAndCourseID(body.UserID, newSC.CourseID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if existing != nil {
		if err := store.repos.Enrollments.UpdateStaticCourse(existing.ID, body.StaticCourseID); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		if _, err := store.repos.Enrollments.Create(body.UserID, body.StaticCourseID); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
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

	enrollments, err := store.repos.Enrollments.GetByUserID(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	scIDs := make([]string, 0, len(enrollments))

	for _, e := range enrollments {
		scIDs = append(scIDs, e.StaticCourseID)
	}

	scs, err := store.repos.StaticCourses.GetByIDs(scIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	scMap := make(map[string]*market.StaticCourse, len(scs))
	for _, sc := range scs {
		scMap[sc.ID] = sc
	}

	dtos := make([]MarketCourseDTO, 0, len(enrollments))
	for _, e := range enrollments {
		sc, ok := scMap[e.StaticCourseID]
		if !ok {
			continue
		}
		enrolledAt := e.EnrolledAt
		dtos = append(dtos, MarketCourseDTO{
			ID:                  sc.ID,
			CourseID:            sc.CourseID,
			ContentID:           sc.ContentID,
			Name:                sc.Name,
			Description:         sc.Description,
			LeftColour:          sc.LeftColour,
			RightColour:         sc.RightColour,
			PublishDate:         sc.PublishDate,
			NumModules:          sc.NumModules,
			NumTopics:           sc.NumTopics,
			CourseOwner:         sc.CourseOwner,
			IsActive:            sc.IsActive,
			Progress:            &e.Progress,
			CompletedPercentage: e.CompletedPercentage,
			EnrolledAt:          &enrolledAt,
		})
	}
	writeJSON(w, http.StatusOK, dtos)
}

func EnrollHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
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

		if _, err := store.repos.Enrollments.Create(body.UserID, body.StaticCourseID); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
}

// Progress map keys are topic ids or persistent element ids; anything else is
// a malformed or malicious client.
var progressKeyRe = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)

func validProgressKeys(p models.EnrollmentProgress) bool {
	for k := range p.ManuallyMarked {
		if !progressKeyRe.MatchString(k) {
			return false
		}
	}
	for k := range p.TimeSpent {
		if !progressKeyRe.MatchString(k) {
			return false
		}
	}
	for k := range p.ReadToBottom {
		if !progressKeyRe.MatchString(k) {
			return false
		}
	}
	for k := range p.LastAnswered {
		if !progressKeyRe.MatchString(k) {
			return false
		}
	}
	return true
}

// EnrollmentProgressHandler reads (GET) or replaces (PUT) the per-user
// progress stored on an enrollment, keyed by userID + staticCourseID.
func EnrollmentProgressHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		userID := r.URL.Query().Get("userID")
		staticCourseID := r.URL.Query().Get("staticCourseID")
		if userID == "" || staticCourseID == "" {
			writeError(w, http.StatusBadRequest, "userID and staticCourseID query params required")
			return
		}
		store.mu.RLock()
		defer store.mu.RUnlock()

		e, err := store.repos.Enrollments.GetByUserAndStaticCourseID(userID, staticCourseID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if e == nil {
			writeError(w, http.StatusNotFound, "enrollment not found")
			return
		}
		writeJSON(w, http.StatusOK, e.Progress)

	case http.MethodPut:
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
		var body struct {
			UserID              string                    `json:"userID"`
			StaticCourseID      string                    `json:"staticCourseID"`
			Progress            models.EnrollmentProgress `json:"progress"`
			PercentageCompleted int                       `json:"percentageCompleted"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == "" || body.StaticCourseID == "" {
			writeError(w, http.StatusBadRequest, "userID, staticCourseID and progress required")
			return
		}
		if !validProgressKeys(body.Progress) {
			writeError(w, http.StatusBadRequest, "invalid progress keys")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()

		if err := store.repos.Enrollments.UpdateProgress(body.UserID, body.StaticCourseID, body.Progress); err != nil {
			if err.Error() == "enrollment not found" {
				writeError(w, http.StatusNotFound, err.Error())
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		if err := store.repos.Enrollments.UpdatePercentageCompleted(body.UserID, body.StaticCourseID, body.PercentageCompleted); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
