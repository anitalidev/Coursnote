package handlers

// Cascade deletes are handled by MySQL ON DELETE CASCADE foreign keys.
// These helpers exist so call sites don't need to change.

func cascadeDeleteTopic(topicID string) {
	_ = store.repos.Topics.DeleteTopicByID(topicID)
}

func cascadeDeleteModule(moduleID string) {
	_ = store.repos.Modules.DeleteModuleByID(moduleID)
}

func cascadeDeleteCourse(courseID string) {
	_ = store.repos.Courses.DeleteCourseByID(courseID)
}

func cascadeDeleteUser(userID string) {
	_ = store.repos.Users.DeleteUserByID(userID)
}
