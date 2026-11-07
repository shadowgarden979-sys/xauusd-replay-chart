// ==========================================
// FILE: ui.js
// Deskripsi: Logika UI, Tombol, Dropdown, & Modal (FINAL)
// ==========================================

const tfDropdown = document.getElementById('tf-dropdown');
const btnTF = document.getElementById('btn-tf');

btnTF.onclick = (e) => {
    e.stopPropagation();
    tfDropdown.style.display = tfDropdown.style.display === 'flex' ? 'none' : 'flex';
    const modeDd = document.getElementById('mode-dropdown');
    if (modeDd) modeDd.style.display = 'none';
};

tfDropdown.querySelectorAll('div').forEach(el => {
    el.onclick = async (e) => {
        const newTF = el.getAttribute('data-tf');
        tfDropdown.style.display = 'none';
        if (newTF && newTF !== currentTF && !isLoadingData) {
            if (typeof loadTFData === 'function') await loadTFData(newTF);
        }
    };
});

const modeDropdown = document.getElementById('mode-dropdown');
const btnMode = document.getElementById('btn-mode');
const setupModal = document.getElementById('setup-modal-overlay');
const historyModal = document.getElementById('history-modal-overlay');
const summaryModal = document.getElementById('summary-modal-overlay');
const gotoModal = document.getElementById('goto-modal-overlay');

if (btnMode) {
    btnMode.onclick = (e) => {
        e.stopPropagation();
        modeDropdown.style.display = modeDropdown.style.display === 'flex' ? 'none' : 'flex';
        tfDropdown.style.display = 'none';
    };
}

function updateModeDropdownUI() {
    const ddBacktest = document.getElementById('dd-backtest');
    const ddSim = document.getElementById('dd-sim');
    const btnJumpLatest = document.getElementById('btn-jump-latest');
    
    if (currentMode === 'simulation' && isSimulationRunning) {
        if (ddBacktest) ddBacktest.style.display = 'none';
        if (ddSim) ddSim.style.display = 'none';
        if (btnJumpLatest) btnJumpLatest.style.display = 'none';
    } else {
        if (ddBacktest) ddBacktest.style.display = 'block';
        if (ddSim) ddSim.style.display = 'block';
        if (btnJumpLatest) btnJumpLatest.style.display = currentMode === 'backtest' ? 'flex' : 'none';
    }
}

if (modeDropdown) {
    modeDropdown.querySelectorAll('div').forEach(el => {
        el.onclick = (e) => {
            const mode = el.getAttribute('data-mode');
            if (mode === 'simulation') {
                if (currentMode === 'simulation' && isSimulationRunning) {
                    alert("Sesi simulasi sedang berjalan. Selesaikan sesi terlebih dahulu.");
                } else {
                    setupModal.style.display = 'flex';
                }
            } else if (mode === 'history') {
                if (typeof currentMode !== 'undefined' && currentMode !== 'simulation') {
                    alert("Masuk ke Mode Simulasi terlebih dahulu untuk melihat riwayat.");
                } else {
                    historyModal.style.display = 'flex';
                    setTimeout(renderHistoryDashboard, 50); 
                }
            } else {
                if (currentMode === 'simulation' && isSimulationRunning) {
                    alert("Tidak dapat keluar dari Mode Simulasi sebelum sesi selesai.");
                } else {
                    currentMode = 'backtest';
                    btnMode.innerText = 'MODE ▼';
                    btnMode.style.background = '#485c7b';
                    updateModeDropdownUI();
                    
                    backtestStartIndex = Math.max(0, allData[currentTF].length - (backtestChunkSize * 3));
                    fullData = allData[currentTF].slice(backtestStartIndex);
                    series.setData(fullData);
                    chart.timeScale().scrollToRealTime();

                    if (typeof updateScissorsVisibility === 'function') updateScissorsVisibility();
                }
            }
            modeDropdown.style.display = 'none';
        };
    });
}

document.getElementById('btn-close-setup').onclick = () => { setupModal.style.display = 'none'; };
document.getElementById('btn-close-history').onclick = () => { historyModal.style.display = 'none'; };
document.getElementById('btn-sum-close').onclick = () => { summaryModal.style.display = 'none'; };
document.getElementById('btn-sum-detail').onclick = () => { 
    summaryModal.style.display = 'none'; 
    historyModal.style.display = 'flex';
    setTimeout(renderHistoryDashboard, 50); 
};
document.getElementById('btn-close-goto').onclick = () => { gotoModal.style.display = 'none'; };

