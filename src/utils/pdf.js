import fs from "fs";
import { PDFParse } from "pdf-parse";

export const extractPDF = async (filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    throw error;
  }
};