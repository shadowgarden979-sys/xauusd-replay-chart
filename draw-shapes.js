// ==========================================
// FILE: draw-shapes.js
// Deskripsi: Semua fungsi menggambar di Canvas
// ==========================================

let warningCache = [];
let lastWarningRange = "";

function formatFullTime(timestamp) {
    let d = new Date(timestamp * 1000);
    let days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    let months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    let dayName = days[d.getUTCDay()];
    let dateStr = d.getUTCDate().toString().padStart(2, '0');
    let monthStr = months[d.getUTCMonth()];
    let yearStr = d.getUTCFullYear();
    let hh = d.getUTCHours().toString().padStart(2, '0');
    let mm = d.getUTCMinutes().toString().padStart(2, '0');
    return { dayName, dateStr, monthStr, yearStr, hh, mm };
}

function updateDateHUD() {
    let idx = isReplayMode ? Math.max(0, currentReplayIndex - 1) : fullData.length - 1;
    if (fullData[idx]) {
        let t = formatFullTime(fullData[idx].time);
        document.getElementById('date-hud').innerText = `${t.dayName}, ${t.dateStr} ${t.monthStr} ${t.yearStr} | ${t.hh}:${t.mm}`;
    }
}

function drawWarnings() {
    let limit = isReplayMode ? currentReplayIndex - 1 : fullData.length - 1;
    if (limit < 0 || !chart) return;

    let range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;
    
    let rangeStr = `${Math.round(range.from)}_${Math.round(range.to)}_${limit}`;
    
    if (rangeStr !== lastWarningRange) {
        lastWarningRange = rangeStr;
        warningCache = [];
        
        for (let i = 0; i <= limit; i++) {
            let c = fullData[i];
            let d = new Date(c.time * 1000);
            let day = d.getUTCDay(); 
            let hours = d.getUTCHours();
            let mins = d.getUTCMinutes();

            if ((day === 5 && hours === 21 && mins === 0) || (day === 1 && hours === 0 && mins === 0)) {
                let x = getX(c.time);
                if (x !== null) {
                    warningCache.push({ x: x, isClose: day === 5 });
                }
            }
        }
    }

    warningCache.forEach(w => {
        bgCtx.save();
        if (w.isClose) {
            bgCtx.strokeStyle = '#FFD700'; bgCtx.lineWidth = 1; bgCtx.setLineDash([5, 5]);
            bgCtx.beginPath(); bgCtx.moveTo(w.x, 0); bgCtx.lineTo(w.x, bgCanvas.height); bgCtx.stroke();
            bgCtx.fillStyle = '#FFD700'; bgCtx.font = 'bold 10px sans-serif'; bgCtx.textAlign = 'center';
            bgCtx.fillText("⚠️ Closing Soon", w.x, 15);
        } else {
            bgCtx.strokeStyle = '#26a69a'; bgCtx.lineWidth = 1; bgCtx.setLineDash([5, 5]);
            bgCtx.beginPath(); bgCtx.moveTo(w.x, 0); bgCtx.lineTo(w.x, bgCanvas.height); bgCtx.stroke();
            bgCtx.fillStyle = '#26a69a'; bgCtx.font = 'bold 10px sans-serif'; bgCtx.textAlign = 'center';
            bgCtx.fillText("🟢 Open Market", w.x, 15);
        }
        bgCtx.restore();
    });
}

