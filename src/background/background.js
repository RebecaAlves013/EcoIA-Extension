const AI_SERVICES = [
    "chatgpt.com",
    "chat.openai.com",
    "gemini.google.com",
    "claude.ai",
    "copilot.microsoft.com",
    "perplexity.ai"
];

function identificarCategoria(url) {
    if (!url) {
        return "desconhecido";
    }

    try {
        const dominio = new URL(url).hostname;

        const ehIA = AI_SERVICES.some(servico =>
            dominio === servico || dominio.endsWith("." + servico)
        );

        if (ehIA) {
            return "ia";
        }

        return "web";

    } catch (erro) {
        return "desconhecido";
    }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {

    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);

        const categoria = identificarCategoria(tab.url);

        const registro = {
            categoria: categoria,
            url: tab.url,
            dominio: tab.url ? new URL(tab.url).hostname : "",
            data: new Date().toISOString()
        };

        console.log("Atividade detectada:", registro);

        await chrome.storage.local.set({
            atividadeAtual: registro
        });

    } catch (erro) {
        console.error("Erro ao identificar atividade:", erro);
    }
});