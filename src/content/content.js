
const host = window.location.hostname;

// Modo de teste restrito ao servidor local usado pelos testes automatizados.
// Não ativa em sites públicos nem altera o comportamento normal da extensão.
const isAutomatedChatGPTTest =
    host === "127.0.0.1" &&
    new URLSearchParams(window.location.search).get("ecoiaTest") === "chatgpt";

let tipo = "WEB";
let servico = null;

if (
    isAutomatedChatGPTTest ||
    host === "chatgpt.com" ||
    host.endsWith(".chatgpt.com") ||
    host === "chat.openai.com"
) {
    tipo = "IA";
    servico = "ChatGPT";
} else if (host === "gemini.google.com") {
    tipo = "IA";
    servico = "Gemini";
} else if (host === "claude.ai" || host.endsWith(".claude.ai")) {
    tipo = "IA";
    servico = "Claude";
} else if (host === "copilot.microsoft.com") {
    tipo = "IA";
    servico = "Copilot";
} else if (
    host === "perplexity.ai" ||
    host.endsWith(".perplexity.ai")
) {
    tipo = "IA";
    servico = "Perplexity";
}

console.log("Green AI Monitor");
console.log("Domínio:", host);
console.log("Tipo:", tipo);
console.log("Serviço:", servico);

if (tipo === "IA") {
    let ultimoRegistro = 0;

    function registrarInteracao(origem) {
        const agora = Date.now();

        // Evita contar duas vezes o mesmo envio
        if (agora - ultimoRegistro < 1200) {
            console.log("Possível duplicação ignorada.");
            return;
        }

        ultimoRegistro = agora;

        console.log("Tentando registrar envio:", origem);

        chrome.runtime.sendMessage({
            type: "AI_INTERACTION",
            service: servico,
            timestamp: new Date().toISOString()
        }, () => {
            if (chrome.runtime.lastError) {
                console.error(
                    "Erro ao registrar:",
                    chrome.runtime.lastError.message
                );
                return;
            }

            console.log("Interação enviada ao background.");
        });
    }

    function campoTemTexto(campo) {
        if (!campo) return false;

        const texto = campo.value ?? campo.innerText ?? "";
        return texto.trim().length > 0;
    }

    function obterCampoChatGPT() {
    return document.querySelector(
        '#prompt-textarea, ' +
        'textarea[data-testid*="prompt"], ' +
        '[contenteditable="true"][data-testid*="prompt"], ' +
        '[contenteditable="true"][aria-label="Pergunte ao ChatGPT"], ' +
        '[contenteditable="true"].ProseMirror'
    );
}

    if (servico === "ChatGPT") {
        // Detecta Enter no campo de mensagem
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || event.shiftKey) {
                return;
            }

            const campo = obterCampoChatGPT();

            if (!campo || !campo.contains(event.target) &&
                campo !== event.target) {
                return;
            }

            if (!campoTemTexto(campo)) {
                return;
            }

            registrarInteracao("Enter no campo do ChatGPT");
        }, true);

        // Detecta clique no botão de envio
        document.addEventListener("click", (event) => {
            const alvo = event.target;

            if (!(alvo instanceof Element)) return;

            const botao = alvo.closest(
                'button[data-testid="send-button"], ' +
                'button[aria-label="Send prompt"], ' +
                'button[aria-label="Enviar prompt"], ' +
                'button[aria-label="Enviar"]'
            );

            if (!botao) return;

            const campo = obterCampoChatGPT();

            if (!campoTemTexto(campo)) {
                console.log("Botão clicado sem texto no campo.");
                return;
            }

            registrarInteracao("clique no botão do ChatGPT");
        }, true);
    } else {
        // Alternativa inicial para outros serviços de IA
        document.addEventListener("submit", (event) => {
            const formulario = event.target;

            if (!(formulario instanceof HTMLFormElement)) {
                return;
            }

            if (!formulario.querySelector(
                'textarea, input, [contenteditable="true"]'
            )) {
                return;
            }

            const campos = formulario.querySelectorAll(
                'textarea, input, [contenteditable="true"]'
            );

            const temTexto = Array.from(campos).some(campo =>
                campoTemTexto(campo)
            );

            if (temTexto) {
                registrarInteracao("envio de formulário");
            }
        }, true);
    }
}



/*
 * Green AI Monitor
 * Coleta experimental de tamanhos de recursos
 * em páginas de navegação convencional.
 */

if (tipo === "WEB") {
    // Identifica esta instância da página sem guardar a URL completa.
    const pageId =
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const recursosProcessados = new Set();

    let bytesColetados = 0;
    let recursosObservados = 0;
    let recursosSemTamanho = 0;

    let envioAgendado = false;

    console.log("Monitoramento de transferência WEB iniciado.");

    function registrarDadosTransferidos(entry) {
        if (!entry.name) return;

        // A URL completa é usada somente localmente para deduplicar.
        // Ela não é enviada nem armazenada pela extensão.
        const chave = `${entry.name}|${entry.startTime}`;

        if (recursosProcessados.has(chave)) return;

        recursosProcessados.add(chave);
        recursosObservados++;

        const bytes = Number(entry.transferSize) || 0;

        if (bytes > 0) {
            bytesColetados += bytes;
        } else {
            recursosSemTamanho++;
        }
    }

    function enviarResumo() {
        envioAgendado = false;

        if (recursosObservados === 0) return;

        chrome.runtime.sendMessage({
            type: "WEB_TRANSFER",
            pageId,
            domain: host,
            timestamp: new Date().toISOString(),
            bytes: bytesColetados,
            resources: recursosObservados,
            zeroSizeResources: recursosSemTamanho
        }, () => {
            if (chrome.runtime.lastError) {
                console.warn(
                    "Não foi possível enviar o resumo WEB:",
                    chrome.runtime.lastError.message
                );
            }
        });
    }

    function agendarEnvio() {
        if (envioAgendado) return;

        envioAgendado = true;

        // Agrupa várias entradas antes de atualizar o armazenamento.
        setTimeout(enviarResumo, 1000);
    }

    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            registrarDadosTransferidos(entry);
        }

        agendarEnvio();
    });

    observer.observe({
        type: "resource",
        buffered: true
    });

    performance.setResourceTimingBufferSize(2000);

    // Tenta enviar o resumo final ao sair da página.
    window.addEventListener("pagehide", enviarResumo);
}
