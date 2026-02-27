pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const input = document.getElementById("pdfInput");
const btn = document.getElementById("analyzeBtn");

const totalValue = document.getElementById("totalValue");
const kwhValue = document.getElementById("kwhValue");
const currReadValue = document.getElementById("currReadValue");
const prevReadValue = document.getElementById("prevReadValue");
const periodValue = document.getElementById("periodValue");
const tariffValue = document.getElementById("tariffValue");
const debug = document.getElementById("debug");

btn.addEventListener("click", async () => {

if (!input.files.length) {
alert("Selecciona un PDF");
return;
}

try {

const file = input.files[0];
const buffer = await file.arrayBuffer();

const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
const page = await pdf.getPage(1);
const textContent = await page.getTextContent();

const text = textContent.items.map(i => i.str).join(" ").toUpperCase();

debug.textContent = text; // para ver si sí está leyendo

extractData(text);

} catch (error) {
alert("Error leyendo PDF");
console.error(error);
}

});

function extractData(text) {

const total = text.match(/TOTAL A PAGAR\s*\$?\s*(\d+\.?\d*)/);
totalValue.textContent = total ? total[1] : "No detectado";

const periodo = text.match(/PERIODO FACTURADO\s*(\d{2}\s[A-Z]{3}\s\d{2})\s*(AL|A)\s*(\d{2}\s[A-Z]{3}\s\d{2})/);
periodValue.textContent = periodo ? `${periodo[1]} - ${periodo[3]}` : "No detectado";

const tarifa = text.match(/TARIFA\s*0?([0-9A-Z]+)/);
tariffValue.textContent = tarifa ? tarifa[1] : "No detectado";

const energia = text.match(/ENERG[IÍ]A\s*\(KWH\)\s*(\d+)\s*(\d+)\s*(\d+)/);

if (energia) {
currReadValue.textContent = energia[1];
prevReadValue.textContent = energia[2];
kwhValue.textContent = energia[3];
}

}


