import { PDFParse } from "pdf-parse";
import fs from "fs";

async function test() {
  try {
    const buffer = fs.readFileSync("pdfs/Unit 1,2,3.pdf");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    console.log("Success! Text length:", result.text.length);
    await parser.destroy();
  } catch (err) {
    console.error("Error:", err.stack || err.message);
  }
}
test();
