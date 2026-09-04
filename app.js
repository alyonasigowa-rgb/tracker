/* =====================================================================
   Anna UX School — Трекер управления студентами, ДЗ и оплатами
   Self-contained SPA. Данные хранятся в localStorage.
   ===================================================================== */

'use strict';

/* ---------------- Storage keys ---------------- */
const KEYS = {
  users: 'aue_users',
  students: 'aue_students',
  modules: 'aue_modules',
  session: 'aue_session',
  seeded: 'aue_seeded_v1',
};

/* ---------------- Helpers ---------------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function parseISO(s) {
  if (!s) return new Date(0);
  const d = new Date(s + 'T00:00:00');
  return isNaN(d) ? new Date(0) : d;
}
function fmtDate(s) {
  if (!s) return '—';
  const d = parseISO(s);
  if (d.getTime() === 0) return '—';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysUntil(s) {
  const d = parseISO(s);
  const t = new Date();
  const a = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86400000);
}

let toastTimer = null;
function toast(msg, type) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}

/* ---------------- State ---------------- */
let state = {
  currentUser: null,
  view: 'dashboard',
  selectedStudentId: null,
  studentsPerPage: 8,
  studentPage: 1,
  dashPage: 1,
};

/* ---------------- Data access ---------------- */
function getUsers() { return load(KEYS.users, []); }
function saveUsers(u) { save(KEYS.users, u); }
function getStudents() { return load(KEYS.students, []); }
function saveStudents(s) { save(KEYS.students, s); }
function getModules() { return load(KEYS.modules, []); }
function saveModules(m) { save(KEYS.modules, m); }

function getSession() { return load(KEYS.session, null); }
function setSession(u) { save(KEYS.session, u ? { id: u.id, role: u.role, name: u.name } : null); }

function findStudent(id) { return getStudents().find(s => s.id === id); }

/* ---------------- Seed data ---------------- */
function seedIfNeeded() {
  if (load(KEYS.seeded, false)) return;

  const users = [
    { id: 'u_admin', name: 'Анна', login: 'anna', pass: 'admin123', role: 'admin' },
    { id: 'u_cur1', name: 'Марина', login: 'curator', pass: 'curator123', role: 'curator' },
  ];

  const modules = [
    {
      id: 'm1', title: 'Основы UX', order: 1,
      tasks: [
        { id: 't1', title: 'Разбор кейса UX', desc: '' },
        { id: 't2', title: 'Пользовательские сценарии', desc: '' },
        { id: 't3', title: 'Информационная архитектура', desc: '' },
      ],
    },
    {
      id: 'm2', title: 'Прототипирование', order: 2,
      tasks: [
        { id: 't4', title: 'Лоу-фи вайрфреймы', desc: '' },
        { id: 't5', title: 'Клик-прототип в Figma', desc: '' },
      ],
    },
    {
      id: 'm3', title: 'Исследования', order: 3,
      tasks: [
        { id: 't6', title: 'Анкета и интервью', desc: '' },
        { id: 't7', title: 'Анализ конкурентов', desc: '' },
      ],
    },
  ];

  // Homework statuses: 'notdone' | 'pending' | 'checked' | 'rework'
  function makeHW(taskId) {
    const r = Math.random();
    let status = 'notdone';
    if (r < 0.35) status = 'checked';
    else if (r < 0.55) status = 'pending';
    else if (r < 0.65) status = 'rework';
    return { taskId, status, link: '', feedback: '' };
  }

  const firstNames = ['Алиса', 'Максим', 'Екатерина', 'Иван', 'Дарья', 'Никита', 'Полина', 'Артём', 'Виктория', 'Сергей', 'Ольга', 'Дмитрий', 'Анна', 'Роман', 'Мария', 'Кирилл', 'Елена', 'Павел', 'Наталья', 'Григорий', 'Софья', 'Игорь', 'Полина', 'Владислав', 'Юлия'];
  const lastNames = ['Смирнова', 'Иванов', 'Кузнецова', 'Петров', 'Соколова', 'Морозов', 'Волкова', 'Лебедев', 'Козлова', 'Новиков', 'Фёдорова', 'Захаров', 'Соловьёва', 'Гусев', 'Дмитриева', 'Тихонов', 'Беляева', 'Орлов', 'Семёнова', 'Никитин', 'Павлова', 'Осипов', 'Щербакова', 'Мельников', 'Комаров'];

  const students = [];
  for (let i = 0; i < 25; i++) {
    const paid = Math.random() > 0.32;
    const hw = [];
    modules.forEach(m => m.tasks.forEach(t => hw.push(makeHW(t.id))));
    students.push({
      id: 's' + (i + 1),
      name: firstNames[i] + ' ' + lastNames[i],
      email: 'student' + (i + 1) + '@example.com',
      phone: '+7 900 ' + String(100 + Math.floor(Math.random() * 900)) + '-' + String(10 + Math.floor(Math.random() * 89)) + '-' + String(10 + Math.floor(Math.random() * 89)),
      startDate: addDaysISO(-(40 + Math.floor(Math.random() * 140))),
      paidUntil: paid ? addDaysISO(5 + Math.floor(Math.random() * 20)) : addDaysISO(-(1 + Math.floor(Math.random() * 12))),
      homework: hw,
    });
  }

  saveUsers(users);
  saveModules(modules);
  saveStudents(students);
  save(KEYS.seeded, true);
}

/* ---------------- Business checks ---------------- */
function isPaidUntil(s) {
  return daysUntil(s.paidUntil) >= 0;
}
function isDebtor(s) {
  return !isPaidUntil(s);
}
function totalTasks() {
  return getModules().reduce((acc, m) => acc + m.tasks.length, 0);
}
// статус записи конкретного задания студента (по taskId); задания вне модулей игнорируются
function taskStatusOf(s, taskId) {
  const rec = s.homework.find(h => h.taskId === taskId);
  return rec ? rec.status : 'notdone';
}
// учитываются только задания, реально существующие в модулях (дубли/лишние записи не искажают счёт)
function countChecked(s) {
  let n = 0;
  getModules().forEach(m => m.tasks.forEach(t => { if (taskStatusOf(s, t.id) === 'checked') n++; }));
  return n;
}
// выполненные задания (не «notdone»): сдано/на проверке/доработка/проверено
function countDone(s) {
  let n = 0;
  getModules().forEach(m => m.tasks.forEach(t => { if (taskStatusOf(s, t.id) !== 'notdone') n++; }));
  return n;
}
function progressOf(s) {
  const total = totalTasks();
  if (!total) return 0;
  return Math.round((countDone(s) / total) * 100);
}
function labelsFor(s) {
  // for reminders: payment due this week, HW not done recently
  const dueThisWeek = daysUntil(s.paidUntil) >= 0 && daysUntil(s.paidUntil) <= 7;
  return { dueThisWeek, anyPending: s.homework.some(h => h.status === 'pending' || h.status === 'rework') };
}

/* =====================================================================
   AUTH
   ===================================================================== */
function initAuth() {
  $('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const login = $('#login-user').value.trim().toLowerCase();
    const pass = $('#login-pass').value;
    const u = getUsers().find(x => x.login.toLowerCase() === login && x.pass === pass);
    if (!u) {
      $('#login-error').classList.remove('hidden');
      return;
    }
    $('#login-error').classList.add('hidden');
    state.currentUser = u;
    setSession(u);
    showApp();
  });

  $('#logout-btn').addEventListener('click', () => {
    state.currentUser = null;
    setSession(null);
    showAuth();
  });
}

