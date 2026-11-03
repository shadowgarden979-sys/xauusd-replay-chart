// ==========================================
// FILE: ui.js
// Deskripsi: Logika UI, Tombol, Dropdown, & Modal (FINAL)
// ==========================================

// --- Dropdown Timeframe ---
const tfDropdown = document.getElementById('tf-dropdown');
const btnTF = document.getElementById('btn-tf');

btnTF.onclick = (e) => {
    e.stopPropagation();
    tfDropdown.style.display = tfDropdown.style.display === 'flex' ? 'none' : 'flex';
    const modeDd = document.getElementById('mode-dropdown');
    if (modeDd) modeDd.style.display = 'none';
};

tfDropdown.querySelectorAll('div').forEach(el => {
    el.onclick = async (e) => {
        const newTF = el.getAttribute('data-tf');
        tfDropdown.style.display = 'none';
        
        // Cegah klik jika sedang loading atau TF sama
        if (newTF && newTF !== currentTF && !isLoadingData) {
            if (typeof loadTFData === 'function') {
                await loadTFData(newTF);
            }
        }
    };
});

// --- Dropdown Mode & Modal Setup ---
const modeDropdown = document.getElementById('mode-dropdown');
const btnMode = document.getElementById('btn-mode');
const setupModal = document.getElementById('setup-modal-overlay');
const historyModal = document.getElementById('history-modal-overlay');

if (btnMode) {
    btnMode.onclick = (e) => {
        e.stopPropagation();
        modeDropdown.style.display = modeDropdown.style.display === 'flex' ? 'none' : 'flex';
        tfDropdown.style.display = 'none';
    };
}

if (modeDropdown) {
    modeDropdown.querySelectorAll('div').forEach(el => {
        el.onclick = (e) => {
            const mode = el.getAttribute('data-mode');
            if (mode === 'simulation') {
                setupModal.style.display = 'flex';
            } else if (mode === 'history') {
                if (typeof currentMode !== 'undefined' && currentMode !== 'simulation') {
                    alert("Masuk ke Mode Simulasi terlebih dahulu untuk melihat riwayat.");
                } else {
                    const balEl = document.getElementById('hud-balance');
                    const riskEl = document.getElementById('hud-risk');
                    if (balEl && typeof simConfig !== 'undefined') balEl.innerText = '$' + simConfig.balance.toFixed(2);
                    if (riskEl && typeof simConfig !== 'undefined') riskEl.innerText = simConfig.risk.toFixed(1);
                    historyModal.style.display = 'flex';
                }
            } else {
                // Mode Backtest
                if (typeof currentMode !== 'undefined') currentMode = 'backtest';
                btnMode.innerText = 'MODE ▼';
                btnMode.style.background = '#485c7b';
            }
            modeDropdown.style.display = 'none';
        };
    });
}

if (document.getElementById('btn-close-setup')) {
    document.getElementById('btn-close-setup').onclick = () => { setupModal.style.display = 'none'; };
}
if (document.getElementById('btn-close-history')) {
    document.getElementById('btn-close-history').onclick = () => { historyModal.style.display = 'none'; };
}

if (document.getElementById('btn-start-sim')) {
    document.getElementById('btn-start-sim').onclick = () => {
        let startDate = document.getElementById('sim-start-date').value;
        let endDate = document.getElementById('sim-end-date').value;
        let bal = parseFloat(document.getElementById('sim-balance').value);
        let risk = parseFloat(document.getElementById('sim-risk').value);

        if (!startDate || !endDate || isNaN(bal) || isNaN(risk)) {
            alert("Harap isi semua data dengan benar!");
            return;
        }
        
        if (new Date(startDate) >= new Date(endDate)) {
            alert("Tanggal Mulai harus lebih awal dari Tanggal Selesai!");
            return;
        }

        // Hapus objek posisi lama agar layar bersih
        drawings = drawings.filter(d => !d.type.startsWith('position'));
        selectedDrawing = null;
        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();

        if (typeof simConfig !== 'undefined') {
            simConfig = { balance: bal, risk: risk, startDate: startDate, endDate: endDate };
        }
        if (typeof currentMode !== 'undefined') currentMode = 'simulation';
        
        btnMode.innerText = 'SIMULASI ▼';
        btnMode.style.background = '#26a69a';
        setupModal.style.display = 'none';
        
        if (typeof startSimulation === 'function') startSimulation();
    };
}

