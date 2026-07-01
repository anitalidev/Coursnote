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
	var rawElements sql.NullString
	err := r.db.QueryRow(`SELECT name, description, module_id, raw_elements FROM topics WHERE topic_id = ?`, id).
		Scan(&t.Name, &t.Description, &t.ModuleID, &rawElements)
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

	res, err := r.db.Exec(
		`INSERT INTO topics (name, description, module_id, raw_elements) VALUES (?, ?, ?, ?)`,
		info.Name, info.Description, info.ModuleID, rawElements,
	)
	// completed defaults to FALSE on insert
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
	}, nil
}

func (r *SQLTopicRepository) UpdateTopic(id string, name string, description string) error {
	res, err := r.db.Exec(`UPDATE topics SET name = ?, description = ? WHERE topic_id = ?`, name, description, id)
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

// SaveTopicAnswer updates LastChosen on a single question inside raw_elements.
// cellIdx is the index into the elements array. qi is the question index within
// a questionSlide (-1 means the element itself is a plain question).
func (r *SQLTopicRepository) SaveTopicAnswer(id string, cellIdx int, qi int, chosen int) error {
	var rawStr sql.NullString
	err := r.db.QueryRow(`SELECT raw_elements FROM topics WHERE topic_id = ?`, id).Scan(&rawStr)
	if err != nil || !rawStr.Valid {
		return fmt.Errorf("topic %s not found", id)
	}

	elems, err := elements.UnmarshalElements(json.RawMessage(rawStr.String))
	if err != nil {
		return fmt.Errorf("deserializing elements: %w", err)
	}
	if cellIdx < 0 || cellIdx >= len(elems) {
		return fmt.Errorf("cellIdx %d out of range", cellIdx)
	}

	switch el := elems[cellIdx].(type) {
	case *elements.Question:
		el.LastChosen = &chosen
	case *elements.QuestionSlide:
		if qi < 0 || qi >= len(el.Questions) {
			return fmt.Errorf("qi %d out of range", qi)
		}
		el.Questions[qi].LastChosen = &chosen
	default:
		return fmt.Errorf("element at index %d is not a question type", cellIdx)
	}

	raw, err := elements.MarshalElements(elems)
	if err != nil {
		return fmt.Errorf("serializing elements: %w", err)
	}
	_, err = r.db.Exec(`UPDATE topics SET raw_elements = ? WHERE topic_id = ?`, string(raw), id)
	return err
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
