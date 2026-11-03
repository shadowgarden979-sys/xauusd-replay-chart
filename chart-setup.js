// ==========================================
// FILE: chart-setup.js
// Deskripsi: Inisialisasi chart & Parser Data AoA (Async)
// ==========================================

// 1. Parser Asinkron dengan Progress Callback
async function parseAoAAsync(aoaArray, progressCallback) {
    if (!Array.isArray(aoaArray)) return [];
    const result = [];
    const total = aoaArray.length;
    const chunkSize = 5000; // Proses 5000 data per iterasi agar tidak freeze
    
    for (let i = 0; i < total; i += chunkSize) {
        const chunk = aoaArray.slice(i, i + chunkSize);
        for (let j = 0; j < chunk.length; j++) {
            const item = chunk[j];
            result.push({
                time: Math.floor(item[0] / 1000),
                open: item[1], high: item[2], low: item[3], close: item[4]
            });
        }
        // Beri napas ke browser (UI) selama 0 ms sebelum lanjut ke chunk berikutnya
        await new Promise(r => setTimeout(r, 0));
        if (progressCallback) progressCallback(Math.min(100, Math.round(((i + chunkSize) / total) * 100)));
    }
    return result;
}

// 2. Fungsi Lazy Load (Untuk simulasi nanti)
function loadDataScript(tf, year) {
    return new Promise((resolve, reject) => {
        const varName = `data_${tf}_${year}`;
        if (window[varName]) { resolve(window[varName]); return; }
        const script = document.createElement('script');
        script.src = `${varName}.js`;
        script.onload = () => { if (window[varName]) resolve(window[varName]); else reject(new Error(`Variabel ${varName} tidak ditemukan.`)); };
        script.onerror = () => reject(new Error(`Gagal memuat file ${varName}.js`));
        document.head.appendChild(script);
    });
}

// 3. Fungsi Inisialisasi Utama
async function initApp() {
    const overlay = document.getElementById('loading-overlay');
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('loading-text');

    // Setup Data Awal
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

    // Parsing Data Bertahap
    allData['M5'] = await parseAoAAsync(allRawData['M5'], (pct) => {
        bar.style.width = pct + '%';
        text.innerText = pct + '%';
    });
    allData['M15'] = []; allData['H1'] = []; allData['H4'] = [];
    fullData = allData['M5'];

    // Inisialisasi Chart (Setelah data siap)
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

    // Inisialisasi Canvas
    bgCanvas = document.getElementById('bg-canvas');
    bgCtx = bgCanvas.getContext('2d');
    fgCanvas = document.getElementById('fg-canvas');
    fgCtx = fgCanvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Sembunyikan Loading dan Jalankan Render Loop
setTimeout(() => {
    overlay.style.display = 'none';
    
    // Panggil event listener setelah container & canvas 100% siap
    if (typeof window.initDrawingEvents === 'function') {
        window.initDrawingEvents();
    }
    
    if (typeof render === 'function') {
        render(); // Panggil render setelah semua siap
    }
}, 500);
}

function resizeCanvas() {
    if (!container) return;
    bgCanvas.width = fgCanvas.width = container.clientWidth;
    bgCanvas.height = fgCanvas.height = container.clientHeight;
}

// Jalankan Aplikasi
initApp();
