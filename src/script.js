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

        const bindHoverables = () => {
            const hoverables = document.querySelectorAll('.hoverable, button, a, input, label, select');
            hoverables.forEach(el => {
                if (!el.dataset.hoverBound) {
                    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
                    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
                    el.dataset.hoverBound = 'true';
                }
            });
        };
        bindHoverables();
        // re-bind periodically in case elements are added
        setInterval(bindHoverables, 1000);
    } else {
        cursor.style.display = 'none';
        follower.style.display = 'none';
    }

    // Existing Elements
    const dropZone = document.getElementById('drop-zone');
    const stripExifToggle = document.getElementById('strip-exif-toggle');
    const metadataContent = document.getElementById('metadata-content');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const previewSection = document.getElementById('preview-section');
    const originalImage = document.getElementById('original-image');
    const convertBtn = document.getElementById('convert-btn');
    const convertBtnText = document.getElementById('convert-btn-text');
    const loader = document.getElementById('loader');
    const resultContainer = document.getElementById('result-container');
    const convertedImage = document.getElementById('converted-image');
    const downloadLink = document.getElementById('download-link');
    const optionCards = document.querySelectorAll('.option-card');
    const faqQuestions = document.querySelectorAll('.faq-question');

    // Batch UI Elements
    const singlePreview = document.getElementById('single-preview');
    const batchPreview = document.getElementById('batch-preview');
    const batchCount = document.getElementById('batch-count');
    const batchGrid = document.getElementById('batch-grid');
    const batchResult = document.getElementById('batch-result');
    const sliderContainer = document.getElementById('slider-container');
    const statsPanel = document.getElementById('stats-panel');

    // Resize UI
    const resizeRadios = document.querySelectorAll('input[name="resize-mode"]');
    const pixelsInputs = document.getElementById('resize-pixels-inputs');
    const percentInputs = document.getElementById('resize-percent-inputs');
    const percentSlider = document.getElementById('resize-percent-slider');
    const percentDisplay = document.getElementById('resize-percent-display');
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');

    // Slider UI
    const sliderBefore = document.getElementById('slider-before');
    const sliderAfter = document.getElementById('slider-after');
    const sliderHandle = document.getElementById('slider-handle');
    
    // Stats UI
    const statOriginal = document.getElementById('stat-original');
    const statConverted = document.getElementById('stat-converted');
    const statSavingsBox = document.getElementById('stat-savings-box');
    const statSavings = document.getElementById('stat-savings');

    // App State
    let currentFiles = [];
    let isBatchMode = false;
    let originalImageObj = new Image();

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
            handleFiles(Array.from(e.dataTransfer.files));
        }
    });

    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    });

    function handleFiles(files) {
        // Filter valid files
        const validFiles = files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
        if (validFiles.length === 0) {
            alert('Please select valid image or PDF files.');
            return;
        }

        currentFiles = validFiles;
        isBatchMode = currentFiles.length > 1;

        dropZone.classList.add('hidden');
        previewSection.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        convertBtn.disabled = false;
        batchResult.classList.add('hidden');

        if (isBatchMode) {
            // Setup Batch Mode
            singlePreview.classList.add('hidden');
            batchPreview.classList.remove('hidden');
            batchCount.textContent = currentFiles.length;
            convertBtnText.textContent = `Convert All (${currentFiles.length})`;
            
            // Render grid
            batchGrid.innerHTML = '';
            currentFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    batchGrid.innerHTML += `
                        <div class="batch-item" id="batch-item-${index}" title="${file.name}">
                            <img src="${e.target.result}" alt="Preview">
                            <div class="status-icon" id="batch-status-${index}">⏳</div>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            });
            
        } else {
            // Setup Single Mode
            batchPreview.classList.add('hidden');
            singlePreview.classList.remove('hidden');
            convertBtnText.textContent = `Convert Now`;
            
            const file = currentFiles[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                originalImage.src = e.target.result;
                sliderBefore.src = e.target.result;
                
                originalImageObj.src = e.target.result;
                originalImageObj.onload = () => {
                    widthInput.value = originalImageObj.width;
                    heightInput.value = originalImageObj.height;
                };

                // Extract EXIF
                if (file.type.startsWith('image/') && typeof EXIF !== 'undefined') {
                    EXIF.getData(file, function() {
                        const allTags = EXIF.getAllTags(this);
                        metadataContent.innerHTML = ''; 
                        
                        const usefulKeys = ['Make', 'Model', 'DateTime', 'GPSLatitude', 'GPSLongitude', 'Software', 'ExifVersion'];
                        let foundAny = false;
                        
                        for (const key of usefulKeys) {
                            if (allTags[key]) {
                                foundAny = true;
                                let val = allTags[key];
                                if (val.length > 30) val = val.substring(0, 30) + '...';
                                
                                const tagEl = document.createElement('div');
                                tagEl.className = 'metadata-tag';
                                tagEl.innerHTML = `<strong>${key}:</strong> ${val}`;
                                metadataContent.appendChild(tagEl);
                            }
                        }
                        
                        if (!foundAny) {
                            metadataContent.innerHTML = '<span class="text-muted">No hidden EXIF data found.</span>';
                        }
                    });
                } else {
                    metadataContent.innerHTML = '<span class="text-muted">Metadata extraction not supported for this file type.</span>';
                }
            };
            reader.readAsDataURL(file);
        }
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
        if (currentFiles.length === 0) return;

        const checkedRadio = document.querySelector('input[name="conversion-type"]:checked');
        const conversionType = checkedRadio ? checkedRadio.value : 'to-jpg';
        const resizeMode = document.querySelector('input[name="resize-mode"]:checked').value;
        const keepExif = !stripExifToggle.checked;

        convertBtn.disabled = true;
        loader.classList.remove('hidden');
        if (!isBatchMode) originalImage.classList.add('is-processing');

        let ext = "jpg";
        if (conversionType === "to-png") ext = "png";
        else if (conversionType === "to-pdf") ext = "pdf";
        else if (conversionType === "to-webp") ext = "webp";

        const headers = {
            'Content-Type': 'application/octet-stream',
            'X-Conversion-Type': conversionType,
            'X-Resize-Mode': resizeMode,
            'X-Keep-Exif': keepExif.toString()
        };

        if (resizeMode === 'pixels') {
            headers['X-Resize-Width'] = widthInput.value;
            headers['X-Resize-Height'] = heightInput.value;
        } else if (resizeMode === 'percent') {
            headers['X-Resize-Percent'] = percentSlider.value;
        }

        try {
            if (!isBatchMode) {
                // SINGLE FILE MODE
                const file = currentFiles[0];
                const buffer = await file.arrayBuffer();

                const response = await fetch('/api/process-image', {
                    method: 'POST',
                    headers: headers,
                    body: buffer
                });

                if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

                const resultBlob = await response.blob();
                const objectUrl = URL.createObjectURL(resultBlob);
                
                // Stats UI
                statOriginal.textContent = formatBytes(file.size);
                statConverted.textContent = formatBytes(resultBlob.size);
                if (resultBlob.size < file.size) {
                    const savings = Math.round(((file.size - resultBlob.size) / file.size) * 100);
                    statSavings.textContent = `${savings}% 🎉`;
                    statSavingsBox.classList.remove('hidden');
                } else {
                    statSavingsBox.classList.add('hidden');
                }
                statsPanel.classList.remove('hidden');
                
                downloadLink.href = objectUrl;
                downloadLink.download = `converted_${file.name.split('.')[0]}.${ext}`;
                downloadLink.textContent = "Download File";
                
                if (file.type === 'application/pdf' || conversionType === 'to-pdf') {
                    sliderContainer.classList.add('hidden');
                    convertedImage.src = objectUrl;
                    convertedImage.classList.remove('hidden');
                } else {
                    convertedImage.classList.add('hidden');
                    sliderContainer.classList.remove('hidden');
                    sliderAfter.src = objectUrl;
                    sliderAfter.style.clipPath = `polygon(0 0, 50% 0, 50% 100%, 0 100%)`;
                    sliderHandle.style.left = `50%`;
                }
                
                resultContainer.classList.remove('hidden');
                setTimeout(() => {
                    originalImage.classList.remove('is-processing');
                    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 500);

            } else {
                // BATCH MODE
                const zip = new JSZip();
                
                // Reset UI
                statsPanel.classList.add('hidden');
                sliderContainer.classList.add('hidden');
                convertedImage.classList.add('hidden');
                
                // Process sequentially to be safe on memory and Azure backend
                for (let i = 0; i < currentFiles.length; i++) {
                    const file = currentFiles[i];
                    const itemEl = document.getElementById(`batch-item-${i}`);
                    const iconEl = document.getElementById(`batch-status-${i}`);
                    
                    itemEl.classList.add('processing');
                    iconEl.textContent = "⚙️";
                    
                    try {
                        const buffer = await file.arrayBuffer();
                        const response = await fetch('/api/process-image', {
                            method: 'POST',
                            headers: headers,
                            body: buffer
                        });
                        
                        if (!response.ok) throw new Error("Failed");
                        
                        const resultBlob = await response.blob();
                        const newName = `converted_${file.name.split('.')[0]}.${ext}`;
                        zip.file(newName, resultBlob);
                        
                        itemEl.classList.remove('processing');
                        itemEl.classList.add('done');
                        iconEl.textContent = "✅";
                    } catch (err) {
                        console.error(`Error processing ${file.name}:`, err);
                        itemEl.classList.remove('processing');
                        itemEl.classList.add('error');
                        iconEl.textContent = "❌";
                    }
                }
                
                // Generate ZIP
                convertBtnText.textContent = "Zipping Files...";
                const zipBlob = await zip.generateAsync({type:"blob"});
                const objectUrl = URL.createObjectURL(zipBlob);
                
                downloadLink.href = objectUrl;
                downloadLink.download = `FlowPixel_Batch.zip`;
                downloadLink.textContent = "Download All (ZIP)";
                
                batchResult.classList.remove('hidden');
                resultContainer.classList.remove('hidden');
                
                setTimeout(() => {
                    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 500);
            }
            
        } catch (error) {
            console.error('Error during conversion:', error);
            alert('An error occurred. Please try again.');
            if (!isBatchMode) originalImage.classList.remove('is-processing');
        } finally {
            convertBtn.disabled = false;
            convertBtnText.textContent = isBatchMode ? `Convert All (${currentFiles.length})` : "Convert Now";
            loader.classList.add('hidden');
        }
    });
});
