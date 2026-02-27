/* global pdfjsLib, Tesseract */

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const els = {
    dropzone: document.getElementById("dropzone"),
    pdfInput: document.getElementById("pdfInput"),
    fileMeta: document.getElementById("fileMeta"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    ocrBtn: document.getElementById("ocrBtn"),
    clearBtn: document.getElementById("clearBtn"),
    kwhValue: document.getElementById("kwhValue"),
    periodValue: document.getElementById("periodValue"),
    tariffValue: document.getElementById("tariffValue"),
    prevReadValue: document.getElementById("prevReadValue"),
    currReadValue: document.getElementById("currReadValue"),
    methodValue: document.getElementById("methodValue"),
    progressFill: document.getElementById("progressFill"),
    statusText: document.getElementById("statusText"),
    canvas: document.getElementById("pdfCanvas")
};

let currentFile = null;

els.dropzone.addEventListener("click", () => els.pdfInput.click());
els.pdfInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
        currentFile = file;
        els.fileMeta.innerHTML = `<strong>Archivo:</strong> ${file.name}`;
        els.analyzeBtn.disabled = false;
        els.ocrBtn.disabled = false;
    }
});

async function processPdf(forceOcr) {
    if (!currentFile) return;
    try {
        updateStatus("Procesando con alta resolución...", "warn");
        els.analyzeBtn.disabled = true;
        
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        // Escala 3.0 para que el OCR no confunda el "8" con "0" o "." con ","
        const viewport = page.getViewport({ scale: 3.0 }); 
        const ctx = els.canvas.getContext("2d");
        els.canvas.height = viewport.height;
        els.canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        updateStatus("Extrayendo y validando datos...", "warn");
        const result = await Tesseract.recognize(els.canvas, 'spa');
        const ocrText = result.data.text;

        analyzeCFE(ocrText);
        updateStatus("Análisis completado", "good");
    } catch (err) {
        updateStatus("Error en el análisis", "bad");
    } finally {
        els.analyzeBtn.disabled = false;
    }
}

function analyzeCFE(rawText) {
    // Normalización: Quitar símbolos extraños y unificar espacios
    const cleanText = rawText.toUpperCase().replace(/[^A-Z0-9\s\/\-]/g, ' ').replace(/\s+/g, ' ');

    // 1. EXTRAER PERIODO (Formato: DD MMM YY AL DD MMM YY)
    // Ejemplo en tu imagen: 07 OCT 25 AL 09 DIC 25
    const periodMatch = cleanText.match(/(\d{2}\s[A-Z]{3}\s\d{2})\s*(?:AL|A)\s*(\d{2}\s[A-Z]{3}\s\d{2})/);
    els.periodValue.textContent = periodMatch ? `${periodMatch[1]} - ${periodMatch[2]}` : "No detectado";

    // 2. EXTRAER TARIFA
    const tarifaMatch = cleanText.match(/TARIFA\s*([A-Z0-9]+)/);
    els.tariffValue.textContent = tarifaMatch ? tarifaMatch[1] : "01";

    // 3. LECTURAS Y CONSUMO (Lógica Robusta)
    // Buscamos la fila: Energía (kWh) -> Lectura Actual -> Lectura Anterior -> Total
    // Basado en tu recibo: 03724 | 03582 | 142
    const tableRow = cleanText.match(/ENERG\wA\s*\(KWH\)\s*(\d{4,5})\s+(\d{4,5})\s+(\d{1,4})/);

    if (tableRow) {
        els.currReadValue.textContent = tableRow[1];
        els.prevReadValue.textContent = tableRow[2];
        els.kwhValue.textContent = tableRow[3];
    } else {
        // Fallback: Buscar números de 4-5 dígitos que NO tengan puntos decimales cerca
        // Esto evita capturar el 170.68
        const possibleReads = cleanText.match(/\b\d{5}\b/g) || [];
        if (possibleReads.length >= 2) {
            els.currReadValue.textContent = possibleReads[0];
            els.prevReadValue.textContent = possibleReads[1];
            els.kwhValue.textContent = Math.abs(parseInt(possibleReads[0]) - parseInt(possibleReads[1]));
        }
    }
    
    els.methodValue.textContent = "OCR Alta Precisión";
}

function updateStatus(msg, type) {
    els.statusText.textContent = msg;
    els.progressFill.style.width = type === "good" ? "100%" : "60%";
}

els.analyzeBtn.addEventListener("click", () => processPdf(true));
els.ocrBtn.addEventListener("click", () => processPdf(true));
els.clearBtn.addEventListener("click", () => location.reload());
