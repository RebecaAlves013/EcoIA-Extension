import test from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

/*
 * Testes opt-in nas interfaces públicas reais.
 * Execute no CMD: set ECOIA_REAL_TESTS=1 && npm run test:real
 * Usa perfil persistente para reaproveitar logins. Nunca armazene credenciais.
 * Cada plataforma recebe uma única mensagem de teste.
 */
const enabled = process.env.ECOIA_REAL_TESTS === "1";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = root;
const profilePath = resolve(root, ".playwright-real-profile");

const providers = [
  {
    name: "ChatGPT",
    url: "https://chatgpt.com/",
    composer: "#prompt-textarea, #mobile-composer-prompt, textarea[aria-label='Chat com o ChatGPT'], [data-testid*='prompt'] [contenteditable='true'], textarea, [contenteditable='true'][role='textbox']",
    sendButton: "button[data-testid='send-button'], button[aria-label='Send prompt'], button[aria-label='Enviar prompt'], button[aria-label='Enviar']"
  },
  {
    name: "Gemini",
    url: "https://gemini.google.com/app",
    composer: "rich-textarea [contenteditable='true'], rich-textarea textarea, [data-placeholder*='Enter a prompt' i], [role='textbox'], textarea",
    sendButton: "button[aria-label*='Send' i], button[aria-label*='Enviar' i], button[mattooltip*='Send' i], button[mattooltip*='Enviar' i]"
  },
  {
    name: "Claude",
    url: "https://claude.ai/new",
    composer: "div[contenteditable='true'], [role='textbox'], textarea",
    sendButton: "button[aria-label*='Send' i], button[aria-label*='Enviar' i], button[data-testid*='send']"
  },
  {
    name: "Copilot",
    url: "https://copilot.microsoft.com/",
    composer: "textarea, [contenteditable='true'], [role='textbox']",
    sendButton: "button[aria-label*='Send' i], button[aria-label*='Enviar' i], button[type='submit']"
  },
  {
    name: "Perplexity",
    url: "https://www.perplexity.ai/",
    composer: "textarea, [contenteditable='true'], [role='textbox']",
    sendButton: "button[aria-label*='Submit' i], button[aria-label*='Send' i], button[aria-label*='Enviar' i], button[type='submit']"
  }
];

async function getInteractions(worker) {
  return worker.evaluate(async () => {
    const result = await chrome.storage.local.get(["interactions"]);
    return result.interactions || [];
  });
}

async function getPageDiagnostics(page, provider, worker) {
  const pageInfo = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    visibleText: (document.body?.innerText || "").slice(0, 1200),
    inputs: Array.from(document.querySelectorAll("textarea, input, [contenteditable='true'], [role='textbox']"))
      .slice(0, 20)
      .map(el => ({
        tag: el.tagName,
        id: el.id || "",
        role: el.getAttribute("role") || "",
        ariaLabel: el.getAttribute("aria-label") || "",
        placeholder: el.getAttribute("placeholder") || el.getAttribute("data-placeholder") || "",
        contenteditable: el.getAttribute("contenteditable") || "",
        visible: !!(el.getClientRects().length)
      }))
  })).catch(error => ({ pageEvaluationError: error.message }));

  const interactions = await getInteractions(worker).catch(error => [{ readError: error.message }]);
  return { provider: provider.name, page: pageInfo, interactionCount: interactions.length, latestInteractions: interactions.slice(-3) };
}

async function waitForNewInteraction(worker, previousCount, providerName, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const interactions = await getInteractions(worker);
    if (interactions.length > previousCount) {
      const added = interactions.slice(previousCount);
      const matching = added.find(item => item.service === providerName);
      if (!matching) {
        throw new Error(`Houve novo registro, mas o serviço não corresponde a ${providerName}. Registros novos: ${JSON.stringify(added)}`);
      }
      return interactions;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const interactions = await getInteractions(worker);
  throw new Error(`A extensão não registrou interação para ${providerName} em ${timeoutMs} ms. Contagem anterior: ${previousCount}; atual: ${interactions.length}; últimos registros: ${JSON.stringify(interactions.slice(-3))}`);
}

async function findVisibleComposer(page, selector, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
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
  throw new Error("Campo de mensagem não encontrado após 120 segundos.");
}

async function sendTestPrompt(page, provider, composer, prompt) {
  await composer.click();
  try {
    await composer.fill(prompt);
  } catch {
    await composer.press("Control+A");
    await composer.type(prompt);
  }

  const sendButton = page.locator(provider.sendButton).last();
  if (await sendButton.count().catch(() => 0) > 0 &&
      await sendButton.isVisible().catch(() => false) &&
      await sendButton.isEnabled().catch(() => false)) {
    await sendButton.click();
    return "botão específico";
  }

  // Fallback explícito: Enter só é usado se não houver botão específico visível.
  await composer.press("Enter");
  return "Enter (fallback)";
}

test("interfaces reais: registra uma interação em cada uma das cinco IAs", {
  skip: !enabled && "Teste opt-in: use set ECOIA_REAL_TESTS=1 && npm run test:real",
  timeout: 20 * 60 * 1000
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
      await t.test(provider.name, async subtest => {
        const page = await context.newPage();
        try {
          const before = await getInteractions(worker);
          await page.goto(provider.url, { waitUntil: "domcontentloaded", timeout: 60000 });

          // Não tenta enviar mensagens quando a conta Claude está bloqueada.
          // Esse estado é da conta, não uma falha de detecção da extensão.
          if (provider.name === "Claude") {
            const claudePage = `${page.url()} ${await page.locator("body").innerText().catch(() => "")}`;
            if (claudePage.includes("/restricted/submit") || /Solicitar uma revisão|conta foi suspensa|account has been suspended/i.test(claudePage)) {
              subtest.skip("Conta Claude suspensa/restrita; teste real não pode ser executado até a conta ser liberada.");
              return;
            }
          }

          const composer = await findVisibleComposer(page, provider.composer);
          const prompt = `Teste de monitoramento EcoIA-Extension. Responda apenas: teste recebido. Código: ${Date.now()}`;
          const sendMethod = await sendTestPrompt(page, provider, composer, prompt);

          try {
            const after = await waitForNewInteraction(worker, before.length, provider.name);
            assert.equal(after.length, before.length + 1,
              `${provider.name}: esperado exatamente um registro adicional; método de envio: ${sendMethod}`);
          } catch (error) {
            const diagnostics = await getPageDiagnostics(page, provider, worker);
            throw new Error(`${error.message}\nMétodo de envio: ${sendMethod}\nDiagnóstico: ${JSON.stringify(diagnostics, null, 2)}`);
          }
        } catch (error) {
          if (!error.message.includes("Diagnóstico:")) {
            const diagnostics = await getPageDiagnostics(page, provider, worker).catch(e => ({ diagnosticError: e.message }));
            throw new Error(`${error.message}\nDiagnóstico: ${JSON.stringify(diagnostics, null, 2)}`);
          }
          throw error;
        } finally {
          await page.close().catch(() => {});
        }
      });
    }
  } finally {
    await context.close();
  }
});
