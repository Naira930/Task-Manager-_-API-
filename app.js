// ==========================================================
// Task Ledger — frontend logic
// Talks to the Task Manager API (register/login/tasks CRUD).
// Token + API base are kept in localStorage so you stay logged
// in across page reloads.
// ==========================================================

const STORAGE_TOKEN = 'taskledger_token';
const STORAGE_EMAIL = 'taskledger_email';
const STORAGE_API_BASE = 'taskledger_api_base';

const state = {
  apiBase: localStorage.getItem(STORAGE_API_BASE) || 'http://localhost:3000',
  token: localStorage.getItem(STORAGE_TOKEN) || null,
  email: localStorage.getItem(STORAGE_EMAIL) || null,
  tasks: [],
};

// ---------- element refs ----------

const el = {
  apiStatus: document.getElementById('apiStatus'),
  apiDot: document.getElementById('apiDot'),
  apiLabel: document.getElementById('apiLabel'),
  apiConfig: document.getElementById('apiConfig'),
  apiBaseInput: document.getElementById('apiBaseInput'),
  apiBaseSave: document.getElementById('apiBaseSave'),

  userBadge: document.getElementById('userBadge'),
  userEmail: document.getElementById('userEmail'),
  logoutBtn: document.getElementById('logoutBtn'),

  authScreen: document.getElementById('authScreen'),
  appScreen: document.getElementById('appScreen'),

  tabs: document.querySelectorAll('.tab'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  loginError: document.getElementById('loginError'),
  registerError: document.getElementById('registerError'),
  registerSuccess: document.getElementById('registerSuccess'),

  newTaskForm: document.getElementById('newTaskForm'),
  taskFormError: document.getElementById('taskFormError'),

  editBackdrop: document.getElementById('editBackdrop'),
  editForm: document.getElementById('editForm'),
  editError: document.getElementById('editError'),
  deleteTaskBtn: document.getElementById('deleteTaskBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),

  toast: document.getElementById('toast'),
};

// ---------- small helpers ----------

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.toast.classList.add('hidden'), 2600);
}

function apiUrl(path) {
  return state.apiBase.replace(/\/$/, '') + path;
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(apiUrl(path), Object.assign({}, options, { headers }));

  let body = null;
  try { body = await res.json(); } catch (_) { /* e.g. 204 No Content */ }

  if (!res.ok) {
    const message = (body && body.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return body;
}

// ---------- API status check ----------

async function checkApiStatus() {
  try {
    const res = await fetch(apiUrl('/'));
    if (res.ok) {
      el.apiDot.className = 'dot online';
      el.apiLabel.textContent = 'API online';
    } else {
      throw new Error('bad status');
    }
  } catch (_) {
    el.apiDot.className = 'dot offline';
    el.apiLabel.textContent = 'API unreachable';
  }
}

el.apiStatus.addEventListener('click', () => {
  el.apiConfig.classList.toggle('hidden');
  el.apiBaseInput.value = state.apiBase;
});

el.apiBaseSave.addEventListener('click', () => {
  const value = el.apiBaseInput.value.trim();
  if (!value) return;
  state.apiBase = value;
  localStorage.setItem(STORAGE_API_BASE, value);
  el.apiConfig.classList.add('hidden');
  checkApiStatus();
  if (state.token) loadTasks();
});

// ---------- auth screen tab switching ----------

el.tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    el.tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.form-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
  });
});

// ---------- register ----------

el.registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.registerError.textContent = '';
  el.registerSuccess.textContent = '';

  const form = new FormData(el.registerForm);
  const email = form.get('email').trim();
  const password = form.get('password');

  try {
    await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    el.registerSuccess.textContent = 'Account created. You can log in now.';
    el.registerForm.reset();
    document.querySelector('.tab[data-tab="login"]').click();
  } catch (err) {
    el.registerError.textContent = err.message;
  }
});

// ---------- login ----------

el.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.loginError.textContent = '';

  const form = new FormData(el.loginForm);
  const email = form.get('email').trim();
  const password = form.get('password');

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    state.token = data.token;
    state.email = email;
    localStorage.setItem(STORAGE_TOKEN, state.token);
    localStorage.setItem(STORAGE_EMAIL, email);
    enterApp();
  } catch (err) {
    el.loginError.textContent = err.message;
  }
});

// ---------- logout ----------

