 
// User Dashboard JavaScript
// File: static/js/user-dashboard.js

class UserDashboard {
    constructor() {
        this.apartments = [];
        this.filteredApartments = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadApartments();
    }

    bindEvents() {
        // Search button
        document.getElementById('search-btn').addEventListener('click', () => {
            this.filterApartments();
        });

        // Enter key on inputs
        const inputs = document.querySelectorAll('#location, #min-price, #max-price');
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.filterApartments();
                }
            });
        });

        // Select change events
        document.getElementById('rooms').addEventListener('change', () => {
            this.filterApartments();
        });

        document.getElementById('beds').addEventListener('change', () => {
            this.filterApartments();
        });

        // Modal close
        const modal = document.getElementById('apartment-modal');
        const closeBtn = modal.querySelector('.close');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    async loadApartments() {
        try {
            this.showLoading(true);
            const response = await fetch('/api/apartments');
            
            if (!response.ok) {
                throw new Error('Failed to load apartments');
            }

            this.apartments = await response.json();
            this.filteredApartments = [...this.apartments];
            this.renderApartments();
            this.updateResultsCount();
        } catch (error) {
            console.error('Error loading apartments:', error);
            this.showError('Failed to load apartments. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    filterApartments() {
        const filters = {
            location: document.getElementById('location').value.trim().toLowerCase(),
            minPrice: parseFloat(document.getElementById('min-price').value) || 0,
            maxPrice: parseFloat(document.getElementById('max-price').value) || Infinity,
            rooms: parseInt(document.getElementById('rooms').value) || null,
            beds: parseInt(document.getElementById('beds').value) || null
        };

        this.filteredApartments = this.apartments.filter(apartment => {
            const matchesLocation = !filters.location || 
                apartment.address.toLowerCase().includes(filters.location);
            
            const matchesPrice = apartment.monthly_price >= filters.minPrice && 
                apartment.monthly_price <= filters.maxPrice;
            
            const matchesRooms = !filters.rooms || apartment.room_count === filters.rooms;
            const matchesBeds = !filters.beds || apartment.bed_count === filters.beds;

            return matchesLocation && matchesPrice && matchesRooms && matchesBeds;
        });

        this.renderApartments();
        this.updateResultsCount();
    }

    renderApartments() {
        const grid = document.getElementById('apartments-grid');
        
        if (this.filteredApartments.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: #6c757d;">
                    <i class="fas fa-home" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h3>No apartments found</h3>
                    <p>Try adjusting your search criteria</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.filteredApartments.map(apartment => `
            <div class="apartment-card" onclick="userDashboard.showApartmentDetail('${apartment._id}')">
                <div class="apartment-image">
                    ${apartment.photos && apartment.photos.length > 0 
                        ? `<img src="${apartment.photos[0]}" alt="${apartment.title}" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-home\\'></i>'">`
                        : '<i class="fas fa-home"></i>'
                    }
                </div>
                <div class="apartment-info">
                    <h3 class="apartment-title">${this.escapeHtml(apartment.title)}</h3>
                    <div class="apartment-address">
                        <i class="fas fa-map-marker-alt"></i>
                        ${this.escapeHtml(apartment.address)}
                    </div>
                    <div class="apartment-details">
                        <span><i class="fas fa-door-open"></i> ${apartment.room_count} Rooms</span>
                        <span><i class="fas fa-bed"></i> ${apartment.bed_count} Beds</span>
                        <span><i class="fas fa-bath"></i> ${apartment.bathroom_count || 1} Bath</span>
                    </div>
                    <div class="apartment-price">
                        $${apartment.monthly_price.toLocaleString()}
                        <span>/month</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async showApartmentDetail(apartmentId) {
        try {
            const response = await fetch(`/api/apartments/${apartmentId}`);
            
            if (!response.ok) {
                throw new Error('Failed to load apartment details');
            }

            const apartment = await response.json();
            this.renderApartmentDetail(apartment);
            
            const modal = document.getElementById('apartment-modal');
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error loading apartment details:', error);
            this.showError('Failed to load apartment details. Please try again.');
        }
    }

    renderApartmentDetail(apartment) {
        const modalBody = document.getElementById('modal-body');
        
        const imagesHtml = apartment.photos && apartment.photos.length > 0
            ? apartment.photos.map(photo => `<img src="${photo}" alt="${apartment.title}" onerror="this.style.display='none'">`).join('')
            : '<div style="text-align: center; padding: 60px; color: #6c757d;"><i class="fas fa-home" style="font-size: 4rem;"></i><p>No photos available</p></div>';

        const amenitiesHtml = apartment.amenities && apartment.amenities.length > 0
            ? `<div class="amenities-list">
                ${apartment.amenities.map(amenity => `<span class="amenity-tag">${this.escapeHtml(amenity)}</span>`).join('')}
              </div>`
            : '<p>No amenities listed</p>';

        modalBody.innerHTML = `
            <div class="apartment-detail">
                <div class="detail-images">
                    ${imagesHtml}
                </div>
                
                <div class="detail-header">
                    <h2 class="detail-title">${this.escapeHtml(apartment.title)}</h2>
                    <div class="detail-address">
                        <i class="fas fa-map-marker-alt"></i>
                        ${this.escapeHtml(apartment.address)}
                    </div>
                    <div class="detail-price">$${apartment.monthly_price.toLocaleString()}/month</div>
                </div>

                <div class="detail-info">
                    <div class="info-item">
                        <i class="fas fa-door-open"></i>
                        <strong>${apartment.room_count}</strong>
                        <span>Rooms</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-bed"></i>
                        <strong>${apartment.bed_count}</strong>
                        <span>Bedrooms</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-bath"></i>
                        <strong>${apartment.bathroom_count || 1}</strong>
                        <span>Bathrooms</span>
                    </div>
                    ${apartment.area_sqm ? `
                    <div class="info-item">
                        <i class="fas fa-expand-arrows-alt"></i>
                        <strong>${apartment.area_sqm}</strong>
                        <span>sqm</span>
                    </div>
                    ` : ''}
                    ${apartment.floor ? `
                    <div class="info-item">
                        <i class="fas fa-building"></i>
                        <strong>${this.escapeHtml(apartment.floor)}</strong>
                        <span>Floor</span>
                    </div>
                    ` : ''}
                </div>

                ${apartment.description ? `
                <div class="detail-description">
                    <h3>Description</h3>
                    <p>${this.escapeHtml(apartment.description)}</p>
                </div>
                ` : ''}

                <div class="detail-description">
                    <h3>Amenities & Features</h3>
                    ${amenitiesHtml}
                    
                    <div style="margin-top: 16px;">
                        ${apartment.furnished ? '<span class="amenity-tag"><i class="fas fa-couch"></i> Furnished</span>' : ''}
                        ${apartment.parking ? '<span class="amenity-tag"><i class="fas fa-car"></i> Parking</span>' : ''}
                        ${apartment.pets_allowed ? '<span class="amenity-tag"><i class="fas fa-paw"></i> Pets Allowed</span>' : ''}
                    </div>
                </div>

                ${apartment.available_from || apartment.available_to ? `
                <div class="detail-description">
                    <h3>Availability</h3>
                    <p>
                        ${apartment.available_from ? `Available from: ${new Date(apartment.available_from).toLocaleDateString()}` : ''}
                        ${apartment.available_from && apartment.available_to ? ' - ' : ''}
                        ${apartment.available_to ? `Until: ${new Date(apartment.available_to).toLocaleDateString()}` : ''}
                    </p>
                </div>
                ` : ''}

                <div class="contact-buttons">
                    ${apartment.contact_phone ? `
                    <a href="tel:${apartment.contact_phone}" class="btn btn-primary btn-contact">
                        <i class="fas fa-phone"></i> Call Now
                    </a>
                    ` : ''}
                    ${apartment.contact_whatsapp ? `
                    <a href="https://wa.me/${apartment.contact_whatsapp.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-success btn-contact">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </a>
                    ` : ''}
                    ${!apartment.contact_phone && !apartment.contact_whatsapp ? `
                    <p style="text-align: center; color: #6c757d;">Contact information not available</p>
                    ` : ''}
                </div>
            </div>
        `;
    }

    updateResultsCount() {
        const countElement = document.getElementById('results-count');
        const count = this.filteredApartments.length;
        const total = this.apartments.length;
        
        countElement.textContent = count === total 
            ? `${count} apartment${count !== 1 ? 's' : ''} found`
            : `${count} of ${total} apartments`;
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const grid = document.getElementById('apartments-grid');
        
        if (show) {
            loading.style.display = 'block';
            grid.style.display = 'none';
        } else {
            loading.style.display = 'none';
            grid.style.display = 'grid';
        }
    }

    showError(message) {
        const grid = document.getElementById('apartments-grid');
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: #dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.7;"></i>
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="userDashboard.loadApartments()" class="btn btn-primary" style="margin-top: 16px;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.userDashboard = new UserDashboard();
});