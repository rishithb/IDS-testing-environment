// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const datasetInput = document.querySelector('input[placeholder="Select Dataset"]');
    const uploadButton = document.querySelector('button[aria-label="Upload"]');
    const modelSelect = document.querySelector('select.form-select'); // First form-select
    const paramsSelect = document.querySelector('.col-md-4:last-child select.form-select'); // Parameters dropdown
    const runButton = document.querySelector('.btn-dark');

    // Make these elements globally available
    window.datasetInput = datasetInput;
    window.uploadButton = uploadButton;
    window.modelSelect = modelSelect;
    window.paramsSelect = paramsSelect;
    window.runButton = runButton;

    // Initialize the page once elements are found
    if (modelSelect && paramsSelect) {
        initializePage();
    } else {
        console.error('Required elements not found:', {
            modelSelect: !!modelSelect,
            paramsSelect: !!paramsSelect
        });
    }
});

// Store experiment history (Replace with actual storage later)
let experimentHistory = [];

// Available ML Models
const mlModels = [
    'Tree-based',
    'LCCDE',
    'MTH-IDS'
];

// Initialize the page
function initializePage() {
    populateModelDropdown();
    setupEventListeners();
    clearPerformanceComparison();
}

// Populate ML Model dropdown
function populateModelDropdown() {
    mlModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.toLowerCase().replace(/\s+/g, '-');
        option.textContent = model;
        modelSelect.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Dataset upload handling
    uploadButton.addEventListener('click', handleDatasetUpload);
    
    // Model selection change
    modelSelect.addEventListener('change', handleModelChange);
    
    // Run experiment
    runButton.addEventListener('click', handleRunExperiment);
}

// Handle dataset upload
function handleDatasetUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            datasetInput.value = file.name;
            // TODO: Add actual file upload logic here
            console.log('Selected file:', file.name);
        }
    });
    
    input.click();
}

// Handle model selection change
function handleModelChange(e) {
    const selectedModel = e.target.value;
    console.log('Selected model:', selectedModel); // Debug selected model
    updateModelParameters(selectedModel);
}

// Update parameters based on selected model
function updateModelParameters(modelName) {
    console.log('Updating parameters for model:', modelName); // Debug
    
    if (!paramsSelect) {
        console.error('Parameters select element not found!');
        return;
    }
    
    // Clear existing options
    paramsSelect.innerHTML = '<option>Model Parameters</option>';
    
    // Add parameters based on selected model
    const parameters = getModelParameters(modelName);
    console.log('Available parameters:', parameters); // Debug
    
    parameters.forEach(param => {
        const option = document.createElement('option');
        option.value = param.value;
        option.textContent = param.label;
        paramsSelect.appendChild(option);
    });
}

// Get parameters for specific model
function getModelParameters(modelName) {
    const parameterMap = {
        'tree-based': [
            { value: 'max-depth-5', label: 'Max Depth: 5' },
            { value: 'max-depth-10', label: 'Max Depth: 10' },
            { value: 'max-depth-15', label: 'Max Depth: 15' },
            { value: 'min-samples-3', label: 'Min Samples: 3' },
            { value: 'min-samples-5', label: 'Min Samples: 5' },
            { value: 'min-samples-7', label: 'Min Samples: 7' },
            { value: 'n-estimators-50', label: 'N Estimators: 50' },
            { value: 'n-estimators-100', label: 'N Estimators: 100' },
            { value: 'criterion-gini', label: 'Criterion: Gini' },
            { value: 'criterion-entropy', label: 'Criterion: Entropy' }
        ],
        'lccde': [
            { value: 'num-clusters-3', label: 'Number of Clusters: 3' },
            { value: 'num-clusters-5', label: 'Number of Clusters: 5' },
            { value: 'num-clusters-7', label: 'Number of Clusters: 7' },
            { value: 'threshold-0.5', label: 'Detection Threshold: 0.5' },
            { value: 'threshold-0.7', label: 'Detection Threshold: 0.7' },
            { value: 'threshold-0.9', label: 'Detection Threshold: 0.9' },
            { value: 'distance-euclidean', label: 'Distance Metric: Euclidean' },
            { value: 'distance-manhattan', label: 'Distance Metric: Manhattan' },
            { value: 'init-kmeans++', label: 'Initialization: K-means++' },
            { value: 'init-random', label: 'Initialization: Random' }
        ],
        'mth-ids': [
            { value: 'threshold-0.6', label: 'Threshold: 0.6' },
            { value: 'threshold-0.8', label: 'Threshold: 0.8' },
            { value: 'threshold-0.9', label: 'Threshold: 0.9' },
            { value: 'window-50', label: 'Window Size: 50' },
            { value: 'window-100', label: 'Window Size: 100' },
            { value: 'window-150', label: 'Window Size: 150' },
            { value: 'history-size-1000', label: 'History Size: 1000' },
            { value: 'history-size-5000', label: 'History Size: 5000' },
            { value: 'mode-adaptive', label: 'Mode: Adaptive' },
            { value: 'mode-static', label: 'Mode: Static' }
        ]
    };
    
    return parameterMap[modelName] || [];
}

