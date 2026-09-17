function calculateEnergy(interactions, scenarioValue) {
    return interactions * scenarioValue;
}


function formatEnergy(energyWh) {
    return Number(energyWh.toFixed(4));
}


export {
    calculateEnergy,
    formatEnergy
};