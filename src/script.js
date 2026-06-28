document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    
    const previewSection = document.getElementById('preview-section');
    const originalImage = document.getElementById('original-image');
    
    const convertBtn = document.getElementById('convert-btn');
    const loader = document.getElementById('loader');
    
    const resultContainer = document.getElementById('result-container');
    const convertedImage = document.getElementById('converted-image');
    const downloadLink = document.getElementById('download-link');

    let currentFile = null;

    // Handle Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Handle Click to Browse
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        currentFile = file;
        
        // Display Original Image
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            dropZone.classList.add('hidden');
            previewSection.classList.remove('hidden');
            resultContainer.classList.add('hidden');
            convertBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    // Handle API Call
    convertBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        convertBtn.disabled = true;
        loader.classList.remove('hidden');

        try {
            // Read file as ArrayBuffer for binary transfer
            const buffer = await currentFile.arrayBuffer();

            const response = await fetch('/api/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream'
                },
                body: buffer
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            // Get response as Blob
            const resultBlob = await response.blob();
            
            // Create URL for preview and download
            const objectUrl = URL.createObjectURL(resultBlob);
            convertedImage.src = objectUrl;
            downloadLink.href = objectUrl;
            
            resultContainer.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error during image conversion:', error);
            alert('An error occurred while converting the image. Please try again.');
            convertBtn.disabled = false;
        } finally {
            loader.classList.add('hidden');
        }
    });
});
