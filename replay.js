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
    } else {
        btnSetReplay.style.background = '#26a69a';
        pauseReplay();
        currentReplayIndex = fullData.length;
        series.setData(fullData);
    }
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

// FUNGSI CHUNKING: MEMOTONG DATA LAMA DAN MEMUAT BARU
function processChunking() {
    if (currentMode !== 'simulation') return;

    // Geser jendela jika sudah masuk Chunk ke-3
    if (currentReplayIndex >= currentChunkSize * 2) {
        let purgeAmount = currentChunkSize;
        absoluteStartIndex += purgeAmount;
        
        let maxLoadedIndex = Math.min(allData[currentTF].length, absoluteStartIndex + (currentChunkSize * 3));
        
        // Simpan state scroll saat ini
        let visibleRange = chart.timeScale().getVisibleLogicalRange();
        
        fullData = allData[currentTF].slice(absoluteStartIndex, maxLoadedIndex);
        currentReplayIndex -= purgeAmount;

        // Hapus drawings yang sudah berada di masa lalu (sebelum fullData[0])
        let cutoffTime = fullData[0].time;
        drawings = drawings.filter(d => {
            if (d.type.startsWith('position') && d.status === 'closed' && d.end.time < cutoffTime) {
                return false; // Buang objek trade lama
            }
            return true;
        });

        series.setData(fullData);
        
        if (visibleRange) {
            chart.timeScale().setVisibleLogicalRange({
                from: visibleRange.from - purgeAmount,
                to: visibleRange.to - purgeAmount
            });
        }
    }
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
            
            if (typeof checkTradeHits === 'function') checkTradeHits();

            // Cek Chunking (Geser Jendela)
            processChunking();

            let currentCandleTime = fullData[currentReplayIndex - 1].time;
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
        
        if (typeof checkTradeHits === 'function') checkTradeHits();

        // Cek Chunking (Geser Jendela)
        processChunking();

        let currentCandleTime = fullData[currentReplayIndex - 1].time;
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

if (chart) {
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => { updateScissorsPosition(); });
}
