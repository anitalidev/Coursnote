package persistence

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/models/elements"
)

type SQLTopicRepository struct {
	db *DatabaseData
}

func (repo *SQLTopicRepository) GetTopicByID(id string) (*models.Topic, error) {
	topic, ok := repo.db.Topics[id]
	if !ok {
		return nil, errors.New("id does not exist")
	}

	if len(topic.RawElements) > 0 {
		elems, err := elements.UnmarshalElements(topic.RawElements)
		if err != nil {
			return nil, fmt.Errorf("deserializing elements for topic %s: %w", id, err)
		}
		topic.Elements = elems
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
		RawElements:   info.RawElements,
	}
	repo.db.Topics[id] = topic
	module.TopicIDs = append(module.TopicIDs, id)
	return topic, nil
}

func (repo *SQLTopicRepository) UpdateTopic(id string, name string, description string) error {
	topic, ok := repo.db.Topics[id]
	if !ok {
		return errors.New("id does not exist")
	}
	topic.Name = name
	topic.Description = description
	return nil
}

func (repo *SQLTopicRepository) SaveTopicElements(id string, elems []elements.Element) error {
	topic, ok := repo.db.Topics[id]
	if !ok {
		return errors.New("id does not exist")
	}
	raw, err := elements.MarshalElements(elems)
	if err != nil {
		return fmt.Errorf("serializing elements for topic %s: %w", id, err)
	}
	topic.RawElements = json.RawMessage(raw)
	topic.Elements = elems
	return nil
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
