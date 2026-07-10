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

    const optionCards = document.querySelectorAll('.option-card');
    const faqQuestions = document.querySelectorAll('.faq-question');

    // Resize UI Elements
    const resizeRadios = document.querySelectorAll('input[name="resize-mode"]');
    const pixelsInputs = document.getElementById('resize-pixels-inputs');
    const percentInputs = document.getElementById('resize-percent-inputs');
    const percentSlider = document.getElementById('resize-percent-slider');
    const percentDisplay = document.getElementById('resize-percent-display');
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');

    let currentFile = null;
    let originalImageObj = new Image();

    // Handle Option Cards
    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            optionCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // Handle Resize UI
    resizeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            pixelsInputs.classList.add('hidden');
            percentInputs.classList.add('hidden');
            
            if (mode === 'pixels') {
                pixelsInputs.classList.remove('hidden');
            } else if (mode === 'percent') {
                percentInputs.classList.remove('hidden');
            }
        });
    });

    percentSlider.addEventListener('input', (e) => {
        percentDisplay.textContent = `${e.target.value}%`;
    });

    // Handle FAQs
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });

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

    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            alert('Please select a valid image or PDF file.');
            return;
        }

        currentFile = file;
        
        // Display Original Image and prefill resolution
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            
            // Set image to get native resolution
            originalImageObj.src = e.target.result;
            originalImageObj.onload = () => {
                widthInput.value = originalImageObj.width;
                heightInput.value = originalImageObj.height;
            };

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

        const checkedRadio = document.querySelector('input[name="conversion-type"]:checked');
        const conversionType = checkedRadio ? checkedRadio.value : 'to-jpg';
        
        const resizeMode = document.querySelector('input[name="resize-mode"]:checked').value;

        convertBtn.disabled = true;
        loader.classList.remove('hidden');
        
        // Add 3D Flip animation to original image while processing
        originalImage.classList.add('is-processing');

        try {
            const buffer = await currentFile.arrayBuffer();

            const headers = {
                'Content-Type': 'application/octet-stream',
                'X-Conversion-Type': conversionType,
                'X-Resize-Mode': resizeMode
            };

            if (resizeMode === 'pixels') {
                headers['X-Resize-Width'] = widthInput.value;
                headers['X-Resize-Height'] = heightInput.value;
            } else if (resizeMode === 'percent') {
                headers['X-Resize-Percent'] = percentSlider.value;
            }

            const response = await fetch('/api/process-image', {
                method: 'POST',
                headers: headers,
                body: buffer
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const resultBlob = await response.blob();
            const objectUrl = URL.createObjectURL(resultBlob);
            
            convertedImage.src = objectUrl;
            
            let ext = "jpg";
            if (conversionType === "to-png") ext = "png";
            else if (conversionType === "to-pdf") ext = "pdf";
            else if (conversionType === "to-webp") ext = "webp";
            
            downloadLink.href = objectUrl;
            downloadLink.download = `converted.${ext}`;
            
            resultContainer.classList.remove('hidden');
            
            // Allow 3D animation to finish a cycle smoothly before stopping
            setTimeout(() => {
                originalImage.classList.remove('is-processing');
                resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 500);
            
        } catch (error) {
            console.error('Error during image conversion:', error);
            alert('An error occurred while converting the image. Please try again.');
            originalImage.classList.remove('is-processing');
        } finally {
            convertBtn.disabled = false;
            loader.classList.add('hidden');
        }
    });
});
