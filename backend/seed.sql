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

-- Topics (comp_rules: mix of read_to_bottom, timed, self_reported, percentage_questions_correct)
INSERT INTO topics (name, description, module_id, comp_rules) VALUES
    ('Installing Python',   'pyenv, venv, and pip setup.',             1, '[{"type":"read_to_bottom","config":{}}]'),
    ('Hello World',         'Your first Python script.',               1, '[{"type":"read_to_bottom","config":{}},{"type":"percentage_questions_correct","config":{"threshold":1}}]'),
    ('Variables & Types',   'int, str, list, dict basics.',            1, '[{"type":"percentage_questions_correct","config":{"threshold":1}}]'),
    ('If / Elif / Else',    'Conditional branching in Python.',        2, '[{"type":"self_reported","config":{}}]'),
    ('For & While Loops',   'Iterating with for and while.',           2, '[{"type":"read_to_bottom","config":{}},{"type":"percentage_questions_correct","config":{"threshold":1}}]'),
    ('List Comprehensions', 'Concise list building syntax.',           2, '[{"type":"percentage_questions_correct","config":{"threshold":1}}]'),
    ('JSX Syntax',          'HTML-like syntax inside JavaScript.',     4, '[{"type":"read_to_bottom","config":{}}]'),
    ('Functional Components','Defining UI as plain functions.',        4, '[{"type":"self_reported","config":{}}]'),
    ('Props',               'Passing data between components.',        4, '[{"type":"percentage_questions_correct","config":{"threshold":1}}]'),
    ('useState Hook',       'Managing local component state.',         5, '[{"type":"read_to_bottom","config":{}},{"type":"self_reported","config":{}}]'),
    ('useEffect Hook',      'Side effects and cleanup.',               5, '[{"type":"percentage_questions_correct","config":{"threshold":1}}]');

