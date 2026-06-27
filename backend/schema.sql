CREATE DATABASE IF NOT EXISTS coursnote;
USE coursnote;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS courses (
    course_id   INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    user_id     INT NOT NULL,
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
    topic_id      INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    module_id     INT NOT NULL,
    completed     BOOLEAN NOT NULL DEFAULT FALSE,
    raw_elements  LONGTEXT,
    FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_pages (
    course_page_id INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    topic_id       INT NOT NULL UNIQUE,
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS private_notes (
    private_note_id INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    topic_id        INT NOT NULL UNIQUE,
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE CASCADE
);
