package persistence

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
	"github.com/anitalidev/Coursnote/backend/models/elements"
)

type SQLTopicRepository struct {
	db *sql.DB
}

func NewSQLTopicRepository(db *sql.DB) *SQLTopicRepository {
	return &SQLTopicRepository{db: db}
}

func (r *SQLTopicRepository) GetTopicByID(id string) (*models.Topic, error) {
	t := &models.Topic{TopicID: id}
	var rawElements, rawCompRules sql.NullString
	err := r.db.QueryRow(`SELECT name, description, module_id, raw_elements, comp_rules FROM topics WHERE topic_id = ?`, id).
		Scan(&t.Name, &t.Description, &t.ModuleID, &rawElements, &rawCompRules)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	if err != nil {
		return nil, err
	}

	// Load associated course_page and private_note IDs
	r.db.QueryRow(`SELECT course_page_id FROM course_pages WHERE topic_id = ?`, id).Scan(&t.CoursePageID)
	r.db.QueryRow(`SELECT private_note_id FROM private_notes WHERE topic_id = ?`, id).Scan(&t.PrivateNoteID)

	if rawElements.Valid && len(rawElements.String) > 0 {
		t.RawElements = json.RawMessage(rawElements.String)
		elems, err := elements.UnmarshalElements(t.RawElements)
		if err != nil {
			return nil, fmt.Errorf("deserializing elements for topic %s: %w", id, err)
		}
		t.Elements = elems
	}

	if rawCompRules.Valid && len(rawCompRules.String) > 0 {
		if err := json.Unmarshal([]byte(rawCompRules.String), &t.CompRules); err != nil {
			return nil, fmt.Errorf("deserializing comp_rules for topic %s: %w", id, err)
		}
	}

	return t, nil
}

func (r *SQLTopicRepository) CreateTopic(info *TopicInfo) (*models.Topic, error) {
	var exists int
	if err := r.db.QueryRow(`SELECT 1 FROM modules WHERE module_id = ?`, info.ModuleID).Scan(&exists); err != nil {
		return nil, errors.New("module id does not exist")
	}

	var rawElements sql.NullString
	if len(info.RawElements) > 0 {
		rawElements = sql.NullString{String: string(info.RawElements), Valid: true}
	}

	var rawCompRules sql.NullString
	if len(info.CompRules) > 0 {
		b, err := json.Marshal(info.CompRules)
		if err != nil {
			return nil, fmt.Errorf("serializing comp_rules: %w", err)
		}
		rawCompRules = sql.NullString{String: string(b), Valid: true}
	}

	res, err := r.db.Exec(
		`INSERT INTO topics (name, description, module_id, raw_elements, comp_rules) VALUES (?, ?, ?, ?, ?)`,
		info.Name, info.Description, info.ModuleID, rawElements, rawCompRules,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.Topic{
		TopicID:       fmt.Sprintf("%d", id),
		Name:          info.Name,
		Description:   info.Description,
		ModuleID:      info.ModuleID,
		PrivateNoteID: info.PrivateNoteID,
		CoursePageID:  info.CoursePageID,
		RawElements:   info.RawElements,
		CompRules:     info.CompRules,
	}, nil
}

func (r *SQLTopicRepository) UpdateTopic(id string, name string, description string, compRules []models.CompletionRule) error {
	var rawCompRules sql.NullString
	if len(compRules) > 0 {
		b, err := json.Marshal(compRules)
		if err != nil {
			return fmt.Errorf("serializing comp_rules: %w", err)
		}
		rawCompRules = sql.NullString{String: string(b), Valid: true}
	}
	res, err := r.db.Exec(`UPDATE topics SET name = ?, description = ?, comp_rules = ? WHERE topic_id = ?`, name, description, rawCompRules, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}

func (r *SQLTopicRepository) SaveTopicElements(id string, elems []elements.Element) error {
	raw, err := elements.MarshalElements(elems)
	if err != nil {
		return fmt.Errorf("serializing elements for topic %s: %w", id, err)
	}
	res, err := r.db.Exec(`UPDATE topics SET raw_elements = ? WHERE topic_id = ?`, string(raw), id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}



func (r *SQLTopicRepository) DeleteTopicByID(id string) error {
	res, err := r.db.Exec(`DELETE FROM topics WHERE topic_id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}