-- course_pages: one per topic with sample raw_elements content.
-- IMPORTANT: No backslash escapes inside SQL strings - MySQL consumes them,
-- breaking the stored JSON. All text values use only plain characters.
INSERT INTO course_pages (name, description, topic_id, raw_elements) VALUES
(
  'Python Installation Guide', 'Step-by-step setup page.', 1,
  '[{"id":"el_py01a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Installing Python"}]},{"type":"paragraph","content":[{"type":"text","text":"The recommended way to manage Python versions is "},{"type":"text","marks":[{"type":"bold"}],"text":"pyenv"},{"type":"text","text":". It lets you install and switch between versions without touching your system Python."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Steps"}]},{"type":"orderedList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Install pyenv: "},{"type":"text","marks":[{"type":"code"}],"text":"brew install pyenv"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Install a version: "},{"type":"text","marks":[{"type":"code"}],"text":"pyenv install 3.12.0"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Set it globally: "},{"type":"text","marks":[{"type":"code"}],"text":"pyenv global 3.12.0"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Verify: "},{"type":"text","marks":[{"type":"code"}],"text":"python --version"}]}]}]}]}},{"id":"el_py01b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Which tool is recommended for managing Python versions?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"pyenv"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"pip"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"conda"}]}]}}],"answer":0}]'
),
(
  'Hello World', 'Your first Python script.', 2,
  '[{"id":"el_py02a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Hello World"}]},{"type":"paragraph","content":[{"type":"text","text":"Every programming journey starts here. The print function outputs text to the terminal."}]},{"type":"paragraph","content":[{"type":"text","text":"Type "},{"type":"text","marks":[{"type":"code"}],"text":"print(42)"},{"type":"text","text":" to print a number, or "},{"type":"text","marks":[{"type":"code"}],"text":"print(x + y)"},{"type":"text","text":" to print the result of an expression."}]},{"type":"paragraph","content":[{"type":"text","text":"You can save your code in a file ending in "},{"type":"text","marks":[{"type":"code"}],"text":".py"},{"type":"text","text":" and run it with "},{"type":"text","marks":[{"type":"code"}],"text":"python filename.py"},{"type":"text","text":"."}]}]}},{"id":"el_py02b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"What function do you use to display output in Python?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"print()"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"output()"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"display()"}]}]}}],"answer":0}]'
),
(
  'Variables & Types', 'int, str, list, dict basics.', 3,
  '[{"id":"el_py03a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Variables and Types"}]},{"type":"paragraph","content":[{"type":"text","text":"Python is dynamically typed - you assign a value and Python infers the type automatically. You can always check the type of a value using the "},{"type":"text","marks":[{"type":"code"}],"text":"type()"},{"type":"text","text":" function."}]}]}},{"id":"el_py03b","type":"table","cells":[["Type","Example","Use"],["int","42","Whole numbers"],["float","3.14","Decimals"],["str","hello","Text"],["list","[1, 2, 3]","Ordered collection"],["dict","key: value","Key-value pairs"],["bool","True / False","Conditions"]]},{"id":"el_py03c","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Which type would you use to store a GPA like 3.85?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"float"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"int"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"str"}]}]}}],"answer":0}]'
),
(
  'If Statements in Python', 'Interactive conditional page.', 4,
  '[{"id":"el_py04a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Conditionals"}]},{"type":"paragraph","content":[{"type":"text","text":"Use "},{"type":"text","marks":[{"type":"code"}],"text":"if"},{"type":"text","text":", "},{"type":"text","marks":[{"type":"code"}],"text":"elif"},{"type":"text","text":", and "},{"type":"text","marks":[{"type":"code"}],"text":"else"},{"type":"text","text":" to run different code depending on a condition."}]},{"type":"paragraph","content":[{"type":"text","text":"Conditions use comparison operators: "},{"type":"text","marks":[{"type":"code"}],"text":"=="},{"type":"text","text":", "},{"type":"text","marks":[{"type":"code"}],"text":"!="},{"type":"text","text":", "},{"type":"text","marks":[{"type":"code"}],"text":"<"},{"type":"text","text":", "},{"type":"text","marks":[{"type":"code"}],"text":">"},{"type":"text","text":", "},{"type":"text","marks":[{"type":"code"}],"text":"<="},{"type":"text","text":", "},{"type":"text","marks":[{"type":"code"}],"text":">="},{"type":"text","text":". You can combine them with "},{"type":"text","marks":[{"type":"code"}],"text":"and"},{"type":"text","text":", "},{"type":"text","marks":[{"type":"code"}],"text":"or"},{"type":"text","text":", "},{"type":"text","marks":[{"type":"code"}],"text":"not"},{"type":"text","text":"."}]}]}},{"id":"el_py04b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Which keyword handles a second condition if the first if is false?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"elif"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"else"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"then"}]}]}}],"answer":0}]'
),
(
  'For & While Loops', 'Iterating with for and while.', 5,
  '[{"id":"el_py05a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Loops"}]},{"type":"paragraph","content":[{"type":"text","text":"A "},{"type":"text","marks":[{"type":"code"}],"text":"for"},{"type":"text","text":" loop iterates over a sequence such as a range, list, or string. A "},{"type":"text","marks":[{"type":"code"}],"text":"while"},{"type":"text","text":" loop repeats as long as a condition is true."}]},{"type":"paragraph","content":[{"type":"text","text":"Use "},{"type":"text","marks":[{"type":"code"}],"text":"for"},{"type":"text","text":" when the iteration count is known. Use "},{"type":"text","marks":[{"type":"code"}],"text":"while"},{"type":"text","text":" when it is not."}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"code"}],"text":"range(n)"},{"type":"text","text":" generates the integers 0 through n-1. "},{"type":"text","marks":[{"type":"code"}],"text":"range(a, b)"},{"type":"text","text":" generates a through b-1."}]}]}},{"id":"el_py05b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"How many times does range(5) iterate?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"5 times (0 through 4)"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"4 times (1 through 4)"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"6 times (0 through 5)"}]}]}}],"answer":0}]'
),
(
  'List Comprehensions', 'Concise list building syntax.', 6,
  '[{"id":"el_py06a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"List Comprehensions"}]},{"type":"paragraph","content":[{"type":"text","text":"A list comprehension builds a new list by applying an expression to each item in a sequence, all in one line. It is equivalent to a for loop that appends to a list, but more concise."}]},{"type":"paragraph","content":[{"type":"text","text":"Syntax: "},{"type":"text","marks":[{"type":"code"}],"text":"[expression for item in sequence]"},{"type":"text","text":" or with a filter: "},{"type":"text","marks":[{"type":"code"}],"text":"[expression for item in sequence if condition]"},{"type":"text","text":"."}]}]}},{"id":"el_py06b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"What does [x*2 for x in range(3)] produce?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"[0, 2, 4]"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"[2, 4, 6]"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"[1, 2, 3]"}]}]}}],"answer":0}]'
),
(
  'JSX Deep Dive', 'Covers JSX rules and gotchas.', 7,
  '[{"id":"el_jsx01a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"JSX Syntax"}]},{"type":"paragraph","content":[{"type":"text","text":"JSX lets you write HTML-like markup inside JavaScript. It compiles to React.createElement() calls behind the scenes."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Key Rules"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Must return a single root element - wrap siblings in a Fragment if needed."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Use "},{"type":"text","marks":[{"type":"code"}],"text":"className"},{"type":"text","text":" instead of "},{"type":"text","marks":[{"type":"code"}],"text":"class"},{"type":"text","text":" for CSS classes."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"JavaScript expressions go inside curly braces "},{"type":"text","marks":[{"type":"code"}],"text":"{}"},{"type":"text","text":"."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Self-closing tags must include a slash: "},{"type":"text","marks":[{"type":"code"}],"text":"<img />"},{"type":"text","text":"."}]}]}]}]}},{"id":"el_jsx01b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"In JSX, how do you apply a CSS class to an element?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Use className="}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Use class="}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Use cssClass="}]}]}}],"answer":0}]'
),
(
  'Functional Components', 'Defining UI as plain functions.', 8,
  '[{"id":"el_jsx02a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Functional Components"}]},{"type":"paragraph","content":[{"type":"text","text":"A functional component is a JavaScript function that accepts a props object and returns JSX. Component names must start with a capital letter so React can distinguish them from native HTML tags."}]},{"type":"paragraph","content":[{"type":"text","text":"You can destructure props directly in the function signature for cleaner code. For example, instead of "},{"type":"text","marks":[{"type":"code"}],"text":"props.label"},{"type":"text","text":" you write "},{"type":"text","marks":[{"type":"code"}],"text":"{ label }"},{"type":"text","text":" in the parameter list."}]}]}},{"id":"el_jsx02b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Why must component names start with a capital letter?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"So React distinguishes them from native HTML tags"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"It is a general JavaScript naming convention"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Lowercase names are reserved for hooks"}]}]}}],"answer":0}]'
),
(
  'Props', 'Passing data between components.', 9,
  '[{"id":"el_jsx03a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Props"}]},{"type":"paragraph","content":[{"type":"text","text":"Props (short for properties) are how a parent component passes data down to a child. They flow in one direction - from parent to child - and are read-only inside the child."}]},{"type":"paragraph","content":[{"type":"text","text":"You pass props as attributes on a JSX element, and receive them as the first argument of the component function. Default values can be set with "},{"type":"text","marks":[{"type":"code"}],"text":"= defaultValue"},{"type":"text","text":" in the destructured parameter."}]}]}},{"id":"el_jsx03b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Can a child component modify the props it receives?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No - props are read-only"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Yes, but only using useState"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Yes, always"}]}]}}],"answer":0}]'
),
(
  'useState Hook', 'Managing local component state.', 10,
  '[{"id":"el_jsx04a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"useState"}]},{"type":"paragraph","content":[{"type":"text","text":"useState lets a component remember a value between renders. Calling the setter function triggers a re-render with the updated value."}]},{"type":"paragraph","content":[{"type":"text","text":"useState returns an array with two items: the current value and a setter function. You pass the initial value as the argument: "},{"type":"text","marks":[{"type":"code"}],"text":"useState(0)"},{"type":"text","text":" starts the state at zero."}]},{"type":"paragraph","content":[{"type":"text","text":"Always call hooks at the top level of a component - never inside loops, conditions, or nested functions."}]}]}},{"id":"el_jsx04b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"What does useState(0) return?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"An array: [currentValue, setterFunction]"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Just the number 0"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A Promise resolving to 0"}]}]}}],"answer":0}]'
),
(
  'useEffect Hook', 'Side effects and cleanup.', 11,
  '[{"id":"el_jsx05a","type":"text","content":{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"useEffect"}]},{"type":"paragraph","content":[{"type":"text","text":"useEffect runs code after a render - use it for side effects like fetching data, subscribing to events, or updating the document title."}]},{"type":"paragraph","content":[{"type":"text","text":"The second argument is a dependency array. React re-runs the effect whenever a dependency changes. An empty array "},{"type":"text","marks":[{"type":"code"}],"text":"[]"},{"type":"text","text":" means run once on mount. Omitting it means run after every render."}]},{"type":"paragraph","content":[{"type":"text","text":"Return a cleanup function from the effect to unsubscribe or cancel timers when the component unmounts or before the effect runs again."}]}]}},{"id":"el_jsx05b","type":"question","question":{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"What does passing an empty array [] as the dependency array do?"}]}]}},"options":[{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Runs the effect once on mount only"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Runs the effect after every render"}]}]}},{"content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Disables the effect entirely"}]}]}}],"answer":0}]'
);

