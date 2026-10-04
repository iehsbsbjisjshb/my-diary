/* =========================================================
   ui.js — навигация, тема, события, init.
========================================================= */

/* ---------- ТЕМА ---------- */
function applyTheme() {
  const theme = Storage.loadTheme();
  let isLight = false;
  if (theme === "light") isLight = true;
  else if (theme === "auto") {
    isLight = !window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  document.body.classList.toggle("light", isLight);

  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    if (theme === "light") btn.textContent = t("theme_light");
    else if (theme === "auto") btn.textContent = t("theme_auto");
    else btn.textContent = t("theme_dark");
  }
}

/* ---------- ЧАСЫ ---------- */
function updateClock() {
  const el = document.getElementById("clock");
  if (!el) return;
  const tz = state.settings?.timezone || "Europe/Moscow";
  const shortTz = tz.split("/").pop()?.replace(/_/g, " ") || tz;
  el.textContent = "🕒 " + currentTimeTZ() + " · " + shortTz;
}

/* ---------- НАВИГАЦИЯ ПО ДНЯМ ---------- */
function renderDayHeader() {
  const current = state.currentDate;
  const today = todayKey();
  const diff = daysBetween(today, current);
  const date = parseDateKey(current);
  const locale = state.settings?.language === "en" ? "en-US" : "ru-RU";

  let title;
  if (diff === 0) title = t("hdr_today");
  else if (diff === -1) title = t("hdr_yesterday");
  else if (diff === 1) title = t("hdr_tomorrow");
  else
    title = date.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const sub = date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  els.dayTitle.textContent = title;
  els.daySubtitle.textContent = sub.charAt(0).toUpperCase() + sub.slice(1);
  els.goTodayBtn.classList.toggle("hidden", diff === 0);
}

function loadCurrentDay() {
  applyRepeatsForDate(state.currentDate);
  state.tasks = Storage.loadTasks(state.currentDate);
  state.report = Storage.loadReport(state.currentDate);
  if (els.dayReport) els.dayReport.value = state.report;
  if (typeof updatePomodoroCounter === "function") updatePomodoroCounter();
  if (typeof renderHealthWidget === "function") renderHealthWidget();
}

function persistCurrentReport() {
  state.report = els.dayReport.value;
  Storage.saveReport(state.currentDate, state.report);
}

function switchDate(deltaDays) {
  persistCurrentReport();
  const d = parseDateKey(state.currentDate);
  d.setDate(d.getDate() + deltaDays);
  state.currentDate = dateKey(d);
  state.expandedSubtasks.clear();
  Storage.saveExpandedSubtasks([]);
  loadCurrentDay();
  renderActiveView();
}

function goToToday() {
  persistCurrentReport();
  state.currentDate = todayKey();
  state.expandedSubtasks.clear();
  Storage.saveExpandedSubtasks([]);
  loadCurrentDay();
  renderActiveView();
}

/* ---------- ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ ---------- */
function switchView(name) {
  if (state.currentView === name) return;
  state.currentView = name;
  $$(".view").forEach((v) => v.classList.remove("active"));
  els.navItems.forEach((n) => n.classList.remove("active"));
  document.getElementById(`view-${name}`)?.classList.add("active");
  document
    .querySelector(`.nav-item[data-view="${name}"]`)
    ?.classList.add("active");

  if (name === "today") {
    renderTasks();
    renderDayHeader();
    updateTodayWeekChart();
    if (typeof renderHealthWidget === "function") renderHealthWidget();
  }
  if (name === "timeline") {
    renderTimeline();
    renderTimelineHeader();
  }
  if (name === "week") renderWeekView();
  if (name === "notes") renderNotesView();
}

/* ---------- МОДАЛКА ЗАДАЧИ ---------- */
function openTaskModal(taskId = null) {
  state.taskEditId = taskId;

  if (taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    els.taskModalTitle.textContent = t("edit_task");
    els.saveTaskBtn.textContent = t("save");
    const tagsPart = (task.tags || []).map((t) => "#" + t).join(" ");
    els.taskInput.value = task.title + (tagsPart ? " " + tagsPart : "");
    els.taskPriority.value = task.priority || "";
    els.taskDueDate.value = task.dueDate || "";
    els.taskStartTime.value = task.startTime || "";
    els.taskDuration.value = task.duration || "";
    els.taskRepeat.value = task.repeat || "";
    updateTagsPreview();
  } else {
    els.taskModalTitle.textContent = t("new_task");
    els.saveTaskBtn.textContent = t("create");
    els.taskForm.reset();
    els.taskTagsPreview.classList.add("hidden");
    els.taskTagsPreview.innerHTML = "";
  }
  els.taskModal.classList.remove("hidden");
  setTimeout(() => els.taskInput.focus(), 50);
}

