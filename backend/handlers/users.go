package handlers

import (
	"net/http"
)

type UserDTO struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

func UsersHandler(w http.ResponseWriter, r *http.Request) {

}
