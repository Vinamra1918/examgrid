const XLSX = require('xlsx');
const workbook = XLSX.readFile('aaaaaaaaaaaaaaa.xlsx');
const sheetName = workbook.SheetNames[0];
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
console.log(JSON.stringify(data.slice(0, 10), null, 2));
