import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

import { calculateEnergy, formatEnergy } from "../src/calculations/energy.js";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("calcula energia para zero, uma e várias interações", () => {
  assert.equal(calculateEnergy(0, 0.31), 0);
  assert.equal(calculateEnergy(1, 0.31), 0.31);
  assert.equal(calculateEnergy(4, 0.31), 1.24);
  assert.equal(formatEnergy(1.234567), 1.2346);
});

test("background salva cada mensagem AI_INTERACTION sem apagar registros anteriores", async () => {
  const source = await read("../src/background/background.js");
  const listeners = {};
  const store = { interactions: [{ service: "Gemini", timestamp: "old" }] };

  const chrome = {
    runtime: {
      onMessage: { addListener: (fn) => { listeners.message = fn; } },
      onStartup: { addListener() {} },
      onInstalled: { addListener() {} }
    },
    tabs: {
      onActivated: { addListener() {} },
      onUpdated: { addListener() {} },
      query: async () => [],
      get: async () => null
    },
    windows: { onFocusChanged: { addListener() {} } },
    storage: {
      local: {
        get: (key, callback) => callback({ [key]: store[key] }),
        set: (data, callback) => { Object.assign(store, data); callback?.(); },
        remove: async (key) => { delete store[key]; }
      }
    }
  };

  vm.runInNewContext(source, {
    chrome,
    console: { log() {}, warn() {}, error() {} },
    URL,
    Date
  });

  for (let i = 0; i < 3; i++) {
    await new Promise((resolve, reject) => {
      const responded = listeners.message(
        { type: "AI_INTERACTION", service: "ChatGPT", timestamp: `t${i}` },
        {},
        (response) => {
          try {
            assert.equal(response.success, true);
            resolve();
          } catch (error) { reject(error); }
        }
      );
      assert.equal(responded, true, "o listener deve manter o canal aberto para resposta assíncrona");
    });
  }

  assert.equal(store.interactions.length, 4);
  assert.equal(store.interactions[0].service, "Gemini");
  assert.equal(store.interactions.slice(1).every((item) => item.service === "ChatGPT"), true);
});

test("background atualiza o resumo de transferência sem duplicar a mesma página", async () => {
  const source = await read("../src/background/background.js");
  const listeners = {};
  const store = { webTransfer: [] };

  const chrome = {
    runtime: {
      lastError: null,
      onMessage: { addListener: (fn) => { listeners.message = fn; } },
      onStartup: { addListener() {} },
      onInstalled: { addListener() {} }
    },
    tabs: {
      onActivated: { addListener() {} },
      onUpdated: { addListener() {} },
      query: async () => [],
      get: async () => null
    },
    windows: { onFocusChanged: { addListener() {} },
    },
    storage: {
      local: {
        get: (key, callback) => callback({ [key]: store[key] }),
        set: (data, callback) => { Object.assign(store, data); callback?.(); },
        remove: async (key) => { delete store[key]; }
      }
    }
  };

  vm.runInNewContext(source, {
    chrome,
    console: { log() {}, warn() {}, error() {} },
    URL,
    Date
  });

  const send = (message) => new Promise((resolve, reject) => {
    const keepChannelOpen = listeners.message(message, {}, (response) => {
      try {
        assert.equal(response.success, true);
        resolve();
      } catch (error) { reject(error); }
    });
    assert.equal(keepChannelOpen, true);
  });

  await send({
    type: "WEB_TRANSFER",
    pageId: "page-1",
    domain: "exemplo.com",
    timestamp: "t1",
    bytes: 1000,
    resources: 4,
    zeroSizeResources: 1
  });

  await send({
    type: "WEB_TRANSFER",
    pageId: "page-1",
    domain: "exemplo.com",
    timestamp: "t2",
    bytes: 2500,
    resources: 7,
    zeroSizeResources: 2
  });

  await send({
    type: "WEB_TRANSFER",
    pageId: "page-2",
    domain: "outro.com",
    timestamp: "t3",
    bytes: 500,
    resources: 2,
    zeroSizeResources: 0
  });

  assert.equal(store.webTransfer.length, 2, "cada página deve ter apenas um resumo");
  assert.deepEqual(
    JSON.parse(JSON.stringify(store.webTransfer.find(item => item.pageId === "page-1"))),
    {
      pageId: "page-1",
      domain: "exemplo.com",
      timestamp: "t2",
      bytes: 2500,
      resources: 7,
      zeroSizeResources: 2
    }
  );
});

