import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = root;
const fixturePath = resolve(root, "tests/fixtures/chatgpt.html");

async function startFixtureServer() {
  const html = await readFile(fixturePath, "utf8");
  const server = createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise((resolveReady, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveReady);
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/?ecoiaTest=chatgpt`,
    close: () => new Promise((resolveClose, reject) =>
      server.close(error => error ? reject(error) : resolveClose())
    )
  };
}

async function readInteractions(serviceWorker) {
  return serviceWorker.evaluate(async () => {
    const result = await chrome.storage.local.get(["interactions"]);
    return result.interactions || [];
  });
}

async function waitForInteractionCount(serviceWorker, expectedCount, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const interactions = await readInteractions(serviceWorker);
    if (interactions.length === expectedCount) return interactions;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const actual = (await readInteractions(serviceWorker)).length;
  throw new Error(`Esperava ${expectedCount} interações, mas encontrei ${actual}.`);
}

test("E2E: clique e Enter registram uma interação cada e popup mostra total", async (t) => {
  const fixture = await startFixtureServer();
  let context;

  try {
    context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });
  } catch (error) {
    await fixture.close();
    t.skip(`Não foi possível iniciar Chromium com extensões: ${error.message}`);
    return;
  }

  try {
    const workers = context.serviceWorkers();
    const serviceWorker = workers[0] || await context.waitForEvent("serviceworker", { timeout: 15000 });
    const page = await context.newPage();
    await page.goto(fixture.url);
    await page.waitForTimeout(500);

    // Usa armazenamento isolado desta sessão do navegador de teste.
    await serviceWorker.evaluate(async () => chrome.storage.local.remove(["interactions"]));
    assert.equal((await readInteractions(serviceWorker)).length, 0);

    // Envio pelo botão: deve criar exatamente um registro.
    await page.locator("#prompt-textarea").fill("Teste automatizado pelo botão");
    await page.locator("#send").click();
    let interactions = await waitForInteractionCount(serviceWorker, 1);
    assert.equal(interactions.length, 1);
    assert.equal(interactions[0].service, "ChatGPT");

    // Espera a janela anti-duplicação antes de testar Enter.
    await page.waitForTimeout(1300);
    await page.locator("#prompt-textarea").fill("Teste automatizado por Enter");
    await page.locator("#prompt-textarea").press("Enter");
    interactions = await waitForInteractionCount(serviceWorker, 2);
    assert.equal(interactions.length, 2);
    assert.equal(interactions.every(item => item.service === "ChatGPT"), true);

    // Abre o popup real da extensão e verifica o contador.
    const extensionId = serviceWorker.url().split("/")[2];
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await popup.waitForFunction(() => document.querySelector("#interactions")?.textContent === "2", null, { timeout: 5000 });
    assert.equal(await popup.locator("#interactions").textContent(), "2");
    assert.equal(await popup.locator("#energy").textContent(), "0.62 Wh");
    assert.equal(await popup.locator("#water").textContent(), "0.52 mL");
  } finally {
    await context.close();
    await fixture.close();
  }
});


test("estresse: 100 interações armazenadas aparecem corretamente no popup", async (t) => {
  const fixture = await startFixtureServer();
  let context;

  try {
    context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });
  } catch (error) {
    await fixture.close();
    t.skip(`Não foi possível iniciar Chromium com extensões: ${error.message}`);
    return;
  }

  try {
    const workers = context.serviceWorkers();
    const serviceWorker = workers[0] || await context.waitForEvent("serviceworker", { timeout: 15000 });
    const page = await context.newPage();
    await page.goto(fixture.url);
    await page.waitForTimeout(400);

    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.remove(["interactions"]);
    });

    // Preenche o armazenamento com 100 registros de teste.
    // Este teste valida o popup com volume elevado; o background é testado separadamente.
    const result = await serviceWorker.evaluate(async () => {
      const interactions = Array.from({ length: 100 }, (_, i) => ({
        service: "ChatGPT",
        timestamp: new Date(Date.now() + i).toISOString()
      }));
      await chrome.storage.local.set({ interactions });
      const stored = await chrome.storage.local.get(["interactions"]);
      return {
        count: (stored.interactions || []).length,
        allChatGPT: (stored.interactions || []).every(item => item.service === "ChatGPT")
      };
    });

    assert.equal(result.count, 100, "o armazenamento deve conter 100 interações");
    assert.equal(result.allChatGPT, true, "todas as interações devem ser do ChatGPT");

    const extensionId = serviceWorker.url().split("/")[2];
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await popup.waitForFunction(
      () => document.querySelector("#interactions")?.textContent === "100",
      null,
      { timeout: 5000 }
    );

    assert.equal(await popup.locator("#interactions").textContent(), "100");
    assert.equal(await popup.locator("#energy").textContent(), "31 Wh");
    assert.equal(await popup.locator("#water").textContent(), "26 mL");
  } finally {
    await context.close();
    await fixture.close();
  }
});