function showAuth() {
  $('#auth-screen').classList.remove('hidden');
  $('#app').classList.add('hidden');
  $('#login-user').value = '';
  $('#login-pass').value = '';
  $('#login-error').classList.add('hidden');
}

function showApp() {
  $('#auth-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');

  const u = state.currentUser;
  const isAdmin = u.role === 'admin';
  $('#user-name').textContent = u.name;
  $('#user-role').textContent = u.role === 'admin' ? 'Админ' : 'Куратор';
  $('#user-avatar').textContent = u.name.charAt(0).toUpperCase();

  // Toggle admin-only elements
  $$('.admin-only').forEach(el => {
    if (isAdmin) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });

  // If curator somehow on admin view, force dashboard
  if (!isAdmin && !['dashboard', 'students', 'student', 'profile'].includes(state.view)) {
    state.view = 'dashboard';
  }
  navigate(state.view);
}

/* =====================================================================
   NAVIGATION
   ===================================================================== */
function navigate(view, param) {
  state.view = view;
  const isAdmin = state.currentUser && state.currentUser.role === 'admin';

  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));

  const titles = {
    dashboard: ['Дашборд', 'Обзор школы'],
    students: ['Студенты', 'Все студенты школы'],
    modules: ['Модули', 'Структура обучения'],
    users: ['Пользователи', 'Админ и кураторы'],
    import: ['Импорт данных', 'Загрузка таблицы Excel/CSV'],
    student: ['Карточка студента', 'Детали и домашние задания'],
    profile: ['Профиль', 'Ваши учётные данные'],
  };

  if (view === 'student' && param) {
    state.selectedStudentId = param;
    $('#view-student').classList.add('active');
    $('#view-title').textContent = 'Карточка студента';
    $('#view-subtitle').textContent = 'Детали и домашние задания';
    renderStudentDetail();
    return;
  }

  const target = $('#view-' + view);
  target.classList.add('active');
  const t = titles[view] || titles.dashboard;
  $('#view-title').textContent = t[0];
  $('#view-subtitle').textContent = t[1];

  if (view === 'dashboard') renderDashboard();
  if (view === 'students') { state.studentPage = 1; renderStudents(); }
  if (view === 'modules' && isAdmin) renderModules();
  if (view === 'users' && isAdmin) renderUsers();
  if (view === 'import' && isAdmin) resetImport();
  if (view === 'profile') renderProfile();
}

function bindNav() {
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });
  $('#topbar-add-student').addEventListener('click', () => openStudentModal());
}

/* =====================================================================
   DASHBOARD
   ===================================================================== */
function renderDashboard() {
  const isCurator = state.currentUser && state.currentUser.role === 'curator';
  const students = getStudents();
  const total = students.length;
  const checkedAll = students.filter(s => {
    const mn = getModules().reduce((a, m) => a + m.tasks.length, 0);
    return mn > 0 && countChecked(s) === mn;
  }).length;
  const debtors = students.filter(isDebtor).length;
  const dueThisWeek = students.filter(s => labelsFor(s).dueThisWeek).length;
  const weakNotDone = students.filter(s => {
    return s.homework.every(h => h.status === 'notdone');
  }).length;

  const debtCounter = isCurator ? '' : `
      <div class="counter-card counter-danger">
        <div class="counter-label">Должники по оплате</div>
        <div class="counter-value">${debtors}</div>
        <div class="counter-sub">оплата просрочена</div>
      </div>`;

  // баннеры для куратора — только про ДЗ, без финансов
  let reminders;
  if (isCurator) {
    reminders = `
      <div class="reminders">
        ${weakNotDone ? `<div class="reminder reminder-danger"><span class="r-ico">⚠️</span> ${weakNotDone} студ. не сдали ДЗ</div>` : ''}
        ${weakNotDone === 0 ? `<div class="reminder reminder-success"><span class="r-ico">✓</span> Все студенты сдали текущие ДЗ</div>` : ''}
      </div>`;
  } else {
    reminders = `
      <div class="reminders">
        ${dueThisWeek ? `<div class="reminder reminder-warn"><span class="r-ico">⏰</span> У ${dueThisWeek} студ. оплата на этой неделе</div>` : ''}
        ${weakNotDone ? `<div class="reminder reminder-danger"><span class="r-ico">⚠️</span> ${weakNotDone} студ. не сдали ДЗ за последнюю неделю</div>` : ''}
        ${debtors > 0 ? `<div class="reminder reminder-danger"><span class="r-ico">💳</span> ${debtors} студ. имеют просрочку по оплате</div>` : ''}
        ${!dueThisWeek && !weakNotDone && debtors === 0 ? `<div class="reminder reminder-success"><span class="r-ico">✓</span> Всё в порядке — долгов нет</div>` : ''}
      </div>`;
  }

  const view = $('#view-dashboard');
  view.innerHTML = `
    <div class="counters">
      <div class="counter-card counter-accent">
        <div class="counter-label">Всего студентов</div>
        <div class="counter-value">${total}</div>
        <div class="counter-sub">активных учеников</div>
      </div>
      <div class="counter-card counter-success">
        <div class="counter-label">Сдали все ДЗ</div>
        <div class="counter-value">${checkedAll}</div>
        <div class="counter-sub">полностью прошли программу</div>
      </div>
      ${debtCounter}
    </div>

    ${reminders}

    <div class="card">
      <div class="card-header">
        <h3>Список студентов</h3>
        <input type="text" class="input search-input" id="dash-search" placeholder="Поиск…" />
      </div>
      <div id="dash-table" class="table-wrap"></div>
    </div>
  `;

  $('#dash-search').addEventListener('input', (e) => renderDashTable(e.target.value));
  renderDashTable('');
}

