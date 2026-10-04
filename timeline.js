/* =========================================================
   timeline.js — модуль «Мой день».
========================================================= */

function renderTimelineHeader() {
  const current = state.currentDate;
  const today = todayKey();
  const diff = daysBetween(today, current);
  const date = parseDateKey(current);

  let dayLabel;
  if (diff === 0) dayLabel = t("hdr_today");
  else if (diff === -1) dayLabel = t("hdr_yesterday");
  else if (diff === 1) dayLabel = t("hdr_tomorrow");
  else {
    const locale = state.settings?.language === "en" ? "en-US" : "ru-RU";
    dayLabel = date.toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
    });
  }
  const title = t("hdr_myday") + " · " + dayLabel;

  const locale = state.settings?.language === "en" ? "en-US" : "ru-RU";
  const sub = date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  els.timelineTitle.textContent = title;
  els.timelineSubtitle.textContent = sub.charAt(0).toUpperCase() + sub.slice(1);
  els.goTodayTLBtn.classList.toggle("hidden", diff === 0);
}

function renderTimeline() {
  const container = els.timelineContainer;
  if (!container) return;

  const SCHEDULED = state.tasks.filter((t) => !!t.startTime);
  const UNSCHEDULED = state.tasks.filter((t) => !t.startTime);

  els.timelineCount.textContent = SCHEDULED.length;
  els.timelineEmpty.classList.toggle("hidden", SCHEDULED.length > 0);

  let html = "";

  for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
    const top = (h - TIMELINE_START_HOUR) * TIMELINE_HOUR_PX;
    const label = String(h).padStart(2, "0") + ":00";
    html += `
      <div class="timeline-hour" style="top: ${top}px;">
        <span class="timeline-hour-label">${label}</span>
      </div>
    `;
  }

  for (const task of SCHEDULED) {
    const [hh, mm] = task.startTime.split(":").map(Number);
    const startMinutes = (hh - TIMELINE_START_HOUR) * 60 + mm;
    const topPx = Math.max((startMinutes / 60) * TIMELINE_HOUR_PX, 0);

    const duration = task.duration || 60;
    const heightPx = Math.max((duration / 60) * TIMELINE_HOUR_PX, 40);

    const priorityCls = task.priority
      ? `tl-priority-${task.priority}`
      : "tl-priority-none";
    const doneCls = task.done ? " done" : "";
    const timeLabel = `${task.startTime} · ${duration} мин`;

    html += `
      <div class="timeline-task ${priorityCls}${doneCls}"
           style="top: ${topPx}px; height: ${heightPx}px;"
           data-task-id="${task.id}">
        <div class="timeline-task-title">${escapeHtml(task.title)}</div>
        ${heightPx >= 56 ? `<div class="timeline-task-time">${timeLabel}</div>` : ""}
      </div>
    `;
  }

  container.innerHTML = html;
  container.style.height =
    (TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1) * TIMELINE_HOUR_PX + "px";

  renderUnscheduledList(UNSCHEDULED);
}

function renderUnscheduledList(unscheduled) {
  const listEl = els.timelineUnscheduled;
  const emptyEl = els.timelineUnscheduledEmpty;
  if (!listEl) return;

  listEl.innerHTML = unscheduled
    .map(
      (t) => `
    <li class="timeline-unscheduled-item${t.done ? " done" : ""}"
        data-task-id="${t.id}">
      <span>${escapeHtml(t.title)}</span>
    </li>
  `,
    )
    .join("");

  emptyEl.classList.toggle("hidden", unscheduled.length > 0);
}

function handleTimelineClick(e) {
  const el = e.target.closest("[data-task-id]");
  if (!el) return;
  const taskId = el.dataset.taskId;
  if (!taskId) return;
  state.highlightId = taskId;
  switchView("today");
}

function renderActiveView() {
  const name = state.currentView;
  if (name === "today") {
    renderTasks();
    renderDayHeader();
    if (typeof updateTodayWeekChart === "function") updateTodayWeekChart();
    if (typeof renderHealthWidget === "function") renderHealthWidget();
  } else if (name === "timeline") {
    renderTimeline();
    renderTimelineHeader();
  } else if (name === "week" && typeof renderWeekView === "function") {
    renderWeekView();
  } else if (name === "notes" && typeof renderNotesView === "function") {
    renderNotesView();
  } else if (name === "access" && typeof renderUsers === "function") {
    renderUsers();
  }
}
