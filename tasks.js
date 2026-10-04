/* =========================================================
   tasks.js — модуль задач.
========================================================= */

/* ---------- ПАРСИНГ И ФОРМАТИРОВАНИЕ ---------- */
function parseTags(rawTitle) {
  const tags = [];
  const clean = rawTitle
    .replace(/#([\wа-яё]+)/gi, (_, tag) => {
      tags.push(tag.toLowerCase());
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { title: clean, tags: [...new Set(tags)] };
}

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const today = todayKey();
  const diff = daysBetween(today, dueDate);

  if (diff < 0) return { label: t("due_overdue"), cls: "due-overdue" };
  if (diff === 0) return { label: t("due_today"), cls: "due-today" };
  if (diff === 1) return { label: t("due_tomorrow"), cls: "due-tomorrow" };
  if (diff <= 6) return { label: tDueDate(diff), cls: "due-soon" };

  const locale = state.settings?.language === "en" ? "en-US" : "ru-RU";
  const d = parseDateKey(dueDate);
  return {
    label: d.toLocaleDateString(locale, { day: "numeric", month: "short" }),
    cls: "due-future",
  };
}

function repeatLabel(repeat) {
  return (
    {
      daily: "ежедневно",
      weekdays: "по будням",
      weekly: "еженедельно",
      monthly: "ежемесячно",
    }[repeat] || ""
  );
}

/* ---------- ПОВТОРЫ ---------- */
function shouldRepeatOn(template, dateKeyStr) {
  if (!template.repeat) return false;
  if (dateKeyStr < template.startDate) return false;
  const d = parseDateKey(dateKeyStr);
  const dayOfWeek = d.getDay();
  const startDate = parseDateKey(template.startDate);
  if (template.repeat === "daily") return true;
  if (template.repeat === "weekdays") return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (template.repeat === "weekly") return startDate.getDay() === dayOfWeek;
  if (template.repeat === "monthly") return startDate.getDate() === d.getDate();
  return false;
}

function applyRepeatsForDate(dateKeyStr) {
  const templates = Storage.loadRepeatTemplates();
  if (!templates.length) return;
  const tasks = Storage.loadTasks(dateKeyStr);
  let changed = false;
  const removedList = Storage.loadRemovedRepeats();

  for (const t of templates) {
    if (!shouldRepeatOn(t, dateKeyStr)) continue;
    if (dateKeyStr === t.startDate) continue;
    if (tasks.some((task) => task.repeatedFrom === t.id)) continue;
    const wasRemoved = removedList.some(
      (r) => r.templateId === t.id && r.date === dateKeyStr,
    );
    if (wasRemoved) continue;

    tasks.push({
      id: uid(),
      title: t.title,
      done: false,
      createdAt: Date.now(),
      tags: [...(t.tags || [])],
      priority: t.priority || null,
      dueDate: null,
      startTime: t.startTime || null,
      duration: t.duration || null,
      subtasks: (t.subtasks || []).map((s) => ({
        id: uid(),
        title: s.title,
        done: false,
      })),
      repeat: null,
      repeatedFrom: t.id,
    });
    changed = true;
  }
  if (changed) Storage.saveTasks(dateKeyStr, tasks);
}

function removeRepeatTemplate(templateId) {
  const templates = Storage.loadRepeatTemplates().filter(
    (t) => t.id !== templateId,
  );
  Storage.saveRepeatTemplates(templates);
}

