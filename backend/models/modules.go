package models

type Module struct {
	ModuleID string `json:"moduleID"` // self

	Name        string   `json:"name"`
	Description string   `json:"description"`
	TopicIDs    []string `json:"topicIDs"` // owns
	CourseID    string   `json:"courseID"` // owner
}

func newModule(moduleID string, name string, desc string, courseID string) *Module {
	return &Module{
		ModuleID:    moduleID,
		Name:        name,
		Description: desc,
		TopicIDs:    make([]string, 0, 15),
		CourseID:    courseID,
	}
}

func (module *Module) addTopic(topicID string) {
	module.TopicIDs = append(module.TopicIDs, topicID)
}