test("popup exibe dados transferidos e recalcula estimativas nos três cenários", async () => {
  let onReady;
  const elements = new Map();
  const getElementById = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        textContent: "",
        value: id === "scenario" ? "central" : "",
        listeners: {},
        addEventListener(type, fn) { this.listeners[type] = fn; }
      });
    }
    return elements.get(id);
  };

  const interactions = [
    { service: "ChatGPT", timestamp: "t1" },
    { service: "ChatGPT", timestamp: "t2" },
    { service: "ChatGPT", timestamp: "t3" },
    { service: "ChatGPT", timestamp: "t4" }
  ];

  const webTransfer = [{
    pageId: "page-1",
    domain: "exemplo.com",
    timestamp: "t1",
    bytes: 500_000_000,
    resources: 8,
    zeroSizeResources: 2
  }];

  const chrome = {
    storage: {
      local: {
        get: async (keys) => {
          const result = {};
          for (const key of keys) {
            result[key] = key === "interactions" ? interactions :
              key === "webVisits" ? [] :
              key === "webTransfer" ? webTransfer : undefined;
          }
          return result;
        }
      }
    },
    tabs: { query: async () => [{ url: "https://chatgpt.com/" }] }
  };

  const parameters = {
    ai: {
      energy: { scenarios: { low: 0.16, central: 0.31, high: 0.6 } },
      water: { reference: { value: 0.26 } }
    },
    web: { energy: { scenarios: { low: 1.1, central: 1.8, high: 2.4 } } }
  };

  let source = await read("../src/popup/popup.js");
  source = source
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\.\/calculations\/energy\.js";\s*/, "")
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*"\.\.\/services\/parameters\.js";\s*/, "");

  const document = {
    addEventListener(type, fn) { if (type === "DOMContentLoaded") onReady = fn; },
    getElementById
  };

  vm.runInNewContext(source, {
    document,
    chrome,
    console,
    calculateEnergy: (n, factor) => n * factor,
    formatEnergy: (value) => Number(value.toFixed(4)),
    loadParameters: async () => parameters,
    Number,
    Math
  });

  assert.equal(typeof onReady, "function");
  await onReady();

  assert.equal(Number(getElementById("interactions").textContent), 4);
  assert.equal(getElementById("energy").textContent, "1.24 Wh");
  assert.equal(getElementById("water").textContent, "1.04 mL");
  assert.equal(getElementById("webData").textContent, "488281.25 KB");
  assert.equal(getElementById("webDataDetails").textContent, "8 recursos observados; 2 com tamanho zero.");
  assert.equal(getElementById("webEnergy").textContent, "0.9 Wh");

  getElementById("scenario").value = "low";
  getElementById("scenario").listeners.change();
  assert.equal(getElementById("energy").textContent, "0.64 Wh");
  assert.equal(getElementById("webEnergy").textContent, "0.55 Wh");

  getElementById("scenario").value = "high";
  getElementById("scenario").listeners.change();
  assert.equal(getElementById("energy").textContent, "2.4 Wh");
  assert.equal(getElementById("webEnergy").textContent, "1.2 Wh");
});

test("content script detecta envio simulado no ChatGPT e evita clique duplicado", async () => {
  const source = await read("../src/content/content.js");
  const handlers = {};
  const sentMessages = [];
  let now = 10_000;

  class FakeDate extends Date {
    static now() { return now; }
  }

  class Element {
    constructor() { this.innerText = "mensagem de teste"; }
    contains(target) { return target === this; }
    closest() { return this; }
  }

  const campo = new Element();
  campo.getAttribute = (name) =>
    name === "aria-label" ? "Pergunte ao ChatGPT" : null;

  const botao = new Element();
  const document = {
    querySelector() { return campo; },
    addEventListener(type, callback) { handlers[type] = callback; }
  };

  const chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        sentMessages.push(message);
        callback?.();
      }
    }
  };

  vm.runInNewContext(source, {
    window: { location: { hostname: "chatgpt.com" }, addEventListener() {} },
    document,
    chrome,
    console: { log() {}, error() {}, warn() {} },
    Element,
    HTMLFormElement: class HTMLFormElement {},
    Date: FakeDate,
    Math,
    PerformanceObserver: class {},
    performance: { setResourceTimingBufferSize() {} },
    setTimeout
  });

  assert.equal(typeof handlers.click, "function");
  handlers.click({ target: botao });
  handlers.click({ target: botao });
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].type, "AI_INTERACTION");
  assert.equal(sentMessages[0].service, "ChatGPT");

  now += 1500;
  handlers.click({ target: botao });
  assert.equal(sentMessages.length, 2);
});


