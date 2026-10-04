/* =========================================================
   core.js — ядро приложения.
========================================================= */

const WEEKDAY_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_CYCLE = [null, "high", "medium", "low"];

const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 23;
const TIMELINE_HOUR_PX = 52;

const state = {
  currentDate: null,
  tasks: [],
  report: "",
  mood: null,
  notes: [],
  currentNoteId: null,
  notesPreviewMode: false,
  notesFilterTag: null,
  settings: { theme: "dark", language: "ru", timezone: "Europe/Moscow" },
  currentView: "today",
  expandedSubtasks: new Set(),
  highlightId: null,
  runningTaskId: null,
  timerStart: 0,
  pomodoro: {
    active: false,
    taskId: null,
    phase: "work",
    secondsLeft: 25 * 60,
    intervalId: null,
    count: 0,
  },
  taskEditId: null,
  todayWeekChartInstance: null,
  weekChartInstance: null,
  doughnutChartInstance: null,
  wakeChartInstance: null,
  exerciseChartInstance: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------- ID с префиксом устройства ---------- */
/* На телефоне (Android/iOS) — "ph_...", на ПК — "pc_..." */
const DEVICE_ID = (() => {
  let id = localStorage.getItem("diary:deviceId");
  if (!id) {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    id = isMobile ? "ph" : "pc";
    localStorage.setItem("diary:deviceId", id);
  }
  return id;
})();

const uid = () =>
  `${DEVICE_ID}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function escapeHtml(str = "") {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m],
  );
}

/* Даты */
function dateKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${day}`;
}
function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function todayKey() {
  const tz = state.settings?.timezone || "Europe/Moscow";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return dateKey(new Date());
  }
}
function currentTimeTZ() {
  const tz = state.settings?.timezone || "Europe/Moscow";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  } catch {
    return "";
  }
}
function daysBetween(keyA, keyB) {
  const a = parseDateKey(keyA);
  const b = parseDateKey(keyB);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}
function efficiency(stat) {
  if (!stat.total) return 0;
  return Math.round((stat.done / stat.total) * 100);
}
function pluralDays(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

/* DOM */
const els = {
  navItems: $$(".nav-item"),

  clock: $("#clock"),
  dayTitle: $("#dayTitle"),
  daySubtitle: $("#daySubtitle"),
  prevDayBtn: $("#prevDayBtn"),
  nextDayBtn: $("#nextDayBtn"),
  goTodayBtn: $("#goTodayBtn"),

  newTaskBtn: $("#newTaskBtn"),
  taskModal: $("#taskModal"),
  taskModalTitle: $("#taskModalTitle"),
  closeTaskModalBtn: $("#closeTaskModalBtn"),
  cancelTaskModalBtn: $("#cancelTaskModalBtn"),
  saveTaskBtn: $("#saveTaskBtn"),

  taskForm: $("#taskForm"),
  taskInput: $("#taskInput"),
  taskPriority: $("#taskPriority"),
  taskDueDate: $("#taskDueDate"),
  taskRepeat: $("#taskRepeat"),
  taskStartTime: $("#taskStartTime"),
  taskDuration: $("#taskDuration"),
  taskTagsPreview: $("#taskTagsPreview"),
  clearTaskOptionsBtn: $("#clearTaskOptionsBtn"),

  taskList: $("#taskList"),
  emptyState: $("#emptyState"),
  statsDone: $("#statsDone"),
  statsTotal: $("#statsTotal"),
  dayReport: $("#dayReport"),
  saveReportBtn: $("#saveReportBtn"),

  wakeTime: $("#wakeTime"),
  exercisesList: $("#exercisesList"),
  exercisesEmpty: $("#exercisesEmpty"),
  exercisesTotal: $("#exercisesTotal"),
  exerciseType: $("#exerciseType"),
  exerciseDuration: $("#exerciseDuration"),
  addExerciseBtn: $("#addExerciseBtn"),

  timelineTitle: $("#timelineTitle"),
  timelineSubtitle: $("#timelineSubtitle"),
  timelineCount: $("#timelineCount"),
  timelineContainer: $("#timelineContainer"),
  timelineEmpty: $("#timelineEmpty"),
  timelineUnscheduled: $("#timelineUnscheduled"),
  timelineUnscheduledEmpty: $("#timelineUnscheduledEmpty"),
  prevDayTLBtn: $("#prevDayTLBtn"),
  nextDayTLBtn: $("#nextDayTLBtn"),
  goTodayTLBtn: $("#goTodayTLBtn"),

  weekRange: $("#weekRange"),
  metricAvg: $("#metricAvg"),
  metricAvgDelta: $("#metricAvgDelta"),
  metricDone: $("#metricDone"),
  metricTotal: $("#metricTotal"),
  metricDonePercent: $("#metricDonePercent"),
  metricBestDay: $("#metricBestDay"),
  metricBestValue: $("#metricBestValue"),
  weekTableBody: $("#weekTableBody"),
};