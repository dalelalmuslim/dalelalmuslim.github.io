import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCENARIOS = ['loading', 'complete'];
const SECTION_IDS = ['home', 'azkar', 'duas', 'names', 'quran', 'stories', 'tasks', 'settings', 'masbaha'];
const REQUIRED_ELEMENT_IDS = [
  'headerTitle',
  'backBtn',
  'dailyTargetInput',
  'dailyAyahText',
  'dailyMessageText',
  'miniTasbeeh',
  'miniTasks',
  'miniProgress',
  'miniStreak',
  'dailyStatsMini',
  'homeQuranResumeCard',
  'homeQuranResumeSource',
  'homeQuranResumeSurah',
  'storageDegradedBanner',
  'storageDegradedBannerText',
  ...SECTION_IDS
];

class MockEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, handler, options = {}) {
    if (typeof handler !== 'function') {
      return;
    }

    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }

    this.listeners.get(type).push({ handler, once: Boolean(options?.once) });
  }

  removeEventListener(type, handler) {
    const current = this.listeners.get(type);
    if (!current) {
      return;
    }

    this.listeners.set(type, current.filter((entry) => entry.handler !== handler));
  }

  dispatchEvent(event) {
    if (!event?.type) {
      return true;
    }

    const current = [...(this.listeners.get(event.type) || [])];
    current.forEach((entry) => {
      entry.handler.call(this, event);
      if (entry.once) {
        this.removeEventListener(event.type, entry.handler);
      }
    });

    return !event.defaultPrevented;
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }
}

class MockClassList {
  constructor(owner) {
    this.owner = owner;
    this.tokens = new Set();
  }

  add(...tokens) {
    tokens.flat().filter(Boolean).forEach((token) => this.tokens.add(token));
    this.sync();
  }

  remove(...tokens) {
    tokens.flat().filter(Boolean).forEach((token) => this.tokens.delete(token));
    this.sync();
  }

  toggle(token, force = undefined) {
    if (!token) {
      return false;
    }

    if (force === true || (!this.tokens.has(token) && force !== false)) {
      this.tokens.add(token);
      this.sync();
      return true;
    }

    this.tokens.delete(token);
    this.sync();
    return false;
  }

  contains(token) {
    return this.tokens.has(token);
  }

  sync() {
    this.owner.className = [...this.tokens].join(' ').trim();
  }
}

class MockElement extends MockEventTarget {
  constructor(id = '') {
    super();
    this.id = id;
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.value = '';
    this.textContent = '';
    this.innerHTML = '';
    this.className = '';
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.classList = new MockClassList(this);
  }

  append(...nodes) {
    nodes.flat().filter(Boolean).forEach((node) => {
      this.children.push(node);
      if (node && typeof node === 'object') {
        node.parentNode = this;
      }
    });
  }

  appendChild(node) {
    this.append(node);
    return node;
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(String(name));
  }

  getAttribute(name) {
    return this.attributes.get(String(name)) || null;
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }

  closest() {
    return null;
  }

  matches() {
    return false;
  }

  focus() {}

  cloneNode() {
    return new MockElement(this.id);
  }

  contains(node) {
    return this === node || this.children.includes(node);
  }

  remove() {
    if (!this.parentNode) {
      return;
    }

    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
}

class MockDocument extends MockEventTarget {
  constructor(readyState = 'loading') {
    super();
    this.readyState = readyState;
    this.hidden = false;
    this.visibilityState = 'visible';
    this.elements = new Map();
    this.body = new MockElement('body');
    this.documentElement = new MockElement('html');
  }

  getElementById(id) {
    if (!id) {
      return null;
    }

    if (!this.elements.has(id)) {
      const element = new MockElement(id);
      if (SECTION_IDS.includes(id)) {
        element.classList.add('tab-content');
      }
      this.elements.set(id, element);
    }

    return this.elements.get(id);
  }

  querySelector(selector) {
    if (selector === 'body') {
      return this.body;
    }

    if (selector?.startsWith('#')) {
      return this.getElementById(selector.slice(1));
    }

    return null;
  }

  querySelectorAll(selector) {
    if (selector === '.tab-content') {
      return SECTION_IDS.map((id) => this.getElementById(id));
    }

    return [];
  }

  createElement(tagName = 'div') {
    return new MockElement(String(tagName).toLowerCase());
  }

  createTextNode(text = '') {
    return {
      nodeType: 3,
      textContent: String(text)
    };
  }

