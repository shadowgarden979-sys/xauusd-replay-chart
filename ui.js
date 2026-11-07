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
                    isMonthlyMode = false;
                    
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
    let startMonth = new Date(startDateStr + 'T00:00:00Z').getUTCMonth() + 1;

    if (startTs >= endTs) { alert("Tanggal Mulai harus lebih awal!"); return; }

    const overlay = document.getElementById('loading-overlay');
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');
    setupModal.style.display = 'none';
    overlay.style.display = 'flex';
    bar.style.width = '0%';

    isMonthlyMode = (startYear === 2013 && (currentTF === 'M1' || currentTF === 'M5'));
    currentLoadedYear = startYear;
    currentLoadedMonth = startMonth;

    text.innerText = isMonthlyMode ? `Menyiapkan data bulan ke-${startMonth}...` : `Menyiapkan data tahun ${startYear}...`;

    try {
        let isDataReady = false;
        if (allData[currentTF] && allData[currentTF].length > 0) {
            let currentDataYear = new Date(allData[currentTF][0].time * 1000).getUTCFullYear();
            if (currentDataYear === startYear && !isMonthlyMode) {
                isDataReady = true;
            }
        }

        if (!isDataReady) {
            const rawData = isMonthlyMode 
                ? await loadDataScript(currentTF, startYear, startMonth)
                : await loadDataScript(currentTF, startYear);
                
            allData[currentTF] = await parseAoAAsync(rawData, (pct) => {
                bar.style.width = pct + '%';
                text.innerText = isMonthlyMode ? `Memuat data... ${pct}%` : `Memuat data ${startYear}... ${pct}%`;
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

        let safeIdx = Math.max(0, currentReplayIndex - 1);
        simulationCurrentTime = fullData[safeIdx] ? fullData[safeIdx].time : startTs;

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

        // TRIGGER PRE-FETCH TF LAIN SAAT SIMULASI DIMULAI
        if (typeof prefetchOtherTFs === 'function') {
            setTimeout(() => prefetchOtherTFs(startYear), 1000);
        }

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

// (SISA FUNGSI UI SAMA SEPERTI SEBELUMNYA)
// ...
