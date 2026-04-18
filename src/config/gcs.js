import { Storage } from '@google-cloud/storage';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // This is g:\ChemOne\backend\src\config

// Resolve absolute path to the serviceAccountKey.json in the backend root
const keyFilePath = path.join(__dirname, '../../serviceAccountKey.json');

const storage = new Storage({
  keyFilename: keyFilePath,
  projectId: process.env.GCS_PROJECT_ID,
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

export default bucket;
