// Simple to-do & routines manager with localStorage persistence
const TASKS_KEY = 'td_tasks_v1';
const ROUTINES_KEY = 'td_routines_v1';
const USER_KEY = 'td_user_v1';

let tasks = [];
let routines = [];

function save() {
	localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
	localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
}

function load() {
	try {
		tasks = JSON.parse(localStorage.getItem(TASKS_KEY)) || [];
	} catch(e) { tasks = []; }
	try {
		routines = JSON.parse(localStorage.getItem(ROUTINES_KEY)) || [];
	} catch(e) { routines = []; }
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function renderTasks() {
	const container = document.getElementById('tasks-list');
	container.innerHTML = '';
	const visible = tasksFilter ? tasks.filter(x => (x.tag||'').toLowerCase() === tasksFilter) : tasks;
	if (!visible.length) {
		const msg = tasksFilter ? 'No tasks match the filter — clear filter to see all.' : 'No tasks yet — add one with the "Add Task" button.';
		container.innerHTML = '<div class="opacity-60 text-center py-sm">' + msg + '</div>';
		return;
	}

	visible.forEach(t => {
		const label = document.createElement('label');
		label.className = 'group flex items-center gap-sm bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md cursor-pointer bento-card';
		label.innerHTML = `
			<input ${t.done? 'checked':''} class="hidden custom-checkbox" type="checkbox" data-id="${t.id}" />
			<div class="checkbox-face w-6 h-6 border-2 border-outline-variant rounded-md flex items-center justify-center transition-all group-active:scale-90">
				<span class="material-symbols-outlined text-white text-sm ${t.done? 'opacity-100 scale-100':'opacity-0 scale-50'} check-icon">check</span>
			</div>
			<div class="flex-grow">
				<span class="text-body-md font-medium text-on-surface block ${t.done? 'line-through opacity-60':''}">${escapeHtml(t.title)}</span>
				<span class="inline-block px-2 py-0.5 bg-surface-container rounded-md text-[10px] font-bold uppercase text-on-surface-variant">${escapeHtml(t.tag||'General')}</span>
			</div>
			<button class="material-symbols-outlined text-outline-variant group-hover:text-primary" data-action="more" data-id="${t.id}">more_vert</button>
		`;

		// checkbox handler
		const input = label.querySelector('input.custom-checkbox');
		input.addEventListener('change', (e) => {
			toggleTask(t.id);
		});

		// more button -> delete
		label.querySelector('button[data-action="more"]').addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (confirm('Delete task "' + t.title + '"?')) {
				deleteTask(t.id);
			}
		});

		container.appendChild(label);
	});
}

function renderRoutines() {
	const listContainer = document.getElementById('routines-list');
	const gridContainer = document.getElementById('routines-grid');
	if (listContainer) listContainer.innerHTML = '';
	if (gridContainer) gridContainer.innerHTML = '';

	if (!routines.length) {
		if (listContainer) listContainer.innerHTML = '<div class="opacity-60 text-center py-sm">No routines yet — add one above.</div>';
		if (gridContainer) gridContainer.innerHTML = '<div class="opacity-60 text-center py-sm">No routines yet — add one.</div>';
		return;
	}

	routines.forEach(r => {
		const card = document.createElement('div');
		card.className = 'routine-card bg-surface-container-lowest p-md rounded-xl border-l-primary flex flex-col justify-between transition-all duration-300';
		card.innerHTML = `
			<div class="flex justify-between items-start mb-sm">
				<div class="flex flex-col">
					<div class="flex items-center gap-xs text-primary mb-xs">
						<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">menu_book</span>
						<span class="font-label-sm uppercase">${escapeHtml(r.tag||'Routine')}</span>
					</div>
					<h3 class="font-headline-md text-on-surface">${escapeHtml(r.title)}</h3>
					<p class="font-label-md text-on-surface-variant flex items-center gap-xs">
						<span class="material-symbols-outlined text-sm">schedule</span>
						${escapeHtml(r.time||'—')}
					</p>
				</div>
				<label class="relative inline-flex items-center cursor-pointer">
					<input ${r.active? 'checked':''} class="sr-only peer" type="checkbox" data-id="${r.id}" />
					<div class="w-12 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary-container"></div>
				</label>
			</div>
			<div class="flex flex-wrap gap-xs mt-sm">
				<span class="bg-surface-container text-on-surface-variant px-xs py-1 rounded text-[10px] font-bold uppercase">${escapeHtml(r.schedule||'Once')}</span>
				<button class="text-xs text-outline-variant" data-action="del-routine" data-id="${r.id}">Delete</button>
			</div>
		`;

		// add handlers
		const checkbox = card.querySelector('input[type="checkbox"][data-id]');
		checkbox.addEventListener('change', () => {
			toggleRoutine(r.id);
		});
		card.querySelector('button[data-action="del-routine"]').addEventListener('click', () => {
			if (confirm('Delete routine "' + r.title + '"?')) deleteRoutine(r.id);
		});

		if (listContainer) listContainer.appendChild(card.cloneNode(true));
		if (gridContainer) gridContainer.appendChild(card);
	});

	updateDashboardStats();
}

