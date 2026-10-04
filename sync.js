/* =========================================================
   sync.js — двусторонняя синхронизация + бэкапы.
   Все запросы идут через Deno (он добавляет секрет).
========================================================= */

const SYNC_URL = "https://my-diary.iehsbsbjisjshb.deno.net";
const SYNC_INTERVAL_MS = 15000;
const SYNC_LAST_KEY = "diary:sync:lastTs";
const SYNC_NOTIFY_KEY = "diary:sync:notify";
const BACKUP_LAST_KEY = "diary:sync:lastBackup";
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 сутки

let __syncTimer = null;
let __backupTimer = null;

const __syncChannel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("diary-sync")
    : null;

function getLastSyncTs() {
  return Number(localStorage.getItem(SYNC_LAST_KEY) || 0);
}
function setLastSyncTs(ts) {
  localStorage.setItem(SYNC_LAST_KEY, String(ts));
}

/* =========================================================
   PUSH
========================================================= */
async function pushItem(item) {
  if (!item || !item.id) return false;
  if (!item.kind) item = { ...item, kind: "task" };

  const dateKey =
    item.kind === "task" ? item.dueDate || state.currentDate : null;
  const payload = { ...item, dateKey };

  if (__syncChannel) {
    try {
      __syncChannel.postMessage({ type: "item", item: payload });
    } catch (e) {
      console.warn("[sync] broadcast ошибка:", e.message);
    }
  }

  try {
    localStorage.setItem(SYNC_NOTIFY_KEY, String(Date.now()));
  } catch (e) {
    /* ignore */
  }

  try {
    const res = await fetch(`${SYNC_URL}/api/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (e) {
    console.warn("[sync] push ошибка:", e.message);
    return false;
  }
}

async function pushDelete(id, kind) {
  if (!id) return false;
  return pushItem({
    id,
    kind,
    deleted: true,
    updatedAt: Date.now(),
  });
}

/* =========================================================
   МЕРДЖ
========================================================= */
function mergeSyncedItem(item) {
  if (!item || !item.kind) return false;

  /* ---------- УДАЛЕНИЕ ---------- */
  if (item.deleted) {
    if (item.kind === "task") {
      let removed = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("diary:tasks:")) continue;
        const dateKey = key.slice("diary:tasks:".length);
        const tasks = Storage.loadTasks(dateKey);
        const filtered = tasks.filter((t) => t.id !== item.id);
        if (filtered.length !== tasks.length) {
          Storage.saveTasks(dateKey, filtered);
          removed = true;
        }
      }
      return removed;
    }
    if (item.kind === "note") {
      const notes = Storage.loadNotes();
      const filtered = notes.filter((n) => n.id !== item.id);
      if (filtered.length !== notes.length) {
        Storage.saveNotes(filtered);
        return true;
      }
      return false;
    }
    if (item.kind === "exercise") {
      const dateKey = item.date || todayKey();
      const exercises = Storage.loadExercises(dateKey);
      const filtered = exercises.filter((e) => e.id !== item.id);
      if (filtered.length !== exercises.length) {
        Storage.saveExercises(dateKey, filtered);
        return true;
      }
      return false;
    }
    return false;
  }

  /* ---------- TASK ---------- */
  if (item.kind === "task") {
    const dateKey = item.dateKey || item.dueDate || todayKey();
    const tasks = Storage.loadTasks(dateKey);

    const idx = tasks.findIndex((t) => t.id === item.id);
    if (idx >= 0) {
      if ((item.updatedAt || 0) > (tasks[idx].updatedAt || 0)) {
        tasks[idx] = { ...tasks[idx], ...item };
        Storage.saveTasks(dateKey, tasks);
        return true;
      }
      return false;
    }

    tasks.unshift({
      id: item.id,
      title: item.title || "Без названия",
      done: !!item.done,
      createdAt: item.createdAt || Date.now(),
      tags: item.tags || [],
      priority: item.priority || null,
      dueDate: item.dueDate || null,
      startTime: item.startTime || null,
      duration: item.duration || null,
      subtasks: item.subtasks || [],
      repeat: null,
      repeatedFrom: null,
      source: item.source || DEVICE_ID,
      updatedAt: item.updatedAt || Date.now(),
    });
    Storage.saveTasks(dateKey, tasks);
    return true;
  }

  /* ---------- NOTE ---------- */
  if (item.kind === "note") {
    const notes = Storage.loadNotes();
    const idx = notes.findIndex((n) => n.id === item.id);
    if (idx >= 0) {
      if ((item.updatedAt || 0) > (notes[idx].updatedAt || 0)) {
        notes[idx] = { ...notes[idx], ...item };
        Storage.saveNotes(notes);
        return true;
      }
      return false;
    }
    notes.unshift({
      id: item.id,
      title: item.title || "Без названия",
      content: item.content || "",
      pinned: !!item.pinned,
      linkedTaskId: item.linkedTaskId || null,
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
      source: item.source || DEVICE_ID,
    });
    Storage.saveNotes(notes);
    return true;
  }

  /* ---------- REPORT ---------- */
  if (item.kind === "report") {
    const dateKey = item.date || todayKey();
    const current = Storage.loadReport(dateKey);
    const next = item.text || "";
    if (current === next) return false;
    Storage.saveReport(dateKey, next);
    return true;
  }

  /* ---------- EXERCISE ---------- */
  if (item.kind === "exercise") {
    const dateKey = item.date || todayKey();
    const exercises = Storage.loadExercises(dateKey);
    const idx = exercises.findIndex((e) => e.id === item.id);

    const entry = {
      id: item.id,
      type: item.type,
      duration: item.duration,
    };

    if (idx >= 0) {
      const old = exercises[idx];
      if (old.type === entry.type && old.duration === entry.duration) {
        return false;
      }
      exercises[idx] = entry;
    } else {
      exercises.push(entry);
    }
    Storage.saveExercises(dateKey, exercises);
    return true;
  }

  /* ---------- WAKE ---------- */
  if (item.kind === "wake") {
    const dateKey = item.date || todayKey();
    const current = Storage.loadWake(dateKey);
    const next = item.time || null;
    if (current === next) return false;
    Storage.saveWake(dateKey, next);
    return true;
  }

  /* ---------- POMODORO ---------- */
  if (item.kind === "pomodoro") {
    const dateKey = item.date || todayKey();
    const current = Storage.loadPomodoro(dateKey);
    const next = Number(item.count) || 0;
    if (current === next) return false;
    Storage.savePomodoro(dateKey, next);
    return true;
  }

  return false;
}

/* =========================================================
   Обновление UI
========================================================= */
function refreshUIFromStorage() {
  const newTasks = Storage.loadTasks(state.currentDate);
  const newNotes = Storage.loadNotes();
  const newReport = Storage.loadReport(state.currentDate);

  let changed = false;

  if (JSON.stringify(newTasks) !== JSON.stringify(state.tasks)) {
    state.tasks = newTasks;
    changed = true;
  }
  if (JSON.stringify(newNotes) !== JSON.stringify(state.notes)) {
    state.notes = newNotes;
    changed = true;
  }
  if (newReport !== state.report) {
    state.report = newReport;
    if (els.dayReport) els.dayReport.value = state.report;
    changed = true;
  }

  if (typeof renderHealthWidget === "function") renderHealthWidget();
  if (typeof updatePomodoroCounter === "function") updatePomodoroCounter();

  if (changed) {
    if (typeof renderActiveView === "function") renderActiveView();
    else if (typeof renderTasks === "function") renderTasks();
  }

  return changed;
}

/* =========================================================
   PULL
========================================================= */
async function syncPull({ silent = false } = {}) {
  const since = getLastSyncTs();

  try {
    const res = await fetch(`${SYNC_URL}/api/pull?since=${since}`);

    if (!res.ok) throw new Error("HTTP " + res.status);

    const { items, serverTime } = await res.json();
    let changed = 0;
    for (const item of items || []) {
      if (mergeSyncedItem(item)) changed++;
    }
    setLastSyncTs(serverTime || Date.now());

    const uiChanged = refreshUIFromStorage();

    if (changed > 0 || uiChanged) {
      console.log(
        `[sync] изменений: ${changed}, UI ${uiChanged ? "перерисован" : "не тронут"}`,
      );
    }

    setSyncIndicator("ok");
  } catch (e) {
    console.warn("[sync] ошибка:", e.message);
    setSyncIndicator("error");
    if (!silent) console.error(e);
  }
}

function setSyncIndicator(status) {
  const el = document.getElementById("syncIndicator");
  if (!el) return;
  el.dataset.status = status;
  el.textContent = status === "idle" ? "○" : "●";
}

/* =========================================================
   BACKUP — отправка snapshot раз в сутки
========================================================= */
async function sendBackup({ force = false } = {}) {
  const lastBackup = Number(localStorage.getItem(BACKUP_LAST_KEY) || 0);
  const now = Date.now();

  if (!force && now - lastBackup < BACKUP_INTERVAL_MS) {
    const left = BACKUP_INTERVAL_MS - (now - lastBackup);
    const hours = Math.floor(left / 1000 / 60 / 60);
    const mins = Math.floor((left / 1000 / 60) % 60);
    console.log(`[backup] следующий через ${hours}ч ${mins}м`);
    return false;
  }

  try {
    const data = Storage.exportAll();
    const payload = { createdAt: now, data };

    const res = await fetch(`${SYNC_URL}/api/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();

    localStorage.setItem(BACKUP_LAST_KEY, String(now));
    console.log(
      `[backup] отправлен успешно, размер ${Math.round(result.size / 1024)} КБ`,
    );
    return true;
  } catch (e) {
    console.warn("[backup] ошибка:", e.message);
    return false;
  }
}

/* =========================================================
   ЗАПУСК
========================================================= */
function startSync() {
  console.log("[sync] старт");

  if (__syncChannel) {
    __syncChannel.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === "item" && data.item) {
        const changed = mergeSyncedItem(data.item);
        if (changed) {
          refreshUIFromStorage();
          console.log("[sync] применено из другой вкладки (channel)");
        }
      }
    };
    console.log("[sync] подписка на BroadcastChannel");
  }

  window.addEventListener("storage", (e) => {
    if (e.key === SYNC_NOTIFY_KEY) {
      console.log("[sync] storage event — тяну с сервера");
      syncPull({ silent: true });
    }
  });

  syncPull({ silent: true });

  if (__syncTimer) clearInterval(__syncTimer);
  __syncTimer = setInterval(() => syncPull({ silent: true }), SYNC_INTERVAL_MS);

  window.addEventListener("focus", () => syncPull({ silent: true }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncPull({ silent: true });
  });

  /* --- Бэкапы --- */
  sendBackup();
  if (__backupTimer) clearInterval(__backupTimer);
  __backupTimer = setInterval(() => sendBackup(), 60 * 60 * 1000);

  console.log("[sync] запущен");
}

function stopSync() {
  if (__syncTimer) {
    clearInterval(__syncTimer);
    __syncTimer = null;
  }
  if (__backupTimer) {
    clearInterval(__backupTimer);
    __backupTimer = null;
  }
}
