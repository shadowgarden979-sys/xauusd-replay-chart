// ==========================================
// FILE: replay.js
// Deskripsi: Logika Replay, Chunking, & Garis Gunting
// ==========================================

const scissorsLine = document.getElementById('scissors-line');
const scissorsTime = document.getElementById('scissors-time');
const btnSetReplay = document.getElementById('btn-set-replay');
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnStep = document.getElementById('btn-step');
const btnToggleLine = document.getElementById('btn-toggle-line');
const speedSelect = document.getElementById('speed-select');

function updateScissorsPosition() {
    if (!chart || !isReplayMode || !isLineVisible || isPlaying) return;
    let idx = Math.max(0, currentReplayIndex - 1);
    if (fullData[idx]) {
        const x = getX(fullData[idx].time);
        if (x !== null) {
            scissorsLine.style.left = x + 'px';
            let t = fullData[idx].time;
            let date = new Date(t * 1000);
            let str = `${date.getUTCFullYear()}-${(date.getUTCMonth()+1).toString().padStart(2,'0')}-${date.getUTCDate().toString().padStart(2,'0')} ${date.getUTCHours().toString().padStart(2,'0')}:${date.getUTCMinutes().toString().padStart(2,'0')}`;
            scissorsTime.innerText = str;
        }
    }
}

function updateScissorsVisibility() {
    let isSimulation = (typeof currentMode !== 'undefined' && currentMode === 'simulation');
    if (!isReplayMode || isPlaying || !isLineVisible || isSimulation) {
        scissorsLine.style.display = 'none';
    } else {
        scissorsLine.style.display = 'block';
    }
}

function pauseReplay() {
    isPlaying = false;
    clearInterval(playInterval);
    updateScissorsVisibility();
}

let isDraggingScissors = false;
scissorsLine.addEventListener('touchstart', (e) => {
    isDraggingScissors = true; e.preventDefault(); e.stopPropagation();
    if (chart) chart.applyOptions({ handleScroll: false, handleScale: false }); 
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!isDraggingScissors || !chart) return;
    e.preventDefault(); e.stopPropagation();
    const rect = container.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    let newIdx = Math.round(chart.timeScale().coordinateToLogical(x));
    if (newIdx === null) return;
    newIdx = Math.max(0, Math.min(newIdx, fullData.length - 1));
    if (newIdx !== currentReplayIndex) {
        currentReplayIndex = newIdx;
        series.setData(fullData.slice(0, currentReplayIndex));
        
        let safeIdx = Math.max(0, currentReplayIndex - 1);
        if (fullData[safeIdx]) {
            simulationCurrentTime = fullData[safeIdx].time;
            if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
        }
    }
}, { passive: false });

window.addEventListener('touchend', () => {
    if (isDraggingScissors) {
        isDraggingScissors = false;
        if (chart) chart.applyOptions({ handleScroll: true, handleScale: true }); 
    }
});

btnSetReplay.onclick = () => {
    isReplayMode = !isReplayMode;
    if (isReplayMode) {
        btnSetReplay.style.background = '#ef5350';
        isLineVisible = true; btnToggleLine.innerText = "Hide Line";
        currentReplayIndex = Math.max(0, fullData.length - 100); 
        series.setData(fullData.slice(0, currentReplayIndex));
        if (chart) chart.timeScale().scrollToPosition(5, false);
        
        let safeIdx = Math.max(0, currentReplayIndex - 1);
        if (fullData[safeIdx]) {
            simulationCurrentTime = fullData[safeIdx].time;
        }
    } else {
        btnSetReplay.style.background = '#26a69a';
        pauseReplay();
        currentReplayIndex = fullData.length;
        series.setData(fullData);
    }
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    updateScissorsVisibility();
};

function handleSessionEnd() {
    pauseReplay();
    if (typeof forceCloseAllTrades === 'function') forceCloseAllTrades();
    if (typeof updateModeDropdownUI === 'function') updateModeDropdownUI();
    let sumModal = document.getElementById('summary-modal-overlay');
    let sumBal = document.getElementById('sum-balance');
    if (sumModal && sumBal) {
        sumBal.innerText = '$' + simBalance.toFixed(2);
        sumBal.style.color = (simBalance - simConfig.balance) >= 0 ? '#26a69a' : '#ef5350';
        sumModal.style.display = 'flex';
    } else {
        alert("Simulasi Selesai!");
    }
}

function checkChunkShift() {
    if (currentMode !== 'simulation') return;
    if (currentReplayIndex >= currentChunkSize * 2) {
        let purgeAmount = currentChunkSize;
        absoluteStartIndex += purgeAmount;
        let maxLoadedIndex = Math.min(allData[currentTF].length, absoluteStartIndex + (currentChunkSize * 3));
        fullData = allData[currentTF].slice(absoluteStartIndex, maxLoadedIndex);
        currentReplayIndex -= purgeAmount;
        let cutoffTime = fullData[0].time;
        drawings = drawings.filter(d => {
            if (d.type.startsWith('position') && d.status === 'closed' && d.end.time < cutoffTime) return false;
            return true;
        });
        series.setData(fullData.slice(0, currentReplayIndex + 1));
        chart.timeScale().fitContent();
    }
}