function drawMeasureTool() {
    const x1 = getX(measureStart.time); const y1 = getY(measureStart.price);
    const x2 = getX(measureEnd.time); const y2 = getY(measureEnd.price);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return;

    fgCtx.save();
    fgCtx.strokeStyle = '#888888'; fgCtx.lineWidth = 1; fgCtx.setLineDash([3, 3]); 
    fgCtx.beginPath(); fgCtx.moveTo(x1, 0); fgCtx.lineTo(x1, fgCanvas.height); fgCtx.stroke();
    fgCtx.beginPath(); fgCtx.moveTo(0, y1); fgCtx.lineTo(fgCanvas.width, y1); fgCtx.stroke();
    fgCtx.beginPath(); fgCtx.moveTo(x2, 0); fgCtx.lineTo(x2, fgCanvas.height); fgCtx.stroke();
    fgCtx.beginPath(); fgCtx.moveTo(0, y2); fgCtx.lineTo(fgCanvas.width, y2); fgCtx.stroke();
    fgCtx.restore();

    fgCtx.fillStyle = 'rgba(41, 98, 255, 0.15)';
    fgCtx.strokeStyle = '#2962FF'; fgCtx.lineWidth = 1; fgCtx.setLineDash([]);
    fgCtx.beginPath(); fgCtx.rect(x1, y1, x2 - x1, y2 - y1); fgCtx.fill(); fgCtx.stroke();

    const pipDiff = Math.abs(measureEnd.price - measureStart.price) * 10;
    const timeDiffSeconds = Math.abs(measureEnd.time - measureStart.time);
    const timeDiffMinutes = timeDiffSeconds / 60; 
    const hours = Math.floor(timeDiffMinutes / 60);
    const mins = timeDiffMinutes % 60;
    const timeStr = (hours > 0 ? hours + 'h ' : '') + mins + 'm';

    const text = `${pipDiff.toFixed(1)} Pips | ${timeStr}`;
    
    fgCtx.font = '12px sans-serif';
    const textWidth = fgCtx.measureText(text).width;
    const boxX = (x1 + x2) / 2 - textWidth / 2 - 5;
    const boxY = (y1 + y2) / 2 - 10;

    fgCtx.fillStyle = '#2B2B43'; fgCtx.fillRect(boxX, boxY, textWidth + 10, 20);
    fgCtx.fillStyle = '#ffffff'; fgCtx.textAlign = 'center'; fgCtx.textBaseline = 'middle';
    fgCtx.fillText(text, boxX + (textWidth + 10) / 2, boxY + 10);
}

function calculateTradeLine(d) {
    let startTime = d.start.time;
    let endTime = d.end.time;
    
    let entryIndex = 0;
    let left = 0, right = fullData.length - 1;
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (fullData[mid].time >= startTime) {
            entryIndex = mid;
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }

    let maxIdx = Math.min(fullData.length - 1, isReplayMode ? currentReplayIndex - 1 : fullData.length - 1);
    
    left = 0; right = fullData.length - 1;
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (fullData[mid].time > endTime) {
            maxIdx = Math.min(maxIdx, mid - 1);
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }

    if (maxIdx < 0 || entryIndex > maxIdx) return null;

    let hitEntryIndex = null;
    for (let i = entryIndex; i <= maxIdx; i++) {
        let c = fullData[i];
        // Toleransi desimal 0.05 untuk XAUUSD
        if (c.low <= d.start.price + 0.05 && c.high >= d.start.price - 0.05) { 
            hitEntryIndex = i; break; 
        }
    }
    
    if (hitEntryIndex === null) return null; 

    let hitExitIndex = null, hitExitPrice = null;
    let isLong = d.type === 'position-long';

    for (let i = hitEntryIndex; i <= maxIdx; i++) {
        let c = fullData[i];
        if (isLong) {
            if (c.high >= d.tp) { hitExitIndex = i; hitExitPrice = d.tp; break; }
            if (c.low <= d.sl) { hitExitIndex = i; hitExitPrice = d.sl; break; }
        } else {
            if (c.low <= d.tp) { hitExitIndex = i; hitExitPrice = d.tp; break; }
            if (c.high >= d.sl) { hitExitIndex = i; hitExitPrice = d.sl; break; }
        }
    }

    if (hitExitIndex !== null) {
        return { startIdx: hitEntryIndex, endIdx: hitExitIndex, endPrice: hitExitPrice };
    } else {
        return { startIdx: hitEntryIndex, endIdx: maxIdx, endPrice: fullData[maxIdx].close };
    }
}

