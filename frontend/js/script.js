import * as skinview3d from "skinview3d";
const container = document.getElementById('skin-viewer');
const downloadButton = document.getElementById('download');
const inputField = document.getElementById('username');
downloadButton.disabled = true;
let skinURL = "";
let selectedSkinURL = "";
const paintEntries = document.querySelectorAll('.paint-type.card .paint-entry');
const fileInput = document.querySelector('input[type="file"]');
let timeoutId = null;

const skinViewer = new skinview3d.SkinViewer({
    canvas: container,
    width: 300,
    height: 500,
    skin: "http://textures.minecraft.net/texture/4d97a0121e6e095fdd11e2e5b12a69ca283b8717ba47c56a4add963bbe1bbb5",
    enableControls: true
});

skinViewer.zoom = 0.7;
skinViewer.controls.enableZoom = false
skinViewer.autoRotate = true;
skinViewer.animation = new skinview3d.RunningAnimation();
skinViewer.animation.speed = 0.1;

inputField.addEventListener('input', (event) => {
    clearTimeout(timeoutId);

    const inputValue = event.target.value;

    if (inputValue.length > 16) {
        showNotification("Username is too long!");
        event.target.value = inputValue.slice(0, 16);
        return;
    }

    if (/[^a-zA-Z0-9]/.test(inputValue)) {
        event.target.value = inputValue.replace(/[^a-zA-Z0-9]/g, '');
        showNotification("Only letters and numbers are allowed!");
        return;
    }

    timeoutId = setTimeout(() => {

        if(!inputValue) {
            showNotification("Empty input!");
            return;
        }

        if (inputValue.length <= 2) {
            showNotification("Username is too short!");
            event.target.value = inputValue.slice(0, 16);
            return;
        }

        const url = "https://mineskin.eu/skin/" + inputValue;
        clearFileInput(fileInput);
        selectedSkinURL = url;
        skinViewer.loadSkin(url);
        downloadButton.disabled = true;
        skinURL = "";
    }, 1000);

});


fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/png')) {
            showNotification("Selected file is not a PNG.", false);
            clearFileInput(event.target);
            return;
        }

        if (file.size > 100 * 1024) {
            showNotification("Selected file size exceeds the 100kb limit.", false);
            clearFileInput(event.target);
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const skinDataUrl = e.target.result;
            skinViewer.loadSkin(skinDataUrl);
            downloadButton.disabled = true;
            inputField.value = '';
            skinURL = "";
            selectedSkinURL = "";
        };
        reader.readAsDataURL(file);
    } else {

    }
});

function clearFileInput(input) {
    input.value = '';
}

paintEntries.forEach(paintEntry => {
    paintEntry.addEventListener('click', async () => {
        console.log("Converting skin " + paintEntry.id);

        if ((!selectedSkinURL || selectedSkinURL === "") && (!fileInput.files || !fileInput.files.length)) {
            showNotification("Please upload a skin or type your name in first", false);
            return;
        }

        let formData = new FormData();
        let file;

        if (selectedSkinURL && selectedSkinURL !== "") {
            file = await urlToFile(selectedSkinURL);
        } else if (fileInput.files && fileInput.files.length) {
            file = fileInput.files[0];
        } else {
            showNotification("Please upload a skin or type your name in first", false);
            return;
        }

        formData.append('skinFile', file);
        fetch('https://toilet-api.botpanel.de/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.success) {
                    const skinName = data.filename;

                    fetch('https://toilet-api.botpanel.de/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            skinName: skinName,
                            overlayName: paintEntry.id
                        })
                    })
                        .then(response => response.json())
                        .then(data => {
                            console.log(data);
                            if (data.success) {
                                skinURL = data.url;
                                skinViewer.loadSkin(skinURL);
                                downloadButton.disabled = false;
                                showNotification("Skin with overlay " + paintEntry.id + " was generated!", true);

                                paintEntries.forEach(p => {
                                    p.classList.remove("selected");
                                });

                                paintEntry.classList.add("selected");
                            } else {
                                showNotification("Could not generate your skin!", false);
                            }
                        })
                        .catch(error => {
                            console.error(error);
                            showNotification("Could not generate your skin!", false);
                        });
                } else {
                    showNotification("Could not upload your skin!", false);
                }
            })
            .catch(error => {
                console.error(error);
                showNotification("Could not upload your skin!", false);
            });
    });
});

downloadButton.addEventListener('click', function() {
    if (skinURL && skinURL !== "") {
        downloadImage(skinURL);
    } else {
        showNotification("Could not find requested Skin! Generate a new one.", false);
    }
});

async function downloadImage(imageSrc) {
    const image = await fetch(imageSrc)
    const imageBlog = await image.blob()
    const imageURL = URL.createObjectURL(imageBlog)

    const link = document.createElement('a')
    link.href = imageURL
    link.download = 'Overlay-Skin-' + Date.now();
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

function showNotification(message, isSuccess) {
    const notificationContainer = document.getElementById('notification-container');
    const notificationWrapper = document.createElement('div');
    notificationWrapper.classList.add('notification-wrapper');

    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;

    if (isSuccess) {
        notification.classList.add('success');
    } else {
        notification.classList.add('error');
    }

    notificationWrapper.appendChild(notification);
    notificationContainer.appendChild(notificationWrapper);

    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'scale(1, 1)';
    }, 100);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'scale(0, 0)';
        setTimeout(() => {
            notificationWrapper.remove();
        }, 500);
    }, 3000);
}

async function urlToFile(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                resolve(new File([blob], 'image.png', { type: 'image/png' }));
            }, 'image/png');
        };
        img.onerror = reject;
        img.src = url;
    });
}

