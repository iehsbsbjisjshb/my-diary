/* =========================================================
   ai.js — AI-помощник через Cloudflare Worker.
========================================================= */

const AI_WORKER_URL = "https://lively-rhino-2626.iehsbsbjisjshb.deno.net/";

/** Отправляет промпт в Worker, возвращает текст ответа. */
async function askAI(prompt) {
  const response = await fetch(AI_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status}: ${err}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.answer || "";
}

/* =========================================================
   Разбить задачу на подзадачи
========================================================= */
async function splitTaskWithAI(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || !task.title) return;

  const li = document.querySelector(`.task-item[data-id="${taskId}"]`);
  const content = li?.querySelector(".task-content");
  if (!content) return;

  const oldBtn = content.querySelector(".ai-split-btn");
  if (oldBtn) oldBtn.style.display = "none";

  const loading = document.createElement("div");
  loading.className = "ai-loading";
  loading.innerHTML = `<span class="ai-spinner"></span> Думаю...`;
  content.appendChild(loading);

  const prompt = `Разбей задачу "${task.title}" на 3-7 конкретных подзадач.
Ответь ТОЛЬКО списком, где каждая строка начинается с "- ".
Не добавляй пояснений и заголовков.`;

  try {
    const answer = await askAI(prompt);

    const titles = answer
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.replace(/^-\s*/, "").trim())
      .filter((t) => t.length > 0 && t.length < 100);

    if (!titles.length) throw new Error("AI не предложил подзадач");

    task.subtasks = task.subtasks || [];
    titles.forEach((title) => {
      task.subtasks.push({ id: uid(), title, done: false });
    });

    state.expandedSubtasks.add(taskId);
    Storage.saveExpandedSubtasks([...state.expandedSubtasks]);
    Storage.saveTasks(state.currentDate, state.tasks);

    renderTasks();
  } catch (e) {
    loading.remove();
    if (oldBtn) oldBtn.style.display = "";
    alert("Ошибка AI: " + e.message);
  }
}

/* =========================================================
   Разбор дня (AI-рефлексия)
========================================================= */
async function analyzeDayWithAI() {
  const report = els.dayReport?.value?.trim();
  if (!report || report.length < 20) {
    alert("Сначала напиши отчёт дня (хотя бы пару предложений).");
    return;
  }

  const doneTasks = state.tasks.filter((t) => t.done).length;
  const totalTasks = state.tasks.length;

  const prompt = `Ты — коуч по продуктивности. Прочитай отчёт дня и дай короткий разбор (3-5 пунктов):
- Что было хорошо
- Что можно улучшить
- Один конкретный совет на завтра

Статистика дня: выполнено ${doneTasks} из ${totalTasks} задач.

Отчёт:
"""
${report}
"""`;

  const btn = document.getElementById("aiAnalyzeBtn");
  const oldText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Думаю...";
  }

  try {
    const answer = await askAI(prompt);
    alert("📊 Разбор дня:\n\n" + answer);
  } catch (e) {
    alert("Ошибка AI: " + e.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }
}