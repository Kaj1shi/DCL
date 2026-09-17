const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach(el => observer.observe(el));

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll(".site-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });
});


document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

function animateStatCount(el) {
  const target = Number(el.dataset.target);
  if (!Number.isFinite(target)) return;

  const suffix = el.dataset.suffix || "";
  const duration = 2600;
  const start = performance.now();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    el.textContent = `${target}${suffix}`;
    return;
  }

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = `${Math.round(target * eased)}${suffix}`;
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

const statCounts = document.querySelectorAll(".stat-count");
if (statCounts.length) {
  const statsObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll(".stat-count").forEach(animateStatCount);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  document.querySelectorAll(".stats-band").forEach((band) => statsObserver.observe(band));
}

const contactForm = document.querySelector("#contact-form");
const quoteForm = document.querySelector("#quote-form");

const formValidators = {
  name: (value) => {
    if (!value.trim()) return "Please enter your full name.";
    if (value.trim().length < 2) return "Name must be at least 2 characters.";
    return "";
  },
  organization: () => "",
  email: (value) => {
    if (!value.trim()) return "Please enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Please enter a valid email address.";
    return "";
  },
  phone: (value) => {
    if (!value.trim()) return "";
    if (!/^[+0-9][0-9\s\-()]{6,19}$/.test(value.trim())) {
      return "Enter a valid phone number, or leave this field blank.";
    }
    return "";
  },
  service: (value) => (value ? "" : "Please select a service interest."),
  message: (value) => {
    if (!value.trim()) return "Please enter a message.";
    if (value.trim().length < 20) return "Message must be at least 20 characters.";
    return "";
  },
};

function setFieldError(form, field, message) {
  const errorEl = form.querySelector(`[data-error-for="${field.name}"]`);
  if (!errorEl) return;
  if (message) {
    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
    errorEl.textContent = "";
    errorEl.hidden = true;
  }
}

function validateField(form, field) {
  const validate = formValidators[field.name];
  if (!validate) return true;
  const message = validate(field.value);
  setFieldError(form, field, message);
  return !message;
}

function validateForm(form) {
  let firstInvalid = null;
  Object.keys(formValidators).forEach((name) => {
    const field = form.elements.namedItem(name);
    if (!field || !validateField(form, field)) {
      if (!firstInvalid && field) firstInvalid = field;
    }
  });
  return firstInvalid;
}

function bindFieldValidation(form) {
  Object.keys(formValidators).forEach((name) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    const eventName = field.tagName === "SELECT" ? "change" : "blur";
    field.addEventListener(eventName, () => validateField(form, field));
    field.addEventListener("input", () => {
      if (field.classList.contains("is-invalid")) validateField(form, field);
    });
  });
}

