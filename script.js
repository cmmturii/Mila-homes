/* =============================================
   MILA HOMES — script.js
   Boutique B&B, Nyeri Kenya

   TABLE OF CONTENTS
   1. Sticky Navigation
   2. Mobile Hamburger Menu
   3. Booking Form — Date Defaults
   4. Booking Form — Formspree Submission
   5. Gallery Lightbox
   6. Scroll Reveal Animation
   ============================================= */


/* =============================================
   1. STICKY NAVIGATION
   Shrinks padding when user scrolls down
   ============================================= */
function initStickyNav() {
  const nav = document.getElementById("navbar");

  window.addEventListener("scroll", function () {
    if (window.scrollY > 60) {
      nav.style.padding    = "10px 56px";
      nav.style.boxShadow  = "0 2px 20px rgba(30,28,24,0.10)";
    } else {
      nav.style.padding    = "18px 56px";
      nav.style.boxShadow  = "none";
    }
  });
}


/* =============================================
   2. MOBILE HAMBURGER MENU
   Toggles the mobile nav open and closed
   ============================================= */
function initMobileMenu() {
  const hamburger  = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");

  hamburger.addEventListener("click", function () {
    mobileMenu.classList.toggle("open");
  });

  // Close menu when user clicks outside
  document.addEventListener("click", function (e) {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove("open");
    }
  });
}

// Called from HTML onclick on each menu link
function closeMenu() {
  document.getElementById("mobileMenu").classList.remove("open");
}


/* =============================================
   3. BOOKING FORM — DATE DEFAULTS
   Sets sensible default check-in / check-out
   and validates that checkout is after check-in
   ============================================= */
function initDates() {
  const checkin  = document.getElementById("checkin");
  const checkout = document.getElementById("checkout");

  // Helper: format a Date as "YYYY-MM-DD"
  function toISO(date) {
    return date.toISOString().split("T")[0];
  }

  // Default: tomorrow → day after tomorrow
  const today    = new Date();
  const tomorrow = new Date(today);
  const dayAfter = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  dayAfter.setDate(dayAfter.getDate() + 2);

  checkin.min   = toISO(today);
  checkin.value = toISO(tomorrow);
  checkout.min  = toISO(dayAfter);
  checkout.value = toISO(dayAfter);

  // When check-in changes, push checkout forward if needed
  checkin.addEventListener("change", function () {
    const selectedCheckin   = new Date(this.value);
    const minCheckout       = new Date(selectedCheckin);
    minCheckout.setDate(minCheckout.getDate() + 1);

    checkout.min = toISO(minCheckout);

    // If checkout is now before or equal to checkin, reset it
    if (new Date(checkout.value) <= selectedCheckin) {
      checkout.value = toISO(minCheckout);
    }
  });
}


/* =============================================
   4. BOOKING FORM — FORMSPREE AJAX SUBMISSION
   Submits the form without page reload.
   Shows success message on completion.

   HOW TO ACTIVATE:
   - Go to https://formspree.io and sign up (free)
   - Create a new form
   - Copy your Form ID (looks like: xabcdefg)
   - In index.html, replace YOUR_FORM_ID in the
     form's action attribute with your real ID
   ============================================= */
function initBookingForm() {
  const form       = document.getElementById("bookingForm");
  const successMsg = document.getElementById("successMsg");

  if (!form) return; // safety check

  form.addEventListener("submit", async function (e) {
    e.preventDefault(); // stop normal page-reload submit

    const btn = form.querySelector(".submit-btn");
    btn.textContent = "Sending...";
    btn.disabled    = true;

    try {
      const response = await fetch(form.action, {
        method:  "POST",
        body:    new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        // Hide form, show thank-you message
        form.style.display = "none";
        successMsg.classList.add("show");
        successMsg.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        // Show error on button
        btn.textContent = "Something went wrong — please try again.";
        btn.disabled    = false;
      }

    } catch (error) {
      btn.textContent = "Network error — please check your connection.";
      btn.disabled    = false;
    }
  });
}


/* =============================================
   5. GALLERY LIGHTBOX
   Click any gallery image to open it full-size.
   Press Escape or click outside to close.
   ============================================= */
function initLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lbImg    = document.getElementById("lbImg");
  const lbCap    = document.getElementById("lbCap");
  const lbClose  = document.getElementById("lbClose");

  // Open: attach click to every gallery item
  document.querySelectorAll(".gal-item").forEach(function (item) {
    item.addEventListener("click", function () {
      const img   = item.querySelector("img");
      const label = item.querySelector(".gal-label");

      lbImg.src             = img.src;
      lbImg.alt             = img.alt;
      lbCap.textContent     = label ? label.textContent.trim() : "";

      lightbox.classList.add("open");
      document.body.style.overflow = "hidden"; // prevent background scroll
    });
  });

  // Close: X button
  lbClose.addEventListener("click", closeLightbox);

  // Close: clicking the dark backdrop
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // Close: Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeLightbox();
    }
  });

  function closeLightbox() {
    lightbox.classList.remove("open");
    document.body.style.overflow = ""; // restore scrolling
  }
}


/* =============================================
   6. SCROLL REVEAL ANIMATION
   Elements with class "reveal" fade in as
   the user scrolls down the page.
   ============================================= */
function initScrollReveal() {
  const elements = document.querySelectorAll(".reveal");

  // IntersectionObserver fires when element enters viewport
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");

          // Stop observing once revealed (no need to keep watching)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.10, // trigger when 10% of element is visible
    }
  );

  elements.forEach(function (el) {
    observer.observe(el);
  });
}


/* =============================================
   INITIALISE EVERYTHING ON PAGE LOAD
   ============================================= */
document.addEventListener("DOMContentLoaded", function () {
  initStickyNav();
  initMobileMenu();
  initDates();
  initBookingForm();
  initLightbox();
  initScrollReveal();
});
