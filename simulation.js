// ==========================================
// FILE: simulation.js
// Deskripsi: Logika Simulasi Trading
// ==========================================

let currentMode = 'backtest';
let simConfig = { balance: 100, risk: 1, startDate: null, endDate: null };
let activeTrades = [];
let tradeHistory = [];

function startSimulation() {
    console.log("Simulasi dimulai dengan modal:", simConfig.balance);
}
