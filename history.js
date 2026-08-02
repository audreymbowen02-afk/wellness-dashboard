const wellnessHistoryKey = 'golden-glow-wellness-history-v1';
const journalHistoryKey = 'golden-glow-journal-v1';

const readStore = (key) => JSON.parse(localStorage.getItem(key) || '{"days":{}}');
const writeStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const escapeHistory = (value) => String(value || '').replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));

function scoreHistoryRecord(entry) {
  const checks = Object.values(entry.checks || {}).filter(Boolean).length;
  const checkTotal = Object.keys(entry.checks || {}).length || 9;
  const moodScore = entry.mood ? (entry.mood === '😔' ? 1 : 8) : 0;
  return Math.min(100, Math.round(checks / checkTotal * 65 + Math.min(Number(entry.water) || 0, 8) / 8 * 15 + Math.min(Number(entry.sleep) || 0, 8) / 8 * 12 + moodScore));
}

function savedDates() {
  const wellnessDates = Object.keys(readStore(wellnessHistoryKey).days || {});
  const journalDates = Object.keys(readStore(journalHistoryKey).days || {});
  return [...new Set([...wellnessDates, ...journalDates])].sort().reverse();
}

function historyEditorMarkup(date) {
  const wellness = readStore(wellnessHistoryKey);
  const journals = readStore(journalHistoryKey);
  const entry = wellness.days?.[date] || { water: 0, sleep: 0, mood: '', checks: {} };
  const journalEntry = journals.days?.[date] || { water: 0, meals: {}, exercises: [] };
  const meals = journalEntry.meals || {};
  const exercises = journalEntry.exercises || [];
  const dates = savedDates();

  return `<div class="grid journal-wrap" id="historyEditor">
    <article class="card">
      <div class="section-head"><div><h3>History & corrections</h3><p>Review or edit a saved day.</p></div></div>
      <div class="journal-line">
        <label class="field"><span>Select date</span><input id="historyDate" type="date" value="${date}"></label>
        <label class="field"><span>Saved dates</span><select id="savedHistoryDate"><option value="">Choose a saved day</option>${dates.map(savedDate => `<option value="${savedDate}" ${savedDate === date ? 'selected' : ''}>${new Date(savedDate + 'T12:00:00').toLocaleDateString()}</option>`).join('')}</select></label>
      </div>
      <div class="meal-grid">
        <label class="field"><span>Water (glasses)</span><input id="historyWater" type="number" min="0" max="30" value="${Number(journalEntry.water ?? entry.water) || 0}"></label>
        <label class="field"><span>Sleep (hours)</span><input id="historySleep" type="number" min="0" max="16" step="0.5" value="${Number(entry.sleep) || 0}"></label>
        <label class="field"><span>Mood</span><select id="historyMood"><option value="">Not logged</option>${['😔','😕','😐','🙂','✨'].map(mood => `<option ${entry.mood === mood ? 'selected' : ''}>${mood}</option>`).join('')}</select></label>
        <label class="field"><span>Wellness score</span><input value="${Number(entry.score) || 0}%" disabled></label>
      </div>
      <div class="meal-grid">
        ${[['breakfast','Breakfast'],['lunch','Lunch'],['dinner','Dinner'],['snacks','Snacks']].map(([id,label]) => `<label class="field"><span>${label}</span><textarea data-history-meal="${id}" rows="2">${escapeHistory(meals[id])}</textarea></label>`).join('')}
      </div>
      <label class="field"><span>Gratitude</span><textarea id="historyGratitude" rows="3">${escapeHistory(journalEntry.gratitude)}</textarea></label>
      <label class="field"><span>Journal</span><textarea id="historyJournal" rows="5">${escapeHistory(journalEntry.journal)}</textarea></label>
      <div class="journal-line"><button class="save-button" id="saveHistoryDay">Save corrections</button><button class="pill" id="deleteHistoryDay">Delete this day</button></div>
    </article>
    <article class="card"><h3>Exercise entries</h3><p class="card-sub">Delete an incorrect activity, or add new activities from Fitness.</p><div id="historyExercises">${exercises.length ? exercises.map((exercise,index) => `<div class="metric"><div><strong>${escapeHistory(exercise.name)}</strong><small>${Number(exercise.minutes) || 0} minutes</small></div><button class="pill" data-delete-exercise="${index}">Delete</button></div>`).join('') : '<p class="card-sub">No exercise recorded for this date.</p>'}</div></article>
  </div>`;
}