el.logoutBtn.addEventListener('click', () => {
  state.token = null;
  state.email = null;
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_EMAIL);
  state.tasks = [];
  el.appScreen.classList.add('hidden');
  el.userBadge.classList.add('hidden');
  el.authScreen.classList.remove('hidden');
});

// ---------- screen switching ----------

function enterApp() {
  el.authScreen.classList.add('hidden');
  el.appScreen.classList.remove('hidden');
  el.userBadge.classList.remove('hidden');
  el.userEmail.textContent = state.email || '';
  loadTasks();
}

// ---------- create task ----------

el.newTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.taskFormError.textContent = '';

  const form = new FormData(el.newTaskForm);
  const title = form.get('title').trim();
  const description = form.get('description').trim();
  const due_date = form.get('due_date') || null;

  if (!title) return;

  try {
    await apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description: description || null, due_date }),
    });
    el.newTaskForm.reset();
    showToast('Task filed.');
    loadTasks();
  } catch (err) {
    el.taskFormError.textContent = err.message;
  }
});

// ---------- load + render tasks ----------

async function loadTasks() {
  try {
    state.tasks = await apiFetch('/api/tasks');
    renderBoard();
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      showToast('Session expired. Please log in again.');
      el.logoutBtn.click();
    } else {
      showToast(err.message);
    }
  }
}

function formatDue(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = d < today;
  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { label: `due ${label}`, overdue };
}

function renderBoard() {
  const statuses = ['pending', 'in_progress', 'done'];
  const grouped = { pending: [], in_progress: [], done: [] };

  state.tasks.forEach((t) => {
    if (grouped[t.status]) grouped[t.status].push(t);
  });

  statuses.forEach((status) => {
    const list = grouped[status];
    document.getElementById(`count-${status}`).textContent = list.length;
    const tray = document.getElementById(`tray-${status}`);
    tray.innerHTML = '';

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tray-empty';
      empty.textContent = status === 'done' ? 'Nothing finished yet.' : 'Tray is empty.';
      tray.appendChild(empty);
      return;
    }

    list.forEach((task) => tray.appendChild(buildCard(task)));
  });
}

function buildCard(task) {
  const card = document.createElement('div');
  card.className = 'card-task';
  card.dataset.id = task.id;

  const title = document.createElement('p');
  title.className = 'card-title';
  title.textContent = task.title;
  card.appendChild(title);

  if (task.description) {
    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = task.description;
    card.appendChild(desc);
  }

  if (task.due_date) {
    const due = formatDue(task.due_date);
    const dueEl = document.createElement('p');
    dueEl.className = 'card-due' + (due.overdue && task.status !== 'done' ? ' overdue' : '');
    dueEl.textContent = due.label;
    card.appendChild(dueEl);
  }

  card.addEventListener('click', () => openEditModal(task));
  return card;
}

// ---------- edit modal ----------

function openEditModal(task) {
  el.editError.textContent = '';
  const form = el.editForm;
  form.elements.id.value = task.id;
  form.elements.title.value = task.title;
  form.elements.description.value = task.description || '';
  form.elements.status.value = task.status;
  form.elements.due_date.value = task.due_date ? task.due_date.slice(0, 10) : '';
  el.editBackdrop.classList.remove('hidden');
}

function closeEditModal() {
  el.editBackdrop.classList.add('hidden');
}

el.cancelEditBtn.addEventListener('click', closeEditModal);
el.editBackdrop.addEventListener('click', (e) => {
  if (e.target === el.editBackdrop) closeEditModal();
});

el.editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.editError.textContent = '';

  const form = new FormData(el.editForm);
  const id = form.get('id');
  const payload = {
    title: form.get('title').trim(),
    description: form.get('description').trim() || null,
    status: form.get('status'),
    due_date: form.get('due_date') || null,
  };

  try {
    await apiFetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    closeEditModal();
    showToast('Task updated.');
    loadTasks();
  } catch (err) {
    el.editError.textContent = err.message;
  }
});

el.deleteTaskBtn.addEventListener('click', async () => {
  const id = el.editForm.elements.id.value;
  if (!confirm('Delete this task? This cannot be undone.')) return;

  try {
    await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    closeEditModal();
    showToast('Task deleted.');
    loadTasks();
  } catch (err) {
    el.editError.textContent = err.message;
  }
});

// ---------- boot ----------

(function init() {
  checkApiStatus();
  setInterval(checkApiStatus, 30000);

  if (state.token && state.email) {
    enterApp();
  }
})();
