/* global pdfjsLib, Tesseract */

// 1. CONFIGURACIÓN CRÍTICA: Se cambió la versión a la 3.11.174 para mayor compatibilidad
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
    canvas: document.getElementById("pdfCanvas"),
    extractedBox: document.getElementById("extractedBox"),
    ocrBox: document.getElementById("ocrBox")
};

let currentFile = null;

// 2. EVENTOS DE SELECCIÓN (Arreglado el problema del botón)
els.dropzone.addEventListener("click", () => {
    els.pdfInput.click(); // Esto fuerza la apertura del selector de archivos
});

els.pdfInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
        currentFile = file;
        els.fileMeta.innerHTML = `<strong>Archivo:</strong> ${file.name}`;
        els.analyzeBtn.disabled = false;
        els.ocrBtn.disabled = false;
        els.statusText.textContent = "Archivo cargado. Haz click en Analizar.";
    }
});

// 3. PROCESAMIENTO
async function processPdf(forceOcr) {
    if (!currentFile) return;
    
    try {
        els.analyzeBtn.disabled = true;
        els.statusText.textContent = "Abriendo PDF...";
        
        const arrayBuffer = await currentFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        // Renderizar primera página para vista previa y OCR
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const ctx = els.canvas.getContext("2d");
        els.canvas.height = viewport.height;
        els.canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // Extraer texto nativo
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const p = await pdf.getPage(i);
            const content = await p.getTextContent();
            fullText += content.items.map(item => item.str).join(" ") + "\n";
        }
        els.extractedBox.textContent = fullText;

        let ocrText = "";
        if (forceOcr || fullText.trim().length < 20) {
            els.statusText.textContent = "Iniciando OCR...";
            const result = await Tesseract.recognize(els.canvas, 'spa');
            ocrText = result.data.text;
            els.ocrBox.textContent = ocrText;
        }

        // Lógica de búsqueda de datos
        analyzeContent(fullText, ocrText);
        els.statusText.textContent = "¡Completado!";
        els.progressFill.style.width = "100%";

    } catch (err) {
        console.error(err);
        els.statusText.textContent = "Error al leer PDF.";
    } finally {
        els.analyzeBtn.disabled = false;
    }
}

function analyzeContent(text, ocr) {
    const combined = (text + " " + ocr).toUpperCase();
    
    // RegEx mejoradas para CFE
    const kwhMatch = combined.match(/([\d,.]+)\s*KWH/) || combined.match(/TOTAL\s+PERIODO\s+([\d,.]+)/);
    const lectAnt = combined.match(/ANTERIOR\s+([\d,.]+)/);
    const lectAct = combined.match(/ACTUAL\s+([\d,.]+)/);
    const tarifa = combined.match(/TARIFA[:\s]+([A-Z0-9]+)/);

    els.kwhValue.textContent = kwhMatch ? kwhMatch[1] : "No hallado";
    els.prevReadValue.textContent = lectAnt ? lectAnt[1] : "—";
    els.currReadValue.textContent = lectAct ? lectAct[1] : "—";
    els.tariffValue.textContent = tarifa ? tarifa[1] : "—";
    els.methodValue.textContent = ocr ? "OCR (Imagen)" : "Texto Nativo";
}

els.analyzeBtn.addEventListener("click", () => processPdf(false));
els.ocrBtn.addEventListener("click", () => processPdf(true));
els.clearBtn.addEventListener("click", () => location.reload());