function closeTaskModal() {
  els.taskModal.classList.add("hidden");
  els.taskForm.reset();
  els.taskTagsPreview.classList.add("hidden");
  els.taskTagsPreview.innerHTML = "";
  state.taskEditId = null;
}

/* ---------- СОХРАНЕНИЕ ---------- */
let __saveTimer = null;
let __localDataRev = 0;
let __dirty = false;

function markDirty() {
  __dirty = true;
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(__saveTimer);
  __saveTimer = setTimeout(() => {
    Storage.saveTasks(state.currentDate, state.tasks);
    Storage.saveReport(state.currentDate, state.report);

    /* Отправка отчёта в облако */
    pushItem({
      id: `report_${state.currentDate}`,
      kind: "report",
      text: state.report || "",
      date: state.currentDate,
      updatedAt: Date.now(),
    });

    __dirty = false;
    __localDataRev = Storage.getDataRev();
    updateTodayWeekChart();
    if (typeof renderTasks === "function") renderTasks();
  }, 300);
}

function loadFromStorage() {
  state.settings = Storage.loadSettings();
  state.notes = Storage.loadNotes();
  state.currentDate = todayKey();
  state.expandedSubtasks = new Set(Storage.loadExpandedSubtasks());
  loadCurrentDay();
  __localDataRev = Storage.getDataRev();
  __dirty = false;
}

