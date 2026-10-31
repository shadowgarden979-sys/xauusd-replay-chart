// ==========================================
// FILE: coords.js
// Deskripsi: Konversi koordinat & utilitas waktu
// ==========================================

function getTFSeconds(tf) {
    if (tf === 'M5') return 300;
    if (tf === 'M15') return 900;
    if (tf === 'H1') return 3600;
    if (tf === 'H4') return 14400;
    return 300;
}

// Fungsi krusial: Mencari candle terdekat menggunakan Binary Search
function getClosestTime(time) {
    if (time === null || time === undefined || fullData.length === 0) return null;
    
    let left = 0;
    let right = fullData.length - 1;
    let closestIdx = 0;
    let minDiff = Infinity;
    
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        let diff = Math.abs(fullData[mid].time - time);
        
        if (diff < minDiff) {
            minDiff = diff;
            closestIdx = mid;
        }
        
        if (fullData[mid].time === time) {
            return fullData[mid].time;
        } else if (fullData[mid].time < time) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return fullData[closestIdx].time;
}

// Diperbarui: Mendukung ekstrapolasi ke masa depan (area kosong)
function getX(time) { 
    if (time === null || time === undefined || !chart) return null;
    
    let lastIdx = isReplayMode ? currentReplayIndex - 1 : fullData.length - 1;
    if (lastIdx < 0) return null;
    let lastValidTime = fullData[lastIdx].time;
    
    if (time <= lastValidTime) {
        const closest = getClosestTime(time);
        return closest !== null ? chart.timeScale().timeToCoordinate(closest) : null;
    } else {
        // Ekstrapolasi X ke area masa depan
        let lastX = chart.timeScale().timeToCoordinate(lastValidTime);
        if (lastX === null) return null;
        
        let tfSec = getTFSeconds(currentTF);
        let barsAhead = (time - lastValidTime) / tfSec;
        let barSpacing = chart.timeScale().options().barSpacing || 8;
        
        return lastX + (barsAhead * barSpacing);
    }
}

function getY(price) { 
    return series.priceToCoordinate(price); 
}

// Diperbarui: Mendukung ekstrapolasi waktu dari area kosong
function getTimeFromX(x) {
    if (!chart) return null;
    
    let lastIdx = isReplayMode ? currentReplayIndex - 1 : fullData.length - 1;
    if (lastIdx < 0) return null;
    let lastValidTime = fullData[lastIdx].time;
    let lastX = chart.timeScale().timeToCoordinate(lastValidTime);
    
    if (lastX !== null && x > lastX) {
        // Hitung waktu di masa depan berdasarkan jarak X
        let barSpacing = chart.timeScale().options().barSpacing || 8;
        let barsAhead = (x - lastX) / barSpacing;
        let tfSec = getTFSeconds(currentTF);
        
        return lastValidTime + (Math.round(barsAhead) * tfSec);
    } else {
        const logical = chart.timeScale().coordinateToLogical(x);
        if (logical === null) return null;
        let idx = Math.round(logical);
        if (idx >= 0 && idx <= lastIdx) return fullData[idx].time;
        return null;
    }
}

function getChartCoords(x, y) {
    const time = getTimeFromX(x);
    const price = series.coordinateToPrice(y);
    if (time === null || price === null) return null;
    return { time, price };
}

function getCoords(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}
