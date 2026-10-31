// ==========================================
// FILE: drawing-interactions.js
// Deskripsi: Deteksi sentuhan, drag objek, & gambar baru
// ==========================================

function checkHandleHit(x, y) {
    if (!selectedDrawing) return null;
    const d = selectedDrawing;
    if (d.type === 'circle') {
        const cx = getX(d.start.time); const cy = getY(d.start.price);
        const ex = getX(d.end.time); const ey = getY(d.end.price);
        if (cx !== null && cy !== null && Math.hypot(x - cx, y - cy) < 30) return 'center';
        if (ex !== null && ey !== null && Math.hypot(x - ex, y - ey) < 30) return 'end';
        return null;
    }
    let cx, cy;
    if (d.type.startsWith('position')) {
        let x1 = getX(d.start.time); let yEntry = getY(d.start.price);
        let x2 = getX(d.end.time); let yTP = getY(d.tp); let ySL = getY(d.sl);
        if (x1 !== null && x2 !== null && yEntry !== null) {
            cx = (x1 + x2) / 2; cy = (yEntry + (yTP||yEntry) + (ySL||yEntry)) / 3;
        } else return null;
    } else {
        const x1 = getX(d.start.time); const y1 = getY(d.start.price);
        const x2 = getX(d.end.time); const y2 = getY(d.end.price);
        if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
            cx = (x1 + x2) / 2; cy = (y1 + y2) / 2;
        } else return null;
    }
    if (cx !== null && cy !== null && Math.hypot(x - cx, y - cy) < 30) return 'center';

    if (d.type.startsWith('position')) {
        const x1 = getX(d.start.time); const yEntry = getY(d.start.price);
        const x2 = getX(d.end.time); const yTP = getY(d.tp); const ySL = getY(d.sl);
        if (x1 !== null && yEntry !== null && Math.hypot(x - x1, y - yEntry) < 30) return 'entry';
        if (x2 !== null && yTP !== null && Math.hypot(x - x2, y - yTP) < 30) return 'tp';
        if (x2 !== null && ySL !== null && Math.hypot(x - x2, y - ySL) < 30) return 'sl';
        if (x2 !== null && yEntry !== null && Math.hypot(x - x2, y - yEntry) < 30) return 'exit';
    } else {
        const x1 = getX(d.start.time); const y1 = getY(d.start.price);
        const x2 = getX(d.end.time); const y2 = getY(d.end.price);
        if (x1 !== null && y1 !== null && Math.hypot(x - x1, y - y1) < 30) return 'start';
        if (x2 !== null && y2 !== null && Math.hypot(x - x2, y - y2) < 30) return 'end';
    }
    return null;
}

function checkObjectHit(x, y) {
    for (let i = drawings.length - 1; i >= 0; i--) {
        const d = drawings[i];
        if (!d || !d.type) continue;
        const x1 = getX(d.start.time); const y1 = getY(d.start.price);
        if (d.type.startsWith('position')) {
            let x2 = getX(d.end.time); const yTP = getY(d.tp); const ySL = getY(d.sl);
            if (x1 === null || x2 === null || y1 === null) continue;
            const minX = Math.min(x1, x2); const maxX = Math.max(x1, x2);
            const minY = Math.min(yTP||y1, ySL||y1, y1); const maxY = Math.max(yTP||y1, ySL||y1, y1);
            if (x > minX && x < maxX && y > minY && y < maxY) return d;
        } else if (d.type === 'circle') {
            const x2 = getX(d.end.time); const y2 = getY(d.end.price);
            if (x1 === null || y1 === null || x2 === null || y2 === null) continue;
            if (Math.hypot(x - x1, y - y1) <= Math.hypot(x2 - x1, y2 - y1) + 10) return d;
        } else {
            const x2 = getX(d.end.time); const y2 = getY(d.end.price);
            if (x1 === null || y1 === null || x2 === null || y2 === null) continue;
            if (d.type === 'box') {
                const minX = Math.min(x1, x2); const maxX = Math.max(x1, x2);
                const minY = Math.min(y1, y2); const maxY = Math.max(y1, y2);
                if (x > minX && x < maxX && y > minY && y < maxY) return d;
            } else if (d.type === 'line' || d.type === 'arrow' || d.type === 'fibo') {
                if (Math.abs((y2 - y1)*x - (x2 - x1)*y + x2*y1 - y2*x1) / Math.hypot(y2-y1, x2-x1) < 20) return d;
            } else if (d.type === 'text') {
                if (Math.hypot(x - x1, y - y1) < 30) return d;
            }
        }
    }
    return null;
}

