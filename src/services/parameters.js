async function loadParameters() {

    const url = chrome.runtime.getURL("data/parameters.json");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Não foi possível carregar os parâmetros.");
    }

    return await response.json();
}


export {
    loadParameters
};