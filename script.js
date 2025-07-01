// TTC Dashboard JavaScript
class TTCDashboard {
    constructor() {
        this.apiBaseUrl = 'https://ttc-api-rjis.onrender.com'; // Replace with actual API endpoint
        this.selectedStationId = null;
        this.selectedStationName = '';
        this.refreshInterval = null;
        this.refreshIntervalMs = 30000; // 30 seconds
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateLastUpdatedTime();
        this.setupAutoRefresh();
        this.loadSampleData(); // Load sample data for demonstration
    }

    setupEventListeners() {
        // Station search functionality
        const stationInput = document.getElementById('station-search');
        const stationDropdown = document.getElementById('station-dropdown');
        
        stationInput.addEventListener('input', (e) => {
            this.handleStationSearch(e.target.value);
        });

        stationInput.addEventListener('focus', () => {
            if (stationInput.value.trim()) {
                this.showStationDropdown();
            }
        });

        stationInput.addEventListener('blur', (e) => {
            // Delay hiding dropdown to allow for clicks
            setTimeout(() => {
                this.hideStationDropdown();
            }, 200);
        });

        // Station dropdown selection
        stationDropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item')) {
                this.selectStation(
                    e.target.dataset.stationId,
                    e.target.textContent
                );
            }
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.addEventListener('click', () => {
            this.refreshData();
        });