// --- LOGIKA GO TO DATE ---
let tempGotoData = null;

document.getElementById('date-hud').onclick = () => {
    if (currentMode !== 'backtest') {
        alert("Fitur ini hanya tersedia di Mode Backtest.");
        return;
    }
    gotoModal.style.display = 'flex';
    populateGotoYears();
};

function populateGotoYears() {
    let yearSelect = document.getElementById('goto-year');
    yearSelect.innerHTML = '';
    let years = availableYears[currentTF] || [];
    
    years.forEach(y => {
        let opt = document.createElement('option');
        opt.value = y; opt.innerText = y;
        yearSelect.appendChild(opt);
    });
    
    if (years.length > 0) {
        yearSelect.dispatchEvent(new Event('change'));
    }
}

async function populateGotoMonths() {
    let year = parseInt(document.getElementById('goto-year').value);
    let monthSelect = document.getElementById('goto-month');
    let daySelect = document.getElementById('goto-day');
    let loadingText = document.getElementById('goto-loading');
    let btnConfirm = document.getElementById('btn-confirm-goto');
    
    monthSelect.disabled = true;
    daySelect.disabled = true;
    btnConfirm.disabled = true;
    monthSelect.innerHTML = '<option>Memuat...</option>';
    daySelect.innerHTML = '';
    
    if (tempGotoData && tempGotoData.year === year) {
        fillGotoMonths(tempGotoData.data);
        return;
    }

    loadingText.style.display = 'block';
    try {
        const rawData = await loadDataScript(currentTF, year);
        const parsedData = await parseAoAAsync(rawData);
        tempGotoData = { year: year, data: parsedData };
        fillGotoMonths(parsedData);
    } catch (err) {
        alert("Gagal memuat data tahun tersebut: " + err.message);
        monthSelect.innerHTML = '<option>Error</option>';
    } finally {
        loadingText.style.display = 'none';
    }
}

function fillGotoMonths(dataArr) {
    let monthSelect = document.getElementById('goto-month');
    let months = new Set();
    dataArr.forEach(c => {
        let d = new Date(c.time * 1000);
        months.add(d.getUTCMonth() + 1);
    });
    
    monthSelect.innerHTML = '';
    monthSelect.disabled = false;
    let monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    Array.from(months).sort((a,b)=>a-b).forEach(m => {
        let opt = document.createElement('option');
        opt.value = m; opt.innerText = monthNames[m-1];
        monthSelect.appendChild(opt);
    });
    populateGotoDays();
}

function populateGotoDays() {
    if (!tempGotoData) return;
    let year = parseInt(document.getElementById('goto-year').value);
    let month = parseInt(document.getElementById('goto-month').value);
    let daySelect = document.getElementById('goto-day');
    let btnConfirm = document.getElementById('btn-confirm-goto');
    
    let days = new Set();
    tempGotoData.data.forEach(c => {
        let d = new Date(c.time * 1000);
        if (d.getUTCFullYear() === year && (d.getUTCMonth()+1) === month) {
            days.add(d.getUTCDate());
        }
    });
    
    daySelect.innerHTML = '';
    daySelect.disabled = false;
    btnConfirm.disabled = false;
    Array.from(days).sort((a,b)=>a-b).forEach(d => {
        let opt = document.createElement('option');
        opt.value = d; opt.innerText = d;
        daySelect.appendChild(opt);
    });
}

document.getElementById('goto-year').onchange = populateGotoMonths;
document.getElementById('goto-month').onchange = populateGotoDays;

