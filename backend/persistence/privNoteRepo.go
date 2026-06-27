package persistence

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLPrivateNoteRepository struct {
	db *sql.DB
}

func NewSQLPrivateNoteRepository(db *sql.DB) *SQLPrivateNoteRepository {
	return &SQLPrivateNoteRepository{db: db}
}

func (r *SQLPrivateNoteRepository) GetPrivateNoteByID(id string) (*models.PrivateNote, error) {
	n := &models.PrivateNote{PrivateNoteID: id}
	err := r.db.QueryRow(`SELECT name, description, topic_id FROM private_notes WHERE private_note_id = ?`, id).
		Scan(&n.Name, &n.Description, &n.TopicID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	return n, err
}

func (r *SQLPrivateNoteRepository) CreatePrivateNote(info *PrivateNoteInfo) (*models.PrivateNote, error) {
	res, err := r.db.Exec(
		`INSERT INTO private_notes (name, description, topic_id) VALUES (?, ?, ?)`,
		info.Name, info.Description, info.TopicID,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.PrivateNote{
		PrivateNoteID: fmt.Sprintf("%d", id),
		Name:          info.Name,
		Description:   info.Description,
		TopicID:       info.TopicID,
	}, nil
}

func (r *SQLPrivateNoteRepository) UpdatePrivateNoteDescription(id string, description string) error {
	res, err := r.db.Exec(`UPDATE private_notes SET description = ? WHERE private_note_id = ?`, description, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}

func (r *SQLPrivateNoteRepository) DeletePrivateNoteByID(id string) error {
	res, err := r.db.Exec(`DELETE FROM private_notes WHERE private_note_id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}
