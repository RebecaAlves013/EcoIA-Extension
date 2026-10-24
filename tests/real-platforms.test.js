import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { chromium } from "playwright";

/*
 * Testes opcionais nas interfaces públicas reais.
 * Execute com ECOIA_REAL_TESTS=1 npm run test:real.
 * O teste usa um perfil persistente local para reaproveitar logins.
 * Nunca armazene credenciais no código. Se necessário, faça login manualmente
 * na janela aberta. Cada serviço recebe apenas uma mensagem de teste.
 */
const enabled = process.env.ECOIA_REAL_TESTS === "1";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = root;
const profilePath = resolve(root, ".playwright-real-profile");
const providers = [
  { name: "ChatGPT", url: "https://chatgpt.com/", composer: "#prompt-textarea, textarea, [contenteditable='true'][role='textbox']" },
  { name: "Gemini", url: "https://gemini.google.com/app", composer: "rich-textarea [contenteditable='true'], textarea, [contenteditable='true'][role='textbox'], [role='textbox']" },
  { name: "Claude", url: "https://claude.ai/new", composer: "div[contenteditable='true'], [role='textbox'], textarea" },
  { name: "Copilot", url: "https://copilot.microsoft.com/", composer: "textarea, [contenteditable='true'], [role='textbox']" },
  { name: "Perplexity", url: "https://www.perplexity.ai/", composer: "textarea, [contenteditable='true'], [role='textbox']" }
];

async function getInteractions(worker) {
  return worker.evaluate(async () => {
    const result = await chrome.storage.local.get(["interactions"]);
    return result.interactions || [];
  });
}

async function waitForNewInteraction(worker, previousCount, providerName, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const interactions = await getInteractions(worker);
    if (interactions.length > previousCount) {
      const newest = interactions[interactions.length - 1];
      assert.equal(newest.service, providerName, "o registro deve identificar a IA correta");
      return interactions;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`A extensão não registrou a interação enviada para ${providerName} em ${timeoutMs} ms.`);
}

async function findVisibleComposer(page, selector) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const candidates = page.locator(selector);
    const count = await candidates.count().catch(() => 0);
    for (let index = count - 1; index >= 0; index--) {
      const candidate = candidates.nth(index);
      if (await candidate.isVisible().catch(() => false) &&
          await candidate.isEnabled().catch(() => false)) return candidate;
    }
    await page.waitForTimeout(500);
  }
  throw new Error("Campo de mensagem não encontrado. Verifique login, consentimento inicial ou mudança na interface.");
}

async function sendTestPrompt(page, composer, prompt) {
  await composer.click();
  await composer.fill(prompt).catch(async () => {
    await composer.press("Control+A");
    await composer.type(prompt);
  });

  const sendButton = page.getByRole("button", { name: /send|enviar|submit|ask|perguntar/i }).last();
  if (await sendButton.isVisible().catch(() => false) &&
      await sendButton.isEnabled().catch(() => false)) {
    await sendButton.click();
    return;
  }
  await composer.press("Enter");
}

test("interfaces reais: registra uma interação em cada uma das cinco IAs", {
  skip: !enabled && "Teste opt-in: use ECOIA_REAL_TESTS=1 npm run test:real",
  timeout: 15 * 60 * 1000
}, async t => {
  let context;
  try {
    context = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });
  } catch (error) {
    assert.fail(`Não foi possível iniciar Chromium com a extensão: ${error.message}`);
  }

  try {
    const worker = context.serviceWorkers()[0] ||
      await context.waitForEvent("serviceworker", { timeout: 15000 });

    for (const provider of providers) {
      await t.test(provider.name, async () => {
        const page = await context.newPage();
        try {
          const before = await getInteractions(worker);
          await page.goto(provider.url, { waitUntil: "domcontentloaded", timeout: 60000 });
          const composer = await findVisibleComposer(page, provider.composer);
          const prompt = `Teste de monitoramento EcoIA-Extension. Responda apenas: teste recebido. Código: ${Date.now()}`;
          await sendTestPrompt(page, composer, prompt);
          const after = await waitForNewInteraction(worker, before.length, provider.name);
          assert.equal(after.length, before.length + 1,
            `${provider.name}: deve adicionar exatamente um registro para o envio de teste`);
        } finally {
          await page.close().catch(() => {});
        }
      });
    }
  } finally {
    await context.close();
  }
});
