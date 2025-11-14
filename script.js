// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const datasetInput = document.querySelector('input[placeholder="Select Dataset"]');
    const uploadButton = document.querySelector('button[aria-label="Upload"]');
    const modelSelect = document.querySelector('select.form-select'); // First form-select
    const runButton = document.querySelector('.btn-dark');

    // Make these elements globally available
    window.datasetInput = datasetInput;
    window.uploadButton = uploadButton;
    window.modelSelect = modelSelect;
    window.runButton = runButton;

    // Initialize the page once elements are found
    if (modelSelect) {
        initializePage();
    } else {
        console.error('Required elements not found:', {
            modelSelect: !!modelSelect
        });
    }
});

// Store experiment history (Replace with actual storage later)
let experimentHistory = [];

// Available ML Models - Only LCCDE active
const mlModels = [
    // 'Tree-based',
    'LCCDE',
    // 'MTH-IDS'
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

// Handle running the experiment
function handleRunExperiment() {
    if (!validateInputs()) {
        return;
    }

    const experimentData = {
        dataset: datasetInput.value,
        model: modelSelect.value
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

    // Update both history and chart
    updateExperimentHistory();
    updatePerformanceComparison();
}

// Chart reference
let performanceChart = null;

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

// Update experiment history list
function updateExperimentHistory() {
    const historyList = document.getElementById('experiment-history');
    historyList.innerHTML = ''; // Clear existing history
    
    experimentHistory.forEach((experiment, index) => {
        const li = document.createElement('li');
        li.className = 'mb-2 d-flex align-items-center justify-content-between';
        li.innerHTML = `
            <div>
                <input class="form-check-input me-2" type="checkbox" id="r${experiment.runNumber}" 
                       ${index === experimentHistory.length - 1 ? 'checked' : ''}>
                <label for="r${experiment.runNumber}">Run ${experiment.runNumber} (${experiment.modelName})</label>
            </div>
            <small class="text-muted">${formatDate(experiment.timestamp)}</small>
        `;
        li.dataset.date = experiment.timestamp; // Store date for sorting
        
        // Add change event listener to checkbox
        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', updatePerformanceComparison);
        
        historyList.appendChild(li);
    });

    // Setup search and sort only once
    setupSearchAndSort();
}

// Setup search and sort functionality
let searchSortSetup = false;
function setupSearchAndSort() {
    if (searchSortSetup) return;
    searchSortSetup = true;

    const searchInput = document.getElementById('experimentSearch');
    const historyList = document.getElementById('experiment-history');
    
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
            
            // Check if this experiment is currently checked
            const currentCheckbox = document.getElementById(`r${experiment.runNumber}`);
            const isChecked = currentCheckbox ? currentCheckbox.checked : (index === experiments.length - 1);
            
            li.innerHTML = `
                <div>
                    <input class="form-check-input me-2" type="checkbox" id="r${experiment.runNumber}" 
                           ${isChecked ? 'checked' : ''}>
                    <label for="r${experiment.runNumber}">Run ${experiment.runNumber} (${experiment.modelName})</label>
                </div>
                <small class="text-muted">${formatDate(experiment.timestamp)}</small>
            `;
            li.dataset.date = experiment.timestamp;
            
            // Add change event listener to checkbox
            const checkbox = li.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', updatePerformanceComparison);
            
            historyList.appendChild(li);
        });
    }

    // Add input event listener
    searchInput.addEventListener('input', updateSearchResults);

    // Add sort functionality
    let sortAscending = true;
    document.getElementById('sortDate').addEventListener('click', () => {
        const items = Array.from(historyList.getElementsByTagName('li'));
        
        // Filter out "no results" messages
        const validItems = items.filter(item => item.dataset.date);
        
        validItems.sort((a, b) => {
            const dateA = new Date(a.dataset.date);
            const dateB = new Date(b.dataset.date);
            return sortAscending ? dateA - dateB : dateB - dateA;
        });
        
        sortAscending = !sortAscending;
        
        // Clear and re-add sorted items
        historyList.innerHTML = '';
        validItems.forEach(item => historyList.appendChild(item));
    });
}

// Update performance comparison chart
function updatePerformanceComparison() {
    const ctx = document.getElementById('performanceChart');
    
    // Destroy existing chart if it exists
    if (performanceChart) {
        performanceChart.destroy();
    }

    // Get all checked experiments
    const checkedBoxes = document.querySelectorAll('#experiment-history input[type="checkbox"]:checked');
    const selectedExperiments = [];
    
    checkedBoxes.forEach(checkbox => {
        const runNumber = parseInt(checkbox.id.replace('r', ''));
        const experiment = experimentHistory.find(exp => exp.runNumber === runNumber);
        if (experiment) {
            selectedExperiments.push(experiment);
        }
    });

    if (selectedExperiments.length === 0) return;

    // Define colors for different runs
    const colors = [
        { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },      // Red
        { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },    // Blue
        { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },    // Orange
        { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' },      // Green
        { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgb(168, 85, 247)' },    // Purple
        { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' }     // Pink
    ];

    // Create datasets for each selected experiment
    const datasets = selectedExperiments.map((experiment, index) => {
        const color = colors[index % colors.length];
        return {
            label: `Run ${experiment.runNumber} (${experiment.modelName})`,
            data: [
                parseFloat(experiment.accuracy),
                parseFloat(experiment.precision),
                parseFloat(experiment.recall),
                parseFloat(experiment.f1Score)
            ],
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 2
        };
    });

    const data = {
        labels: ['Accuracy', 'Precision', 'Recall', 'F1 Score'],
        datasets: datasets
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
                    display: selectedExperiments.length > 1,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                }
            }
        }
    };

    performanceChart = new Chart(ctx, config);
}