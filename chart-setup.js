// ==========================================
// FILE: chart-setup.js
// Deskripsi: Inisialisasi chart, data, dan canvas
// ==========================================

// 1. Kumpulkan Data Mentah
allRawData = {
    'M5': typeof data_M5_Jan2011 !== 'undefined' ? data_M5_Jan2011 : [],
    'M15': typeof data_M15_Jan2011 !== 'undefined' ? data_M15_Jan2011 : [],
    'H1': typeof data_H1_Jan2011 !== 'undefined' ? data_H1_Jan2011 : [],
    'H4': typeof data_H4_Jan2011 !== 'undefined' ? data_H4_Jan2011 : []
};

// 2. Cek Ketersediaan Library & Data
if (typeof LightweightCharts === 'undefined') {
    document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Error: Library Chart Gagal Dimuat (CDN Diblokir).<br>Silakan ganti jaringan internet atau gunakan VPN.</h2>';
    throw new Error("Library LightweightCharts tidak ditemukan.");
}

if (allRawData['M5'].length === 0) {
    document.body.innerHTML = '<h2 style="color:red; text-align:center; margin-top:50px;">Error: File data_M5_Jan2011.js gagal dimuat atau kosong.</h2>';
    throw new Error("Data M5 kosong.");
}

// 3. Normalisasi Format Waktu (ke Unix Time / Detik)
for (let tf in allRawData) {
    allData[tf] = allRawData[tf].map(item => ({
        time: Math.floor(item.timestamp / 1000), 
        open: item.open, high: item.high, low: item.low, close: item.close
    }));
}

// 4. Set Data Awal
fullData = allData[currentTF];

// 5. Inisialisasi Chart
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

// 6. Inisialisasi Series Candlestick
series = chart.addCandlestickSeries({
    upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
    wickUpColor: '#26a69a', wickDownColor: '#ef5350',
});

// 7. Tampilkan Data Awal (Mode Normal, bukan Replay)
let initialReplayIndex = Math.max(0, fullData.length - 100);
currentReplayIndex = initialReplayIndex;
series.setData(fullData.slice(0, initialReplayIndex));
chart.timeScale().setVisibleLogicalRange({ from: initialReplayIndex - 50, to: initialReplayIndex + 10 });

// 8. Inisialisasi Canvas Overlay
bgCanvas = document.getElementById('bg-canvas');
bgCtx = bgCanvas.getContext('2d');
fgCanvas = document.getElementById('fg-canvas');
fgCtx = fgCanvas.getContext('2d');

// 9. Fungsi Resize Canvas
function resizeCanvas() {
    if (!container) return;
    bgCanvas.width = fgCanvas.width = container.clientWidth;
    bgCanvas.height = fgCanvas.height = container.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