function toggleTask(id) {
	const t = tasks.find(x => x.id === id);
	if (!t) return;
	t.done = !t.done;
	if (t.done) {
		t.completedAt = new Date().toISOString();
	} else {
		delete t.completedAt;
	}
	saveAndRefresh();
}

function updateDashboardStats() {
	// focus: saved or first active routine
	const focusEl = document.getElementById('focus-title');
	const savedFocus = localStorage.getItem('td_focus_v1');
	let focusText = savedFocus || (routines.find(r=>r.active) || {}).title || 'No focus set';
	if (focusEl) {
		focusEl.textContent = focusText;
		focusEl.style.cursor = 'pointer';
		focusEl.addEventListener('click', () => {
			const v = prompt('Set today\'s focus:', focusEl.textContent) || focusEl.textContent;
			focusEl.textContent = v;
			localStorage.setItem('td_focus_v1', v);
		});
	}

	// progress percent = completed tasks / total
	const percentEl = document.getElementById('focus-percent');
	const progressBar = document.getElementById('progress-bar');
	const doneCount = tasks.filter(t=>t.done).length;
	const totalCount = tasks.length;
	const goalRaw = localStorage.getItem(GOAL_KEY);
	const goal = goalRaw ? Number(goalRaw) : 0;
	let percent = 0;
	if (goal && goal > 0) {
		percent = Math.round((doneCount / goal) * 100);
		if (percent > 100) percent = 100;
		if (percentEl) percentEl.textContent = percent + '% (' + doneCount + '/' + goal + ')';
		if (progressBar) progressBar.style.width = percent + '%';
	} else {
		percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
		if (percentEl) percentEl.textContent = percent + '% (' + doneCount + '/' + totalCount + ')';
		if (progressBar) progressBar.style.width = percent + '%';
	}

	// quick stats
	const quickDone = document.getElementById('quick-done');
	const quickFocused = document.getElementById('quick-focused');
	if (quickDone) quickDone.textContent = tasks.filter(t=>t.done).length;
	if (quickFocused) quickFocused.textContent = routines.filter(r=>r.active).length;
}

function deleteTask(id) {
	tasks = tasks.filter(t => t.id !== id);
	save();
	renderTasks();
}

function saveAndRefresh() {
	save();
	renderTasks();
	renderRoutines();
	checkCelebration();
	updateDashboardStats();
	// if user is viewing weekly/progress, refresh those views live
	const weeklyView = document.getElementById('view-weekly');
	const progressView = document.getElementById('view-progress');
	if (weeklyView && !weeklyView.classList.contains('hidden')) renderWeekly();
	if (progressView && !progressView.classList.contains('hidden')) renderProgress();
}

const IMPORTANT_KEY = 'td_important_v1';
let importantTimeoutId = null;