document.getElementById('btn-confirm-goto').onclick = () => {
    let year = document.getElementById('goto-year').value;
    let month = document.getElementById('goto-month').value.toString().padStart(2, '0');
    let day = document.getElementById('goto-day').value.toString().padStart(2, '0');
    let dateStr = `${year}-${month}-${day}T00:00:00Z`;
    let targetTs = Math.floor(new Date(dateStr).getTime() / 1000);
    
    allData[currentTF] = tempGotoData.data;
    
    let targetIdx = 0;
    let left = 0, right = allData[currentTF].length - 1;
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (allData[currentTF][mid].time >= targetTs) {
            targetIdx = mid; right = mid - 1;
        } else { left = mid + 1; }
    }
    
    backtestStartIndex = Math.max(0, targetIdx - (backtestChunkSize / 2));
    fullData = allData[currentTF].slice(backtestStartIndex, backtestStartIndex + (backtestChunkSize * 3));
    series.setData(fullData);
    
    let newIdx = targetIdx - backtestStartIndex;
    chart.timeScale().setVisibleLogicalRange({ from: newIdx - 50, to: newIdx + 50 });
    gotoModal.style.display = 'none';
};

// Logika Jump to Latest
document.getElementById('btn-jump-latest').onclick = () => {
    if (currentMode !== 'backtest') return;
    let latestYear = Math.max(...availableYears[currentTF]);
    if (allData[currentTF].length > 0 && new Date(allData[currentTF][0].time * 1000).getUTCFullYear() === latestYear) {
        backtestStartIndex = Math.max(0, allData[currentTF].length - (backtestChunkSize * 3));
        fullData = allData[currentTF].slice(backtestStartIndex);
        series.setData(fullData);
        chart.timeScale().scrollToRealTime();
    } else {
        alert("Data tahun terbaru (" + latestYear + ") belum dimuat. Gunakan fitur 'Go To Date'.");
    }
};

// --- LOGIKA SETUP SIMULASI ---
document.getElementById('btn-start-sim').onclick = async () => {
    let startDateStr = document.getElementById('sim-start-date').value;
    let endDateStr = document.getElementById('sim-end-date').value;
    let bal = parseFloat(document.getElementById('sim-balance').value);
    let risk = parseFloat(document.getElementById('sim-risk').value);

    if (!startDateStr || !endDateStr || isNaN(bal) || isNaN(risk)) {
        alert("Harap isi semua data dengan benar!"); return;
    }
    
    let startTs = Math.floor(new Date(startDateStr + 'T00:00:00Z').getTime() / 1000);
    let endTs = Math.floor(new Date(endDateStr + 'T23:59:59Z').getTime() / 1000);
    let startYear = new Date(startDateStr + 'T00:00:00Z').getUTCFullYear();

    if (startTs >= endTs) { alert("Tanggal Mulai harus lebih awal!"); return; }

    const overlay = document.getElementById('loading-overlay');
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');
    setupModal.style.display = 'none';
    overlay.style.display = 'flex';
    bar.style.width = '0%';
    text.innerText = `Menyiapkan data tahun ${startYear}...`;

    try {
        let isDataReady = false;
        if (allData[currentTF] && allData[currentTF].length > 0) {
            let currentDataYear = new Date(allData[currentTF][0].time * 1000).getUTCFullYear();
            if (currentDataYear === startYear) {
                isDataReady = true;
            }
        }

        if (!isDataReady) {
            const rawData = await loadDataScript(currentTF, startYear);
            allData[currentTF] = await parseAoAAsync(rawData, (pct) => {
                bar.style.width = pct + '%';
                text.innerText = `Memuat data ${startYear}... ${pct}%`;
            });
        }

        let sourceData = allData[currentTF];
        let startIdx = -1;
        let left = 0, right = sourceData.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (sourceData[mid].time >= startTs) { startIdx = mid; right = mid - 1; } else { left = mid + 1; }
        }
        if (startIdx === -1) startIdx = sourceData.length - 1;

        currentChunkSize = chunkSizes[currentTF] || 6000;
        absoluteStartIndex = Math.max(0, startIdx - currentChunkSize); 
        let maxLoadedIndex = Math.min(sourceData.length, absoluteStartIndex + (currentChunkSize * 3));
        
        fullData = sourceData.slice(absoluteStartIndex, maxLoadedIndex);
        currentReplayIndex = startIdx - absoluteStartIndex;

        // PERBAIKAN: Gunakan Math.max agar index 0 tidak menghasilkan undefined
        let safeIdx = Math.max(0, currentReplayIndex - 1);
        if (fullData[safeIdx]) {
            simulationCurrentTime = fullData[safeIdx].time;
        } else {
            simulationCurrentTime = startTs;
        }

        drawings = drawings.filter(d => !d.type.startsWith('position'));
        selectedDrawing = null;
        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();

        if (typeof simConfig !== 'undefined') {
            simConfig = { balance: bal, risk: risk, startDate: startDateStr, endDate: endDateStr, endTime: endTs };
        }
        if (typeof currentMode !== 'undefined') currentMode = 'simulation';
        
        btnMode.innerText = 'SIMULASI ▼';
        btnMode.style.background = '#26a69a';

        if (typeof isReplayMode !== 'undefined') isReplayMode = true;
        if (typeof isPlaying !== 'undefined') isPlaying = false;
        
        const btnSetReplay = document.getElementById('btn-set-replay');
        if (btnSetReplay) btnSetReplay.style.background = '#ef5350';

        series.setData(fullData.slice(0, currentReplayIndex + 1));
        
        if (chart) {
            let lookbackIdx = Math.max(0, currentReplayIndex - currentChunkSize);
            chart.timeScale().setVisibleLogicalRange({ from: lookbackIdx, to: currentReplayIndex + 20 });
        }

        if (typeof updateScissorsVisibility === 'function') updateScissorsVisibility();
        if (typeof startSimulation === 'function') startSimulation();
        updateModeDropdownUI();

    } catch (err) {
        alert("Gagal memulai simulasi: " + err.message);
        setupModal.style.display = 'flex';
    } finally {
        overlay.style.display = 'none';
    }
};