test("content script contabiliza recursos web uma vez e separa recursos sem tamanho", async () => {
  const source = await read("../src/content/content.js");
  let observerCallback;
  let observerOptions;
  const sentMessages = [];
  const timers = [];
  const windowHandlers = {};

  class FakePerformanceObserver {
    constructor(callback) { observerCallback = callback; }
    observe(options) { observerOptions = options; }
  }

  const chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        sentMessages.push(message);
        callback?.();
      }
    }
  };

  const window = {
    location: { hostname: "example.com", search: "" },
    addEventListener(type, callback) { windowHandlers[type] = callback; }
  };

  vm.runInNewContext(source, {
    window,
    document: { querySelector() { return null; }, addEventListener() {} },
    chrome,
    console: { log() {}, error() {}, warn() {} },
    Element: class Element {},
    HTMLFormElement: class HTMLFormElement {},
    URL,
    URLSearchParams,
    Date,
    Math: Object.create(Math),
    PerformanceObserver: FakePerformanceObserver,
    performance: { setResourceTimingBufferSize() {} },
    setTimeout(callback) { timers.push(callback); return timers.length; }
  });

  assert.equal(typeof observerCallback, "function");
  assert.deepEqual(JSON.parse(JSON.stringify(observerOptions)), {
    type: "resource",
    buffered: true
  });
  assert.equal(typeof windowHandlers.pagehide, "function");

  const resourceA = { name: "https://example.com/a.js", startTime: 10, transferSize: 1000 };
  const resourceB = { name: "https://example.com/b.css", startTime: 20, transferSize: 0 };
  observerCallback({ getEntries: () => [resourceA, resourceB, resourceA] });

  assert.equal(timers.length, 1, "várias entradas devem ser agrupadas em um envio");
  timers.shift()();

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].type, "WEB_TRANSFER");
  assert.equal(sentMessages[0].domain, "example.com");
  assert.equal(sentMessages[0].bytes, 1000);
  assert.equal(sentMessages[0].resources, 2);
  assert.equal(sentMessages[0].zeroSizeResources, 1);
  assert.equal(typeof sentMessages[0].pageId, "string");
  assert.equal(sentMessages[0].pageId.length > 0, true);

  // Uma nova entrada para o mesmo recurso com a mesma marca temporal não soma bytes novamente.
  observerCallback({ getEntries: () => [resourceA] });
  assert.equal(timers.length, 1);
  timers.shift()();
  assert.equal(sentMessages.length, 2);
  assert.equal(sentMessages[1].bytes, 1000);
  assert.equal(sentMessages[1].resources, 2);
  assert.equal(sentMessages[1].zeroSizeResources, 1);
});

test("content script não envia resumo web quando não observou recursos", async () => {
  const source = await read("../src/content/content.js");
  let observerCallback;
  const sentMessages = [];
  const timers = [];

  class FakePerformanceObserver {
    constructor(callback) { observerCallback = callback; }
    observe() {}
  }

  vm.runInNewContext(source, {
    window: {
      location: { hostname: "example.org", search: "" },
      addEventListener() {}
    },
    document: { querySelector() { return null; }, addEventListener() {} },
    chrome: {
      runtime: {
        lastError: null,
        sendMessage(message, callback) {
          sentMessages.push(message);
          callback?.();
        }
      }
    },
    console: { log() {}, error() {}, warn() {} },
    Element: class Element {},
    HTMLFormElement: class HTMLFormElement {},
    URL,
    URLSearchParams,
    Date,
    Math: Object.create(Math),
    PerformanceObserver: FakePerformanceObserver,
    performance: { setResourceTimingBufferSize() {} },
    setTimeout(callback) { timers.push(callback); return timers.length; }
  });

  observerCallback({ getEntries: () => [] });
  assert.equal(timers.length, 1);
  timers.shift()();
  assert.equal(sentMessages.length, 0);
});