function studentTableHTML(list, opts) {
  const opts2 = opts || {};
  const isCurator = state.currentUser && state.currentUser.role === 'curator';
  if (!list.length) return `<p class="muted small" style="padding:16px;">Студенты не найдены</p>`;
  const rows = list.map(s => {
    const p = progressOf(s);
    const paid = isPaidUntil(s);
    const payCell = isCurator ? '' : `
        <td>
          <span class="badge ${paid ? 'badge-paid' : 'badge-debt'}">
            <span class="badge-dot"></span> ${paid ? 'Оплачено' : 'Долг'}
          </span>
          <div class="row-sub">до ${fmtDate(s.paidUntil)}</div>
        </td>`;
    return `
      <tr data-id="${esc(s.id)}">
        <td>
          <div class="row-name">${esc(s.name)}</div>
          <div class="row-sub">${esc(s.email)}</div>
        </td>
        <td>
          <div class="progress"><div class="progress-fill" style="width:${p}%"></div></div>
          <div class="row-sub">${p}% ДЗ</div>
        </td>
        ${payCell}
      </tr>`;
  }).join('');
  const payHead = isCurator ? '' : '<th>Оплата</th>';
  return `<table class="table"><thead><tr><th>Студент</th><th>Прогресс</th>${payHead}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderDashTable(q) {
  const ql = (q || '').trim().toLowerCase();
  let list = getStudents();
  let shown = list;
  if (ql) {
    shown = list.filter(s => s.name.toLowerCase().includes(ql));
    $('#dash-table').innerHTML = studentTableHTML(shown);
    bindRowClicks(shown);
    return;
  }
  // pagination on dashboard too
  const perPage = 8;
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  let pg = state.dashPage || 1;
  if (pg > pages) pg = 1;
  state.dashPage = pg;
  shown = list.slice((pg - 1) * perPage, pg * perPage);
  $('#dash-table').innerHTML = studentTableHTML(shown) +
    `<div class="pagination">
       <button class="btn btn-ghost btn-sm" id="dash-prev" ${pg <= 1 ? 'disabled' : ''}>←</button>
       <span>${pg} / ${pages}</span>
       <button class="btn btn-ghost btn-sm" id="dash-next" ${pg >= pages ? 'disabled' : ''}>→</button>
     </div>`;
  bindRowClicks(shown);
  const prev = $('#dash-prev'), next = $('#dash-next');
  if (prev) prev.addEventListener('click', () => { state.dashPage = pg - 1; renderDashboard(); });
  if (next) next.addEventListener('click', () => { state.dashPage = pg + 1; renderDashboard(); });
}

function bindRowClicks(list) {
  $$('#view-dashboard tbody tr, #students-list tbody tr, #view-students tbody tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const id = tr.dataset.id;
      if (id) navigate('student', id);
    });
  });
}

/* =====================================================================
   STUDENTS LIST (Screen 2 shared list)
   ===================================================================== */
function renderStudents() {
  const list = getStudents();
  const perPage = state.studentsPerPage;
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const pg = state.studentPage;
  const shown = list.slice((pg - 1) * perPage, pg * perPage);
  $('#students-list').innerHTML = studentTableHTML(shown) +
    `<div class="pagination">
       <button class="btn btn-ghost btn-sm" id="stu-prev" ${pg <= 1 ? 'disabled' : ''}>←</button>
       <span>${pg} / ${pages}</span>
       <button class="btn btn-ghost btn-sm" id="stu-next" ${pg >= pages ? 'disabled' : ''}>→</button>
     </div>`;
  bindStudentRowClicks();

  const q = $('#student-search');
  q.oninput = () => {
    const ql = (q.value || '').trim().toLowerCase();
    const filtered = ql ? list.filter(s => s.name.toLowerCase().includes(ql)) : list;
    $('#students-list').innerHTML = studentTableHTML(filtered) +
      `<div class="pagination"><span>${filtered.length} из ${list.length}</span></div>`;
    bindStudentRowClicks();
  };

  const prev = $('#stu-prev'), next = $('#stu-next');
  if (prev) prev.addEventListener('click', () => { state.studentPage = pg - 1; renderStudents(); });
  if (next) next.addEventListener('click', () => { state.studentPage = pg + 1; renderStudents(); });
}

function bindStudentRowClicks() {
  $$('#students-list tbody tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const id = tr.dataset.id;
      if (id) navigate('student', id);
    });
  });
}

/* =====================================================================
   STUDENT DETAIL (Screen 2)
   ===================================================================== */
function renderStudentDetail() {
  const s = findStudent(state.selectedStudentId);
  if (!s) { navigate('dashboard'); return; }

  const paid = isPaidUntil(s);
  const dUntil = daysUntil(s.paidUntil);
  const p = progressOf(s);
  const isAdmin = state.currentUser.role === 'admin';

  // grouped homeworks
  const modules = getModules();
  const hwByModule = modules.map(m => {
    return {
      module: m,
      items: m.tasks.map(task => {
        return { task, hw: s.homework.find(h => h.taskId === task.id) || { taskId: task.id, status: 'notdone', link: '', feedback: '' } };
      }),
    };
  });

  const detail = $('#student-detail');
  detail.innerHTML = `
    <div class="student-hero">
      <div class="student-hero-left">
        <div class="avatar">${esc(s.name.charAt(0))}</div>
        <div>
          <h3>${esc(s.name)}</h3>
          <div class="meta-line">${esc(s.email)} · ${esc(s.phone)}</div>
        </div>
      </div>
      <div>
        ${isAdmin ? `<button class="btn btn-ghost btn-sm" id="stud-edit">Редактировать</button>` : ''}
      </div>
    </div>

    <div class="info-grid">
      <div class="card">
        <h4>Информация о студенте</h4>
        <div class="info-list">
          <div class="info-row"><span class="k">Имя и фамилия</span><span class="v">${esc(s.name)}</span></div>
          <div class="info-row"><span class="k">Email</span><span class="v">${esc(s.email)}</span></div>
          <div class="info-row"><span class="k">Телефон</span><span class="v">${esc(s.phone)}</span></div>
          <div class="info-row"><span class="k">Дата начала обучения</span><span class="v">${fmtDate(s.startDate)}</span></div>
        </div>
      </div>
      ${isAdmin ? `
      <div class="card">
        <h4>Оплата</h4>
        <div class="pay-status ${paid ? 'paid' : 'debt'}" style="margin-bottom:14px;">
          ${paid ? '✓ Оплачено' : '✕ Просрочено'}
          <span class="small">${dUntil >= 0 ? 'осталось ' + dUntil + ' дн.' : 'просрочка ' + Math.abs(dUntil) + ' дн.'}</span>
        </div>
        <div class="info-list">
          <div class="info-row"><span class="k">Оплачено до</span><span class="v">${fmtDate(s.paidUntil)}</span></div>
          <div class="info-row"><span class="k">Статус</span><span class="v">${paid ? 'Оплачено' : 'Долг'}</span></div>
        </div>
        <button class="btn btn-primary btn-sm" id="stud-pay-edit">Обновить оплату</button>
      </div>
      ` : ''}
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Модули и домашние задания</h3>
        <span class="badge badge-neutral">Прогресс: <strong>${p}%</strong> (${countDone(s)}/${totalTasks()})</span>
      </div>
      <div class="stack">
        ${hwByModule.map(g => `
          <div class="module-card">
            <div class="module-head">
              <h4>${esc(g.module.title)}</h4>
            </div>
            <div class="module-body">
              ${g.items.map(it => hwCardHTML(it, s, isAdmin)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  if (isAdmin) {
    $('#stud-edit').addEventListener('click', () => openStudentModal(s));
    $('#stud-pay-edit').addEventListener('click', () => openPayModal(s));
  }
  // HW actions bound by delegation
  bindHWEvents(s);
}

function hwCardHTML(it, s, isAdmin) {
  const hw = it.hw;
  const labels = { notdone: 'Не сдано', pending: 'Ожидает проверки', checked: 'Проверено', rework: 'Нужна доработка' };
  const cls = { notdone: 'status-notdone', pending: 'status-pending', checked: 'status-checked', rework: 'status-rework' };
  const fb = hw.feedback ? `<div class="hw-feedback">💬 ${esc(hw.feedback)}</div>` : '';
  const link = hw.link ? `<a class="hw-link" href="${esc(hw.link)}" target="_blank" rel="noopener">🔗 ${esc(hw.link)}</a>` : '';
  return `
    <div class="hw-card" data-hw="${esc(hw.taskId)}">
      <div class="hw-head">
        <span class="hw-title">${esc(it.task.title)}</span>
        <span class="badge ${cls[hw.status] || 'status-notdone'}">${labels[hw.status] || hw.status}</span>
      </div>
      ${link}
      ${fb}
      <button class="btn btn-ghost btn-sm" style="margin-top:8px;" data-edit-hw="${esc(hw.taskId)}">Изменить</button>
    </div>`;
}

function bindHWEvents(s) {
  // Delegate to detail container
  const detail = $('#student-detail');
  detail.onclick = (e) => {
    const editBtn = e.target.closest('[data-edit-hw]');
    if (editBtn) {
      const taskId = editBtn.dataset.editHw;
      openHWEditor(s, taskId, editBtn.closest('.hw-card'));
    }
  };
}

function openHWEditor(s, taskId, hwCardEl) {
  const isAdmin = state.currentUser.role === 'admin';
  // find task
  let taskTitle = '';
  for (const m of getModules()) {
    const t = m.tasks.find(x => x.id === taskId);
    if (t) taskTitle = t.title;
  }
  const hw = s.homework.find(h => h.taskId === taskId) || { taskId, status: 'notdone', link: '', feedback: '' };
  const labels = { notdone: 'Не сдано', pending: 'Ожидает проверки', checked: 'Проверено', rework: 'Нужна доработка' };

  openModal(`
    <h3>Домашнее задание: ${esc(taskTitle)}</h3>
    <p class="muted small" style="margin-bottom:16px;">Студент: <strong>${esc(s.name)}</strong></p>
    <div class="form-field">
      <label class="input-label">Статус</label>
      <select class="input" id="m-status">
        ${Object.keys(labels).map(k => `<option value="${k}" ${hw.status === k ? 'selected' : ''}>${labels[k]}</option>`).join('')}
      </select>
    </div>
    <div class="form-field">
      <label class="input-label">Ссылка на работу</label>
      <input type="text" class="input" id="m-link" value="${esc(hw.link)}" placeholder="https://… / скопируйте из письма" />
    </div>
    <div class="form-field">
      <label class="input-label">Фидбек для ученика</label>
      <textarea class="input" id="m-feedback" placeholder="Комментарий…">${esc(hw.feedback)}</textarea>
    </div>
  `, `
    <button class="btn btn-ghost" data-close>Отмена</button>
    <button class="btn btn-primary" id="hw-save">Сохранить</button>
  `, () => {});

  $('#hw-save').addEventListener('click', () => {
    const status = $('#m-status').value;
    const link = $('#m-link').value.trim();
    const feedback = $('#m-feedback').value.trim();
    const students = getStudents();
    const st = students.find(x => x.id === s.id);
    let rec = st.homework.find(h => h.taskId === taskId);
    if (!rec) { rec = { taskId, status: 'notdone', link: '', feedback: '' }; st.homework.push(rec); }
    rec.status = status; rec.link = link; rec.feedback = feedback;
    saveStudents(students);
    closeModal();
    renderStudentDetail();
    toast('Домашнее задание обновлено', 'success');
  });
}

/* ---------------- Student modal (admin) ---------------- */
function openStudentModal(s) {
  const isEdit = !!s;
  openModal(`
    <h3>${isEdit ? 'Редактировать студента' : 'Новый студент'}</h3>
    <div class="form-field"><label class="input-label">Имя и фамилия</label>
      <input type="text" class="input" id="sm-name" value="${isEdit ? esc(s.name) : ''}" /></div>
    <div class="form-field"><label class="input-label">Email</label>
      <input type="text" class="input" id="sm-email" value="${isEdit ? esc(s.email) : ''}" /></div>
    <div class="form-field"><label class="input-label">Телефон</label>
      <input type="text" class="input" id="sm-phone" value="${isEdit ? esc(s.phone) : ''}" /></div>
    <div class="form-field"><label class="input-label">Дата начала обучения</label>
      <input type="date" class="input" id="sm-start" value="${isEdit ? esc(s.startDate) : todayISO()}" /></div>
    <div class="form-field"><label class="input-label">Оплачено до</label>
      <input type="date" class="input" id="sm-paid" value="${isEdit ? esc(s.paidUntil) : addDaysISO(30)}" /></div>
  `, `
    ${isEdit ? `<button class="btn btn-danger" id="sm-delete">Удалить</button>` : ''}
    <span style="flex:1"></span>
    <button class="btn btn-ghost" data-close>Отмена</button>
    <button class="btn btn-primary" id="sm-save">${isEdit ? 'Сохранить' : 'Создать'}</button>
  `, () => {});

  if (isEdit) {
    $('#sm-delete').addEventListener('click', () => {
      const students = getStudents().filter(x => x.id !== s.id);
      saveStudents(students);
      closeModal();
      navigate('students');
      toast('Студент удалён', 'success');
    });
  }

  $('#sm-save').addEventListener('click', () => {
    const name = $('#sm-name').value.trim();
    if (!name) { toast('Введите имя', null); return; }
    const students = getStudents();
    if (isEdit) {
      const st = students.find(x => x.id === s.id);
      st.name = name;
      st.email = $('#sm-email').value.trim();
      st.phone = $('#sm-phone').value.trim();
      st.startDate = $('#sm-start').value || todayISO();
      st.paidUntil = $('#sm-paid').value || addDaysISO(30);
      saveStudents(students);
      closeModal();
      renderStudentDetail();
      toast('Студент обновлён', 'success');
    } else {
      const st = {
        id: uid(),
        name,
        email: $('#sm-email').value.trim(),
        phone: $('#sm-phone').value.trim(),
        startDate: $('#sm-start').value || todayISO(),
        paidUntil: $('#sm-paid').value || addDaysISO(30),
        homework: getModules().reduce((acc, m) => acc.concat(m.tasks.map(t => ({ taskId: t.id, status: 'notdone', link: '', feedback: '' }))), []),
      };
      students.push(st);
      saveStudents(students);
      closeModal();
      navigate('students');
      toast('Студент создан', 'success');
    }
  });
}

function openPayModal(s) {
  openModal(`
    <h3>Обновить оплату</h3>
    <p class="muted small" style="margin-bottom:16px;">Студент: <strong>${esc(s.name)}</strong></p>
    <div class="form-field"><label class="input-label">Оплачено до</label>
      <input type="date" class="input" id="pm-date" value="${esc(s.paidUntil)}" /></div>
  `, `
    <button class="btn btn-ghost" data-close>Отмена</button>
    <button class="btn btn-primary" id="pm-save">Сохранить</button>
  `, () => {});
  $('#pm-save').addEventListener('click', () => {
    const students = getStudents();
    const st = students.find(x => x.id === s.id);
    st.paidUntil = $('#pm-date').value || addDaysISO(30);
    saveStudents(students);
    closeModal();
    renderStudentDetail();
    toast('Оплата обновлена', 'success');
  });
}

/* =====================================================================
   MODULES (Screen 3, admin)
   ===================================================================== */
function renderModules() {
  const modules = getModules().slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const list = $('#modules-list');
  list.innerHTML = modules.map(m => `
    <div class="module-card">
      <div class="module-head">
        <h4>${esc(m.title)}</h4>
        <div>
          <button class="btn btn-ghost btn-sm" data-move-up="${esc(m.id)}">↑</button>
          <button class="btn btn-ghost btn-sm" data-move-down="${esc(m.id)}">↓</button>
          <button class="btn btn-ghost btn-sm" data-edit-mod="${esc(m.id)}">✎</button>
          <button class="btn btn-danger btn-sm" data-del-mod="${esc(m.id)}">🗑</button>
        </div>
      </div>
      <div class="module-body">
        ${m.tasks.length ? m.tasks.map(t => `<div class="hw-card" style="padding:12px 16px;"><div class="hw-title">• ${esc(t.title)}</div>${t.desc ? `<div class="row-sub">${esc(t.desc)}</div>` : ''}</div>`).join('') : `<p class="muted small">Нет заданий</p>`}
        <button class="btn btn-ghost btn-sm fold-btn" data-add-task="${esc(m.id)}">+ Добавить задание</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-edit-mod]').forEach(b => b.addEventListener('click', () => editModuleModal(modules.find(x => x.id === b.dataset.editMod))));
  list.querySelectorAll('[data-del-mod]').forEach(b => b.addEventListener('click', () => deleteModule(b.dataset.delMod)));
  list.querySelectorAll('[data-add-task]').forEach(b => b.addEventListener('click', () => addTaskModal(b.dataset.addTask)));
  list.querySelectorAll('[data-move-up]').forEach(b => b.addEventListener('click', () => moveModule(b.dataset.moveUp, -1)));
  list.querySelectorAll('[data-move-down]').forEach(b => b.addEventListener('click', () => moveModule(b.dataset.moveDown, 1)));

  $('#add-module-btn').onclick = () => editModuleModal(null);
}

function moveModule(id, dir) {
  let ms = getModules();
  const idx = ms.findIndex(m => m.id === id);
  const swap = idx + dir;
  if (swap < 0 || swap >= ms.length) return;
  const tmp = ms[idx];
  ms[idx] = ms[swap];
  ms[swap] = tmp;
  ms.forEach((m, i) => m.order = i + 1);
  saveModules(ms);
  renderModules();
}

function editModuleModal(m) {
  const isEdit = !!m;
  openModal(`
    <h3>${isEdit ? 'Редактировать модуль' : 'Новый модуль'}</h3>
    <div class="form-field"><label class="input-label">Название модуля</label>
      <input type="text" class="input" id="mod-name" value="${isEdit ? esc(m.title) : ''}" placeholder="Например, Основы UX" /></div>
    <div class="form-field"><label class="input-label">Описание (необязательно)</label>
      <textarea class="input" id="mod-desc">${isEdit ? esc(m.desc || '') : ''}</textarea></div>
  `, `
    <button class="btn btn-ghost" data-close>Отмена</button>
    <button class="btn btn-primary" id="mod-save">${isEdit ? 'Сохранить' : 'Создать'}</button>
  `, () => {});
  $('#mod-save').addEventListener('click', () => {
    const title = $('#mod-name').value.trim();
    if (!title) { toast('Введите название'); return; }
    let ms = getModules();
    if (isEdit) {
      const mod = ms.find(x => x.id === m.id);
      mod.title = title;
      mod.desc = $('#mod-desc').value.trim();
      // sync newly created task? Not needed; desc is module-level
    } else {
      ms.push({ id: uid(), title, desc: $('#mod-desc').value.trim(), tasks: [], order: ms.length + 1 });
    }
    saveModules(ms);
    closeModal();
    renderModules();
    toast('Модуль сохранён', 'success');
  });
}

function deleteModule(id) {
  const ms = getModules().filter(m => m.id !== id);
  saveModules(ms);
  renderModules();
  toast('Модуль удалён', 'success');
}

function addTaskModal(moduleId) {
  openModal(`
    <h3>Добавить домашнее задание</h3>
    <div class="form-field"><label class="input-label">Название задания</label>
      <input type="text" class="input" id="task-name" placeholder="Например, Создать лендинг" /></div>
    <div class="form-field"><label class="input-label">Описание (необязательно)</label>
      <textarea class="input" id="task-desc" placeholder="Условия, сроки…"></textarea></div>
  `, `
    <button class="btn btn-ghost" data-close>Отмена</button>
    <button class="btn btn-primary" id="task-save">Добавить</button>
  `, () => {});
  $('#task-save').addEventListener('click', () => {
    const title = $('#task-name').value.trim();
    if (!title) { toast('Введите название'); return; }
    const ms = getModules();
    const mod = ms.find(x => x.id === moduleId);
    if (mod) mod.tasks.push({ id: uid(), title, desc: $('#task-desc').value.trim() });
    saveModules(ms);
    // add HW record to all students for new task
    const students = getStudents();
    const newId = mod.tasks[mod.tasks.length - 1].id;
    students.forEach(st => st.homework.push({ taskId: newId, status: 'notdone', link: '', feedback: '' }));
    saveStudents(students);
    closeModal();
    renderModules();
    toast('Задание добавлено', 'success');
  });
}

/* =====================================================================
   USERS (Screen, admin)
   ===================================================================== */
function renderUsers() {
  const users = getUsers();
  const list = $('#users-list');
  const curIndex = users.findIndex(u => u.id === state.currentUser.id);
  list.innerHTML = `
    <table class="table">
      <thead><tr><th>Пользователь</th><th>Роль</th><th>Логин</th><th></th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td>
              <div class="row-name">${esc(u.name)}</div>
              ${u.id === users[curIndex].id ? `<div class="row-sub">это вы</div>` : ''}
            </td>
            <td><span class="badge ${u.role === 'admin' ? 'badge-paid' : 'badge-neutral'}">${u.role === 'admin' ? 'Админ' : 'Куратор'}</span></td>
            <td>${esc(u.login)}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-pass-user="${esc(u.id)}">Пароль</button>
              ${u.id !== state.currentUser.id ? `<button class="btn btn-danger btn-sm" data-del-user="${esc(u.id)}">Удалить</button>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  list.querySelectorAll('[data-del-user]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.delUser;
    if (confirm('Удалить этого пользователя?')) {
      saveUsers(getUsers().filter(u => u.id !== id));
      renderUsers();
    }
  }));
  list.querySelectorAll('[data-pass-user]').forEach(b => b.addEventListener('click', () => changePasswordModal(b.dataset.passUser)));

  $('#add-user-btn').onclick = addUserModal;
}

