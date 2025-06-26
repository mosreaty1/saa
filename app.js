 // Apartment Rental Management System - Node.js Backend
// File: app.js

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Connection
const MONGO_URI = "mongodb://alsariti1:446655@ac-2z9moju-shard-00-00.n73kagb.mongodb.net:27017,ac-2z9moju-shard-00-01.n73kagb.mongodb.net:27017,ac-2z9moju-shard-00-02.n73kagb.mongodb.net:27017/?replicaSet=atlas-s1s619-shard-0&ssl=true&authSource=admin";

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('MongoDB connection successful!');
    createDefaultAdmin();
})
.catch((error) => {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
});

// Schemas
const apartmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    address: { type: String, required: true },
    room_count: { type: Number, required: true },
    bed_count: { type: Number, required: true },
    bathroom_count: { type: Number, default: 1 },
    monthly_price: { type: Number, required: true },
    area_sqm: { type: Number, default: 0 },
    floor: { type: String, default: '' },
    furnished: { type: Boolean, default: false },
    parking: { type: Boolean, default: false },
    pets_allowed: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
    available_from: { type: String, default: '' },
    available_to: { type: String, default: '' },
    contact_phone: { type: String, default: '' },
    contact_whatsapp: { type: String, default: '' },
    photos: [{ type: String }],
    amenities: [{ type: String }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now }
});

const Apartment = mongoose.model('Apartment', apartmentSchema);
const User = mongoose.model('User', userSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGO_URI
    }),
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Create uploads directory
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, JPG, PNG and GIF files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Template engine setup (using EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware for admin authentication
const requireAuth = (req, res, next) => {
    if (!req.session.user_id) {
        return res.redirect('/admin/login');
    }
    next();
};

const requireAuthAPI = (req, res, next) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Create default admin user
async function createDefaultAdmin() {
    try {
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const adminUser = new User({
                username: 'admin',
                password: hashedPassword,
                role: 'admin'
            });
            await adminUser.save();
            console.log('Default admin user created (username: admin, password: admin123)');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

// Routes

// User dashboard - main page
app.get('/', (req, res) => {
    res.render('user_dashboard');
});

// Admin dashboard - protected route
app.get('/admin', requireAuth, (req, res) => {
    res.render('admin_dashboard');
});

// Admin login page
app.get('/admin/login', (req, res) => {
    res.render('admin_login');
});

// Admin login API endpoint
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user_id = user._id.toString();
            req.session.username = user.username;
            req.session.role = user.role;
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin logout API endpoint
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logout successful' });
    });
});

// Get all apartments with optional filters
app.get('/api/apartments', async (req, res) => {
    try {
        const { min_price, max_price, rooms, beds, location } = req.query;
        
        // Build query
        let query = { available: true };
        
        if (min_price !== undefined || max_price !== undefined) {
            query.monthly_price = {};
            if (min_price !== undefined) {
                query.monthly_price.$gte = parseFloat(min_price);
            }
            if (max_price !== undefined) {
                query.monthly_price.$lte = parseFloat(max_price);
            }
        }
        
        if (rooms !== undefined) {
            query.room_count = parseInt(rooms);
        }
        
        if (beds !== undefined) {
            query.bed_count = parseInt(beds);
        }
        
        if (location) {
            query.address = { $regex: location, $options: 'i' };
        }
        
        const apartments = await Apartment.find(query);
        res.json(apartments);
        
    } catch (error) {
        console.error('Error fetching apartments:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single apartment details
app.get('/api/apartments/:id', async (req, res) => {
    try {
        const apartment = await Apartment.findById(req.params.id);
        if (apartment) {
            res.json(apartment);
        } else {
            res.status(404).json({ error: 'Apartment not found' });
        }
    } catch (error) {
        console.error('Error fetching apartment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin endpoint to get all apartments
app.get('/api/admin/apartments', requireAuthAPI, async (req, res) => {
    try {
        const apartments = await Apartment.find({});
        res.json(apartments);
    } catch (error) {
        console.error('Error fetching apartments:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin endpoint to create new apartment
app.post('/api/admin/apartments', requireAuthAPI, async (req, res) => {
    try {
        const apartmentData = {
            ...req.body,
            room_count: parseInt(req.body.room_count),
            bed_count: parseInt(req.body.bed_count),
            bathroom_count: parseInt(req.body.bathroom_count) || 1,
            monthly_price: parseFloat(req.body.monthly_price),
            area_sqm: parseFloat(req.body.area_sqm) || 0,
            furnished: req.body.furnished === true || req.body.furnished === 'true',
            parking: req.body.parking === true || req.body.parking === 'true',
            pets_allowed: req.body.pets_allowed === true || req.body.pets_allowed === 'true',
            available: req.body.available !== false && req.body.available !== 'false',
            amenities: Array.isArray(req.body.amenities) ? req.body.amenities : [],
            photos: Array.isArray(req.body.photos) ? req.body.photos : [],
            updated_at: new Date()
        };
        
        const apartment = new Apartment(apartmentData);
        const savedApartment = await apartment.save();
        
        res.status(201).json({ success: true, apartment: savedApartment });
        
    } catch (error) {
        console.error('Error creating apartment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin endpoint to update apartment
app.put('/api/admin/apartments/:id', requireAuthAPI, async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            room_count: parseInt(req.body.room_count),
            bed_count: parseInt(req.body.bed_count),
            bathroom_count: parseInt(req.body.bathroom_count) || 1,
            monthly_price: parseFloat(req.body.monthly_price),
            area_sqm: parseFloat(req.body.area_sqm) || 0,
            furnished: req.body.furnished === true || req.body.furnished === 'true',
            parking: req.body.parking === true || req.body.parking === 'true',
            pets_allowed: req.body.pets_allowed === true || req.body.pets_allowed === 'true',
            available: req.body.available !== false && req.body.available !== 'false',
            amenities: Array.isArray(req.body.amenities) ? req.body.amenities : [],
            photos: Array.isArray(req.body.photos) ? req.body.photos : [],
            updated_at: new Date()
        };
        
        const apartment = await Apartment.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        if (apartment) {
            res.json({ success: true, message: 'Apartment updated successfully' });
        } else {
            res.status(404).json({ error: 'Apartment not found' });
        }
        
    } catch (error) {
        console.error('Error updating apartment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin endpoint to delete apartment
app.delete('/api/admin/apartments/:id', requireAuthAPI, async (req, res) => {
    try {
        const apartment = await Apartment.findByIdAndDelete(req.params.id);
        
        if (apartment) {
            // Delete associated photos from filesystem
            if (apartment.photos && apartment.photos.length > 0) {
                apartment.photos.forEach(photo => {
                    const filename = path.basename(photo);
                    const filepath = path.join(uploadsDir, filename);
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }
                });
            }
            
            res.json({ success: true, message: 'Apartment deleted successfully' });
        } else {
            res.status(404).json({ error: 'Apartment not found' });
        }
        
    } catch (error) {
        console.error('Error deleting apartment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload image endpoint
app.post('/api/upload', requireAuthAPI, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, file_url: fileUrl });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
