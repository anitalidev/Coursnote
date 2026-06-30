-- Replace the user_static_courses junction table with a first-class enrollment model.

CREATE TABLE IF NOT EXISTS course_enrollments (
    enrollment_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    static_course_id INT NOT NULL,
    enrolled_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)          REFERENCES users(user_id)                   ON DELETE CASCADE,
    FOREIGN KEY (static_course_id) REFERENCES static_courses(static_course_id) ON DELETE CASCADE
);

-- Migrate existing data, then drop the old table.
INSERT IGNORE INTO course_enrollments (user_id, static_course_id)
SELECT user_id, static_course_id FROM user_static_courses;

DROP TABLE IF EXISTS user_static_courses;