document.addEventListener('click', () => { 
    tfDropdown.style.display = 'none'; 
    if (modeDropdown) modeDropdown.style.display = 'none';
});

// [FUNGSI renderHistoryDashboard DIAMBIL DARI VERSI SEBELUMNYA YANG SUDAH LENGKAP]
function renderHistoryDashboard() {
    let totalPnl = simBalance - simConfig.balance;
    let totalTrades = tradeHistory.length;
    let winTrades = tradeHistory.filter(t => t.status === 'WIN').length;
    let lossTrades = tradeHistory.filter(t => t.status === 'LOSS').length;
    let winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(1) : 0;
    
    document.getElementById('dash-balance').innerText = '$' + simBalance.toFixed(2);
    document.getElementById('dash-balance').style.color = totalPnl >= 0 ? '#26a69a' : '#ef5350';
    document.getElementById('dash-pnl').innerText = (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toFixed(2);
    document.getElementById('dash-pnl').style.color = totalPnl >= 0 ? '#26a69a' : '#ef5350';
    document.getElementById('dash-total-trade').innerText = totalTrades;
    document.getElementById('dash-winrate').innerText = winRate + '%';
    document.getElementById('dash-winrate').style.color = winRate >= 50 ? '#26a69a' : '#ef5350';
    document.getElementById('dash-win').innerText = winTrades;
    document.getElementById('dash-loss').innerText = lossTrades;

    let peak = simConfig.balance;
    let maxDD = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let currentBal = simConfig.balance;

    tradeHistory.forEach(t => {
        currentBal += t.pnl;
        if (currentBal > peak) peak = currentBal;
        let dd = ((peak - currentBal) / peak) * 100;
        if (dd > maxDD) maxDD = dd;
        if (t.pnl > 0) {
            currentStreak += t.pnl;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
            currentStreak = 0;
        }
    });

    document.getElementById('dash-dd').innerText = '-' + maxDD.toFixed(1) + '%';
    document.getElementById('dash-streak').innerText = '$' + maxStreak.toFixed(2);

    if (totalTrades > 0) {
        let startD = new Date(simConfig.startDate);
        let endD = new Date(simConfig.endDate);
        let diffTime = Math.abs(endD - startD);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 
        let diffMonths = (endD.getFullYear() - startD.getFullYear()) * 12 + (endD.getMonth() - startD.getMonth()) + 1;
        let diffYears = (endD.getFullYear() - startD.getFullYear()) + 1;
        let avgD = (totalTrades / diffDays).toFixed(1);
        let avgM = (totalTrades / diffMonths).toFixed(1);
        let avgY = (totalTrades / diffYears).toFixed(1);
        document.getElementById('dash-avg').innerText = `${avgD} / ${avgM} / ${avgY}`;
    } else {
        document.getElementById('dash-avg').innerText = `0 / 0 / 0`;
    }

    let monthlyTradeCount = {};
    tradeHistory.forEach(t => {
        let d = new Date(t.entryTime * 1000);
        let key = `${d.getUTCFullYear()}-${(d.getUTCMonth()+1).toString().padStart(2, '0')}`;
        if (!monthlyTradeCount[key]) monthlyTradeCount[key] = 0;
        monthlyTradeCount[key]++;
    });

    let monthlyContainer = document.getElementById('dash-monthly');
    monthlyContainer.innerHTML = '';
    let sortedMonths = Object.keys(monthlyTradeCount).sort();
    
    if (sortedMonths.length === 0) {
        monthlyContainer.innerHTML = '<div style="color:#888;">Belum ada data</div>';
    } else {
        sortedMonths.forEach(monthKey => {
            let parts = monthKey.split('-');
            let dateObj = new Date(parts[0], parts[1] - 1, 1);
            let monthName = dateObj.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            let div = document.createElement('div');
            div.innerHTML = `<span>${monthName}</span> <span>${monthlyTradeCount[monthKey]} Trade</span>`;
            monthlyContainer.appendChild(div);
        });
    }

    let tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';
    let sortedHistory = [...tradeHistory].reverse();

    sortedHistory.forEach(t => {
        let entryD = new Date(t.entryTime * 1000);
        let exitD = new Date(t.exitTime * 1000);
        let timeStr = `${entryD.getUTCHours().toString().padStart(2,'0')}:${entryD.getUTCMinutes().toString().padStart(2,'0')} - ${exitD.getUTCHours().toString().padStart(2,'0')}:${exitD.getUTCMinutes().toString().padStart(2,'0')} <br> <span style="font-size:9px; color:#888;">${entryD.getUTCDate()}/${entryD.getUTCMonth()+1}/${entryD.getUTCFullYear()}</span>`;
        let typeStr = t.type === 'position-long' ? 'LONG' : 'SHORT';
        let pnlStr = (t.pnl >= 0 ? '+' : '') + '$' + t.pnl.toFixed(2);
        let pnlClass = t.pnl >= 0 ? 'win-text' : 'loss-text';

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${timeStr}</td>
            <td style="color:${t.type === 'position-long' ? '#26a69a' : '#ef5350'}">${typeStr}</td>
            <td>${t.entry.toFixed(2)}</td>
            <td>${t.exit.toFixed(2)}</td>
            <td class="${pnlClass}">${pnlStr}</td>
        `;
        tbody.appendChild(tr);
    });

    let canvas = document.getElementById('equity-canvas');
    let ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (tradeHistory.length > 0) {
        let minBal = simConfig.balance, maxBal = simConfig.balance;
        let balArr = [simConfig.balance];
        let currentB = simConfig.balance;
        tradeHistory.forEach(t => {
            currentB += t.pnl;
            balArr.push(currentB);
            if (currentB < minBal) minBal = currentB;
            if (currentB > maxBal) maxBal = currentB;
        });

        let padding = (maxBal - minBal) * 0.15 || 1;
        minBal -= padding;
        maxBal += padding;

        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.textAlign = 'left';
        let ySteps = 3;
        for (let i = 0; i <= ySteps; i++) {
            let val = minBal + ((maxBal - minBal) * (i / ySteps));
            let yPos = canvas.height - ((val - minBal) / (maxBal - minBal) * canvas.height);
            if (i === 0) yPos -= 5; 
            if (i === ySteps) yPos += 10;
            ctx.fillText('$' + val.toFixed(0), 5, yPos);
            ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.moveTo(0, yPos - 3); ctx.lineTo(canvas.width, yPos - 3); ctx.stroke();
        }

        ctx.textAlign = 'center';
        let xSteps = 4; 
        for (let i = 0; i <= xSteps; i++) {
            let tradeIdx = Math.round((balArr.length - 1) * (i / xSteps));
            let xPos = (canvas.width / xSteps) * i;
            if (i === 0) xPos += 10;
            if (i === xSteps) xPos -= 15;
            ctx.fillText(`T${tradeIdx}`, xPos, canvas.height - 5);
        }

        let paddingX = 15, paddingY = 10;
        let graphW = canvas.width - (paddingX * 2), graphH = canvas.height - (paddingY * 2);
        let xStep = graphW / (balArr.length - 1 || 1);
        
        ctx.beginPath(); ctx.strokeStyle = '#2962FF'; ctx.lineWidth = 2;
        balArr.forEach((val, i) => {
            let x = paddingX + (i * xStep);
            let y = paddingY + graphH - ((val - minBal) / (maxBal - minBal) * graphH);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        let lastX = paddingX + ((balArr.length - 1) * xStep);
        let lastY = paddingY + graphH - ((balArr[balArr.length-1] - minBal) / (maxBal - minBal) * graphH);
        ctx.fillStyle = '#2962FF'; ctx.beginPath(); ctx.arc(lastX, lastY, 3, 0, Math.PI * 2); ctx.fill();
    }
}

// --- Floating Menu & Modal Kustomisasi ---
const floatingMenu = document.getElementById('floating-menu');
const btnSnap = document.getElementById('f-btn-snap');
const btnCostum = document.getElementById('f-btn-costum');
const btnDelete = document.getElementById('f-btn-delete');
const modalOverlay = document.getElementById('modal-overlay');
const colorInputContainer = document.getElementById('color-input-container');
const inputColor = document.getElementById('input-color');
const textInputContainer = document.getElementById('text-input-container');
const inputText = document.getElementById('input-text');
const fiboInputContainer = document.getElementById('fibo-input-container');
const inputLevels = document.getElementById('input-levels');
const posInputContainer = document.getElementById('pos-input-container');
const inputBaseOp = document.getElementById('input-base-op');
const inputActiveOp = document.getElementById('input-active-op');

function updateFloatingMenuPosition() {
    if (!selectedDrawing) {
        floatingMenu.style.display = 'none';
        return;
    }
    let maxY = -Infinity, minX = Infinity, maxX = -Infinity, minY = Infinity;
    if (selectedDrawing.type.startsWith('position')) {
        minX = getX(selectedDrawing.start.time); maxX = getX(selectedDrawing.end.time);
        let yTP = getY(selectedDrawing.tp) || getY(selectedDrawing.start.price);
        let ySL = getY(selectedDrawing.sl) || getY(selectedDrawing.start.price);
        let yEntry = getY(selectedDrawing.start.price);
        if (minX === null || maxX === null || yEntry === null) { floatingMenu.style.display = 'none'; return; }
        maxY = Math.max(yTP, ySL, yEntry); minY = Math.min(yTP, ySL, yEntry);
    } else if (selectedDrawing.type === 'circle') {
        let cx = getX(selectedDrawing.start.time); let cy = getY(selectedDrawing.start.price);
        let ex = getX(selectedDrawing.end.time); let ey = getY(selectedDrawing.end.price);
        if (cx === null || cy === null || ex === null || ey === null) { floatingMenu.style.display = 'none'; return; }
        let rad = Math.hypot(ex - cx, ey - cy);
        minX = cx - rad; maxX = cx + rad; maxY = cy + rad; minY = cy - rad;
    } else {
        minX = Math.min(getX(selectedDrawing.start.time), getX(selectedDrawing.end.time));
        maxX = Math.max(getX(selectedDrawing.start.time), getX(selectedDrawing.end.time));
        minY = Math.min(getY(selectedDrawing.start.price), getY(selectedDrawing.end.price));
        maxY = Math.max(getY(selectedDrawing.start.price), getY(selectedDrawing.end.price));
        if (minX === null || maxX === null || minY === null || maxY === null) { floatingMenu.style.display = 'none'; return; }
    }
    let centerX = (minX + maxX) / 2;
    let menuX = centerX - (floatingMenu.offsetWidth / 2); 
    let menuY = minY - 50; 
    menuX = Math.max(10, Math.min(menuX, fgCanvas.width - floatingMenu.offsetWidth - 10));
    if (menuY < 10) menuY = maxY + 10; 
    floatingMenu.style.display = 'flex';
    floatingMenu.style.left = menuX + 'px';
    floatingMenu.style.top = menuY + 'px';
    if (selectedDrawing.type === 'line') {
        btnSnap.style.display = 'block';
        btnSnap.className = 'f-btn' + (snapEnabled ? ' snap-active' : '');
    } else {
        btnSnap.style.display = 'none';
    }
}

btnDelete.onclick = () => { if (selectedDrawing) { drawings = drawings.filter(d => d !== selectedDrawing); selectedDrawing = null; saveToLocalStorage(); } };
btnSnap.onclick = () => { snapEnabled = !snapEnabled; };
btnCostum.onclick = () => {
    if (!selectedDrawing) return;
    colorInputContainer.style.display = 'block';
    textInputContainer.style.display = 'none';
    fiboInputContainer.style.display = 'none';
    posInputContainer.style.display = 'none';
    if (selectedDrawing.type === 'box') { textInputContainer.style.display = 'block'; inputText.value = selectedDrawing.text || ''; } 
    else if (selectedDrawing.type === 'fibo') { fiboInputContainer.style.display = 'block'; inputLevels.value = (selectedDrawing.levels || defaultSettings.fibo.levels).join(', '); } 
    else if (selectedDrawing.type.startsWith('position')) {
        colorInputContainer.style.display = 'none'; posInputContainer.style.display = 'block';
        inputBaseOp.value = selectedDrawing.baseOpacity !== undefined ? selectedDrawing.baseOpacity : defaultSettings[selectedDrawing.type].baseOpacity;
        inputActiveOp.value = selectedDrawing.activeOpacity !== undefined ? selectedDrawing.activeOpacity : defaultSettings[selectedDrawing.type].activeOpacity;
    } else { inputColor.value = selectedDrawing.color || defaultSettings[selectedDrawing.type]?.color || '#2962FF'; }
    modalOverlay.style.display = 'flex';
};

document.getElementById('btn-close-modal').onclick = () => { modalOverlay.style.display = 'none'; };
document.getElementById('btn-save-modal').onclick = () => {
    if (selectedDrawing) {
        let saveProps = {};
        if (selectedDrawing.type === 'box') { selectedDrawing.text = inputText.value; saveProps.text = inputText.value; }
        if (selectedDrawing.type === 'fibo') { selectedDrawing.levels = inputLevels.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v)); saveProps.levels = selectedDrawing.levels; }
        if (selectedDrawing.type.startsWith('position')) {
            selectedDrawing.baseOpacity = parseFloat(inputBaseOp.value); selectedDrawing.activeOpacity = parseFloat(inputActiveOp.value);
            if (isNaN(selectedDrawing.baseOpacity)) selectedDrawing.baseOpacity = 0.1;
            if (isNaN(selectedDrawing.activeOpacity)) selectedDrawing.activeOpacity = 0.4;
            saveProps.baseOpacity = selectedDrawing.baseOpacity; saveProps.activeOpacity = selectedDrawing.activeOpacity;
        } else if (!selectedDrawing.type.startsWith('position') && selectedDrawing.type !== 'box' && selectedDrawing.type !== 'fibo') {
            selectedDrawing.color = inputColor.value; saveProps.color = selectedDrawing.color;
        }
        defaultSettings[selectedDrawing.type] = { ...defaultSettings[selectedDrawing.type], ...saveProps };
        saveDefaults(); saveToLocalStorage();
    }
    modalOverlay.style.display = 'none';
};

function setTool(tool, btnId = null) {
    currentTool = tool;
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    if (btnId) document.getElementById(btnId).classList.add('active');
    if (tool !== 'pan') selectedDrawing = null; 
}

document.getElementById('btn-line').onclick = () => setTool('line', 'btn-line');
document.getElementById('btn-box').onclick = () => setTool('box', 'btn-box');
document.getElementById('btn-fibo').onclick = () => setTool('fibo', 'btn-fibo');
document.getElementById('btn-circle').onclick = () => setTool('circle', 'btn-circle');
document.getElementById('btn-text').onclick = () => setTool('text', 'btn-text');
document.getElementById('btn-arrow').onclick = () => setTool('arrow', 'btn-arrow');
document.getElementById('btn-measure').onclick = () => setTool('measure', 'btn-measure');
document.getElementById('btn-long').onclick = () => setTool('position-long', 'btn-long');
document.getElementById('btn-short').onclick = () => setTool('position-short', 'btn-short');

document.getElementById('btn-clear').onclick = () => { if(confirm("Hapus semua objek?")) { drawings = []; selectedDrawing = null; saveToLocalStorage(); } };
