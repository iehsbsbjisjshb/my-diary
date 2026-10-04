/* =========================================================
   analytics.js — графики, метрики, таблица за неделю.
========================================================= */

function computeWeekStats() {
  const stats = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    const tasks = Storage.loadTasks(key);

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");

    stats.push({
      day: WEEKDAY_SHORT[d.getDay()],
      date: `${dd}.${mm}`,
      dateKey: key,
      done: tasks.filter((t) => t.done).length,
      total: tasks.length,
    });
  }
  return stats;
}

function renderWeekMetrics(stats) {
  const avg = Math.round(
    stats.reduce((s, d) => s + efficiency(d), 0) / stats.length,
  );
  els.metricAvg.textContent = avg;
  els.metricAvgDelta.textContent =
    avg >= 60 ? "↑ Выше целевого уровня" : "↓ Ниже целевого уровня";

  const totalDone = stats.reduce((s, d) => s + d.done, 0);
  const totalAll = stats.reduce((s, d) => s + d.total, 0);
  const donePercent = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;
  els.metricDone.textContent = totalDone;
  els.metricTotal.textContent = totalAll;
  els.metricDonePercent.textContent = totalAll
    ? `${donePercent}% от всех запланированных`
    : "Пока нет ни одной задачи";

  const best = stats.reduce(
    (acc, d) => (efficiency(d) > efficiency(acc) ? d : acc),
    stats[0],
  );
  if (best.total === 0) {
    els.metricBestDay.textContent = "—";
    els.metricBestValue.textContent = "Нет данных";
  } else {
    els.metricBestDay.textContent = best.day;
    els.metricBestValue.textContent = `${efficiency(best)}% • ${best.date}`;
  }
}

function renderWeekTable(stats) {
  els.weekTableBody.innerHTML = stats
    .map((d) => {
      const eff = efficiency(d);
      const empty = d.total === 0;
      return `
      <tr>
        <td class="font-medium">${d.day}</td>
        <td class="text-muted">${d.date}</td>
        <td class="text-right">${d.done}</td>
        <td class="text-right text-muted">${d.total}</td>
        <td>
          <div class="progress-mini"><span style="width:${empty ? 0 : eff}%"></span></div>
          <div class="progress-label">${empty ? "—" : eff + "%"}</div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function makeBarGradient(ctx, height = 260) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "rgba(139, 92, 246, 0.95)");
  g.addColorStop(0.6, "rgba(99, 102, 241, 0.55)");
  g.addColorStop(1, "rgba(99, 102, 241, 0.05)");
  return g;
}

function barChartOptions() {
  return {
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
        callbacks: { label: (c) => ` ${c.parsed.y}%` },
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
        max: 100,
        grid: { color: "rgba(35, 35, 45, 0.7)" },
        border: { display: false },
        ticks: { stepSize: 25, font: { size: 11 }, callback: (v) => `${v}%` },
      },
    },
  };
}

function initTodayWeekChart() {
  const canvas = document.getElementById("weekChart");
  if (!canvas || typeof Chart === "undefined") return;

  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.color = "#8a8a99";

  const stats = computeWeekStats();
  const ctx = canvas.getContext("2d");

  state.todayWeekChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: stats.map((s) => s.day),
      datasets: [
        {
          label: "Эффективность",
          data: stats.map(efficiency),
          backgroundColor: makeBarGradient(ctx, 200),
          hoverBackgroundColor: "rgba(139, 92, 246, 1)",
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 26,
        },
      ],
    },
    options: barChartOptions(),
  });
}

function updateTodayWeekChart() {
  if (!state.todayWeekChartInstance) return;
  const stats = computeWeekStats();
  state.todayWeekChartInstance.data.labels = stats.map((s) => s.day);
  state.todayWeekChartInstance.data.datasets[0].data = stats.map(efficiency);
  state.todayWeekChartInstance.update("none");
}

function initWeekCharts(stats) {
  if (typeof Chart === "undefined") return;
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.color = "#8a8a99";

  const barCanvas = document.getElementById("weekBarChart");
  if (barCanvas && !state.weekChartInstance) {
    const ctx = barCanvas.getContext("2d");
    state.weekChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: stats.map((d) => d.day),
        datasets: [
          {
            label: "Эффективность, %",
            data: stats.map(efficiency),
            backgroundColor: makeBarGradient(ctx, 260),
            hoverBackgroundColor: "rgba(139, 92, 246, 1)",
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 34,
          },
        ],
      },
      options: barChartOptions(),
    });
  }

  const doughnutCanvas = document.getElementById("weekDoughnutChart");
  if (doughnutCanvas && !state.doughnutChartInstance) {
    const totalDone = stats.reduce((s, d) => s + d.done, 0);
    const totalAll = stats.reduce((s, d) => s + d.total, 0);
    state.doughnutChartInstance = new Chart(doughnutCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Выполнено", "Не выполнено"],
        datasets: [
          {
            data: [totalDone, Math.max(totalAll - totalDone, 0)],
            backgroundColor: ["#8b5cf6", "#8a8a99"],
            borderColor: "transparent",
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        animation: { duration: 700, easing: "easeOutQuart" },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#a2a2b4",
              padding: 14,
              font: { size: 12 },
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            backgroundColor: "#16161d",
            borderColor: "#23232d",
            borderWidth: 1,
            padding: 10,
            displayColors: false,
          },
        },
      },
    });
  }
}

function updateWeekCharts(stats) {
  const labels = stats.map((d) => d.day);
  const values = stats.map(efficiency);

  if (state.weekChartInstance) {
    state.weekChartInstance.data.labels = labels;
    state.weekChartInstance.data.datasets[0].data = values;
    state.weekChartInstance.update("none");
  }
  if (state.doughnutChartInstance) {
    const totalDone = stats.reduce((s, d) => s + d.done, 0);
    const totalAll = stats.reduce((s, d) => s + d.total, 0);
    state.doughnutChartInstance.data.datasets[0].data = [
      totalDone,
      Math.max(totalAll - totalDone, 0),
    ];
    state.doughnutChartInstance.update("none");
  }
}

function renderWeekView() {
  const stats = computeWeekStats();
  renderWeekMetrics(stats);
  renderWeekTable(stats);
  if (!state.weekChartInstance) initWeekCharts(stats);
  else updateWeekCharts(stats);

  /* Графики здоровья */
  initHealthCharts();
  updateWeekHealthCharts();

  els.weekRange.textContent = `${stats[0].date} — ${stats[stats.length - 1].date}`;
}
