/* ==========================================================================
   My Todos — app logic
   Vanilla JavaScript, no dependencies. State is persisted in localStorage.
   ========================================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "my-todos:v1";
  var THEME_KEY = "my-todos:theme";
  var MAX_LENGTH = 200;

  var els = {
    form: document.getElementById("todo-form"),
    input: document.getElementById("task-input"),
    error: document.getElementById("form-error"),
    list: document.getElementById("todo-list"),
    empty: document.getElementById("empty-state"),
    template: document.getElementById("todo-template"),
    filters: document.querySelector(".filters"),
    clearCompleted: document.getElementById("clear-completed"),
    itemsLeft: document.getElementById("items-left"),
    dateLabel: document.getElementById("date-label"),
    live: document.getElementById("live-region"),
    themeToggle: document.getElementById("theme-toggle")
  };

  var state = {
    todos: [],
    filter: "all", // "all" | "active" | "completed"
    editingId: null
  };

  /* ------------------------------------------------------------------ utils */

  function uid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function byId(id) {
    for (var i = 0; i < state.todos.length; i++) {
      if (state.todos[i].id === id) return i;
    }
    return -1;
  }

  function plural(n) {
    return n === 1 ? "task" : "tasks";
  }

  function announce(message) {
    els.live.textContent = message;
  }

  /* ---------------------------------------------------------------- storage */

  function loadTodos() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return []; // storage blocked (private mode / disabled cookies)
    }
    if (!raw) return [];

    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(function (item) {
          return item && typeof item.text === "string" && item.text.trim() !== "";
        })
        .map(function (item) {
          return {
            id: typeof item.id === "string" ? item.id : uid(),
            text: item.text.trim().slice(0, MAX_LENGTH),
            done: item.done === true,
            createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now()
          };
        });
    } catch (err) {
      return [];
    }
  }

  function saveTodos() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
    } catch (err) {
      /* Quota or blocked storage: keep the app usable in-memory. */
    }
  }

  function loadTheme() {
    try {
      return window.localStorage.getItem(THEME_KEY);
    } catch (err) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* ignore */
    }
  }

  /* --------------------------------------------------------------- rendering */

  function visibleTodos() {
    if (state.filter === "active") {
      return state.todos.filter(function (todo) { return !todo.done; });
    }
    if (state.filter === "completed") {
      return state.todos.filter(function (todo) { return todo.done; });
    }
    return state.todos.slice();
  }

  function emptyMessage() {
    if (state.todos.length === 0) {
      return "No tasks yet - add one above to get started.";
    }
    if (state.filter === "active") {
      return "Nothing left to do. Enjoy the quiet.";
    }
    if (state.filter === "completed") {
      return "No completed tasks yet.";
    }
    return "No tasks match this filter.";
  }

  function createItem(todo) {
    var node = els.template.content.firstElementChild.cloneNode(true);
    var editing = state.editingId === todo.id;

    node.dataset.id = todo.id;
    node.classList.toggle("is-done", todo.done);
    node.classList.toggle("is-editing", editing);

    var checkbox = node.querySelector(".todo__checkbox");
    checkbox.checked = todo.done;
    checkbox.setAttribute(
      "aria-label",
      (todo.done ? "Mark as not done: " : "Mark as done: ") + todo.text
    );

    var text = node.querySelector(".todo__text");
    text.textContent = todo.text;
    text.hidden = editing;

    var edit = node.querySelector(".todo__edit");
    edit.value = todo.text;
    edit.hidden = !editing;
    edit.setAttribute("aria-label", "Edit task: " + todo.text);

    node.querySelector(".todo__rename").setAttribute("aria-label", "Rename task: " + todo.text);
    node.querySelector(".todo__delete").setAttribute("aria-label", "Delete task: " + todo.text);

    return node;
  }

  function render() {
    var items = visibleTodos();
    var fragment = document.createDocumentFragment();

    els.list.textContent = "";
    items.forEach(function (todo) {
      fragment.appendChild(createItem(todo));
    });
    els.list.appendChild(fragment);

    /* Empty state */
    if (items.length === 0) {
      els.empty.textContent = emptyMessage();
      els.empty.hidden = false;
    } else {
      els.empty.hidden = true;
    }

    /* Progress summary */
    var remaining = 0;
    state.todos.forEach(function (todo) {
      if (!todo.done) remaining++;
    });
    var completed = state.todos.length - remaining;

    if (state.todos.length === 0) {
      els.itemsLeft.textContent = "0 tasks";
    } else if (remaining === 0) {
      els.itemsLeft.textContent = "All done - " + completed + " " + plural(completed) + " completed";
    } else {
      els.itemsLeft.textContent = remaining + " " + plural(remaining) + " left";
    }
    els.clearCompleted.disabled = completed === 0;

    /* Filter buttons */
    Array.prototype.forEach.call(els.filters.querySelectorAll(".filter"), function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.filter === state.filter));
    });

    /* Keep focus in the input while renaming */
    if (state.editingId) {
      var input = els.list.querySelector(".todo.is-editing .todo__edit");
      if (input) {
        input.focus();
        input.select();
      }
    }
  }

  /* ------------------------------------------------------ mutations & editing */

  function showFormError(message) {
    els.error.textContent = message;
    els.error.hidden = false;
    els.input.classList.add("is-invalid");
    els.input.setAttribute("aria-invalid", "true");
  }

  function clearFormError() {
    els.error.textContent = "";
    els.error.hidden = true;
    els.input.classList.remove("is-invalid");
    els.input.removeAttribute("aria-invalid");
  }

  function startEdit(id) {
    state.editingId = id;
    render();
  }

  function commitEdit(id, nextText, cancelled) {
    if (state.editingId !== id) return; // guard: blur fires after re-render
    state.editingId = null;

    var index = byId(id);
    if (index === -1) {
      render();
      return;
    }

    var text = String(nextText || "").trim().replace(/\s+/g, " ").slice(0, MAX_LENGTH);
    if (!cancelled && text !== "" && text !== state.todos[index].text) {
      state.todos[index].text = text;
      saveTodos();
      announce("Renamed to: " + text);
    }
    render();
  }

  function toggleTodo(id, done) {
    var index = byId(id);
    if (index === -1) return;
    state.todos[index].done = done;
    saveTodos();
    render();
    announce((done ? "Completed: " : "Reopened: ") + state.todos[index].text);
  }

  function removeTodo(id) {
    var index = byId(id);
    if (index === -1) return;
    var removed = state.todos.splice(index, 1)[0];
    if (state.editingId === id) state.editingId = null;
    saveTodos();
    render();
    announce("Deleted: " + removed.text);

    if (state.todos.length === 0) els.input.focus();
  }

  function clearCompleted() {
    var before = state.todos.length;
    state.todos = state.todos.filter(function (todo) { return !todo.done; });
    var removedCount = before - state.todos.length;
    if (removedCount === 0) return;

    state.editingId = null;
    saveTodos();
    render();
    announce("Cleared " + removedCount + " completed " + plural(removedCount) + ".");
  }

  function setFilter(filter) {
    if (state.filter === filter) return;
    state.filter = filter;
    state.editingId = null;
    render();

    var shown = visibleTodos();
    announce("Showing " + shown.length + " " + plural(shown.length) + ".");
  }


  /* ------------------------------------------------------------------ events */

  function focusTodo(id) {
    var node = els.list.querySelector('.todo[data-id="' + id + '"] .todo__checkbox');
    if (node) node.focus();
  }

  /* Add a new task */
  els.form.addEventListener("submit", function (event) {
    event.preventDefault();

    var text = els.input.value.trim().replace(/\s+/g, " ");
    if (text === "") {
      showFormError("Type a task first, then press Add task.");
      els.input.focus();
      return;
    }
    if (text.length > MAX_LENGTH) {
      showFormError("Tasks can be at most " + MAX_LENGTH + " characters.");
      els.input.focus();
      return;
    }

    var duplicate = state.todos.some(function (todo) {
      return !todo.done && todo.text.toLowerCase() === text.toLowerCase();
    });
    if (duplicate) {
      showFormError("\"" + text + "\" is already on your list.");
      els.input.select();
      return;
    }

    clearFormError();
    state.todos.unshift({ id: uid(), text: text, done: false, createdAt: Date.now() });
    els.input.value = "";
    saveTodos();

    if (state.filter === "completed") state.filter = "all"; // keep the new task visible
    render();
    announce("Added: " + text);
    els.input.focus();
  });

  els.input.addEventListener("input", function () {
    if (!els.error.hidden) clearFormError();
  });

  /* Tick / untick */
  els.list.addEventListener("change", function (event) {
    var checkbox = event.target;
    if (!checkbox.classList || !checkbox.classList.contains("todo__checkbox")) return;

    var node = checkbox.closest(".todo");
    if (!node) return;

    toggleTodo(node.dataset.id, checkbox.checked);
    focusTodo(node.dataset.id);
  });

  /* Rename & delete buttons */
  els.list.addEventListener("click", function (event) {
    var node = event.target.closest(".todo");
    if (!node) return;

    if (event.target.closest(".todo__delete")) {
      removeTodo(node.dataset.id);
      return;
    }
    if (event.target.closest(".todo__rename")) {
      startEdit(node.dataset.id);
    }
  });

  /* Double-click the task text to rename */
  els.list.addEventListener("dblclick", function (event) {
    if (!event.target.closest(".todo__text")) return;
    var node = event.target.closest(".todo");
    if (node) startEdit(node.dataset.id);
  });

  /* Inline rename: Enter saves, Escape cancels, Tab-out saves */
  els.list.addEventListener("keydown", function (event) {
    var input = event.target;
    if (!input.classList || !input.classList.contains("todo__edit")) return;

    var node = input.closest(".todo");
    if (!node) return;

    if (event.key === "Enter") {
      event.preventDefault();
      commitEdit(node.dataset.id, input.value, false);
    } else if (event.key === "Escape") {
      event.preventDefault();
      commitEdit(node.dataset.id, input.value, true);
    }
  });

  els.list.addEventListener("focusout", function (event) {
    var input = event.target;
    if (!input.classList || !input.classList.contains("todo__edit")) return;

    var node = input.closest(".todo");
    if (!node) return;

    var id = node.dataset.id;
    var value = input.value;
    /* Defer so a click on another control wins the race with this re-render. */
    window.setTimeout(function () {
      commitEdit(id, value, false);
    }, 0);
  });

  /* Filters & bulk actions */
  els.filters.addEventListener("click", function (event) {
    var button = event.target.closest(".filter");
    if (button) setFilter(button.dataset.filter);
  });

  els.clearCompleted.addEventListener("click", clearCompleted);

  /* -------------------------------------------------------------- theme & init */

  var prefersDark = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    /* The sun/moon artwork is swapped by CSS from this attribute. */
    els.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  }

  function initTheme() {
    var stored = loadTheme();
    var theme = stored === "dark" || stored === "light"
      ? stored
      : (prefersDark && prefersDark.matches ? "dark" : "light");
    applyTheme(theme);
  }

  els.themeToggle.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
  });

  if (prefersDark) {
    var onSystemThemeChange = function (event) {
      if (!loadTheme()) applyTheme(event.matches ? "dark" : "light");
    };
    if (typeof prefersDark.addEventListener === "function") {
      prefersDark.addEventListener("change", onSystemThemeChange);
    } else if (typeof prefersDark.addListener === "function") {
      prefersDark.addListener(onSystemThemeChange);
    }
  }

  function paintDateLabel() {
    var today = new Date();
    els.dateLabel.textContent = today.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
  }

  /* -------------------------------------------------------------------- init */

  function init() {
    initTheme();
    paintDateLabel();
    state.todos = loadTodos();
    render();
    els.input.focus();
  }

  init();
})();
