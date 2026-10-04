/* =========================================================
   health.js — модуль здоровья: подъём + физ. упражнения.
========================================================= */

/** Рендер виджета в разделе «День» */
function renderHealthWidget() {
  const wakeEl = document.getElementById("wakeTime");
  const listEl = document.getElementById("exercisesList");
  const emptyEl = document.getElementById("exercisesEmpty");
  const countEl = document.getElementById("exercisesTotal");
  if (!wakeEl) return;

  const wake = Storage.loadWake(state.currentDate);
  wakeEl.value = wake || "";

  const exercises = Storage.loadExercises(state.currentDate);

  listEl.innerHTML = exercises
    .map(
      (ex) => `
    <li class="exercise-item" data-id="${ex.id}">
      <span class="exercise-name">${escapeHtml(ex.type)}</span>
      <span class="exercise-min">${ex.duration} мин</span>
      <button class="exercise-delete" data-action="delete-exercise" data-id="${ex.id}" title="Удалить">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.4"
             stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </li>
  `,
    )
    .join("");

  emptyEl.classList.toggle("hidden", exercises.length > 0);

  const totalMin = exercises.reduce((s, e) => s + (e.duration || 0), 0);
  if (countEl) countEl.textContent = totalMin ? totalMin + " мин" : "—";
}

/* ---------- Операции ---------- */

function saveWakeTime(value) {
  Storage.saveWake(state.currentDate, value || null);
  pushItem({
    id: `wake_${state.currentDate}`,
    kind: "wake",
    date: state.currentDate,
    time: value || null,
    updatedAt: Date.now(),
  });
}

function addExercise() {
  const type = document.getElementById("exerciseType").value;
  const durInput = document.getElementById("exerciseDuration");
  const duration = Number(durInput.value);
  if (!type || !duration || duration < 1) return;

  const exercises = Storage.loadExercises(state.currentDate);
  const newEx = { id: uid(), type, duration };
  exercises.push(newEx);
  Storage.saveExercises(state.currentDate, exercises);

  pushItem({
    id: newEx.id,
    kind: "exercise",
    date: state.currentDate,
    type: newEx.type,
    duration: newEx.duration,
    updatedAt: Date.now(),
  });

  durInput.value = "";
  renderHealthWidget();
  updateWeekHealthCharts();
}

function deleteExercise(id) {
  const exercises = Storage.loadExercises(state.currentDate).filter(
    (e) => e.id !== id,
  );
  Storage.saveExercises(state.currentDate, exercises);
  pushDelete(id, "exercise");
  renderHealthWidget();
  updateWeekHealthCharts();
}

/* ---------- Данные для аналитики ---------- */

function computeWeekHealth() {
  const out = { labels: [], wake: [], exercise: [] };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    out.labels.push(`${dd}.${mm}`);

    const wake = Storage.loadWake(key);
    if (wake) {
      const [h, m] = wake.split(":").map(Number);
      out.wake.push(h + m / 60);
    } else {
      out.wake.push(null);
    }

    const exercises = Storage.loadExercises(key);
    out.exercise.push(exercises.reduce((s, e) => s + (e.duration || 0), 0));
  }
  return out;
}

/* ---------- Графики ---------- */

function initHealthCharts() {
  if (typeof Chart === "undefined") return;

  const data = computeWeekHealth();

  /* График подъёма — линия */
  const wakeCanvas = document.getElementById("wakeChart");
  if (wakeCanvas && !state.wakeChartInstance) {
    const ctx = wakeCanvas.getContext("2d");
    state.wakeChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Подъём",
            data: data.wake,
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: "#f59e0b",
            pointBorderColor: "#121218",
            pointBorderWidth: 2,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#16161d",
            borderColor: "#23232d",
            borderWidth: 1,
            padding: 10,
            titleColor: "#e2e2ea",
            bodyColor: "#a2a2b4",
            displayColors: false,
            callbacks: {
              label: (c) => {
                const v = c.parsed.y;
                if (v == null) return " нет данных";
                const h = Math.floor(v);
                const m = Math.round((v - h) * 60);
                return ` ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            reverse: true,
            min: 4,
            max: 12,
            grid: { color: "rgba(35, 35, 45, 0.7)" },
            border: { display: false },
            ticks: {
              stepSize: 1,
              font: { size: 11 },
              callback: (v) => `${String(v).padStart(2, "0")}:00`,
            },
          },
        },
      },
    });
  }

  /* График упражнений — столбики */
  const exCanvas = document.getElementById("exerciseChart");
  if (exCanvas && !state.exerciseChartInstance) {
    const ctx = exCanvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, "rgba(16, 185, 129, 0.95)");
    g.addColorStop(0.6, "rgba(16, 185, 129, 0.55)");
    g.addColorStop(1, "rgba(16, 185, 129, 0.05)");

    state.exerciseChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Минуты",
            data: data.exercise,
            backgroundColor: g,
            hoverBackgroundColor: "rgba(16, 185, 129, 1)",
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 34,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#16161d",
            borderColor: "#23232d",
            borderWidth: 1,
            padding: 10,
            titleColor: "#e2e2ea",
            bodyColor: "#a2a2b4",
            displayColors: false,
            callbacks: { label: (c) => ` ${c.parsed.y} мин` },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(35, 35, 45, 0.7)" },
            border: { display: false },
            ticks: {
              stepSize: 30,
              font: { size: 11 },
              callback: (v) => `${v}м`,
            },
          },
        },
      },
    });
  }
}

function updateWeekHealthCharts() {
  const data = computeWeekHealth();

  if (state.wakeChartInstance) {
    state.wakeChartInstance.data.labels = data.labels;
    state.wakeChartInstance.data.datasets[0].data = data.wake;
    state.wakeChartInstance.update("none");
  }
  if (state.exerciseChartInstance) {
    state.exerciseChartInstance.data.labels = data.labels;
    state.exerciseChartInstance.data.datasets[0].data = data.exercise;
    state.exerciseChartInstance.update("none");
  }
}

/* ---------- Обработчики ---------- */

function bindHealthEvents() {
  const wakeEl = document.getElementById("wakeTime");
  if (wakeEl) {
    wakeEl.addEventListener("change", (e) => {
      saveWakeTime(e.target.value);
      updateWeekHealthCharts();
    });
  }

  document
    .getElementById("addExerciseBtn")
    ?.addEventListener("click", addExercise);

  document
    .getElementById("exerciseDuration")
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addExercise();
      }
    });

  document.getElementById("exercisesList")?.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="delete-exercise"]');
    if (!btn) return;
    deleteExercise(btn.dataset.id);
  });
}