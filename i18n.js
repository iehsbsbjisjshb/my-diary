/* =========================================================
   i18n.js — локализация интерфейса (RU / EN).
========================================================= */

const I18N = {
  ru: {
    nav_day: "День",
    nav_timeline: "Мой день",
    nav_week: "Аналитика за неделю",
    nav_notes: "Блокнот",
    export: "Экспорт",
    import: "Импорт",
    theme_dark: "🌙 Тёмная тема",
    theme_light: "☀ Светлая тема",
    theme_auto: "🌓 Системная тема",
    tasks_today: "Задачи на день",
    tasks_empty: "Пока пусто. Добавь первую задачу ✨",
    new_task: "Новая задача",
    edit_task: "Редактировать задачу",
    day_report: "Отчёт дня",
    day_report_ph: "Как прошёл день? Мысли, итоги, благодарности...",
    save_report: "Сохранить отчёт",
    week_efficiency: "Эффективность недели",
    health_title: "Здоровье",
    health_wake: "Подъём",
    health_exercises: "Упражнения",
    health_empty: "Пока нет упражнений",
    tl_schedule: "Расписание",
    tl_no_time: "Без времени",
    tl_all_scheduled: "Все задачи привязаны ко времени 👍",
    tl_empty:
      "На этот день ещё нет задач со временем.<br>Добавь задачу в разделе «День» и укажи «Время».",
    analytics_title: "Аналитика за неделю",
    metric_avg: "Средняя эффективность",
    metric_done: "Задач выполнено",
    metric_best: "Лучший день",
    details_by_days: "Детали по дням",
    th_day: "День",
    th_date: "Дата",
    th_done: "Выполнено",
    th_total: "Всего",
    th_eff: "Эффективность",
    wake_chart: "🛏 Подъём за неделю",
    exercise_chart: "🏃 Физ. активность за неделю",
    chart_bar_title: "Эффективность по дням",
    chart_doughnut_title: "Выполнено / Не выполнено",
    chart_doughnut_desc:
      "Круг показывает долю выполненных задач за неделю: фиолетовый сегмент — сколько сделано, серый — сколько осталось.",
    notes_title: "Блокнот",
    notes_subtitle: "Заметки, идеи, мысли",
    new_note: "+ Новая заметка",
    notes_search_ph: "Поиск заметок...",
    notes_empty: "Нет заметок",
    note_title_ph: "Заголовок заметки",
    note_content_ph: "Текст заметки...  (#тег — метка, **жирный**, *курсив*)",
    note_choose: "Выберите заметку слева<br>или создайте новую",
    link_task: "🔗 Связать с задачей",
    md_preview: "👁 Просмотр",
    md_edit: "✏ Редактировать",
    delete_note: "Удалить заметку",
    pin_note: "Закрепить",
    unpin_note: "Открепить",
    active_tag_filter: "Фильтр",
    cancel: "Отмена",
    save: "Сохранить",
    create: "Создать",
    close: "Закрыть",
    reset_options: "Сбросить",
    today: "К сегодня",
    hdr_today: "Сегодня",
    hdr_yesterday: "Вчера",
    hdr_tomorrow: "Завтра",
    hdr_myday: "Мой день",
    tl_tasks_count: "Задач в расписании",
    pomodoro_work: "Работа",
    pomodoro_rest: "Отдых",
    pomodoro_start: "Старт",
    pomodoro_pause: "Пауза",
    pomodoro_reset: "Сброс",
    pomodoro_skip: "Пропустить",
    pomodoro_count: "Помидоров за сегодня",
    due_overdue: "просрочено",
    due_today: "сегодня",
    due_tomorrow: "завтра",
    due_in: "через",
    due_days_short: "дн.",
    confirm_import: "Заменить все текущие данные содержимым файла?",
    confirm_delete_note: "Удалить заметку",
    confirm_delete_exercise: "Удалить упражнение?",
    alert_no_tasks: "Нет задач на этот день. Сначала создай задачу.",
    prompt_link_task: "Связать с задачей (введи номер) или 0 — отвязать",
    alert_imported: "Данные импортированы.",
  },
  en: {
    nav_day: "Day",
    nav_timeline: "My Day",
    nav_week: "Weekly Analytics",
    nav_notes: "Notes",
    export: "Export",
    import: "Import",
    theme_dark: "🌙 Dark theme",
    theme_light: "☀ Light theme",
    theme_auto: "🌓 System theme",
    tasks_today: "Tasks for the day",
    tasks_empty: "Nothing here yet. Add your first task ✨",
    new_task: "New task",
    edit_task: "Edit task",
    day_report: "Day report",
    day_report_ph: "How was your day? Thoughts, results, gratitude...",
    save_report: "Save report",
    week_efficiency: "Weekly efficiency",
    health_title: "Health",
    health_wake: "Wake-up",
    health_exercises: "Exercises",
    health_empty: "No exercises yet",
    tl_schedule: "Schedule",
    tl_no_time: "No time",
    tl_all_scheduled: "All tasks are scheduled 👍",
    tl_empty:
      "No scheduled tasks for this day yet.<br>Add a task in «Day» and set a «Time».",
    analytics_title: "Weekly Analytics",
    metric_avg: "Average efficiency",
    metric_done: "Tasks completed",
    metric_best: "Best day",
    details_by_days: "Details by days",
    th_day: "Day",
    th_date: "Date",
    th_done: "Done",
    th_total: "Total",
    th_eff: "Efficiency",
    wake_chart: "🛏 Wake-up this week",
    exercise_chart: "🏃 Physical activity this week",
    chart_bar_title: "Efficiency by day",
    chart_doughnut_title: "Done / Not done",
    chart_doughnut_desc:
      "The circle shows the share of completed tasks this week: purple — done, grey — left.",
    notes_title: "Notes",
    notes_subtitle: "Notes, ideas, thoughts",
    new_note: "+ New note",
    notes_search_ph: "Search notes...",
    notes_empty: "No notes",
    note_title_ph: "Note title",
    note_content_ph: "Note text...  (#tag — mark, **bold**, *italic*)",
    note_choose: "Pick a note on the left<br>or create a new one",
    link_task: "🔗 Link to task",
    md_preview: "👁 Preview",
    md_edit: "✏ Edit",
    delete_note: "Delete note",
    pin_note: "Pin",
    unpin_note: "Unpin",
    active_tag_filter: "Filter",
    cancel: "Cancel",
    save: "Save",
    create: "Create",
    close: "Close",
    reset_options: "Reset",
    today: "Back to today",
    hdr_today: "Today",
    hdr_yesterday: "Yesterday",
    hdr_tomorrow: "Tomorrow",
    hdr_myday: "My Day",
    tl_tasks_count: "Scheduled tasks",
    pomodoro_work: "Work",
    pomodoro_rest: "Rest",
    pomodoro_start: "Start",
    pomodoro_pause: "Pause",
    pomodoro_reset: "Reset",
    pomodoro_skip: "Skip",
    pomodoro_count: "Pomodoros today",
    due_overdue: "overdue",
    due_today: "today",
    due_tomorrow: "tomorrow",
    due_in: "in",
    due_days_short: "d",
    confirm_import: "Replace all current data with the file content?",
    confirm_delete_note: "Delete note",
    confirm_delete_exercise: "Delete exercise?",
    alert_no_tasks: "No tasks for this day. Create a task first.",
    prompt_link_task: "Link to task (enter number) or 0 to unlink",
    alert_imported: "Data imported.",
  },
};

