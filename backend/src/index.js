const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3300;
const axios = require('axios');

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/skins', express.static('skins'));
app.use('/libs', express.static('libs'));

app.post('/upload', upload.single('skinFile'), (req, res) => {
    console.log("Received upload request");
    if (!req.file) {
        console.log("Upload request failed")
        return res.status(400).json({ error: 'No file uploaded' });
    }

    //image validation

    res.json({ success: true, filename: req.file.filename });
});

app.post('/generate', async (req, res) => {
    console.log("Received generation request...");
    const { skinName, overlayName } = req.body;
    console.log("Received generation request with overlay: " + overlayName);

    const skinImage = await loadImage(`skins/${skinName}`);
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


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