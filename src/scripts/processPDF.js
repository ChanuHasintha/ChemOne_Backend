import { extractPDF } from "../utils/pdf.js";
import { chunkText } from "../utils/chunkText.js";
import { createEmbedding } from "../utils/embedding.js";
import { index } from "../utils/pinecone.js";

const storeChunks = async (chunks, source) => {
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await createEmbedding(chunks[i]);

    await index.upsert([
      {
        id: `${source}-${i}`,
        values: embedding,
        metadata: {
          text: chunks[i],
          source,
        },
      },
    ]);

    console.log(`Stored chunk ${i + 1}/${chunks.length}`);
  }
};

const run = async () => {
  console.log("Extracting PDF...");
  const text = await extractPDF("./pdfs/Unit 1,2,3.pdf");
  console.log(`Extracted ${text.length} characters`);

  const chunks = chunkText(text);
  console.log(`Created ${chunks.length} chunks`);

  await storeChunks(chunks, "unit123");

  console.log("Done storing PDF embeddings 🚀");
};

run();