function handleStart(e) {
    const { x, y } = getCoords(e);
    currentMouseX = x; currentMouseY = y;

    if (currentTool === 'measure') {
        e.preventDefault();
        const coords = getChartCoords(x, y);
        if (coords) {
            if (measureFrozen) {
                measureFrozen = false; measureStart = null; measureEnd = null; setTool('pan');
            } else {
                isMeasuring = true; measureStart = coords; measureEnd = coords;
            }
        }
        return;
    }

    if (currentTool !== 'pan') {
        e.preventDefault(); 
        if (isPlaying) pauseReplay();

        const coords = getChartCoords(x, y);
        if (coords) {
            const def = defaultSettings[currentTool] || {};

            if (currentTool === 'position-long' || currentTool === 'position-short') {
            let isLong = currentTool === 'position-long';
            let tp = isLong ? coords.price + 5 : coords.price - 5;
            let sl = isLong ? coords.price - 5 : coords.price + 5;
    
    // PERBAIKAN: Hitung endTime mandiri tanpa bergantung pada index candle (mendukung area masa depan)
    let tfSec = getTFSeconds(currentTF);
    let endTime = coords.time + (tfSec * 20); // Default 20 candle ke depan

    let newPos = { 
        type: currentTool, start: coords, end: { time: endTime, price: coords.price }, tp, sl,
        baseOpacity: def.baseOpacity !== undefined ? def.baseOpacity : 0.1,
        activeOpacity: def.activeOpacity !== undefined ? def.activeOpacity : 0.4
    };
    drawings.push(newPos); selectedDrawing = newPos;
    setTool('pan'); saveToLocalStorage();
} else if (currentTool === 'circle') {
    // PERBAIKAN: Hitung endTime mandiri
    let tfSec = getTFSeconds(currentTF);
    let endTime = coords.time + (tfSec * 10); // Default 10 candle ke depan

    let newCircle = { 
        type: 'circle', start: coords, end: { time: endTime, price: coords.price + 5 },
        color: def.color || '#2962FF'
    };
    drawings.push(newCircle); selectedDrawing = newCircle;
    setTool('pan'); saveToLocalStorage();
}else if (currentTool === 'text') {
                let text = prompt("Masukkan teks:", def.text || "Teks");
                if (text) {
                    let newText = { type: 'text', start: coords, end: coords, text: text, color: def.color || '#d1d4dc' };
                    drawings.push(newText); saveToLocalStorage();
                }
                setTool('pan');
            } else {
                isDrawing = true;
                selectedDrawing = { 
                    type: currentTool, start: coords, end: coords,
                    color: def.color || '#2962FF',
                    levels: def.levels || [0, 0.236, 0.382, 0.5, 0.618, 1]
                };
            }
        }
        return;
    }

    if (measureFrozen) {
        measureFrozen = false; measureStart = null; measureEnd = null; return;
    }

    const hitHandle = checkHandleHit(x, y);
    if (hitHandle) {
        dragHandle = hitHandle; e.preventDefault(); 
        chart.applyOptions({ handleScroll: false, handleScale: false }); 
        const coords = getChartCoords(x, y);
        dragStartTime = coords.time; dragStartPrice = coords.price;
        initialObjState = JSON.parse(JSON.stringify(selectedDrawing));
        return;
    }

    const hitObj = checkObjectHit(x, y);
    if (hitObj) {
        if (hitObj.type === 'text') {
            let newText = prompt("Edit teks:", hitObj.text);
            if (newText !== null) { hitObj.text = newText; saveToLocalStorage(); }
        }
        selectedDrawing = hitObj; e.preventDefault(); return;
    }
    selectedDrawing = null; 
}

