package persistence

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models/market"
)

type SQLStaticCourseContentRepository struct {
	db *sql.DB
}

func NewSQLStaticContentRepository(db *sql.DB) *SQLStaticCourseContentRepository {
	return &SQLStaticCourseContentRepository{db: db}
}

func (r *SQLStaticCourseContentRepository) GetByID(id string) (*market.StaticCourseContent, error) {
	sc := &market.StaticCourseContent{ID: id}
	err := r.db.QueryRow(
		`SELECT published_content FROM static_course_contents WHERE static_course_content_id = ?`, id,
	).Scan(&sc.Content)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("id does not exist")
	}
	if err != nil {
		return nil, err
	}
	return sc, nil
}

func (r *SQLStaticCourseContentRepository) Create(info *StaticContentInfo) (*market.StaticCourseContent, error) {
	res, err := r.db.Exec(
		`INSERT INTO static_course_contents (published_content) VALUES (?)`,
		info.PublishedContent,
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &market.StaticCourseContent{
		ID:      fmt.Sprintf("%d", id),
		Content: []byte(info.PublishedContent),
	}, nil
}

func (r *SQLStaticCourseContentRepository) DeleteByID(id string) error {
	res, err := r.db.Exec(`DELETE FROM static_course_contents WHERE static_course_content_id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("id does not exist")
	}
	return nil
}