  createDocumentFragment() {
    return new MockElement('fragment');
  }
}

class MockCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
    this.defaultPrevented = false;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

function createMockRegistration() {
  return {
    waiting: null,
    installing: null,
    addEventListener() {},
    update() {
      return Promise.resolve();
    }
  };
}

function installGlobalStubs(readyState = 'loading') {
  const document = new MockDocument(readyState);
  REQUIRED_ELEMENT_IDS.forEach((id) => document.getElementById(id));
  const windowTarget = new MockEventTarget();
  const registration = createMockRegistration();

  const window = Object.assign(windowTarget, {
    document,
    location: {
      hash: '',
      href: 'http://localhost/',
      pathname: '/',
      search: '',
      assign() {},
      replace() {}
    },
    history: {
      state: null,
      pushState(state, _title, hash = '') {
        this.state = state;
        window.location.hash = typeof hash === 'string' ? hash : '';
      },
      replaceState(state, _title, hash = '') {
        this.state = state;
        window.location.hash = typeof hash === 'string' ? hash : '';
      }
    },
    scrollTo() {},
    requestIdleCallback(callback) {
      return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16 }), 0);
    },
    cancelIdleCallback(id) {
      clearTimeout(id);
    },
    requestAnimationFrame(callback) {
      return setTimeout(() => callback(Date.now()), 0);
    },
    cancelAnimationFrame(id) {
      clearTimeout(id);
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    speechSynthesis: {
      addEventListener() {},
      getVoices() {
        return [];
      },
      cancel() {}
    },
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {}
      };
    },
    dispatchEvent(event) {
      return windowTarget.dispatchEvent(event);
    }
  });

  const navigator = {
    onLine: true,
    standalone: false,
    serviceWorker: {
      controller: {},
      register() {
        return Promise.resolve(registration);
      },
      getRegistration() {
        return Promise.resolve(registration);
      },
      addEventListener() {}
    },
    clipboard: {
      writeText() {
        return Promise.resolve();
      }
    },
    share() {
      return Promise.resolve();
    }
  };

  Object.defineProperty(globalThis, 'document', { value: document, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: window, configurable: true });
  Object.defineProperty(globalThis, 'navigator', { value: navigator, configurable: true });
  Object.defineProperty(globalThis, 'location', { value: window.location, configurable: true });
  Object.defineProperty(globalThis, 'history', { value: window.history, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    configurable: true
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    configurable: true
  });
  Object.defineProperty(globalThis, 'CustomEvent', { value: MockCustomEvent, configurable: true });
  Object.defineProperty(globalThis, 'Event', { value: MockCustomEvent, configurable: true });
  Object.defineProperty(globalThis, 'Audio', { value: class {}, configurable: true });
  Object.defineProperty(globalThis, 'Notification', {
    value: {
      permission: 'default',
      requestPermission() {
        return Promise.resolve('default');
      }
    },
    configurable: true
  });
  Object.defineProperty(globalThis, 'queueMicrotask', { value: (fn) => Promise.resolve().then(fn), configurable: true });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { value: window.requestAnimationFrame, configurable: true });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', { value: window.cancelAnimationFrame, configurable: true });
  Object.defineProperty(globalThis, 'fetch', {
    value: async () => ({ ok: true, json: async () => ([]), text: async () => '' }),
    configurable: true
  });

  return { document, window };
}

function wait(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runScenario(readyState) {
  const stubs = installGlobalStubs(readyState);
  const mainUrl = pathToFileURL(path.join(ROOT, 'js', 'main.js')).href;
  const appUrl = pathToFileURL(path.join(ROOT, 'js', 'app', 'core', 'app-controller.js')).href;

  await import(mainUrl);
  const { app } = await import(appUrl);

  const beforeBootstrap = {
    initialized: app.initialized,
    domContentLoadedListeners: stubs.document.listenerCount('DOMContentLoaded')
  };

  if (readyState === 'loading') {
    if (beforeBootstrap.domContentLoadedListeners === 0) {
      throw new Error('Expected DOMContentLoaded listener registration in loading scenario.');
    }

    stubs.document.readyState = 'complete';
    stubs.document.dispatchEvent(new MockCustomEvent('DOMContentLoaded'));
    await wait(5);
  } else {
    await wait(5);
  }

  if (!app.initialized) {
    const loggerUrl = pathToFileURL(path.join(ROOT, 'js', 'shared', 'logging', 'app-logger.js')).href;
    const { appLogger } = await import(loggerUrl);
    console.error('DEBUG bootstrapStatus', JSON.stringify(app.bootstrapStatus, null, 2));
    console.error('DEBUG history', JSON.stringify(appLogger.getHistory(), null, 2));
    throw new Error(`App failed to initialize in ${readyState} scenario.`);
  }

  if (!app.bootstrapStatus?.startup?.ok) {
    throw new Error(`Startup phases failed in ${readyState} scenario.`);
  }

  const clickListeners = stubs.document.body.listenerCount('click');
  const popstateListeners = stubs.window.listenerCount('popstate');
  if (clickListeners === 0) {
    throw new Error(`UI click listener was not registered in ${readyState} scenario.`);
  }

  if (popstateListeners === 0) {
    throw new Error(`Global popstate listener was not registered in ${readyState} scenario.`);
  }

  return {
    scenario: readyState,
    initialized: app.initialized,
    beforeBootstrap,
    listeners: {
      domContentLoaded: stubs.document.listenerCount('DOMContentLoaded'),
      bodyClick: clickListeners,
      bodyChange: stubs.document.body.listenerCount('change'),
      bodyKeydown: stubs.document.body.listenerCount('keydown'),
      popstate: popstateListeners,
      focus: stubs.window.listenerCount('focus')
    }
  };
}

async function spawnScenario(readyState) {
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT_PATH], {
      cwd: ROOT,
      env: {
        ...process.env,
        VERIFY_SCENARIO: readyState
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim(), scenario: readyState });
    });
  });
}

async function main() {
  if (process.env.VERIFY_SCENARIO) {
    const result = await runScenario(process.env.VERIFY_SCENARIO);
    process.stdout.write(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  const scenarioRuns = [];
  for (const scenario of SCENARIOS) {
    const run = await spawnScenario(scenario);
    if (run.code !== 0) {
      throw new Error(run.stderr || `Scenario failed: ${scenario}`);
    }

    scenarioRuns.push(JSON.parse(run.stdout));
  }

  process.stdout.write(JSON.stringify({ ok: true, entry: 'js/main.js', scenarios: scenarioRuns }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || String(error)}\n`);
  process.exit(1);
});
