package handlers

// All cascade-delete helpers. Caller must hold store.mu write lock.

func cascadeDeleteTopic(topicID string) {
	topic, _ := store.repos.Topics.GetTopicByID(topicID)
	if topic != nil {
		_ = store.repos.CoursePages.DeleteCoursePageByID(topic.CoursePageID)
		_ = store.repos.PrivateNotes.DeletePrivateNoteByID(topic.PrivateNoteID)
		// Remove topicID from parent module's TopicIDs
		if module, err := store.repos.Modules.GetModuleByID(topic.ModuleID); err == nil {
			filtered := make([]string, 0, len(module.TopicIDs))
			for _, id := range module.TopicIDs {
				if id != topicID {
					filtered = append(filtered, id)
				}
			}
			module.TopicIDs = filtered
		}
	}
	_ = store.repos.Topics.DeleteTopicByID(topicID)
}

func cascadeDeleteModule(moduleID string) {
	module, _ := store.repos.Modules.GetModuleByID(moduleID)
	if module != nil {
		for _, topicID := range module.TopicIDs {
			cascadeDeleteTopic(topicID)
		}
		// Remove moduleID from parent course's ModuleIDs
		if course, err := store.repos.Courses.GetCourseByID(module.CourseID); err == nil {
			filtered := make([]string, 0, len(course.ModuleIDs))
			for _, id := range course.ModuleIDs {
				if id != moduleID {
					filtered = append(filtered, id)
				}
			}
			course.ModuleIDs = filtered
		}
	}
	_ = store.repos.Modules.DeleteModuleByID(moduleID)
}

func cascadeDeleteCourse(courseID string) {
	course, _ := store.repos.Courses.GetCourseByID(courseID)
	if course != nil {
		for _, moduleID := range course.ModuleIDs {
			cascadeDeleteModule(moduleID)
		}
		// Remove courseID from owner user's CourseIDs
		if user, err := store.repos.Users.GetUserByID(course.UserID); err == nil {
			filtered := make([]string, 0, len(user.CourseIDs))
			for _, id := range user.CourseIDs {
				if id != courseID {
					filtered = append(filtered, id)
				}
			}
			user.CourseIDs = filtered
		}
	}
	_ = store.repos.Courses.DeleteCourseByID(courseID)
}

func cascadeDeleteUser(userID string) {
	user, _ := store.repos.Users.GetUserByID(userID)
	if user != nil {
		for _, courseID := range user.CourseIDs {
			cascadeDeleteCourse(courseID)
		}
	}
	_ = store.repos.Users.DeleteUserByID(userID)
}
