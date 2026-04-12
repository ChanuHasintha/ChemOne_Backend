import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'worksheets',
        allowed_formats: ['pdf'],
        resource_type: 'raw',
        access_mode: "public",
        public_id: (req, file) => {
            // Strip file extension to avoid double extensions (e.g. file.pdf.pdf)
            const nameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "");
            return Date.now() + "-" + nameWithoutExt.replace(/\s/g, "");
        },
    },
});

export const upload = multer({ storage });