/* ---------- СОРТИРОВКА И РЕНДЕР ---------- */
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pa = a.priority ? PRIORITY_ORDER[a.priority] : 9;
    const pb = b.priority ? PRIORITY_ORDER[b.priority] : 9;
    if (pa !== pb) return pa - pb;
    const da = a.dueDate || "9999-12-31";
    const db = b.dueDate || "9999-12-31";
    if (da !== db) return da < db ? -1 : 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function renderSubtasksBlock(task) {
  const subs = task.subtasks || [];
  const total = subs.length;
  const done = subs.filter((s) => s.done).length;
  const isOpen = state.expandedSubtasks.has(task.id);

  let toggleText;
  if (total === 0) {
    toggleText =
      '<span class="caret ' + (isOpen ? "open" : "") + '">▸</span> Подзадачи';
  } else {
    const allDone = done === total ? "done-all" : "";
    toggleText =
      '<span class="caret ' +
      (isOpen ? "open" : "") +
      '">▸</span> ' +
      '<span class="subtasks-count ' +
      allDone +
      '">' +
      done +
      "/" +
      total +
      "</span> подзадач";
  }

  const subtasksHtml = subs
    .map(
      (s) => `
    <div class="subtask-item${s.done ? " done" : ""}" data-subtask-id="${s.id}">
      <button class="subtask-checkbox" data-action="toggle-subtask" data-subtask-id="${s.id}" aria-label="Отметить">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
             stroke="white" stroke-width="3"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
      <span class="subtask-title">${escapeHtml(s.title)}</span>
      <button class="subtask-delete" data-action="delete-subtask" data-subtask-id="${s.id}" aria-label="Удалить">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `,
    )
    .join("");

  return `
    <div class="subtasks-toggle">
      <button class="subtasks-toggle-btn" data-action="toggle-subtasks">${toggleText}</button>
    </div>
    <div class="subtasks-list${isOpen ? "" : " hidden"}" data-subtasks-for="${task.id}">
      ${subtasksHtml}
      <form class="subtask-add-form" data-action="add-subtask">
        <input class="subtask-add-input" type="text" placeholder="Новая подзадача..." autocomplete="off" />
        <button type="submit" class="subtask-add-btn">+</button>
      </form>
    </div>
  `;
}

