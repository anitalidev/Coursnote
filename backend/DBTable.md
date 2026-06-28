# Database Tables

## users
| Column     | Type                    | Constraints              |
|------------|-------------------------|--------------------------|
| user_id    | INT AUTO_INCREMENT      | PRIMARY KEY              |
| username   | VARCHAR(255)            | NOT NULL, UNIQUE         |

## courses
| Column       | Type                  | Constraints                                      |
|--------------|-----------------------|--------------------------------------------------|
| course_id    | INT AUTO_INCREMENT    | PRIMARY KEY                                      |
| name         | VARCHAR(255)          | NOT NULL                                         |
| description  | TEXT                  |                                                  |
| user_id      | INT                   | NOT NULL, FK → users(user_id) ON DELETE CASCADE  |
| left_colour  | VARCHAR(7)            | NOT NULL DEFAULT (random hex)                    |
| right_colour | VARCHAR(7)            | NOT NULL DEFAULT (random hex)                    |

## modules
| Column      | Type                  | Constraints                                        |
|-------------|-----------------------|----------------------------------------------------|
| module_id   | INT AUTO_INCREMENT    | PRIMARY KEY                                        |
| name        | VARCHAR(255)          | NOT NULL                                           |
| description | TEXT                  |                                                    |
| course_id   | INT                   | NOT NULL, FK → courses(course_id) ON DELETE CASCADE |

## topics
| Column       | Type                  | Constraints                                        |
|--------------|-----------------------|----------------------------------------------------|
| topic_id     | INT AUTO_INCREMENT    | PRIMARY KEY                                        |
| name         | VARCHAR(255)          | NOT NULL                                           |
| description  | TEXT                  |                                                    |
| module_id    | INT                   | NOT NULL, FK → modules(module_id) ON DELETE CASCADE |
| completed    | BOOLEAN               | NOT NULL DEFAULT FALSE                             |
| raw_elements | LONGTEXT              |                                                    |

## course_pages
| Column         | Type                  | Constraints                                       |
|----------------|-----------------------|---------------------------------------------------|
| course_page_id | INT AUTO_INCREMENT    | PRIMARY KEY                                       |
| name           | VARCHAR(255)          | NOT NULL                                          |
| description    | TEXT                  |                                                   |
| topic_id       | INT                   | NOT NULL, UNIQUE, FK → topics(topic_id) ON DELETE CASCADE |

## private_notes
| Column          | Type                  | Constraints                                       |
|-----------------|-----------------------|---------------------------------------------------|
| private_note_id | INT AUTO_INCREMENT    | PRIMARY KEY                                       |
| name            | VARCHAR(255)          | NOT NULL                                          |
| description     | TEXT                  |                                                   |
| topic_id        | INT                   | NOT NULL, UNIQUE, FK → topics(topic_id) ON DELETE CASCADE |

---