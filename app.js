
/*
  PGPR PICKS — FIND YOUR PICK
  Complete app.js replacement

  Requires:
  - index.html with #app, #homeLink, #savedBtn, #savedCount
  - places.js loaded before app.js
  - window.PLACES or global PLACES array

  No external JavaScript libraries required.
*/

(() => {
  "use strict";

  // --------------------------------------------------
  // 1. SETUP
  // --------------------------------------------------

  const $ = (selector) => document.querySelector(selector);

  const app = $("#app");

  if (!app) {
    console.error("PGPR Picks: #app element not found.");
    return;
  }

  const places =
    typeof PLACES !== "undefined" && Array.isArray(PLACES)
      ? PLACES
      : Array.isArray(window.PLACES)
      ? window.PLACES
      : [];

  const STORAGE_KEY = "pgpr-picks-saved";

  function loadSaved() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const legacy = localStorage.getItem("pgp-picks-saved");
      const parsed = JSON.parse(current || legacy || "[]");
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  const saved = loadSaved();

  const state = {
    category: null,
    answers: {},
    step: 0,
    results: [],
    view: "swipe",
    swipeIndex: 0,
    history: [],
    detailFrom: "results",
    busy: false
  };

  // These images are for the homepage and category cards only.
  // Recommendation cards deliberately have no photographs.

  const images = {
    hero:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80",
    eat:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    focus:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
    escape:
      "https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=900&q=80"
  };

  const categoryNames = {
    eat: "EAT",
    focus: "FOCUS",
    escape: "ESCAPE"
  };

  // --------------------------------------------------
  // 2. UTILITIES
  // --------------------------------------------------

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[character]
    );
  }

  function mapsURL(place) {
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(
        `${place.name} ${place.location || "Singapore"}`
      )
    );
  }

  function saveSync() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...saved])
      );
    } catch (error) {
      console.warn("Could not save bookmarks:", error);
    }

    const count = $("#savedCount");

    if (count) {
      count.textContent = saved.size;
    }
  }

  function setSaved(id, shouldSave) {
    if (shouldSave) {
      saved.add(id);
    } else {
      saved.delete(id);
    }

    saveSync();
  }

  function toggleSaved(id) {
    setSaved(id, !saved.has(id));
    return saved.has(id);
  }

  function scrollTop() {
    window.scrollTo({
      top: 0,
      behavior: "instant"
    });
  }

  function shell(content) {
    app.innerHTML = `
      <div class="pgp-wrap">
        ${content}
      </div>
    `;

    scrollTop();
  }

  function toast(message) {
    const old = document.querySelector(".pgpr-toast");

    if (old) old.remove();

    const element = document.createElement("div");

    element.className = "pgpr-toast";
    element.textContent = message;

    document.body.appendChild(element);

    requestAnimationFrame(() => {
      element.classList.add("visible");
    });

    setTimeout(() => {
      element.classList.remove("visible");
      setTimeout(() => element.remove(), 250);
    }, 1800);
  }

  function sharePlace(place) {
    const text = `${place.name} — ${mapsURL(place)}`;

    if (navigator.share) {
      navigator.share({
        title: "PGPR Picks",
        text
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => toast("Link copied!"))
        .catch(() => toast("Unable to copy link."));
    } else {
      toast("Sharing isn't available in this browser.");
    }
  }

  // --------------------------------------------------
  // 3. VERIFIED STUDY ACCESS
  // --------------------------------------------------

  function verifiedLate(place) {
    if (place.category !== "focus") return false;

    if (place.accessStatus !== "official") return false;

    const mode = place.accessMode;

    if (mode === "always") return true;

    if (mode === "term") {
      // Term-time access is not assumed to be valid
      // outside its documented period.
      return false;
    }

    if (mode === "exam") {
      const deadline = new Date(
        "2026-12-04T23:59:59+08:00"
      );

      return new Date() <= deadline;
    }

    return false;
  }

  function hasFacility(place, facility) {
    const tags = place.tags || [];

    if (facility === "late") {
      return verifiedLate(place);
    }

    if (facility === "power") {
      return (
        (place.verifiedFacilities || []).includes("power") ||
        place.powerStatus === "general-library-guidance"
      );
    }

    return tags.includes(facility);
  }

  // --------------------------------------------------
  // 4. QUESTIONNAIRES
  // --------------------------------------------------

  const questions = {
    eat: [
      {
        title: "How much damage can your wallet take?",
        key: "budget",
        options: [
          ["5", "Under $5"],
          ["10", "$5–10"],
          ["20", "$10–20"],
          ["999", "$20+"]
        ]
      },
      {
        title: "What are we craving?",
        key: "craving",
        options: [
          ["local", "Local favourites"],
          ["spicy", "Spicy food"],
          ["hearty", "Comfort food"],
          ["light", "Something light"],
          ["sweet", "Desserts & cafés"],
          ["any", "Surprise me"]
        ]
      },
      {
        title: "How far are we going?",
        key: "distance",
        options: [
          ["0", "At PGPR"],
          ["1", "On campus"],
          ["2", "Nearby"],
          ["3", "Anywhere worth the trip"]
        ]
      }
    ],

    focus: [
      {
        title: "What's your ideal study atmosphere?",
        key: "noise",
        options: [
          ["quiet", "Silent library energy"],
          ["buzz", "A little background noise"],
          ["group", "Group discussion"],
          ["outdoor", "Outdoor / open air"]
        ]
      },
      {
        title: "What do you absolutely need?",
        key: "facilities",
        multi: true,
        options: [
          ["power", "Charging points"],
          ["aircon", "Air-conditioning"],
          ["late", "Late-night access"],
          ["group", "Group study space"],
          ["food", "Food nearby"]
        ]
      },
      {
        title: "When are you planning to study?",
        key: "when",
        options: [
          ["day", "During the day"],
          ["evening", "Evening"],
          ["late", "After midnight"]
        ]
      }
    ],

    escape: [
      {
        title: "How much free time do you have?",
        key: "time",
        options: [
          ["30", "15–30 minutes"],
          ["120", "1–2 hours"],
          ["240", "Half a day"],
          ["999", "All day"]
        ]
      },
      {
        title: "What's the budget?",
        key: "budget",
        options: [
          ["0", "Free only"],
          ["10", "Under $10"],
          ["30", "$10–30"],
          ["999", "$30+"]
        ]
      },
      {
        title: "What sounds fun?",
        key: "mood",
        options: [
          ["nature", "Nature"],
          ["explore", "Explore somewhere new"],
          ["friends", "Games & friends"],
          ["arts", "Arts & culture"],
          ["sweet", "Cafés & treats"],
          ["any", "Surprise me"]
        ]
      }
    ]
  };

  // --------------------------------------------------
  // 5. APPLICATION STYLES
  // --------------------------------------------------

  const style = document.createElement("style");

  style.textContent = `
    #app {
      min-height: 65vh;
    }

    .pgp-wrap {
      max-width: 1080px;
      margin: 0 auto;
      padding: 42px 24px 70px;
      color: #172b50;
    }

    .pgp-kicker {
      font: 600 12px "IBM Plex Mono", monospace;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .pgp-title {
      font: 700 clamp(42px, 8vw, 100px)/.98
        "Space Grotesk", sans-serif;
      letter-spacing: -.065em;
      margin: 18px 0 22px;
      max-width: 920px;
    }

    .pgp-lead {
      font: 400 clamp(17px, 2vw, 23px)/1.45
        "DM Sans", sans-serif;
      max-width: 600px;
    }

    .pgp-hero {
      background: #f6b38c;
      padding: clamp(22px, 5vw, 65px);
      overflow: hidden;
      margin: 16px 0 40px;
    }

    .pgp-hero-photo {
      width: 100%;
      height: 220px;
      object-fit: cover;
      display: block;
      margin-top: 24px;
    }

    .pgp-btn {
      background: #f36a43;
      color: #fff;
      border: 2px solid #172b50;
      box-shadow: 4px 4px #172b50;
      border-radius: 40px;
      padding: 13px 23px;
      font: 700 14px "DM Sans", sans-serif;
      cursor: pointer;
      display: inline-block;
      text-decoration: none;
      transition: transform .18s, box-shadow .18s;
    }

    .pgp-btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px #172b50;
    }

    .pgp-btn:disabled {
      opacity: .4;
      cursor: not-allowed;
    }

    .pgp-secondary {
      background: #fff9ef;
      color: #172b50;
      box-shadow: none;
    }

    .pgp-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .pgp-tile {
      border: 0;
      text-align: left;
      padding: 0;
      background: #fff;
      cursor: pointer;
      color: #172b50;
      overflow: hidden;
    }

    .pgp-tile img {
      width: 100%;
      height: 230px;
      object-fit: cover;
      display: block;
    }

    .pgp-tile strong {
      display: block;
      font: 700 31px "Space Grotesk", sans-serif;
      padding: 15px 15px 0;
    }

    .pgp-tile small {
      display: block;
      padding: 4px 15px 18px;
    }

    .pgp-panel {
      background: #fffaf1;
      padding: clamp(22px, 5vw, 48px);
      border: 1px solid #d9cdbd;
      margin: 24px 0;
    }

    .pgp-progress {
      font: 600 12px "IBM Plex Mono", monospace;
      margin-bottom: 20px;
    }

    .pgp-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 25px 0;
    }

    .pgp-option {
      padding: 18px;
      text-align: left;
      border: 1.5px solid #172b50;
      background: #fffaf1;
      border-radius: 8px;
      font: 600 16px "DM Sans", sans-serif;
      cursor: pointer;
      color: #172b50;
    }

    .pgp-option.selected {
      background: #dbe9af;
      box-shadow: 3px 3px #172b50;
    }

    .pgp-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 22px 0;
    }

    .pgp-back {
      border: 0;
      background: none;
      color: #172b50;
      font: 600 13px "DM Sans", sans-serif;
      cursor: pointer;
      margin-bottom: 18px;
      padding: 10px 0;
    }

    .pgp-tag {
      display: inline-block;
      background: #dce9b5;
      padding: 6px 9px;
      font: 600 11px "IBM Plex Mono", monospace;
      margin: 4px 5px 4px 0;
    }

    .pgp-note {
      background: #fff1d4;
      padding: 12px 15px;
      margin: 14px 0;
      font-size: 13px;
    }

    .pgp-card {
      background: #fffaf1;
      border: 1px solid #ded2c1;
      overflow: hidden;
    }

    .pgp-card-body {
      padding: 20px;
    }

    .pgp-card h3 {
      font: 700 25px/1.1 "Space Grotesk", sans-serif;
      margin: 10px 0;
    }

    .pgp-card p {
      font: 400 14px/1.5 "DM Sans", sans-serif;
    }

    .pgp-card .pgp-btn {
      font-size: 12px;
      padding: 10px 13px;
    }

    .pgp-empty {
      padding: 30px;
      background: #dbe9b5;
    }

    .pgp-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .pgp-meta > div {
      padding: 15px;
      background: #f1e8d8;
    }

    /* SWIPE INTERFACE */

    .match-stage {
      max-width: 490px;
      margin: 24px auto 28px;
      position: relative;
    }

    .match-counter {
      text-align: center;
      font: 600 12px "IBM Plex Mono", monospace;
      margin-bottom: 14px;
    }

    .match-instructions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
      font: 700 13px "DM Sans", sans-serif;
    }

    .match-instructions .skip-label {
      color: #b84040;
    }

    .match-instructions .save-label {
      color: #287a4b;
    }

    .match-card {
      position: relative;
      background: #dce9b5;
      border: 2px solid #172b50;
      box-shadow: 8px 9px 0 #172b50;
      overflow: hidden;
      touch-action: pan-y;
      user-select: none;
      cursor: grab;
      will-change: transform;
      transform: translate3d(0,0,0) rotate(0deg);
    }

    .match-card.eat {
      background: #f4c4a5;
    }

    .match-card.focus {
      background: #dce9b5;
    }

    .match-card.escape {
      background: #f2c4d3;
    }

    .match-card.dragging {
      cursor: grabbing;
      box-shadow: 12px 15px 0 #172b50;
    }

    .match-inner {
      padding: 26px;
    }

    .match-inner h2 {
      font: 700 clamp(28px, 5vw, 40px)/1.05
        "Space Grotesk", sans-serif;
      margin: 16px 0;
      overflow-wrap: anywhere;
    }

    .match-score {
      display: inline-block;
      background: #fffaf1;
      padding: 9px 12px;
      font: 700 14px "IBM Plex Mono", monospace;
    }

    .match-explain {
      margin-top: 18px;
      font-size: 14px;
      line-height: 1.6;
    }

    .match-explain summary {
      cursor: pointer;
      font-weight: 700;
      padding: 8px 0;
    }

    .swipe-indicator {
      position: absolute;
      top: 24px;
      right: 20px;
      padding: 10px 18px;
      border: 4px solid currentColor;
      border-radius: 8px;
      font: 800 26px "Space Grotesk", sans-serif;
      opacity: 0;
      pointer-events: none;
      z-index: 10;
      transform: rotate(9deg);
      transition: opacity .08s;
    }

    .swipe-indicator.save {
      color: #287a4b;
      background: #e3f4d8;
    }

    .swipe-indicator.skip {
      color: #b84040;
      background: #ffe1de;
      transform: rotate(-9deg);
    }

    .match-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      margin: 26px auto;
    }

    .match-actions button {
      min-width: 105px;
    }

    .match-view-toggle {
      display: flex;
      gap: 10px;
      margin: 22px 0;
      flex-wrap: wrap;
    }

    .match-view-toggle button[aria-pressed="true"] {
      background: #172b50;
      color: #fff;
    }

    .pgp-disclaimer {
      font-size: 12px;
      color: #5b6470;
      margin-top: 20px;
      line-height: 1.6;
    }

    .pgpr-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translate(-50%, 20px);
      background: #172b50;
      color: white;
      padding: 14px 22px;
      border-radius: 30px;
      font: 600 14px "DM Sans", sans-serif;
      opacity: 0;
      transition: opacity .2s, transform .2s;
      z-index: 9999;
      pointer-events: none;
    }

    .pgpr-toast.visible {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    @media (max-width: 720px) {
      .pgp-wrap {
        padding: 22px 15px 50px;
      }

      .pgp-grid {
        grid-template-columns: 1fr;
      }

      .pgp-tile img {
        height: 180px;
      }

      .pgp-options {
        grid-template-columns: 1fr;
      }

      .pgp-hero-photo {
        height: 160px;
      }

      .pgp-meta {
        grid-template-columns: 1fr;
      }

      .pgp-title {
        font-size: clamp(39px, 12vw, 65px);
      }

      .match-inner {
        padding: 20px;
      }

      .match-actions button {
        min-width: 85px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .match-card,
      .pgp-btn {
        transition-duration: .01ms !important;
      }
    }
  `;

  document.head.appendChild(style);

  // --------------------------------------------------
  // 6. HOMEPAGE
  // --------------------------------------------------

  function home() {
    state.category = null;
    state.busy = false;

    shell(`
      <div class="pgp-hero">
        <div class="pgp-kicker">
          PGPR PICKS / FINALS SURVIVAL GUIDE
        </div>

        <h1 class="pgp-title">
          TOO MUCH STUDYING.<br>
          NOT ENOUGH LIVING.
        </h1>

        <p class="pgp-lead">
          Good food, better study spots and little escapes —
          picked for PGPR residents.
        </p>

        <button class="pgp-btn" id="start">
          FIND YOUR PICK ↗
        </button>

        <img
          class="pgp-hero-photo"
          src="${images.hero}"
          alt="Editorial lifestyle photograph"
        >
      </div>

      <h2>SO, WHAT'S THE PLAN?</h2>

      <div class="pgp-grid">
        ${[
          ["eat", "EAT", "Find something good."],
          ["focus", "FOCUS", "Find your next study spot."],
          ["escape", "ESCAPE", "Take a proper break."]
        ].map(([key, title, description]) => `
          <button class="pgp-tile" data-cat="${key}">
            <img
              src="${images[key]}"
              alt="${title} category photograph"
              loading="lazy"
            >
            <strong>${title} ↗</strong>
            <small>${description}</small>
          </button>
        `).join("")}
      </div>

      <p class="pgp-disclaimer">
        Homepage photography is editorial.
        Open Google Maps for photographs of actual venues.
      </p>
    `);

    $("#start").onclick = () => {
      $(".pgp-grid").scrollIntoView({
        behavior: "smooth"
      });
    };

    document.querySelectorAll("[data-cat]").forEach(button => {
      button.onclick = () => start(button.dataset.cat);
    });
  }

  // --------------------------------------------------
  // 7. QUIZ
  // --------------------------------------------------

  function start(category) {
    state.category = category;
    state.answers = {};
    state.step = 0;
    state.history = [];
    state.busy = false;
    quiz();
  }

  function quiz() {
    const question = questions[state.category]?.[state.step];

    if (!question) {
      results();
      return;
    }

    const value = state.answers[question.key];

    shell(`
      <button class="pgp-back" id="back">
        ← BACK
      </button>

      <div class="pgp-panel">
        <div class="pgp-progress">
          ${categoryNames[state.category]}
          / QUESTION ${state.step + 1} OF 3
        </div>

        <h1
          class="pgp-title"
          style="font-size:clamp(34px,6vw,64px)"
        >
          ${escapeHTML(question.title)}
        </h1>

        ${question.multi
          ? "<p>Select as many as you need.</p>"
          : ""}

        <div class="pgp-options">
          ${question.options.map(([key, label]) => {
            const selected = question.multi
              ? (value || []).includes(key)
              : value === key;

            return `
              <button
                class="pgp-option ${selected ? "selected" : ""}"
                data-answer="${key}"
                aria-pressed="${selected}"
              >
                ${escapeHTML(label)}
              </button>
            `;
          }).join("")}
        </div>

        <button class="pgp-btn" id="next">
          ${state.step === 2
            ? "FIND MY PICKS ↗"
            : "NEXT →"}
        </button>
      </div>
    `);

    $("#back").onclick = () => {
      if (state.step > 0) {
        state.step--;
        quiz();
      } else {
        home();
      }
    };

    document.querySelectorAll("[data-answer]").forEach(button => {
      button.onclick = () => {
        const key = button.dataset.answer;

        if (question.multi) {
          const old = state.answers[question.key] || [];

          state.answers[question.key] = old.includes(key)
            ? old.filter(item => item !== key)
            : [...old, key];
        } else {
          state.answers[question.key] = key;
        }

        quiz();
      };
    });

    $("#next").onclick = () => {
      if (!question.multi && !state.answers[question.key]) {
        toast("Choose an answer first.");
        return;
      }

      state.step++;

      if (state.step < 3) {
        quiz();
      } else {
        results();
      }
    };
  }

  // --------------------------------------------------
  // 8. MATCHING
  // --------------------------------------------------

  function matchPlace(place) {
    const answers = state.answers;
    const category = state.category;
    const tags = place.tags || [];

    let score = 0;
    const notes = [];
    const reasons = [];

    if (category === "eat") {
      const budget = Number(answers.budget);
      const distance = Number(answers.distance);

      if (
        answers.craving === "any" ||
        tags.includes(answers.craving)
      ) {
        score += 40;
        reasons.push("Matches your food preference");
      }

      if (place.budget <= budget) {
        score += 35;
        reasons.push("Within your selected budget");
      } else {
        notes.push("Estimated cost may exceed your budget");
      }

      if (place.distance <= distance) {
        score += 25;
        reasons.push("Within your preferred distance");
      } else {
        notes.push("Farther than your preferred distance");
      }
    }

    if (category === "escape") {
      if (
        answers.mood === "any" ||
        tags.includes(answers.mood)
      ) {
        score += 40;
        reasons.push("Matches your preferred activity");
      }

      if (place.budget <= Number(answers.budget)) {
        score += 30;
        reasons.push("Within your selected budget");
      } else {
        notes.push("Estimated cost may exceed your budget");
      }

      if (place.minutes <= Number(answers.time)) {
        score += 30;
        reasons.push("Fits your available time");
      } else {
        notes.push("May take longer than your available time");
      }
    }

    if (category === "focus") {
      if (tags.includes(answers.noise)) {
        score += 35;
        reasons.push("Matches your preferred study atmosphere");
      } else {
        notes.push("Different study atmosphere");
      }

      const requirements = answers.facilities || [];

      if (!requirements.length) {
        score += 40;
      } else {
        for (const requirement of requirements) {
          if (hasFacility(place, requirement)) {
            score += 40 / requirements.length;
            reasons.push(
              requirement === "power"
                ? "Charging facilities listed"
                : requirement === "late"
                ? "Documented late-night access"
                : `${requirement} preference matched`
            );
          } else {
            notes.push(
              requirement === "late"
                ? "Late-night access not verified"
                : requirement === "power"
                ? "Charging points not confirmed"
                : `${requirement} not confirmed`
            );
          }
        }
      }

      if (
        answers.when === "late" ||
        requirements.includes("late")
      ) {
        if (verifiedLate(place)) {
          score += 25;
          reasons.push("Documented late-night study access");
        } else if (!notes.includes("Late-night access not verified")) {
          notes.push("Late-night access not verified");
        }
      } else {
        score += 25;
      }
    }

    return {
      ...place,
      score: Math.min(100, Math.round(score)),
      notes,
      reasons,
      exact: notes.length === 0
    };
  }

  function rankPlaces() {
    return places
      .filter(place => place.category === state.category)
      .map(matchPlace)
      .sort((a, b) => {
        return (
          Number(b.exact) - Number(a.exact) ||
          b.score - a.score ||
          (a.distance || 0) - (b.distance || 0)
        );
      });
  }

  // --------------------------------------------------
  // 9. RESULTS CARDS (NO PLACEHOLDER PHOTOS)
  // --------------------------------------------------

  function resultCard(place) {
    return `
      <article class="pgp-card ${place.category}">
        <div class="pgp-card-body">
          <span class="pgp-tag">
            ${place.score}% PREFERENCE MATCH
          </span>

          ${place.hiddenGem
            ? '<span class="pgp-tag">HIDDEN GEM</span>'
            : ""}

          <h3>${escapeHTML(place.name)}</h3>

          <p>${escapeHTML(place.description)}</p>

          ${place.notes.length
            ? `
              <div class="pgp-note">
                <strong>Before you go:</strong>
                ${escapeHTML(place.notes.join(" · "))}
              </div>
            `
            : `
              <span class="pgp-tag">
                MATCHES SELECTED PREFERENCES
              </span>
            `}

          <div class="pgp-actions">
            <button
              class="pgp-btn"
              data-detail="${escapeHTML(place.id)}"
            >
              DETAILS ↗
            </button>

            <button
              class="pgp-btn pgp-secondary"
              data-save="${escapeHTML(place.id)}"
            >
              ${saved.has(place.id) ? "♥ SAVED" : "♡ SAVE"}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function bindResultCards() {
    document.querySelectorAll("[data-detail]").forEach(button => {
      button.onclick = () => detail(button.dataset.detail);
    });

    document.querySelectorAll("[data-save]").forEach(button => {
      button.onclick = () => {
        const isSaved = toggleSaved(button.dataset.save);

        button.textContent = isSaved
          ? "♥ SAVED"
          : "♡ SAVE";

        toast(
          isSaved
            ? "Saved to your picks ♡"
            : "Removed from saved picks"
        );
      };
    });
  }

  // --------------------------------------------------
  // 10. SWIPE CARD
  // --------------------------------------------------

  function swipeCardHTML() {
    const place = state.results[state.swipeIndex];

    if (!place) {
      return `
        <div class="pgp-empty">
          <h2>YOU'VE SEEN EVERY PICK.</h2>

          <p>
            Check your saved places or explore another category.
          </p>

          <div class="pgp-actions">
            <button class="pgp-btn" id="viewSaved">
              ♡ VIEW SAVED
            </button>

            <button class="pgp-btn pgp-secondary" id="restart">
              START AGAIN ↗
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="match-stage">
        <div class="match-counter">
          PICK ${state.swipeIndex + 1}
          / ${state.results.length}
        </div>

        <div class="match-instructions">
          <span class="skip-label">
            ← LEFT = SKIP
          </span>

          <span class="save-label">
            RIGHT = SAVE →
          </span>
        </div>

        <article
          class="match-card ${place.category}"
          id="swipeCard"
        >
          <div
            class="swipe-indicator skip"
            id="skipIndicator"
          >
            ✕ SKIP
          </div>

          <div
            class="swipe-indicator save"
            id="saveIndicator"
          >
            ♥ SAVE
          </div>

          <div class="match-inner">
            <span class="match-score">
              ${place.score}% MATCH
            </span>

            ${place.exact
              ? '<span class="pgp-tag">MATCHES SELECTED PREFERENCES</span>'
              : '<span class="pgp-tag">CLOSEST ALTERNATIVE</span>'}

            <h2>${escapeHTML(place.name)}</h2>

            <p>${escapeHTML(place.description)}</p>

            ${place.hiddenGem
              ? '<span class="pgp-tag">✳ HIDDEN GEM</span>'
              : ""}

            <details class="match-explain">
              <summary>WHY THIS PICK? ↗</summary>

              ${place.reasons.length
                ? `
                  <p>
                    <strong>Matches:</strong><br>
                    ${place.reasons.map(escapeHTML).join("<br>")}
                  </p>
                `
                : ""}

              ${place.notes.length
                ? `
                  <p>
                    <strong>Important differences:</strong><br>
                    ${place.notes.map(escapeHTML).join("<br>")}
                  </p>
                `
                : ""}

              <p>
                Scores are based on questionnaire preferences,
                not ratings or live availability.
              </p>
            </details>

            <div class="pgp-actions">
              <button
                class="pgp-btn pgp-secondary"
                data-detail="${escapeHTML(place.id)}"
              >
                DETAILS ↗
              </button>

              <a
                class="pgp-btn pgp-secondary"
                href="${mapsURL(place)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                MAPS ↗
              </a>
            </div>
          </div>
        </article>

        <div class="match-actions">
          <button
            class="pgp-btn pgp-secondary"
            id="skipPick"
          >
            ✕ SKIP
          </button>

          <button
            class="pgp-btn"
            id="savePick"
          >
            ♥ SAVE
          </button>

          <button
            class="pgp-btn pgp-secondary"
            id="undoPick"
            ${state.history.length === 0 ? "disabled" : ""}
          >
            ↶ UNDO
          </button>
        </div>

        <p class="pgp-disclaimer" style="text-align:center">
          Drag the card left or right.
          You can also use the buttons.
        </p>
      </div>
    `;
  }

  // --------------------------------------------------
  // 11. SWIPE ANIMATIONS
  // --------------------------------------------------

  function animateSwipe(direction) {
    if (state.busy) return;

    const place = state.results[state.swipeIndex];
    const card = $("#swipeCard");

    if (!place || !card) return;

    state.busy = true;

    const keep = direction === "right";
    const multiplier = keep ? 1 : -1;

    card.style.transition =
      "transform 320ms cubic-bezier(.22,.61,.36,1), opacity 320ms ease";

    card.style.transform =
      `translate3d(${multiplier * (window.innerWidth + 350)}px, -35px, 0) rotate(${multiplier * 23}deg)`;

    card.style.opacity = "0";

    const indicator = keep
      ? $("#saveIndicator")
      : $("#skipIndicator");

    if (indicator) {
      indicator.style.opacity = "1";
    }

    setTimeout(() => {
      if (keep) {
        setSaved(place.id, true);
      }

      state.history.push({
        index: state.swipeIndex,
        id: place.id,
        previousSaved: saved.has(place.id) && !keep
      });

      state.swipeIndex++;
      state.busy = false;

      renderResults();

      if (keep) {
        toast("Saved to your picks ♡");
      }
    }, 320);
  }

  function undoSwipe() {
    if (state.busy) return;

    const previous = state.history.pop();

    if (!previous) return;

    state.swipeIndex = previous.index;

    if (previous.previousSaved) {
      setSaved(previous.id, true);
    } else {
      setSaved(previous.id, false);
    }

    renderResults();
    toast("Last swipe undone");
  }

  function enableDrag() {
    const card = $("#swipeCard");

    if (!card) return;

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;

    const skipIndicator = $("#skipIndicator");
    const saveIndicator = $("#saveIndicator");

    function resetCard() {
      card.style.transition =
        "transform 260ms ease, opacity 260ms ease";

      card.style.transform =
        "translate3d(0,0,0) rotate(0deg)";

      card.style.opacity = "1";

      card.classList.remove("dragging");

      skipIndicator.style.opacity = "0";
      saveIndicator.style.opacity = "0";
    }

    card.addEventListener("pointerdown", event => {
      if (state.busy) return;

      if (
        event.target.closest(
          "button, a, summary, details"
        )
      ) {
        return;
      }

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dragging = true;

      card.classList.add("dragging");
      card.style.transition = "none";

      if (card.setPointerCapture) {
        card.setPointerCapture(pointerId);
      }
    });

    card.addEventListener("pointermove", event => {
      if (!dragging || event.pointerId !== pointerId) {
        return;
      }

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (Math.abs(dy) > Math.abs(dx) * 1.5) {
        return;
      }

      const rotation = Math.max(
        -18,
        Math.min(18, dx / 18)
      );

      card.style.transform =
        `translate3d(${dx}px, ${Math.min(Math.abs(dx) / 8, 20)}px, 0) rotate(${rotation}deg)`;

      if (dx > 15) {
        saveIndicator.style.opacity =
          Math.min(1, dx / 110);

        skipIndicator.style.opacity = "0";
      } else if (dx < -15) {
        skipIndicator.style.opacity =
          Math.min(1, Math.abs(dx) / 110);

        saveIndicator.style.opacity = "0";
      } else {
        skipIndicator.style.opacity = "0";
        saveIndicator.style.opacity = "0";
      }
    });

    card.addEventListener("pointerup", event => {
      if (!dragging || event.pointerId !== pointerId) {
        return;
      }

      dragging = false;
      card.classList.remove("dragging");

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      pointerId = null;

      if (
        Math.abs(dx) >= 90 &&
        Math.abs(dx) > Math.abs(dy) * 1.2
      ) {
        animateSwipe(dx > 0 ? "right" : "left");
      } else {
        resetCard();
      }
    });

    card.addEventListener("pointercancel", () => {
      dragging = false;
      pointerId = null;
      resetCard();
    });
  }

  // --------------------------------------------------
  // 12. RESULTS PAGE
  // --------------------------------------------------

  function results() {
    state.results = rankPlaces();
    state.view = "swipe";
    state.swipeIndex = 0;
    state.history = [];
    state.busy = false;

    renderResults();
  }

  function renderResults() {
    const listMode = state.view === "list";
    const results = state.results;

    shell(`
      <button class="pgp-back" id="editAnswers">
        ← CHANGE MY ANSWERS
      </button>

      <div class="pgp-kicker">
        PGPR PICKS / YOUR SHORTLIST
      </div>

      <h1 class="pgp-title">
        YOUR PICKS ARE IN.
      </h1>

      <p class="pgp-lead">
        Places selected based on your questionnaire answers.
        Swipe through them or view the full list.
      </p>

      <div class="match-view-toggle">
        <button
          class="pgp-btn pgp-secondary"
          id="swipeView"
          aria-pressed="${!listMode}"
        >
          ↔ SWIPE MODE
        </button>

        <button
          class="pgp-btn pgp-secondary"
          id="listView"
          aria-pressed="${listMode}"
        >
          ☷ VIEW ALL
        </button>
      </div>

      ${listMode
        ? `
          <div class="pgp-grid">
            ${results.map(resultCard).join("")}
          </div>
        `
        : swipeCardHTML()}

      <p class="pgp-disclaimer">
        Match percentages indicate preference compatibility,
        not ratings or guaranteed availability.
        Please verify venue hours, prices, dietary suitability,
        and study-space access before visiting.
      </p>
    `);

    $("#editAnswers").onclick = () => {
      state.step = 0;
      quiz();
    };

    $("#swipeView").onclick = () => {
      state.view = "swipe";
      renderResults();
    };

    $("#listView").onclick = () => {
      state.view = "list";
      renderResults();
    };

    if (listMode) {
      bindResultCards();
      return;
    }

    const current = results[state.swipeIndex];

    if (!current) {
      $("#viewSaved").onclick = savedPage;

      $("#restart").onclick = () => {
        state.swipeIndex = 0;
        state.history = [];
        renderResults();
      };

      return;
    }

    document.querySelectorAll("[data-detail]").forEach(button => {
      button.onclick = () => {
        state.detailFrom = "results";
        detail(button.dataset.detail);
      };
    });

    $("#skipPick").onclick = () => animateSwipe("left");
    $("#savePick").onclick = () => animateSwipe("right");
    $("#undoPick").onclick = undoSwipe;

    enableDrag();
  }

  // --------------------------------------------------
  // 13. PLACE DETAILS
  // --------------------------------------------------

  function detail(id) {
    const place = places.find(item => item.id === id);

    if (!place) return;

    const fromSaved = state.detailFrom === "saved";

    shell(`
      <button class="pgp-back" id="backDetail">
        ← BACK TO PICKS
      </button>

      <div class="pgp-kicker">
        THE PGPR EDIT / ${escapeHTML(place.category.toUpperCase())}
      </div>

      <h1 class="pgp-title">
        ${escapeHTML(place.name)}
      </h1>

      <p class="pgp-lead">
        ${escapeHTML(place.description)}
      </p>

      <div class="pgp-meta">
        <div>
          <strong>LOCATION</strong>
          <p>${escapeHTML(place.location)}</p>
        </div>

        <div>
          <strong>ACCESS / HOURS</strong>
          <p>
            ${escapeHTML(
              place.accessDetails ||
              "Check the venue before visiting"
            )}
          </p>
        </div>
      </div>

      <p>
        ${escapeHTML(
          place.note ||
          "Please verify current details before leaving."
        )}
      </p>

      <div class="pgp-actions">
        <a
          class="pgp-btn"
          href="${mapsURL(place)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          PHOTOS & GOOGLE MAPS ↗
        </a>

        ${place.source
          ? `
            <a
              class="pgp-btn pgp-secondary"
              href="${escapeHTML(place.source)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              REFERENCE ↗
            </a>
          `
          : ""}

        <button
          class="pgp-btn pgp-secondary"
          id="detailSave"
        >
          ${saved.has(id) ? "♥ SAVED" : "♡ SAVE"}
        </button>

        <button
          class="pgp-btn pgp-secondary"
          id="detailShare"
        >
          SHARE ↗
        </button>
      </div>
    `);

    $("#backDetail").onclick = () => {
      if (fromSaved) {
        savedPage();
      } else {
        renderResults();
      }
    };

    $("#detailSave").onclick = () => {
      const isSaved = toggleSaved(id);

      $("#detailSave").textContent = isSaved
        ? "♥ SAVED"
        : "♡ SAVE";

      toast(
        isSaved
          ? "Saved to your picks ♡"
          : "Removed from saved picks"
      );
    };

    $("#detailShare").onclick = () => sharePlace(place);
  }

  // --------------------------------------------------
  // 14. SAVED PLACES
  // --------------------------------------------------

  function savedPage() {
    state.category = null;

    const list = places.filter(place => saved.has(place.id));

    shell(`
      <button class="pgp-back" id="backHome">
        ← HOME
      </button>

      <h1 class="pgp-title">
        SAVED PICKS ♡
      </h1>

      ${list.length
        ? `
          <div class="pgp-grid">
            ${list.map(place => `
              <article class="pgp-card">
                <div class="pgp-card-body">
                  <h3>${escapeHTML(place.name)}</h3>

                  <p>${escapeHTML(place.description)}</p>

                  <div class="pgp-actions">
                    <button
                      class="pgp-btn"
                      data-detail="${escapeHTML(place.id)}"
                    >
                      DETAILS ↗
                    </button>

                    <button
                      class="pgp-btn pgp-secondary"
                      data-remove="${escapeHTML(place.id)}"
                    >
                      ♥ REMOVE
                    </button>
                  </div>
                </div>
              </article>
            `).join("")}
          </div>
        `
        : `
          <div class="pgp-empty">
            <h2>NOTHING SAVED YET.</h2>
            <p>
              Explore some places and save the ones you like.
            </p>

            <button class="pgp-btn" id="explore">
              EXPLORE PICKS ↗
            </button>
          </div>
        `}
    `);

    $("#backHome").onclick = home;

    const explore = $("#explore");

    if (explore) explore.onclick = home;

    document.querySelectorAll("[data-detail]").forEach(button => {
      button.onclick = () => {
        state.detailFrom = "saved";
        detail(button.dataset.detail);
      };
    });

    document.querySelectorAll("[data-remove]").forEach(button => {
      button.onclick = () => {
        setSaved(button.dataset.remove, false);
        savedPage();
      };
    });
  }

  // --------------------------------------------------
  // 15. INITIALISE
  // --------------------------------------------------

  const homeLink = $("#homeLink");
  const savedButton = $("#savedBtn");

  if (homeLink) homeLink.onclick = home;
  if (savedButton) savedButton.onclick = savedPage;

  saveSync();
  home();

})();
