// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const datasetInput = document.querySelector('input[placeholder="Select Dataset"]');
    const uploadButton = document.querySelector('button[aria-label="Upload"]');
    const modelSelect = document.querySelector('select.form-select'); // First form-select
    const kMeans = document.getElementById('kmeans'); // K-means input
    const smoteCount = document.getElementById('smote'); // SMOTE input
    const runButton = document.querySelector('.run-button');
    const smoteCheck = document.getElementById('smote-check');

    // Make these elements globally available
    window.datasetInput = datasetInput;
    window.uploadButton = uploadButton;
    window.modelSelect = modelSelect;
    window.kMeans = kMeans;
    window.runButton = runButton;
    window.smoteCount = smoteCount;
    window.smoteCheck = smoteCheck;
    window.smoteCheck.addEventListener('change', () => {
        window.smoteCount.style.display = window.smoteCheck.checked ? 'block' : 'none';
        window.smoteCount.value = '';
    });

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
    'Tree-based',
    //'LCCDE',
    'MTH-IDS'
];

// Initialize the page
function initializePage() {
    populateModelDropdown();
    setupEventListeners();
    clearPerformanceComparison();
    updateExperimentHistory();
}

// Populate ML Model dropdown
function populateModelDropdown() {
    mlModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.toLowerCase().replace(/\s+/g, '-');
        option.textContent = model;
    window.modelSelect.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Dataset upload handling
    window.uploadButton.addEventListener('click', handleDatasetUpload);
    
    // Run experiment
    window.runButton.addEventListener('click', handleRunExperiment);
    //window.runButton.addEventListener('click', testFunction);

}

async function testFunction() {
    const response = await fetch('http://127.0.0.1:5000/db-api/experiments', {
        method: 'GET',
        cache: 'no-cache',
        headers: new Headers({
            'content-type': 'application/json'
        })
    });
    
    const result = await response.json();
    return result;
}

// Handle dataset upload
function handleDatasetUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            window.datasetInput.value = file.name;
            // TODO: Add actual file upload logic here
            console.log('Selected file:', file.name);
        }
    });
    
    input.click();
}

// Handle running the experiment
function handleRunExperiment() {
    /*if (!validateInputs()) {
        return;
    } */
   // Disable button and show loading state
    window.runButton.disabled = true;
    window.runButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Running...';

    const experimentData = {
        dataset: 'CICIDS2017_sample_km.csv', // window.datasetInput.value,
        model: window.modelSelect.value,
        parameters: {
            clusters: parseInt(window.kMeans.value) ? parseInt(window.kMeans.value) : 1000,
            smote: window.smoteCheck.checked ? parseInt(window.smoteCount.value) : null
        }
    };
    console.log('Experiment Data:', experimentData);
    let results_json = {}

    fetch('http://127.0.0.1:5000/lccde', {
        method: 'POST',
        body: JSON.stringify(experimentData),
        cache: 'no-cache',
        headers: new Headers({
            'content-type': 'application/json'
        })
    }).then(function(response) {
        if (response.status !== 200) {
            console.log('Response status not 200:', response.status);
            // Reset button on error
            window.runButton.disabled = false;
            window.runButton.innerHTML = 'Run Experiment';
            return ;
        }
        console.log('Response received from backend');
        response.json().then(function(data) {
            results_json = data;
            /*metrics = {
                accuracy: (result_json.results.lccde.accuracy * 100).toFixed(3),
                precision: (result_json.results.lccde.precision * 100).toFixed(3),
                recall: (result_json.results.lccde.recall * 100).toFixed(3),
                f1Score: (result_json.results.lccde.average_f1 * 100).toFixed(3),
            };
            results_json.results.lccde.accuracy = (results_json.results.lccde.accuracy * 100).toFixed(3)
            results_json.results.lccde.precision = (results_json.results.lccde.precision * 100).toFixed(3)
            results_json.results.lccde.recall = (results_json.results.lccde.recall * 100).toFixed(3)
            results_json.results.lccde.average_f1 = (results_json.results.lccde.average_f1 * 100).toFixed(3)
            */
            console.log('Metrics:', results_json);
            updateResults(results_json);
            // Reset button after results are updated
            window.runButton.disabled = false;
            window.runButton.innerHTML = 'Run Experiment';
        });
    }).catch(function(error) {
        console.error('Error running experiment:', error);
        // Reset button on error
        window.runButton.disabled = false;
        window.runButton.innerHTML = 'Run Experiment';
    });
    

    // TODO: Replace with actual API call
    console.log('Running experiment with:', experimentData);
}


// Validate inputs before running experiment
function validateInputs() {
    if (!window.datasetInput.value) {
        alert('Please select a dataset');
        return false;
    }
    if (window.modelSelect.value === 'Select Model') {
        alert('Please select a model');
        return false;
    }
    return true;
}

