/* =====================================================
   UTKAL LEVELS — Landing page interactions
   1. Sticky header + mobile nav
   2. Carousels (amenities / gallery)
   3. Video playlist switcher (YouTube)
   
   5. Accordions (neighbourhood + FAQ)
   6. Lead form validation + capture (both forms)
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- 1. Header ---------- */
  const header = document.getElementById("siteHeader");
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 10);
  }, { passive: true });

  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open);
  });
  mainNav.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => mainNav.classList.remove("open"))
  );

  /* ---------- 2. Carousels — infinite auto-slide ---------- */
  document.querySelectorAll("[data-carousel]").forEach(carousel => {
    const track = carousel.querySelector(".carousel-track");
    const originalChildren = Array.from(track.children);

    // Duplicate the full slide set once so the loop point is invisible.
    originalChildren.forEach(el => track.appendChild(el.cloneNode(true)));

    let singleSetWidth = 0;
    const measure = () => {
      // Width of just the first (original) set, gap included.
      const last = originalChildren[originalChildren.length - 1];
      singleSetWidth = last.offsetLeft + last.offsetWidth - originalChildren[0].offsetLeft + 24; // + gap
    };
    measure();
    window.addEventListener("resize", measure);

    const speed = carousel.dataset.carousel === "gallery" ? 0.6 : 0.5; // px per frame
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let paused = reducedMotion;
    let rafId;

    function tick() {
      if (!paused && singleSetWidth > 0) {
        track.scrollLeft += speed;
        if (track.scrollLeft >= singleSetWidth) {
          track.scrollLeft -= singleSetWidth;
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    // Pause on hover / touch / manual drag so it stays usable.
    let resumeTimer;
    const pauseAwhile = () => {
      paused = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { paused = false; }, 2200);
    };
    carousel.addEventListener("mouseenter", () => { paused = true; });
    carousel.addEventListener("mouseleave", () => { clearTimeout(resumeTimer); paused = false; });
    track.addEventListener("touchstart", () => { paused = true; }, { passive: true });
    track.addEventListener("touchend", pauseAwhile);
    track.addEventListener("pointerdown", () => { paused = true; });
    track.addEventListener("pointerup", pauseAwhile);
    track.addEventListener("wheel", pauseAwhile, { passive: true });

    const cardStep = () => {
      const card = track.querySelector(":scope > *");
      return card ? card.getBoundingClientRect().width + 24 : 300;
    };
    carousel.querySelector(".prev").addEventListener("click", () => {
      pauseAwhile();
      track.scrollLeft -= cardStep();
      if (track.scrollLeft < 0) track.scrollLeft += singleSetWidth;
    });
    carousel.querySelector(".next").addEventListener("click", () => {
      pauseAwhile();
      track.scrollLeft += cardStep();
      if (track.scrollLeft >= singleSetWidth) track.scrollLeft -= singleSetWidth;
    });
  });

  /* ---------- 2b. Testimonial video slider ----------
     Steps one video every 4s in an endless loop.
     Thumbnails only — the YouTube player loads on click,
     and the loop pauses while a video is playing. */
  const tSlider = document.querySelector("[data-tslider]");
  if (tSlider) {
    const track = tSlider.querySelector(".t-track");
    const originals = Array.from(track.children);
    const GAP = 24;

    // Duplicate the set once so the wrap-around is invisible.
    originals.forEach(el => track.appendChild(el.cloneNode(true)));
    // Add a "Watch on YouTube" escape hatch to every card, then remember
    // each card's thumbnail so it can be restored after playback.
    const ytLink = id =>
      '<a class="yt-link" href="https://www.youtube.com/shorts/' + id +
      '" target="_blank" rel="noopener">Watch on YouTube &#8599;</a>';
    track.querySelectorAll(".t-video").forEach(c => {
      c.insertAdjacentHTML("beforeend", ytLink(c.dataset.yt));
      c.dataset.thumb = c.innerHTML;
    });

    let setWidth = 0;
    const measure = () => {
      const last = originals[originals.length - 1];
      setWidth = last.offsetLeft + last.offsetWidth - originals[0].offsetLeft + GAP;
    };
    measure();
    window.addEventListener("resize", measure);

    const stepSize = () => track.children[0].getBoundingClientRect().width + GAP;
    const wrap = () => {
      if (setWidth > 0 && track.scrollLeft >= setWidth) {
        track.style.scrollBehavior = "auto";
        track.scrollLeft -= setWidth;
        track.style.scrollBehavior = "";
      }
    };

    let hovered = false;
    let playing = false;
    let holdUntil = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const stopVideos = () => {
      track.querySelectorAll(".t-video iframe").forEach(f => {
        const card = f.closest(".t-video");
        card.innerHTML = card.dataset.thumb;
      });
      playing = false;
    };

    // Auto-advance: one card every 4 seconds.
    setInterval(() => {
      if (reduced || hovered || playing || document.hidden || Date.now() < holdUntil) return;
      wrap();
      track.scrollBy({ left: stepSize(), behavior: "smooth" });
    }, 1700);

    tSlider.addEventListener("mouseenter", () => { hovered = true; });
    tSlider.addEventListener("mouseleave", () => { hovered = false; });
    track.addEventListener("touchstart", () => { holdUntil = Date.now() + 6000; }, { passive: true });

    // Click a card -> swap thumbnail for the autoplaying YouTube player.
    track.addEventListener("click", e => {
      if (e.target.closest(".yt-link")) return; // let the YouTube link work normally
      const card = e.target.closest(".t-video");
      if (!card || card.querySelector("iframe")) return;
      stopVideos();
      card.innerHTML =
        '<iframe src="https://www.youtube.com/embed/' + card.dataset.yt +
        '?autoplay=1&rel=0&playsinline=1" title="Resident testimonial video" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
        ytLink(card.dataset.yt);
      playing = true;
    });

    tSlider.querySelector(".prev").addEventListener("click", () => {
      stopVideos();
      holdUntil = Date.now() + 6000;
      if (track.scrollLeft < stepSize()) {
        track.style.scrollBehavior = "auto";
        track.scrollLeft += setWidth;
        track.style.scrollBehavior = "";
      }
      track.scrollBy({ left: -stepSize(), behavior: "smooth" });
    });
    tSlider.querySelector(".next").addEventListener("click", () => {
      stopVideos();
      holdUntil = Date.now() + 6000;
      wrap();
      track.scrollBy({ left: stepSize(), behavior: "smooth" });
    });
  }

  /* ---------- 3. Video playlist ---------- */
  const videoFrame = document.getElementById("videoFrame");
  const videoList = document.getElementById("videoList");
  let currentVideo = videoList ? videoList.querySelector("li.active")?.dataset.video : null;

  function loadVideo(id) {
    // Replace VIDEO_ID_x in the HTML with real YouTube video IDs.
    videoFrame.innerHTML =
      '<iframe src="https://www.youtube.com/embed/' + id +
      '?autoplay=1&rel=0" title="Project video" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
  }

  if (videoList) {
    videoList.querySelectorAll("li").forEach(li => {
      li.addEventListener("click", () => {
        videoList.querySelector("li.active")?.classList.remove("active");
        li.classList.add("active");
        currentVideo = li.dataset.video;
        loadVideo(currentVideo);
      });
    });
  }
  document.getElementById("playBtn")?.addEventListener("click", () => {
    if (currentVideo) loadVideo(currentVideo);
  });

  /* ---------- 4. Accordions ---------- */
  document.querySelectorAll(".accordion").forEach(acc => {
    acc.querySelectorAll(".acc-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".acc-item");
        const wasOpen = item.classList.contains("open");
        // close siblings (one open at a time)
        acc.querySelectorAll(".acc-item.open").forEach(o => {
          o.classList.remove("open");
          const t = o.querySelector(".acc-trigger");
          t.setAttribute("aria-expanded", "false");
          t.querySelector(".acc-icon").textContent = "+";
        });
        if (!wasOpen) {
          item.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
          btn.querySelector(".acc-icon").textContent = "−";
        }
      });
    });
  });

  /* ---------- 5. Lead forms ---------- */
  // >>> CONFIGURE YOUR LEAD CAPTURE ENDPOINT HERE <<<
  // Option A: your own API / PHP script       e.g. "/api/lead.php"
  // Option B: Google Sheets via Apps Script    e.g. "https://script.google.com/macros/s/XXXX/exec"
  // Option C: services like Formspree/Basin    e.g. "https://formspree.io/f/yourid"
  const LEAD_ENDPOINT = ""; // leave empty to test locally (logs to console)

  function validateForm(form) {
    let ok = true;
    form.querySelectorAll(".field").forEach(f => f.classList.remove("invalid"));

    const setErr = (input, msg) => {
      const field = input.closest(".field");
      field.classList.add("invalid");
      field.querySelector(".error-msg").textContent = msg;
      ok = false;
    };

    const first = form.elements.firstName;
    const last = form.elements.lastName;
    const phone = form.elements.phone;
    const email = form.elements.email;
    const terms = form.elements.terms;

    if (!first.value.trim()) setErr(first, "First name is required");
    if (!last.value.trim()) setErr(last, "Last name is required");
    if (!/^[6-9]\d{9}$/.test(phone.value.trim())) setErr(phone, "Enter a valid 10-digit mobile number");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) setErr(email, "Enter a valid email address");
    if (!terms.checked) {
      ok = false;
      setStatus(form, "Please accept the Terms & Conditions.", false);
    }
    return ok;
  }

  function setStatus(form, msg, success) {
    const s = form.querySelector(".form-status");
    s.textContent = msg;
    s.className = "form-status " + (success ? "ok" : "err");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    if (!validateForm(form)) return;

    const data = {
      firstName: form.elements.firstName.value.trim(),
      lastName: form.elements.lastName.value.trim(),
      phone: "+91" + form.elements.phone.value.trim(),
      email: form.elements.email.value.trim(),
      whatsappOptIn: form.elements.whatsapp.checked,
      source: window.location.href,
      formId: form.id,
      submittedAt: new Date().toISOString()
    };

    const btn = form.querySelector(".btn-submit");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    try {
      if (LEAD_ENDPOINT) {
        await fetch(LEAD_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          mode: "no-cors" // remove if your endpoint returns CORS headers
        });
      } else {
        console.log("LEAD CAPTURED (configure LEAD_ENDPOINT to send):", data);
      }
      setStatus(form, "Thank you! Our team will contact you shortly.", true);
      form.reset();
      form.elements.whatsapp.checked = true;
    } catch (err) {
      setStatus(form, "Something went wrong. Please try again.", false);
    } finally {
      btn.disabled = false;
      btn.textContent = "Submit";
    }
  }

  ["leadFormTop", "leadFormBottom"].forEach(id => {
    const f = document.getElementById(id);
    if (f) f.addEventListener("submit", handleSubmit);
  });

  // Phone inputs: digits only
  document.querySelectorAll('input[type="tel"]').forEach(el =>
    el.addEventListener("input", () => { el.value = el.value.replace(/\D/g, "").slice(0, 10); })
  );

  // Brochure button scrolls to lead form (gate the brochure behind the form)
  document.getElementById("brochureBtn")?.addEventListener("click", () => {
    document.getElementById("firstNameTop")?.focus({ preventScroll: true });
  });
});
