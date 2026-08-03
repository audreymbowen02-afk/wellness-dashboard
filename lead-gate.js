(function () {
  const accessKey = 'golden-glow-lead-access-v2';
  const wellnessKey = 'golden-glow-wellness-v1';
  const gate = document.getElementById('leadGate');
  const form = document.getElementById('sib-form');
  const success = document.getElementById('success-message');
  const error = document.getElementById('error-message');
  const submitButton = form.querySelector('.lead-submit');

  function readAccess() {
    try { return JSON.parse(localStorage.getItem(accessKey) || 'null'); }
    catch { return null; }
  }

  function showApp() {
    document.body.classList.remove('lead-locked');
    document.body.classList.add('home-open');
    gate.hidden = true;
    document.getElementById('sidebar')?.classList.add('open', 'home-panel');
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
    window.setTimeout(() => location.reload(), 5000);
  }

  function responseSucceeded(payload) {
    return payload?.success === true || payload?.status === 'success';
  }

  function responseMessage(payload) {
    return payload?.message || payload?.error || 'Brevo did not confirm this registration. Please check the information and try again.';
  }

  if (readAccess()) {
    showApp();
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const captchaComplete = Boolean(window.grecaptcha?.getResponse?.());
    if (!captchaComplete) {
      const captchaError = document.querySelector('#sib-captcha + .entry__error');
      if (captchaError) {
        captchaError.textContent = "Please complete the ‘I'm not a robot’ check.";
        captchaError.style.display = 'block';
      }
      document.getElementById('sib-captcha')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    error.classList.remove('sib-form-message-panel--active');
    submitButton.disabled = true;
    submitButton.textContent = 'Unlocking…';

    try {
      const response = await fetch(`${form.action}?isAjax=1`, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => null);
      if (!responseSucceeded(payload)) throw new Error(responseMessage(payload));
      success.classList.add('sib-form-message-panel--active');
      saveLeadAccess();
    } catch (submissionError) {
      error.querySelector('.sib-form-message-panel__inner-text').textContent = submissionError.message || 'Your registration could not be completed. Please check your connection and try again.';
      error.classList.add('sib-form-message-panel--active');
      submitButton.disabled = false;
      submitButton.textContent = 'Unlock my Wellness App';
      window.grecaptcha?.reset?.();
    }
  });

})();
