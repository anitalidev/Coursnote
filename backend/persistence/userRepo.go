package persistence

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLUserRepository struct {
	db *sql.DB
}

func NewSQLUserRepository(db *sql.DB) *SQLUserRepository {
	return &SQLUserRepository{db: db}
}

func (r *SQLUserRepository) GetUserByID(id string) (*models.User, error) {
	user := &models.User{UserID: id}
	err := r.db.QueryRow(`SELECT username FROM users WHERE user_id = ?`, id).Scan(&user.Username)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	if err != nil {
		return nil, err
	}
	user.CourseIDs, err = r.courseIDsForUser(id)
	if err != nil {
		return nil, err
	}
	user.StaticCourseIDs, err = r.staticCourseIDsForUser(id)
	return user, err
}

func (r *SQLUserRepository) GetUsernameByID(id string) (string, error) {
	var username string
	err := r.db.QueryRow(`SELECT username FROM users WHERE user_id = ?`, id).Scan(&username)
	if errors.Is(err, sql.ErrNoRows) {
		return "", errors.New("id does not exist")
	}
	return username, err
}

func (r *SQLUserRepository) GetUserByUsername(username string) (*models.User, error) {
	user := &models.User{Username: username}
	err := r.db.QueryRow(`SELECT user_id FROM users WHERE username = ?`, username).Scan(&user.UserID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("username does not exist")
	}
	if err != nil {
		return nil, err
	}
	user.CourseIDs, err = r.courseIDsForUser(user.UserID)
	if err != nil {
		return nil, err
	}
	user.StaticCourseIDs, err = r.staticCourseIDsForUser(user.UserID)
	return user, err
}

func (r *SQLUserRepository) CreateUser(info *UserInfo) (*models.User, error) {
	res, err := r.db.Exec(`INSERT INTO users (username) VALUES (?)`, info.Username)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.User{
		UserID:          fmt.Sprintf("%d", id),
		Username:        info.Username,
		CourseIDs:       []string{},
		StaticCourseIDs: []string{},
	}, nil
}

func (r *SQLUserRepository) DeleteUserByID(id string) error {
	res, err := r.db.Exec(`DELETE FROM users WHERE user_id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}

func (r *SQLUserRepository) GetAllUsers() ([]*models.User, error) {
	rows, err := r.db.Query(`SELECT user_id, username FROM users`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		u := &models.User{}
		if err := rows.Scan(&u.UserID, &u.Username); err != nil {
			return nil, err
		}
		u.CourseIDs, err = r.courseIDsForUser(u.UserID)
		if err != nil {
			return nil, err
		}
		u.StaticCourseIDs, err = r.staticCourseIDsForUser(u.UserID)
		if err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *SQLUserRepository) UnenrollUser(userID string, staticCourseID string) error {
	_, err := r.db.Exec(`DELETE FROM user_static_courses WHERE user_id = ? AND static_course_id = ?`, userID, staticCourseID)
	return err
}

func (r *SQLUserRepository) EnrollUser(userID string, staticCourseID string) error {
	_, err := r.db.Exec(`INSERT IGNORE INTO user_static_courses (user_id, static_course_id) VALUES (?, ?)`, userID, staticCourseID)
	return err
}

func (r *SQLUserRepository) staticCourseIDsForUser(userID string) ([]string, error) {
	rows, err := r.db.Query(`SELECT static_course_id FROM user_static_courses WHERE user_id = ?`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *SQLUserRepository) courseIDsForUser(userID string) ([]string, error) {
	rows, err := r.db.Query(`SELECT course_id FROM courses WHERE user_id = ?`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if ids == nil {
		ids = []string{}
	}
	return ids, rows.Err()
}