        // Retry button (in error state)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('retry-btn')) {
                this.refreshData();
            }
        });

        // Keyboard navigation for dropdown
        stationInput.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
    }

    handleStationSearch(query) {
        const dropdown = document.getElementById('station-dropdown');
        const items = dropdown.querySelectorAll('.dropdown-item');
        
        if (query.trim().length === 0) {
            this.hideStationDropdown();
            return;
        }

        let hasVisibleItems = false;
        items.forEach(item => {
            const stationName = item.textContent.toLowerCase();
            const searchQuery = query.toLowerCase();
            
            if (stationName.includes(searchQuery)) {
                item.style.display = 'block';
                hasVisibleItems = true;
            } else {
                item.style.display = 'none';
            }
        });

        if (hasVisibleItems) {
            this.showStationDropdown();
        } else {
            this.hideStationDropdown();
        }
    }

    handleKeyboardNavigation(e) {
        const dropdown = document.getElementById('station-dropdown');
        const visibleItems = Array.from(dropdown.querySelectorAll('.dropdown-item'))
            .filter(item => item.style.display !== 'none');
        
        if (visibleItems.length === 0) return;

        const currentSelected = dropdown.querySelector('.dropdown-item.selected');
        let selectedIndex = currentSelected ? visibleItems.indexOf(currentSelected) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % visibleItems.length;
                this.highlightDropdownItem(visibleItems, selectedIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = selectedIndex <= 0 ? visibleItems.length - 1 : selectedIndex - 1;
                this.highlightDropdownItem(visibleItems, selectedIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (currentSelected) {
                    this.selectStation(
                        currentSelected.dataset.stationId,
                        currentSelected.textContent
                    );
                }
                break;
            case 'Escape':
                this.hideStationDropdown();
                break;
        }
    }

    highlightDropdownItem(items, index) {
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === index);
        });
    }

    showStationDropdown() {
        const dropdown = document.getElementById('station-dropdown');
        dropdown.classList.remove('hidden');
    }

    hideStationDropdown() {
        const dropdown = document.getElementById('station-dropdown');
        dropdown.classList.add('hidden');
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    selectStation(stationId, stationName) {
        this.selectedStationId = stationId;
        this.selectedStationName = stationName;
        
        const stationInput = document.getElementById('station-search');
        stationInput.value = stationName;
        
        this.hideStationDropdown();
        this.loadArrivals();
    }

    async loadArrivals() {
        if (!this.selectedStationId) return;

        this.showLoadingState();

        try {
            // Simulate API call with sample data
            await this.delay(1000); // Simulate network delay
            
            // In a real implementation, you would call your API here:
            // const response = await fetch(`${this.apiBaseUrl}/eta/${this.selectedStationId}`);
            // const data = await response.json();
            
            
        if (!this.selectedStationId) return;

        this.showLoadingState();

        try {
            const response = await fetch(`${this.apiBaseUrl}/eta/${this.selectedStationId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const transformedData = this.transformApiData(data);
            this.displayArrivals(transformedData);
            this.updateLastUpdatedTime();
        } catch (error) {
            console.error('Error loading arrivals:', error);
            this.showErrorState();
        }

            this.updateLastUpdatedTime();
            
        } catch (error) {
            console.error('Error loading arrivals:', error);
            this.showErrorState();
        }
    }

    generateSampleArrivals() {
        const lines = [
            { number: 1, color: 'line-1', name: 'Yonge-University' },
            { number: 2, color: 'line-2', name: 'Bloor-Danforth' },
            { number: 4, color: 'line-4', name: 'Sheppard' }
        ];

        const directions = ['Northbound', 'Southbound', 'Eastbound', 'Westbound'];
        const destinations = ['Finch', 'Union', 'Kennedy', 'Kipling', 'Don Mills', 'Sheppard-Yonge'];

        const arrivals = [];
        const numArrivals = Math.floor(Math.random() * 6) + 2; // 2-7 arrivals

        for (let i = 0; i < numArrivals; i++) {
            const line = lines[Math.floor(Math.random() * lines.length)];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const destination = destinations[Math.floor(Math.random() * destinations.length)];
            const minutes = Math.floor(Math.random() * 20) + 1; // 1-20 minutes

            arrivals.push({
                line: line.number,
                lineClass: line.color,
                direction,
                destination,
                minutes,
                vehicle: `${line.number}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
            });
        }

        // Sort by arrival time
        arrivals.sort((a, b) => a.minutes - b.minutes);
        return arrivals;
    }

    displayArrivals(arrivals) {
        const arrivalsGrid = document.getElementById('arrivals-grid');
        
        if (arrivals.length === 0) {
            this.showNoDataState();
            return;
        }

        arrivalsGrid.innerHTML = '';
        
        arrivals.forEach((arrival, index) => {
            const card = this.createArrivalCard(arrival);
            card.style.animationDelay = `${index * 0.1}s`;
            arrivalsGrid.appendChild(card);
        });

        this.hideLoadingState();
        this.hideErrorState();
        this.hideNoDataState();
    }

    createArrivalCard(arrival) {
        const card = document.createElement('div');
        card.className = `arrival-card ${arrival.lineClass} updating`;
        
        card.innerHTML = `
            <div class="line-indicator">
                <div class="line-number">${arrival.line}</div>
            </div>
            <div class="arrival-info">
                <div class="countdown">${arrival.minutes}<span class="unit">min</span></div>
                <div class="direction">${arrival.direction}</div>
                <div class="destination">${arrival.destination}</div>
            </div>
        `;

        // Remove animation class after animation completes
        setTimeout(() => {
            card.classList.remove('updating');
        }, 300);

        return card;
    }

    showLoadingState() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('arrivals-grid').style.display = 'none';
        this.hideErrorState();
        this.hideNoDataState();
    }

    hideLoadingState() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('arrivals-grid').style.display = 'grid';
    }

    showErrorState() {
        document.getElementById('error-state').classList.remove('hidden');
        document.getElementById('arrivals-grid').style.display = 'none';
        this.hideLoadingState();
        this.hideNoDataState();
        this.updateConnectionStatus(false);
    }

    hideErrorState() {
        document.getElementById('error-state').classList.add('hidden');
        this.updateConnectionStatus(true);
    }

    showNoDataState() {
        document.getElementById('no-data-state').classList.remove('hidden');
        document.getElementById('arrivals-grid').style.display = 'none';
        this.hideLoadingState();
        this.hideErrorState();
    }

    hideNoDataState() {
        document.getElementById('no-data-state').classList.add('hidden');
    }

    updateConnectionStatus(isOnline) {
        const statusIndicator = document.getElementById('connection-status');
        const statusText = statusIndicator.querySelector('span');
        
        if (isOnline) {
            statusIndicator.classList.remove('offline');
            statusIndicator.classList.add('online');
            statusText.textContent = 'Online';
        } else {
            statusIndicator.classList.remove('online');
            statusIndicator.classList.add('offline');
            statusText.textContent = 'Offline';
        }
    }

    updateLastUpdatedTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        document.getElementById('last-updated-time').textContent = timeString;
    }

    setupAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            if (this.selectedStationId) {
                this.loadArrivals();
            }
        }, this.refreshIntervalMs);
    }

    refreshData() {
        if (this.selectedStationId) {
            this.loadArrivals();
        } else {
            this.updateLastUpdatedTime();
        }
    }

    loadSampleData() {
        // Auto-select a station for demonstration
        setTimeout(() => {
            this.selectStation('1', 'St. George Station');
        }, 1000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cleanup method
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ttcDashboard = new TTCDashboard();
});

// Handle page visibility changes to pause/resume auto-refresh
document.addEventListener('visibilitychange', () => {
    if (window.ttcDashboard) {
        if (document.hidden) {
            // Page is hidden, clear interval to save resources
            if (window.ttcDashboard.refreshInterval) {
                clearInterval(window.ttcDashboard.refreshInterval);
                window.ttcDashboard.refreshInterval = null;
            }
        } else {
            // Page is visible again, restart auto-refresh
            window.ttcDashboard.setupAutoRefresh();
        }
    }
});

// Handle online/offline events
window.addEventListener('online', () => {
    if (window.ttcDashboard) {
        window.ttcDashboard.updateConnectionStatus(true);
        window.ttcDashboard.refreshData();
    }
});

window.addEventListener('offline', () => {
    if (window.ttcDashboard) {
        window.ttcDashboard.updateConnectionStatus(false);
    }
});