// FUNGSI BARU: Memuat data bulan berikutnya secara diam-diam
async function checkMonthlyLoad() {
    if (!isMonthlyMode || currentMode !== 'simulation' || isLoadingNextMonth) return;
    if (currentLoadedMonth >= 12) return; // Jika sudah Desember, tidak ada bulan depan di tahun yang sama

    // Jika index replay sudah mencapai 80% dari total allData yang saat ini dimuat
    let threshold = allData[currentTF].length * 0.8;
    if (currentReplayIndex > threshold) {
        isLoadingNextMonth = true;
        let nextMonth = currentLoadedMonth + 1;
        
        try {
            // Muat data bulan depan
            const rawData = await loadDataScript(currentTF, currentLoadedYear, nextMonth);
            const parsedData = await parseAoAAsync(rawData);
            
            // Sambungkan ke allData
            allData[currentTF] = allData[currentTF].concat(parsedData);
            currentLoadedMonth = nextMonth;
            
            // Perbarui fullData agar Chunking window ikut tahu ada data baru
            let maxLoadedIndex = Math.min(allData[currentTF].length, absoluteStartIndex + (currentChunkSize * 3));
            fullData = allData[currentTF].slice(absoluteStartIndex, maxLoadedIndex);
            
        } catch (err) {
            console.warn("Gagal memuat bulan berikutnya: ", err);
        } finally {
            isLoadingNextMonth = false;
        }
    }
}

function checkBacktestShift() {
    if (!chart || currentMode !== 'backtest' || isShiftingData) return;
    let range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;

    let isLeft = range.from < 2000 && backtestStartIndex > 0;
    let isRight = range.to > fullData.length - 2000 && (backtestStartIndex + fullData.length) < allData[currentTF].length;

    if (isLeft) {
        isShiftingData = true;
        let shiftAmount = Math.min(backtestChunkSize, backtestStartIndex);
        backtestStartIndex -= shiftAmount;
        
        fullData = allData[currentTF].slice(backtestStartIndex, backtestStartIndex + (backtestChunkSize * 3));
        
        let curFrom = range.from;
        let curTo = range.to;
        
        series.setData(fullData);
        
        chart.timeScale().setVisibleLogicalRange({ 
            from: curFrom + shiftAmount, 
            to: curTo + shiftAmount 
        });
        
        setTimeout(() => { 
            isShiftingData = false; 
            checkBacktestShift(); 
        }, 50);
        
    } else if (isRight) {
        isShiftingData = true;
        let shiftAmount = Math.min(backtestChunkSize, allData[currentTF].length - (backtestStartIndex + fullData.length));
        backtestStartIndex += shiftAmount;
        
        fullData = allData[currentTF].slice(backtestStartIndex, backtestStartIndex + (backtestChunkSize * 3));
        
        let curFrom = range.from;
        let curTo = range.to;
        
        series.setData(fullData);
        
        chart.timeScale().setVisibleLogicalRange({ 
            from: curFrom - shiftAmount, 
            to: curTo - shiftAmount 
        });
        
        setTimeout(() => { 
            isShiftingData = false; 
            checkBacktestShift(); 
        }, 50);
    }
}

let backtestScrollTimeout = null;
if (chart) {
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        updateScissorsPosition();
        if (currentMode === 'backtest' && !isShiftingData) {
            clearTimeout(backtestScrollTimeout);
            backtestScrollTimeout = setTimeout(checkBacktestShift, 50);
        }
    });
}

btnPlay.onclick = () => {
    if (!isReplayMode) { alert("Aktifkan Set Replay dulu!"); return; }
    if (isPlaying) return;
    isPlaying = true;
    updateScissorsVisibility(); 
    
    playInterval = setInterval(() => {
        if (currentReplayIndex < fullData.length) {
            currentReplayIndex++;
            series.update(fullData[currentReplayIndex - 1]); 
            
            let safeIdx = Math.max(0, currentReplayIndex - 1);
            if (fullData[safeIdx]) {
                simulationCurrentTime = fullData[safeIdx].time;
            }

            if (typeof checkTradeHits === 'function') checkTradeHits();
            
            // Cek pemuatan bulan berikutnya (background)
            if (isMonthlyMode && !isLoadingNextMonth) {
                checkMonthlyLoad();
            } else {
                checkChunkShift();
            }

            if (typeof saveToLocalStorage === 'function') saveToLocalStorage();

            let currentCandleTime = fullData[safeIdx].time;
            if (currentMode === 'simulation' && simConfig.endTime !== null && currentCandleTime >= simConfig.endTime) {
                handleSessionEnd();
                return;
            }
            if (currentReplayIndex >= fullData.length) {
                pauseReplay();
                if (currentMode === 'simulation') handleSessionEnd();
            }
        } else {
            pauseReplay();
        }
    }, replaySpeed);
};

btnPause.onclick = pauseReplay;

btnStep.onclick = () => {
    if (!isReplayMode) { alert("Aktifkan Set Replay dulu!"); return; }
    if (currentReplayIndex < fullData.length) {
        currentReplayIndex++;
        series.update(fullData[currentReplayIndex - 1]);
        
        let safeIdx = Math.max(0, currentReplayIndex - 1);
        if (fullData[safeIdx]) {
            simulationCurrentTime = fullData[safeIdx].time;
        }

        if (typeof checkTradeHits === 'function') checkTradeHits();
        
        if (isMonthlyMode && !isLoadingNextMonth) {
            checkMonthlyLoad();
        } else {
            checkChunkShift();
        }

        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();

        let currentCandleTime = fullData[safeIdx].time;
        if (currentMode === 'simulation' && simConfig.endTime !== null && currentCandleTime >= simConfig.endTime) {
            handleSessionEnd();
        }
    }
};

btnToggleLine.onclick = () => {
    isLineVisible = !isLineVisible;
    btnToggleLine.innerText = isLineVisible ? "Hide Line" : "Show Line";
    updateScissorsVisibility();
};

speedSelect.onchange = (e) => { replaySpeed = parseInt(e.target.value); };
