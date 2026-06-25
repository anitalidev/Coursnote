package persistence

import (
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLUserRepository struct {
	db *DatabaseData
}

func (repo *SQLUserRepository) GetUserByID(id string) (*models.User, error) {
	user, ok := repo.db.Users[id]
	if !ok {
		return nil, errors.New("id does not exist")
	}
	return user, nil
}

func (repo *SQLUserRepository) GetUserByUsername(username string) (*models.User, error) {
	for _, user := range repo.db.Users {
		if user.Username == username {
			return user, nil
		}
	}
	return nil, errors.New("username does not exist")
}

func (repo *SQLUserRepository) CreateUser(info *UserInfo) (*models.User, error) {
	repo.db.NextUserId++
	id := fmt.Sprintf("%d", repo.db.NextUserId)
	user := &models.User{
		UserID:    id,
		Username:  info.Username,
		CourseIDs: make([]string, 0),
	}
	repo.db.Users[id] = user
	return user, nil
}

func (repo *SQLUserRepository) DeleteUserByID(id string) error {
	if _, ok := repo.db.Users[id]; !ok {
		return errors.New("id does not exist")
	}
	delete(repo.db.Users, id)
	return nil
}

func (repo *SQLUserRepository) GetAllUsers() ([]*models.User, error) {
	users := make([]*models.User, 0, len(repo.db.Users))
	for _, user := range repo.db.Users {
		users = append(users, user)
	}
	return users, nil
}

func NewSQLUserRepository(db *DatabaseData) *SQLUserRepository {
	return &SQLUserRepository{db: db}
}
