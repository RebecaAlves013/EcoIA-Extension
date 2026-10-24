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

test("popup exibe contador e estima energia e água a partir dos registros armazenados", async () => {
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

  const chrome = {
    storage: {
      local: {
        get: async (keys) => {
          const result = {};
          for (const key of keys) {
            result[key] = key === "interactions" ? interactions :
              key === "webVisits" ? [] :
              key === "webTransfer" ? [] : undefined;
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

  assert.equal(getElementById("interactions").textContent, "4");
  assert.equal(getElementById("energy").textContent, "1.24 Wh");
  assert.equal(getElementById("water").textContent, "1.04 mL");

  getElementById("scenario").value = "high";
  getElementById("scenario").listeners.change();
  assert.equal(getElementById("energy").textContent, "2.4 Wh");
});
