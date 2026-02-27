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
    // Datos de Consumo
    kwhValue: document.getElementById("kwhValue"),
    periodValue: document.getElementById("periodValue"),
    tariffValue: document.getElementById("tariffValue"),
    prevReadValue: document.getElementById("prevReadValue"),
    currReadValue: document.getElementById("currReadValue"),
    // Datos Financieros
    energyValue: document.getElementById("energyValue"),
    ivaValue: document.getElementById("ivaValue"),
    dapValue: document.getElementById("dapValue"),
    debtValue: document.getElementById("debtValue"),
    paymentValue: document.getElementById("paymentValue"),
    totalValue: document.getElementById("totalValue"),
    // Otros
    methodValue: document.getElementById("methodValue"),
    progressFill: document.getElementById("progressFill"),
    statusText: document.getElementById("statusText"),
    canvas: document.getElementById("pdfCanvas"),
    extractedBox: document.getElementById("extractedBox")
};

let currentFile = null;

els.dropzone.addEventListener("click", () => els.pdfInput.click());
els.pdfInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
        currentFile = file;
        els.fileMeta.innerHTML = `<strong>Archivo cargado:</strong> ${file.name}`;
        els.analyzeBtn.disabled = false;
        els.ocrBtn.disabled = false;
    }
});

async function processPdf(forceOcr) {
    if (!currentFile) return;
    try {
        els.analyzeBtn.disabled = true;
        updateStatus("Procesando documento...", "warn");
        
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        // Escala alta para mejorar el OCR
        const viewport = page.getViewport({ scale: 3.0 }); 
        const ctx = els.canvas.getContext("2d");
        els.canvas.height = viewport.height;
        els.canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        let fullText = "";
        
        if (forceOcr) {
            updateStatus("Escaneando con alta precisión...", "warn");
            const result = await Tesseract.recognize(els.canvas, 'spa');
            fullText = result.data.text;
        } else {
            // Intento de extracción directa de texto del PDF
            const content = await page.getTextContent();
            fullText = content.items.map(item => item.str).join(" ");
        }
        
        els.extractedBox.textContent = fullText;
        analyzeCFE(fullText);
        updateStatus("Análisis completado", "good");
    } catch (err) {
        updateStatus("Error en el proceso", "bad");
        console.error(err);
    } finally {
        els.analyzeBtn.disabled = false;
    }
}

function analyzeCFE(text) {
    // Unimos y limpiamos el texto para facilitar la búsqueda
    const raw = text.toUpperCase().replace(/\s\s+/g, ' ');

    // --- 1. TARIFA ---
    const tarifaMatch = raw.match(/TARIFA[:\s]*([A-Z0-9]+)/);
    els.tariffValue.textContent = tarifaMatch ? tarifaMatch[1] : "No detectado";

    // --- 2. PERIODO FACTURADO ---
    const periodoRegex = /(\d{2}\s+[A-Z]{3}\s+\d{2})\s*(?:AL|A)\s*(\d{2}\s+[A-Z]{3}\s+\d{2})/;
    const periodoMatch = raw.match(periodoRegex);
    els.periodValue.textContent = periodoMatch ? `${periodoMatch[1]} - ${periodoMatch[2]}` : "No detectado";

    // --- 3. LECTURAS Y CONSUMO ---
    const energiaRow = raw.match(/ENERG[IÍ]A\s*\(KWH\)\s+(\d{4,5})\s+(\d{4,5})\s+(\d+)/i);
    if (energiaRow) {
        els.currReadValue.textContent = energiaRow[1];
        els.prevReadValue.textContent = energiaRow[2];
        els.kwhValue.textContent = energiaRow[3];
    }

    // --- 4. DATOS FINANCIEROS (Regex mejorado) ---
    
    // Energía Subtotal
    const energyMatch = raw.match(/ENERGIA\s+([\d,]+\.\d{2})/);
    els.energyValue.textContent = energyMatch ? `$ ${energyMatch[1]}` : "$ —";

    // IVA 16%
    const ivaMatch = raw.match(/IVA\s+16%?\s+([\d,]+\.\d{2})/);
    els.ivaValue.textContent = ivaMatch ? `$ ${ivaMatch[1]}` : "$ —";

    // DAP
    const dapMatch = raw.match(/DAP\s+([\d,]+\.\d{2})/);
    els.dapValue.textContent = dapMatch ? `$ ${dapMatch[1]}` : "$ —";

    // Adeudo Anterior
    const debtMatch = raw.match(/ADEUDO\s+ANTERIOR\s+([\d,]+\.\d{2})/);
    els.debtValue.textContent = debtMatch ? `$ ${debtMatch[1]}` : "$ —";

    // Su Pago
    const paymentMatch = raw.match(/SU\s+PAGO\s+([\d,]+\.\d{2})/);
    els.paymentValue.textContent = paymentMatch ? `$ ${paymentMatch[1]}` : "$ —";

    // Total a Pagar (Busca cerca de "TOTAL A PAGAR")
    const totalMatch = raw.match(/TOTAL\s+A\s+PAGAR\s+\$?([\d,]+\.\d{2})/);
    els.totalValue.textContent = totalMatch ? `$ ${totalMatch[1]}` : "$ —";

    els.methodValue.textContent = "OCR (Alta Precisión)";
}

function updateStatus(msg, type) {
    els.statusText.textContent = msg;
    els.progressFill.style.width = type === "good" ? "100%" : "60%";
}

els.analyzeBtn.addEventListener("click", () => processPdf(false));
els.ocrBtn.addEventListener("click", () => processPdf(true));
els.clearBtn.addEventListener("click", () => location.reload());
