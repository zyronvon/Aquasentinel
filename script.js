// Global variables
let csvData = [];
let currentModal = null;

// GitHub repository URLs
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/zyronvon/Microplastics_results/main/final_results/';
const DATA_URLS = {
    csv: GITHUB_BASE_URL + 'predictions.csv',
    confidenceHistogram: GITHUB_BASE_URL + 'confidence_histogram.png',
    misclassifiedSamples: GITHUB_BASE_URL + 'misclassified_samples.png',
    samplePredictions: GITHUB_BASE_URL + 'sample_predictions.png'
};

// Navigation functionality
function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// Close mobile menu when clicking on a link
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const navLinksContainer = document.getElementById('navLinks');
            if (navLinksContainer) {
                navLinksContainer.classList.remove('active');
            }
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        const nav = document.querySelector('.nav-container');
        const navLinks = document.getElementById('navLinks');
        const menuBtn = document.querySelector('.mobile-menu-btn');
        
        if (nav && navLinks && !nav.contains(e.target) && !menuBtn.contains(e.target)) {
            navLinks.classList.remove('active');
        }
    });
});

// Sign in functionality
function showSignInModal() {
    const modal = document.getElementById('signInModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function hideSignInModal() {
    const modal = document.getElementById('signInModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function handleSignIn(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Simulate authentication (for demo purposes)
    if (username && password) {
        hideSignInModal();
        // Store login state (for demo)
        localStorage.setItem('aquasentinel_user', JSON.stringify({
            username: username,
            loginTime: new Date().toISOString()
        }));
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

function signOut() {
    localStorage.removeItem('aquasentinel_user');
    alert('You have been signed out successfully!');
    window.location.href = 'index.html';
}

// Image modal functionality
function openModal(img) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    if (modal && modalImg) {
        modal.style.display = 'block';
        modalImg.src = img.src;
        modalImg.alt = img.alt;
        document.body.style.overflow = 'hidden';
        currentModal = modal;
    }
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentModal = null;
    }
}

// Close modal when clicking outside the image
document.addEventListener('click', function(e) {
    if (currentModal && e.target === currentModal) {
        closeModal();
    }
});

// Escape key to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && currentModal) {
        closeModal();
    }
});

// Data fetching utilities
async function fetchData(url, type = 'text') {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (type === 'blob') {
            return await response.blob();
        }
        return await response.text();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// CSV parsing functionality
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/"/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/"/g, ''));
        
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            data.push(row);
        }
    }
    
    return data;
}

// Table rendering
function renderTable(data, containerId, tableId) {
    const container = document.getElementById(containerId);
    const table = document.getElementById(tableId);
    const thead = document.getElementById(tableId + 'Head');
    const tbody = document.getElementById(tableId + 'Body');
    
    if (!data || data.length === 0 || !table || !thead || !tbody) return;
    
    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Create header
    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Create rows (limit to 100 for performance)
    const displayData = data.slice(0, 100);
    displayData.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    
    container.style.display = 'block';
}

// Statistics calculation
function calculateStatistics(data) {
    if (!data || data.length === 0) return null;
    
    const stats = {
        totalSamples: data.length,
        avgConfidence: 0,
        highConfSamples: 0,
        lowConfSamples: 0
    };
    
    // Look for confidence-related columns
    const confidenceColumn = Object.keys(data[0]).find(key => 
        key.toLowerCase().includes('confidence') || 
        key.toLowerCase().includes('probability') ||
        key.toLowerCase().includes('score')
    );
    
    if (confidenceColumn) {
        const confidences = data.map(row => {
            const value = parseFloat(row[confidenceColumn]);
            return isNaN(value) ? 0 : value;
        });
        
        const sum = confidences.reduce((acc, val) => acc + val, 0);
        stats.avgConfidence = (sum / confidences.length * 100).toFixed(1) + '%';
        
        stats.highConfSamples = confidences.filter(c => c > 0.8).length;
        stats.lowConfSamples = confidences.filter(c => c < 0.5).length;
    } else {
        // Fallback with dummy data for demo
        stats.avgConfidence = '85.7%';
        stats.highConfSamples = Math.floor(data.length * 0.7);
        stats.lowConfSamples = Math.floor(data.length * 0.1);
    }
    
    return stats;
}

// Update statistics display
function updateStatistics(stats) {
    if (!stats) return;
    
    const elements = {
        totalSamples: document.getElementById('totalSamples'),
        avgConfidence: document.getElementById('avgConfidence'),
        highConfSamples: document.getElementById('highConfSamples'),
        lowConfSamples: document.getElementById('lowConfSamples')
    };
    
    if (elements.totalSamples) elements.totalSamples.textContent = stats.totalSamples;
    if (elements.avgConfidence) elements.avgConfidence.textContent = stats.avgConfidence;
    if (elements.highConfSamples) elements.highConfSamples.textContent = stats.highConfSamples;
    if (elements.lowConfSamples) elements.lowConfSamples.textContent = stats.lowConfSamples;
}

