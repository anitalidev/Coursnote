package models

// A struct representing a topic. Belongs to a course and contains topics,
// and other module details
type Module struct {
	ModuleID string   `json:"moduleID"` // self
	CourseID string   `json:"courseID"` // owner
	TopicIDs []string `json:"topicIDs"` // owns

	Name        string `json:"name"`
	Description string `json:"description"`
}

func (module *Module) addTopic(topicID string) {
	module.TopicIDs = append(module.TopicIDs, topicID)
}