function clearImportantNotification() {
	if (importantTimeoutId) {
		clearTimeout(importantTimeoutId);
		importantTimeoutId = null;
	}
}

function parseDueDate(input) {
	if (!input) return null;
	// try direct parse
	let d = new Date(input);
	if (!isNaN(d)) return d;
	// try date-only format
	d = new Date(input + 'T23:59:00');
	if (!isNaN(d)) return d;
	return null;
}

function showNotification(title, body) {
	if ('Notification' in window) {
		if (Notification.permission === 'granted') {
			new Notification(title, { body });
		} else if (Notification.permission !== 'denied') {
			Notification.requestPermission().then(p => {
				if (p === 'granted') new Notification(title, { body });
				else alert(title + '\n' + body);
			});
		} else {
			alert(title + '\n' + body);
		}
	} else {
		alert(title + '\n' + body);
	}
}

function scheduleImportantNotification(obj) {
	clearImportantNotification();
	if (!obj || !obj.dueIso) return;
	const due = new Date(obj.dueIso);
	if (isNaN(due)) return;
	const notifyAt = new Date(due.getTime() - 24*60*60*1000);
	const now = new Date();
	const title = 'Upcoming deadline: ' + (obj.title || 'Important');
	const body = (obj.due || new Date(obj.dueIso).toLocaleString()) + ' • ' + (obj.tag || '');
	if (notifyAt <= now && due > now) {
		// If notification time has passed but deadline still in future, notify now
		showNotification(title, 'Due: ' + body + '\n(Deadline within 24 hours)');
		return;
	}
	const delay = notifyAt - now;
	// protect against extremely large timeout values
	if (delay > 0 && delay < 2147483647) {
		importantTimeoutId = setTimeout(() => {
			showNotification(title, 'Due: ' + body + '\n(Deadline tomorrow)');
			importantTimeoutId = null;
		}, delay);
	}
}

const GOAL_KEY = 'td_goal_v1';

function setDailyGoalPrompt() {
	const raw = localStorage.getItem(GOAL_KEY) || '';
	const cur = raw ? Number(raw) : 0;
	const v = prompt('Set daily goal (number of tasks to complete). Leave empty to clear:', cur || '');
	if (v === null) return; // cancelled
	const n = v.toString().trim();
	if (!n) {
		localStorage.removeItem(GOAL_KEY);
		updateDashboardStats();
		return;
	}
	const num = Number(n);
	if (!Number.isFinite(num) || num <= 0) {
		alert('Please enter a positive number for the goal.');
		return;
	}
	localStorage.setItem(GOAL_KEY, String(Math.floor(num)));
	updateDashboardStats();
}

function setFocusText(text) {
	if (!text) return;
	localStorage.setItem('td_focus_v1', String(text));
	updateDashboardStats();
}

function renderImportant() {
	const container = document.getElementById('important-today');
	if (!container) return;
	const raw = localStorage.getItem(IMPORTANT_KEY);
	if (!raw) {
		container.innerHTML = '<div class="bg-surface-container-lowest border border-outline-variant/20 rounded-lg p-md opacity-60">No important item set. Click "Set Important" to add one.</div>';
		clearImportantNotification();
		return;
	}
	let obj;
	try { obj = JSON.parse(raw); } catch(e) { obj = null; }
	if (!obj) {
		container.innerHTML = '<div class="text-error">Invalid important item.</div>';
		return;
	}
	// derive display due and schedule info
	let dueDisplay = obj.due || '';
	if (obj.dueIso) {
		try { dueDisplay = new Date(obj.dueIso).toLocaleString(); } catch(e) {}
	}
	// schedule notification
	scheduleImportantNotification(obj);
	container.innerHTML = `
		<div class="bg-error-container/20 border-l-4 border-error rounded-r-xl p-md flex justify-between items-center bento-card">
			<div>
				<h4 class="text-body-lg font-bold text-on-surface">${escapeHtml(obj.title || 'Untitled')}</h4>
				<p class="text-label-sm text-on-surface-variant">${escapeHtml(dueDisplay || '')} • ${escapeHtml(obj.tag || '')}</p>
				<p class="text-label-xs text-on-surface-variant mt-xs">Notification: ${obj.dueIso ? new Date(new Date(obj.dueIso).getTime() - 24*60*60*1000).toLocaleString() : 'Not scheduled'}</p>
			</div>
			<div class="flex items-center gap-xs">
				<div class="bg-error-container text-on-error-container px-sm py-xs rounded-full text-label-sm font-label-sm">${escapeHtml(obj.level || 'Urgent')}</div>
				<button onclick="editImportant()" class="material-symbols-outlined text-outline-variant">edit</button>
				<button onclick="deleteImportant()" class="material-symbols-outlined text-outline-variant">delete</button>
			</div>
		</div>
	`;
}