function addUserModal() {
  openModal(`
    <h3>Новый пользователь</h3>
    <div class="form-field"><label class="input-label">Имя</label>
      <input type="text" class="input" id="nu-name" /></div>
    <div class="form-field"><label class="input-label">Логин</label>
      <input type="text" class="input" id="nu-login" /></div>
    <div class="form-field"><label class="input-label">Пароль</label>
      <input type="password" class="input" id="nu-pass" /></div>
    <div class="form-field"><label class="input-label">Роль</label>
      <select class="input" id="nu-role">
        <option value="curator">Куратор</option>
        <option value="admin">Админ</option>
      </select></div>
  `, `
    <button class="btn btn-ghost" data-close>Отмена</button>
    <button class="btn btn-primary" id="nu-save">Создать</button>
  `, () => {});
  $('#nu-save').addEventListener('click', () => {
    const name = $('#nu-name').value.trim();
    const login = $('#nu-login').value.trim();
    const pass = $('#nu-pass').value;
    if (!name || !login || !pass) { toast('Заполните все поля'); return; }
    if (getUsers().some(u => u.login.toLowerCase() === login.toLowerCase())) { toast('Логин занят'); return; }
    const users = getUsers();
    users.push({ id: uid(), name, login, pass, role: $('#nu-role').value });
    saveUsers(users);
    closeModal();
    renderUsers();
    toast('Пользователь создан', 'success');
  });
}

