// ==========================================
// FILE: ui.js
// Deskripsi: Logika UI, Tombol, Dropdown, & Modal
// ==========================================

// --- Dropdown Timeframe ---
const tfDropdown = document.getElementById('tf-dropdown');
const btnTF = document.getElementById('btn-tf');

btnTF.onclick = (e) => {
    e.stopPropagation();
    tfDropdown.style.display = tfDropdown.style.display === 'flex' ? 'none' : 'flex';
};

tfDropdown.querySelectorAll('div').forEach(el => {
    el.onclick = (e) => {
        const newTF = el.getAttribute('data-tf');
        if (newTF && allData[newTF].length > 0) {
            
            // PERBAIKAN MASALAH 4: Tangkap timestamp replay sebelum ganti TF
            let currentReplayTime = null;
            if (isReplayMode && fullData.length > 0) {
                let idx = Math.max(0, currentReplayIndex - 1);
                currentReplayTime = fullData[idx].time;
            }

            currentTF = newTF;
            fullData = allData[currentTF];
            btnTF.innerText = currentTF + ' ▼';
            
            if (isReplayMode && currentReplayTime !== null) {
                // Cari index baru menggunakan Binary Search
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
                series.setData(fullData);
            }
            
            // Perbarui UI setelah ganti TF
            if (typeof updateScissorsVisibility === 'function') updateScissorsVisibility();
            if (typeof updateScissorsPosition === 'function') updateScissorsPosition();
            
            chart.timeScale().fitContent();
        }
        tfDropdown.style.display = 'none';
    };
});

document.addEventListener('click', () => { tfDropdown.style.display = 'none'; });

// --- Floating Menu & Modal ---
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