// Handle running the experiment
function handleRunExperiment() {
    if (!validateInputs()) {
        return;
    }

    const experimentData = {
        dataset: datasetInput.value,
        model: modelSelect.value,
        parameters: paramsSelect.value
    };

    // TODO: Replace with actual API call
    console.log('Running experiment with:', experimentData);
    simulateExperiment();
}

// Validate inputs before running experiment
function validateInputs() {
    if (!datasetInput.value) {
        alert('Please select a dataset');
        return false;
    }
    if (modelSelect.value === 'Select Model') {
        alert('Please select a model');
        return false;
    }
    if (paramsSelect.value === 'Model Parameters') {
        alert('Please select model parameters');
        return false;
    }
    return true;
}

// Simulate experiment results (replace with actual API during integration)
function simulateExperiment() {
    // Show loading state
    runButton.disabled = true;
    runButton.textContent = 'Running...';

    setTimeout(() => {
        // Generate random results between 70 and 95
        const results = {
            accuracy: (70 + Math.random() * 25).toFixed(1),
            precision: (70 + Math.random() * 25).toFixed(1),
            recall: (70 + Math.random() * 25).toFixed(1),
            f1Score: (70 + Math.random() * 25).toFixed(1)
        };

        // Update results
        updateResults(results);

        // Reset button
        runButton.disabled = false;
        runButton.textContent = 'Run Experiment';
    }, 2000);
}

// Clear performance comparison section
function clearPerformanceComparison() {
    const chartContainer = document.getElementById('performanceChart');
    if (!chartContainer) {
        console.error('Performance chart container not found');
        return;
    }
    
    // Clear the existing chart if it exists
    if (performanceChart) {
        performanceChart.destroy();
    }
}

// Update results section
function updateResults(metrics) {
    const resultsDiv = document.querySelector('.card:nth-of-type(2)');
    const modelName = document.querySelector('select').value;
    
    // Update model name
    resultsDiv.querySelector('p.text-secondary').textContent = `Model: ${modelName}`;
    
    // Update metrics
    const metricDivs = resultsDiv.querySelectorAll('.col-12 div');
    metricDivs[0].textContent = `${metrics.accuracy}%`;
    metricDivs[1].textContent = `${metrics.precision}%`;
    metricDivs[2].textContent = `${metrics.recall}%`;
    metricDivs[3].textContent = `${metrics.f1Score}%`;

    // Add to experiment history
    experimentHistory.push({
        runNumber: experimentHistory.length + 1,
        modelName: modelName,
        timestamp: new Date(),
        ...metrics
    });

    // Update performance comparison
    updatePerformanceComparison();
}

// Chart reference
let performanceChart = null;

