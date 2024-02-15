const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3300;
const axios = require('axios');
const server = http.createServer(app);


const configFile = fs.readFileSync('config.json', 'utf8');
const config = JSON.parse(configFile);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'skins');
    },
    filename: function (req, file, cb) {
        const randomCode = Math.random().toString(36).substring(7);
        const originalName = file.originalname;

        const renamedFile = `${randomCode}_${originalName}`;
        cb(null, renamedFile);
    }
});

const upload = multer({ storage: storage });
app.use(cors());
app.use(bodyParser.urlencoded({ limit: '100kb', extended: true }));
app.use(bodyParser.json({ limit: '100kb' }));
app.use('/skins', express.static('skins'));
app.use('/overlays', express.static('overlays'));

const io = socketIO(server, {
    cors: {
        origin: "https://skins.nextfight.net",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"]
    }
});

let viewerCount = 0;

io.on('connection', (socket) => {
    viewerCount++;
    io.emit('viewerCount', viewerCount);

    socket.on('disconnect', () => {
        viewerCount--;
        io.emit('viewerCount', viewerCount);
    });
});

app.post('/upload', upload.single('skinFile'), (req, res) => {
    console.log("Received upload request");
    if (!req.file) {
        console.log("Upload request failed")
        return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.file.mimetype.startsWith('image/png')) {
        console.log("Upload request failed: File is not a PNG");
        fs.unlink(req.file.path, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
            } else {
                console.log('File deleted successfully.');
            }
        });
        return res.status(400).json({ error: 'Uploaded file must be a PNG image' });
    }

    if (req.file.size > 100 * 1024) {
        console.log("Upload request failed: File size exceeds 100kb limit");
        fs.unlink(req.file.path, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
            } else {
                console.log('File deleted successfully.');
            }
        });
        return res.status(400).json({ error: 'Uploaded file size exceeds the limit of 100kb' });
    }

    res.json({ success: true, filename: req.file.filename });
});

app.post('/generate', async (req, res) => {
    console.log("Received generation request...");
    const { skinName, overlayName, filter } = req.body;
    console.log("Received generation request with overlay: " + overlayName);

    let skinImage = await loadImage(`skins/${skinName}`);

    switch (filter) {
        case 'black_and_white':
            skinImage = applyBlackAndWhiteFilter(skinImage);
            break;
        case 'saturated':
            skinImage = applyMoreSaturatedFilter(skinImage);
            break;
        default:
            break;
    }

    const overlayImage = await loadImage(`overlays/${overlayName}.png`);

    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(skinImage, 0, 0, 64, 64);
    ctx.drawImage(overlayImage, 0, 0, 64, 64);

    const fileName = `skins/${skinName}`;
    const out = fs.createWriteStream(fileName);
    const stream = canvas.createPNGStream();

    stream.pipe(out);
    out.on('finish', () => {
        res.json({ success: true, url: `https://toilet-api.botpanel.de/${fileName}` });
        sendWebhook(config.webhookURL, "Someone generated a skin!", `https://toilet-api.botpanel.de/${fileName}`);
        setTimeout(() => {
            fs.unlink(fileName, (err) => {
                if (err) {
                    console.error(`Error deleting file ${fileName}: ${err}`);
                } else {
                    console.log(`File ${fileName} deleted successfully.`);
                }
            });
        }, 60000);
    });
});

function applyBlackAndWhiteFilter(image) {
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = brightness;
        data[i + 1] = brightness;
        data[i + 2] = brightness;
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas;
}

function applyMoreSaturatedFilter(image) {

    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {

        data[i + 1] = Math.min(data[i + 1] * 1.5, 255);
        data[i + 2] = Math.min(data[i + 2] * 1.5, 255);
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas;
}


async function sendWebhook(webhookUrl, title, url) {
    try {
        const embed = {
            title: title,
            "thumbnail": {
                "url": url
            },
            description: "URL:\n```"+url+"```",
            color: 0x00B507
        };

        const payload = {
            embeds: [embed]
        };

        const response = await axios.post(webhookUrl, payload);
        console.log('Webhook sent successfully:', response.status, response.statusText);
    } catch (error) {
        console.error('Error sending webhook:', error.message);
    }
}

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});