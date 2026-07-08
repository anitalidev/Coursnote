CREATE DATABASE IF NOT EXISTS coursnote;
USE coursnote;

CREATE TABLE IF NOT EXISTS user_settings (
    settings_id       INT AUTO_INCREMENT PRIMARY KEY,
    background_colour VARCHAR(7)  NOT NULL DEFAULT '#0f1117',
    primary_colour    VARCHAR(7)  NOT NULL DEFAULT '#6c8ef7',
    gradient_colour   VARCHAR(7)  NOT NULL DEFAULT '#a78bfa'
);

CREATE TABLE IF NOT EXISTS users (
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(255) NOT NULL UNIQUE,
    avatar_url  VARCHAR(512),
    settings_id INT NOT NULL,
    FOREIGN KEY (settings_id) REFERENCES user_settings(settings_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS courses (
    course_id        INT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    user_id          INT NOT NULL,
    left_colour      VARCHAR(7) NOT NULL DEFAULT '#000000',
    right_colour     VARCHAR(7) NOT NULL DEFAULT '#000000',
    static_course_id VARCHAR(255) NOT NULL DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS modules (
    module_id   INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    course_id   INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topics (
    topic_id    INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    module_id   INT NOT NULL,
    comp_rules  TEXT,
    FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_pages (
    course_page_id INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    topic_id       INT NOT NULL UNIQUE,
    raw_elements   LONGTEXT,
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS private_notes (
    private_note_id INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    topic_id        INT NOT NULL UNIQUE,
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS static_course_contents (
    static_course_content_id INT AUTO_INCREMENT PRIMARY KEY,
    published_content        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS static_courses (
    static_course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id        INT NOT NULL,
    content_id       VARCHAR(255) NOT NULL DEFAULT '',
    name             VARCHAR(255) NOT NULL DEFAULT '',
    description      TEXT,
    left_colour      VARCHAR(7) NOT NULL DEFAULT '',
    right_colour     VARCHAR(7) NOT NULL DEFAULT '',
    num_modules      INT NOT NULL DEFAULT 0,
    num_topics       INT NOT NULL DEFAULT 0,
    course_owner     VARCHAR(255) NOT NULL DEFAULT '',
    publish_date     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_enrollments (
    enrollment_id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id              INT NOT NULL,
    static_course_id     INT NOT NULL,
    enrolled_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    progress             JSON,
    percentage_completed INT NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (static_course_id) REFERENCES static_courses(static_course_id) ON DELETE CASCADE
);