function renderTasks() {
  els.taskList.innerHTML = "";
  els.emptyState.classList.toggle("hidden", state.tasks.length > 0);

  const sorted = sortTasks(state.tasks);

  for (const task of sorted) {
    const li = document.createElement("li");
    const flashCls = state.highlightId === task.id ? " flash" : "";
    li.className = "task-item" + (task.done ? " done" : "") + flashCls;
    li.dataset.id = task.id;

    const tagsHtml = (task.tags || [])
      .map((t) => `<span class="tag">#${escapeHtml(t)}</span>`)
      .join("");

    const due = formatDueDate(task.dueDate);
    const dueHtml = due
      ? `<span class="due-badge ${due.cls}">${escapeHtml(due.label)}</span>`
      : "";

    const repeatHtml = task.repeat
      ? `<span class="repeat-badge" title="${repeatLabel(task.repeat)}">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
             <polyline points="17 1 21 5 17 9"></polyline>
             <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
             <polyline points="7 23 3 19 7 15"></polyline>
             <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
           </svg>
           ${repeatLabel(task.repeat)}
         </span>`
      : "";

    const priorityCls = task.priority ? `priority-${task.priority}` : "";

    const timeHtml = task.startTime
      ? `<span class="time-badge">${task.startTime}${task.duration ? " · " + task.duration + " мин" : ""}</span>`
      : "";

    const spentMs = getTaskTime(task);
    const isRunning = state.runningTaskId === task.id;
    const spentHtml =
      spentMs > 0 || isRunning
        ? `<span class="time-spent${isRunning ? " live" : ""}" data-task-id="${task.id}">⏱ ${formatDuration(spentMs)}</span>`
        : "";

    const timerIcon = isRunning ? "⏸" : "▶";
    const timerCls = isRunning ? "timer-btn running" : "timer-btn";

    li.innerHTML = `
      <button class="checkbox" data-action="toggle" aria-label="Отметить">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
             stroke="white" stroke-width="3"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>

      <div class="task-content">
        <span class="task-title">${escapeHtml(task.title)}</span>
        ${tagsHtml || dueHtml || repeatHtml || timeHtml || spentHtml ? `<div class="task-meta">${tagsHtml}${timeHtml}${dueHtml}${repeatHtml}${spentHtml}</div>` : ""}
        ${renderSubtasksBlock(task)}
      </div>

      <button class="${timerCls}" data-action="timer" title="Timer">${timerIcon}</button>
      <button class="pomodoro-btn" data-action="pomodoro" title="Pomodoro">🍅</button>
      <button class="ai-split-btn" data-action="ai-split" title="Разбить на подзадачи (AI)">✨</button>

      <button class="priority-flag ${priorityCls}"
              data-action="priority"
              title="Priority"
              aria-label="Priority"></button>

      <button class="task-delete" data-action="delete" aria-label="Delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    els.taskList.appendChild(li);
  }

  updateStats();
  state.highlightId = null;
}

/* ---------- CRUD ---------- */
function addTask(rawTitle, priority, dueDate, repeat, startTime, duration) {
  const { title, tags } = parseTags(rawTitle);
  if (!title) return;

  const task = {
    id: uid(),
    title,
    done: false,
    createdAt: Date.now(),
    tags,
    priority: priority || null,
    dueDate: dueDate || null,
    startTime: startTime || null,
    duration: duration ? Number(duration) : null,
    subtasks: [],
    repeat: repeat || null,
    repeatedFrom: null,
  };

  state.tasks.unshift(task);

  if (task.repeat) {
    const templates = Storage.loadRepeatTemplates();
    templates.push({
      id: task.id,
      title: task.title,
      tags: [...task.tags],
      priority: task.priority,
      subtasks: [],
      startTime: task.startTime,
      duration: task.duration,
      repeat: task.repeat,
      startDate: state.currentDate,
      createdAt: Date.now(),
    });
    Storage.saveRepeatTemplates(templates);
  }

  renderTasks();
  Storage.saveTasks(state.currentDate, state.tasks);
  pushItem(task);
}

function updateTask(taskId, data) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;

  if (data.title !== undefined) task.title = data.title;
  if (data.tags !== undefined) task.tags = data.tags;
  if (data.priority !== undefined) task.priority = data.priority;
  if (data.dueDate !== undefined) task.dueDate = data.dueDate;
  if (data.startTime !== undefined) task.startTime = data.startTime;
  if (data.duration !== undefined) task.duration = data.duration;
  if (data.repeat !== undefined) task.repeat = data.repeat;

  if (task.repeat) {
    const templates = Storage.loadRepeatTemplates();
    const tpl = templates.find((x) => x.id === task.id);
    if (tpl) {
      tpl.title = task.title;
      tpl.tags = [...(task.tags || [])];
      tpl.priority = task.priority;
      tpl.repeat = task.repeat;
      tpl.startTime = task.startTime;
      tpl.duration = task.duration;
    }
    Storage.saveRepeatTemplates(templates);
  }

  renderTasks();
  Storage.saveTasks(state.currentDate, state.tasks);
  pushItem(task);
}

function toggleTask(id) {
  const task = state.tasks.find((x) => x.id === id);
  if (!task) return;
  task.done = !task.done;
  task.updatedAt = Date.now();
  renderTasks();
  Storage.saveTasks(state.currentDate, state.tasks);
  pushItem(task);
}

function deleteTask(id) {
  const task = state.tasks.find((x) => x.id === id);
  if (!task) return;

  if (task.repeatedFrom) {
    const removed = Storage.loadRemovedRepeats();
    const already = removed.some(
      (r) => r.templateId === task.repeatedFrom && r.date === state.currentDate,
    );
    if (!already) {
      removed.push({ templateId: task.repeatedFrom, date: state.currentDate });
      Storage.saveRemovedRepeats(removed);
    }
  }

  if (task.repeat && typeof removeRepeatTemplate === "function") {
    removeRepeatTemplate(task.id);
  }

  state.tasks = state.tasks.filter((x) => x.id !== id);
  renderTasks();
  Storage.saveTasks(state.currentDate, state.tasks);
  pushDelete(id, "task");
}

function cyclePriority(id) {
  const task = state.tasks.find((x) => x.id === id);
  if (!task) return;
  const idx = PRIORITY_CYCLE.indexOf(task.priority ?? null);
  task.priority = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];

  if (task.repeat) {
    const templates = Storage.loadRepeatTemplates();
    const t = templates.find((x) => x.id === task.id);
    if (t) t.priority = task.priority;
    Storage.saveRepeatTemplates(templates);
  }

  task.updatedAt = Date.now();
  renderTasks();
  Storage.saveTasks(state.currentDate, state.tasks);
  pushItem(task);
}

function updateStats() {
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.done).length;
  els.statsTotal.textContent = total;
  els.statsDone.textContent = done;
  const timeEl = document.getElementById("statsTime");
  if (timeEl) timeEl.textContent = formatDuration(getDayTotalMs());
}

function updateTagsPreview() {
  const { tags } = parseTags(els.taskInput.value);
  if (!tags.length) {
    els.taskTagsPreview.classList.add("hidden");
    els.taskTagsPreview.innerHTML = "";
    return;
  }
  els.taskTagsPreview.innerHTML =
    `<span class="task-tags-preview-label">Будут добавлены:</span>` +
    tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("");
  els.taskTagsPreview.classList.remove("hidden");
}

/* ---------- ПОДЗАДАЧИ ---------- */
function toggleSubtasks(taskId) {
  if (state.expandedSubtasks.has(taskId)) state.expandedSubtasks.delete(taskId);
  else state.expandedSubtasks.add(taskId);
  Storage.saveExpandedSubtasks([...state.expandedSubtasks]);
  renderTasks();
}

function addSubtask(taskId, title) {
  const t = title.trim();
  if (!t) return;
  const task = state.tasks.find((x) => x.id === taskId);
  if (!task) return;

  task.subtasks = task.subtasks || [];
  task.subtasks.push({ id: uid(), title: t, done: false });

  if (task.repeat) {
    const templates = Storage.loadRepeatTemplates();
    const tpl = templates.find((x) => x.id === task.id);
    if (tpl) tpl.subtasks = task.subtasks.map((s) => ({ title: s.title }));
    Storage.saveRepeatTemplates(templates);
  }

  state.expandedSubtasks.add(taskId);
  Storage.saveExpandedSubtasks([...state.expandedSubtasks]);
  task.updatedAt = Date.now();
  renderTasks();
  Storage.saveTasks(state.currentDate, state.tasks);
  pushItem(task);
}

function toggleSubtask(taskId, subtaskId) {
  const task = state.tasks.find((x) => x.id === taskId);
  if (!task) return;
  const sub = (task.subtasks || []).find((s) => s.id === subtaskId);
  if (!sub) return;
  sub.done = !sub.done;
  task.updatedAt = Date.now();
  renderTasks();
  Storage.saveTasks(state.currentDate, state.tasks);
  pushItem(task);
}

function deleteSubtask(taskId, subtaskId) {
  const task = state.tasks.find((x) => x.id === taskId);
  if (!task) return;
  task.subtasks = (task.subtasks || []).filter((s) => s.id !== subtaskId);
  task.updatedAt = Date.now();
  renderTasks();
  Storage.saveTasks(state.currentDate, state.tasks);
  pushItem(task);
}

/* ---------- ТАЙМЕР ---------- */
function formatDuration(ms) {
  if (!ms || ms < 1000) return "0м";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м`;
  return `${totalSec}с`;
}

function getTaskTime(task) {
  const stored = task.timeSpent || 0;
  if (state.runningTaskId === task.id)
    return stored + (Date.now() - state.timerStart);
  return stored;
}

function getDayTotalMs() {
  return state.tasks.reduce((sum, t) => sum + getTaskTime(t), 0);
}

function toggleTimer(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;

  if (state.runningTaskId === taskId) {
    task.timeSpent = getTaskTime(task);
    state.runningTaskId = null;
    state.timerStart = 0;
    stopTimerTick();
    updateStats();
    task.updatedAt = Date.now();
    Storage.saveTasks(state.currentDate, state.tasks);
    pushItem(task);
    renderTasks();
    return;
  }

  if (state.runningTaskId) {
    const other = state.tasks.find((t) => t.id === state.runningTaskId);
    if (other) other.timeSpent = getTaskTime(other);
  }

  state.runningTaskId = taskId;
  state.timerStart = Date.now();
  startTimerTick();
  renderTasks();
}

let __tickInterval = null;
function startTimerTick() {
  stopTimerTick();
  __tickInterval = setInterval(() => {
    if (!state.runningTaskId) return;
    const task = state.tasks.find((t) => t.id === state.runningTaskId);
    if (!task) return;
    const el = document.querySelector(`.time-spent[data-task-id="${task.id}"]`);
    if (el) el.textContent = "⏱ " + formatDuration(getTaskTime(task));
    const totalEl = document.getElementById("statsTime");
    if (totalEl) totalEl.textContent = formatDuration(getDayTotalMs());
  }, 1000);
}

function stopTimerTick() {
  if (__tickInterval) {
    clearInterval(__tickInterval);
    __tickInterval = null;
  }
}