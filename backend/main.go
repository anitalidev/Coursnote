package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"

	"github.com/anitalidev/Coursnote/backend/handlers"
	"github.com/anitalidev/Coursnote/backend/persistence"
	"github.com/joho/godotenv"
)

func withCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		h.ServeHTTP(w, r)
	})
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	db, err := persistence.OpenDB()
	if err != nil {
		log.Fatalf("Failed to connect to MySQL: %v", err)
	}
	defer db.Close()

	handlers.InitStore(db)

	_, file, _, _ := runtime.Caller(0)
	frontendAssets := filepath.Join(filepath.Dir(file), "..", "frontend", "assets")
	frontendDist := filepath.Join(filepath.Dir(file), "..", "frontend", "dist")
	distFS := http.FileServer(http.Dir(frontendDist))

	mux := http.NewServeMux()
	mux.Handle("/static/assets/", http.StripPrefix("/static/assets/", http.FileServer(http.Dir(frontendAssets))))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))
	// Serve built frontend assets (JS/CSS bundles from vite build)
	mux.Handle("/assets/", distFS)
	mux.HandleFunc("/api/image", handlers.ImageHandler)
	mux.HandleFunc("/api/user/avatar", handlers.AvatarHandler)
	mux.HandleFunc("/api/staticcontent", handlers.StaticContentHandler)
	mux.HandleFunc("/api/user", handlers.UsersHandler)
	mux.HandleFunc("/api/market", handlers.MarketHandler)
	mux.HandleFunc("/api/course", handlers.CourseHandler)
	mux.HandleFunc("/api/course/publish", handlers.CourseHandler)
	mux.HandleFunc("/api/course/versions", handlers.CourseVersionsHandler)
	mux.HandleFunc("/api/course/enroll", handlers.EnrollHandler)
	mux.HandleFunc("/api/course/update-enroll", handlers.UpdateEnrollHandler)
	mux.HandleFunc("/api/course/enrolled", handlers.EnrolledCoursesHandler)
	mux.HandleFunc("/api/module", handlers.ModuleHandler)
	mux.HandleFunc("/api/topic", handlers.TopicHandler)
	mux.HandleFunc("/api/topic/answer", handlers.TopicAnswerHandler)
	mux.HandleFunc("/api/coursepages", handlers.CoursePageHandler)
	mux.HandleFunc("/api/privatenotes", handlers.PrivateNoteHandler)
	// SPA fallback: serve index.html for any non-API, non-asset route
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		indexPath := filepath.Join(frontendDist, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			http.ServeFile(w, r, indexPath)
		} else {
			http.NotFound(w, r)
		}
	})

	log.Println("Starting Go backend on :8081")
	log.Fatal(http.ListenAndServe(":8081", withCORS(mux)))
}
