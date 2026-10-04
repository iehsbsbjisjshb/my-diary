/* =========================================================
   notes.js — модуль «Блокнот».
   Закрепление, теги, связь с задачей, markdown, поиск.
========================================================= */

/* =========================================================
   УТИЛИТЫ
========================================================= */

/** Извлекает теги из текста: #тег */
function parseNoteTags(text) {
  const tags = [];
  (text || "").replace(/#([\wа-яё]+)/gi, (_, tag) => {
    tags.push(tag.toLowerCase());
    return "";
  });
  return [...new Set(tags)];
}

/** Простейший Markdown → HTML */
function renderMarkdown(text) {
  if (!text) return "";
  let html = escapeHtml(text);

  /* Код-блоки `...` */
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  /* Жирный **...** */
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  /* Курсив *...* */
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  /* Зачёркнутый ~~...~~ */
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  /* Ссылки [текст](url) */
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );

  /* Заголовки */
  html = html
    .split("\n")
    .map((line) => {
      if (/^### (.+)$/.test(line))
        return "<h3>" + line.replace(/^### /, "") + "</h3>";
      if (/^## (.+)$/.test(line))
        return "<h2>" + line.replace(/^## /, "") + "</h2>";
      if (/^# (.+)$/.test(line))
        return "<h1>" + line.replace(/^# /, "") + "</h1>";
      if (/^- (.+)$/.test(line))
        return "<div class='md-li'>• " + line.replace(/^- /, "") + "</div>";
      if (/^\d+\. (.+)$/.test(line))
        return "<div class='md-li'>" + line + "</div>";
      if (line.trim() === "") return "<div class='md-br'></div>";
      return "<p>" + line + "</p>";
    })
    .join("");

  return html;
}

/* =========================================================
   РЕНДЕР
   ========================================================= */

function renderNotesView() {
  renderNotesList();
  renderNoteEditor();
}

/** Список заметок: закреплённые сверху, потом по дате */
function renderNotesList() {
  const filter = (document.getElementById("notesSearch")?.value || "")
    .trim()
    .toLowerCase();
  const activeTag = state.notesFilterTag || null;

  /* Индикатор активного фильтра */
  const badge = document.getElementById("notesFilterBadge");
  if (badge) {
    if (activeTag) {
      badge.innerHTML = `${t("active_tag_filter")}: <strong>#${escapeHtml(activeTag)}</strong>
        <button data-action="clear-tag-filter" title="×">×</button>`;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  const notes = state.notes
    .slice()
    .sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    })
    .filter((n) => {
      if (activeTag) {
        const tags = parseNoteTags((n.title || "") + " " + (n.content || ""));
        if (!tags.includes(activeTag)) return false;
      }
      if (!filter) return true;
      const title = (n.title || "").toLowerCase();
      const content = (n.content || "").toLowerCase();
      return title.includes(filter) || content.includes(filter);
    });
  // ... остальное без изменений

  const listEl = document.getElementById("notesList");
  const emptyEl = document.getElementById("notesEmpty");

  listEl.innerHTML = notes
    .map((n) => {
      const active = n.id === state.currentNoteId ? " active" : "";
      const pinned = n.pinned ? " pinned" : "";
      const title = (n.title || "Без названия").trim() || "Без названия";
      const preview = (n.content || "").slice(0, 60).replace(/\s+/g, " ");
      const tags = parseNoteTags((n.title || "") + " " + (n.content || ""));
      const date = new Date(
        n.updatedAt || n.createdAt || Date.now(),
      ).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });

      const tagsHtml = tags.length
        ? `<div class="note-item-tags">${tags
            .map((t) => `<span class="note-tag">#${escapeHtml(t)}</span>`)
            .join("")}</div>`
        : "";

      return `
        <li class="note-item${active}${pinned}" data-note-id="${n.id}">
          ${n.pinned ? '<span class="note-pin">📌</span>' : ""}
          <div class="note-item-title">${escapeHtml(title)}</div>
          <div class="note-item-preview">${escapeHtml(preview)}</div>
          ${tagsHtml}
          <div class="note-item-date">${date}</div>
        </li>
      `;
    })
    .join("");

  emptyEl.classList.toggle("hidden", notes.length > 0);
}

function renderNoteEditor() {
  const editorEl = document.getElementById("noteEditor");
  const emptyEl = document.getElementById("noteEditorEmpty");

  const note = state.notes.find((n) => n.id === state.currentNoteId);

  if (!note) {
    editorEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
    return;
  }

  editorEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  document.getElementById("noteTitle").value = note.title || "";
  document.getElementById("noteContent").value = note.content || "";

  /* Кнопка закрепления */
  const pinBtn = document.getElementById("pinNoteBtn");
  pinBtn.textContent = note.pinned ? "📌" : "📍";
  pinBtn.title = note.pinned ? t("unpin_note") : t("pin_note");

  /* Кнопка связи с задачей */
  const linkBtn = document.getElementById("linkTaskBtn");
  if (note.linkedTaskId) {
    const task = state.tasks.find((t) => t.id === note.linkedTaskId);
    linkBtn.textContent = task ? "🔗 " + task.title.slice(0, 20) : "🔗";
    linkBtn.classList.add("linked");
  } else {
    linkBtn.textContent = t("link_task");
    linkBtn.classList.remove("linked");
  }

  /* Теги — облако */
  const tags = parseNoteTags((note.title || "") + " " + (note.content || ""));
  const tagsEl = document.getElementById("noteTags");
  tagsEl.innerHTML = tags
    .map((t) => `<span class="note-tag">#${escapeHtml(t)}</span>`)
    .join("");

  /* Markdown-предпросмотр */
  const previewEl = document.getElementById("notePreview");
  previewEl.innerHTML = renderMarkdown(note.content || "");

  /* Режим: редактирование или просмотр */
  const isPreview = state.notesPreviewMode;
  document.getElementById("noteContent").classList.toggle("hidden", isPreview);
  previewEl.classList.toggle("hidden", !isPreview);
  document.getElementById("mdToggleBtn").textContent = isPreview
    ? t("md_edit")
    : t("md_preview");

  const updated = new Date(
    note.updatedAt || note.createdAt || Date.now(),
  ).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  document.getElementById("noteMeta").textContent = "Изменено: " + updated;
}

/* =========================================================
   ОПЕРАЦИИ
   ========================================================= */

function createNote() {
  const note = {
    id: uid(),
    title: "",
    content: "",
    pinned: false,
    linkedTaskId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  state.notes.unshift(note);
  state.currentNoteId = note.id;
  state.notesPreviewMode = false;
  Storage.saveNotes(state.notes);
  pushItem({ ...note, kind: "note" });
  renderNotesView();
  setTimeout(() => document.getElementById("noteTitle")?.focus(), 30);
}

function selectNote(id) {
  state.currentNoteId = id;
  renderNoteEditor();
  renderNotesList();
}

function deleteCurrentNote() {
  const note = state.notes.find((n) => n.id === state.currentNoteId);
  if (!note) return;
  const name = (note.title || "—").trim() || "—";
  if (!confirm(`${t("confirm_delete_note")} «${name}»?`)) return;

  const deletedId = state.currentNoteId;
  state.notes = state.notes.filter((n) => n.id !== deletedId);
  state.currentNoteId = null;
  Storage.saveNotes(state.notes);
  pushDelete(deletedId, "note");
  renderNotesView();
}

function updateNoteTitle(value) {
  const note = state.notes.find((n) => n.id === state.currentNoteId);
  if (!note) return;
  note.title = value;
  note.updatedAt = Date.now();
  Storage.saveNotes(state.notes);
  pushItem({ ...note, kind: "note" });
  renderNotesList();
}

function updateNoteContent(value) {
  const note = state.notes.find((n) => n.id === state.currentNoteId);
  if (!note) return;
  note.content = value;
  note.updatedAt = Date.now();
  Storage.saveNotes(state.notes);
  pushItem({ ...note, kind: "note" });
}

function togglePinCurrentNote() {
  const note = state.notes.find((n) => n.id === state.currentNoteId);
  if (!note) return;
  note.pinned = !note.pinned;
  note.updatedAt = Date.now();
  Storage.saveNotes(state.notes);
  pushItem({ ...note, kind: "note" });
  renderNoteEditor();
  renderNotesList();
}

function toggleMarkdownPreview() {
  state.notesPreviewMode = !state.notesPreviewMode;
  renderNoteEditor();
}

function linkNoteToTask() {
  const note = state.notes.find((n) => n.id === state.currentNoteId);
  if (!note) return;

  if (!state.tasks.length) {
    alert(t("alert_no_tasks"));
    return;
  }

  /* Простой выбор через prompt-подобный список */
  const list = state.tasks.map((t, i) => `${i + 1}. ${t.title}`).join("\n");
  const current = note.linkedTaskId
    ? state.tasks.findIndex((t) => t.id === note.linkedTaskId) + 1
    : 0;

  const answer = prompt(t("prompt_link_task") + ":\n\n" + list, current);
  if (answer === null) return;

  const idx = Number(answer);
  if (idx === 0) {
    note.linkedTaskId = null;
  } else if (idx > 0 && idx <= state.tasks.length) {
    note.linkedTaskId = state.tasks[idx - 1].id;
  }
  note.updatedAt = Date.now();
  Storage.saveNotes(state.notes);
  renderNoteEditor();
}

function filterByTag(tag) {
  state.notesFilterTag = state.notesFilterTag === tag ? null : tag;
  renderNotesList();
}

/* =========================================================
   СОБЫТИЯ
   ========================================================= */
function bindNotesEvents() {
  document.getElementById("newNoteBtn")?.addEventListener("click", createNote);

  document
    .getElementById("notesSearch")
    ?.addEventListener("input", renderNotesList);

  document.getElementById("notesList")?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-note-id]");
    if (!item) return;
    selectNote(item.dataset.noteId);
  });

  document.getElementById("noteTitle")?.addEventListener("input", (e) => {
    updateNoteTitle(e.target.value);
  });

  document.getElementById("noteContent")?.addEventListener("input", (e) => {
    updateNoteContent(e.target.value);
  });

  document
    .getElementById("deleteNoteBtn")
    ?.addEventListener("click", deleteCurrentNote);
  document
    .getElementById("pinNoteBtn")
    ?.addEventListener("click", togglePinCurrentNote);
  document
    .getElementById("mdToggleBtn")
    ?.addEventListener("click", toggleMarkdownPreview);
  document
    .getElementById("linkTaskBtn")
    ?.addEventListener("click", linkNoteToTask);

  /* Клик по тегу в облаке — фильтр */
  document.getElementById("noteTags")?.addEventListener("click", (e) => {
    const tag = e.target.closest(".note-tag");
    if (!tag) return;
    const clean = tag.textContent.replace(/^#/, "");
    filterByTag(clean);
  });
}
