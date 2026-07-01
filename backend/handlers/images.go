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

func ImageHandler(w http.ResponseWriter, r *http.Request) {
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
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] {
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
	io.Copy(dst, file)

	writeJSON(w, http.StatusOK, map[string]string{
		"url": "http://localhost:8081/uploads/" + filename,
	})
}

func AvatarHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodDelete {
		userID := r.URL.Query().Get("userID")
		if userID == "" {
			writeError(w, http.StatusBadRequest, "userID required")
			return
		}
		store.mu.Lock()
		defer store.mu.Unlock()
		store.repos.Users.SetAvatarURL(userID, "")
		w.WriteHeader(http.StatusNoContent)
		return
	}
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
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] {
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
	io.Copy(dst, file)

	url := "http://localhost:8081/uploads/avatars/" + filename

	store.mu.Lock()
	defer store.mu.Unlock()
	if err := store.repos.Users.SetAvatarURL(userID, url); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update avatar")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"avatarURL": url})
}
