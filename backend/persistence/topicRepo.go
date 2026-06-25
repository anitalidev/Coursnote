package persistence

import (
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLTopicRepository struct {
	db *DatabaseData
}

func (repo *SQLTopicRepository) GetTopicByID(id string) (*models.Topic, error) {
	topic, ok := repo.db.Topics[id]
	if !ok {
		return nil, errors.New("id does not exist")
	}
	return topic, nil
}

func (repo *SQLTopicRepository) CreateTopic(info *TopicInfo) (*models.Topic, error) {
	module, ok := repo.db.Modules[info.ModuleID]
	if !ok {
		return nil, errors.New("module id does not exist")
	}
	repo.db.NextTopicId++
	id := fmt.Sprintf("%d", repo.db.NextTopicId)
	topic := &models.Topic{
		TopicID:       id,
		Name:          info.Name,
		Description:   info.Description,
		ModuleID:      info.ModuleID,
		PrivateNoteID: info.PrivateNoteID,
		CoursePageID:  info.CoursePageID,
	}
	repo.db.Topics[id] = topic
	module.TopicIDs = append(module.TopicIDs, id)
	return topic, nil
}

func (repo *SQLTopicRepository) DeleteTopicByID(id string) error {
	if _, ok := repo.db.Topics[id]; !ok {
		return errors.New("id does not exist")
	}
	delete(repo.db.Topics, id)
	return nil
}

func NewSQLTopicRepository(db *DatabaseData) *SQLTopicRepository {
	return &SQLTopicRepository{db: db}
}