// Update performance comparison section
function updatePerformanceComparison() {
    const ctx = document.getElementById('performanceChart');
    
    // Destroy existing chart if it exists
    if (performanceChart) {
        performanceChart.destroy();
    }

    // Get the latest experiment
    const latestExperiment = experimentHistory[experimentHistory.length - 1];
    if (!latestExperiment) return;

    const data = {
        labels: ['Accuracy', 'Precision', 'Recall', 'F1 Score'],
        datasets: [{
            data: [
                latestExperiment.accuracy,
                latestExperiment.precision,
                latestExperiment.recall,
                latestExperiment.f1Score
            ],
            backgroundColor: [
                'rgba(239, 68, 68, 0.5)',   // Red
                'rgba(59, 130, 246, 0.5)',  // Blue
                'rgba(245, 158, 11, 0.5)',  // Orange
                'rgba(34, 197, 94, 0.5)'    // Green
            ],
            borderColor: [
                'rgb(239, 68, 68)',   // Red
                'rgb(59, 130, 246)',  // Blue
                'rgb(245, 158, 11)',  // Orange
                'rgb(34, 197, 94)'    // Green
            ],
            borderWidth: 1
        }]
    };

    const config = {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        stepSize: 20
                    },
                    grid: {
                        display: true,
                        drawBorder: true,
                    },
                    title: {
                        display: true,
                        text: 'Percentage',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Metrics',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            barThickness: 50
        }
    };

    performanceChart = new Chart(ctx, config);

    // Update experiment history
    const historyList = document.getElementById('experiment-history');
    historyList.innerHTML = ''; // Clear existing history
    
    // Format date function
    function formatDate(date) {
        const d = new Date(date);
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const year = d.getFullYear();
        const hours = d.getHours() % 12 || 12;
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
        return `${month}/${day}/${year}, ${hours}:${minutes} ${ampm}`;
    }

    experimentHistory.forEach((experiment, index) => {
        const li = document.createElement('li');
        li.className = 'mb-2 d-flex align-items-center justify-content-between';
        li.innerHTML = `
            <div>
                <input class="form-check-input me-2" type="checkbox" id="r${index + 1}" 
                       ${index === experimentHistory.length - 1 ? 'checked' : ''}>
                <label for="r${index + 1}">Run ${index + 1} (${experiment.modelName})</label>
            </div>
            <small class="text-muted">${formatDate(experiment.timestamp)}</small>
        `;
        li.dataset.date = experiment.timestamp; // Store date for sorting
        historyList.appendChild(li);
    });

    // Add search functionality
    const searchInput = document.getElementById('experimentSearch');
    
    function updateSearchResults() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        historyList.innerHTML = ''; // Clear the entire list

        if (searchTerm === '') {
            // If no search term, show all experiments
            displayExperiments(experimentHistory);
        } else {
            // Filter experiments by date
            const matchingExperiments = experimentHistory.filter(exp => {
                const d = new Date(exp.timestamp);
                const expDate = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
                return expDate.includes(searchTerm);
            });

            if (matchingExperiments.length > 0) {
                displayExperiments(matchingExperiments);
            } else {
                // Show "No matches" message
                const noResults = document.createElement('li');
                noResults.className = 'text-center text-muted mt-3 no-results';
                noResults.innerHTML = 'No runs match those dates';
                historyList.appendChild(noResults);
            }
        }
    }

    function displayExperiments(experiments) {
        experiments.forEach((experiment, index) => {
            const li = document.createElement('li');
            li.className = 'mb-2 d-flex align-items-center justify-content-between';
            li.innerHTML = `
                <div>
                    <input class="form-check-input me-2" type="checkbox" id="r${experiment.runNumber}" 
                           ${index === experiments.length - 1 ? 'checked' : ''}>
                    <label for="r${experiment.runNumber}">Run ${experiment.runNumber} (${experiment.modelName})</label>
                </div>
                <small class="text-muted">${formatDate(experiment.timestamp)}</small>
            `;
            li.dataset.date = experiment.timestamp;
            historyList.appendChild(li);
        });
    }

    // Add input event listener
    searchInput.addEventListener('input', updateSearchResults);

    // Add sort functionality
    let sortAscending = true;
    document.getElementById('sortDate').addEventListener('click', () => {
        const items = Array.from(historyList.getElementsByTagName('li'));
        items.sort((a, b) => {
            const dateA = new Date(a.dataset.date);
            const dateB = new Date(b.dataset.date);
            return sortAscending ? dateA - dateB : dateB - dateA;
        });
        
        sortAscending = !sortAscending;
        items.forEach(item => historyList.appendChild(item));
    });
}
