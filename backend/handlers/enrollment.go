package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/models/market"
)

// ── Helper ────────────────────────────────────────────────────────────────────

// progressKeyRe validates progress map keys. Keys must be topic IDs or
// persistent element IDs — anything outside this alphabet is a malformed or
// malicious payload.
var progressKeyRe = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)

// validProgressKeys returns false if any key across all progress maps fails the
// allowlist check.
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

// ── Handlers ──────────────────────────────────────────────────────────────────

// OVERALL: POST (enroll) a user in a specific static course version
// RQBODY: userID, staticCourseID (required)
// BADREQ: if userID or staticCourseID is missing
// SERVER: if an internal error occurs creating the enrollment
func PostEnroll(w http.ResponseWriter, r *http.Request) {
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

	if _, err := store.repos.Enrollments.Create(body.UserID, body.StaticCourseID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// OVERALL: POST (update) a user's enrollment to a newer version of the same course
// RQBODY: userID, staticCourseID (required) — staticCourseID is the target version to switch to
// BADREQ: if userID or staticCourseID is missing
// NOTFND: if staticCourseID does not exist
// SERVER: if an internal error occurs updating or creating the enrollment
func UpdateEnroll(w http.ResponseWriter, r *http.Request) {
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
		// Enrollment for this course already exists — switch it to the new version
		if err := store.repos.Enrollments.UpdateStaticCourse(existing.ID, body.StaticCourseID); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		// No enrollment yet — create a fresh one for this version
		if _, err := store.repos.Enrollments.Create(body.UserID, body.StaticCourseID); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// OVERALL: GET all courses a user is enrolled in, including their current progress
// QPARAM: userID (non-empty)
// BADREQ: if userID query param is missing/empty
// SERVER: if an internal error occurs fetching enrollments or static courses
// WRITES: JSON representing a []MarketCourseDTO with Progress and EnrolledAt populated
func GetEnrolledCourses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID := r.URL.Query().Get("userID")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "userID query param required")
		return
	}

	enrollments, err := store.repos.Enrollments.GetByUserID(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Batch-fetch all static courses for the user's enrollments in one query
	scIDs := make([]string, 0, len(enrollments))
	for _, e := range enrollments {
		scIDs = append(scIDs, e.StaticCourseID)
	}
	scs, err := store.repos.StaticCourses.GetByIDs(scIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Index by ID for O(1) lookup below
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
			ModuleProgress:      e.ModuleProgress,
			EnrolledAt:          &enrolledAt,
		})
	}
	writeJSON(w, http.StatusOK, dtos)
}

// OVERALL: GET a user's progress in a specific enrolled course
// QPARAM: userID, staticCourseID (both non-empty)
// BADREQ: if either query param is missing/empty
// NOTFND: if no enrollment exists for this user + staticCourse combination
// SERVER: if an internal error occurs
// WRITES: JSON representing the EnrollmentProgress for that enrollment
func GetEnrollmentProgress(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userID")
	staticCourseID := r.URL.Query().Get("staticCourseID")
	if userID == "" || staticCourseID == "" {
		writeError(w, http.StatusBadRequest, "userID and staticCourseID query params required")
		return
	}

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
}

// OVERALL: PUT (replace) a user's progress in a specific enrolled course
// RQBODY: userID, staticCourseID (required); progress, percentageCompleted, moduleProgress (optional)
// BADREQ: if userID or staticCourseID is missing, or if any progress map key is malformed
// NOTFND: if no enrollment exists for this user + staticCourse combination
// SERVER: if an internal error occurs updating progress
func PutEnrollmentProgress(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var body struct {
		UserID              string                    `json:"userID"`
		StaticCourseID      string                    `json:"staticCourseID"`
		Progress            models.EnrollmentProgress `json:"progress"`
		PercentageCompleted int                       `json:"percentageCompleted"`
		ModuleProgress      map[string]int            `json:"moduleProgress"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.UserID == "" || body.StaticCourseID == "" {
		writeError(w, http.StatusBadRequest, "userID, staticCourseID and progress required")
		return
	}
	if !validProgressKeys(body.Progress) {
		writeError(w, http.StatusBadRequest, "invalid progress keys")
		return
	}

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
	if err := store.repos.Enrollments.UpdateModuleProgress(body.UserID, body.StaticCourseID, body.ModuleProgress); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
