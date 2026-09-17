
console.log("Green AI Monitor iniciado.");

const CHAVE_ATIVIDADE = "webActivity";
const CHAVE_VISITAS = "webVisits";

function identificarTipo(url) {
    if (!url) return "OUTRO";

    let host;

    try {
        host = new URL(url).hostname;
    } catch {
        return "OUTRO";
    }

    const dominiosIA = [
        "chatgpt.com",
        "chat.openai.com",
        "gemini.google.com",
        "claude.ai",
        "copilot.microsoft.com",
        "perplexity.ai"
    ];

    const ehIA = dominiosIA.some(
        dominio => host === dominio || host.endsWith("." + dominio)
    );

    return ehIA ? "IA" : "WEB";
}

async function obterAbaAtiva() {
    const abas = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    });

    return abas[0] || null;
}

async function iniciarAtividade(tab) {
    if (!tab || !tab.id || !tab.url) return;

    if (identificarTipo(tab.url) !== "WEB") {
        await chrome.storage.local.remove(CHAVE_ATIVIDADE);
        return;
    }

    const atividade = {
        tabId: tab.id,
        url: tab.url,
        inicio: Date.now()
    };

    await chrome.storage.local.set({
        [CHAVE_ATIVIDADE]: atividade
    });

    console.log("Navegação iniciada:", tab.url);
}

async function encerrarAtividade() {
    const resultado = await chrome.storage.local.get(CHAVE_ATIVIDADE);
    const atividade = resultado[CHAVE_ATIVIDADE];

    if (!atividade) return;

    const fim = Date.now();
    const segundos = Math.max(
        0,
        Math.round((fim - atividade.inicio) / 1000)
    );

    if (segundos > 0) {
        const resultadoVisitas = await chrome.storage.local.get(CHAVE_VISITAS);
        const visitas = resultadoVisitas[CHAVE_VISITAS] || [];

        visitas.push({
            tabId: atividade.tabId,
            url: atividade.url,
            timestamp: new Date(atividade.inicio).toISOString(),
            durationSeconds: segundos
        });

        await chrome.storage.local.set({
            [CHAVE_VISITAS]: visitas
        });

        console.log("Tempo web registrado:", segundos, "segundos");
    }

    await chrome.storage.local.remove(CHAVE_ATIVIDADE);
}

// Quando o usuário muda de aba
chrome.tabs.onActivated.addListener(async (info) => {
    await encerrarAtividade();

    const tab = await chrome.tabs.get(info.tabId).catch(() => null);
    await iniciarAtividade(tab);
});

// Quando a URL da aba muda
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (tab.active && changeInfo.url) {
        await encerrarAtividade();
        await iniciarAtividade(tab);
    }
});

// Quando o Chrome perde ou recebe foco
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        await encerrarAtividade();
        return;
    }

    const tab = await obterAbaAtiva();

    if (tab) {
        await iniciarAtividade(tab);
    }
});

// Mantém o registro de interações de IA
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "AI_INTERACTION") {
        chrome.storage.local.get(["interactions"], (result) => {
            const interactions = result.interactions || [];

            interactions.push({
                service: message.service,
                timestamp: message.timestamp
            });

            chrome.storage.local.set(
                { interactions },
                () => {
                    console.log(
                        "Interação salva. Total:",
                        interactions.length
                    );

                    sendResponse({ success: true });
                }
            );
        });

        return true;
    }

    
    if (message.type === "WEB_TRANSFER") {
        chrome.storage.local.get(["webTransfer"], (result) => {
            const registros = result.webTransfer || [];

            registros.push({
                tabId: sender.tab?.id ?? null,
                domain: message.domain,
                timestamp: message.timestamp,
                bytes: message.bytes,
                resources: message.resources,
                zeroSizeResources: message.zeroSizeResources
            });

            chrome.storage.local.set(
                { webTransfer: registros },
                () => {
                    console.log(
                        "Resumo WEB salvo:",
                        message.bytes,
                        "bytes"
                    );

                    sendResponse({ success: true });
                }
            );
        });

        return true;
    }
});

// Inicia a contagem da aba ativa quando o service worker é instalado
chrome.runtime.onStartup.addListener(async () => {
    const tab = await obterAbaAtiva();
    if (tab) await iniciarAtividade(tab);
});

chrome.runtime.onInstalled.addListener(async () => {
    const tab = await obterAbaAtiva();
    if (tab) await iniciarAtividade(tab);
});