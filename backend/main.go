package main

import (
	"log"
	"net/http"

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

	mux := http.NewServeMux()
	mux.HandleFunc("/api/user", handlers.UsersHandler)
	mux.HandleFunc("/api/market", handlers.MarketHandler)
	mux.HandleFunc("/api/course", handlers.CourseHandler)
	mux.HandleFunc("/api/course/publish", handlers.CourseHandler)
	mux.HandleFunc("/api/module", handlers.ModuleHandler)
	mux.HandleFunc("/api/topic", handlers.TopicHandler)
	mux.HandleFunc("/api/coursepages", handlers.CoursePageHandler)
	mux.HandleFunc("/api/privatenotes", handlers.PrivateNoteHandler)

	log.Println("Starting Go backend on :8081")
	log.Fatal(http.ListenAndServe(":8081", withCORS(mux)))
}