function setImportantPrompt() {
	const raw = localStorage.getItem(IMPORTANT_KEY);
	let obj = raw ? JSON.parse(raw) : {};
	const title = prompt('Important title:', obj.title || '');
	if (title === null) return; // cancelled
	const dueInput = prompt('Due (YYYY-MM-DD or YYYY-MM-DD HH:MM). Leave empty for none:', obj.dueIso ? new Date(obj.dueIso).toLocaleString() : (obj.due || '')) || '';
	// parse
	let dueIso = null;
	if (dueInput.trim()) {
		const parsed = parseDueDate(dueInput.trim());
		if (parsed) dueIso = parsed.toISOString();
		else {
			alert('Could not parse due date. Please use YYYY-MM-DD or YYYY-MM-DD HH:MM formats.');
		}
	}
	const due = dueIso ? new Date(dueIso).toLocaleString() : (obj.due || '');
	const tag = prompt('Category (optional):', obj.tag || '') || '';
	const level = prompt('Level (Urgent/High/Normal):', obj.level || 'Urgent') || 'Urgent';
	const newObj = { title: title.trim(), due: due.trim(), dueIso: dueIso, tag: tag.trim(), level: level.trim() };
	localStorage.setItem(IMPORTANT_KEY, JSON.stringify(newObj));
	renderImportant();
}

function editImportant() { setImportantPrompt(); }

function deleteImportant() {
	if (!confirm('Remove important item?')) return;
	localStorage.removeItem(IMPORTANT_KEY);
	clearImportantNotification();
	renderImportant();
}

function toggleRoutine(id) {
	const r = routines.find(x => x.id === id);
	if (!r) return;
	r.active = !r.active;
	saveAndRefresh();
}

function deleteRoutine(id) {
	routines = routines.filter(r => r.id !== id);
	saveAndRefresh();
}

function addTaskPrompt() {
	const title = prompt('Task title:');
	if (!title) return;
	const tag = prompt('Tag or category (optional):') || 'General';
	const t = { id: uid(), title: title.trim(), tag: tag.trim(), done: false };
	tasks.unshift(t);
	saveAndRefresh();
}

function addRoutinePrompt() {
	const title = prompt('Routine title:');
	if (!title) return;
	const time = prompt('Time or schedule (optional):') || '';
	const tag = prompt('Tag (optional):') || 'Routine';
	const r = { id: uid(), title: title.trim(), time: time.trim(), tag: tag.trim(), active: true };
	routines.unshift(r);
	saveAndRefresh();
}

function checkCelebration() {
	const celebCard = document.getElementById('celebration-card');
	if (!celebCard) return;
	const allDone = tasks.length > 0 && tasks.every(t => t.done);
	if (allDone) {
		celebCard.classList.remove('hidden');
	} else {
		celebCard.classList.add('hidden');
	}
}

