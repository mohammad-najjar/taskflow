/* TaskFlow – vanilla JS. State -> render(); one delegated listener set (no duplicate handlers). */
(() => {
'use strict';
const KEY = { t: 'taskflow.tasks', s: 'taskflow.settings', a: 'taskflow.activity' };
const $ = (s, e = document) => e.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // local date, no UTC shift
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const plus = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const fmt = s => s ? parse(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const load = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? f; } catch { return f; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full/blocked */ } };

const SL = { todo: 'To Do', progress: 'In Progress', done: 'Completed' }, PL = { low: 'Low', medium: 'Medium', high: 'High' };
const PW = { high: 0, medium: 1, low: 2 };
const ICON = {
  home: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  done: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/>',
  set: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12 5 5 9-10"/>', edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>', left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>'
};
const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
const NAV = [['overview', 'Overview', 'home'], ['tasks', 'My Tasks', 'list'], ['board', 'Board', 'board'], ['calendar', 'Calendar', 'cal'], ['completed', 'Completed', 'done'], ['settings', 'Settings', 'set']];

/* ---------- state ---------- */
function demoTasks() {
  const t = (title, description, category, priority, status, due, ago = 5) => ({ id: uid(), title, description, category, priority, status, due, created: plus(-ago), completedAt: status === 'done' ? due : null, demo: true });
  return [
    t('Review portfolio case studies', 'Tighten copy and add outcomes to each project.', 'Portfolio', 'high', 'progress', today(), 6),
    t('Write launch announcement', 'Draft a short post for the new release.', 'Marketing', 'medium', 'todo', today(), 3),
    t('Fix navigation focus order', 'Keyboard users skip the search field.', 'Website', 'high', 'todo', plus(-2), 8),
    t('Prepare client kickoff agenda', 'Goals, timeline, and open questions.', 'Clients', 'medium', 'todo', plus(2), 2),
    t('Optimize image sizes', 'Convert hero images to WebP.', 'Website', 'low', 'progress', plus(4), 4),
    t('Plan quarterly goals', 'Pick three outcomes for next quarter.', 'Planning', 'low', 'todo', plus(9), 1),
    t('Update resume', 'Add the latest projects.', 'Portfolio', 'medium', 'done', plus(-1), 7),
    t('Set up analytics', 'Privacy-friendly page view tracking.', 'Website', 'medium', 'done', plus(-3), 9),
    t('Send invoice #104', 'Billing for the March sprint.', 'Clients', 'high', 'done', plus(-5), 10)
  ];
}
const cleanTask = x => (x && typeof x === 'object' && typeof x.title === 'string' && x.title.trim()) ? {
  id: String(x.id || uid()), title: x.title.slice(0, 120), description: String(x.description || '').slice(0, 500), category: String(x.category || 'General').slice(0, 40),
  priority: PW[x.priority] !== undefined ? x.priority : 'medium', status: SL[x.status] ? x.status : 'todo',
  due: /^\d{4}-\d{2}-\d{2}$/.test(x.due) ? x.due : '', created: /^\d{4}-\d{2}-\d{2}$/.test(x.created) ? x.created : today(),
  completedAt: /^\d{4}-\d{2}-\d{2}$/.test(x.completedAt) ? x.completedAt : null, demo: !!x.demo } : null;
let rawT = load(KEY.t, null);
let tasks = Array.isArray(rawT) ? rawT.map(cleanTask).filter(Boolean) : demoTasks();
const S0 = { theme: 'light', priority: 'medium', week: 0 };
let set = { ...S0, ...(load(KEY.s, {}) || {}) };
if (!['light', 'dark'].includes(set.theme)) set.theme = 'light';
if (!PW.hasOwnProperty(set.priority)) set.priority = 'medium';
set.week = set.week === 1 ? 1 : 0;
let activity = Array.isArray(load(KEY.a, [])) ? load(KEY.a, []).filter(a => a && a.text).slice(0, 15) : [];
const ui = { view: 'overview', q: '', fs: '', fp: '', fc: '', sort: 'due', cq: '', cal: new Date(), editId: null };
ui.cal.setDate(1);
const persist = () => { store(KEY.t, tasks); store(KEY.s, set); store(KEY.a, activity); };
const log = text => { activity.unshift({ text, at: Date.now() }); activity = activity.slice(0, 15); };
persist();

/* ---------- helpers ---------- */
const overdue = t => t.due && t.due < today() && t.status !== 'done';
const dueLabel = t => `<span class="${overdue(t) ? 'od' : 'mu'}">${overdue(t) ? 'Overdue · ' : 'Due '}${fmt(t.due)}</span>`;
const cats = () => [...new Set(tasks.map(t => t.category))].sort();
const cmp = { due: (a, b) => (a.due || '9').localeCompare(b.due || '9'), created: (a, b) => b.created.localeCompare(a.created), priority: (a, b) => PW[a.priority] - PW[b.priority] };
function filtered() {
  const q = ui.q.trim().toLowerCase();
  return tasks.filter(t => (!q || t.title.toLowerCase().includes(q)) && (!ui.fs || t.status === ui.fs) && (!ui.fp || t.priority === ui.fp) && (!ui.fc || t.category === ui.fc)).sort(cmp[ui.sort]);
}
const opts = (o, sel) => Object.entries(o).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v}</option>`).join('');
const empty = (h, p) => `<div class="empty">${ic('inbox')}<h3>${h}</h3><p>${p}</p></div>`;
function card(t, drag) {
  return `<article class="card ${t.status}" ${drag ? 'draggable="true"' : ''} data-id="${t.id}">
  <div class="tags"><span class="badge p-${t.priority}">${PL[t.priority]} priority</span><span class="badge">${SL[t.status]}</span></div>
  <h3>${esc(t.title)}</h3>${t.description ? `<p>${esc(t.description)}</p>` : ''}
  <div class="tags"><span class="badge">${esc(t.category)}</span>${dueLabel(t)}</div>
  <div class="acts"><select data-status="${t.id}" aria-label="Status for ${esc(t.title)}">${opts(SL, t.status)}</select>
  <button class="btn sm icon" data-act="edit" data-id="${t.id}" aria-label="Edit ${esc(t.title)}">${ic('edit')}</button>
  <button class="btn sm icon" data-act="del" data-id="${t.id}" aria-label="Delete ${esc(t.title)}">${ic('trash')}</button></div></article>`;
}
const open = t => `<button class="item" data-act="edit" data-id="${t.id}"><span>${esc(t.title)}<br><small>${esc(t.category)}</small></span>${dueLabel(t)}</button>`;

/* ---------- views ---------- */
const V = {
  overview() {
    const n = s => tasks.filter(t => t.status === s).length, td = today(), h = new Date().getHours();
    const focus = tasks.filter(t => t.due === td && t.status !== 'done');
    const up = tasks.filter(t => t.status !== 'done' && t.due > td).sort(cmp.due).slice(0, 5);
    const days = [...Array(7)].map((_, i) => { const d = plus(i - 6); return { d, n: tasks.filter(t => t.completedAt === d).length }; });
    const mx = Math.max(1, ...days.map(x => x.n));
    return `<div class="head"><div><h1>${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, Maya</h1><p>${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p></div></div>
    ${tasks.some(t => t.demo) ? `<div class="banner" role="note"><strong>Demo data:</strong> Maya Rivera and the sample tasks are fictional. Edit or delete them freely.</div>` : ''}
    <div class="grid stats"><div class="stat"><b>${tasks.length}</b><span>Total Tasks</span></div><div class="stat"><b>${n('progress')}</b><span>In Progress</span></div><div class="stat"><b>${n('done')}</b><span>Completed</span></div><div class="stat od"><b>${tasks.filter(overdue).length}</b><span>Overdue</span></div></div>
    <div class="grid two">
    <section class="panel"><h2>Today's Focus</h2><div class="list">${focus.map(open).join('') || empty('Nothing due today', 'Enjoy the space or add a task.')}</div></section>
    <section class="panel"><h2>Upcoming deadlines</h2><div class="list">${up.map(open).join('') || empty('No upcoming deadlines', 'Tasks with future due dates appear here.')}</div></section>
    <section class="panel"><h2>Completed this week</h2><div class="chart" role="img" aria-label="Tasks completed per day: ${days.map(x => fmt(x.d) + ' ' + x.n).join(', ')}">${days.map(x => `<div>${x.n}<i style="height:${x.n / mx * 100}px"></i>${parse(x.d).toLocaleDateString(undefined, { weekday: 'short' })}</div>`).join('')}</div></section>
    <section class="panel"><h2>Recent activity</h2><ul class="list">${activity.slice(0, 6).map(a => `<li class="item"><span>${esc(a.text)}</span><small>${new Date(a.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</small></li>`).join('') || `<li>${empty('No activity yet', 'Add, edit or complete a task to see it here.')}</li>`}</ul></section></div>`;
  },
  tasks() {
    return `<div class="head"><div><h1>My Tasks</h1><p>Search, filter and sort everything in one place.</p></div></div>
    <div class="tools" role="search"><input id="q" type="search" placeholder="Search by title" aria-label="Search tasks by title" value="${esc(ui.q)}">
    <select data-f="fs" aria-label="Filter by status"><option value="">All statuses</option>${opts(SL, ui.fs)}</select>
    <select data-f="fp" aria-label="Filter by priority"><option value="">All priorities</option>${opts(PL, ui.fp)}</select>
    <select data-f="fc" aria-label="Filter by category"><option value="">All categories</option>${cats().map(c => `<option${c === ui.fc ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <select data-f="sort" aria-label="Sort by"><option value="due"${ui.sort === 'due' ? ' selected' : ''}>Sort: Due date</option><option value="created"${ui.sort === 'created' ? ' selected' : ''}>Sort: Newest</option><option value="priority"${ui.sort === 'priority' ? ' selected' : ''}>Sort: Priority</option></select>
    <button class="btn" data-act="clear">Clear filters</button></div><div id="list" aria-live="polite">${V.list()}</div>`;
  },
  list() { const l = filtered(); return l.length ? `<div class="cards">${l.map(t => card(t)).join('')}</div>` : tasks.length ? empty('No matching tasks', 'Try a different search or clear your filters.') : empty('No tasks yet', 'Use Add task to create your first one.'); },
  board() {
    return `<div class="head"><div><h1>Board</h1><p>Drag cards between columns, or use the status menu on each card.</p></div></div><div class="board">${Object.keys(SL).map(s => {
      const l = tasks.filter(t => t.status === s).sort(cmp.due);
      return `<section class="col" data-col="${s}" aria-label="${SL[s]}"><h2>${SL[s]} <span class="badge">${l.length}</span></h2>${l.map(t => card(t, true)).join('') || '<p class="mu">No tasks here.</p>'}</section>`;
    }).join('')}</div>`;
  },
  calendar() {
    const y = ui.cal.getFullYear(), m = ui.cal.getMonth(), first = new Date(y, m, 1), len = new Date(y, m + 1, 0).getDate();
    const lead = (first.getDay() - set.week + 7) % 7, td = today(), cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="day out" aria-hidden="true"></div>');
    for (let d = 1; d <= len; d++) {
      const key = `${y}-${pad(m + 1)}-${pad(d)}`, l = tasks.filter(t => t.due === key);
      cells.push(`<div class="day${key === td ? ' today' : ''}"><b>${d}</b>${l.map(t => `<button class="ev ${t.status}" data-act="edit" data-id="${t.id}" title="${esc(t.title)} (${SL[t.status]})" aria-label="${esc(t.title)}, ${SL[t.status]}">${esc(t.title)}</button>`).join('')}</div>`);
    }
    const dows = [...Array(7)].map((_, i) => `<div class="dow">${new Date(2023, 0, 1 + ((i + set.week) % 7)).toLocaleDateString(undefined, { weekday: 'short' })}</div>`).join('');
    return `<div class="head"><div><h1>${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h1></div><div class="acts"><button class="btn icon" data-act="prev" aria-label="Previous month">${ic('left')}</button><button class="btn" data-act="now">Today</button><button class="btn icon" data-act="next" aria-label="Next month">${ic('right')}</button></div></div><div class="wrap"><div class="cal">${dows}${cells.join('')}</div></div>`;
  },
  completed() {
    const done = tasks.filter(t => t.status === 'done'), q = ui.cq.trim().toLowerCase(), l = done.filter(t => !q || t.title.toLowerCase().includes(q)).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    return `<div class="head"><div><h1>Completed</h1><p>${done.length} completed task${done.length === 1 ? '' : 's'}</p></div></div><div class="tools"><input id="cq" type="search" placeholder="Search completed tasks" aria-label="Search completed tasks" value="${esc(ui.cq)}"></div><div id="list">${V.clist()}</div>`;
  },
  clist() {
    const q = ui.cq.trim().toLowerCase(), l = tasks.filter(t => t.status === 'done' && (!q || t.title.toLowerCase().includes(q)));
    return l.length ? `<div class="cards">${l.map(t => `<article class="card done"><div class="tags"><span class="badge p-${t.priority}">${PL[t.priority]} priority</span><span class="badge">Completed ${fmt(t.completedAt)}</span></div><h3>${esc(t.title)}</h3><div class="acts"><button class="btn sm" data-act="restore" data-id="${t.id}" data-to="progress">Restore to In Progress</button><button class="btn sm" data-act="restore" data-id="${t.id}" data-to="todo">Restore to To Do</button></div></article>`).join('')}</div>` : empty(q ? 'No matches' : 'Nothing completed yet', q ? 'Try a different search.' : 'Completed tasks stay here until you restore or delete them.');
  },
  settings() {
    return `<div class="head"><div><h1>Settings</h1></div></div><div class="set panel">
    <div><label for="sTheme">Theme</label><select id="sTheme"><option value="light"${set.theme === 'light' ? ' selected' : ''}>Light</option><option value="dark"${set.theme === 'dark' ? ' selected' : ''}>Dark</option></select></div>
    <div><label for="sPri">Default priority for new tasks</label><select id="sPri">${opts(PL, set.priority)}</select></div>
    <div><label for="sWeek">First day of week</label><select id="sWeek"><option value="0"${set.week === 0 ? ' selected' : ''}>Sunday</option><option value="1"${set.week === 1 ? ' selected' : ''}>Monday</option></select></div>
    <div><h2>Demo data</h2><p class="mu" style="margin:6px 0 12px">Restoring replaces all current tasks with the fictional sample tasks.</p><button class="btn danger" data-act="reset">Restore demo data</button></div></div>`;
  }
};

/* ---------- render ---------- */
function render(focus) {
  document.documentElement.dataset.theme = set.theme;
  $('#nav').innerHTML = NAV.map(([k, l, i]) => `<li><button data-nav="${k}"${k === ui.view ? ' aria-current="page"' : ''}>${ic(i)}${l}</button></li>`).join('');
  $('#view').innerHTML = V[ui.view]();
  $('#cats').innerHTML = cats().map(c => `<option value="${esc(c)}">`).join('');
  document.querySelectorAll('[data-i]').forEach(e => e.innerHTML = ic(e.dataset.i));
  if (focus) $('#view').focus({ preventScroll: true });
}
function go(v) { ui.view = v; closeNav(); render(true); window.scrollTo(0, 0); }
const openNav = () => { $('#side').classList.add('open'); $('#scrim').classList.add('open'); };
const closeNav = () => { $('#side').classList.remove('open'); $('#scrim').classList.remove('open'); };

/* ---------- actions ---------- */
function setStatus(id, st) {
  const t = tasks.find(x => x.id === id); if (!t || t.status === st) return;
  t.status = st; t.completedAt = st === 'done' ? today() : null;
  log(`${st === 'done' ? 'Completed' : 'Moved to ' + SL[st]}: ${t.title}`); persist(); render();
}
function confirmDo(msg, fn) { $('#cMsg').textContent = msg; $('#cOk').onclick = () => { $('#confirmDlg').close(); fn(); }; $('#confirmDlg').showModal(); }
function openForm(id) {
  ui.editId = id || null; const t = tasks.find(x => x.id === id);
  $('#dlgTitle').textContent = t ? 'Edit task' : 'Add task';
  $('#fTitle').value = t ? t.title : ''; $('#fDesc').value = t ? t.description : ''; $('#fCat').value = t ? t.category : '';
  $('#fDue').value = t ? t.due : today(); $('#fPri').value = t ? t.priority : set.priority; $('#fSta').value = t ? t.status : 'todo';
  ['eTitle', 'eDue'].forEach(e => $('#' + e).textContent = ''); ['fTitle', 'fDue'].forEach(e => $('#' + e).removeAttribute('aria-invalid'));
  $('#taskDlg').showModal(); $('#fTitle').focus();
}
$('#taskForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = $('#fTitle').value.trim(), due = $('#fDue').value; let bad = false;
  const chk = (ok, field, err, msg) => { $('#' + err).textContent = ok ? '' : msg; ok ? $('#' + field).removeAttribute('aria-invalid') : $('#' + field).setAttribute('aria-invalid', 'true'); if (!ok) bad = true; };
  chk(!!title, 'fTitle', 'eTitle', 'Enter a title so you can find this task later.');
  chk(/^\d{4}-\d{2}-\d{2}$/.test(due), 'fDue', 'eDue', 'Choose a due date.');
  if (bad) return ($('#fTitle[aria-invalid]') || $('#fDue')).focus();
  const st = $('#fSta').value, data = { title, description: $('#fDesc').value.trim(), category: $('#fCat').value.trim() || 'General', priority: $('#fPri').value, status: st, due };
  const t = tasks.find(x => x.id === ui.editId);
  if (t) { if (t.status !== st) data.completedAt = st === 'done' ? today() : null; Object.assign(t, data); log(`Edited: ${title}`); }
  else { tasks.push({ id: uid(), created: today(), completedAt: st === 'done' ? today() : null, demo: false, ...data }); log(`Added: ${title}`); }
  persist(); $('#taskDlg').close(); render();
});

document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]'); if (nav) return go(nav.dataset.nav);
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.dataset.id, t = tasks.find(x => x.id === id);
  ({
    add: () => openForm(), edit: () => openForm(id), openNav, closeNav,
    closeDlg: () => $('#taskDlg').close(), closeConfirm: () => $('#confirmDlg').close(),
    del: () => confirmDo(`Delete "${t.title}"? This can't be undone.`, () => { tasks = tasks.filter(x => x.id !== id); log(`Deleted: ${t.title}`); persist(); render(); }),
    restore: () => setStatus(id, b.dataset.to),
    clear: () => { Object.assign(ui, { q: '', fs: '', fp: '', fc: '', sort: 'due' }); render(); },
    prev: () => { ui.cal.setMonth(ui.cal.getMonth() - 1); render(); }, next: () => { ui.cal.setMonth(ui.cal.getMonth() + 1); render(); },
    now: () => { ui.cal = new Date(); ui.cal.setDate(1); render(); },
    reset: () => confirmDo('This replaces all of your current tasks with the demo tasks. Continue?', () => { tasks = demoTasks(); activity = []; log('Restored demo data'); persist(); render(); })
  })[b.dataset.act]?.();
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { ui.q = e.target.value; $('#list').innerHTML = V.list(); }
  if (e.target.id === 'cq') { ui.cq = e.target.value; $('#list').innerHTML = V.clist(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.status) return setStatus(el.dataset.status, el.value);
  if (el.dataset.f) { ui[el.dataset.f] = el.value; return render(); }
  if (el.id === 'sTheme') set.theme = el.value; else if (el.id === 'sPri') set.priority = el.value; else if (el.id === 'sWeek') set.week = +el.value; else return;
  persist(); render();
});
/* drag and drop (desktop); the status <select> on each card is the accessible alternative */
document.addEventListener('dragstart', e => { const c = e.target.closest?.('.card[draggable]'); if (c) { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('drag'); } });
document.addEventListener('dragend', e => e.target.closest?.('.card')?.classList.remove('drag'));
document.addEventListener('dragover', e => { const c = e.target.closest?.('.col'); if (c) { e.preventDefault(); c.classList.add('over'); } });
document.addEventListener('dragleave', e => e.target.closest?.('.col')?.classList.remove('over'));
document.addEventListener('drop', e => { const c = e.target.closest?.('.col'); if (!c) return; e.preventDefault(); setStatus(e.dataTransfer.getData('text/plain'), c.dataset.col); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
render();
})();
