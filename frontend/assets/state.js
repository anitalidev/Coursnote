'use strict';

const Editors = {
  notebook: {},
  monaco: {},
};

const S = {
  // Application data loaded from the API
  data: {
    user: null,
    courses: [],
    modules: [],
    moduleTopics: {},
    topics: [],
    enrolledCourses: [],
    marketCourses: [],
    marketTotal: 0,
    progress: { marked_manually: {}, manually_overridden: {}, time_spent: {}, read_to_bottom: {}, lastAnswered: {}, correctlyAnswered: {} },
  },

  // UI / navigation state
  ui: {
    view: 'login',
    editMode: false,
    notesTab: 'cp',
    splitPane: false,
    currentCourse: null,
    currentModule: null,
    currentTopic: null,
    marketFilter: { search: '', sorts: [], sizeMin: '', sizeMax: '', topicsMin: '', topicsMax: '', author: '', status: '' },
    courseProgress: {},
  },

  // Editor state (notebook cells and private notes for the active topic)
  editor: {
    cells: [],
    privateNote: null,
  },
};
