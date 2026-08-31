document.addEventListener("DOMContentLoaded", async () => {

    const resultado = await chrome.storage.local.get("atividadeAtual");

    const atividade = resultado.atividadeAtual;

    const categoriaElement = document.getElementById("categoria");
    const dominioElement = document.getElementById("dominio");

    if (!atividade) {

        categoriaElement.textContent = "Nenhuma atividade";

        dominioElement.textContent = "--";

        return;
    }

    if (atividade.categoria === "ia") {

        categoriaElement.textContent = "🤖 Inteligência Artificial";

    } else if (atividade.categoria === "web") {

        categoriaElement.textContent = "🌐 Navegação Web";

    } else {

        categoriaElement.textContent = "❓ Desconhecido";

    }

    dominioElement.textContent = atividade.dominio;

});