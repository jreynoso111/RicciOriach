// Browser-independent checks for data filtering and resilient site interactions.
// Real layout, native dialogs and provider playback are checked in the browser.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(
  new URL("../assets/site.js", import.meta.url),
  "utf8",
);

class Element {
  constructor() {
    this.children = [];
    this.attributes = new Map();
    this.events = new Map();
    this.classes = new Set();
    this.dataset = {};
    this.open = false;
    this.hidden = false;
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name),
      toggle: (name, force) =>
        force ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  append(...elements) {
    this.children.push(...elements);
  }
  replaceChildren(...elements) {
    this.children = elements;
  }
  get childElementCount() {
    return this.children.length;
  }
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  getAttribute(name) {
    return this.attributes.get(name);
  }
  addEventListener(name, callback) {
    this.events.set(name, callback);
  }
  focus() {
    this.focused = true;
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
    this.events.get("close")?.();
  }
}

async function boot({
  selectors = [],
  stored = {},
  publicContent = { events: [], posts: [] },
  blockedStorage = false,
  reducedMotion = false,
} = {}) {
  const elements = Object.fromEntries(
    selectors.map((selector) => [selector, new Element()]),
  );
  const document = {
    documentElement: new Element(),
    body: new Element(),
    activeElement: new Element(),
    querySelector: (selector) => elements[selector] || null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => new Element(),
  };
  const timers = [];
  const storage = {
    getItem(key) {
      if (blockedStorage) throw new Error("Storage unavailable");
      return Object.hasOwn(stored, key) ? JSON.stringify(stored[key]) : null;
    },
    setItem() {
      if (blockedStorage) throw new Error("Storage unavailable");
    },
  };
  await runInNewContext(source, {
    AbortSignal,
    fetch: async () => ({ ok: true, json: async () => publicContent }),
    document,
    localStorage: storage,
    sessionStorage: storage,
    URL,
    URLSearchParams,
    location: {
      href: "https://example.test/index.html",
      origin: "https://example.test",
      hash: "",
      search: "",
    },
    window: {
      addEventListener() {},
      matchMedia: (query) => ({
        matches: query.includes("reduced-motion") ? reducedMotion : false,
        addEventListener() {},
      }),
      setTimeout: (callback) => {
        timers.push(callback);
        return timers.length;
      },
      clearTimeout() {},
    },
  });
  return { elements, timers, document };
}

// The page stays usable when users block both storage APIs.
await assert.doesNotReject(() => boot({ blockedStorage: true }));
await assert.doesNotReject(() =>
  boot({
    stored: {
      public_blog_posts: { unexpected: "object" },
      ricciEvents: "invalid",
    },
  }),
);

// Old snapshots may still contain posts, but the removed Bitácora is never rendered.
const noJournal = await boot({
  selectors: ["#blog-grid", "#published-journal"],
  publicContent: {
    events: [],
    posts: [{ slug: "archived-entry", title: "Archived", status: "Publicado" }],
  },
});
assert.equal(noJournal.elements["#blog-grid"].childElementCount, 0);
assert.equal(noJournal.elements["#published-journal"].childElementCount, 0);

// Past events and drafts are excluded; unsafe ticket URLs never become links.
const agenda = await boot({
  selectors: [
    "#event-list",
    "#events-empty",
    "#event-modal",
    "#event-modal-title",
    "#event-modal-date",
    "#event-modal-status",
    "#event-modal-location",
    "#event-modal-description",
    "#event-modal-tickets",
    "#event-modal-contact",
    "#event-modal-close",
  ],
  publicContent: {
    posts: [],
    events: [
      { date: "2020-01-01", title: "Past", status: "Publicado" },
      { date: "2099-01-01", title: "Draft", status: "Borrador" },
      {
        date: "2099-01-01",
        title: "Future",
        status: "Publicado",
        ticketUrl: "javascript:alert(1)",
      },
    ],
  },
});
assert.equal(agenda.elements["#event-list"].childElementCount, 1);
const unsafeActions = agenda.elements["#event-list"].children[0].children[2];
assert.equal(
  unsafeActions.children[0].type,
  "button",
);
assert.equal(agenda.elements["#events-empty"].hidden, true);
unsafeActions.children[0].events.get("click")();
assert.equal(agenda.elements["#event-modal"].open, true);
assert.equal(agenda.elements["#event-modal-title"].textContent, "Future");
assert.equal(agenda.elements["#event-modal-tickets"].hidden, true);
agenda.elements["#event-modal-close"].events.get("click")();
assert.equal(agenda.elements["#event-modal"].open, false);

const externalAgenda = await boot({
  selectors: ["#event-list", "#events-empty"],
  publicContent: {
    posts: [],
    events: [{
      date: "2099-01-01", title: "Ticketed", status: "Publicado",
      ticketStatus: "available", ticketProvider: "Ticketmaster",
      ticketUrl: "https://tickets.example.test/show",
      ticketAvailability: "Quedan 12",
    }],
  },
});
const externalRow = externalAgenda.elements["#event-list"].children[0];
const externalActions = externalRow.children[2];
const externalLink = externalActions.children[0];
assert.equal(externalLink.href, "https://tickets.example.test/show");
assert.equal(externalLink.target, "_blank");
assert.equal(externalLink.rel, "noopener noreferrer");
assert.equal(externalLink.textContent, "Comprar en Ticketmaster ↗");
assert.equal(externalRow.children[1].children[3].textContent, "Boletas disponibles");
assert.equal(externalRow.children[1].children[4].textContent, "Quedan 12");

const cinemaSelectors = [
  "#cinema",
  ".site-shell",
  "[data-skip-intro]",
  "[data-replay-intro]",
];
const quiet = await boot({ selectors: cinemaSelectors, reducedMotion: true });
assert.equal(quiet.elements["#cinema"].open, false);
assert.equal(quiet.document.body.classList.contains("locked"), false);

// A blocked preference store must not prevent the timed entrance or its exit.
const cinema = await boot({ selectors: cinemaSelectors, blockedStorage: true });
assert.equal(cinema.elements["#cinema"].open, true);
assert.equal(cinema.elements[".site-shell"].inert, true);
cinema.timers.shift()(); // End of the film.
cinema.timers.shift()(); // End of the wipe.
assert.equal(cinema.elements["#cinema"].open, false);
assert.equal(cinema.elements[".site-shell"].inert, false);
assert.equal(cinema.document.body.classList.contains("locked"), false);
cinema.elements["[data-replay-intro]"].events.get("click")();
cinema.elements["#cinema"].events.get("cancel")({ preventDefault() {} });
assert.equal(cinema.elements["#cinema"].open, false);
assert.equal(cinema.elements["[data-replay-intro]"].focused, true);

console.log(
  "Behavior checks passed: blocked storage, malformed data, removed Bitácora, future events, reduced motion, intro exit and replay.",
);
