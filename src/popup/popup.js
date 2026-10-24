
import {
    calculateEnergy,
    formatEnergy
} from "../calculations/energy.js";

import {
    loadParameters
} from "../services/parameters.js";

document.addEventListener("DOMContentLoaded", async () => {
    const serviceElement = document.getElementById("service");
    const interactionsElement = document.getElementById("interactions");
    const scenarioSelect = document.getElementById("scenario");
    const energyElement = document.getElementById("energy");
    const waterElement = document.getElementById("water");
    const webEnergyElement = document.getElementById("webEnergy");
    const simulationToggle = document.getElementById("simulationToggle");
    const simulationStatus = document.getElementById("simulationStatus");
    const webResult = await chrome.storage.local.get(["webVisits"]);
    const webVisits = webResult.webVisits || [];
    
    const transferResult = await chrome.storage.local.get(["webTransfer"]);

    const transferRecords = (transferResult.webTransfer || []).filter(
        record => typeof record.pageId === "string"
    );

    const totalBytes = transferRecords.reduce(
        (total, record) => total + (Number(record.bytes) || 0),
        0
    );

    const totalResources = transferRecords.reduce(
        (total, record) => total + (Number(record.resources) || 0),
        0
    );

    const zeroSizeResources = transferRecords.reduce(
        (total, record) => total + (Number(record.zeroSizeResources) || 0),
        0
    );

    const totalKB = totalBytes / 1024;

    document.getElementById("webData").textContent =
        `${totalKB.toFixed(2)} KB`;

    document.getElementById("webDataDetails").textContent =
        `${totalResources} recursos observados; ` +
        `${zeroSizeResources} com tamanho zero.`;

    const totalSeconds = webVisits.reduce(
        (total, visit) => total + visit.durationSeconds,
        0
    );

    const minutos = Math.floor(totalSeconds / 60);
    const segundos = totalSeconds % 60;

    document.getElementById("webTime").textContent =
        `${minutos} min ${segundos} s`;

    try {
        // Recupera as interações armazenadas
        const result = await chrome.storage.local.get(["interactions"]);
        const interactions = result.interactions || [];

        let simulated = false;
        const realInteractionCount = interactions.length;
        interactionsElement.textContent = realInteractionCount;

        // Identifica o serviço da aba atual
        const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (tabs.length === 0 || !tabs[0].url) {
            serviceElement.textContent = "Página desconhecida";
        } else {
            serviceElement.textContent = identifyService(tabs[0].url);
        }

        // Carrega os parâmetros do arquivo JSON
        const parameters = await loadParameters();

        // Parâmetro de água de referência (mL por interação)
        const waterPerInteraction =
            parameters.ai.water.reference.value;

        function updateEstimates() {
            const scenario = scenarioSelect.value;

            const energyPerInteraction =
                parameters.ai.energy.scenarios[scenario];

            // Energia estimada em Wh
            const interactionCount = simulated ? 100 : realInteractionCount;
            const energy = calculateEnergy(
                interactionCount,
                energyPerInteraction
            );

            // Energia estimada da navegação web, em Wh.
            // A conversão usa GB decimal: 1 GB = 1.000.000.000 bytes.
            const webEnergyPerGB =
                parameters.web.energy.scenarios[scenario];

            const webEnergy =
                (totalBytes / 1_000_000_000) * webEnergyPerGB;

            webEnergyElement.textContent =
                `${formatEnergy(webEnergy)} Wh`;

            energyElement.textContent =
                `${formatEnergy(energy)} Wh`;

            // Água estimada em mL
            const water =
                interactionCount * waterPerInteraction;

            waterElement.textContent =
                `${Number(water.toFixed(4))} mL`;
            interactionsElement.textContent = interactionCount;
            serviceElement.textContent = simulated
                ? "SIMULAÇÃO — ChatGPT"
                : (tabs.length === 0 || !tabs[0].url
                    ? "Página desconhecida"
                    : identifyService(tabs[0].url));
            simulationStatus.textContent = simulated
                ? "Modo de demonstração ativo. Dados reais preservados."
                : "Dados reais da extensão.";
            simulationToggle.textContent = simulated
                ? "Voltar aos dados reais"
                : "Simular 100 interações";
        }

        // Atualiza ao abrir o popup
        updateEstimates();

        // Atualiza energia ao trocar o cenário
        scenarioSelect.addEventListener("change", updateEstimates);

        simulationToggle.addEventListener("click", () => {
            simulated = !simulated;
            updateEstimates();
        });

    } catch (error) {
        console.error("Erro ao carregar as estimativas:", error);

        energyElement.textContent = "Erro ao calcular";
        waterElement.textContent = "Erro ao calcular";
        webEnergyElement.textContent = "Erro ao calcular";
    }
});

function identifyService(url) {
    if (!url) {
        return "Página desconhecida";
    }

    if (
        url.includes("chatgpt.com") ||
        url.includes("chat.openai.com")
    ) {
        return "IA — ChatGPT";
    }

    if (url.includes("gemini.google.com")) {
        return "IA — Gemini";
    }

    if (url.includes("claude.ai")) {
        return "IA — Claude";
    }

    if (url.includes("copilot.microsoft.com") || url.includes("copilot.cloud.microsoft") || url.includes("m365.cloud.microsoft")) {
        return "IA — Copilot";
    }

    if (url.includes("perplexity.ai")) {
        return "IA — Perplexity";
    }

    return "WEB";
}