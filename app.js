
/*
  PGPR PICKS V12
  Discover, Shortlist, Decide
  Replace your entire app.js with this script.
  Requires existing index.html and places.js.
*/

(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const app = $("#app");

  if (!app) {
    console.error("PGPR Picks requires #app");
    return;
  }

  const places = Array.isArray(window.PLACES)
    ? window.PLACES
    : typeof PLACES !== "undefined" && Array.isArray(PLACES)
      ? PLACES
      : [];

  const KEY = "pgpr-picks-saved";

  let saved;
  try {
    saved = new Set(JSON.parse(
      localStorage.getItem(KEY) ||
      localStorage.getItem("pgp-picks-saved") ||
      "[]"
    ));
  } catch {
    saved = new Set();
  }

  const state = {
    category: null,
    answers: {},
    step: 0,
    ranked: [],
    start: 0,
    index: 0,
    liked: [],
    history: [],
    view: "swipe",
    busy: false,
    detailReturn: null
  };

  // Editorial photos only.
  // Recommendation cards do not use placeholder photos.

  const photos = {
    hero: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80",
    eat: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    focus: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
    escape: "https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=900&q=80"
  };

  // Consistent SVG icons instead of emoji-style arrows.

  function icon(name) {
    const paths = {
      up: '<path d="M7 17 17 7M7 7h10v10"/>',
      left: '<path d="m15 18-6-6 6-6"/>',
      right: '<path d="m9 18 6-6-6-6"/>',
      heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
      x: '<path d="M18 6 6 18M6 6l12 12"/>',
      undo: '<path d="M9 14 4 9l5-5M4 9h10a6 6 0 1 1 0 12h-2"/>'
    };

    return `
      <svg
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        ${paths[name] || paths.up}
      </svg>
    `;
  }

  const e = value => String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]
  );

  const maps = p =>
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      p.name + " " + (p.location || "Singapore")
    );

  const btn = (text, id, cls = "") =>
    `<button class="pick-btn ${cls}" id="${id}">${text}</button>`;

  function sync() {
    try {
      localStorage.setItem(KEY, JSON.stringify([...saved]));
    } catch {}

    const el = $("#savedCount");
    if (el) el.textContent = saved.size;
  }

  function toast(message) {
    document.querySelector(".pick-toast")?.remove();

    const el = document.createElement("div");
    el.className = "pick-toast";
    el.textContent = message;
    document.body.append(el);

    setTimeout(() => el.remove(), 1800);
  }

  function shell(html) {
    app.innerHTML = `<div class="pick-wrap">${html}</div>`;
    window.scrollTo(0, 0);
  }

  // QUESTIONNAIRES

  const qs = {
    eat: [
      [
        "budget",
        "What is your budget?",
        [
          ["5", "Under $5"],
          ["10", "$5 to $10"],
          ["20", "$10 to $20"],
          ["999", "Over $20"]
        ]
      ],
      [
        "craving",
        "What are we craving?",
        [
          ["local", "Local favourites"],
          ["spicy", "Spicy food"],
          ["hearty", "Comfort food"],
          ["light", "Something light"],
          ["sweet", "Desserts and cafes"],
          ["any", "Surprise me"]
        ]
      ],
      [
        "distance",
        "How far are we going?",
        [
          ["0", "At PGPR"],
          ["1", "On campus"],
          ["2", "Nearby"],
          ["3", "Anywhere worth the trip"]
        ]
      ]
    ],

    focus: [
      [
        "noise",
        "Your ideal study atmosphere?",
        [
          ["quiet", "Quiet library"],
          ["buzz", "Background noise"],
          ["group", "Group discussion"],
          ["outdoor", "Open air"]
        ]
      ],
      [
        "facilities",
        "What do you need?",
        [
          ["power", "Charging points"],
          ["aircon", "Air conditioning"],
          ["late", "Late-night access"],
          ["group", "Group space"],
          ["food", "Food nearby"]
        ],
        true
      ],
      [
        "when",
        "When are you studying?",
        [
          ["day", "During the day"],
          ["evening", "Evening"],
          ["late", "After midnight"]
        ]
      ]
    ],

    escape: [
      [
        "time",
        "How much free time?",
        [
          ["30", "15 to 30 minutes"],
          ["120", "1 to 2 hours"],
          ["240", "Half a day"],
          ["999", "All day"]
        ]
      ],
      [
        "budget",
        "What is your budget?",
        [
          ["0", "Free"],
          ["10", "Under $10"],
          ["30", "$10 to $30"],
          ["999", "Over $30"]
        ]
      ],
      [
        "mood",
        "What sounds fun?",
        [
          ["nature", "Nature"],
          ["explore", "Explore somewhere new"],
          ["friends", "Games with friends"],
          ["arts", "Arts and culture"],
          ["sweet", "Cafes and treats"],
          ["any", "Surprise me"]
        ]
      ]
    ]
  };

  // STYLING

  const css = document.createElement("style");

  css.textContent = `
    .pick-wrap {
      max-width: 1050px;
      margin: auto;
      padding: 28px 18px 70px;
      color: #172b50;
      font-family: "DM Sans", Arial, sans-serif;
    }

    .pick-wrap * {
      box-sizing: border-box;
    }

    .pick-title {
      font: 800 clamp(36px,7vw,78px)/1.02
        "Space Grotesk", Arial, sans-serif;
      letter-spacing: -.055em;
      margin: 18px 0;
    }

    .pick-kicker {
      font: 700 12px "IBM Plex Mono", monospace;
      letter-spacing: .06em;
    }

    .pick-lead {
      font-size: 18px;
      line-height: 1.55;
      max-width: 620px;
    }

    .pick-btn {
      display: inline-flex;
      gap: 7px;
      align-items: center;
      justify-content: center;
      background: #f26943;
      color: white;
      border: 2px solid #172b50;
      border-radius: 50px;
      padding: 12px 19px;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      text-decoration: none;
      min-height: 44px;
    }

    .pick-btn.alt {
      background: #fffaf1;
      color: #172b50;
    }

    .pick-btn[disabled] {
      opacity: .4;
      cursor: not-allowed;
    }

    .pick-btn:focus-visible,
    .pick-option:focus-visible {
      outline: 3px solid #2b75b8;
      outline-offset: 3px;
    }

    .pick-btn svg {
      flex-shrink: 0;
    }

    .pick-hero {
      background: #f6b38c;
      padding: clamp(22px,5vw,55px);
      margin-bottom: 36px;
    }

    .pick-hero img {
      width: 100%;
      height: 225px;
      object-fit: cover;
      display: block;
      margin-top: 22px;
    }

    .pick-grid {
      display: grid;
      grid-template-columns: repeat(3,minmax(0,1fr));
      gap: 15px;
      margin: 20px 0;
    }

    .pick-tile {
      border: 0;
      text-align: left;
      background: #fffaf1;
      color: #172b50;
      padding: 0 0 18px;
      cursor: pointer;
    }

    .pick-tile img {
      width: 100%;
      height: 210px;
      object-fit: cover;
      display: block;
    }

    .pick-tile strong {
      display: block;
      font-size: 28px;
      padding: 14px 14px 4px;
    }

    .pick-tile small {
      padding: 0 14px;
    }

    .pick-panel {
      background: #fffaf1;
      border: 1px solid #ded1be;
      padding: clamp(20px,4vw,40px);
      margin: 20px 0;
    }

    .pick-options {
      display: grid;
      grid-template-columns: repeat(2,1fr);
      gap: 10px;
      margin: 25px 0;
    }

    .pick-option {
      padding: 16px;
      text-align: left;
      background: #fffaf1;
      border: 2px solid #172b50;
      border-radius: 8px;
      color: #172b50;
      font-weight: 700;
      cursor: pointer;
    }

    .pick-option[aria-pressed="true"] {
      background: #dce9b5;
    }

    .pick-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin: 18px 0;
    }

    .pick-back {
      border: 0;
      background: none;
      color: #172b50;
      font-weight: 700;
      cursor: pointer;
      padding: 10px 0;
    }

    .pick-muted {
      color: #596474;
      font-size: 13px;
      line-height: 1.55;
    }

    .pick-tag {
      display: inline-block;
      background: #fffaf1;
      padding: 8px 11px;
      font: 700 12px "IBM Plex Mono", monospace;
    }

    .pick-warning {
      background: #fff0cf;
      padding: 12px;
      margin: 12px 0;
      font-size: 13px;
    }

    .pick-stage {
      max-width: 510px;
      margin: 22px auto;
    }

    .pick-directions {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      font-weight: 800;
      margin: 14px 0;
    }

    .pick-directions .pass {
      color: #a53d3d;
    }

    .pick-directions .save {
      color: #287a4b;
    }

    .pick-card {
      position: relative;
      overflow: hidden;
      touch-action: pan-y;
      user-select: none;
      cursor: grab;
      border: 2px solid #172b50;
      box-shadow: 8px 8px #172b50;
      background: #f4c4a5;
      padding: 25px;
      will-change: transform;
    }

    .pick-card.focus {
      background: #dce9b5;
    }

    .pick-card.escape {
      background: #f2c4d3;
    }

    .pick-card h2 {
      font: 800 clamp(28px,5vw,42px)/1.05
        "Space Grotesk", Arial, sans-serif;
      overflow-wrap: anywhere;
    }

    .pick-card details {
      margin: 16px 0;
    }

    .pick-card summary {
      cursor: pointer;
      font-weight: 800;
    }

    .pick-stamp {
      position: absolute;
      right: 15px;
      top: 15px;
      border: 4px solid currentColor;
      padding: 8px;
      background: #fff;
      font-weight: 900;
      font-size: 22px;
      opacity: 0;
      pointer-events: none;
    }

    .pick-stamp.pass {
      color: #a53d3d;
    }

    .pick-stamp.save {
      color: #287a4b;
    }

    .pick-card .pick-row {
      position: relative;
      z-index: 1;
    }

    .pick-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
      margin: 24px 0;
    }

    .pick-counter {
      text-align: center;
      font: 700 12px "IBM Plex Mono", monospace;
      margin: 12px 0;
    }

    .pick-result {
      background: #fffaf1;
      border: 1px solid #d8cbb9;
      padding: 20px;
    }

    .pick-result h3 {
      font-size: 23px;
      margin: 10px 0;
    }

    .pick-feature {
      background: #dce9b5;
      padding: 25px;
      margin: 18px 0;
    }

    .pick-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #172b50;
      color: #fff;
      padding: 14px 22px;
      border-radius: 30px;
      z-index: 9999;
      white-space: nowrap;
    }

    @media(max-width:720px) {
      .pick-grid,
      .pick-options {
        grid-template-columns: 1fr;
      }

      .pick-hero img {
        height: 160px;
      }

      .pick-tile img {
        height: 170px;
      }

      .pick-card {
        padding: 20px;
      }

      .pick-wrap {
        padding: 20px 15px 60px;
      }
    }

    @media(prefers-reduced-motion:reduce) {
      .pick-card {
        transition-duration: .01ms !important;
      }
    }
  `;

  document.head.append(css);

  // HOMEPAGE

  function home() {
    state.category = null;

    shell(`
      <section class="pick-hero">
        <div class="pick-kicker">
          PGPR PICKS / FINALS SURVIVAL GUIDE
        </div>

        <h1 class="pick-title">
          TOO MUCH STUDYING.<br>
          NOT ENOUGH LIVING.
        </h1>

        <p class="pick-lead">
          Good food, better study spots and little escapes,
          curated for PGPR residents.
        </p>

        ${btn("FIND YOUR PICK " + icon("right"), "start")}

        <img
          src="${photos.hero}"
          alt="Lifestyle editorial photograph"
        >
      </section>

      <h2>SO, WHAT IS THE PLAN?</h2>

      <div class="pick-grid">
        ${[
          ["eat", "EAT", "Find something good"],
          ["focus", "FOCUS", "Find a study spot"],
          ["escape", "ESCAPE", "Take a proper break"]
        ].map(([key, name, description]) => `
          <button class="pick-tile" data-cat="${key}">
            <img
              src="${photos[key]}"
              alt="${name} editorial photograph"
            >
            <strong>${name} ${icon("up")}</strong>
            <small>${description}</small>
          </button>
        `).join("")}
      </div>

      <p class="pick-muted">
        Category photographs are editorial.
        Actual venue photographs can be viewed on Google Maps.
      </p>
    `);

    $("#start").onclick = () =>
      $(".pick-grid").scrollIntoView({
        behavior: "smooth"
      });

    document.querySelectorAll("[data-cat]").forEach(button => {
      button.onclick = () => start(button.dataset.cat);
    });
  }

  function start(category) {
    state.category = category;
    state.answers = {};
    state.step = 0;
    quiz();
  }

  // QUESTIONNAIRE

  function quiz() {
    const q = qs[state.category]?.[state.step];

    if (!q) {
      prepare();
      return;
    }

    const [key, title, options, multi] = q;
    const value = state.answers[key];

    shell(`
      <button class="pick-back" id="back">
        ${icon("left")} BACK
      </button>

      <section class="pick-panel">
        <div class="pick-kicker">
          ${state.category.toUpperCase()}
          / QUESTION ${state.step + 1}
        </div>

        <h1 class="pick-title">${e(title)}</h1>

        ${multi ? "<p>Select all that apply.</p>" : ""}

        <div class="pick-options">
          ${options.map(([v, label]) => {
            const active = multi
              ? (value || []).includes(v)
              : value === v;

            return `
              <button
                class="pick-option"
                data-answer="${v}"
                aria-pressed="${active}"
              >
                ${e(label)}
              </button>
            `;
          }).join("")}
        </div>

        ${btn(
          state.step === 2
            ? "FIND MY PICKS " + icon("up")
            : "NEXT " + icon("right"),
          "next"
        )}
      </section>
    `);

    $("#back").onclick = () => {
      if (state.step) {
        state.step--;
        quiz();
      } else {
        home();
      }
    };

    document.querySelectorAll("[data-answer]").forEach(button => {
      button.onclick = () => {
        const v = button.dataset.answer;

        if (multi) {
          const old = state.answers[key] || [];

          state.answers[key] = old.includes(v)
            ? old.filter(x => x !== v)
            : [...old, v];
        } else {
          state.answers[key] = v;
        }

        quiz();
      };
    });

    $("#next").onclick = () => {
      if (!multi && !state.answers[key]) {
        toast("Choose an answer first");
        return;
      }

      state.step++;

      if (state.step < 3) {
        quiz();
      } else {
        prepare();
      }
    };
  }

  // MATCHING

  function lateOK(p) {
    if (
      p.category !== "focus" ||
      p.accessStatus !== "official"
    ) {
      return false;
    }

    if (p.accessMode === "always") return true;

    if (p.accessMode === "exam") {
      return Date.now() <= new Date(
        "2026-12-04T23:59:59+08:00"
      ).getTime();
    }

    return false;
  }

  function facility(p, requirement) {
    if (requirement === "late") {
      return lateOK(p);
    }

    if (requirement === "power") {
      return (p.verifiedFacilities || []).includes("power");
    }

    return (p.tags || []).includes(requirement);
  }

  function score(p) {
    const a = state.answers;
    const tags = p.tags || [];

    let points = 0;
    const good = [];
    const bad = [];

    function add(ok, weight, yes, no) {
      if (ok) {
        points += weight;
        if (yes) good.push(yes);
      } else if (no) {
        bad.push(no);
      }
    }

    if (state.category === "eat") {
      add(
        a.craving === "any" || tags.includes(a.craving),
        40,
        "Matches your craving"
      );

      add(
        Number(p.budget) <= Number(a.budget),
        35,
        "Within your budget",
        "Estimated cost may exceed your budget"
      );

      add(
        Number(p.distance) <= Number(a.distance),
        25,
        "Within your travel range",
        "Farther than preferred"
      );
    }

    if (state.category === "escape") {
      add(
        a.mood === "any" || tags.includes(a.mood),
        40,
        "Matches your activity interest"
      );

      add(
        Number(p.budget) <= Number(a.budget),
        30,
        "Within your budget",
        "Estimated cost may exceed your budget"
      );

      add(
        Number(p.minutes) <= Number(a.time),
        30,
        "Fits your available time",
        "May take longer than planned"
      );
    }

    if (state.category === "focus") {
      add(
        tags.includes(a.noise),
        35,
        "Matches your study atmosphere",
        "Different study atmosphere"
      );

      const requirements = a.facilities || [];

      if (!requirements.length) {
        points += 40;
      }

      for (const requirement of requirements) {
        add(
          facility(p, requirement),
          40 / requirements.length,
          "Matches " + requirement,
          (
            requirement === "late"
              ? "Late-night access"
              : requirement === "power"
                ? "Charging points"
                : requirement
          ) + " not verified"
        );
      }

      if (
        a.when === "late" ||
        requirements.includes("late")
      ) {
        add(
          lateOK(p),
          25,
          "Documented late-night access",
          "Late-night access not verified"
        );
      } else {
        points += 25;
      }
    }

    return {
      ...p,
      score: Math.round(points),
      good,
      bad,
      exact: bad.length === 0
    };
  }

  function prepare() {
    state.ranked = places
      .filter(p => p.category === state.category)
      .map(score)
      .sort((a, b) =>
        Number(b.exact) - Number(a.exact) ||
        b.score - a.score ||
        (a.distance || 0) - (b.distance || 0)
      );

    state.start = 0;
    state.index = 0;
    state.liked = [];
    state.history = [];
    state.view = "swipe";
    state.busy = false;

    render();
  }

  // DISCOVERY BATCHES

  const batch = () =>
    state.ranked.slice(state.start, state.start + 5);

  const current = () =>
    batch()[state.index];

  const shortlist = () =>
    state.ranked.filter(p => state.liked.includes(p.id));

  function resultCard(p) {
    return `
      <article class="pick-result">
        <span class="pick-tag">
          ${p.score}% PREFERENCE MATCH
        </span>

        <h3>${e(p.name)}</h3>
        <p>${e(p.description)}</p>

        ${p.bad.length
          ? `
            <p class="pick-warning">
              Check: ${e(p.bad.join("; "))}
            </p>
          `
          : ""}

        <div class="pick-row">
          <button
            class="pick-btn alt"
            data-detail="${e(p.id)}"
          >
            DETAILS ${icon("up")}
          </button>

          <button
            class="pick-btn"
            data-add="${e(p.id)}"
          >
            ${state.liked.includes(p.id)
              ? "ADDED"
              : "ADD TO SHORTLIST"}
          </button>
        </div>
      </article>
    `;
  }

  // SWIPE CARD

  function swipeHTML() {
    const p = current();

    if (!p) {
      return `
        <section class="pick-panel">
          <h2>READY FOR MORE?</h2>

          <p>
            Review your shortlist or discover more places.
          </p>

          <div class="pick-row">
            ${btn("VIEW MY SHORTLIST", "finish")}
            ${btn(
              "DISCOVER MORE " + icon("right"),
              "more",
              "alt"
            )}
          </div>
        </section>
      `;
    }

    return `
      <div class="pick-stage">
        <div class="pick-counter">
          PICK ${String(
            state.start + state.index + 1
          ).padStart(2, "0")}
        </div>

        <div class="pick-directions">
          <span class="pass">
            ${icon("left")} LEFT: SKIP
          </span>

          <span class="save">
            RIGHT: SAVE ${icon("right")}
          </span>
        </div>

        <article
          id="swipeCard"
          class="pick-card ${p.category}"
        >
          <div
            class="pick-stamp pass"
            id="passStamp"
          >
            SKIP
          </div>

          <div
            class="pick-stamp save"
            id="saveStamp"
          >
            SAVE
          </div>

          <span class="pick-tag">
            ${p.score}% MATCH
          </span>

          ${p.hiddenGem
            ? '<span class="pick-tag">HIDDEN GEM</span>'
            : ""}

          <h2>${e(p.name)}</h2>

          <p>${e(p.description)}</p>

          <details>
            <summary>WHY THIS PICK?</summary>

            <p>
              ${e(
                p.good.join("; ") ||
                "Based on your selected preferences"
              )}
            </p>

            ${p.bad.length
              ? `
                <p class="pick-warning">
                  Check: ${e(p.bad.join("; "))}
                </p>
              `
              : ""}
          </details>

          <div class="pick-row">
            <button
              class="pick-btn alt"
              data-detail="${e(p.id)}"
            >
              DETAILS ${icon("up")}
            </button>

            <a
              class="pick-btn alt"
              href="${maps(p)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              MAPS ${icon("up")}
            </a>
          </div>
        </article>

        <div class="pick-actions">
          ${btn(icon("x") + " SKIP", "skip", "alt")}
          ${btn(icon("heart") + " SAVE", "save")}
          ${btn(icon("undo") + " UNDO", "undo", "alt")}
        </div>

        <div style="text-align:center">
          ${btn(
            "DONE? VIEW MY SHORTLIST (" +
            state.liked.length + ")",
            "finish",
            "alt"
          )}
        </div>

        <p
          class="pick-muted"
          style="text-align:center"
        >
          Drag left to skip or right to save.
          Buttons work too.
        </p>
      </div>
    `;
  }

  // RESULTS PAGE

  function render() {
    const list = state.view === "list";

    shell(`
      <button class="pick-back" id="edit">
        ${icon("left")} CHANGE ANSWERS
      </button>

      <div class="pick-kicker">
        PGPR PICKS / DISCOVER
      </div>

      <h1 class="pick-title">
        YOUR PICKS ARE IN.
      </h1>

      <p class="pick-lead">
        Explore recommendations based on your preferences.
        Save the places you like, then decide where to go.
      </p>

      <div class="pick-row">
        ${btn(
          "SWIPE MODE",
          "swipeView",
          list ? "alt" : ""
        )}

        ${btn(
          "EXPLORE ALL PICKS",
          "listView",
          list ? "" : "alt"
        )}

        ${btn(
          "MY SHORTLIST (" + state.liked.length + ")",
          "shortlist",
          "alt"
        )}
      </div>

      ${list
        ? `
          <div class="pick-grid">
            ${state.ranked.map(resultCard).join("")}
          </div>
        `
        : swipeHTML()}

      <p class="pick-muted">
        Scores reflect questionnaire preferences,
        not reviews or live availability.
        Verify opening hours, prices, dietary needs
        and access before visiting.
      </p>
    `);

    $("#edit").onclick = () => {
      state.step = 0;
      quiz();
    };

    $("#swipeView").onclick = () => {
      state.view = "swipe";
      render();
    };

    $("#listView").onclick = () => {
      state.view = "list";
      render();
    };

    $("#shortlist").onclick = finalPage;

    document.querySelectorAll("[data-detail]").forEach(b => {
      b.onclick = () =>
        detail(b.dataset.detail, "results");
    });

    document.querySelectorAll('[id^="detail-"]').forEach(b => {
      b.onclick = () =>
        detail(b.id.slice(7), "results");
    });

    document.querySelectorAll("[data-add]").forEach(b => {
      b.onclick = () => {
        const id = b.dataset.add;

        state.liked = state.liked.includes(id)
          ? state.liked.filter(x => x !== id)
          : [...state.liked, id];

        render();
      };
    });

    if (list) return;

    if (!current()) {
      $("#finish").onclick = finalPage;
      $("#more").onclick = nextBatch;
      return;
    }

    $("#skip").onclick = () => swipe(false);
    $("#save").onclick = () => swipe(true);
    $("#undo").onclick = undo;
    $("#finish").onclick = finalPage;

    $("#undo").disabled = !state.history.length;

    drag();
  }

  // ANIMATED SWIPING

  function swipe(keep) {
    if (state.busy) return;

    const p = current();
    const el = $("#swipeCard");

    if (!p || !el) return;

    state.busy = true;

    const direction = keep ? 1 : -1;
    const stamp = $(
      keep ? "#saveStamp" : "#passStamp"
    );

    stamp.style.opacity = "1";

    el.style.transition =
      "transform 300ms ease, opacity 300ms ease";

    el.style.transform = `
      translateX(${direction * (window.innerWidth + 400)}px)
      rotate(${direction * 23}deg)
    `;

    el.style.opacity = "0";

    setTimeout(() => {
      state.history.push({
        index: state.index,
        id: p.id,
        wasLiked: state.liked.includes(p.id)
      });

      if (keep && !state.liked.includes(p.id)) {
        state.liked.push(p.id);
      }

      state.index++;
      state.busy = false;

      render();

      if (keep) {
        toast("Added to your shortlist");
      }
    }, 300);
  }

  function undo() {
    if (state.busy) return;

    const last = state.history.pop();
    if (!last) return;

    state.index = last.index;

    if (!last.wasLiked) {
      state.liked = state.liked.filter(
        id => id !== last.id
      );
    }

    render();
  }

  function drag() {
    const el = $("#swipeCard");
    if (!el) return;

    let x = 0;
    let y = 0;
    let id = null;
    let active = false;

    function reset() {
      active = false;
      id = null;

      el.style.transition = "transform 200ms ease";
      el.style.transform =
        "translateX(0) rotate(0)";

      $("#passStamp").style.opacity = "0";
      $("#saveStamp").style.opacity = "0";
    }

    el.addEventListener("pointerdown", event => {
      if (
        state.busy ||
        event.target.closest(
          "button,a,details,summary"
        )
      ) {
        return;
      }

      x = event.clientX;
      y = event.clientY;
      id = event.pointerId;
      active = true;

      el.style.transition = "none";
      el.setPointerCapture(id);
    });

    el.addEventListener("pointermove", event => {
      if (
        !active ||
        event.pointerId !== id
      ) {
        return;
      }

      const dx = event.clientX - x;
      const dy = event.clientY - y;

      if (
        Math.abs(dy) > Math.abs(dx) * 1.5
      ) {
        return;
      }

      const rotation = Math.max(
        -18,
        Math.min(18, dx / 18)
      );

      el.style.transform = `
        translateX(${dx}px)
        rotate(${rotation}deg)
      `;

      $("#passStamp").style.opacity =
        dx < -15
          ? Math.min(1, -dx / 100)
          : 0;

      $("#saveStamp").style.opacity =
        dx > 15
          ? Math.min(1, dx / 100)
          : 0;
    });

    el.addEventListener("pointerup", event => {
      if (
        !active ||
        event.pointerId !== id
      ) {
        return;
      }

      const dx = event.clientX - x;
      const dy = event.clientY - y;

      active = false;
      id = null;

      if (
        Math.abs(dx) > 90 &&
        Math.abs(dx) > Math.abs(dy) * 1.2
      ) {
        swipe(dx > 0);
      } else {
        reset();
      }
    });

    el.addEventListener("pointercancel", reset);
  }

  // DISCOVER MORE

  function nextBatch() {
    const next = state.start + 5;

    if (next >= state.ranked.length) {
      toast(
        "Try changing your preferences to discover different places"
      );
      finalPage();
      return;
    }

    state.start = next;
    state.index = 0;
    state.history = [];
    state.view = "swipe";

    render();
  }

  // FINAL SHORTLIST

  function finalPage() {
    const liked = shortlist();
    const best = liked[0];

    shell(`
      <button class="pick-back" id="back">
        ${icon("left")} BACK TO DISCOVERY
      </button>

      <div class="pick-kicker">
        PGPR PICKS / YOUR SHORTLIST
      </div>

      <h1 class="pick-title">
        ${liked.length
          ? "YOUR SHORTLIST."
          : "NOTHING CAUGHT YOUR EYE?"}
      </h1>

      ${liked.length
        ? `
          <p class="pick-lead">
            You selected ${liked.length}
            place${liked.length === 1 ? "" : "s"}.
            Here is your highest-scoring pick.
          </p>

          <section class="pick-feature">
            <div class="pick-kicker">
              TOP SAVED MATCH
            </div>

            <h2>${e(best.name)}</h2>

            <span class="pick-tag">
              ${best.score}% MATCH
            </span>

            <p>${e(best.description)}</p>

            <div class="pick-row">
              <a
                class="pick-btn"
                href="${maps(best)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                OPEN MAPS ${icon("up")}
              </a>

              <button
                class="pick-btn alt"
                data-detail="${e(best.id)}"
              >
                DETAILS
              </button>
            </div>
          </section>

          ${liked.slice(1).map(resultCard).join("")}
        `
        : `
          <p class="pick-lead">
            You can discover more or explore
            the full list.
          </p>

          ${state.ranked[0]
            ? `
              <section class="pick-feature">
                <div class="pick-kicker">
                  HIGHEST-RANKED SUGGESTION
                </div>

                <h2>
                  ${e(state.ranked[0].name)}
                </h2>

                <p>
                  ${e(state.ranked[0].description)}
                </p>

                <button
                  class="pick-btn alt"
                  data-detail="${e(state.ranked[0].id)}"
                >
                  DETAILS
                </button>
              </section>
            `
            : ""}
        `}

      <div class="pick-row">
        ${btn("DISCOVER MORE", "more")}
        ${btn("EXPLORE ALL PICKS", "browse", "alt")}
        ${btn("SHARE SHORTLIST", "share", "alt")}
      </div>
    `);

    $("#back").onclick = render;
    $("#more").onclick = nextBatch;

    $("#browse").onclick = () => {
      state.view = "list";
      render();
    };

    $("#share").onclick = () =>
      share(
        liked.map(
          p => p.name + ": " + maps(p)
        ).join("\n")
      );

    document.querySelectorAll("[data-detail]").forEach(b => {
      b.onclick = () =>
        detail(b.dataset.detail, "final");
    });

    document.querySelectorAll("[data-add]").forEach(b => {
      b.onclick = () => {
        const id = b.dataset.add;

        state.liked = state.liked.includes(id)
          ? state.liked.filter(x => x !== id)
          : [...state.liked, id];

        finalPage();
      };
    });
  }

  // SHARING

  function share(text) {
    if (!text) {
      toast("No places selected yet");
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: "PGPR Picks",
        text
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => toast("Copied to clipboard"))
        .catch(() => toast("Copy unavailable"));
    } else {
      toast("Sharing unavailable");
    }
  }

  // PLACE DETAILS

  function detail(id, origin) {
    const p = places.find(
      x => String(x.id) === String(id)
    );

    if (!p) return;

    state.detailReturn = origin;

    shell(`
      <button class="pick-back" id="back">
        ${icon("left")} BACK
      </button>

      <div class="pick-kicker">
        THE PGPR EDIT / ${e(p.category).toUpperCase()}
      </div>

      <h1 class="pick-title">
        ${e(p.name)}
      </h1>

      <p class="pick-lead">
        ${e(p.description)}
      </p>

      <section class="pick-panel">
        <p>
          <strong>LOCATION</strong>
          <br>
          ${e(p.location)}
        </p>

        <p>
          <strong>ACCESS AND HOURS</strong>
          <br>
          ${e(p.accessDetails || "Check with the venue")}
        </p>

        <p>
          ${e(
            p.note ||
            "Verify details before visiting."
          )}
        </p>
      </section>

      <div class="pick-row">
        <a
          class="pick-btn"
          href="${maps(p)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          GOOGLE MAPS ${icon("up")}
        </a>

        ${p.source
          ? `
            <a
              class="pick-btn alt"
              href="${e(p.source)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              REFERENCE ${icon("up")}
            </a>
          `
          : ""}

        ${btn(
          saved.has(p.id)
            ? "SAVED"
            : "SAVE PLACE",
          "savePlace",
          "alt"
        )}
      </div>
    `);

    $("#back").onclick =
      origin === "saved"
        ? savedPage
        : origin === "final"
          ? finalPage
          : render;

    $("#savePlace").onclick = () => {
      if (saved.has(p.id)) {
        saved.delete(p.id);
      } else {
        saved.add(p.id);
      }

      sync();

      $("#savePlace").textContent =
        saved.has(p.id)
          ? "SAVED"
          : "SAVE PLACE";
    };
  }

  // SAVED PLACES

  function savedPage() {
    const arr = places.filter(
      p => saved.has(p.id)
    );

    shell(`
      <button class="pick-back" id="back">
        ${icon("left")} HOME
      </button>

      <h1 class="pick-title">
        SAVED PLACES.
      </h1>

      ${arr.length
        ? `
          <div class="pick-grid">
            ${arr.map(p => `
              <article class="pick-result">
                <h3>${e(p.name)}</h3>
                <p>${e(p.description)}</p>

                <div class="pick-row">
                  <button
                    class="pick-btn"
                    data-detail="${e(p.id)}"
                  >
                    DETAILS
                  </button>

                  <button
                    class="pick-btn alt"
                    data-remove="${e(p.id)}"
                  >
                    REMOVE
                  </button>
                </div>
              </article>
            `).join("")}
          </div>
        `
        : `
          <p>No saved places yet.</p>
        `}
    `);

    $("#back").onclick = home;

    document.querySelectorAll("[data-detail]").forEach(b => {
      b.onclick = () =>
        detail(b.dataset.detail, "saved");
    });

    document.querySelectorAll("[data-remove]").forEach(b => {
      b.onclick = () => {
        saved.delete(b.dataset.remove);
        sync();
        savedPage();
      };
    });
  }

  // INITIALISE

  const homeLink = $("#homeLink");
  const savedBtn = $("#savedBtn");

  if (homeLink) {
    homeLink.onclick = home;
  }

  if (savedBtn) {
    savedBtn.onclick = savedPage;
  }

  sync();
  home();

})();