function t(key) {
  let lang = "ru";
  if (typeof state !== "undefined" && state.settings?.language) {
    lang = state.settings.language;
  } else if (typeof Storage !== "undefined") {
    const s = Storage.loadSettings();
    lang = s?.language || "ru";
  }
  return I18N[lang]?.[key] ?? I18N.ru[key] ?? key;
}

function tDueDate(diff) {
  if (diff < 0) return t("due_overdue");
  if (diff === 0) return t("due_today");
  if (diff === 1) return t("due_tomorrow");
  if (diff <= 6) {
    const lang = state.settings?.language || "ru";
    if (lang === "en") return `${t("due_in")} ${diff} ${t("due_days_short")}`;
    return `${t("due_in")} ${diff} ${pluralDays(diff)}`;
  }
  return null;
}

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = t(el.dataset.i18n);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = value;
    } else if (el.tagName === "OPTION") {
      el.textContent = value;
    } else {
      el.innerHTML = value;
    }
  });

  const newTaskBtn = document.getElementById("newTaskBtn");
  if (newTaskBtn) {
    const span = newTaskBtn.querySelector("span[data-i18n]");
    if (span) span.textContent = t("new_task");
  }

  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    const theme = Storage.loadTheme();
    if (theme === "light") themeBtn.textContent = t("theme_light");
    else if (theme === "auto") themeBtn.textContent = t("theme_auto");
    else themeBtn.textContent = t("theme_dark");
  }

  const pStart = document.getElementById("pomodoroToggleBtn");
  if (pStart) {
    pStart.textContent = state.pomodoro?.intervalId
      ? t("pomodoro_pause")
      : t("pomodoro_start");
  }
  const pReset = document.getElementById("pomodoroResetBtn");
  if (pReset) pReset.textContent = t("pomodoro_reset");
  const pSkip = document.getElementById("pomodoroSkipBtn");
  if (pSkip) pSkip.textContent = t("pomodoro_skip");
  const pPhase = document.getElementById("pomodoroPhase");
  if (pPhase) {
    pPhase.textContent =
      state.pomodoro?.phase === "rest" ? t("pomodoro_rest") : t("pomodoro_work");
  }

  const mdBtn = document.getElementById("mdToggleBtn");
  if (mdBtn) mdBtn.textContent = state.notesPreviewMode ? t("md_edit") : t("md_preview");

  const linkBtn = document.getElementById("linkTaskBtn");
  if (linkBtn && !linkBtn.classList.contains("linked")) {
    linkBtn.textContent = t("link_task");
  }

  const saveBtn = document.getElementById("saveTaskBtn");
  if (saveBtn) saveBtn.textContent = state.taskEditId ? t("save") : t("create");
  const taskModalTitle = document.getElementById("taskModalTitle");
  if (taskModalTitle) {
    taskModalTitle.textContent = state.taskEditId ? t("edit_task") : t("new_task");
  }
}