function drawPositionBg(d) {
    const x1 = getX(d.start.time); const x2 = getX(d.end.time);
    const yEntry = getY(d.start.price); const yTP = getY(d.tp); const ySL = getY(d.sl);
    
    if (x1 === null || x2 === null || yEntry === null || yTP === null || ySL === null) return;

    const isLong = d.type === 'position-long';
    const baseOp = d.baseOpacity !== undefined ? d.baseOpacity : 0.1;
    const activeOp = d.activeOpacity !== undefined ? d.activeOpacity : 0.4;

    bgCtx.fillStyle = `rgba(38, 166, 154, ${baseOp})`;
    bgCtx.beginPath(); bgCtx.rect(x1, yTP, x2 - x1, yEntry - yTP); bgCtx.fill();
    
    bgCtx.fillStyle = `rgba(239, 83, 80, ${baseOp})`;
    bgCtx.beginPath(); bgCtx.rect(x1, yEntry, x2 - x1, ySL - yEntry); bgCtx.fill();

    const tradeInfo = calculateTradeLine(d);
    
    if (tradeInfo) {
        const xStart = getX(fullData[tradeInfo.startIdx].time);
        const xExit = Math.min(getX(fullData[tradeInfo.endIdx].time), x2);
        let yExit = getY(tradeInfo.endPrice);
        
        if (xExit > x2) {
            const ratio = (x2 - x1) / (xExit - x1);
            yExit = yEntry + (yExit - yEntry) * ratio;
        }

        // PERBAIKAN CLAMPING: Batasi garis agar tidak melewati TP/SL sebenarnya
        if (isLong) {
            yExit = Math.max(yTP, Math.min(ySL, yExit)); 
        } else {
            yExit = Math.max(ySL, Math.min(yTP, yExit));
        }

        // PERBAIKAN WARNA: Berdasarkan untung/rugi, bukan posisi Y semata
        let isWin = isLong ? (yExit < yEntry) : (yExit > yEntry);
        
        if (Math.abs(yExit - yEntry) > 1) { // Jika ada pergerakan berarti
            if (isWin) {
                bgCtx.fillStyle = `rgba(38, 166, 154, ${activeOp})`; // Hijau (Profit)
                bgCtx.beginPath(); 
                bgCtx.rect(xStart, Math.min(yEntry, yExit), xExit - xStart, Math.abs(yEntry - yExit)); 
                bgCtx.fill();
            } else {
                bgCtx.fillStyle = `rgba(239, 83, 80, ${activeOp})`; // Merah (Loss)
                bgCtx.beginPath(); 
                bgCtx.rect(xStart, Math.min(yEntry, yExit), xExit - xStart, Math.abs(yEntry - yExit)); 
                bgCtx.fill();
            }
        }

        bgCtx.strokeStyle = '#ffffff'; bgCtx.lineWidth = 1; bgCtx.setLineDash([5, 5]);
        bgCtx.beginPath(); bgCtx.moveTo(xStart, yEntry); bgCtx.lineTo(xExit, yExit); bgCtx.stroke();
    }

    bgCtx.strokeStyle = '#ffffff'; bgCtx.lineWidth = 1; bgCtx.setLineDash([5, 5]);
    bgCtx.beginPath(); bgCtx.moveTo(x1, yEntry); bgCtx.lineTo(x2, yEntry); bgCtx.stroke();
    bgCtx.setLineDash([]);

    let risk = Math.abs(d.start.price - d.sl);
    let reward = Math.abs(d.tp - d.start.price);
    let rrText = risk > 0 ? (reward / risk).toFixed(2) : "0.00";
    
    fgCtx.font = 'bold 12px sans-serif';
    fgCtx.fillStyle = '#FFD700';
    let xEntry = getX(d.start.time);
    
    fgCtx.textAlign = 'right'; fgCtx.textBaseline = 'middle';
    fgCtx.fillText(`R:R ${rrText}`, xEntry - 15, yEntry);
}

