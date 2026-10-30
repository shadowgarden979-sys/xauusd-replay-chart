// ==========================================
// FILE: coords.js
// Deskripsi: Konversi koordinat & utilitas waktu
// ==========================================

// Fungsi krusial: Mencari candle terdekat jika waktu tidak persis ada di TF baru
function getClosestTime(time) {
    if (!time) return null;
    let closestIdx = 0;
    let minDiff = Infinity;
    
    for (let i = 0; i < fullData.length; i++) {
        let diff = Math.abs(fullData[i].time - time);
        if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
        }
        if (fullData[i].time > time) break; // Early break karena data terurut
    }
    return fullData[closestIdx] ? fullData[closestIdx].time : time;
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
