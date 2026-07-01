USE coursnote;

-- Users
INSERT INTO users (username) VALUES
    ('alice'),
    ('bob'),
    ('carol'),
    ('dave');

-- Courses (owned by alice = user_id 1, bob = user_id 2)
INSERT INTO courses (name, description, user_id, left_colour, right_colour) VALUES
    ('Introduction to Python',       'Learn the basics of Python programming from scratch.',          1, '#4B8BBE', '#FFD43B'),
    ('Web Development with React',   'Build modern UIs using React and TypeScript.',                  1, '#61DAFB', '#282C34'),
    ('Data Structures & Algorithms', 'Master DSA concepts for coding interviews and beyond.',         2, '#F7DF1E', '#323330'),
    ('Machine Learning Fundamentals','Understand supervised, unsupervised, and RL techniques.',       2, '#FF6F00', '#FFF8E1'),
    ('System Design Basics',         'Design scalable systems: load balancers, caches, databases.',   1, '#00BCD4', '#1A237E');

-- Modules for course 1 (Intro to Python)
INSERT INTO modules (name, description, course_id) VALUES
    ('Getting Started',      'Install Python and write your first script.',       1),
    ('Control Flow',         'If statements, loops, and comprehensions.',         1),
    ('Functions & Scope',    'Defining and calling functions, closures.',         1);

-- Modules for course 2 (React)
INSERT INTO modules (name, description, course_id) VALUES
    ('React Basics',         'JSX, components, and props.',                       2),
    ('State & Effects',      'useState, useEffect, and the component lifecycle.', 2),
    ('Routing & Forms',      'React Router and controlled form inputs.',          2);

-- Modules for course 3 (DSA)
INSERT INTO modules (name, description, course_id) VALUES
    ('Arrays & Strings',     'Two-pointer, sliding window, and prefix sums.',    3),
    ('Trees & Graphs',       'BFS, DFS, and common tree patterns.',              3);

-- Topics for module 1 (Getting Started)
INSERT INTO topics (name, description, module_id, completed, raw_elements) VALUES
    ('Installing Python',    'pyenv, venv, and pip setup.',           1, TRUE,  '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Install Python via pyenv for easy version management. Run: brew install pyenv then pyenv install 3.12."}]}]}}]'),
    ('Hello World',          'Your first Python script.',             1, TRUE,  '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Open a terminal and run: python3 -c print(Hello World) to verify your installation."}]}]}}]'),
    ('Variables & Types',    'int, str, list, dict basics.',          1, FALSE, '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Python is dynamically typed. Common types: int, float, str, list, dict, bool. Use type() to inspect a value at runtime."}]}]}}]');

-- Topics for module 2 (Control Flow)
INSERT INTO topics (name, description, module_id, completed, raw_elements) VALUES
    ('If / Elif / Else',     'Conditional branching in Python.',      2, FALSE, '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Use if / elif / else for branching. Python has no switch statement — use elif chains or a dict dispatch instead."}]}]}}]'),
    ('For & While Loops',    'Iterating with for and while.',         2, FALSE, '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"for item in iterable: is the idiomatic Python loop. Use while for unknown iteration counts. break and continue work in both."}]}]}}]'),
    ('List Comprehensions',  'Concise list building syntax.',         2, FALSE, '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"[x*2 for x in range(10)] is cleaner than a manual append loop. Add a condition: [x for x in data if x > 0]."}]}]}}]');

-- Topics for module 4 (React Basics)
INSERT INTO topics (name, description, module_id, completed, raw_elements) VALUES
    ('JSX Syntax',           'HTML-like syntax inside JavaScript.',   4, TRUE,  '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"JSX compiles to React.createElement calls. Every JSX element must have a single root, and class becomes className."}]}]}}]'),
    ('Functional Components','Defining UI as plain functions.',       4, TRUE,  '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A functional component is just a function that returns JSX. Prefer them over class components in modern React."}]}]}}]'),
    ('Props',                'Passing data between components.',      4, FALSE, '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Props flow down from parent to child. They are read-only — never mutate props directly. Use state for values that change."}]}]}}]');

-- Topics for module 5 (State & Effects)
INSERT INTO topics (name, description, module_id, completed, raw_elements) VALUES
    ('useState Hook',        'Managing local component state.',       5, FALSE, '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"const [count, setCount] = useState(0); — always call hooks at the top level of a component, never inside loops or conditions."}]}]}}]'),
    ('useEffect Hook',       'Side effects and cleanup.',             5, FALSE, '[{"type":"text","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"useEffect runs after render. Return a cleanup function to cancel timers or subscriptions. Pass [] as deps to run only on mount."}]}]}}]');

-- course_pages for some topics (topic_id 1, 4, 7)
INSERT INTO course_pages (name, description, topic_id) VALUES
    ('Python Installation Guide', 'Step-by-step setup page.',    1),
    ('If Statements in Python',   'Interactive conditional page.',4),
    ('JSX Deep Dive',             'Covers JSX rules and gotchas.', 7);

-- private_notes for some topics (topic_id 2, 8)
INSERT INTO private_notes (name, description, topic_id) VALUES
    ('Hello World Notes',    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"My personal notes on the REPL."}]}]}',   2),
    ('Component Notes',      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Things I keep forgetting about functional components."}]}]}', 8);

-- Static course contents (published HTML snapshots)
INSERT INTO static_course_contents (published_content) VALUES
    ('[{"type":"heading","content":"Introduction to Python"},{"type":"paragraph","content":"A beginner-friendly course covering Python fundamentals: variables, control flow, functions, and more."}]'),
    ('[{"type":"heading","content":"Web Development with React"},{"type":"paragraph","content":"Go from zero to building production-quality React apps with hooks, routing, and TypeScript."}]'),
    ('[{"type":"heading","content":"Data Structures & Algorithms"},{"type":"paragraph","content":"Crack coding interviews with deep coverage of arrays, trees, graphs, and dynamic programming."}]'),
    ('[{"type":"heading","content":"Machine Learning Fundamentals"},{"type":"paragraph","content":"Hands-on ML: linear regression, decision trees, neural networks, and model evaluation."}]');

-- Static courses (marketplace listings)
INSERT INTO static_courses (course_id, content_id, name, description, left_colour, right_colour, num_modules, num_topics, course_owner, publish_date, is_active) VALUES
    (1, 1, 'Introduction to Python',       'Learn the basics of Python programming from scratch.',   '#4B8BBE', '#FFD43B', 3, 6, 'alice', '2025-01-15 09:00:00', TRUE),
    (2, 2, 'Web Development with React',   'Build modern UIs using React and TypeScript.',           '#61DAFB', '#282C34', 3, 5, 'alice', '2025-02-20 10:00:00', TRUE),
    (3, 3, 'Data Structures & Algorithms', 'Master DSA concepts for coding interviews and beyond.',  '#F7DF1E', '#323330', 2, 2, 'bob',   '2025-03-10 11:00:00', TRUE),
    (4, 4, 'Machine Learning Fundamentals','Understand supervised, unsupervised, and RL techniques.','#FF6F00', '#FFF8E1', 1, 0, 'bob',   '2025-04-05 08:00:00', TRUE);

-- Enrollments (carol and dave enroll in some marketplace courses)
INSERT INTO course_enrollments (user_id, static_course_id, enrolled_at) VALUES
    (3, 1, '2025-05-01 12:00:00'),
    (3, 2, '2025-05-03 14:00:00'),
    (4, 1, '2025-05-10 09:30:00'),
    (4, 3, '2025-06-01 16:00:00'),
    (1, 3, '2025-06-15 11:00:00');