function attachHistoryEditor(root, date) {
  const rerender = selectedDate => {
    root.querySelector('#historyEditor')?.remove();
    root.insertAdjacentHTML('beforeend', historyEditorMarkup(selectedDate));
    attachHistoryEditor(root, selectedDate);
  };

  root.querySelector('#historyDate').onchange = event => rerender(event.target.value);
  root.querySelector('#savedHistoryDate').onchange = event => { if (event.target.value) rerender(event.target.value); };
  root.querySelector('#saveHistoryDay').onclick = () => {
    const wellness = readStore(wellnessHistoryKey);
    const journals = readStore(journalHistoryKey);
    wellness.days = wellness.days || {};
    journals.days = journals.days || {};
    const entry = wellness.days[date] || { date, checks: {} };
    const journalEntry = journals.days[date] || { water: 0, meals: {}, exercises: [] };
    entry.water = Number(root.querySelector('#historyWater').value) || 0;
    entry.sleep = Number(root.querySelector('#historySleep').value) || 0;
    entry.mood = root.querySelector('#historyMood').value;
    entry.score = scoreHistoryRecord(entry);
    entry.updatedAt = new Date().toISOString();
    journalEntry.water = entry.water;
    journalEntry.meals = journalEntry.meals || {};
    root.querySelectorAll('[data-history-meal]').forEach(field => journalEntry.meals[field.dataset.historyMeal] = field.value.trim());
    journalEntry.gratitude = root.querySelector('#historyGratitude').value.trim();
    journalEntry.journal = root.querySelector('#historyJournal').value.trim();
    wellness.days[date] = entry;
    journals.days[date] = journalEntry;
    writeStore(wellnessHistoryKey, wellness);
    writeStore(journalHistoryKey, journals);
    if (date === new Date().toISOString().slice(0,10)) {
      const current = JSON.parse(localStorage.getItem('golden-glow-wellness-v1') || 'null');
      if (current) localStorage.setItem('golden-glow-wellness-v1', JSON.stringify({ ...current, water: entry.water, sleep: entry.sleep, mood: entry.mood }));
      location.reload();
      return;
    }
    rerender(date);
  };
  root.querySelector('#deleteHistoryDay').onclick = () => {
    if (!confirm(`Delete all saved information for ${date}?`)) return;
    const wellness = readStore(wellnessHistoryKey), journals = readStore(journalHistoryKey);
    delete wellness.days?.[date];
    delete journals.days?.[date];
    writeStore(wellnessHistoryKey, wellness);
    writeStore(journalHistoryKey, journals);
    if (date === new Date().toISOString().slice(0,10)) localStorage.removeItem('golden-glow-wellness-v1');
    rerender(new Date().toISOString().slice(0,10));
  };
  root.querySelectorAll('[data-delete-exercise]').forEach(button => button.onclick = () => {
    const journals = readStore(journalHistoryKey);
    journals.days[date].exercises.splice(Number(button.dataset.deleteExercise), 1);
    writeStore(journalHistoryKey, journals);
    rerender(date);
  });
}

function enhanceHistory() {
  const root = document.querySelector('#view');
  if (!root || root.querySelector('#historyEditor') || root.querySelector('h2')?.textContent !== 'Your wellness journey') return;
  const date = savedDates()[0] || new Date().toISOString().slice(0,10);
  root.insertAdjacentHTML('beforeend', historyEditorMarkup(date));
  attachHistoryEditor(root, date);
}

new MutationObserver(enhanceHistory).observe(document.querySelector('#view'), { childList: true });
enhanceHistory();
