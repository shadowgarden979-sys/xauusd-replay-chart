// ==========================================
// FILE: replay.js
// Deskripsi: Logika Replay & Garis Gunting
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
    if (!isReplayMode || isPlaying || !isLineVisible) {
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
    isDraggingScissors = true;
    e.preventDefault(); e.stopPropagation();
    if (chart) chart.applyOptions({ handleScroll: false, handleScale: false }); 
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!isDraggingScissors || !chart) return;
    e.preventDefault(); e.stopPropagation();
    
    const rect = container.getBoundingClientRect();
    const clientX = e.touches[0].clientX;
    const x = clientX - rect.left;
    
    let newIdx = Math.round(chart.timeScale().coordinateToLogical(x));
    if (newIdx === null) return;
    
    // PERBAIKAN MASALAH 3: Batas mundur menjadi 0 (candle pertama)
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
        isLineVisible = true;
        btnToggleLine.innerText = "Hide Line";
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

btnPlay.onclick = () => {
    if (!isReplayMode) { alert("Aktifkan Set Replay dulu!"); return; }
    if (isPlaying) return;
    isPlaying = true;
    updateScissorsVisibility(); 
    
    playInterval = setInterval(() => {
        if (currentReplayIndex < fullData.length) {
            currentReplayIndex++;
            series.update(fullData[currentReplayIndex - 1]); 
            if (currentReplayIndex >= fullData.length) pauseReplay();
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
