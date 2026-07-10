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

    let currentFile = null;

    // Handle Option Cards
    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active from all
            optionCards.forEach(c => c.classList.remove('active'));
            // Add active to clicked
            card.classList.add('active');
            // Ensure radio is checked
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    // Handle FAQs
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            const isOpen = item.classList.contains('open');
            
            // Close all items
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            
            // Toggle current
            if (!isOpen) {
                item.classList.add('open');
            }
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
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            alert('Please select a valid image or PDF file.');
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

        // Get selected conversion type from checked radio button
        const checkedRadio = document.querySelector('input[name="conversion-type"]:checked');
        const conversionType = checkedRadio ? checkedRadio.value : 'to-jpg';

        convertBtn.disabled = true;
        loader.classList.remove('hidden');

        try {
            const buffer = await currentFile.arrayBuffer();

            const response = await fetch('/api/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'X-Conversion-Type': conversionType
                },
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
            
            // Scroll down to the result smoothly
            resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
        } catch (error) {
            console.error('Error during image conversion:', error);
            alert('An error occurred while converting the image. Please try again.');
        } finally {
            convertBtn.disabled = false;
            loader.classList.add('hidden');
        }
    });
});
