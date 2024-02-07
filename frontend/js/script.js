
const downloadButton = document.getElementById('download');
downloadButton.disabled = true;
let skinURL = null;

const paintEntries = document.querySelectorAll('.paint-type.card .paint-entry');

paintEntries.forEach(paintEntry => {
    paintEntry.addEventListener('click', () => {

        console.log("Converting skin " + paintEntry.id);

        const fileInput = document.querySelector('input[type="file"]');
        const skinType = document.getElementById('skin-type').value;
        if (!fileInput.files || !fileInput.files.length) {
            showNotification("Please upload a skin first!", false);
            return;
        }
        const formData = new FormData();
        formData.append('skinFile', fileInput.files[0]);
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
                                downloadButton.disabled = false;
                                showNotification("Skin with overlay " + paintEntry.id + " was generated!", true);
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
    if (skinURL || downloadButton.disabled) {
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


