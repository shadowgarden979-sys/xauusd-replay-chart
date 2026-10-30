// ==========================================
// FILE: state.js
// Deskripsi: Variabel global & status aplikasi
// ==========================================

// Data & Objek
let drawings = [];
let defaultSettings = {
    line: { color: '#2962FF' }, box: { color: '#2962FF', text: '' },
    'position-long': { baseOpacity: 0.1, activeOpacity: 0.4 },
    'position-short': { baseOpacity: 0.1, activeOpacity: 0.4 },
    circle: { color: '#2962FF' }, text: { color: '#d1d4dc', text: 'Teks' },
    arrow: { color: '#2962FF' }, fibo: { color: '#d1d4dc', levels: [0, 0.236, 0.382, 0.5, 0.618, 1] }
};

// State Tool & Interaksi
let currentTool = 'pan';
let isDrawing = false;
let selectedDrawing = null; 
let dragHandle = null; 
let dragStartTime = null;
let dragStartPrice = null;
let initialObjState = null;
let currentMouseX = null;
let currentMouseY = null;
let isMeasuring = false;
let measureStart = null;
let measureEnd = null;
let measureFrozen = false;
let snapEnabled = false;

// State Replay
let isReplayMode = false;
let isPlaying = false;
let playInterval = null;
let replaySpeed = 1000;
let isLineVisible = true;

// State Timeframe & Data
let currentTF = 'M5';
let fullData = [];
let allData = {};
let allRawData = {};

// Chart & Canvas (diinisialisasi di chart-setup.js, tapi dideklarasikan di sini agar global)
let chart;
let series;
let bgCanvas, bgCtx;
let fgCanvas, fgCtx;
let container;