function handleMove(e) {
    const { x, y } = getCoords(e);
    currentMouseX = x; currentMouseY = y;

    if (isMeasuring) {
        e.preventDefault();
        const coords = getChartCoords(x, y);
        if (coords) measureEnd = coords;
    } else if (isDrawing && selectedDrawing) {
        e.preventDefault();
        const coords = getChartCoords(x, y);
        if (coords) selectedDrawing.end = coords;
    } else if (dragHandle && selectedDrawing) {
        e.preventDefault();
        const coords = getChartCoords(x, y);
        if (!coords) return;

        if (dragHandle === 'center') {
            const deltaTime = coords.time - dragStartTime;
            const deltaPrice = coords.price - dragStartPrice;
            if (selectedDrawing.type.startsWith('position')) {
                selectedDrawing.start.time = initialObjState.start.time + deltaTime;
                selectedDrawing.start.price = initialObjState.start.price + deltaPrice;
                selectedDrawing.end.time = initialObjState.end.time + deltaTime;
                selectedDrawing.tp = initialObjState.tp + deltaPrice;
                selectedDrawing.sl = initialObjState.sl + deltaPrice;
            } else {
                selectedDrawing.start.time = initialObjState.start.time + deltaTime;
                selectedDrawing.start.price = initialObjState.start.price + deltaPrice;
                selectedDrawing.end.time = initialObjState.end.time + deltaTime;
                selectedDrawing.end.price = initialObjState.end.price + deltaPrice;
            }
        } else {
            if (dragHandle === 'tp') {
                if (selectedDrawing.type === 'position-long') {
                    if (coords.price <= selectedDrawing.start.price) selectedDrawing.tp = selectedDrawing.start.price + 0.01;
                    else selectedDrawing.tp = coords.price;
                } else {
                    if (coords.price >= selectedDrawing.start.price) selectedDrawing.tp = selectedDrawing.start.price - 0.01;
                    else selectedDrawing.tp = coords.price;
                }
            } else if (dragHandle === 'sl') {
                if (selectedDrawing.type === 'position-long') {
                    if (coords.price >= selectedDrawing.start.price) selectedDrawing.sl = selectedDrawing.start.price - 0.01;
                    else selectedDrawing.sl = coords.price;
                } else {
                    if (coords.price <= selectedDrawing.start.price) selectedDrawing.sl = selectedDrawing.start.price + 0.01;
                    else selectedDrawing.sl = coords.price;
                }
            } else if (dragHandle === 'exit') {
                selectedDrawing.end.time = coords.time;
            } else if (dragHandle === 'entry') {
                let newPrice = coords.price;
                if (selectedDrawing.type === 'position-long') {
                    if (newPrice >= selectedDrawing.tp) newPrice = selectedDrawing.tp - 0.01;
                    if (newPrice <= selectedDrawing.sl) newPrice = selectedDrawing.sl + 0.01;
                } else {
                    if (newPrice <= selectedDrawing.tp) newPrice = selectedDrawing.tp + 0.01;
                    if (newPrice >= selectedDrawing.sl) newPrice = selectedDrawing.sl - 0.01;
                }
                selectedDrawing.start.time = coords.time;
                selectedDrawing.start.price = newPrice;
                selectedDrawing.end.price = newPrice;
            } else {
                if (selectedDrawing.type === 'line' && snapEnabled) {
                    const startX = getX(selectedDrawing.start.time); const startY = getY(selectedDrawing.start.price);
                    if (Math.abs(x - startX) < 15) coords.time = selectedDrawing.start.time; 
                    if (Math.abs(y - startY) < 15) coords.price = selectedDrawing.start.price; 
                }
                selectedDrawing[dragHandle] = coords;
            }
        }
    }
}

function handleEnd() {
    if (isMeasuring) { isMeasuring = false; measureFrozen = true; }
    if (isDrawing) {
        isDrawing = false;
        drawings.push(selectedDrawing); setTool('pan'); saveToLocalStorage(); 
    }
    if (dragHandle) {
        dragHandle = null;
        chart.applyOptions({ handleScroll: true, handleScale: true }); 
        saveToLocalStorage(); 
    }
    currentMouseX = null; currentMouseY = null;
}

container.addEventListener('touchstart', handleStart, { passive: false });
container.addEventListener('mousedown', handleStart);
window.addEventListener('touchmove', handleMove, { passive: false });
window.addEventListener('mousemove', handleMove);
window.addEventListener('touchend', handleEnd);
window.addEventListener('mouseup', handleEnd);
