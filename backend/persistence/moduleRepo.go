package persistence

import (
	"errors"
	"fmt"

	"github.com/anitalidev/Coursnote/backend/models"
)

type SQLModuleRepository struct {
	db *DatabaseData
}

func (repo *SQLModuleRepository) GetModuleByID(id string) (*models.Module, error) {
	module, ok := repo.db.Modules[id]
	if !ok {
		return nil, errors.New("id does not exist")
	}
	return module, nil
}

func (repo *SQLModuleRepository) CreateModule(info *ModuleInfo) (*models.Module, error) {
	course, ok := repo.db.Courses[info.CourseID]
	if !ok {
		return nil, errors.New("course id does not exist")
	}
	repo.db.NextModuleId++
	id := fmt.Sprintf("%d", repo.db.NextModuleId)
	module := &models.Module{
		ModuleID:    id,
		Name:        info.Name,
		Description: info.Description,
		TopicIDs:    make([]string, 0),
		CourseID:    info.CourseID,
	}
	repo.db.Modules[id] = module
	course.ModuleIDs = append(course.ModuleIDs, id)
	return module, nil
}

func (repo *SQLModuleRepository) UpdateModule(id string, name string, description string) error {
	module, ok := repo.db.Modules[id]
	if !ok {
		return errors.New("id does not exist")
	}
	module.Name = name
	module.Description = description
	return nil
}

func (repo *SQLModuleRepository) DeleteModuleByID(id string) error {
	if _, ok := repo.db.Modules[id]; !ok {
		return errors.New("id does not exist")
	}
	delete(repo.db.Modules, id)
	return nil
}

func NewSQLModuleRepository(db *DatabaseData) *SQLModuleRepository {
	return &SQLModuleRepository{db: db}
}
