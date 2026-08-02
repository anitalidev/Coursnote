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

	frontendAssets := os.Getenv("FRONTEND_ASSETS")
	frontendDist := os.Getenv("FRONTEND_DIST")
	if frontendAssets == "" || frontendDist == "" {
		_, file, _, _ := runtime.Caller(0)
		base := filepath.Join(filepath.Dir(file), "..")
		if frontendAssets == "" {
			frontendAssets = filepath.Join(base, "frontend", "assets")
		}
		if frontendDist == "" {
			frontendDist = filepath.Join(base, "frontend", "dist")
		}
	}
	distFS := http.FileServer(http.Dir(frontendDist))

	mux := http.NewServeMux()
	mux.Handle("/static/assets/", http.StripPrefix("/static/assets/", http.FileServer(http.Dir(frontendAssets))))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))
	mux.Handle("/assets/", distFS)

	// users.go
	mux.HandleFunc("GET /api/user/{id}", handlers.GetUserByID)
	mux.HandleFunc("GET /api/user", handlers.GetUserByUsername)
	mux.HandleFunc("POST /api/user", handlers.PostUser)
	mux.HandleFunc("DELETE /api/user/{id}", handlers.DeleteUser)

	// topics.go
	mux.HandleFunc("GET /api/topic", handlers.GetTopic)
	mux.HandleFunc("POST /api/topic", handlers.PostTopic)
	mux.HandleFunc("PUT /api/topic", handlers.PutTopic)
	mux.HandleFunc("DELETE /api/topic", handlers.DeleteTopic)

	// staticContent.go
	mux.HandleFunc("GET /api/staticcontent", handlers.GetStaticContent)

	// privateNotes.go
	mux.HandleFunc("GET /api/privatenotes", handlers.GetPrivateNote)
	mux.HandleFunc("PUT /api/privatenotes", handlers.PutPrivateNote)
	mux.HandleFunc("DELETE /api/privatenotes", handlers.DeletePrivateNote)

	// images.go
	mux.HandleFunc("POST /api/image", handlers.PostImage)
	mux.HandleFunc("POST /api/user/avatar", handlers.PostAvatar)
	mux.HandleFunc("DELETE /api/user/avatar", handlers.DeleteAvatar)

	// market.go
	mux.HandleFunc("GET /api/market", handlers.MarketHandler)

	// courses.go
	mux.HandleFunc("GET /api/courses", handlers.GetCoursesByUser)
	mux.HandleFunc("GET /api/course", handlers.GetCourse)
	mux.HandleFunc("POST /api/course", handlers.PostCourse)
	mux.HandleFunc("POST /api/course/publish", handlers.PublishCourse)
	mux.HandleFunc("PUT /api/course", handlers.PutCourse)
	mux.HandleFunc("DELETE /api/course", handlers.DeleteCourse)
	mux.HandleFunc("GET /api/course/versions", handlers.GetCourseVersions)

	// enrollment.go
	mux.HandleFunc("POST /api/course/enroll", handlers.PostEnroll)
	mux.HandleFunc("POST /api/course/update-enroll", handlers.UpdateEnroll)
	mux.HandleFunc("GET /api/course/enrolled", handlers.GetEnrolledCourses)
	mux.HandleFunc("GET /api/course/progress", handlers.GetEnrollmentProgress)
	mux.HandleFunc("PUT /api/course/progress", handlers.PutEnrollmentProgress)

	// modules.go
	mux.HandleFunc("GET /api/module", handlers.GetModule)
	mux.HandleFunc("POST /api/module", handlers.PostModule)
	mux.HandleFunc("PUT /api/module", handlers.PutModule)
	mux.HandleFunc("DELETE /api/module", handlers.DeleteModule)

	// coursePages.go
	mux.HandleFunc("GET /api/coursepages", handlers.GetCoursePage)
	mux.HandleFunc("PUT /api/coursepages", handlers.PutCoursePage)
	mux.HandleFunc("DELETE /api/coursepages", handlers.DeleteCoursePage)

	// usersettings.go
	mux.HandleFunc("PUT /api/usersettings", handlers.UserSettingsHandler)

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
