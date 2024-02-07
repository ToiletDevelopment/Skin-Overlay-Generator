const uploadButton = document.getElementById('generate-1');
const downloadButton = document.getElementById('download');
downloadButton.disabled = true;
let skinURL;


downloadButton.addEventListener('click', function() {
    if (skinURL) {
        downloadImage(skinURL);
    } else {
        alert('No skin available for download.');
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


uploadButton.addEventListener('click', function() {
    const fileInput = document.querySelector('input[type="file"]');
    const skinType = document.getElementById('skin-type').value;

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
                        overlayName: 'maximde'
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log(data);
                        if (data.success) {
                            skinURL = data.url;
                            downloadButton.disabled = false;
                        } else {
                            alert('Error generating skin. Please try again.');
                        }
                    })
                    .catch(error => {
                        console.error(error);
                        alert('Error generating skin. Please try again.');
                    });
            } else {
                alert('Error uploading skin. Please try again.');
            }
        })
        .catch(error => {
            console.error(error);
            alert('Error uploading skin. Please try again.');
        });
});