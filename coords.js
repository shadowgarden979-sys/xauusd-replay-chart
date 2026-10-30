// ==========================================
// FILE: coords.js
// Deskripsi: Konversi koordinat & utilitas waktu
// ==========================================

// Fungsi krusial: Mencari candle terdekat menggunakan Binary Search (Optimasi O(log n))
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

function getX(time) { 
    if (time === null || time === undefined) return null;
    const closest = getClosestTime(time);
    if (closest === null) return null;
    return chart.timeScale().timeToCoordinate(closest); 
}

function getY(price) { 
    return series.priceToCoordinate(price); 
}

function getTimeFromX(x) {
    const logical = chart.timeScale().coordinateToLogical(x);
    if (logical === null) return null;
    let idx = Math.round(logical);
    if (idx >= 0 && idx < fullData.length) return fullData[idx].time;
    return null;
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
