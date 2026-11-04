// ==========================================
// FILE: simulation.js
// Deskripsi: Logika Simulasi Trading (Mesin Inti)
// ==========================================

function startSimulation() {
    simBalance = simConfig.balance;
    simRiskPercent = simConfig.risk;
    tradeHistory = [];
    isSimulationRunning = true;
    console.log("Simulasi dimulai. Saldo:", simBalance, "Risk:", simRiskPercent);
}

function checkTradeHits() {
    if (currentMode !== 'simulation' || !isSimulationRunning) return;
    if (fullData.length === 0) return;

    let lastCandleIdx = currentReplayIndex - 1;
    if (lastCandleIdx < 0) return;
    let c = fullData[lastCandleIdx];

    let updated = false;

    drawings.forEach(d => {
        if (!d.type.startsWith('position')) return;

        let isLong = d.type === 'position-long';

        // 1. Cek Pending Order
        if (d.status === 'pending') {
            if (c.low <= d.start.price && c.high >= d.start.price) {
                d.status = 'active';
                d.entryTime = c.time; 
                d.entryIdx = lastCandleIdx;
                
                let riskAmount = simBalance * (simRiskPercent / 100);
                let distance = Math.abs(d.start.price - d.sl);
                if (distance === 0) distance = 0.01; 
                
                d.valuePerPoint = riskAmount / distance;
                d.initialSL = d.sl; 
                updated = true;
            }
        }

        // 2. Cek Active Trade (TP/SL & Auto-Extend)
        if (d.status === 'active') {
            // AUTO-EXTEND: Paksa ujung kanan kotak memanjang ke candle terbaru + 1 celah
            let nextIdx = Math.min(currentReplayIndex, fullData.length - 1);
            if (fullData[nextIdx]) {
                d.end.time = fullData[nextIdx].time;
            }

            let hitExit = false;
            let exitPrice = c.close;
            let isWin = false;

            if (isLong) {
                if (c.open <= d.sl) { hitExit = true; exitPrice = c.open; isWin = false; }
                else if (c.open >= d.tp) { hitExit = true; exitPrice = c.open; isWin = true; }
                else if (c.low <= d.sl) { hitExit = true; exitPrice = d.sl; isWin = false; }
                else if (c.high >= d.tp) { hitExit = true; exitPrice = d.tp; isWin = true; }
            } else {
                if (c.open >= d.sl) { hitExit = true; exitPrice = c.open; isWin = false; }
                else if (c.open <= d.tp) { hitExit = true; exitPrice = c.open; isWin = true; }
                else if (c.high >= d.sl) { hitExit = true; exitPrice = d.sl; isWin = false; }
                else if (c.low <= d.tp) { hitExit = true; exitPrice = d.tp; isWin = true; }
            }

            if (hitExit) {
                closeTrade(d, exitPrice, isWin ? 'WIN' : 'LOSS', c.time);
                updated = true;
            } else {
                d.pnl = isLong ? (c.close - d.start.price) * d.valuePerPoint : (d.start.price - c.close) * d.valuePerPoint;
                updated = true;
            }
        }
    });

    if (updated && typeof saveToLocalStorage === 'function') {
        saveToLocalStorage();
    }
}

function closeTrade(drawing, exitPrice, status, exitTime) {
    drawing.status = 'closed';
    drawing.exitPrice = exitPrice;
    drawing.exitTime = exitTime; // Simpan waktu persis candle keluar
    
    let isLong = drawing.type === 'position-long';
    let finalPnl = isLong ? (exitPrice - drawing.start.price) * drawing.valuePerPoint : (drawing.start.price - exitPrice) * drawing.valuePerPoint;
    drawing.pnl = finalPnl;

    simBalance += finalPnl;

    tradeHistory.push({
        id: Date.now(),
        type: drawing.type,
        entry: drawing.start.price,
        exit: exitPrice,
        pnl: finalPnl,
        status: status,
        time: new Date().toISOString()
    });
}

function forceCloseAllTrades() {
    if (fullData.length === 0) return;
    let lastC = fullData[currentReplayIndex - 1] || fullData[fullData.length - 1];
    
    drawings.forEach(d => {
        if (d.type.startsWith('position') && d.status === 'active') {
            closeTrade(d, lastC.close, 'CLOSED (End)', lastC.time);
        }
    });
    isSimulationRunning = false;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
}
