/* =========================================================
   pomodoro.js — модуль Помодоро 25/5.
========================================================= */

let POMODORO_WORK_SEC = 25 * 60;
let POMODORO_REST_SEC = 5 * 60;

function playBeep(times = 1) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.3);
      t += 0.35;
    }
  } catch (e) {
    console.warn("Audio:", e);
  }
}

function fmtPomodoroTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function applyPomodoroPreset(preset) {
  const [work, rest] = preset.split("/").map(Number);
  POMODORO_WORK_SEC = work * 60;
  POMODORO_REST_SEC = rest * 60;
  Storage.savePomodoroPreset(preset);
  state.pomodoro.phase = "work";
  state.pomodoro.secondsLeft = POMODORO_WORK_SEC;
  pausePomodoro();
  renderPomodoroPresets();
  renderPomodoroUI();
}

function renderPomodoroPresets() {
  const current = `${POMODORO_WORK_SEC / 60}/${POMODORO_REST_SEC / 60}`;
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === current);
  });
}

function loadPomodoroPreset() {
  const preset = Storage.loadPomodoroPreset();
  const [work, rest] = preset.split("/").map(Number);
  POMODORO_WORK_SEC = work * 60;
  POMODORO_REST_SEC = rest * 60;
}

function renderPomodoroUI() {
  const isRest = state.pomodoro.phase === "rest";
  document.querySelector(".pomodoro-box")?.classList.toggle("rest", isRest);

  const phaseEl = document.getElementById("pomodoroPhase");
  if (!phaseEl) return;

  phaseEl.textContent = isRest ? t("pomodoro_rest") : t("pomodoro_work");
  document.getElementById("pomodoroTime").textContent = fmtPomodoroTime(
    state.pomodoro.secondsLeft,
  );
  document.getElementById("pomodoroCount").textContent = state.pomodoro.count;

  const task = state.tasks.find((t) => t.id === state.pomodoro.taskId);
  document.getElementById("pomodoroTaskTitle").textContent = task
    ? task.title
    : "—";

  document.getElementById("pomodoroToggleBtn").textContent = state.pomodoro
    .intervalId
    ? t("pomodoro_pause")
    : t("pomodoro_start");
  document.getElementById("pomodoroResetBtn").textContent = t("pomodoro_reset");
  document.getElementById("pomodoroSkipBtn").textContent = t("pomodoro_skip");
}

function startPomodoroCountdown() {
  if (state.pomodoro.intervalId) return;

  state.pomodoro.intervalId = setInterval(() => {
    state.pomodoro.secondsLeft -= 1;

    if (state.pomodoro.secondsLeft <= 0) {
      const wasWork = state.pomodoro.phase === "work";

      if (wasWork) {
        state.pomodoro.count += 1;
        Storage.savePomodoro(state.currentDate, state.pomodoro.count);
        pushItem({
          id: `pomodoro_${state.currentDate}`,
          kind: "pomodoro",
          date: state.currentDate,
          count: state.pomodoro.count,
          updatedAt: Date.now(),
        });
        const el = document.getElementById("statsPomodoro");
        if (el) el.textContent = state.pomodoro.count;
        playBeep(2);
        state.pomodoro.phase = "rest";
        state.pomodoro.secondsLeft = POMODORO_REST_SEC;
      } else {
        playBeep(1);
        state.pomodoro.phase = "work";
        state.pomodoro.secondsLeft = POMODORO_WORK_SEC;
      }
    }
    renderPomodoroUI();
  }, 1000);
}

function pausePomodoro() {
  if (state.pomodoro.intervalId) {
    clearInterval(state.pomodoro.intervalId);
    state.pomodoro.intervalId = null;
  }
}

function resetPomodoro() {
  pausePomodoro();
  state.pomodoro.phase = "work";
  state.pomodoro.secondsLeft = POMODORO_WORK_SEC;
  renderPomodoroUI();
}

function skipPomodoroPhase() {
  pausePomodoro();
  if (state.pomodoro.phase === "work") {
    state.pomodoro.count += 1;
    Storage.savePomodoro(state.currentDate, state.pomodoro.count);
    pushItem({
      id: `pomodoro_${state.currentDate}`,
      kind: "pomodoro",
      date: state.currentDate,
      count: state.pomodoro.count,
      updatedAt: Date.now(),
    });
    const el = document.getElementById("statsPomodoro");
    if (el) el.textContent = state.pomodoro.count;
    state.pomodoro.phase = "rest";
    state.pomodoro.secondsLeft = POMODORO_REST_SEC;
  } else {
    state.pomodoro.phase = "work";
    state.pomodoro.secondsLeft = POMODORO_WORK_SEC;
  }
  renderPomodoroUI();
}

function openPomodoro(taskId) {
  state.pomodoro.taskId = taskId;
  state.pomodoro.phase = "work";
  state.pomodoro.secondsLeft = POMODORO_WORK_SEC;
  state.pomodoro.count = Storage.loadPomodoro(state.currentDate);
  document.getElementById("pomodoroOverlay").classList.remove("hidden");
  renderPomodoroPresets();
  renderPomodoroUI();
}

function closePomodoro() {
  pausePomodoro();
  document.getElementById("pomodoroOverlay")?.classList.add("hidden");
  state.pomodoro.taskId = null;
}

/** Обновляет счётчик в шапке и в открытом оверлее */
function updatePomodoroCounter() {
  const count = Storage.loadPomodoro(state.currentDate);

  const el = document.getElementById("statsPomodoro");
  if (el) el.textContent = count;

  const overlay = document.getElementById("pomodoroOverlay");
  if (overlay && !overlay.classList.contains("hidden")) {
    state.pomodoro.count = count;
    renderPomodoroUI();
  }
}

function bindPomodoroEvents() {
  document
    .getElementById("closePomodoroBtn")
    ?.addEventListener("click", closePomodoro);

  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      pausePomodoro();
      applyPomodoroPreset(btn.dataset.preset);
    });
  });

  document
    .getElementById("pomodoroToggleBtn")
    ?.addEventListener("click", () => {
      if (state.pomodoro.intervalId) pausePomodoro();
      else startPomodoroCountdown();
      renderPomodoroUI();
    });

  document
    .getElementById("pomodoroResetBtn")
    ?.addEventListener("click", resetPomodoro);
  document
    .getElementById("pomodoroSkipBtn")
    ?.addEventListener("click", skipPomodoroPhase);

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !document.getElementById("pomodoroOverlay")?.classList.contains("hidden")
    ) {
      closePomodoro();
    }
  });

  loadPomodoroPreset();
  renderPomodoroPresets();
}