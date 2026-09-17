
const host = window.location.hostname;

let tipo = "WEB";
let servico = null;

if (
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
            '[contenteditable="true"][data-testid*="prompt"]'
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
                'button[aria-label="Enviar prompt"]'
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
    let bytesColetados = 0;
    let recursosObservados = 0;
    let recursosSemTamanho = 0;

    const recursosProcessados = new Set();

    console.log("Monitoramento de transferência WEB iniciado.");

    function registrarDadosTransferidos(entry) {
        // Ignora entradas sem URL válida
        if (!entry.name) return;

        // Evita processar a mesma entrada duas vezes
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

        console.log("Recurso observado:", {
            tamanhoBytes: bytes,
            totalBytesColetados: bytesColetados,
            recursosObservados,
            recursosSemTamanho
        });
    }

    function enviarResumo() {
        if (recursosObservados === 0) return;

        chrome.runtime.sendMessage({
            type: "WEB_TRANSFER",
            domain: host,
            timestamp: new Date().toISOString(),
            bytes: bytesColetados,
            resources: recursosObservados,
            zeroSizeResources: recursosSemTamanho
        }, () => {
            if (chrome.runtime.lastError) {
                console.error(
                    "Erro ao enviar dados WEB:",
                    chrome.runtime.lastError.message
                );
                return;
            }

            console.log("Resumo de transferência enviado.");
        });
    }

    // Observa novos recursos carregados
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            registrarDadosTransferidos(entry);
        }

        enviarResumo();
    });

    observer.observe({
        type: "resource",
        buffered: true
    });

    // Permite observar mais recursos em páginas extensas
    performance.setResourceTimingBufferSize(2000);

    // Envia um resumo ao sair da página
    window.addEventListener("pagehide", enviarResumo);
}