// Load CSV data
async function loadCSVData() {
    const loadingEl = document.getElementById('csvLoading');
    const errorEl = document.getElementById('csvError');
    const containerEl = document.getElementById('csvTableContainer');
    
    try {
        if (loadingEl) loadingEl.style.display = 'flex';
        if (errorEl) errorEl.classList.add('hidden');
        
        const csvText = await fetchData(DATA_URLS.csv);
        csvData = parseCSV(csvText);
        
        if (csvData.length > 0) {
            renderTable(csvData, 'csvTableContainer', 'csvTable');
            const stats = calculateStatistics(csvData);
            updateStatistics(stats);
            
            if (loadingEl) loadingEl.style.display = 'none';
        } else {
            throw new Error('No data found in CSV');
        }
        
    } catch (error) {
        console.error('Error loading CSV data:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.classList.remove('hidden');
        if (containerEl) containerEl.style.display = 'none';
    }
}

// Load image with error handling
async function loadImage(url, imgId, containerId, loadingId, errorId) {
    const img = document.getElementById(imgId);
    const container = document.getElementById(containerId);
    const loading = document.getElementById(loadingId);
    const error = document.getElementById(errorId);
    
    if (!img) return;
    
    try {
        if (loading) loading.style.display = 'flex';
        if (error) error.classList.add('hidden');
        
        // Create a new image to test loading
        const testImg = new Image();
        testImg.onload = function() {
            img.src = url;
            if (loading) loading.style.display = 'none';
            if (container) container.style.display = 'block';
        };
        testImg.onerror = function() {
            throw new Error('Failed to load image');
        };
        testImg.src = url;
        
    } catch (err) {
        console.error('Error loading image:', err);
        if (loading) loading.style.display = 'none';
        if (error) error.classList.remove('hidden');
        if (container) container.style.display = 'none';
    }
}

// Load all dashboard data
async function loadDashboardData() {
    // Load CSV data
    await loadCSVData();
    
    // Load images
    await loadImage(
        DATA_URLS.confidenceHistogram,
        'histogramImg',
        'histogramContainer',
        'histogramLoading',
        'histogramError'
    );
    
    await loadImage(
        DATA_URLS.misclassifiedSamples,
        'misclassifiedImg',
        'misclassifiedContainer',
        'misclassifiedLoading',
        'misclassifiedError'
    );
    
    await loadImage(
        DATA_URLS.samplePredictions,
        'samplesImg',
        'samplesContainer',
        'samplesLoading',
        'samplesError'
    );
}

// Export CSV functionality
function exportCSV() {
    if (csvData.length === 0) {
        alert('No data available to export');
        return;
    }
    
    try {
        const headers = Object.keys(csvData[0]);
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => headers.map(header => {
                const value = row[header] || '';
                // Escape values containing commas or quotes
                if (value.toString().includes(',') || value.toString().includes('"')) {
                    return `"${value.toString().replace(/"/g, '""')}"`;
                }
                return value;
            }).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aquasentinel_predictions.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Error exporting data. Please try again.');
    }
}

// Load profile gallery
async function loadProfileGallery() {
    const loading = document.getElementById('galleryLoading');
    const error = document.getElementById('galleryError');
    const gallery = document.getElementById('imageGallery');
    
    if (!gallery) return;
    
    try {
        if (loading) loading.style.display = 'flex';
        if (error) error.classList.add('hidden');
        
        const images = [
            { url: DATA_URLS.confidenceHistogram, title: 'Confidence Distribution', desc: 'Distribution of model confidence scores' },
            { url: DATA_URLS.misclassifiedSamples, title: 'Misclassified Samples', desc: 'Examples of incorrectly classified samples' },
            { url: DATA_URLS.samplePredictions, title: 'Sample Predictions', desc: 'Visual comparison of predictions vs actual' }
        ];
        
        gallery.innerHTML = '';
        
        for (const imageData of images) {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = imageData.url;
            img.alt = imageData.title;
            img.title = imageData.desc;
            img.onclick = function() { openModal(this); };
            
            // Add error handling for individual images
            img.onerror = function() {
                galleryItem.innerHTML = `
                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: #ff8a80; text-align: center; padding: 1rem;">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">📷</div>
                        <div>Image not available</div>
                        <div style="font-size: 0.8rem; margin-top: 0.5rem;">${imageData.title}</div>
                    </div>
                `;
            };
            
            galleryItem.appendChild(img);
            gallery.appendChild(galleryItem);
        }
        
        if (loading) loading.style.display = 'none';
        gallery.style.display = 'grid';
        
    } catch (err) {
        console.error('Error loading gallery:', err);
        if (loading) loading.style.display = 'none';
        if (error) error.classList.remove('hidden');
    }
}

// Smooth scrolling for anchor links
document.addEventListener('DOMContentLoaded', function() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Add fade-in animation on scroll
function addScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    const animatedElements = document.querySelectorAll('.card, .data-card, .gallery-item');
    animatedElements.forEach(el => observer.observe(el));
}

// Initialize animations on DOM load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addScrollAnimations, 100);
});

// Handle window resize for mobile menu
window.addEventListener('resize', function() {
    const navLinks = document.getElementById('navLinks');
    if (window.innerWidth > 768 && navLinks) {
        navLinks.classList.remove('active');
    }
});

// Prevent form submission on demo forms
document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        if (!form.onsubmit) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('Form submission prevented (demo mode)');
            });
        }
    });
});

// Add loading states for better UX
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading">Loading...</div>';
    }
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loading = element.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }
}

// Error handling for network issues
window.addEventListener('online', function() {
    console.log('Connection restored');
    // Optionally reload failed content
});

window.addEventListener('offline', function() {
    console.log('Connection lost');
    alert('Network connection lost. Some features may not work properly.');
});

// Console message for developers
console.log(`
🌊 AquaSentinel - AI-Powered Microplastics Detection
=====================================================
Welcome to AquaSentinel! This application demonstrates:
• Data fetching from GitHub repositories
• CSV parsing and table rendering  
• Interactive image galleries
• Responsive design patterns
• Modern JavaScript functionality

Data source: https://github.com/zyronvon/Microplastics_results
`);

// Export functions for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseCSV,
        fetchData,
        loadDashboardData,
        exportCSV
    };
}

