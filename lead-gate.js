(function () {
  const accessKey = 'golden-glow-lead-access-v1';
  const wellnessKey = 'golden-glow-wellness-v1';
  const gate = document.getElementById('leadGate');
  const form = document.getElementById('sib-form');
  const success = document.getElementById('success-message');

  function readAccess() {
    try { return JSON.parse(localStorage.getItem(accessKey) || 'null'); }
    catch { return null; }
  }

  function showApp() {
    document.body.classList.remove('lead-locked');
    gate.hidden = true;
  }

  function saveLeadAccess() {
    const name = form.elements.FIRSTNAME.value.trim();
    const email = form.elements.EMAIL.value.trim();
    if (!name || !email) return;
    localStorage.setItem(accessKey, JSON.stringify({ name, email, capturedAt: new Date().toISOString() }));
    try {
      const wellness = JSON.parse(localStorage.getItem(wellnessKey) || 'null');
      if (wellness) localStorage.setItem(wellnessKey, JSON.stringify({ ...wellness, name }));
    } catch {}
    window.setTimeout(() => location.reload(), 900);
  }

  if (readAccess()) {
    showApp();
    return;
  }

  form.addEventListener('submit', (event) => {
    const captchaComplete = Boolean(window.grecaptcha?.getResponse?.());
    if (captchaComplete) return;
    event.preventDefault();
    window.setTimeout(() => {
      const captchaError = document.querySelector('#sib-captcha + .entry__error');
      if (captchaError) {
        captchaError.textContent = "Please complete the ‘I'm not a robot’ check.";
        captchaError.style.display = 'block';
      }
    });
    document.getElementById('sib-captcha')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, true);

  new MutationObserver(() => {
    if (success.classList.contains('sib-form-message-panel--active') || getComputedStyle(success).display !== 'none') saveLeadAccess();
  }).observe(success, { attributes: true, childList: true, subtree: true });
})();