function changePasswordModal(userId) {
  const users = getUsers();
  const u = users.find(x => x.id === userId);
  if (!u) return;
  openModal(`
    <h3>Сменить пароль</h3>
    <p class="muted small">Пользователь: <strong>${esc(u.name)} (${esc(u.login)})</strong></p>
    <div class="form-field"><label class="input-label">Новый пароль</label>
      <input type="password" class="input" id="cp-pass" autocomplete="new-password" /></div>
  `, `
    <button class="btn btn-ghost" data-close>Отмена</button>
    <button class="btn btn-primary" id="cp-save">Сохранить</button>
  `, () => {});
  $('#cp-save').addEventListener('click', () => {
    const pass = $('#cp-pass').value;
    if (!pass) { toast('Введите новый пароль'); return; }
    const us = getUsers();
    const rec = us.find(x => x.id === userId);
    if (rec) { rec.pass = pass; saveUsers(us); }
    closeModal();
    renderUsers();
    toast('Пароль обновлён', 'success');
  });
}

function renderProfile() {
  const users = getUsers();
  const u = users.find(x => x.id === state.currentUser.id);
  if (!u) return;
  $('#profile-name').value = u.name || '';
  $('#profile-login').value = u.login || '';
  $('#profile-role').value = u.role === 'admin' ? 'Администратор' : 'Куратор';
  $('#profile-pass').value = '';
  const save = $('#profile-save');
  if (save._listener) return;
  save._listener = true;
  save.addEventListener('click', () => {
    const pass = $('#profile-pass').value;
    if (!pass) { toast('Введите новый пароль'); return; }
    const us = getUsers();
    const rec = us.find(x => x.id === state.currentUser.id);
    if (rec) { rec.pass = pass; saveUsers(us); }
    if (state.currentUser) state.currentUser.pass = pass;
    $('#profile-pass').value = '';
    toast('Пароль обновлён', 'success');
  });
}