function drawShapeFg(d, isSelected) {
    const x1 = getX(d.start.time); const y1 = getY(d.start.price);
    const x2 = getX(d.end.time); const y2 = getY(d.end.price);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return;

    fgCtx.lineWidth = isSelected ? 3 : 2;
    fgCtx.strokeStyle = isSelected ? '#FFD700' : (d.color || '#2962FF'); 
    fgCtx.setLineDash([]);

    if (d.type === 'line') {
        fgCtx.beginPath(); fgCtx.moveTo(x1, y1); fgCtx.lineTo(x2, y2); fgCtx.stroke();
    } else if (d.type === 'box') {
        fgCtx.beginPath(); fgCtx.rect(x1, y1, x2 - x1, y2 - y1); fgCtx.stroke();
        fgCtx.fillStyle = d.color ? d.color + '20' : 'rgba(41, 98, 255, 0.1)'; fgCtx.fill();
        if (d.text) {
            fgCtx.font = '12px sans-serif'; fgCtx.fillStyle = '#ffffff'; fgCtx.textAlign = 'center';
            fgCtx.fillText(d.text, (x1 + x2) / 2, (y1 + y2) / 2);
        }
    } else if (d.type === 'circle') {
        const radius = Math.hypot(x2 - x1, y2 - y1);
        fgCtx.beginPath(); fgCtx.arc(x1, y1, radius, 0, 2 * Math.PI); fgCtx.stroke();
        fgCtx.fillStyle = d.color ? d.color + '20' : 'rgba(41, 98, 255, 0.1)'; fgCtx.fill();
    } else if (d.type === 'arrow') {
        fgCtx.beginPath(); fgCtx.moveTo(x1, y1); fgCtx.lineTo(x2, y2); fgCtx.stroke();
        const angle = Math.atan2(y2 - y1, x2 - x1); const headLen = 15;
        fgCtx.beginPath(); fgCtx.moveTo(x2, y2);
        fgCtx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        fgCtx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        fgCtx.closePath(); fgCtx.fillStyle = isSelected ? '#FFD700' : (d.color || '#2962FF'); fgCtx.fill();
    } else if (d.type === 'text') {
        fgCtx.font = '14px sans-serif'; fgCtx.fillStyle = isSelected ? '#FFD700' : (d.color || '#d1d4dc');
        fgCtx.fillText(d.text || "Teks", x1, y1);
    } else if (d.type === 'fibo') {
        const levels = d.levels || [0, 0.236, 0.382, 0.5, 0.618, 1];
        fgCtx.font = '10px sans-serif'; fgCtx.fillStyle = isSelected ? '#FFD700' : (d.color || '#d1d4dc');
        levels.forEach(lvl => {
            const yLvl = y1 + (y2 - y1) * lvl;
            fgCtx.beginPath(); fgCtx.moveTo(x1, yLvl); fgCtx.lineTo(x2, yLvl); fgCtx.stroke();
            fgCtx.fillText(lvl.toFixed(3), x2 + 35, yLvl + 3);
        });
    }
}