function ensureHiddenInput(form, name, value) {
  let input = form.querySelector(`input[type="hidden"][name="${name}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }
  input.value = value;
  return input;
}

function prepareFormSubmitExtras(form, subject) {
  ensureHiddenInput(form, "_captcha", "false");
  ensureHiddenInput(form, "_template", "table");
  ensureHiddenInput(form, "_subject", subject);
  ensureHiddenInput(
    form,
    "_next",
    `${window.location.origin}${window.location.pathname}?submitted=1`
  );
}

function showSubmittedState(statusEl, submitBtn, message, buttonLabel) {
  if (!statusEl) return;
  statusEl.hidden = false;
  statusEl.className = "form-status is-success";
  statusEl.textContent = message;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = buttonLabel;
  }
  if (window.history.replaceState) {
    window.history.replaceState({}, "", window.location.pathname + window.location.hash);
  }
}

function handleSubmittedRedirect(statusEl, submitBtn, message, buttonLabel) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("submitted") !== "1") return false;
  showSubmittedState(statusEl, submitBtn, message, buttonLabel);
  return true;
}

if (contactForm) {
  const statusEl = document.querySelector("#form-status");
  const submitBtn = document.querySelector("#contact-submit");
  bindFieldValidation(contactForm);

  handleSubmittedRedirect(
    statusEl,
    submitBtn,
    "Thank you. Your inquiry was submitted successfully.",
    "Submitted"
  );

  contactForm.addEventListener("submit", (event) => {
    const firstInvalid = validateForm(contactForm);
    if (firstInvalid) {
      event.preventDefault();
      statusEl.hidden = false;
      statusEl.className = "form-status is-error";
      statusEl.textContent = "Please fix the highlighted fields before sending.";
      firstInvalid.focus();
      return;
    }

    if (window.location.protocol === "file:") {
      event.preventDefault();
      statusEl.hidden = false;
      statusEl.className = "form-status is-error";
      statusEl.textContent =
        "FormSubmit cannot send emails from a local HTML file. Open the site through a web server, then try again.";
      return;
    }

    prepareFormSubmitExtras(contactForm, "New consultation request — Drescher Consult Limited");
    statusEl.hidden = false;
    statusEl.className = "form-status is-pending";
    statusEl.textContent = "Submitting...";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }
  });
}

if (quoteForm) {
  const statusEl = document.querySelector("#quote-status");
  const submitBtn = document.querySelector("#quote-submit");

  const quoteValidators = {
    name: formValidators.name,
    job_title: (value) => {
      if (!value.trim()) return "Please enter your job title.";
      return "";
    },
    organization: (value) => {
      if (!value.trim()) return "Please enter your organization.";
      return "";
    },
    email: formValidators.email,
    phone: (value) => {
      if (!value.trim()) return "Please enter your phone number.";
      if (!/^[+0-9][0-9\s\-()]{6,19}$/.test(value.trim())) {
        return "Please enter a valid phone number.";
      }
      return "";
    },
    request_type: (value) => (value ? "" : "Please select a request type."),
    service: (value) => (value ? "" : "Please select a primary category."),
    quantity: (value) => {
      if (!value.trim()) return "Please estimate quantity, users, or sites.";
      return "";
    },
    location: (value) => {
      if (!value.trim()) return "Please enter a delivery or installation location.";
      return "";
    },
    timeline: (value) => (value ? "" : "Please select when this is needed."),
    budget: () => "",
    message: (value) => {
      if (!value.trim()) return "Please describe your requirements.";
      if (value.trim().length < 30) return "Please provide at least 30 characters of detail.";
      return "";
    },
  };

  function validateQuoteField(field) {
    const validate = quoteValidators[field.name];
    if (!validate) return true;
    const message = validate(field.value);
    setFieldError(quoteForm, field, message);
    return !message;
  }

  function validateQuoteForm() {
    let firstInvalid = null;
    Object.keys(quoteValidators).forEach((name) => {
      const field = quoteForm.elements.namedItem(name);
      if (!field || field instanceof RadioNodeList) {
        const single = quoteForm.querySelector(`[name="${name}"]:not([type="checkbox"])`);
        if (!single) return;
        if (!validateQuoteField(single) && !firstInvalid) firstInvalid = single;
        return;
      }
      if (!validateQuoteField(field) && !firstInvalid) firstInvalid = field;
    });
    return firstInvalid;
  }

  Object.keys(quoteValidators).forEach((name) => {
    const field = quoteForm.querySelector(`[name="${name}"]:not([type="checkbox"])`);
    if (!field) return;
    const eventName = field.tagName === "SELECT" ? "change" : "blur";
    field.addEventListener(eventName, () => validateQuoteField(field));
    field.addEventListener("input", () => {
      if (field.classList.contains("is-invalid")) validateQuoteField(field);
    });
  });

  handleSubmittedRedirect(
    statusEl,
    submitBtn,
    "Thank you. Your quote request was submitted successfully.",
    "Submitted"
  );

  quoteForm.addEventListener("submit", (event) => {
    const firstInvalid = validateQuoteForm();
    if (firstInvalid) {
      event.preventDefault();
      statusEl.hidden = false;
      statusEl.className = "form-status is-error";
      statusEl.textContent = "Please fix the highlighted fields before submitting.";
      firstInvalid.focus();
      return;
    }

    if (window.location.protocol === "file:") {
      event.preventDefault();
      statusEl.hidden = false;
      statusEl.className = "form-status is-error";
      statusEl.textContent =
        "FormSubmit cannot send emails from a local HTML file. Open the site through a web server, then try again.";
      return;
    }

    // Collect checkbox brands into one field FormSubmit will email.
    const brands = Array.from(quoteForm.querySelectorAll('input[name="brands"]:checked'))
      .map((input) => input.value)
      .join(", ") || "Not specified";
    ensureHiddenInput(quoteForm, "preferred_brands", brands);

    prepareFormSubmitExtras(quoteForm, "New quote request — Drescher Consult Limited");
    statusEl.hidden = false;
    statusEl.className = "form-status is-pending";
    statusEl.textContent = "Submitting...";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }
  });
}
