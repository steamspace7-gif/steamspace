(function () {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('error');
  const submitBtn = form.querySelector('.submit-btn');
  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get('next') || '/apps';

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    errorEl.hidden = true;

    const password = form.password.value;
    if (!password) {
      showError('Please enter the staff password.');
      return;
    }

    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/staff-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        window.location.href = nextPath;
        return;
      }

      if (response.status === 503) {
        showError('Staff access is not configured yet. Please contact your site administrator.');
        return;
      }

      showError('Incorrect password. Please try again.');
    } catch {
      showError('Unable to sign in right now. Please try again.');
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
