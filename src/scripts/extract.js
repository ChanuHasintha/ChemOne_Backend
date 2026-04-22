import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const extractPDF = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);

  return data.text;
};

const text = await extractPDF("./pdfs/Unit 1,2,3.pdf"); 
console.log(text.slice(0, 1000));