function drawHandlesFg(d) {
    fgCtx.fillStyle = '#FFD700';
    if (d.type.startsWith('position')) {
        let x1 = getX(d.start.time); let yEntry = getY(d.start.price);
        let x2 = getX(d.end.time); let yTP = getY(d.tp); let ySL = getY(d.sl);
        
        if (x1 !== null && yEntry !== null) {
            fgCtx.beginPath(); fgCtx.arc(x1, yEntry, 6, 0, Math.PI * 2); fgCtx.fill();
        }
        if (x2 !== null && yEntry !== null) {
            fgCtx.beginPath(); fgCtx.arc(x2, yEntry, 6, 0, Math.PI * 2); fgCtx.fill();
        }
        if (x2 !== null && yTP !== null) {
            fgCtx.beginPath(); fgCtx.arc(x2, yTP, 6, 0, Math.PI * 2); fgCtx.fill();
        }
        if (x2 !== null && ySL !== null) {
            fgCtx.beginPath(); fgCtx.arc(x2, ySL, 6, 0, Math.PI * 2); fgCtx.fill();
        }
        
        if (x1 !== null && x2 !== null) {
            let cx = (x1 + x2) / 2; let cy = (yEntry + (yTP||yEntry) + (ySL||yEntry)) / 3;
            fgCtx.fillRect(cx - 5, cy - 5, 10, 10);
        }
    } else if (d.type === 'circle') {
        const x1 = getX(d.start.time); const y1 = getY(d.start.price);
        const x2 = getX(d.end.time); const y2 = getY(d.end.price);
        if (x1 !== null && y1 !== null) { fgCtx.fillRect(x1 - 5, y1 - 5, 10, 10); }
        if (x2 !== null && y2 !== null) { fgCtx.beginPath(); fgCtx.arc(x2, y2, 6, 0, Math.PI * 2); fgCtx.fill(); }
    } else {
        const x1 = getX(d.start.time); const y1 = getY(d.start.price);
        const x2 = getX(d.end.time); const y2 = getY(d.end.price);
        if (x1 !== null && y1 !== null) { fgCtx.beginPath(); fgCtx.arc(x1, y1, 6, 0, Math.PI * 2); fgCtx.fill(); }
        if (x2 !== null && y2 !== null) { fgCtx.beginPath(); fgCtx.arc(x2, y2, 6, 0, Math.PI * 2); fgCtx.fill(); }
        
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
            let cx = (x1 + x2) / 2; let cy = (y1 + y2) / 2;
            fgCtx.fillRect(cx - 5, cy - 5, 10, 10);
        }
    }
}

function drawLabelsFg(d) {
    if (d.type.startsWith('position')) {
        fgCtx.font = '11px sans-serif'; fgCtx.fillStyle = '#ffffff'; fgCtx.textAlign = 'left'; fgCtx.textBaseline = 'middle';
        let x2 = getX(d.end.time); 
        let yTP = getY(d.tp); let ySL = getY(d.sl); let yEntry = getY(d.start.price);
        
        if (x2 !== null) {
            if (yTP !== null) fgCtx.fillText(d.tp.toFixed(2), x2 + 12, yTP);
            if (ySL !== null) fgCtx.fillText(d.sl.toFixed(2), x2 + 12, ySL);
            if (yEntry !== null) fgCtx.fillText(d.start.price.toFixed(2), x2 + 12, yEntry);
        }
    }
}

function drawCrosshair() {
    fgCtx.save();
    fgCtx.strokeStyle = '#888888'; fgCtx.lineWidth = 1; fgCtx.setLineDash([5, 5]); 
    fgCtx.beginPath(); fgCtx.moveTo(currentMouseX, 0); fgCtx.lineTo(currentMouseX, fgCanvas.height); fgCtx.stroke();
    fgCtx.beginPath(); fgCtx.moveTo(0, currentMouseY); fgCtx.lineTo(fgCanvas.width, currentMouseY); fgCtx.stroke();
    fgCtx.restore();

    let price = series.coordinateToPrice(currentMouseY);
    let time = chart.timeScale().coordinateToTime(currentMouseX);
    
    if (price !== null && time !== null) {
        fgCtx.fillStyle = '#363A45'; fgCtx.fillRect(fgCanvas.width - 65, currentMouseY - 10, 65, 20);
        fgCtx.fillStyle = '#d1d4dc'; fgCtx.font = '12px sans-serif'; fgCtx.textAlign = 'center';
        fgCtx.fillText(price.toFixed(2), fgCanvas.width - 32, currentMouseY + 4);

        let t = formatFullTime(time);
        let timeStr = `${t.hh}:${t.mm} | ${t.dayName} | ${t.dateStr} ${t.monthStr} ${t.yearStr}`;
        
        fgCtx.font = '11px sans-serif';
        let timeWidth = fgCtx.measureText(timeStr).width + 10;
        
        fgCtx.fillStyle = '#363A45'; 
        fgCtx.fillRect(currentMouseX - timeWidth/2, fgCanvas.height - 25, timeWidth, 20);
        fgCtx.fillStyle = '#d1d4dc'; 
        fgCtx.fillText(timeStr, currentMouseX, fgCanvas.height - 10);
    }
}
