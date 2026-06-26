package persistence

import (
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLPrivateNoteRepository struct {
	db *DatabaseData
}

func (repo *SQLPrivateNoteRepository) GetPrivateNoteByID(id string) (*models.PrivateNote, error) {
	note, ok := repo.db.PrivateNotes[id]
	if !ok {
		return nil, errors.New("id does not exist")
	}
	return note, nil
}

func (repo *SQLPrivateNoteRepository) CreatePrivateNote(info *PrivateNoteInfo) (*models.PrivateNote, error) {
	repo.db.NextPrivateNoteId++
	id := fmt.Sprintf("%d", repo.db.NextPrivateNoteId)
	note := &models.PrivateNote{
		PrivateNoteID: id,
		Name:          info.Name,
		Description:   info.Description,
		TopicID:       info.TopicID,
	}
	repo.db.PrivateNotes[id] = note
	return note, nil
}

func (repo *SQLPrivateNoteRepository) UpdatePrivateNoteDescription(id string, description string) error {
	note, ok := repo.db.PrivateNotes[id]
	if !ok {
		return errors.New("id does not exist")
	}
	note.Description = description
	return nil
}

func (repo *SQLPrivateNoteRepository) DeletePrivateNoteByID(id string) error {
	if _, ok := repo.db.PrivateNotes[id]; !ok {
		return errors.New("id does not exist")
	}
	delete(repo.db.PrivateNotes, id)
	return nil
}

func NewSQLPrivateNoteRepository(db *DatabaseData) *SQLPrivateNoteRepository {
	return &SQLPrivateNoteRepository{db: db}
}
