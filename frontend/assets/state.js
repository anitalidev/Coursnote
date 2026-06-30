'use strict';

const API = 'http://localhost:8081/api';

const S = {
  user: null,
  courses: [],
  currentCourse: null,
  modules: [],
  moduleTopics: {},
  editMode: false, notesTab: 'cp',
  currentModule: null,
  topics: [],
  currentTopic: null,
  notebookCells: [],
  privateNote: null,
  view: 'login',
  marketCourses: [],
  marketFilter: { search: '', sorts: [], sizeMin: '', sizeMax: '', author: '' },
  enrolledCourses: [],
};
