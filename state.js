// ==========================================
// FILE: state.js
// Deskripsi: Variabel global & status aplikasi
// ==========================================

let drawings = [];
let defaultSettings = {
    line: { color: '#2962FF' }, box: { color: '#2962FF', text: '' },
    'position-long': { baseOpacity: 0.1, activeOpacity: 0.4 },
    'position-short': { baseOpacity: 0.1, activeOpacity: 0.4 },
    circle: { color: '#2962FF' }, text: { color: '#d1d4dc', text: 'Teks' },
    arrow: { color: '#2962FF' }, fibo: { color: '#d1d4dc', levels: [0, 0.236, 0.382, 0.5, 0.618, 1] }
};

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

let isReplayMode = false;
let isPlaying = false;
let playInterval = null;
let replaySpeed = 1000;
let isLineVisible = true;

let currentTF = 'M5';
let fullData = [];
let allData = {};
let allRawData = {};

let chart;
let series;
let bgCanvas, bgCtx;
let fgCanvas, fgCtx;
let container;

let currentMode = 'backtest';
let simConfig = { balance: 100, risk: 1, startDate: null, endDate: null, endTime: null };
let simBalance = 100;
let simRiskPercent = 1;
let tradeHistory = [];
let isSimulationRunning = false;

let chunkSizes = { 'M1': 30000, 'M5': 6000, 'M15': 2000, 'H1': 500, 'H4': 125, 'D1': 22 };
let currentChunkSize = 6000; 
let absoluteStartIndex = 0; 

let backtestChunkSize = 10000;
let backtestStartIndex = 0;
let isShiftingData = false;

let simulationCurrentTime = null;

let isMonthlyMode = false;
let currentLoadedMonth = 1;
let currentLoadedYear = 2013;
let isLoadingNextMonth = false;
let isLoadingNextYear = false;
let prefetchedYears = {}; 
