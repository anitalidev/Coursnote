package handlers

import (
	"encoding/json"
	"net/http"
)

func UserSettingsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPut:
		var body struct { // this is the form of JSON that frontend will send back
			BackgroundColour    string `json:"backgroundColour"`
			PrimaryColour       string `json:"primaryColour"`
			GradientColour      string `json:"gradientColour"`
			NavColour           string `json:"navColour"`
			CardColour          string `json:"cardColour"`
			TextColour          string `json:"textColour"`
			AccentColour        string `json:"accentColour"`
			SecondaryTextColour string `json:"secondaryTextColour"`
		}

		err := json.NewDecoder(r.Body).Decode(&body)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		id := r.URL.Query().Get("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "id query param required")
			return
		}

		if err := store.repos.Settings.UpdateSettingsByID(id, body.BackgroundColour, body.PrimaryColour, body.GradientColour, body.NavColour, body.CardColour, body.TextColour, body.AccentColour, body.SecondaryTextColour); err != nil {
			if err.Error() == "settings not found" {
				writeError(w, http.StatusNotFound, err.Error())
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}