// Simulate experiment results (replace with actual API during integration)
function simulateExperiment() {
    // Show loading state
    window.runButton.disabled = true;
    window.runButton.textContent = 'Running...';

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
        window.runButton.disabled = false;
        window.runButton.textContent = 'Run Experiment';
    }, 2000);
}

// Clear performance comparison section
function clearPerformanceComparison() {
    const chartContainer = document.getElementById('performanceChart');
    const subChartContainer = document.getElementById('subPerformanceChart');
    if (!chartContainer) {
        console.error('Performance chart container not found');
        return;
    }
    if (!subChartContainer) {
        console.error('Sub Performance chart container not found');
        return;
    }
    
    // Clear the existing chart if it exists
    if (performanceChart) {
        performanceChart.destroy();
    }
    if (subPerformanceChart) {
        subPerformanceChart.destroy();
    }
}

// Update results section
async function updateResults(metrics) {
    const resultsDiv = document.querySelector('.card:nth-of-type(2)');
    const modelName = document.querySelector('select').value;
    
    // Update model name
    resultsDiv.querySelector('p.text-secondary').textContent = `Model: ${modelName.toUpperCase()}`;
    
    // Update metrics
    const metricDivs = resultsDiv.querySelectorAll('.col-12 div');
    metricDivs[0].textContent = `${(metrics.results.lccde.accuracy * 100).toFixed(3)}%`;
    metricDivs[1].textContent = `${(metrics.results.lccde.precision * 100).toFixed(3)}%`;
    metricDivs[2].textContent = `${(metrics.results.lccde.recall * 100).toFixed(3)}%`;
    metricDivs[3].textContent = `${(metrics.results.lccde.average_f1 * 100).toFixed(3)}%`;

    // Add to experiment history
    experimentHistory.push({
        runNumber: experimentHistory.length + 1,
        modelName: modelName,
        timestamp: new Date(),
        ...metrics
    });

    // Update history first, then chart (both are async)
    await updateExperimentHistory();
    await updatePerformanceComparison();
}

// Chart reference
let performanceChart = null;
let subPerformanceChart = null;

// Format date function
function formatDate(date) {
    const d = new Date(date);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours() % 12 || 12;
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    return `${month}/${day}/${year} - ${hours}:${minutes} ${ampm}`;
}