-- private_notes: one per topic, inserted in topic_id order so private_note_id = topic_id
INSERT INTO private_notes (name, description, topic_id) VALUES
    ('Installing Python Notes',    '{"type":"doc","content":[{"type":"paragraph"}]}', 1),
    ('Hello World Notes',          '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"My personal notes on the REPL."}]}]}', 2),
    ('Variables & Types Notes',    '{"type":"doc","content":[{"type":"paragraph"}]}', 3),
    ('If / Elif / Else Notes',     '{"type":"doc","content":[{"type":"paragraph"}]}', 4),
    ('For & While Loops Notes',    '{"type":"doc","content":[{"type":"paragraph"}]}', 5),
    ('List Comprehensions Notes',  '{"type":"doc","content":[{"type":"paragraph"}]}', 6),
    ('JSX Syntax Notes',           '{"type":"doc","content":[{"type":"paragraph"}]}', 7),
    ('Functional Components Notes','{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Things I keep forgetting about functional components."}]}]}', 8),
    ('Props Notes',                '{"type":"doc","content":[{"type":"paragraph"}]}', 9),
    ('useState Hook Notes',        '{"type":"doc","content":[{"type":"paragraph"}]}', 10),
    ('useEffect Hook Notes',       '{"type":"doc","content":[{"type":"paragraph"}]}', 11);

-- Static course contents, static courses, and enrollments are intentionally
-- omitted from seed data. Published_content requires the full serialised course
-- JSON that is only available after publishing via the UI. Publish courses from
-- the editor to populate these tables.
