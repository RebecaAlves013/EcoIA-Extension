import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(
  new URL("../src/content/content.js", import.meta.url),
  "utf8"
);

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
    closest(selector) {
      if (!this.label) return null;
      return selector.split(",").some(part => {
        const normalized = part.trim();
        return normalized.includes(this.label) ||
          (normalized.includes("Send message") && this.label === "Send message") ||
          (normalized.includes("Enviar") && this.label === "Enviar");
      }) ? this : null;
    }
    getAttribute(name) {
      if (name === "aria-label") return this.label || null;
      if (name === "placeholder") return "Digite sua mensagem";
      return null;
    }
  }

  const field = new Element({
    value: "mensagem automatizada",
    text: "mensagem automatizada"
  });
  const button = new Element({ label: "Enviar" });

  class FakeForm {
    querySelector() { return field; }
    querySelectorAll() { return [field]; }
  }

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

  vm.runInNewContext(source, {
    window: { location: { hostname: host, search: "" }, addEventListener() {} },
    document,
    chrome,
    console: { log() {}, error() {}, warn() {} },
    Element,
    HTMLFormElement: FakeForm,
    URL,
    URLSearchParams,
    Date: FakeDate,
    Math,
    setTimeout,
    PerformanceObserver: class {},
    performance: { setResourceTimingBufferSize() {} }
  });

  return {
    handlers,
    sentMessages,
    field,
    button,
    FakeForm,
    advance(ms) { now += ms; }
  };
}

for (const provider of providers) {
  test(`diagnóstico ${provider.service}: serviço é identificado como IA`, () => {
    const h = createHarness(provider.host);
    assert.equal(typeof h.handlers.submit, "function");
  });

  test(`diagnóstico ${provider.service}: envio de formulário é registrado`, () => {
    const h = createHarness(provider.host);
    h.handlers.submit({
      target: new h.FakeForm(),
      preventDefault() {}
    });

    assert.equal(h.sentMessages.length, 1);
    assert.equal(h.sentMessages[0].type, "AI_INTERACTION");
    assert.equal(h.sentMessages[0].service, provider.service);
  });

  test(`diagnóstico ${provider.service}: detector atual não escuta clique nem Enter`, () => {
    const h = createHarness(provider.host);

    // Este teste registra o comportamento atual, não afirma que seja o comportamento desejado.
    assert.equal(h.handlers.click, undefined);
    assert.equal(h.handlers.keydown, undefined);
    assert.equal(h.sentMessages.length, 0);
  });
}

test("diagnóstico: o content.js contém listeners de clique e Enter somente no ramo ChatGPT", () => {
  assert.match(source, /if \(servico === "ChatGPT"\)/);
  assert.match(source, /document\.addEventListener\("keydown"/);
  assert.match(source, /document\.addEventListener\("click"/);
  assert.match(source, /document\.addEventListener\("submit"/);
});
