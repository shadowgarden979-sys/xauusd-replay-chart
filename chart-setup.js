// ==========================================
// FILE: chart-setup.js
// Deskripsi: Inisialisasi chart & Parser Data AoA
// ==========================================

// 1. Fungsi Parser: Mengubah [ts, o, h, l, c] menjadi {time, open, high, low, close}
function parseAoA(aoaArray) {
    if (!Array.isArray(aoaArray)) return [];
    return aoaArray.map(item => ({
        time: Math.floor(item[0] / 1000), // Konversi milidetik ke detik
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4]
    }));
}

// 2. Fungsi Lazy Load (Untuk digunakan pada menu simulasi nanti)
function loadDataScript(tf, year) {
    return new Promise((resolve, reject) => {
        const varName = `data_${tf}_${year}`;
        if (window[varName]) { resolve(window[varName]); return; } // Jika sudah ada di memori

        const script = document.createElement('script');
        script.src = `${varName}.js`;
        script.onload = () => {
            if (window[varName]) resolve(window[varName]);
            else reject(new Error(`Variabel ${varName} tidak ditemukan di file.`));
        };
        script.onerror = () => reject(new Error(`Gagal memuat file ${varName}.js`));
        document.head.appendChild(script);
    });
}

// 3. Inisialisasi Data Awal (M5 2012)
let allRawData = { 'M5': null, 'M15': null, 'H1': null, 'H4': null };
allRawData['M5'] = typeof data_M5_2012 !== 'undefined' ? data_M5_2012 : [];

// 4. Cek Ketersediaan Library & Data
if (typeof LightweightCharts === 'undefined') {
    document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Error: Library Chart Gagal Dimuat (CDN Diblokir).<br>Silakan ganti jaringan internet atau gunakan VPN.</h2>';
    throw new Error("Library LightweightCharts tidak ditemukan.");
}

if (allRawData['M5'].length === 0) {
    document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Error: File data_M5_2012.js gagal dimuat atau kosong.</h2>';
    throw new Error("Data M5 kosong.");
}

// 5. Parsing Data & Set Data Awal
allData = {};
allData['M5'] = parseAoA(allRawData['M5']);
allData['M15'] = [];
allData['H1'] = [];
allData['H4'] = [];

fullData = allData['M5'];

// 6. Inisialisasi Chart
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

// 7. Inisialisasi Series Candlestick
series = chart.addCandlestickSeries({
    upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
});

// 8. Tampilkan Data Awal
let initialReplayIndex = Math.max(0, fullData.length - 100);
currentReplayIndex = initialReplayIndex;
series.setData(fullData.slice(0, initialReplayIndex));
chart.timeScale().setVisibleLogicalRange({ from: initialReplayIndex - 50, to: initialReplayIndex + 10 });

// 9. Inisialisasi Canvas Overlay
bgCanvas = document.getElementById('bg-canvas');
bgCtx = bgCanvas.getContext('2d');
fgCanvas = document.getElementById('fg-canvas');
fgCtx = fgCanvas.getContext('2d');

// 10. Fungsi Resize Canvas
function resizeCanvas() {
    if (!container) return;
    bgCanvas.width = fgCanvas.width = container.clientWidth;
    bgCanvas.height = fgCanvas.height = container.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
