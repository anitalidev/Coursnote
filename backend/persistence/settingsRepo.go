package persistence

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLSettingsRepository struct {
	db *sql.DB
}

func NewSQLSettingsRepository(db *sql.DB) *SQLSettingsRepository {
	return &SQLSettingsRepository{db: db}
}

func (r *SQLSettingsRepository) Create() (*models.UserWebSettings, error) {
	res, err := r.db.Exec(
		`INSERT INTO user_settings (background_colour, primary_colour, gradient_colour, nav_colour, card_colour, text_colour, accent_colour, secondary_text_colour) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		"#0f1117", "#6c8ef7", "#a78bfa", "#1a1d27", "#1e2235", "#e2e8f0", "#2e3352", "#94a3b8",
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &models.UserWebSettings{
		ID:               fmt.Sprintf("%d", id),
		BackgroundColour: "#0f1117",
		PrimaryColour:    "#6c8ef7",
		GradientColour:   "#a78bfa",
		NavColour:        "#1a1d27",
		CardColour:       "#1e2235",
		TextColour:       "#e2e8f0",
		AccentColour:          "#2e3352",
		SecondaryTextColour:   "#94a3b8",
	}, nil
}

func (r *SQLSettingsRepository) UpdateSettingsByID(id, backgroundColour, primaryColour, gradientColour, navColour, cardColour, textColour, accentColour, secondaryTextColour string) error {
	res, err := r.db.Exec(
		`UPDATE user_settings SET background_colour = ?, primary_colour = ?, gradient_colour = ?, nav_colour = ?, card_colour = ?, text_colour = ?, accent_colour = ?, secondary_text_colour = ? WHERE settings_id = ?`,
		backgroundColour, primaryColour, gradientColour, navColour, cardColour, textColour, accentColour, secondaryTextColour, id,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("settings not found")
	}
	return nil
}

func (r *SQLSettingsRepository) GetByID(id string) (*models.UserWebSettings, error) {
	s := &models.UserWebSettings{ID: id}
	err := r.db.QueryRow(
		`SELECT background_colour, primary_colour, gradient_colour,
		        COALESCE(nav_colour, '#1a1d27'), COALESCE(card_colour, '#1e2235'),
		        COALESCE(text_colour, '#e2e8f0'), COALESCE(accent_colour, '#2e3352'),
		        COALESCE(secondary_text_colour, '#94a3b8')
		 FROM user_settings WHERE settings_id = ?`, id,
	).Scan(&s.BackgroundColour, &s.PrimaryColour, &s.GradientColour, &s.NavColour, &s.CardColour, &s.TextColour, &s.AccentColour, &s.SecondaryTextColour)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("settings not found")
	}
	if err != nil {
		return nil, err
	}
	return s, nil
}
