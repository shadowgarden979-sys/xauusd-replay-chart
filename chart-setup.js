// ==========================================
// FILE: chart-setup.js
// Deskripsi: Inisialisasi chart & Parser Data AoA (FINAL)
// ==========================================

let isLoadingData = false;
const loadingPromises = {}; 

function getGlobalConst(varName) {
    try {
        return new Function('return typeof ' + varName + ' !== "undefined" ? ' + varName + ' : null')();
    } catch (e) {
        return null;
    }
}

async function parseAoAAsync(aoaArray, progressCallback) {
    if (!Array.isArray(aoaArray)) return [];
    const result = [];
    const total = aoaArray.length;
    const chunkSize = 5000; 
    
    for (let i = 0; i < total; i += chunkSize) {
        const chunk = aoaArray.slice(i, i + chunkSize);
        for (let j = 0; j < chunk.length; j++) {
            const item = chunk[j];
            result.push({
                time: Math.floor(item[0] / 1000),
                open: item[1], high: item[2], low: item[3], close: item[4]
            });
        }
        await new Promise(r => setTimeout(r, 0));
        if (progressCallback) progressCallback(Math.min(100, Math.round(((i + chunkSize) / total) * 100)));
    }
    return result;
}

function loadDataScript(tf, year) {
    const varName = `data_${tf}_${year}`;
    const existingData = getGlobalConst(varName);
    if (existingData) return Promise.resolve(existingData);
    if (loadingPromises[varName]) return loadingPromises[varName];

    loadingPromises[varName] = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${varName}.js`;
        script.onload = () => {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                const data = getGlobalConst(varName);
                if (data) {
                    clearInterval(checkInterval);
                    resolve(data);
                } else if (attempts > 30) { 
                    clearInterval(checkInterval);
                    delete loadingPromises[varName];
                    reject(new Error(`File ${varName}.js diunduh, tapi variabel tidak ditemukan.`));
                }
            }, 100);
        };
        script.onerror = () => {
            delete loadingPromises[varName];
            reject(new Error(`Gagal mengunduh file ${varName}.js.`));
        };
        document.head.appendChild(script);
    });
    return loadingPromises[varName];
}

function truncateLastCandle(dataArr, currentTime, tf) {
    if (dataArr.length === 0) return dataArr;
    let last = dataArr[dataArr.length - 1];
    let tfSec = getTFSeconds(tf);
    
    if (last.time + tfSec <= currentTime) return dataArr; 
    if (last.time > currentTime) {
        dataArr.pop();
        return dataArr;
    }
    
    let m5Data = allData['M5'];
    if (m5Data && m5Data.length > 0) {
        let m5StartIdx = -1, m5EndIdx = -1;
        let left = 0, right = m5Data.length - 1;
        
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (m5Data[mid].time >= last.time) { m5StartIdx = mid; right = mid - 1; } else { left = mid + 1; }
        }
        
        left = 0; right = m5Data.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (m5Data[mid].time <= currentTime) { m5EndIdx = mid; left = mid + 1; } else { right = mid - 1; }
        }
        
        if (m5StartIdx !== -1 && m5EndIdx !== -1 && m5StartIdx <= m5EndIdx) {
            let high = -Infinity, low = Infinity;
            for (let i = m5StartIdx; i <= m5EndIdx; i++) {
                if (m5Data[i].high > high) high = m5Data[i].high;
                if (m5Data[i].low < low) low = m5Data[i].low;
            }
            dataArr[dataArr.length - 1] = {
                time: last.time, open: last.open, high: high, low: low, close: m5Data[m5EndIdx].close
            };
            return dataArr;
        }
    }
    dataArr.pop();
    return dataArr;
}

async function loadTFData(newTF) {
    if (isLoadingData) return; 
    
    let currentReplayTime = simulationCurrentTime;
    let targetYear = null;

    if (currentReplayTime) {
        targetYear = new Date(currentReplayTime * 1000).getUTCFullYear();
    } else if (fullData && fullData.length > 0) {
        // PERBAIKAN: Jika waktu kosong, gunakan tahun dari data yang sedang aktif
        targetYear = new Date(fullData[0].time * 1000).getUTCFullYear();
    } else {
        targetYear = Math.max(...availableYears[newTF]);
    }

    if (!availableYears[newTF] || !availableYears[newTF].includes(targetYear)) {
        targetYear = Math.max(...availableYears[newTF]);
    }

    let isDataReady = false;
    if (allData[newTF] && allData[newTF].length > 0) {
        let currentDataYear = new Date(allData[newTF][0].time * 1000).getUTCFullYear();
        if (currentDataYear === targetYear) {
            isDataReady = true;
        }
    }

    if (isDataReady) {
        applyTFChange(newTF, currentReplayTime);
        document.getElementById('btn-tf').innerText = newTF + ' ▼';
        return;
    }

    const overlay = document.getElementById('loading-overlay');
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');
    const btnTF = document.getElementById('btn-tf');
    const originalText = btnTF.innerText;

    isLoadingData = true;
    overlay.style.display = 'flex';
    bar.style.width = '0%';
    text.innerText = `Memuat ${newTF} (${targetYear})...`;

    try {
        const rawData = await loadDataScript(newTF, targetYear);
        allData[newTF] = await parseAoAAsync(rawData, (pct) => {
            bar.style.width = pct + '%';
            text.innerText = `Memuat ${newTF} ${targetYear}... ${pct}%`;
        });
        
        applyTFChange(newTF, currentReplayTime);
        btnTF.innerText = newTF + ' ▼'; 
        
    } catch (err) {
        alert("Gagal memuat TF: " + err.message);
        btnTF.innerText = originalText; 
    } finally {
        overlay.style.display = 'none';
        isLoadingData = false;
    }
}

function applyTFChange(newTF, currentReplayTime) {
    currentTF = newTF;
    let sourceData = allData[currentTF];
    
    if (isReplayMode && currentReplayTime !== null) {
        let newIdx = 0;
        let left = 0, right = sourceData.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (sourceData[mid].time <= currentReplayTime) {
                newIdx = mid;
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        if (newIdx >= sourceData.length) newIdx = sourceData.length - 1;
        if (newIdx < 0) newIdx = 0;

        currentChunkSize = chunkSizes[currentTF] || 6000;
        absoluteStartIndex = Math.max(0, newIdx - currentChunkSize);
        let maxLoadedIndex = Math.min(sourceData.length, absoluteStartIndex + (currentChunkSize * 3));
        
        fullData = sourceData.slice(absoluteStartIndex, maxLoadedIndex);
        currentReplayIndex = newIdx - absoluteStartIndex + 1;
        if (currentReplayIndex > fullData.length) currentReplayIndex = fullData.length;
        
        let slicedData = fullData.slice(0, currentReplayIndex);
        slicedData = truncateLastCandle(slicedData, currentReplayTime, currentTF);
        
        series.setData(slicedData);
        chart.timeScale().fitContent();
    } else if (isReplayMode && currentReplayTime === null) {
        currentChunkSize = chunkSizes[currentTF] || 6000;
        absoluteStartIndex = Math.max(0, sourceData.length - (currentChunkSize * 3));
        fullData = sourceData.slice(absoluteStartIndex);
        currentReplayIndex = fullData.length;
        series.setData(fullData);
    } else {
        backtestStartIndex = Math.max(0, sourceData.length - (backtestChunkSize * 3));
        fullData = sourceData.slice(backtestStartIndex);
        currentReplayIndex = fullData.length - 1;
        series.setData(fullData);
        chart.timeScale().scrollToRealTime();
    }

    if (typeof updateScissorsVisibility === 'function') updateScissorsVisibility();
    if (typeof updateScissorsPosition === 'function') updateScissorsPosition();
}

async function initApp() {
    const overlay = document.getElementById('loading-overlay');
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');

    if (typeof LightweightCharts === 'undefined') {
        document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Error: Library Chart Gagal Dimuat.</h2>';
        return;
    }
    if (typeof availableYears === 'undefined' || !availableYears['M5'] || availableYears['M5'].length === 0) {
        document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Error: File data_index.js gagal dimuat atau tidak valid.</h2>';
        return;
    }

    let savedSimState = null;
    try {
        const rawState = localStorage.getItem('xau_sim_state_v1');
        if (rawState) savedSimState = JSON.parse(rawState);
    } catch(e) {}

    let isResuming = false;
    if (savedSimState && savedSimState.isSimulationRunning && savedSimState.currentMode === 'simulation') {
        isResuming = confirm("Ditemukan sesi simulasi yang belum selesai. Lanjutkan sesi sebelumnya?");
    }

    let targetYear = 2025;
    let targetTF = 'M5';

    if (isResuming) {
        targetYear = new Date(savedSimState.simulationCurrentTime * 1000).getUTCFullYear();
        targetTF = savedSimState.currentTF;
        
        currentMode = savedSimState.currentMode;
        simConfig = savedSimState.simConfig;
        simBalance = savedSimState.simBalance;
        tradeHistory = savedSimState.tradeHistory;
        simulationCurrentTime = savedSimState.simulationCurrentTime;
        isSimulationRunning = savedSimState.isSimulationRunning;
        currentTF = targetTF;
        
        document.getElementById('btn-tf').innerText = targetTF + ' ▼';
        document.getElementById('btn-mode').innerText = 'SIMULASI ▼';
        document.getElementById('btn-mode').style.background = '#26a69a';
        isReplayMode = true;
        
        const btnSetReplay = document.getElementById('btn-set-replay');
        if (btnSetReplay) btnSetReplay.style.background = '#ef5350';
        
    } else {
        localStorage.removeItem('xau_sim_state_v1');
        targetYear = Math.max(...availableYears['M5']);
        targetTF = 'M5';
        currentMode = 'backtest';
        isReplayMode = false;
    }

    text.innerText = `Memuat Data (${targetYear})...`;

    try {
        const rawData = await loadDataScript(targetTF, targetYear);
        allData[targetTF] = await parseAoAAsync(rawData, (pct) => {
            bar.style.width = pct + '%';
            text.innerText = pct + '%';
        });
    } catch (err) {
        document.body.innerHTML = `<h2 style="color:red; text-align:center; margin-top:50px;">Error: ${err.message}</h2>`;
        return;
    }
    
    ['M5', 'M15', 'H1', 'H4'].forEach(tf => {
        if (!allData[tf]) allData[tf] = [];
    });

    container = document.getElementById('chart-container');
    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth, height: container.clientHeight,
        layout: { background: { color: 'transparent' }, textColor: '#d1d4dc' },
        grid: { vertLines: { color: '#2B2B43' }, horzLines: { color: '#2B2B43' } },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#485c7b', rightOffset: 10, barSpacing: 8 },
        rightPriceScale: { autoScale: false, borderColor: '#485c7b' },
        handleScroll: { horzTouchDrag: true, vertTouchDrag: true },
        handleScale: { axisPressedMouseMove: { time: true, price: true }, pinch: true },
        crosshair: { mode: LightweightCharts.CrosshairMode.Hidden }
    });

    series = chart.addCandlestickSeries({
        upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
        wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });

    if (isResuming) {
        currentChunkSize = chunkSizes[currentTF] || 6000;
        let sourceData = allData[currentTF];
        let newIdx = 0, left = 0, right = sourceData.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (sourceData[mid].time <= simulationCurrentTime) { newIdx = mid; left = mid + 1; } else { right = mid - 1; }
        }
        
        absoluteStartIndex = Math.max(0, newIdx - currentChunkSize);
        let maxLoadedIndex = Math.min(sourceData.length, absoluteStartIndex + (currentChunkSize * 3));
        fullData = sourceData.slice(absoluteStartIndex, maxLoadedIndex);
        currentReplayIndex = newIdx - absoluteStartIndex + 1;
        
        let slicedData = fullData.slice(0, currentReplayIndex);
        slicedData = truncateLastCandle(slicedData, simulationCurrentTime, currentTF);
        series.setData(slicedData);
        chart.timeScale().fitContent();
    } else {
        backtestStartIndex = Math.max(0, allData['M5'].length - (backtestChunkSize * 3));
        fullData = allData['M5'].slice(backtestStartIndex);
        currentReplayIndex = fullData.length - 1;
        series.setData(fullData);
        chart.timeScale().scrollToRealTime();
    }

    bgCanvas = document.getElementById('bg-canvas');
    bgCtx = bgCanvas.getContext('2d');
    fgCanvas = document.getElementById('fg-canvas');
    fgCtx = fgCanvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setTimeout(() => {
        overlay.style.display = 'none';
        if (typeof window.initDrawingEvents === 'function') window.initDrawingEvents();
        if (typeof render === 'function') render();
        if (typeof updateModeDropdownUI === 'function') updateModeDropdownUI();
        if (typeof updateScissorsVisibility === 'function') updateScissorsVisibility();
    }, 500);
}

function resizeCanvas() {
    if (!container) return;
    bgCanvas.width = fgCanvas.width = container.clientWidth;
    bgCanvas.height = fgCanvas.height = container.clientHeight;
}

initApp();
