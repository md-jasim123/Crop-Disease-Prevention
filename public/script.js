document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const imageUpload = document.getElementById('imageUpload');
    const preview = document.getElementById('preview');
    const previewImg = document.getElementById('previewImg');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const newImageBtn = document.getElementById('newImageBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const results = document.getElementById('results');
    const predictionResults = document.getElementById('predictionResults');

    // Handle drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('dragover');
    }

    function unhighlight(e) {
        dropZone.classList.remove('dragover');
    }

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // Handle file selection via button
    dropZone.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                showPreview(file);
            } else {
                alert('Please upload an image file.');
            }
        }
    }

    function showPreview(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.classList.remove('d-none');
            dropZone.classList.add('d-none');
            results.classList.add('d-none');
            predictionResults.innerHTML = '';
            // Show the "Upload Another Image" button so the user can easily choose a different image
            if (newImageBtn) newImageBtn.classList.remove('d-none');
        }
        reader.readAsDataURL(file);
    }

    analyzeBtn.addEventListener('click', async function() {
        try {
            results.classList.remove('d-none');
            loadingSpinner.classList.remove('d-none');
            predictionResults.innerHTML = '';
            analyzeBtn.disabled = true;

            // Get base64 image data
            const imageData = previewImg.src.split(',')[1];

            const response = await fetch('http://localhost:5000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData })
            });

            if (!response.ok) {
                throw new Error('Server error: Unable to analyze image');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            
            displayResults(data);
        } catch (error) {
            console.error('Error:', error);
            let errorMessage = 'Error analyzing image. Please try again.';
            
            if (error.message.includes('ENOTFOUND')) {
                errorMessage = `
                    <p><i class="fas fa-wifi me-2"></i>Unable to connect to the server. Please check:</p>
                    <ul class="mt-2">
                        <li>Your internet connection</li>
                        <li>If you're connected to any VPN, try disconnecting</li>
                        <li>Try again in a few moments</li>
                    </ul>
                `;
            }
            
            predictionResults.innerHTML = `
                <div class="alert alert-danger">
                    ${errorMessage}
                </div>
            `;
        } finally {
            loadingSpinner.classList.add('d-none');
            analyzeBtn.disabled = false;
        }
    });

    // Reset UI to allow uploading a new image without reloading the page
    if (newImageBtn) {
        newImageBtn.addEventListener('click', function() {
            // Clear preview and results
            previewImg.src = '';
            preview.classList.add('d-none');
            dropZone.classList.remove('d-none');
            results.classList.add('d-none');
            predictionResults.innerHTML = '';
            // Reset file input so the same file can be re-selected if needed
            imageUpload.value = '';
            // Hide the button again until a new image is chosen
            newImageBtn.classList.add('d-none');
        });
    }

    // Local prevention steps map (frontend-only). Update entries to match your model's class names.
    const localPreventionMap = {
        'powdery mildew': [
            'Remove and dispose of heavily infected leaves.',
            'Improve air circulation by spacing plants and pruning.',
            'Apply potassium bicarbonate or sulfur-based organic fungicides.',
            'Water at the base of plants to keep foliage dry.',
            'Rotate crops and avoid overhead irrigation.'
        ],
        'leaf rust': [
            'Remove infected leaves and destroy them away from the field.',
            'Use resistant varieties if available.',
            'Apply copper-based fungicides or recommended systemic fungicides as advised.',
            'Maintain good field hygiene and control volunteer plants.'
        ],
        'early blight': [
            'Remove and destroy affected foliage.',
            'Apply fungicides containing chlorothalonil or mancozeb following label rates.',
            'Practice crop rotation and avoid planting near previous season\'s hosts.',
            'Improve drainage and avoid excessive nitrogen fertilization.'
        ],
        'late blight': [
            'Immediately remove infected plants and destroy them.',
            'Use protective fungicides like chlorothalonil or mancozeb; follow local extension guidance.',
            'Avoid overhead irrigation and ensure good airflow.',
            'Plant resistant varieties where possible.'
        ],
        'bacterial spot': [
            'Remove infected leaves and fruits.',
            'Avoid working with plants when wet.',
            'Use copper sprays as a preventative where advised by extension services.',
            'Use certified disease-free seeds/transplants and practice crop rotation.'
        ]
    };

    async function getPreventionSteps(diseaseName) {
        const normalized = (diseaseName || '').toString().trim().toLowerCase();
        const steps = localPreventionMap[normalized];
        if (steps && steps.length) {
            // Return an ordered list as HTML
            return `<ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
        }

        // Fallback generic guidance when disease not in map
        return `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>General steps you can take now:</strong>
                <ul class="mt-2 mb-0">
                    <li>Isolate and remove strongly infected plants or leaves.</li>
                    <li>Improve airflow and avoid overhead watering.</li>
                    <li>Use broad-spectrum organic fungicides (e.g., sulfur or copper) following label directions.</li>
                    <li>Contact your local agricultural extension for region-specific advice.</li>
                </ul>
            </div>
        `;
    }

    async function displayResults(data) {
        if (!data.predictions || data.predictions.length === 0) {
            predictionResults.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No diseases detected. Your crop appears healthy!
                </div>
            `;
            return;
        }

        // Sort predictions by confidence
        const sortedPredictions = data.predictions.sort((a, b) => b.confidence - a.confidence);
        
        // Determine top disease and whether it's a healthy label. If healthy, skip prevention steps.
        const topDisease = sortedPredictions[0];
        const normalizedTop = (topDisease.class || '').toString().trim().toLowerCase();
        const healthyKeywords = ['health', 'healthy', 'health lead', 'healthy leaf'];
        const isHealthy = healthyKeywords.some(k => normalizedTop.includes(k));

        // Only fetch prevention steps when not healthy
        let preventionHTML = '';
        if (!isHealthy) {
            const preventionSteps = await getPreventionSteps(topDisease.class);
            preventionHTML = preventionSteps;
        }

        const resultsHTML = sortedPredictions
            .map(prediction => {
                const confidence = (prediction.confidence * 100).toFixed(1);
                return `
                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <strong>${prediction.class}</strong>
                            <span class="badge bg-success">${confidence}%</span>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-level" style="width: ${confidence}%"></div>
                        </div>
                    </div>
                `;
            })
            .join('');

        predictionResults.innerHTML = `
            <div class="predictions">
                ${resultsHTML}
            </div>
            ${!isHealthy ? `
            <div class="mt-4">
                <h5><i class="fas fa-shield-alt me-2"></i>Prevention & Treatment Steps</h5>
                <div class="prevention-steps mt-3 p-3 bg-light rounded">${preventionHTML}</div>
            </div>
            ` : ''}
            <div class="mt-3 text-muted">
                <small><i class="fas fa-info-circle me-1"></i>Results are sorted by confidence level</small>
            </div>
        `;
    }
});
