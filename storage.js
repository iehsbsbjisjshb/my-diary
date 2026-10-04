/* =========================================================
   storage.js — слой хранения (одно окно, без режимов).
========================================================= */

const Storage = (() => {
  const PREFIX = "diary:";
  const key = (name) => PREFIX + name;

  function read(name, fallback) {
    try {
      const raw = localStorage.getItem(key(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("[storage] read error:", name, e);
      return fallback;
    }
  }

  function write(name, value) {
    try {
      localStorage.setItem(key(name), JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[storage] write error:", name, e);
      return false;
    }
  }

  function bumpDataRev() {
    const rev = Date.now();
    write("_dataRev", rev);
    return rev;
  }

  function isPlainObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function assertDateMap(obj, label, itemCheck) {
    if (obj == null) return;
    if (!isPlainObject(obj)) throw new Error(`${label}: ожидается объект`);
    for (const [d, val] of Object.entries(obj)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        throw new Error(`${label}: неверный ключ даты «${d}»`);
      }
      itemCheck(val, d);
    }
  }

  function validateImportPayload(payload) {
    if (!payload || !isPlainObject(payload)) {
      throw new Error("Некорректный формат: нужен JSON-объект");
    }
    if (payload._meta && !isPlainObject(payload._meta)) {
      throw new Error("Некорректный _meta");
    }

    assertDateMap(payload.tasksByDate, "tasksByDate", (v) => {
      if (!Array.isArray(v)) throw new Error("tasksByDate: ожидается массив");
    });
    assertDateMap(payload.reportsByDate, "reportsByDate", (v) => {
      if (typeof v !== "string") throw new Error("reportsByDate: ожидается строка");
    });
    assertDateMap(payload.moodsByDate, "moodsByDate", (v) => {
      if (v !== null && typeof v !== "number") {
        throw new Error("moodsByDate: ожидается число или null");
      }
    });
    assertDateMap(payload.wakesByDate, "wakesByDate", (v) => {
      if (v !== null && typeof v !== "string") {
        throw new Error("wakesByDate: ожидается строка или null");
      }
    });
    assertDateMap(payload.exercisesByDate, "exercisesByDate", (v) => {
      if (!Array.isArray(v)) throw new Error("exercisesByDate: ожидается массив");
    });
    assertDateMap(payload.pomodoroByDate, "pomodoroByDate", (v) => {
      if (typeof v !== "number") throw new Error("pomodoroByDate: ожидается число");
    });

    if (payload.notes != null && !Array.isArray(payload.notes)) {
      throw new Error("notes: ожидается массив");
    }
    if (payload.settings != null && !isPlainObject(payload.settings)) {
      throw new Error("settings: ожидается объект");
    }
    if (payload.theme != null && !["dark", "light", "auto"].includes(payload.theme)) {
      throw new Error("theme: dark | light | auto");
    }
  }

  return {
    bumpDataRev,
    getDataRev: () => read("_dataRev", 0),

    /* Задачи */
    loadTasks: (d) => read(`tasks:${d}`, []),
    saveTasks(d, t) { write(`tasks:${d}`, t); bumpDataRev(); },

    /* Отчёт */
    loadReport: (d) => read(`report:${d}`, ""),
    saveReport(d, t) { write(`report:${d}`, t); bumpDataRev(); },

    /* Настроение */
    loadMood: (d) => read(`mood:${d}`, null),
    saveMood(d, m) { write(`mood:${d}`, m); bumpDataRev(); },

    /* Подъём */
    loadWake: (d) => read(`wake:${d}`, null),
    saveWake(d, t) { write(`wake:${d}`, t); bumpDataRev(); },

    /* Упражнения */
    loadExercises: (d) => read(`exercises:${d}`, []),
    saveExercises(d, a) { write(`exercises:${d}`, a); bumpDataRev(); },

    /* Помодоро */
    loadPomodoro: (d) => read(`pomodoro:${d}`, 0),
    savePomodoro: (d, n) => write(`pomodoro:${d}`, n),
    loadPomodoroPreset: () => read("pomodoroPreset", "25/5"),
    savePomodoroPreset: (v) => write("pomodoroPreset", v),

    /* Настройки */
    loadSettings: () => read("settings", {
      theme: "dark",
      language: "ru",
      timezone: "Europe/Moscow",
    }),
    saveSettings: (s) => write("settings", s),

    /* Повторы */
    loadRepeatTemplates: () => read("repeatTemplates", []),
    saveRepeatTemplates: (l) => write("repeatTemplates", l),
    loadRemovedRepeats: () => read("removedRepeats", []),
    saveRemovedRepeats: (l) => write("removedRepeats", l),

    /* Заметки */
    loadNotes: () => read("notes", []),
    saveNotes: (n) => { write("notes", n); bumpDataRev(); },

    /* Тема */
    loadTheme: () => read("theme", "dark"),
    saveTheme: (t) => write("theme", t),

    /* UI */
    loadExpandedSubtasks: () => read("expandedSubtasks", []),
    saveExpandedSubtasks: (l) => write("expandedSubtasks", l),

    validateImportPayload,

    /* Экспорт */
    exportAll() {
      const out = {
        _meta: {
          app: "diary",
          version: "1.0",
          exportedAt: new Date().toISOString(),
        },
        tasksByDate: {},
        reportsByDate: {},
        moodsByDate: {},
        wakesByDate: {},
        exercisesByDate: {},
        pomodoroByDate: {},
        notes: null,
        settings: null,
        theme: null,
        pomodoroPreset: null,
        repeatTemplates: null,
        removedRepeats: null,
      };

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith(PREFIX)) continue;
        const short = k.slice(PREFIX.length);
        let value;
        try { value = JSON.parse(localStorage.getItem(k)); } catch { continue; }

        if (short.startsWith("tasks:")) out.tasksByDate[short.slice(6)] = value;
        else if (short.startsWith("report:")) out.reportsByDate[short.slice(7)] = value;
        else if (short.startsWith("mood:")) out.moodsByDate[short.slice(5)] = value;
        else if (short.startsWith("wake:")) out.wakesByDate[short.slice(5)] = value;
        else if (short.startsWith("exercises:")) out.exercisesByDate[short.slice(10)] = value;
        else if (short.startsWith("pomodoro:") && short !== "pomodoroPreset")
          out.pomodoroByDate[short.slice(9)] = value;
        else if (short === "notes") out.notes = value;
        else if (short === "settings") out.settings = value;
        else if (short === "theme") out.theme = value;
        else if (short === "pomodoroPreset") out.pomodoroPreset = value;
        else if (short === "repeatTemplates") out.repeatTemplates = value;
        else if (short === "removedRepeats") out.removedRepeats = value;
      }
      return out;
    },

    /* Импорт */
    importAll(payload) {
      validateImportPayload(payload);

      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));

      if (payload.tasksByDate)
        for (const [d, t] of Object.entries(payload.tasksByDate)) write(`tasks:${d}`, t);
      if (payload.reportsByDate)
        for (const [d, t] of Object.entries(payload.reportsByDate)) write(`report:${d}`, t);
      if (payload.moodsByDate)
        for (const [d, m] of Object.entries(payload.moodsByDate)) write(`mood:${d}`, m);
      if (payload.wakesByDate)
        for (const [d, t] of Object.entries(payload.wakesByDate)) write(`wake:${d}`, t);
      if (payload.exercisesByDate)
        for (const [d, a] of Object.entries(payload.exercisesByDate)) write(`exercises:${d}`, a);
      if (payload.pomodoroByDate)
        for (const [d, n] of Object.entries(payload.pomodoroByDate)) write(`pomodoro:${d}`, n);

      if (payload.notes) write("notes", payload.notes);
      if (payload.settings) write("settings", payload.settings);
      if (payload.theme) write("theme", payload.theme);
      if (payload.pomodoroPreset) write("pomodoroPreset", payload.pomodoroPreset);
      if (payload.repeatTemplates) write("repeatTemplates", payload.repeatTemplates);
      if (payload.removedRepeats) write("removedRepeats", payload.removedRepeats);

      bumpDataRev();
      return true;
    },

    clearAll() {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    },

    themeStorageKey: () => key("theme"),
  };
})();