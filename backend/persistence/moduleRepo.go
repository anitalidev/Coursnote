package persistence

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLModuleRepository struct {
	db *sql.DB
}

func NewSQLModuleRepository(db *sql.DB) *SQLModuleRepository {
	return &SQLModuleRepository{db: db}
}

func (r *SQLModuleRepository) GetModuleByID(id string) (*models.Module, error) {
	m := &models.Module{ModuleID: id}
	err := r.db.QueryRow(`SELECT name, description, course_id FROM modules WHERE module_id = ?`, id).
		Scan(&m.Name, &m.Description, &m.CourseID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	if err != nil {
		return nil, err
	}
	m.TopicIDs, err = r.topicIDsForModule(id)
	return m, err
}

func (r *SQLModuleRepository) CreateModule(info *ModuleInfo) (*models.Module, error) {
	// Verify course exists
	var exists int
	if err := r.db.QueryRow(`SELECT 1 FROM courses WHERE course_id = ?`, info.CourseID).Scan(&exists); err != nil {
		return nil, errors.New("course id does not exist")
	}
	res, err := r.db.Exec(
		`INSERT INTO modules (name, description, course_id) VALUES (?, ?, ?)`,
		info.Name, info.Description, info.CourseID,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.Module{
		ModuleID:    fmt.Sprintf("%d", id),
		Name:        info.Name,
		Description: info.Description,
		CourseID:    info.CourseID,
		TopicIDs:    []string{},
	}, nil
}

func (r *SQLModuleRepository) UpdateModule(id string, name string, description string) error {
	res, err := r.db.Exec(`UPDATE modules SET name = ?, description = ? WHERE module_id = ?`, name, description, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}

func (r *SQLModuleRepository) DeleteModuleByID(id string) error {
	res, err := r.db.Exec(`DELETE FROM modules WHERE module_id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}

func (r *SQLModuleRepository) topicIDsForModule(moduleID string) ([]string, error) {
	rows, err := r.db.Query(`SELECT topic_id FROM topics WHERE module_id = ?`, moduleID)
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