/* ---------- ЭКСПОРТ / ИМПОРТ ---------- */
function handleExport() {
  const data = Storage.exportAll();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const filename = `diary-backup-${todayKey()}.json`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const payload = JSON.parse(e.target.result);
      Storage.validateImportPayload(payload);
      if (!confirm(t("confirm_import"))) return;
      Storage.importAll(payload);
      alert(t("alert_imported"));
      location.reload();
    } catch (err) {
      alert("File error: " + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

/* ---------- СОБЫТИЯ ---------- */
function bindEvents() {
  els.navItems.forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  els.prevDayBtn.addEventListener("click", () => switchDate(-1));
  els.nextDayBtn.addEventListener("click", () => switchDate(+1));
  els.goTodayBtn.addEventListener("click", goToToday);

  els.prevDayTLBtn?.addEventListener("click", () => switchDate(-1));
  els.nextDayTLBtn?.addEventListener("click", () => switchDate(+1));
  els.goTodayTLBtn?.addEventListener("click", goToToday);

  els.timelineContainer.addEventListener("click", handleTimelineClick);

  els.newTaskBtn.addEventListener("click", () => openTaskModal());
  els.closeTaskModalBtn.addEventListener("click", closeTaskModal);
  els.cancelTaskModalBtn.addEventListener("click", closeTaskModal);
  els.taskModal.addEventListener("click", (e) => {
    if (e.target === els.taskModal) closeTaskModal();
  });

  els.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const rawTitle = els.taskInput.value;
    const { title, tags } = parseTags(rawTitle);
    if (!title) return;

    const data = {
      title,
      tags,
      priority: els.taskPriority.value || null,
      dueDate: els.taskDueDate.value || null,
      startTime: els.taskStartTime.value || null,
      duration: els.taskDuration.value ? Number(els.taskDuration.value) : null,
      repeat: els.taskRepeat.value || null,
    };

    if (state.taskEditId) updateTask(state.taskEditId, data);
    else
      addTask(
        rawTitle,
        data.priority,
        data.dueDate,
        data.repeat,
        data.startTime,
        data.duration,
      );
    closeTaskModal();
  });

  els.taskInput.addEventListener("input", updateTagsPreview);

  els.clearTaskOptionsBtn.addEventListener("click", () => {
    els.taskPriority.value = "";
    els.taskDueDate.value = "";
    els.taskRepeat.value = "";
    els.taskStartTime.value = "";
    els.taskDuration.value = "";
    els.taskInput.focus();
  });

  els.taskList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");

    if (!btn) {
      const title = e.target.closest(".task-title");
      if (title) {
        const li = title.closest(".task-item");
        if (li) openTaskModal(li.dataset.id);
      }
      return;
    }

    const li = btn.closest(".task-item");
    const taskId = li?.dataset.id;
    if (!taskId) return;

    const action = btn.dataset.action;
    if (action === "toggle") state.highlightId = taskId;
    if (action === "priority") state.highlightId = taskId;

    if (action === "toggle") toggleTask(taskId);
    if (action === "delete") deleteTask(taskId);
    if (action === "priority") cyclePriority(taskId);
    if (action === "timer") toggleTimer(taskId);
    if (action === "pomodoro") openPomodoro(taskId);
    if (action === "ai-split") splitTaskWithAI(taskId);
    if (action === "toggle-subtasks") toggleSubtasks(taskId);

    if (action === "toggle-subtask") {
      const sid = btn.dataset.subtaskId;
      if (sid) toggleSubtask(taskId, sid);
    }
    if (action === "delete-subtask") {
      const sid = btn.dataset.subtaskId;
      if (sid) deleteSubtask(taskId, sid);
    }
  });

  els.taskList.addEventListener("submit", (e) => {
    const form = e.target.closest('[data-action="add-subtask"]');
    if (!form) return;
    e.preventDefault();
    const li = form.closest(".task-item");
    const taskId = li?.dataset.id;
    if (!taskId) return;
    const input = form.querySelector(".subtask-add-input");
    if (!input) return;
    addSubtask(taskId, input.value);
    input.value = "";
    setTimeout(() => {
      const freshInput = document.querySelector(
        `.task-item[data-id="${taskId}"] .subtask-add-input`,
      );
      freshInput?.focus();
    }, 30);
  });

  els.dayReport.addEventListener("input", () => {
    state.report = els.dayReport.value;
    markDirty();
  });

  els.saveReportBtn.addEventListener("click", () => {
    state.report = els.dayReport.value;
    markDirty();
    const btn = els.saveReportBtn;
    const old = btn.textContent;
    btn.textContent = "✓";
    setTimeout(() => (btn.textContent = old), 1200);
  });

  document
    .getElementById("aiAnalyzeBtn")
    ?.addEventListener("click", analyzeDayWithAI);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!els.taskModal.classList.contains("hidden")) closeTaskModal();
  });

  /* Тема — циклический переключатель */
  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    const current = Storage.loadTheme();
    const next =
      current === "dark" ? "light" : current === "light" ? "auto" : "dark";
    Storage.saveTheme(next);
    const settings = Storage.loadSettings();
    settings.theme = next;
    Storage.saveSettings(settings);
    applyTheme();
    applyLanguage();
  });

  document.getElementById("exportBtn")?.addEventListener("click", handleExport);
  document.getElementById("importBtn")?.addEventListener("click", () => {
    document.getElementById("importFileInput")?.click();
  });
  document
    .getElementById("importFileInput")
    ?.addEventListener("change", handleImport);

  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const inField = tag === "input" || tag === "textarea" || tag === "select";
    if (inField) return;
    const anyModalOpen = !els.taskModal.classList.contains("hidden");
    if (anyModalOpen) return;
    if (e.key === "ArrowLeft") switchDate(-1);
    if (e.key === "ArrowRight") switchDate(1);
    if (e.key.toLowerCase() === "t") goToToday();
  });
    /* =========================================================
     Мобильная навигация (нижняя панель)
  ========================================================= */
  document.querySelectorAll("[data-mobile-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.mobileView;
      switchView(view);

      document
        .querySelectorAll(".mobile-nav-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  /* Кнопка "Ещё" — открывает простое меню */
  document.getElementById("mobileSettingsBtn")?.addEventListener("click", () => {
    const choice = prompt(
      "Настройки:\n\n" +
        "1 — Переключить тему\n" +
        "2 — Экспорт данных\n" +
        "3 — Импорт данных\n\n" +
        "Введи номер:",
    );

    if (choice === "1") {
      document.getElementById("themeToggleBtn")?.click();
    } else if (choice === "2") {
      document.getElementById("exportBtn")?.click();
    } else if (choice === "3") {
      document.getElementById("importBtn")?.click();
    }
  });
}

/* ---------- ИНИЦИАЛИЗАЦИЯ ---------- */
async function init() {
  state.settings = Storage.loadSettings();
  applyTheme();
  applyLanguage();
  loadFromStorage();
  renderTasks();
  renderDayHeader();
  initTodayWeekChart();
  bindEvents();
  bindPomodoroEvents();
  bindNotesEvents();
  bindHealthEvents();

  updateClock();
  setInterval(updateClock, 30000);

  /* Запуск синхронизации с Telegram-ботом */
  if (typeof startSync === "function") startSync();
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});

/* ---------- СИНХРОНИЗАЦИЯ ТЕМЫ ---------- */
window.addEventListener("storage", (e) => {
  if (e.key === Storage.themeStorageKey() || e.key === null) applyTheme();
});
