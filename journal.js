function addDailyJournal() {
  const root = document.querySelector('#view');
  if (!root || root.querySelector('#dailyJournal') || root.querySelector('h2')?.textContent !== 'Your daily rhythm') return;

  const date = new Date().toISOString().slice(0, 10);
  const entry = record(date);

  root.insertAdjacentHTML('beforeend', `
    <div class="grid journal-wrap" id="dailyJournal">
      <article class="card">
        <h3>Daily journal</h3>
        <p class="card-sub">A private place to notice what matters.</p>
        <div class="field">
          <label for="gratitudeEntry">Today, I am grateful for…</label>
          <textarea id="gratitudeEntry" rows="3" placeholder="Three small things…">${esc(entry.gratitude || '')}</textarea>
        </div>
        <div class="field">
          <label for="journalEntry">Journal entry</label>
          <textarea id="journalEntry" rows="7" placeholder="Write freely—how are you feeling, what did you learn, what do you need?">${esc(entry.journal || '')}</textarea>
        </div>
        <button class="save-button" id="saveJournalEntry">Save today's journal</button>
      </article>
    </div>
  `);

  const saveButton = document.querySelector('#saveJournalEntry');
  saveButton.onclick = () => {
    const current = record(date);
    current.gratitude = document.querySelector('#gratitudeEntry').value.trim();
    current.journal = document.querySelector('#journalEntry').value.trim();
    saveJournal();
    saveButton.textContent = '✓ Saved locally';
    setTimeout(() => {
      if (document.body.contains(saveButton)) saveButton.textContent = "Save today's journal";
    }, 1500);
  };
}

new MutationObserver(addDailyJournal).observe(document.querySelector('#view'), { childList: true });
addDailyJournal();