// Update experiment history list
async function updateExperimentHistory() {
    const historyList = document.getElementById('experiment-history');
    
    // Store currently checked experiment IDs before clearing
    const currentlyChecked = new Set();
    document.querySelectorAll('#experiment-history input[type="checkbox"]:checked').forEach(checkbox => {
        currentlyChecked.add(checkbox.id);
    });

    historyList.innerHTML = ''; // Clear existing history

    const experiments = await testFunction();
    
    experiments.forEach((experiment, index) => {
        console.log('Adding experiment to history:', experiment);
        const li = document.createElement('li');
        li.className = 'mb-2 d-flex align-items-center justify-content-between';
        
        const checkboxId = `r${experiment.experiment_name}`;
        // Check if this was previously checked OR if it's the newest experiment
        const shouldBeChecked = currentlyChecked.has(checkboxId) || index === experiments.length - 1;
        
        // Get cluster and SMOTE parameters
        const clustersParam = experiment.parameters.find(p => p.param_name === 'clusters')?.param_value || 'N/A';
        const smoteParam = experiment.parameters.find(p => p.param_name === 'smote_samples')?.param_value || 'N/A';
        
        li.innerHTML = `
            <div>
                <input class="form-check-input me-2" type="checkbox" id="${checkboxId}" 
                       ${shouldBeChecked ? 'checked' : ''}>
                <label for="${checkboxId}">Run ${experiment.experiment_name} (K=${clustersParam}, SMOTE=${smoteParam})</label>
            </div>
            <small class="text-muted">${formatDate(experiment.run_timestamp)}</small>
        `;
        li.dataset.date = experiment.run_timestamp; // Store date for sorting
        
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
async function setupSearchAndSort() {
    if (searchSortSetup) return;
    searchSortSetup = true;

    const searchInput = document.getElementById('experimentSearch');
    const historyList = document.getElementById('experiment-history');
    const experiments = await testFunction();
    
    function updateSearchResults() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        historyList.innerHTML = ''; // Clear the entire list

        if (searchTerm === '') {
            // If no search term, show all experiments
            displayExperiments(experiments);
        } else {
            // Filter experiments by date
            const matchingExperiments = experiments.filter(exp => {
                const d = new Date(exp.run_timestamp);
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
            const currentCheckbox = document.getElementById(`r${experiment.experiment_name}`);
            const isChecked = currentCheckbox ? currentCheckbox.checked : (index === experiments.length - 1);
            
            // Get cluster and SMOTE parameters
            const clustersParam = experiment.parameters.find(p => p.param_name === 'clusters')?.param_value || 'N/A';
            const smoteParam = experiment.parameters.find(p => p.param_name === 'smote_samples')?.param_value || 'N/A';
            
            li.innerHTML = `
                <div>
                    <input class="form-check-input me-2" type="checkbox" id="r${experiment.experiment_name}" 
                           ${isChecked ? 'checked' : ''}>
                    <label for="r${experiment.experiment_name}">Run ${experiment.experiment_name} (K=${clustersParam}, SMOTE=${smoteParam})</label>
                </div>
                <small class="text-muted">${formatDate(experiment.run_timestamp)}</small>
            `;
            li.dataset.date = experiment.run_timestamp;
            
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
async function updatePerformanceComparison() {
    const ctx = document.getElementById('performanceChart');
    const sub_ctz = document.getElementById('subPerformanceChart');
    const experiments = await testFunction();
    
    // Destroy existing chart if it exists
    if (performanceChart) {
        performanceChart.destroy();
    }
    if (subPerformanceChart) {
        subPerformanceChart.destroy();
    }

    // Get all checked experiments
    const checkedBoxes = document.querySelectorAll('#experiment-history input[type="checkbox"]:checked');
    const selectedExperiments = [];
    
    checkedBoxes.forEach(checkbox => {
        const run = checkbox.id.replace('r', '');
        const exp = experiments.find(EXP => EXP.experiment_name === run);
        if (exp) {
            selectedExperiments.push(exp);
        }
    });

    if (selectedExperiments.length === 0) return;
     // If only one experiment is selected, populate parameter inputs
    if (selectedExperiments.length === 1) {
        const experiment = selectedExperiments[0];
        const clustersParam = experiment.parameters.find(p => p.param_name === 'clusters')?.param_value;
        const smoteParam = experiment.parameters.find(p => p.param_name === 'smote_samples')?.param_value;
        
        if (clustersParam) {
            window.kMeans.value = clustersParam;
        }
        if (smoteParam && smoteParam !== 'None') {
            window.smoteCheck.checked = true;
            window.smoteCount.style.display = 'block';
            window.smoteCount.value = smoteParam;
        } else {
            window.smoteCheck.checked = false;
            window.smoteCount.style.display = 'none';
            window.smoteCount.value = '';
        }
    }

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
        const clustersParam = experiment.parameters.find(p => p.param_name === 'clusters')?.param_value || 'N/A';
        const smoteParam = experiment.parameters.find(p => p.param_name === 'smote_samples')?.param_value || 'N/A';
        const color = colors[index % colors.length];
        return {
            label: `Run ${experiment.experiment_name} (${`K=${clustersParam}, SMOTE=${smoteParam}`})`,
            data: [
                experiment.metrics.find(m => m.metric_name === 'lccde_accuracy')?.metric_value * 100,
                experiment.metrics.find(m => m.metric_name === 'lccde_precision')?.metric_value * 100,
                experiment.metrics.find(m => m.metric_name === 'lccde_recall')?.metric_value * 100,
                experiment.metrics.find(m => m.metric_name === 'lccde_average_f1')?.metric_value * 100
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
    const subConfig = {
        type: 'radar',
        data: {
            labels: ['0', '1', '2', '3', '4', '5', '6'],
            datasets: [{
                label: 'CatBoost',
                data: [94, 91, 92, 93, 90, 95, 89],
                fill: true,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgb(255, 99, 132)',
                pointBackgroundColor: 'rgb(255, 99, 132)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(255, 99, 132)'
            },
            {
                label: 'XGBoost',
                data: [96, 99, 93, 95, 92, 93, 95],
                fill: true,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgb(54, 162, 235)',
                pointBackgroundColor: 'rgb(54, 162, 235)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(54, 162, 235)'
            },
            {
                label: 'LightGTM',
                data: [92, 94, 99, 97, 96, 98, 90],
                fill: true,
                backgroundColor: 'rgba(64, 235, 98, 0.2)',
                borderColor: 'rgba(47, 134, 50, 1)',
                pointBackgroundColor: 'rgb(54, 162, 235)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(54, 162, 235)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: false
                    },
                    suggestedMax: 100,
                },
            },
            plugins: {
                legend: {
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
    }
    const config = {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        display: true,
                        drawBorder: true,
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },

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
                        display: true
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
    /*
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
    }; */

    performanceChart = new Chart(ctx, config);
    //      subPerformanceChart = new Chart(sub_ctz, subConfig);
}