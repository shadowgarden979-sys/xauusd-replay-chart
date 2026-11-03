// ==========================================
// FILE: chart-setup.js
// Deskripsi: Inisialisasi chart & Parser Data AoA
// ==========================================

let isLoadingData = false;
const loadingPromises = {}; // Cache untuk mencegah duplikasi script

// 1. Parser Asinkron dengan Progress Callback
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

// 2. Loader Dinamis (Anti Duplikat & Anti Undefined)
function loadDataScript(tf, year) {
    const varName = `data_${tf}_${year}`;
    
    // Jika data sudah ada di memori
    if (window[varName]) {
        return Promise.resolve(window[varName]);
    }
    
    // Jika proses unduh file ini sedang berjalan, kembalikan Promise yang sama
    if (loadingPromises[varName]) {
        return loadingPromises[varName];
    }

    // Buat Promise baru untuk mengunduh
    loadingPromises[varName] = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${varName}.js`;
        
        script.onload = () => {
            // Polling: Pastikan variabel benar-benar sudah dieksekusi oleh browser
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (window[varName]) {
                    clearInterval(checkInterval);
                    resolve(window[varName]);
                } else if (attempts > 30) { // Maksimal tunggu 3 detik
                    clearInterval(checkInterval);
                    delete loadingPromises[varName];
                    reject(new Error(`File ${varName}.js diunduh, tapi variabel tidak ditemukan.`));
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

// 3. Fungsi Ganti TF
async function loadTFData(newTF) {
    if (isLoadingData) return; 
    
    if (allData[newTF] && allData[newTF].length > 0) {
        fullData = allData[newTF];
        applyTFChange(newTF);
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
        
        fullData = allData[newTF];
        applyTFChange(newTF);
        btnTF.innerText = newTF + ' ▼'; 
        
    } catch (err) {
        alert(err.message);
        btnTF.innerText = originalText; 
    } finally {
        overlay.style.display = 'none';
        isLoadingData = false;
    }
}

function applyTFChange(newTF) {
    let currentReplayTime = null;
    if (isReplayMode && fullData.length > 0) {
        let idx = Math.max(0, currentReplayIndex - 1);
        currentReplayTime = fullData[idx] ? fullData[idx].time : null;
    }

    currentTF = newTF;
    
    if (isReplayMode && currentReplayTime !== null) {
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

// 4. Inisialisasi Awal
async function initApp() {
    const overlay = document.getElementById('loading-overlay');
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');

    allRawData['M5'] = typeof data_M5_2012 !== 'undefined' ? data_M5_2012 : [];
    allRawData['M15'] = null;
    allRawData['H1'] = null;
    allRawData['H4'] = null;

    if (typeof LightweightCharts === 'undefined') {
        document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Error: Library Chart Gagal Dimuat (CDN Diblokir).</h2>';
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
