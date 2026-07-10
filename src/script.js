document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Vanta Background
    try {
        VANTA.NET({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0x60a5fa,
            backgroundColor: 0x0f172a,
            points: 12.00,
            maxDistance: 22.00,
            spacing: 16.00
        });
    } catch (e) {
        console.log("Vanta JS failed to load, falling back to CSS background", e);
    }

    // 2. Custom Cursor Logic
    const cursor = document.getElementById('custom-cursor');
    const follower = document.getElementById('cursor-follower');
    
    if (window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
            follower.style.left = e.clientX + 'px';
            follower.style.top = e.clientY + 'px';
        });

        const hoverables = document.querySelectorAll('.hoverable, button, a, input, label, select');
        hoverables.forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
        });
    } else {
        cursor.style.display = 'none';
        follower.style.display = 'none';
    }

    // Existing Elements
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

    // Resize UI
    const resizeRadios = document.querySelectorAll('input[name="resize-mode"]');
    const pixelsInputs = document.getElementById('resize-pixels-inputs');
    const percentInputs = document.getElementById('resize-percent-inputs');
    const percentSlider = document.getElementById('resize-percent-slider');
    const percentDisplay = document.getElementById('resize-percent-display');
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');

    // Slider UI
    const sliderContainer = document.getElementById('slider-container');
    const sliderBefore = document.getElementById('slider-before');
    const sliderAfter = document.getElementById('slider-after');
    const sliderHandle = document.getElementById('slider-handle');
    
    // Stats UI
    const statsPanel = document.getElementById('stats-panel');
    const statOriginal = document.getElementById('stat-original');
    const statConverted = document.getElementById('stat-converted');
    const statSavingsBox = document.getElementById('stat-savings-box');
    const statSavings = document.getElementById('stat-savings');

    let currentFile = null;
    let originalImageObj = new Image();
    let originalFileSize = 0;

    // Helper: Format Bytes
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

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
            if (mode === 'pixels') pixelsInputs.classList.remove('hidden');
            else if (mode === 'percent') percentInputs.classList.remove('hidden');
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
        originalFileSize = file.size;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            sliderBefore.src = e.target.result;
            
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

    // Interactive Slider Logic
    let isSliderDragging = false;
    
    function moveSlider(clientX) {
        const rect = sliderContainer.getBoundingClientRect();
        let x = clientX - rect.left;
        if (x < 0) x = 0;
        if (x > rect.width) x = rect.width;
        
        const percent = (x / rect.width) * 100;
        sliderAfter.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
        sliderHandle.style.left = `${percent}%`;
    }

    sliderContainer.addEventListener('mousedown', (e) => {
        isSliderDragging = true;
        moveSlider(e.clientX);
    });
    window.addEventListener('mousemove', (e) => {
        if (isSliderDragging) moveSlider(e.clientX);
    });
    window.addEventListener('mouseup', () => {
        isSliderDragging = false;
    });
    // Touch support for slider
    sliderContainer.addEventListener('touchstart', (e) => {
        isSliderDragging = true;
        moveSlider(e.touches[0].clientX);
    });
    window.addEventListener('touchmove', (e) => {
        if (isSliderDragging) {
            e.preventDefault(); 
            moveSlider(e.touches[0].clientX);
        }
    }, { passive: false });
    window.addEventListener('touchend', () => {
        isSliderDragging = false;
    });

    // Handle API Call
    convertBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        const checkedRadio = document.querySelector('input[name="conversion-type"]:checked');
        const conversionType = checkedRadio ? checkedRadio.value : 'to-jpg';
        const resizeMode = document.querySelector('input[name="resize-mode"]:checked').value;

        convertBtn.disabled = true;
        loader.classList.remove('hidden');
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
            const newFileSize = resultBlob.size;
            const objectUrl = URL.createObjectURL(resultBlob);
            
            // Setup File Stats
            statOriginal.textContent = formatBytes(originalFileSize);
            statConverted.textContent = formatBytes(newFileSize);
            
            if (newFileSize < originalFileSize) {
                const savings = Math.round(((originalFileSize - newFileSize) / originalFileSize) * 100);
                statSavings.textContent = `${savings}% 🎉`;
                statSavingsBox.classList.remove('hidden');
            } else {
                statSavingsBox.classList.add('hidden');
            }
            statsPanel.classList.remove('hidden');

            let ext = "jpg";
            if (conversionType === "to-png") ext = "png";
            else if (conversionType === "to-pdf") ext = "pdf";
            else if (conversionType === "to-webp") ext = "webp";
            
            downloadLink.href = objectUrl;
            downloadLink.download = `converted.${ext}`;
            
            // Setup Slider or Single Image
            if (currentFile.type === 'application/pdf' || conversionType === 'to-pdf') {
                sliderContainer.classList.add('hidden');
                convertedImage.src = objectUrl;
                convertedImage.classList.remove('hidden');
            } else {
                convertedImage.classList.add('hidden');
                sliderContainer.classList.remove('hidden');
                sliderAfter.src = objectUrl;
                
                // Reset slider position to 50%
                sliderAfter.style.clipPath = `polygon(0 0, 50% 0, 50% 100%, 0 100%)`;
                sliderHandle.style.left = `50%`;
            }
            
            resultContainer.classList.remove('hidden');
            
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
