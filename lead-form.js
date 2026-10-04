const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxHJ5cBxfglE4XvqopRjLvHXcDP4QlV_4OHcJDVk5P_laJjmreOdAgelso7CeXAEpYq/exec";
const WA_NUMBER = "917304256203"; // country code ke saath, bina +

(() => {
  const fieldNames = [
    'studentName', 'parentName', 'email', 'mobile', 'whatsapp', 'className',
    'course', 'targetYear', 'currentCoaching', 'subject', 'city', 'language',
    'message', 'website'
  ];
  const requiredMessages = {
    studentName: 'Student ka naam likhiye.',
    parentName: 'Parent ka naam likhiye.',
    mobile: 'Mobile number likhiye.',
    className: 'Class select kijiye.',
    course: 'Course select kijiye.',
    city: 'City likhiye.'
  };
  const labels = [
    ['studentName', '👤 Student'],
    ['parentName', '👨‍👩‍👦 Parent'],
    ['mobile', '📱 Mobile'],
    ['whatsapp', '💬 WhatsApp'],
    ['className', '🎓 Class'],
    ['course', '📚 Course'],
    ['targetYear', '🎯 Target Year'],
    ['currentCoaching', '🏫 Current Coaching'],
    ['subject', '📖 Preferred Subject'],
    ['city', '📍 City'],
    ['language', '🗣️ Language'],
    ['message', '📝 Message']
  ];

  const valueOf = (form, name) => form.querySelector(`[name="${name}"]`)?.value.trim() || '';
  const statusFor = form => form.querySelector('.form-status');
  const setStatus = (form, message, isError = false) => {
    const status = statusFor(form);
    if (!status) return;
    status.style.display = 'block';
    status.classList.toggle('error', isError);
    status.textContent = message;
  };
  const clearErrors = form => {
    form.querySelectorAll('.field-error').forEach(error => error.remove());
    form.querySelectorAll('[aria-invalid="true"]').forEach(field => {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    });
  };
  const showFieldError = (field, message) => {
    if (!field) return;
    const container = field.closest('.field');
    if (!container) return;
    const error = document.createElement('small');
    error.className = 'field-error';
    error.id = `lead-error-${field.name}`;
    error.setAttribute('role', 'alert');
    error.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', error.id);
    field.insertAdjacentElement('afterend', error);
  };
  const mobileDigits = value => {
    let digits = value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  };

  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'lead-form') return;
    event.preventDefault();
    if (form.dataset.submitting === 'true') return;
    clearErrors(form);

    if (valueOf(form, 'website')) {
      setStatus(form, 'Dhanyawaad! WhatsApp khul raha hai, wahan Send dabana mat bhoolna 🙏');
      return;
    }

    const invalidFields = [];
    Object.entries(requiredMessages).forEach(([name, message]) => {
      const field = form.querySelector(`[name="${name}"]`);
      if (field && !field.value.trim()) invalidFields.push([field, message]);
    });

    const mobile = form.querySelector('[name="mobile"]');
    if (mobile?.value.trim() && !/^[6-9]\d{9}$/.test(mobileDigits(mobile.value))) {
      invalidFields.push([mobile, 'Sahi 10-digit Indian mobile number likhiye.']);
    }
    const whatsapp = form.querySelector('[name="whatsapp"]');
    if (whatsapp?.value.trim() && !/^[6-9]\d{9}$/.test(mobileDigits(whatsapp.value))) {
      invalidFields.push([whatsapp, 'WhatsApp number bhi sahi 10-digit Indian number hona chahiye.']);
    }
    const email = valueOf(form, 'email');
    const emailField = form.querySelector('[name="email"]');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      invalidFields.push([emailField, 'Email address sahi format mein likhiye.']);
    }

    if (invalidFields.length) {
      invalidFields.forEach(([field, message]) => showFieldError(field, message));
      setStatus(form, 'Kuch details check karke dobara submit kijiye.', true);
      invalidFields[0][0]?.focus();
      return;
    }

    const button = form.querySelector('[type="submit"]');
    if (!button) return;
    const originalText = button.textContent;
    form.dataset.submitting = 'true';
    button.disabled = true;
    button.textContent = 'Bhej rahe hain...';

    const data = Object.fromEntries(fieldNames.map(name => [name, valueOf(form, name)]));
    data.page = window.location.href;
    const payload = new URLSearchParams(data);

    let timeoutId;
    try {
      await Promise.race([
        fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          keepalive: true,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payload
        }),
        new Promise(resolve => { timeoutId = window.setTimeout(resolve, 2000); })
      ]);
    } catch {
      // WhatsApp remains the fallback if the sheet request fails.
    } finally {
      window.clearTimeout(timeoutId);
    }

    const lines = labels
      .filter(([name]) => data[name])
      .map(([name, label]) => `${label}: ${data[name]}`);
    const message = `Hello My JEE Mentor! Mujhe free counselling book karni hai.\n\n${lines.join('\n')}`;
    setStatus(form, 'Dhanyawaad! WhatsApp khul raha hai, wahan Send dabana mat bhoolna 🙏');
    window.setTimeout(() => {
      window.location.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
    }, 350);
  });
})();
