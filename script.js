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
if (contactForm) {
  const statusEl = document.querySelector("#form-status");
  const recipientEmail = contactForm.dataset.recipient || "piimasmith@gmail.com";

  const validators = {
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

  function setFieldError(field, message) {
    const errorEl = contactForm.querySelector(`[data-error-for="${field.name}"]`);
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

  function validateField(field) {
    const validate = validators[field.name];
    if (!validate) return true;
    const message = validate(field.value);
    setFieldError(field, message);
    return !message;
  }

  function validateForm() {
    let firstInvalid = null;
    Object.keys(validators).forEach((name) => {
      const field = contactForm.elements.namedItem(name);
      if (!field || !validateField(field)) {
        if (!firstInvalid && field) firstInvalid = field;
      }
    });
    return firstInvalid;
  }

  function buildMailtoLink(form) {
    const name = form.elements.namedItem("name").value.trim();
    const organization = form.elements.namedItem("organization").value.trim() || "Not provided";
    const email = form.elements.namedItem("email").value.trim();
    const phone = form.elements.namedItem("phone").value.trim() || "Not provided";
    const service = form.elements.namedItem("service").value.trim();
    const message = form.elements.namedItem("message").value.trim();

    const subject = `Consultation request from ${name}`;
    const body = [
      "New consultation request from the DCL website",
      "",
      `Name: ${name}`,
      `Organization: ${organization}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Service interest: ${service}`,
      "",
      "Message:",
      message,
    ].join("\n");

    return `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  Object.keys(validators).forEach((name) => {
    const field = contactForm.elements.namedItem(name);
    if (!field) return;
    const eventName = field.tagName === "SELECT" ? "change" : "blur";
    field.addEventListener(eventName, () => validateField(field));
    field.addEventListener("input", () => {
      if (field.classList.contains("is-invalid")) validateField(field);
    });
  });

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const firstInvalid = validateForm();
    if (firstInvalid) {
      statusEl.hidden = false;
      statusEl.className = "form-status is-error";
      statusEl.textContent = "Please fix the highlighted fields before sending.";
      firstInvalid.focus();
      return;
    }

    statusEl.hidden = false;
    statusEl.className = "form-status is-success";
    statusEl.textContent = "Opening your email app to send the inquiry...";
    window.location.href = buildMailtoLink(contactForm);
  });
}