function switchView(viewName) {
	const dailyView = document.getElementById('view-daily');
	const routinesView = document.getElementById('view-routines');
	const weeklyView = document.getElementById('view-weekly');
	const progressView = document.getElementById('view-progress');
	const navDaily = document.getElementById('nav-daily');
	const navRoutines = document.getElementById('nav-routines');
	const navWeekly = document.getElementById('nav-weekly');
	const navProgress = document.getElementById('nav-progress');

	// hide all first
	[dailyView, routinesView, weeklyView, progressView].forEach(v => v && v.classList.add('hidden'));
	// reset nav styles
	if (navDaily) navDaily.className = "flex flex-col items-center justify-center text-on-surface-variant p-2 hover:bg-surface-container-high transition-colors rounded-xl active:scale-95 duration-200";
	if (navRoutines) navRoutines.className = "flex flex-col items-center justify-center text-on-surface-variant p-2 hover:bg-surface-container-high transition-colors rounded-xl active:scale-95 duration-200";
	if (navWeekly) navWeekly.className = "flex flex-col items-center justify-center text-on-surface-variant p-2 hover:bg-surface-container-high transition-colors rounded-xl active:scale-95 duration-200";
	if (navProgress) navProgress.className = "flex flex-col items-center justify-center text-on-surface-variant p-2 hover:bg-surface-container-high transition-colors rounded-xl active:scale-95 duration-200";

	if(viewName === 'daily') {
		dailyView && dailyView.classList.remove('hidden');
		if (navDaily) navDaily.className = "flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-sm py-xs hover:opacity-80 transition-all active:scale-95 duration-200";
	} else if(viewName === 'routines') {
		routinesView && routinesView.classList.remove('hidden');
		if (navRoutines) navRoutines.className = "flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-sm py-xs hover:opacity-80 transition-all active:scale-95 duration-200";
	} else if (viewName === 'weekly') {
		weeklyView && weeklyView.classList.remove('hidden');
		if (navWeekly) navWeekly.className = "flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-sm py-xs hover:opacity-80 transition-all active:scale-95 duration-200";
		renderWeekly();
	} else if (viewName === 'progress') {
		progressView && progressView.classList.remove('hidden');
		if (navProgress) navProgress.className = "flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-sm py-xs hover:opacity-80 transition-all active:scale-95 duration-200";
		renderProgress();
	}
}

function toggleCelebration() {
	const sections = document.querySelectorAll('#view-daily > section:not(#celebration-card)');
	const celebCard = document.getElementById('celebration-card');
	if (!celebCard) return;
	if (celebCard.classList.contains('hidden')) {
			sections.forEach(s => s.classList.add('hidden'));
			celebCard.classList.remove('hidden');
	} else {
			sections.forEach(s => s.classList.remove('hidden'));
			celebCard.classList.add('hidden');
	}
}

function escapeHtml(s){
	return String(s || '').replace(/[&<>"']/g, function(c){
		return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];
	});
}
const AVATAR_KEY = 'td_avatar_v1';
let tasksFilter = null; // null = no filter, string = tag to filter by

function filterTasksPrompt() {
	const tag = prompt('Filter tasks by tag (case-insensitive). Leave empty to clear filter:');
	if (tag === null) return; // cancelled
	const t = (tag || '').trim();
	tasksFilter = t ? t.toLowerCase() : null;
	renderTasks();
}

function showPlaceholder(name) {
	// kept for backward compatibility; route to switchView where possible
	if (name.toLowerCase() === 'weekly') return switchView('weekly');
	if (name.toLowerCase() === 'progress') return switchView('progress');
	alert(name + ' view is not implemented in this demo.');
}

function celebrationAction(action) {
	if (action === 'movie') {
		alert('Open a streaming app to watch a movie.');
	} else if (action === 'podcast') {
		alert('Open your podcast app.');
	} else if (action === 'walk') {
		alert('Nice! Go outside and enjoy the walk.');
	}
}