/* =====================================================================
   IMPORT (Screen 4, admin)
   Режимы: «students» (импорт студентов с колонкой «Сделано»)
           «homework» (импорт деталей ДЗ: название, ссылка, статус, фидбек)
   ===================================================================== */
let importState = {
  mode: 'students',
  sheets: [],        // список названий листов (для XLSX)
  sheetIdx: 0,
  rawRows: [],
  columns: [],
  mapping: {},
};

const IMPORT_FIELDS_STUDENTS = [
  { key: 'name', label: 'Имя и фамилия *', required: true },
  { key: 'done', label: '«Сделано» (задания через запятую)' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Телефон' },
  { key: 'startDate', label: 'Дата начала' },
  { key: 'paidUntil', label: 'Оплачено до' },
];

const IMPORT_FIELDS_HOMEWORK = [
  { key: 'taskName', label: 'Название задания *', required: true },
  { key: 'studentName', label: 'Имя студента (если файл по студентам)' },
  { key: 'link', label: 'Ссылка на работу' },
  { key: 'status', label: 'Статус ДЗ' },
  { key: 'feedback', label: 'Фидбек' },
];

function fieldsForMode(mode) {
  return mode === 'students' ? IMPORT_FIELDS_STUDENTS : IMPORT_FIELDS_HOMEWORK;
}

function resetImport(silent) {
  importState.mode = importState.mode || 'students';
  importState.sheets = [];
  importState.sheetIdx = 0;
  importState.rawRows = [];
  importState.columns = [];
  importState.mapping = {};
  $('#import-step-1').classList.remove('hidden');
  $('#import-step-2').classList.add('hidden');
  $('#import-step-3').classList.add('hidden');
  $('#import-result').classList.add('hidden');
  $('#import-result').textContent = '';
  $('#import-file').value = '';
  $('#import-sheet-row').classList.add('hidden');
  $('#import-sheet-select').innerHTML = '';
  syncImportTabs();
  updateImportHints();
}

function syncImportTabs() {
  $$('#import-tabs .import-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === importState.mode);
  });
}

function updateImportHints() {
  const st = importState.mode === 'students';
  $('#import-drop-hint').textContent = st
    ? 'Поддерживаются .csv и .xlsx. Сопоставьте имя, контакты, оплату и колонку «Сделано».'
    : 'Поддерживаются .csv и .xlsx. Укажите колонки: название задания, ссылка, статус, фидбек (и студента, если нужно).';
  $('#import-mapping-hint').textContent = st
    ? 'Укажите, какой столбец таблицы соответствует полю приложения. «Имя и фамилия» — обязательно.'
    : 'Укажите, какой столбец таблицы соответствует полю задания. «Название задания» — обязательно.';
}

function bindImport() {
  const dz = $('#dropzone');
  const fileInput = $('#import-file');

  // mode tabs
  $$('#import-tabs .import-tab').forEach(t => {
    t.addEventListener('click', () => {
      importState.mode = t.dataset.mode;
      resetImport();
    });
  });

  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault(); dz.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleImportFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleImportFile(fileInput.files[0]);
  });

  $('#import-back-1').addEventListener('click', () => {
    $('#import-step-2').classList.add('hidden');
    $('#import-step-1').classList.remove('hidden');
  });
  $('#import-next-preview').addEventListener('click', goPreview);
  $('#import-back-2').addEventListener('click', () => {
    $('#import-step-3').classList.add('hidden');
    $('#import-step-2').classList.remove('hidden');
  });
  $('#confirm-import').addEventListener('click', doImport);
  $('#import-sheet-select').addEventListener('change', (e) => {
    importState.sheetIdx = Number(e.target.value);
    materializeSheet();
  });
}

function handleImportFile(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv')) {
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target.result);
    reader.readAsText(file, 'utf-8');
  } else if (name.endsWith('.xlsx')) {
    parseXLSX(file);
  } else {
    toast('Поддерживаются только .csv и .xlsx');
  }
}

function parseCSV(text) {
  // simple robust CSV parser
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  // CSV — один «лист»
  importState.sheets = [];
  importState.sheetIdx = 0;
  $('#import-sheet-row').classList.add('hidden');
  $('#import-sheet-select').innerHTML = '';
  setupImport(rows);
}

function parseXLSX(file) {
  loadSheetJS().then(XLSX => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        importState._wb = wb;
        importState.sheets = wb.SheetNames || [];
        importState.sheetIdx = 0;

        // показать выбор листа, если их больше одного
        const sel = $('#import-sheet-select');
        sel.innerHTML = importState.sheets.map((s, i) => `<option value="${i}">${esc(s)}</option>`).join('');
        if (importState.sheets.length > 1) {
          $('#import-sheet-row').classList.remove('hidden');
        } else {
          $('#import-sheet-row').classList.add('hidden');
        }
        materializeSheet();
      } catch (err) {
        toast('Ошибка чтения XLSX: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }).catch(() => { /* handled in loadSheetJS */ });
}

function materializeSheet() {
  const wb = importState._wb;
  const idx = importState.sheetIdx || 0;
  if (!wb || !wb.Sheets || wb.SheetNames.length === 0) return;
  const ws = wb.Sheets[wb.SheetNames[idx]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const rows = aoa.map(r => Array.isArray(r) ? r.map(c => String(c == null ? '' : c)) : [String(r)]);
  setupImport(rows);
}

let sheetJSPromise = null;
function loadSheetJS() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (sheetJSPromise) return sheetJSPromise;
  sheetJSPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('XLSX не загрузился'));
    s.onerror = () => {
      toast('Не удалось загрузить библиотеку XLSX (нет интернета). Экспортируйте файл в CSV.');
      reject(new Error('offline'));
      $('#import-step-1').classList.remove('hidden');
    };
    document.head.appendChild(s);
  }).catch(e => { sheetJSPromise = null; throw e; });
  return sheetJSPromise;
}

