// ==========================================
// FILE: chart-setup.js
// Deskripsi: Inisialisasi chart & Parser Data AoA (FINAL)
// ==========================================

let isLoadingData = false;
const loadingPromises = {}; 

// Fungsi pembantu untuk mengecek variabel global const dengan aman
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
    if (existingData) {
        return Promise.resolve(existingData);
    }
    
    if (loadingPromises[varName]) {
        return loadingPromises[varName];
    }

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
                    reject(new Error(`File ${varName}.js diunduh, tapi variabel tidak ditemukan di dalam file.`));
                }
            }, 100);
        };
        
        script.onerror = () => {
            delete loadingPromises[varName];
            reject(new Error(`Gagal mengunduh file ${varName}.js. Pastikan file ada di GitHub.`));
        };
        
        document.head.appendChild(script);
    });

    return loadingPromises[varName];
}

async function loadTFData(newTF) {
    if (isLoadingData) return; 
    
    if (allData[newTF] && allData[newTF].length > 0) {
        // PERBAIKAN BUG TF: Tangkap timestamp SEBELUM ganti data
        let currentReplayTime = null;
        if (isReplayMode && fullData.length > 0) {
            let idx = Math.max(0, currentReplayIndex - 1);
            currentReplayTime = fullData[idx] ? fullData[idx].time : null;
        }

        fullData = allData[newTF];
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
    text.innerText = `Memuat ${newTF}...`;

    try {
        const rawData = await loadDataScript(newTF, 2012);
        
        allData[newTF] = await parseAoAAsync(rawData, (pct) => {
            bar.style.width = pct + '%';
            text.innerText = `Memuat ${newTF}... ${pct}%`;
        });
        
        // PERBAIKAN BUG TF: Tangkap timestamp dari TF lama sebelum fullData ditimpa
        let currentReplayTime = null;
        if (isReplayMode && fullData.length > 0) {
            let idx = Math.max(0, currentReplayIndex - 1);
            currentReplayTime = fullData[idx] ? fullData[idx].time : null;
        }

        fullData = allData[newTF];
        applyTFChange(newTF, currentReplayTime);
        btnTF.innerText = newTF + ' ▼'; 
        
    } catch (err) {
        alert(err.message);
        btnTF.innerText = originalText; 
    } finally {
        overlay.style.display = 'none';
        isLoadingData = false;
    }
}

// PERBAIKAN BUG TF: Menerima parameter currentReplayTime dari TF lama
function applyTFChange(newTF, currentReplayTime) {
    currentTF = newTF;
    
    if (isReplayMode && currentReplayTime !== null) {
        // Binary Search berbasis Timestamp untuk mencari index yang tepat di TF baru
        let newIdx = 0;
        let left = 0, right = fullData.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (fullData[mid].time >= currentReplayTime) {
                newIdx = mid;
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        currentReplayIndex = newIdx;
        series.setData(fullData.slice(0, currentReplayIndex));
    } else if (isReplayMode && currentReplayTime === null) {
        currentReplayIndex = Math.max(0, fullData.length - 100);
        series.setData(fullData.slice(0, currentReplayIndex));
    } else {
        currentReplayIndex = fullData.length - 1;
        series.setData(fullData);
    }

    if (typeof updateScissorsVisibility === 'function') updateScissorsVisibility();
    if (typeof updateScissorsPosition === 'function') updateScissorsPosition();
    
    chart.timeScale().fitContent();
}

async function initApp() {
    const overlay = document.getElementById('loading-overlay');
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');

    allRawData['M5'] = getGlobalConst('data_M5_2012') || [];
    allRawData['M15'] = null;
    allRawData['H1'] = null;
    allRawData['H4'] = null;

    if (typeof LightweightCharts === 'undefined') {
        document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Error: Library Chart Gagal Dimuat.</h2>';
        return;
    }
    if (allRawData['M5'].length === 0) {
        document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Error: File data_M5_2012.js gagal dimuat atau kosong.</h2>';
        return;
    }

    allData['M5'] = await parseAoAAsync(allRawData['M5'], (pct) => {
        bar.style.width = pct + '%';
        text.innerText = pct + '%';
    });
    allData['M15'] = []; allData['H1'] = []; allData['H4'] = [];
    fullData = allData['M5'];

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

    let initialReplayIndex = Math.max(0, fullData.length - 100);
    currentReplayIndex = initialReplayIndex;
    series.setData(fullData.slice(0, initialReplayIndex));
    chart.timeScale().setVisibleLogicalRange({ from: initialReplayIndex - 50, to: initialReplayIndex + 10 });

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
    }, 500);
}

function resizeCanvas() {
    if (!container) return;
    bgCanvas.width = fgCanvas.width = container.clientWidth;
    bgCanvas.height = fgCanvas.height = container.clientHeight;
}

initApp();
