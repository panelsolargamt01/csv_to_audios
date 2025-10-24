// Convertir datos CSV a matriz
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
    const headers = lines[0].split(',').map(h => h.replace(/"/g,''));
    const data = lines.slice(1).map(line => line.split(',').map(Number));
    return { headers, data };
}

// Crear WAV a partir de Float32Array
function createWavFile(signal, sampleRate) {
    const numChannels = 1;
    const bytesPerSample = 2; // 16 bits
    const buffer = new ArrayBuffer(44 + signal.length * bytesPerSample);
    const view = new DataView(buffer);
    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    }
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + signal.length * bytesPerSample, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, 8 * bytesPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, signal.length * bytesPerSample, true);
    let offset = 44;
    for (let i = 0; i < signal.length; i++) {
        let s = Math.max(-1, Math.min(1, signal[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }
    return new Blob([view], { type: 'audio/wav' });
}

// Función principal
document.getElementById('convertBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files[0]) return alert("Selecciona un archivo CSV");

    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = parseCSV(e.target.result);
        const headers = csv.headers;
        const data = csv.data;

        const colTimeIndex = headers.findIndex(h => h.toLowerCase().includes("tiempo"));
        const colEjes = ["Vertical", "Axial", "Horizontal"].map(e => headers.indexOf(e));

        const tiempo = data.map(r => r[colTimeIndex]);
        const dt = (tiempo[tiempo.length-1]-tiempo[0])/(tiempo.length-1);
        const fs = 1/dt;

        const resultado = document.getElementById('resultado');
        resultado.innerHTML = '';

        colEjes.forEach((colIdx, i) => {
            if(colIdx === -1) return;
            const eje = headers[colIdx];
            const signal = data.map(r => r[colIdx]);
            const wavBlob = createWavFile(signal, fs);
            const url = URL.createObjectURL(wavBlob);

            // Descargar automáticamente
            const a = document.createElement('a');
            a.href = url;
            a.download = `${eje}.wav`;
            a.click();

            // Enlace visible
            const link = document.createElement('a');
            link.href = url;
            link.download = `${eje}.wav`;
            link.textContent = ` Descargar ${eje}.wav`;
            link.className = 'audio-link';
            resultado.appendChild(link);
        });
    };
    reader.readAsText(fileInput.files[0]);
});

