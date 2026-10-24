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

function createHarness(host, sendMessageMode = "ok") {
  const handlers = {};
  const sentMessages = [];
  const warnings = [];
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
      return selector.split(",").some(part =>
        part.trim().includes(this.label)
      ) ? this : null;
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
    querySelectorAll() { return [field]; },
    addEventListener(type, callback) {
      (handlers[type] ||= []).push(callback);
    }
  };

  const chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        if (sendMessageMode === "throw") {
          throw new Error("Extension context invalidated.");
        }
        sentMessages.push(message);
        if (sendMessageMode === "lastError") {
          this.lastError = { message: "Extension context invalidated." };
          callback?.();
          this.lastError = null;
          return;
        }
        callback?.();
      }
    }
  };

  vm.runInNewContext(source, {
    window: { location: { hostname: host, search: "" }, addEventListener() {} },
    document,
    chrome,
    console: { log() {}, error() {}, warn(...args) { warnings.push(args); } },
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

  const fire = (type, event) => {
    for (const handler of handlers[type] || []) handler(event);
  };

  return {
    fire,
    sentMessages,
    warnings,
    field,
    button,
    FakeForm,
    advance(ms) { now += ms; }
  };
}

for (const provider of providers) {
  test(`${provider.service}: clique no botão registra uma interação`, () => {
    const h = createHarness(provider.host);
    h.fire("click", { target: h.button });

    assert.equal(h.sentMessages.length, 1);
    assert.equal(h.sentMessages[0].type, "AI_INTERACTION");
    assert.equal(h.sentMessages[0].service, provider.service);
  });

  test(`${provider.service}: Enter registra uma interação`, () => {
    const h = createHarness(provider.host);
    h.fire("keydown", {
      key: "Enter",
      shiftKey: false,
      target: h.field
    });

    assert.equal(h.sentMessages.length, 1);
    assert.equal(h.sentMessages[0].service, provider.service);
  });

  test(`${provider.service}: Shift+Enter não registra envio`, () => {
    const h = createHarness(provider.host);
    h.fire("keydown", {
      key: "Enter",
      shiftKey: true,
      target: h.field
    });

    assert.equal(h.sentMessages.length, 0);
  });

  test(`${provider.service}: submit de formulário registra uma interação`, () => {
    const h = createHarness(provider.host);
    h.fire("submit", { target: new h.FakeForm() });

    assert.equal(h.sentMessages.length, 1);
    assert.equal(h.sentMessages[0].service, provider.service);
  });

  test(`${provider.service}: clique e submit próximos não duplicam a interação`, () => {
    const h = createHarness(provider.host);
    h.fire("click", { target: h.button });
    h.fire("submit", { target: new h.FakeForm() });

    assert.equal(h.sentMessages.length, 1);

    h.advance(1300);
    h.fire("click", { target: h.button });
    assert.equal(h.sentMessages.length, 2);
  });
}

test("o detector mantém os listeners específicos do ChatGPT", () => {
  assert.match(source, /if \(servico === "ChatGPT"\)/);
  assert.match(source, /document\.addEventListener\("keydown"/);
  assert.match(source, /document\.addEventListener\("click"/);
  assert.match(source, /document\.addEventListener\("submit"/);
});


test("ChatGPT: contexto invalidado não gera exceção não tratada", () => {
  const h = createHarness("chatgpt.com", "throw");

  assert.doesNotThrow(() => {
    h.fire("keydown", {
      key: "Enter",
      shiftKey: false,
      target: h.field
    });
  });

  assert.equal(h.sentMessages.length, 0);
  assert.equal(h.warnings.length, 1);
  assert.match(String(h.warnings[0].join(" ")), /Falha ao comunicar com a extensão/i);
  assert.match(String(h.warnings[0].join(" ")), /Extension context invalidated/i);
});

test("ChatGPT: lastError retornado pelo Chrome é tratado sem exceção", () => {
  const h = createHarness("chatgpt.com", "lastError");

  assert.doesNotThrow(() => {
    h.fire("keydown", {
      key: "Enter",
      shiftKey: false,
      target: h.field
    });
  });

  assert.equal(h.sentMessages.length, 1);
  assert.equal(h.warnings.length, 1);
  assert.match(String(h.warnings[0].join(" ")), /contexto da extensão/i);
});

test("ChatGPT: comunicação normal registra envio sem aviso", () => {
  const h = createHarness("chatgpt.com");

  h.fire("keydown", {
    key: "Enter",
    shiftKey: false,
    target: h.field
  });

  assert.equal(h.sentMessages.length, 1);
  assert.equal(h.warnings.length, 0);
});


test("ChatGPT: reconhece o composer textarea da interface móvel", () => {
  assert.match(source, /#mobile-composer-prompt/);
  assert.ok(source.includes('textarea[aria-label="Chat com o ChatGPT"]'));
});

test("Copilot: reconhece o domínio de redirecionamento M365", () => {
  assert.ok(source.includes('host === "m365.cloud.microsoft"'));
});
