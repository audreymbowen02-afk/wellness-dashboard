(function () {
  const accessKey = 'golden-glow-lead-access-v2';
  const pinKey = 'golden-glow-pin-v1';
  const unlockedKey = 'golden-glow-unlocked-v1';
  const feedbackEndpoint = 'https://formspree.io/f/xjgnngqk';
  const gate = document.getElementById('privacyGate');
  const modal = document.getElementById('appModal');

  const read = key => {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  };

  const bytesToHex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

  async function hashPin(pin, salt) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
    return bytesToHex(new Uint8Array(bits));
  }

  function showPin(mode) {
    const setup = mode === 'setup';
    gate.hidden = false;
    gate.innerHTML = `<div class="privacy-card">
      <img src="golden-glow-logo-clean.png" alt="Golden Glow Beauty Boutique logo">
      <h1>${setup ? 'Create your local PIN' : 'Welcome back'}</h1>
      <p>${setup ? 'Choose four digits to protect the wellness information saved in this browser.' : 'Enter your four-digit PIN to open your private wellness space.'}</p>
      <form id="pinForm">
        <label>PIN<input id="pinEntry" type="password" inputmode="numeric" autocomplete="${setup ? 'new-password' : 'current-password'}" pattern="[0-9]{4}" maxlength="4" required></label>
        ${setup ? '<label>Confirm PIN<input id="pinConfirm" type="password" inputmode="numeric" autocomplete="new-password" pattern="[0-9]{4}" maxlength="4" required></label>' : ''}
        <p class="privacy-error" id="pinError" role="alert"></p>
        <button class="lead-submit" type="submit">${setup ? 'Save PIN and continue' : 'Unlock App'}</button>
      </form>
      ${setup ? '<small>Your PIN stays on this device and is not sent to Golden Glow.</small>' : '<button class="text-button" id="forgotPinButton" type="button">Forgot PIN? Remove app from this device</button>'}
    </div>`;
    document.getElementById('pinForm').onsubmit = async event => {
      event.preventDefault();
      const pin = document.getElementById('pinEntry').value;
      const pinError = document.getElementById('pinError');
      if (!/^\d{4}$/.test(pin)) {
        pinError.textContent = 'Enter exactly four numbers.';
        return;
      }
      if (setup) {
        if (pin !== document.getElementById('pinConfirm').value) {
          pinError.textContent = 'The two PIN entries do not match.';
          return;
        }
        const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        localStorage.setItem(pinKey, JSON.stringify({ salt, hash: await hashPin(pin, salt) }));
      } else {
        const saved = read(pinKey);
        if (!saved || await hashPin(pin, saved.salt) !== saved.hash) {
          pinError.textContent = 'That PIN is not correct. Please try again.';
          document.getElementById('pinEntry').value = '';
          return;
        }
      }
      sessionStorage.setItem(unlockedKey, '1');
      gate.hidden = true;
      gate.innerHTML = '';
    };
    document.getElementById('forgotPinButton')?.addEventListener('click', removeDevice);
    document.getElementById('pinEntry').focus();
  }

  function openModal(title, body) {
    modal.hidden = false;
    modal.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><h2 id="modalTitle">${title}</h2>${body}</div>`;
  }

  function closeModal() {
    modal.hidden = true;
    modal.innerHTML = '';
  }

  function removeDevice() {
    if (!confirm('Remove this app and all wellness information saved in this browser? This cannot be undone.')) return;
    Object.keys(localStorage).filter(key => key.startsWith('golden-glow-')).forEach(key => localStorage.removeItem(key));
    sessionStorage.removeItem(unlockedKey);
    location.reload();
  }

  window.openPersonalize = () => {
    const access = read(accessKey) || {};
    const wellness = read('golden-glow-wellness-v1') || {};
    const currentName = wellness.name || access.name || 'Friend';
    openModal('Personalize your app', `<form id="personalizeForm"><label>Name<input id="personalizeName" maxlength="80" value="${currentName.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}" required></label><div class="modal-actions"><button class="text-button" id="cancelPersonalize" type="button">Cancel</button><button class="lead-submit" type="submit">Save name</button></div></form>`);
    document.getElementById('cancelPersonalize').onclick = closeModal;
    document.getElementById('personalizeForm').onsubmit = event => {
      event.preventDefault();
      const name = document.getElementById('personalizeName').value.trim() || 'Friend';
      if (access.email) localStorage.setItem(accessKey, JSON.stringify({ ...access, name }));
      const current = read('golden-glow-wellness-v1');
      if (current) localStorage.setItem('golden-glow-wellness-v1', JSON.stringify({ ...current, name }));
      window.setWellnessName?.(name);
      closeModal();
    };
  };

  window.lockWellnessApp = () => {
    sessionStorage.removeItem(unlockedKey);
    document.getElementById('sidebar')?.classList.add('open', 'home-panel');
    document.body.classList.add('home-open');
    showPin('unlock');
  };

  window.clearWellnessHistory = () => {
    if (!confirm('Clear all wellness entries and history from this browser? Your name, lead access and PIN will be kept.')) return;
    ['golden-glow-wellness-v1', 'golden-glow-wellness-history-v1', 'golden-glow-journal-v1'].forEach(key => localStorage.removeItem(key));
    location.reload();
  };

  window.removeWellnessDevice = removeDevice;

  window.openFeedback = () => {
    const access = read(accessKey) || {};
    openModal('Send feedback', `<p>Your feedback helps improve Golden Glow. No wellness entries are included.</p><form id="feedbackForm"><label>Overall rating<select name="rating" required><option value="">Choose 1–5</option><option>5 - Excellent</option><option>4 - Good</option><option>3 - Fair</option><option>2 - Difficult</option><option>1 - Poor</option></select></label><label>Feedback type<select name="feedback_type" required><option value="">Choose one</option><option>What is working well</option><option>Problem or bug</option><option>Suggested improvement</option><option>Other</option></select></label><label>Your feedback<textarea name="message" rows="5" required></textarea></label><label>Email for a reply (optional)<input name="email" type="email" value="${String(access.email || '').replace(/[&<>"]/g, '')}"></label><p class="privacy-error" id="feedbackError" role="alert"></p><div class="modal-actions"><button class="text-button" id="cancelFeedback" type="button">Cancel</button><button class="lead-submit" id="sendFeedback" type="submit">Send feedback</button></div></form>`);
    document.getElementById('cancelFeedback').onclick = closeModal;
    document.getElementById('feedbackForm').onsubmit = async event => {
      event.preventDefault();
      const button = document.getElementById('sendFeedback');
      button.disabled = true;
      button.textContent = 'Sending…';
      try {
        const response = await fetch(feedbackEndpoint, { method: 'POST', body: new FormData(event.target), headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Feedback could not be sent. Please try again.');
        openModal('Thank you', '<p>Your feedback was sent successfully.</p><button class="lead-submit" id="closeThanks" type="button">Return to app</button>');
        document.getElementById('closeThanks').onclick = closeModal;
      } catch (error) {
        document.getElementById('feedbackError').textContent = error.message;
        button.disabled = false;
        button.textContent = 'Send feedback';
      }
    };
  };

  const access = read(accessKey);
  if (!access) return;
  if (!read(pinKey)) showPin('setup');
  else if (sessionStorage.getItem(unlockedKey) !== '1') showPin('unlock');
})();
