import fs from "fs";
import { PDFParse } from "pdf-parse";

const extractPDF = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
};

const text = await extractPDF("./pdfs/Unit 1,2,3.pdf"); 
console.log(text.slice(0, 1000));