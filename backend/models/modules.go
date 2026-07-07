package models

type Module struct {
	ModuleID string `json:"moduleID"` // self

	Name        string   `json:"name"`
	Description string   `json:"description"`
	TopicIDs    []string `json:"topicIDs"` // owns
	CourseID    string   `json:"courseID"` // owner
}

func (module *Module) addTopic(topicID string) {
	module.TopicIDs = append(module.TopicIDs, topicID)
}