function setupImport(rows) {
  const nonEmpty = rows.filter(r => r.some(c => String(c).trim() !== ''));
  if (!nonEmpty.length) { toast('Файл пуст или лист не содержит данных'); return; }
  const header = nonEmpty[0];
  const data = nonEmpty.slice(1);
  importState.columns = header;
  importState.rawRows = data;
  importState.mapping = autoMap(header);
  $('#import-step-1').classList.add('hidden');
  $('#import-step-2').classList.remove('hidden');
  renderMapping();
}

function autoMap(header) {
  const map = {};
  const mapByStud = {
    name: ['имя', 'фио', 'фамилия', 'имя и фамилия', 'ф.и.о', 'студент', 'ученик'],
    done: ['сделано', 'зделано', 'задания', 'выполнено', 'готово', 'пройдено'],
    email: ['email', 'почта', 'e-mail', 'эл.почта', 'электронная'],
    phone: ['телефон', 'тел', 'phone', 'моб'],
    startDate: ['дата начала', 'старт', 'начало', 'дата старта'],
    paidUntil: ['оплачено до', 'оплата до', 'оплачено', 'дата оплаты', 'оплата', 'подписка'],
  };
  const mapByHw = {
    taskName: ['задание', 'название', 'дз', 'д/з', 'работа', 'тема', 'task'],
    studentName: ['студент', 'ученик', 'имя'],
    link: ['ссылка', 'link', 'url', 'сcылка'],
    status: ['статус', 'status', 'состояние'],
    feedback: ['фидбек', 'feedback', 'комментарий', 'отзыв', 'рецензия'],
  };
  const mapBy = importState.mode === 'students' ? mapByStud : mapByHw;
  header.forEach((h, i) => {
    const l = String(h).toLowerCase().trim();
    for (const key of Object.keys(mapBy)) {
      if (mapBy[key].some(k => l.includes(k)) && !map[key]) {
        map[key] = i;
        break;
      }
    }
  });
  return map;
}

