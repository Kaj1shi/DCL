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

function getFormRecipient(form) {
  if (form.dataset.recipient) return form.dataset.recipient.trim();
  const action = form.getAttribute("action") || "";
  const match = action.match(/formsubmit\.co\/(?:ajax\/)?([^/?#]+)/i);
  if (match) return decodeURIComponent(match[1]);
  return "";
}

async function submitWithFormSubmit({ form, statusEl, submitBtn, payload, successMessage }) {
  const recipientEmail = getFormRecipient(form);
  if (!recipientEmail) {
    throw new Error("Missing recipient email in the form action URL.");
  }

  if (window.location.protocol === "file:") {
    throw new Error(
      "FormSubmit cannot send emails from a local HTML file. Open the site through a web server (for example Live Server or python -m http.server), then try again."
    );
  }

  statusEl.hidden = false;
  statusEl.className = "form-status is-pending";
  statusEl.textContent = "Submitting...";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  }

  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipientEmail)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...payload,
      _captcha: "false",
    }),
  });

  const result = await response.json().catch(() => ({}));
  const failed =
    !response.ok ||
    result.success === "false" ||
    result.success === false ||
    result.success === 0;

  if (failed) {
    throw new Error(
      result.message ||
        `FormSubmit rejected the request (HTTP ${response.status}). Confirm the recipient inbox has activated FormSubmit.`
    );
  }

  statusEl.hidden = false;
  statusEl.className = "form-status is-success";
  statusEl.textContent = successMessage;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitted";
  }

  setTimeout(() => {
    window.location.reload();
  }, 2200);
}

if (contactForm) {
  const statusEl = document.querySelector("#form-status");
  const submitBtn = document.querySelector("#contact-submit");
  bindFieldValidation(contactForm);

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstInvalid = validateForm(contactForm);
    if (firstInvalid) {
      statusEl.hidden = false;
      statusEl.className = "form-status is-error";
      statusEl.textContent = "Please fix the highlighted fields before sending.";
      firstInvalid.focus();
      return;
    }

    const payload = {
      name: contactForm.elements.namedItem("name").value.trim(),
      organization: contactForm.elements.namedItem("organization").value.trim() || "Not provided",
      email: contactForm.elements.namedItem("email").value.trim(),
      phone: contactForm.elements.namedItem("phone").value.trim() || "Not provided",
      service: contactForm.elements.namedItem("service").value.trim(),
      message: contactForm.elements.namedItem("message").value.trim(),
      _subject: "New consultation request — Drescher Consult Limited",
      _template: "table",
    };

    try {
      await submitWithFormSubmit({
        form: contactForm,
        statusEl,
        submitBtn,
        payload,
        successMessage: "Thank you. Your inquiry was submitted successfully.",
      });
    } catch (error) {
      statusEl.hidden = false;
      statusEl.className = "form-status is-error";
      statusEl.textContent = error?.message || "Sorry, we could not submit your inquiry. Please try again or email us directly.";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Inquiry";
      }
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

  quoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstInvalid = validateQuoteForm();
    if (firstInvalid) {
      statusEl.hidden = false;
      statusEl.className = "form-status is-error";
      statusEl.textContent = "Please fix the highlighted fields before submitting.";
      firstInvalid.focus();
      return;
    }

    const brands = Array.from(quoteForm.querySelectorAll('input[name="brands"]:checked'))
      .map((input) => input.value)
      .join(", ") || "Not specified";

    const payload = {
      name: quoteForm.elements.namedItem("name").value.trim(),
      job_title: quoteForm.elements.namedItem("job_title").value.trim(),
      organization: quoteForm.elements.namedItem("organization").value.trim(),
      email: quoteForm.elements.namedItem("email").value.trim(),
      phone: quoteForm.elements.namedItem("phone").value.trim(),
      request_type: quoteForm.elements.namedItem("request_type").value.trim(),
      service: quoteForm.elements.namedItem("service").value.trim(),
      preferred_brands: brands,
      quantity: quoteForm.elements.namedItem("quantity").value.trim(),
      location: quoteForm.elements.namedItem("location").value.trim(),
      timeline: quoteForm.elements.namedItem("timeline").value.trim(),
      budget: quoteForm.elements.namedItem("budget").value.trim() || "Prefer not to say",
      message: quoteForm.elements.namedItem("message").value.trim(),
      _subject: "New quote request — Drescher Consult Limited",
      _template: "table",
    };

    try {
      await submitWithFormSubmit({
        form: quoteForm,
        statusEl,
        submitBtn,
        payload,
        successMessage: "Thank you. Your quote request was submitted successfully.",
      });
    } catch (error) {
      statusEl.hidden = false;
      statusEl.className = "form-status is-error";
      statusEl.textContent = error?.message || "Sorry, we could not submit your quote request. Please try again or email us directly.";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Quote Request";
      }
    }
  });
}