// Sembunyikan dropdown jika klik di luar
document.addEventListener('click', () => { 
    tfDropdown.style.display = 'none'; 
    if (modeDropdown) modeDropdown.style.display = 'none';
});

// --- Floating Menu & Modal Kustomisasi ---
const floatingMenu = document.getElementById('floating-menu');
const btnSnap = document.getElementById('f-btn-snap');
const btnCostum = document.getElementById('f-btn-costum');
const btnDelete = document.getElementById('f-btn-delete');
const modalOverlay = document.getElementById('modal-overlay');
const colorInputContainer = document.getElementById('color-input-container');
const inputColor = document.getElementById('input-color');
const textInputContainer = document.getElementById('text-input-container');
const inputText = document.getElementById('input-text');
const fiboInputContainer = document.getElementById('fibo-input-container');
const inputLevels = document.getElementById('input-levels');
const posInputContainer = document.getElementById('pos-input-container');
const inputBaseOp = document.getElementById('input-base-op');
const inputActiveOp = document.getElementById('input-active-op');

function updateFloatingMenuPosition() {
    if (!selectedDrawing) {
        floatingMenu.style.display = 'none';
        return;
    }
    let maxY = -Infinity, minX = Infinity, maxX = -Infinity, minY = Infinity;
    
    if (selectedDrawing.type.startsWith('position')) {
        minX = getX(selectedDrawing.start.time); maxX = getX(selectedDrawing.end.time);
        let yTP = getY(selectedDrawing.tp) || getY(selectedDrawing.start.price);
        let ySL = getY(selectedDrawing.sl) || getY(selectedDrawing.start.price);
        let yEntry = getY(selectedDrawing.start.price);
        if (minX === null || maxX === null || yEntry === null) { floatingMenu.style.display = 'none'; return; }
        maxY = Math.max(yTP, ySL, yEntry); minY = Math.min(yTP, ySL, yEntry);
    } else if (selectedDrawing.type === 'circle') {
        let cx = getX(selectedDrawing.start.time); let cy = getY(selectedDrawing.start.price);
        let ex = getX(selectedDrawing.end.time); let ey = getY(selectedDrawing.end.price);
        if (cx === null || cy === null || ex === null || ey === null) { floatingMenu.style.display = 'none'; return; }
        let rad = Math.hypot(ex - cx, ey - cy);
        minX = cx - rad; maxX = cx + rad; maxY = cy + rad; minY = cy - rad;
    } else {
        minX = Math.min(getX(selectedDrawing.start.time), getX(selectedDrawing.end.time));
        maxX = Math.max(getX(selectedDrawing.start.time), getX(selectedDrawing.end.time));
        minY = Math.min(getY(selectedDrawing.start.price), getY(selectedDrawing.end.price));
        maxY = Math.max(getY(selectedDrawing.start.price), getY(selectedDrawing.end.price));
        if (minX === null || maxX === null || minY === null || maxY === null) { floatingMenu.style.display = 'none'; return; }
    }

    let centerX = (minX + maxX) / 2;
    let menuX = centerX - (floatingMenu.offsetWidth / 2); 
    let menuY = minY - 50; 

    menuX = Math.max(10, Math.min(menuX, fgCanvas.width - floatingMenu.offsetWidth - 10));
    if (menuY < 10) menuY = maxY + 10; 

    floatingMenu.style.display = 'flex';
    floatingMenu.style.left = menuX + 'px';
    floatingMenu.style.top = menuY + 'px';

    if (selectedDrawing.type === 'line') {
        btnSnap.style.display = 'block';
        btnSnap.className = 'f-btn' + (snapEnabled ? ' snap-active' : '');
    } else {
        btnSnap.style.display = 'none';
    }
}

btnDelete.onclick = () => {
    if (selectedDrawing) {
        drawings = drawings.filter(d => d !== selectedDrawing);
        selectedDrawing = null; saveToLocalStorage();
    }
};

