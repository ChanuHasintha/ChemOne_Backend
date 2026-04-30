import { Storage } from '@google-cloud/storage';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // This is g:\ChemOne\backend\src\config

// Resolve absolute path to the serviceAccountKey.json in the backend root
const keyFilePath = path.join(__dirname, '../../serviceAccountKey.json');

const storage = new Storage({
  credentials: process.env.GCS_CREDENTIALS ? JSON.parse(process.env.GCS_CREDENTIALS) : undefined,
  keyFilename: process.env.GCS_CREDENTIALS ? undefined : keyFilePath,
  projectId: process.env.GCS_PROJECT_ID,
});

if (!process.env.GCS_BUCKET_NAME) {
  console.error("❌ ERROR: GCS_BUCKET_NAME is not defined in environment variables.");
}

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || 'placeholder-bucket');

export default bucket;
