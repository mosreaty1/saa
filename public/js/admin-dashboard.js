 
// Admin Dashboard JavaScript
// File: static/js/admin-dashboard.js

class AdminDashboard {
    constructor() {
        this.apartments = [];
        this.currentApartment = null;
        this.editMode = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadApartments();
    }

    bindEvents() {
        // Add apartment button
        document.getElementById('add-apartment-btn').addEventListener('click', () => {
            this.showApartmentForm();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Form submit
        document.getElementById('apartment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Cancel button
        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.hideApartmentForm();
        });

        // Modal close
        const modal = document.getElementById('apartment-form-modal');
        const closeBtn = modal.querySelector('.close');
        
        closeBtn.addEventListener('click', () => {
            this.hideApartmentForm();
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideApartmentForm();
            }
        });

        // Photo upload
        document.getElementById('photos').addEventListener('change', (e) => {
            this.handlePhotoUpload(e.target.files);
        });
    }

    async loadApartments() {
        try {
            const response = await fetch('/api/admin/apartments');
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/admin/login';
                    return;
                }
                throw new Error('Failed to load apartments');
            }

            this.apartments = await response.json();
            this.renderApartments();
            this.updateStatistics();
        } catch (error) {
            console.error('Error loading apartments:', error);
            this.showError('Failed to load apartments. Please try again.');
        }
    }

    renderApartments() {
        const tbody = document.querySelector('#apartments-table tbody');
        
        if (this.apartments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 60px; color: #6c757d;">
                        <i class="fas fa-home" style="font-size: 3rem; margin-bottom: 16px; display: block; opacity: 0.3;"></i>
                        No apartments found. Click "Add Apartment" to get started.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.apartments.map(apartment => `
            <tr>
                <td>
                    ${apartment.photos && apartment.photos.length > 0 
                        ? `<img src="${apartment.photos[0]}" alt="${apartment.title}" class="table-photo" onerror="this.style.display='none'">`
                        : '<div class="table-photo" style="background: #f8f9fa; display: flex; align-items: center; justify-content: center; color: #6c757d;"><i class="fas fa-home"></i></div>'
                    }
                </td>
                <td>
                    <strong>${this.escapeHtml(apartment.title)}</strong>
                    <br><small>${apartment.room_count} rooms, ${apartment.bed_count} beds</small>
                </td>
                <td>${this.escapeHtml(apartment.address)}</td>
                <td>${apartment.room_count}</td>
                <td>$${apartment.monthly_price.toLocaleString()}</td>
                <td>
                    <span class="status-badge ${apartment.available ? 'status-available' : 'status-rented'}">
                        ${apartment.available ? 'Available' : 'Rented'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-primary" onclick="adminDashboard.editApartment('${apartment._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteApartment('${apartment._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateStatistics() {
        const total = this.apartments.length;
        const available = this.apartments.filter(apt => apt.available).length;
        const rented = total - available;

        document.getElementById('total-apartments').textContent = total;
        document.getElementById('available-apartments').textContent = available;
        document.getElementById('rented-apartments').textContent = rented;
    }

    showApartmentForm(apartment = null) {
        this.currentApartment = apartment;
        this.editMode = !!apartment;

        const modal = document.getElementById('apartment-form-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('apartment-form');

        title.textContent = this.editMode ? 'Edit Apartment' : 'Add New Apartment';
        
        if (this.editMode) {
            this.populateForm(apartment);
        } else {
            form.reset();
            document.getElementById('photo-preview').innerHTML = '';
        }

        modal.style.display = 'block';
    }

    hideApartmentForm() {
        const modal = document.getElementById('apartment-form-modal');
        modal.style.display = 'none';
        this.currentApartment = null;
        this.editMode = false;
    }

    populateForm(apartment) {
        // Populate basic fields
        document.getElementById('apartment-id').value = apartment._id;
        document.getElementById('title').value = apartment.title;
        document.getElementById('description').value = apartment.description || '';
        document.getElementById('address').value = apartment.address;
        document.getElementById('room-count').value = apartment.room_count;
        document.getElementById('bed-count').value = apartment.bed_count;
        document.getElementById('bathroom-count').value = apartment.bathroom_count || 1;
        document.getElementById('monthly-price').value = apartment.monthly_price;
        document.getElementById('area-sqm').value = apartment.area_sqm || '';
        document.getElementById('floor').value = apartment.floor || '';
        document.getElementById('available-from').value = apartment.available_from || '';
        document.getElementById('available-to').value = apartment.available_to || '';
        document.getElementById('contact-phone').value = apartment.contact_phone || '';
        document.getElementById('contact-whatsapp').value = apartment.contact_whatsapp || '';

        // Populate checkboxes
        document.getElementById('furnished').checked = apartment.furnished || false;
        document.getElementById('parking').checked = apartment.parking || false;
        document.getElementById('pets-allowed').checked = apartment.pets_allowed || false;
        document.getElementById('available').checked = apartment.available !== false;

        // Populate amenities
        if (apartment.amenities && apartment.amenities.length > 0) {
            document.getElementById('amenities').value = apartment.amenities.join(', ');
        }

        // Show existing photos
        const photoPreview = document.getElementById('photo-preview');
        if (apartment.photos && apartment.photos.length > 0) {
            photoPreview.innerHTML = apartment.photos.map(photo => 
                `<img src="${photo}" alt="Apartment photo">`
            ).join('');
        }
    }

    async handleFormSubmit() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        try {
            const url = this.editMode 
                ? `/api/admin/apartments/${this.currentApartment._id}`
                : '/api/admin/apartments';
                
            const method = this.editMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success || response.ok) {
                this.showSuccess(this.editMode ? 'Apartment updated successfully!' : 'Apartment added successfully!');
                this.hideApartmentForm();
                this.loadApartments();
            } else {
                this.showError(data.error || 'Failed to save apartment');
            }
        } catch (error) {
            console.error('Error saving apartment:', error);
            this.showError('Failed to save apartment. Please try again.');
        }
    }

    getFormData() {
        const amenitiesText = document.getElementById('amenities').value.trim();
        const amenities = amenitiesText ? amenitiesText.split(',').map(a => a.trim()).filter(a => a) : [];

        // Get existing photos from preview (for edit mode)
        const existingPhotos = [];
        const photoPreview = document.getElementById('photo-preview');
        const existingImages = photoPreview.querySelectorAll('img');
        existingImages.forEach(img => {
            existingPhotos.push(img.src);
        });

        return {
            title: document.getElementById('title').value.trim(),
            description: document.getElementById('description').value.trim(),
            address: document.getElementById('address').value.trim(),
            room_count: parseInt(document.getElementById('room-count').value),
            bed_count: parseInt(document.getElementById('bed-count').value),
            bathroom_count: parseInt(document.getElementById('bathroom-count').value) || 1,
            monthly_price: parseFloat(document.getElementById('monthly-price').value),
            area_sqm: parseFloat(document.getElementById('area-sqm').value) || 0,
            floor: document.getElementById('floor').value.trim(),
            available_from: document.getElementById('available-from').value,
            available_to: document.getElementById('available-to').value,
            contact_phone: document.getElementById('contact-phone').value.trim(),
            contact_whatsapp: document.getElementById('contact-whatsapp').value.trim(),
            furnished: document.getElementById('furnished').checked,
            parking: document.getElementById('parking').checked,
            pets_allowed: document.getElementById('pets-allowed').checked,
            available: document.getElementById('available').checked,
            amenities: amenities,
            photos: existingPhotos
        };
    }

    validateForm(data) {
        if (!data.title) {
            this.showError('Please enter apartment title');
            return false;
        }
        if (!data.address) {
            this.showError('Please enter apartment address');
            return false;
        }
        if (!data.room_count || data.room_count < 1) {
            this.showError('Please enter valid room count');
            return false;
        }
        if (!data.bed_count || data.bed_count < 1) {
            this.showError('Please enter valid bedroom count');
            return false;
        }
        if (!data.monthly_price || data.monthly_price <= 0) {
            this.showError('Please enter valid monthly price');
            return false;
        }
        return true;
    }

    async handlePhotoUpload(files) {
        const photoPreview = document.getElementById('photo-preview');
        
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();

                    if (data.success) {
                        const img = document.createElement('img');
                        img.src = data.file_url;
                        img.alt = 'Apartment photo';
                        photoPreview.appendChild(img);
                    } else {
                        this.showError(`Failed to upload ${file.name}: ${data.error}`);
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    this.showError(`Failed to upload ${file.name}`);
                }
            }
        }
    }

    async editApartment(apartmentId) {
        const apartment = this.apartments.find(apt => apt._id === apartmentId);
        if (apartment) {
            this.showApartmentForm(apartment);
        }
    }

    async deleteApartment(apartmentId) {
        const apartment = this.apartments.find(apt => apt._id === apartmentId);
        
        if (!apartment) {
            this.showError('Apartment not found');
            return;
        }

        if (!confirm(`Are you sure you want to delete "${apartment.title}"? This cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/apartments/${apartmentId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Apartment deleted successfully!');
                this.loadApartments();
            } else {
                this.showError(data.error || 'Failed to delete apartment');
            }
        } catch (error) {
            console.error('Error deleting apartment:', error);
            this.showError('Failed to delete apartment. Please try again.');
        }
    }

    async handleLogout() {
        if (!confirm('Are you sure you want to logout?')) {
            return;
        }

        try {
            const response = await fetch('/api/admin/logout', {
                method: 'POST'
            });

            if (response.ok) {
                window.location.href = '/admin/login';
            }
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/admin/login';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification alert alert-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2000;
            min-width: 300px;
            max-width: 500px;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Allow manual close
        notification.addEventListener('click', () => {
            notification.remove();
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});