btnSnap.onclick = () => { snapEnabled = !snapEnabled; };

btnCostum.onclick = () => {
    if (!selectedDrawing) return;
    
    colorInputContainer.style.display = 'block';
    textInputContainer.style.display = 'none';
    fiboInputContainer.style.display = 'none';
    posInputContainer.style.display = 'none';

    if (selectedDrawing.type === 'box') {
        textInputContainer.style.display = 'block'; inputText.value = selectedDrawing.text || '';
    } else if (selectedDrawing.type === 'fibo') {
        fiboInputContainer.style.display = 'block';
        inputLevels.value = (selectedDrawing.levels || defaultSettings.fibo.levels).join(', ');
    } else if (selectedDrawing.type.startsWith('position')) {
        colorInputContainer.style.display = 'none'; 
        posInputContainer.style.display = 'block';
        inputBaseOp.value = selectedDrawing.baseOpacity !== undefined ? selectedDrawing.baseOpacity : defaultSettings[selectedDrawing.type].baseOpacity;
        inputActiveOp.value = selectedDrawing.activeOpacity !== undefined ? selectedDrawing.activeOpacity : defaultSettings[selectedDrawing.type].activeOpacity;
    } else {
        inputColor.value = selectedDrawing.color || defaultSettings[selectedDrawing.type]?.color || '#2962FF';
    }

    modalOverlay.style.display = 'flex';
};

document.getElementById('btn-close-modal').onclick = () => { modalOverlay.style.display = 'none'; };

document.getElementById('btn-save-modal').onclick = () => {
    if (selectedDrawing) {
        let saveProps = {};
        
        if (selectedDrawing.type === 'box') {
            selectedDrawing.text = inputText.value;
            saveProps.text = inputText.value;
        }
        if (selectedDrawing.type === 'fibo') {
            selectedDrawing.levels = inputLevels.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
            saveProps.levels = selectedDrawing.levels;
        }
        if (selectedDrawing.type.startsWith('position')) {
            selectedDrawing.baseOpacity = parseFloat(inputBaseOp.value);
            selectedDrawing.activeOpacity = parseFloat(inputActiveOp.value);
            if (isNaN(selectedDrawing.baseOpacity)) selectedDrawing.baseOpacity = 0.1;
            if (isNaN(selectedDrawing.activeOpacity)) selectedDrawing.activeOpacity = 0.4;
            saveProps.baseOpacity = selectedDrawing.baseOpacity;
            saveProps.activeOpacity = selectedDrawing.activeOpacity;
        } else if (!selectedDrawing.type.startsWith('position') && selectedDrawing.type !== 'box' && selectedDrawing.type !== 'fibo') {
            selectedDrawing.color = inputColor.value;
            saveProps.color = selectedDrawing.color;
        }

        defaultSettings[selectedDrawing.type] = { ...defaultSettings[selectedDrawing.type], ...saveProps };
        saveDefaults();
        saveToLocalStorage();
    }
    modalOverlay.style.display = 'none';
};

// --- Tombol Toolbar ---
function setTool(tool, btnId = null) {
    currentTool = tool;
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    if (btnId) document.getElementById(btnId).classList.add('active');
    if (tool !== 'pan') selectedDrawing = null; 
}

document.getElementById('btn-line').onclick = () => setTool('line', 'btn-line');
document.getElementById('btn-box').onclick = () => setTool('box', 'btn-box');
document.getElementById('btn-fibo').onclick = () => setTool('fibo', 'btn-fibo');
document.getElementById('btn-circle').onclick = () => setTool('circle', 'btn-circle');
document.getElementById('btn-text').onclick = () => setTool('text', 'btn-text');
document.getElementById('btn-arrow').onclick = () => setTool('arrow', 'btn-arrow');
document.getElementById('btn-measure').onclick = () => setTool('measure', 'btn-measure');
document.getElementById('btn-long').onclick = () => setTool('position-long', 'btn-long');
document.getElementById('btn-short').onclick = () => setTool('position-short', 'btn-short');

document.getElementById('btn-clear').onclick = () => {
    if(confirm("Hapus semua objek?")) {
        drawings = []; selectedDrawing = null; saveToLocalStorage();
    }
};
