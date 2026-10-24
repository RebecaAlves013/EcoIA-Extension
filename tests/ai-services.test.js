import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const providers = [
  { host: "gemini.google.com", service: "Gemini" },
  { host: "claude.ai", service: "Claude" },
  { host: "copilot.microsoft.com", service: "Copilot" },
  { host: "perplexity.ai", service: "Perplexity" }
];

function createHarness(host) {
  const handlers = {};
  const sentMessages = [];
  let now = 10_000;

  class FakeDate extends Date {
    static now() { return now; }
  }

  class Element {
    constructor({ value = "", label = "", text = "" } = {}) {
      this.value = value;
      this.innerText = text;
      this.textContent = text;
      this.label = label;
    }
    contains(target) { return target === this; }
    closest() { return this.label ? this : null; }
    getAttribute(name) {
      if (name === "aria-label") return this.label || null;
      if (name === "placeholder") return "Digite sua mensagem";
      return null;
    }
  }

  const field = new Element({ value: "mensagem automatizada" });
  const button = new Element({ label: "Send message" });

  const document = {
    querySelector() { return field; },
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

  vm.runInNewContext(
    // O script é executado como content script real, com DOM e APIs simulados.
    // Isso testa o detector sem depender de alterações na interface pública do site.
    readContentSource,
    {
      window: { location: { hostname: host, search: "" }, addEventListener() {} },
      document,
      chrome,
      console: { log() {}, error() {}, warn() {} },
      Element,
      HTMLFormElement: class HTMLFormElement {},
      URL,
      URLSearchParams,
      Date: FakeDate,
      Math,
      setTimeout
    }
  );

  return {
    handlers,
    sentMessages,
    field,
    button,
    advance(ms) { now += ms; }
  };
}

let readContentSource = "";

test("carrega o content.js antes dos testes de provedores", async () => {
  readContentSource = await read("../src/content/content.js");
  assert.match(readContentSource, /envio de formulário/);
});

for (const provider of providers) {
  test(`IA ${provider.service}: clique no botão registra uma interação`, async () => {
    const h = createHarness(provider.host);
    assert.equal(typeof h.handlers.click, "function");

    h.handlers.click({ target: h.button });

    assert.equal(h.sentMessages.length, 1);
    assert.equal(h.sentMessages[0].type, "AI_INTERACTION");
    assert.equal(h.sentMessages[0].service, provider.service);
  });

  test(`IA ${provider.service}: Enter registra uma interação`, async () => {
    const h = createHarness(provider.host);
    assert.equal(typeof h.handlers.keydown, "function");

    h.handlers.keydown({
      key: "Enter",
      shiftKey: false,
      target: h.field
    });

    assert.equal(h.sentMessages.length, 1);
    assert.equal(h.sentMessages[0].type, "AI_INTERACTION");
    assert.equal(h.sentMessages[0].service, provider.service);
  });

  test(`IA ${provider.service}: Shift+Enter não registra envio`, async () => {
    const h = createHarness(provider.host);

    h.handlers.keydown({
      key: "Enter",
      shiftKey: true,
      target: h.field
    });

    assert.equal(h.sentMessages.length, 0);
  });
}
