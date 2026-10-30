// ==========================================
// FILE: main.js
// Deskripsi: Entry point, LocalStorage, Render Loop
// ==========================================

// --- Fungsi Penyimpanan ---
function saveToLocalStorage() { 
    localStorage.setItem('xau_drawings_v34', JSON.stringify(drawings)); 
}

function saveDefaults() {
    localStorage.setItem('xau_defaults_v34', JSON.stringify(defaultSettings));
}

// --- Load Data Awal dari LocalStorage ---
try {
    const saved = JSON.parse(localStorage.getItem('xau_drawings_v34'));
    if (Array.isArray(saved)) drawings = saved;
} catch(e) { console.log("LocalStorage drawings reset."); }

try {
    const savedDefaults = JSON.parse(localStorage.getItem('xau_defaults_v34'));
    if (savedDefaults) defaultSettings = { ...defaultSettings, ...savedDefaults };
} catch(e) { console.log("LocalStorage defaults reset."); }

// --- Render Loop Utama ---
function render() {
    try {
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);
        
        drawWarnings(); 
        
        drawings.forEach(d => {
            if (d.type.startsWith('position')) drawPositionBg(d);
            else drawShapeFg(d, d === selectedDrawing);
            
            if (d === selectedDrawing) {
                drawHandlesFg(d);
                drawLabelsFg(d);
            }
        });

        if (isDrawing && selectedDrawing) {
            if (selectedDrawing.type.startsWith('position')) drawPositionBg(selectedDrawing);
            else drawShapeFg(selectedDrawing, true);
            drawHandlesFg(selectedDrawing);
            drawLabelsFg(selectedDrawing);
        }

        if (measureStart && measureEnd) {
            drawMeasureTool();
        }

        if (currentMouseX !== null && currentMouseY !== null && !measureFrozen) {
            drawCrosshair();
        }

        updateFloatingMenuPosition();
        updateScissorsPosition();
        updateDateHUD();
    } catch (error) {
        console.error("Render Error:", error);
    }
    requestAnimationFrame(render);
}

// --- Mulai Aplikasi ---
render();
