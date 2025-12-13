import 'dotenv/config';
import express from 'express';
import * as Minio from 'minio';
import multer from 'multer';
import crypto from 'crypto';

// --- In-memory "Database" for file metadata ---
const filesDb = [];

const app = express();
const port = process.env.PORT || 3000;

// 1. Initialize MinIO Client
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
});

// Configure Multer (Store files in memory temporarily)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME;

// 2. Ensure Bucket Exists on Startup
const initBucket = async () => {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (exists) {
            console.log(`Bucket '${BUCKET_NAME}' already exists.`);
        } else {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            console.log(`Bucket '${BUCKET_NAME}' created successfully.`);
        }
    } catch (err) {
        console.error('Error creating bucket:', err);
    }
};

const initFilesDb = () => {
    const stream = minioClient.listObjects(BUCKET_NAME, '', true);

    stream.on('data', (obj) => {
        filesDb.push({
            id: filesDb.length + 1,
            originalName: obj.name,
            objectKey: obj.name, // Using filename as key since original UUID is lost on restart
            mimeType: 'application/octet-stream', // List objects doesn't return mimetype
            size: obj.size,
            uploadedAt: obj.lastModified
        });
    });

    stream.on('error', (err) => console.error('Error syncing files from MinIO:', err));
};

initFilesDb();

initBucket();


// --- ROUTES ---

// 3. Upload File
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const metaData = {
            'Content-Type': req.file.mimetype,
            'Original-Name': req.file.originalname
        };

        const objectKey = crypto.randomUUID();

        // minioClient.putObject(bucketName, objectName, stream, size, metaData)
        await minioClient.putObject(
            BUCKET_NAME,
            objectKey, // Using original name as object key (simple example)
            req.file.buffer,
            req.file.size,
            metaData
        );

        // Save metadata to "database"
        const fileRecord = {
            id: filesDb.length + 1,
            originalName: req.file.originalname,
            objectKey: objectKey,
            mimeType: req.file.mimetype,
            size: req.file.size,
            uploadedAt: new Date().toISOString()
        };
        filesDb.push(fileRecord);

        res.json({ message: `File '${req.file.originalname}' uploaded successfully.`, file: fileRecord });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading file');
    }
});

// 4. List files from "Database"
app.get('/files/db', (req, res) => {
    res.json(filesDb);
});

// 5. Generate Presigned URL (for viewing/downloading)
app.get('/file/:name', async (req, res) => {
    try {
        // Generate a temporary URL valid for 24 hours
        const url = await minioClient.presignedGetObject(BUCKET_NAME, req.params.name, 24 * 60 * 60);
        res.redirect(url); // Or return { url: url }
    } catch (err) {
        res.status(500).send('Error generating URL');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
