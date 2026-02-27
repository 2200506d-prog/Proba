const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const els = {
pdfInput: document.getElementById("pdfInput"),
analyzeBtn: document.getElementById("analyzeBtn"),
canvas: document.getElementById("pdfCanvas"),
totalValue: document.getElementById("totalValue"),
kwhValue: document.getElementById("kwhValue"),
currReadValue: document.getElementById("currReadValue"),
prevReadValue: document.getElementById("prevReadValue"),
periodValue: document.getElementById("periodValue"),
tariffValue: document.getElementById("tariffValue"),
};

let chartInstance=null;

els.analyzeBtn.addEventListener("click", async ()=>{

const file=els.pdfInput.files[0];
const buffer=await file.arrayBuffer();
const pdf=await pdfjsLib.getDocument({data:buffer}).promise;
const page=await pdf.getPage(1);

const viewport=page.getViewport({scale:3});
const ctx=els.canvas.getContext("2d");

els.canvas.width=viewport.width;
els.canvas.height=viewport.height;

await page.render({canvasContext:ctx,viewport}).promise;

const result=await Tesseract.recognize(els.canvas,'spa',{
tessedit_char_whitelist:'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.$() '
});

extractData(result.data.text.toUpperCase());
});

function extractData(text){

const clean=text.replace(/\s+/g,' ');

const total=clean.match(/TOTAL A PAGAR\s*\$?\s*(\d+\.?\d*)/);
els.totalValue.textContent=total?total[1]:"No detectado";

const periodo=clean.match(/PERIODO FACTURADO\s*(\d{2}\s[A-Z]{3}\s\d{2})\s*(AL|A)\s*(\d{2}\s[A-Z]{3}\s\d{2})/);
els.periodValue.textContent=periodo?`${periodo[1]} - ${periodo[3]}`:"No detectado";

const tarifa=clean.match(/TARIFA\s*0?([0-9A-Z]+)/);
els.tariffValue.textContent=tarifa?tarifa[1]:"No detectado";

const energia=clean.match(/ENERG[IÍ]A\s*\(KWH\).*?(\d{3,5})\s+(\d{3,5})\s+(\d{1,4})/);

if(energia){
els.currReadValue.textContent=energia[1];
els.prevReadValue.textContent=energia[2];
els.kwhValue.textContent=energia[3];
}

const history=clean.match(/\b\d{2,4}\b/g)
.map(n=>parseInt(n))
.filter(n=>n<2000&&n>10)
.slice(0,6);

drawChart(history.reverse());
}

function drawChart(data){
if(chartInstance)chartInstance.destroy();
chartInstance=new Chart(document.getElementById("historyChart"),{
type:'bar',
data:{
labels:data.map((_,i)=>`P${i+1}`),
datasets:[{label:'Consumo kWh',data:data}]
}
});
}
