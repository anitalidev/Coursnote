package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ── Helper ────────────────────────────────────────────────────────────────────

// allowedImageExts is the set of file extensions accepted for all image uploads.
var allowedImageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// OVERALL: POST an image file for use inside a course page
// RQBODY: multipart/form-data with field "image" (jpg, jpeg, png, gif, or webp; max 10 MB)
// BADREQ: if the form cannot be parsed, the "image" field is absent, or the extension is unsupported
// SERVER: if the upload directory cannot be created or the file cannot be saved
// WRITES: JSON with { url: string } — the URL at which the saved image can be fetched
func PostImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		writeError(w, http.StatusBadRequest, "image field required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedImageExts[ext] {
		writeError(w, http.StatusBadRequest, "unsupported image type")
		return
	}

	if err := os.MkdirAll("uploads", 0755); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create uploads dir")
		return
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	dst, err := os.Create(filepath.Join("uploads", filename))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save file")
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		writeError(w, http.StatusInternalServerError, "could not write file")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"url": "http://localhost:8081/uploads/" + filename,
	})
}

// OVERALL: POST (upload) a new avatar image for the given user
// QPARAM: userID (non-empty)
// RQBODY: multipart/form-data with field "avatar" (jpg, jpeg, png, gif, or webp; max 5 MB)
// BADREQ: if userID is absent, the form cannot be parsed, the "avatar" field is absent, or the extension is unsupported
// SERVER: if the upload directory cannot be created, the file cannot be saved, or the user record cannot be updated
// WRITES: JSON with { avatarURL: string } — the URL at which the saved avatar can be fetched
func PostAvatar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := r.URL.Query().Get("userID")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "userID required")
		return
	}

	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid")
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		writeError(w, http.StatusBadRequest, "avatar field required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedImageExts[ext] {
		writeError(w, http.StatusBadRequest, "unsupported image type")
		return
	}

	if err := os.MkdirAll("uploads/avatars", 0755); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create avatars dir")
		return
	}

	filename := fmt.Sprintf("avatar_%s_%d%s", userID, time.Now().UnixNano(), ext)
	dst, err := os.Create(filepath.Join("uploads", "avatars", filename))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save file")
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		writeError(w, http.StatusInternalServerError, "could not write file")
		return
	}

	url := "http://localhost:8081/uploads/avatars/" + filename

	store.mu.Lock()
	defer store.mu.Unlock()
	if err := store.repos.Users.SetAvatarURL(userID, url); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update avatar")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"avatarURL": url})
}

// OVERALL: DELETE (clear) the avatar for the given user
// QPARAM: userID (non-empty)
// BADREQ: if userID is absent
// SERVER: if the user record cannot be updated
func DeleteAvatar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := r.URL.Query().Get("userID")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "userID required")
		return
	}

	store.mu.Lock()
	defer store.mu.Unlock()
	if err := store.repos.Users.SetAvatarURL(userID, ""); err != nil {
		writeError(w, http.StatusInternalServerError, "could not clear avatar")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