function renderMapping() {
  const fields = fieldsForMode(importState.mode);
  const wrap = $('#mapping-fields');
  wrap.innerHTML = fields.map(f => {
    const val = importState.mapping[f.key] != null ? importState.mapping[f.key] : '';
    return `
      <div>
        <label class="input-label">${esc(f.label)}</label>
        <select class="input" data-map="${esc(f.key)}">
          <option value="">— не импортировать —</option>
          ${importState.columns.map((c, i) => `<option value="${i}" ${String(val) === String(i) ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </div>`;
  }).join('');
  wrap.querySelectorAll('select[data-map]').forEach(sel => {
    sel.addEventListener('change', () => {
      importState.mapping[sel.dataset.map] = sel.value === '' ? null : Number(sel.value);
    });
  });
}

/* ----- статусы ДЗ и нечёткое сопоставление ----- */
const HW_STATUS_MAP = [
  // порядок важен: сначала специфичные статусы, потом общие
  { keys: ['не сдан', 'не сда', 'не выполн', 'не готов', 'нет', 'не сдела'], status: 'notdone' },
  // «сдал/сдано/сделано/готово» = студент сдал работу => ожидает проверки куратором
  { keys: ['сдал', 'сдала', 'сдали', 'сдано', 'сдан', 'сдел', 'сдела', 'готов', 'выполн', 'ожид', 'на проверке', 'ожидает', 'проверки', 'проверка', 'done', 'ok'], status: 'pending' },
  { keys: ['доработ', 'передел', 'правк', 'исправл', 'верн'], status: 'rework' },
  // «проверено» = куратор проверил и принял
  { keys: ['проверено', 'проверен', 'принят', 'принято', 'зачт', 'засчитан'], status: 'checked' },
];
function parseStatus(v) {
  const s = String(v || '').toLowerCase().trim();
  if (!s) return null;
  // прямое совпадение с внутренним кодом статуса
  if (['checked', 'pending', 'rework', 'notdone'].includes(s)) return s;
  // точное совпадение одного слова: «сдал» и т.п. = ожидает проверки, «проверено» = проверено
  const exact = { 'сдал': 'pending', 'сдала': 'pending', 'сдали': 'pending', 'сдано': 'pending', 'сдан': 'pending', 'сделал': 'pending', 'сделала': 'pending', 'готово': 'pending', 'выполнено': 'pending', 'выполнена': 'pending', 'проверено': 'checked', 'проверен': 'checked' };
  if (exact[s]) return exact[s];
  for (const m of HW_STATUS_MAP) {
    if (m.keys.some(k => s.includes(k))) return m.status;
  }
  return null;
}

function normalize(v) {
  return String(v || '').toLowerCase().replace(/[^a-zа-яё0-9]/g, '').trim();
}

// нечёткое сопоставление: ищем задание в модулях по совпадению всех значащих слов
function matchTask(words) {
  if (!words) return null;
  const modules = getModules();
  for (const m of modules) {
    for (const t of m.tasks) {
      const nt = normalize(t.title);
      if (!nt) continue;
      const all = words.every(w => w && nt.includes(w));
      if (all) return t;
    }
  }
  return null;
}

function splitDoneWords(v) {
  // разбиваем «сделано» на отдельные задания по разделителям списка (запятая, ;, /, новая строка),
  // чтобы многословные названия («Задание 1») оставались целыми фразами
  return String(v || '').split(/[,;\n\r/]+/).map(p => p.trim()).filter(Boolean);
}

function goPreview() {
  const mode = importState.mode;
  $('#import-step-2').classList.add('hidden');
  $('#import-step-3').classList.remove('hidden');

  if (mode === 'students') {
    const nameIdx = importState.mapping.name;
    if (nameIdx == null) { toast('Выберите столбец для имени'); backToMapping(); return; }
    const previewRows = importState.rawRows.slice(0, 10);
    let count = 0;
    importState.rawRows.forEach(r => { if (String(r[nameIdx] || '').trim()) count++; });
    $('#import-preview-hint').textContent = `Будет добавлено студентов: ${count}. Поля «Сделано» отмеченные задания будут подсвечены как выполненные.`;

    let html = `<table class="table"><thead><tr><th>Имя</th><th>Email</th><th>Телефон</th><th>Оплачено до</th><th>Сделано</th></tr></thead><tbody>`;
    previewRows.forEach(r => {
      if (!String(r[nameIdx] || '').trim()) return;
      html += `<tr>
        <td>${esc(r[importState.mapping.name] || '')}</td>
        <td>${esc(importState.mapping.email != null ? r[importState.mapping.email] : '')}</td>
        <td>${esc(importState.mapping.phone != null ? r[importState.mapping.phone] : '')}</td>
        <td>${esc(formatPreviewDate(importState.mapping.paidUntil != null ? r[importState.mapping.paidUntil] : ''))}</td>
        <td>${esc(importState.mapping.done != null ? r[importState.mapping.done] : '')}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    $('#import-preview').innerHTML = html;
  } else {
    const taskIdx = importState.mapping.taskName;
    if (taskIdx == null) { toast('Выберите столбец для названия задания'); backToMapping(); return; }
    const previewRows = importState.rawRows.slice(0, 10);
    let count = 0;
    importState.rawRows.forEach(r => { if (String(r[taskIdx] || '').trim()) count++; });
    $('#import-preview-hint').textContent = `Будет обработано строк: ${count}. Каждая строка применит ссылку/статус/фидбек к заданию с похожим названием.`;

    let html = `<table class="table"><thead><tr><th>Задание</th><th>Студент</th><th>Статус</th><th>Ссылка</th><th>Фидбек</th></tr></thead><tbody>`;
    previewRows.forEach(r => {
      if (!String(r[taskIdx] || '').trim()) return;
      const st = parseStatus(importState.mapping.status != null ? r[importState.mapping.status] : '');
      html += `<tr>
        <td>${esc(r[taskIdx] || '')}</td>
        <td>${esc(importState.mapping.studentName != null ? r[importState.mapping.studentName] : '— (все студенты)')}</td>
        <td>${esc(importState.mapping.status != null ? r[importState.mapping.status] : '')}${st ? `<div class="row-sub">→ ${statusLabel(st)}</div>` : ''}</td>
        <td>${esc(importState.mapping.link != null ? r[importState.mapping.link] : '')}</td>
        <td>${esc(importState.mapping.feedback != null ? r[importState.mapping.feedback] : '')}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    $('#import-preview').innerHTML = html;
  }
}

function statusLabel(s) {
  return { notdone: 'Не сдано', pending: 'Ожидает проверки', checked: 'Проверено', rework: 'Нужна доработка' }[s] || s;
}

function formatPreviewDate(v) {
  const d = coerceDate(v);
  return d ? fmtDate(d) : (String(v || '').trim() || '—');
}

function backToMapping() {
  $('#import-step-3').classList.add('hidden');
  $('#import-step-2').classList.remove('hidden');
}

function doImport() {
  const mode = importState.mode;
  if (mode === 'students') {
    doImportStudents();
  } else {
    doImportHomework();
  }
}

function doImportStudents() {
  const nameIdx = importState.mapping.name;
  let added = 0, skipped = 0;
  const students = getStudents();
  const existing = new Set(students.map(s => s.name.toLowerCase()));
  const doneIdx = importState.mapping.done;
  importState.rawRows.forEach(r => {
    const name = String(r[nameIdx] || '').trim();
    if (!name) return;
    if (existing.has(name.toLowerCase())) { skipped++; return; }
    const email = importState.mapping.email != null ? String(r[importState.mapping.email] || '').trim() : '';
    const phone = importState.mapping.phone != null ? String(r[importState.mapping.phone] || '').trim() : '';
    const start = importState.mapping.startDate != null ? coerceDate(r[importState.mapping.startDate]) : todayISO();
    const paid = importState.mapping.paidUntil != null ? coerceDate(r[importState.mapping.paidUntil]) : addDaysISO(30);
    const homework = getModules().reduce((acc, m) => acc.concat(m.tasks.map(t => ({ taskId: t.id, status: 'notdone', link: '', feedback: '' }))), []);
    // отметить сделанные задания
    if (doneIdx != null) {
      const phrases = splitDoneWords(r[doneIdx]);
      phrases.forEach(ph => {
        const words = ph.split(/\s+/).map(w => normalize(w)).filter(Boolean);
        const t = matchTask(words);
        if (t) {
          const rec = homework.find(h => h.taskId === t.id);
          if (rec && (rec.status === 'notdone' || rec.status === 'rework' || rec.status === 'pending')) rec.status = 'checked';
        }
      });
    }
    students.push({ id: uid(), name, email, phone, startDate: start || todayISO(), paidUntil: paid || addDaysISO(30), homework });
    existing.add(name.toLowerCase());
    added++;
  });
  saveStudents(students);
  showImportResult(`Импорт студентов завершён: добавлено <strong>${added}</strong>, пропущено (дубликаты) <strong>${skipped}</strong>.`, added);
}

function doImportHomework() {
  const taskIdx = importState.mapping.taskName;
  if (taskIdx == null) { toast('Выберите столбец для названия задания'); backToMapping(); return; }
  const studentIdx = importState.mapping.studentName;
  const linkIdx = importState.mapping.link;
  const statusIdx = importState.mapping.status;
  const feedbackIdx = importState.mapping.feedback;

  let updated = 0, taskMiss = 0, studentMiss = 0;
  const students = getStudents();

  importState.rawRows.forEach(r => {
    const taskWord = normalize(r[taskIdx]);
    if (!taskWord) return;
    const t = matchTask([taskWord]);
    if (!t) { taskMiss++; return; }

    const st = statusIdx != null ? parseStatus(r[statusIdx]) : null;
    const link = linkIdx != null ? String(r[linkIdx] || '').trim() : '';
    const fb = feedbackIdx != null ? String(r[feedbackIdx] || '').trim() : '';

    // определить, к каким студентам применять
    let targets;
    if (studentIdx != null) {
      const sname = String(r[studentIdx] || '').trim();
      if (!sname) return; // без имени студента пропускаем строку
      const s = students.find(x => x.name.toLowerCase() === sname.toLowerCase());
      if (!s) { studentMiss++; return; }
      targets = [s];
    } else {
      targets = students; // применяем ко всем
    }

    targets.forEach(s => {
      let rec = s.homework.find(h => h.taskId === t.id);
      if (!rec) { rec = { taskId: t.id, status: 'notdone', link: '', feedback: '' }; s.homework.push(rec); }
      if (st) rec.status = st;
      if (link) rec.link = link;
      if (fb) rec.feedback = fb;
      updated++;
    });
  });

  saveStudents(students);
  showImportResult(`Импорт ДЗ завершён: обновлено записей <strong>${updated}</strong>, не найдено заданий <strong>${taskMiss}</strong>, не найдено студентов <strong>${studentMiss}</strong>.`, updated);
}

function showImportResult(html, ok) {
  $('#import-result').classList.remove('hidden');
  $('#import-result').innerHTML = html;
  toast(ok ? 'Импорт завершён' : 'Импорт завершён с пропусками', 'success');
}

function coerceDate(v) {
  const s = String(v).trim();
  if (!s) return null;
  // try ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // try DD.MM.YYYY
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // try excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 20000 && num < 60000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

/* =====================================================================
   MODAL system
   ===================================================================== */
function openModal(content, actions, onOpen) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal">
        ${content}
        <div class="modal-actions">${actions || ''}</div>
      </div>
    </div>`;
  if (onOpen) onOpen();
  // close on backdrop click / escape
  $('#modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', escHandler);
}
function escHandler(e) {
  if (e.key === 'Escape') closeModal();
}
function closeModal() {
  const root = $('#modal-root');
  root.innerHTML = '';
  document.removeEventListener('keydown', escHandler);
}

/* =====================================================================
   INIT
   ===================================================================== */
function init() {
  seedIfNeeded();
  bindNav();
  bindImport();
  initAuth();
  $('#student-back').addEventListener('click', () => navigate('students'));

  // restore session
  const sess = getSession();
  if (sess) {
    const u = getUsers().find(x => x.id === sess.id);
    if (u) { state.currentUser = u; showApp(); return; }
  }
  showAuth();
}

document.addEventListener('DOMContentLoaded', init);