function renderWeekly() {
	const container = document.getElementById('weekly-content');
	if (!container) return;
	// compute last 7 days (labels and counts)
	const days = [];
	const now = new Date();
	for (let i = 6; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
		days.push(d);
	}
	const counts = days.map(day => {
		const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
		const end = new Date(start.getTime() + 24*60*60*1000);
		return tasks.filter(t => t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) < end).length;
	});

	// use daily goal to determine fill ratio if available; otherwise fallback to relative scale
	const goalRaw = localStorage.getItem(GOAL_KEY);
	const goal = goalRaw ? Number(goalRaw) : 0;
	const max = Math.max(1, ...counts);

	// build chart HTML using a track + fill so bars represent completion ratio
	let html = '<div class="weekly-chart items-end py-md">';
	days.forEach((d, idx) => {
		const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
		const completed = counts[idx];
		let fillPercent = 0;
		if (goal && goal > 0) fillPercent = Math.min(100, Math.round((completed / goal) * 100));
		else fillPercent = Math.round((completed / Math.max(1, max)) * 100);

		html += `
			<div class="weekly-column">
				<div class="weekly-track" title="${escapeHtml(dayLabel)}: ${completed} completed">
					<div class="weekly-fill" style="height: ${fillPercent}%;"></div>
				</div>
				<div class="text-label-sm mt-xs">${escapeHtml(dayLabel)}</div>
				<div class="text-xs text-on-surface-variant mt-1">${completed}${goal? (' / ' + goal): ''}</div>
			</div>`;
	});
	html += '</div>';

	// show active routines below
	const active = routines.filter(r=>r.active);
	html += '<div class="mt-md"><h3 class="text-label-md">Active Routines</h3>';
	if (!active.length) html += '<div class="opacity-60">No active routines.</div>';
	else {
		html += '<ul class="list-disc pl-6">';
		active.forEach(r => html += `<li>${escapeHtml(r.title)} — ${escapeHtml(r.time||'')}</li>`);
		html += '</ul>';
	}
	html += '</div>';

	container.innerHTML = html;
}

function renderProgress() {
	const container = document.getElementById('progress-content');
	if (!container) return;
	const total = tasks.length;
	const done = tasks.filter(t=>t.done).length;
	const percent = total ? Math.round(done/total*100) : 0;
	container.innerHTML = `
		<div class="space-y-sm">
			<div class="flex items-center justify-between">
				<div>Total tasks</div>
				<div>${total}</div>
			</div>
			<div class="flex items-center justify-between">
				<div>Completed</div>
				<div>${done}</div>
			</div>
			<div class="mt-sm">
				<div class="h-3 w-full bg-surface-container rounded-full overflow-hidden">
					<div class="h-full bg-primary rounded-full" style="width: ${percent}%"></div>
				</div>
				<div class="text-right text-label-sm mt-xs">${percent}%</div>
			</div>
		</div>
	`;
}

function init() {
	load();
	// populate user name
	const userName = localStorage.getItem(USER_KEY) || 'Guest';
	const nameEl = document.getElementById('user-name');
	if (nameEl) {
		nameEl.textContent = userName;
		nameEl.style.cursor = 'pointer';
		nameEl.addEventListener('click', () => {
			const newName = prompt('Your name:', nameEl.textContent) || nameEl.textContent;
			nameEl.textContent = newName;
			localStorage.setItem(USER_KEY, newName);
		});
	}

	// avatar
	const avatarEl = document.getElementById('user-avatar');
	if (avatarEl) {
		const avatarUrl = localStorage.getItem(AVATAR_KEY) || '';
		if (avatarUrl) avatarEl.src = avatarUrl;
		avatarEl.style.cursor = 'pointer';
		avatarEl.addEventListener('click', () => {
			const url = prompt('Avatar image URL (leave empty to remove):', avatarEl.src || '');
			if (url === null) return;
			const v = url.trim();
			if (v) {
				avatarEl.src = v;
				localStorage.setItem(AVATAR_KEY, v);
			} else {
				avatarEl.src = '';
				localStorage.removeItem(AVATAR_KEY);
			}
		});
	}

	renderTasks();
	renderRoutines();
	checkCelebration();
	updateDashboardStats();
	renderImportant();
	// set today's focus as requested
	setFocusText('sing a song');
}

document.addEventListener('DOMContentLoaded', init);
