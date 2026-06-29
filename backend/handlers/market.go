package handlers

import "net/http"

func MarketHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
