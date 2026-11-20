// =================================================================
// HOTEL DRS DELUXE - NATIVE NODE.JS HTTP SERVER (ZERO DEPENDENCY)
// =================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// In-Memory Token Store for Admin Sessions
const activeTokens = new Set();

// Database Helpers (Atomic Read & Write)
function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { settings: {}, rooms: [], halls: [], bookings: [], partyPackages: [], testimonials: [] };
  }
}

function writeDb(data) {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing to database:', err);
    return false;
  }
}

// Response Helpers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
}

// Request Body Parser
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Auth Verification Helper
function verifyAdminToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  return activeTokens.has(token);
}

// HTTP Server Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // ==================== API ROUTES ====================

  // Auth: POST /api/auth/login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseJsonBody(req);
    const { loginNo, password } = body;
    const db = readDb();
    const settings = db.settings || {};

    const expectedLoginNo = settings.adminLoginNo || '8292749943';
    const expectedPassword = settings.adminPassword || 'admin';

    if (String(loginNo).trim() === expectedLoginNo && String(password).trim() === expectedPassword) {
      const token = 'drs_token_' + crypto.randomBytes(24).toString('hex');
      activeTokens.add(token);
      return sendJson(res, 200, {
        success: true,
        message: 'Admin login successful',
        token,
        admin: { loginNo: expectedLoginNo, hotelName: settings.name || 'HOTEL DRS DELUXE' }
      });
    }

    return sendJson(res, 401, {
      success: false,
      message: 'Invalid Login Number or Password. Please try again.'
    });
  }

  // Auth: POST /api/auth/logout
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/, '').trim();
      activeTokens.delete(token);
    }
    return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
  }

  // Auth: GET /api/auth/verify
  if (pathname === '/api/auth/verify' && method === 'GET') {
    return sendJson(res, 200, { authenticated: verifyAdminToken(req) });
  }

  // Settings: GET /api/settings
  if (pathname === '/api/settings' && method === 'GET') {
    const db = readDb();
    const settings = { ...db.settings };
    delete settings.adminPassword;
    return sendJson(res, 200, { success: true, settings });
  }

  // Settings: PUT /api/settings (Admin Only)
  if (pathname === '/api/settings' && method === 'PUT') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const updates = await parseJsonBody(req);
    const db = readDb();
    const currentPassword = db.settings.adminPassword;
    const currentLoginNo = db.settings.adminLoginNo;

    db.settings = {
      ...db.settings,
      ...updates,
      adminPassword: updates.adminPassword || currentPassword,
      adminLoginNo: updates.adminLoginNo || currentLoginNo
    };

    writeDb(db);
    const safeSettings = { ...db.settings };
    delete safeSettings.adminPassword;
    return sendJson(res, 200, { success: true, message: 'Settings updated successfully', settings: safeSettings });
  }

  // Rooms: GET /api/rooms
  if (pathname === '/api/rooms' && method === 'GET') {
    const db = readDb();
    let rooms = db.rooms || [];
    const cat = parsedUrl.query.category;
    if (cat && cat !== 'All') {
      rooms = rooms.filter(r => r.category.toLowerCase() === cat.toLowerCase());
    }
    return sendJson(res, 200, { success: true, count: rooms.length, rooms });
  }

  // Rooms: POST /api/rooms (Admin Only)
  if (pathname === '/api/rooms' && method === 'POST') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const body = await parseJsonBody(req);
    const db = readDb();

    const newRoom = {
      id: 'room-' + Date.now(),
      title: body.title || 'New Luxury Room',
      category: body.category || 'Deluxe',
      price: Number(body.price) || 2000,
      originalPrice: Number(body.originalPrice) || Math.round(Number(body.price) * 1.25),
      bedType: body.bedType || 'King Size Bed',
      maxGuests: Number(body.maxGuests) || 2,
      size: body.size || '300 sq.ft',
      view: body.view || 'City View',
      image: body.image || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
      amenities: Array.isArray(body.amenities) ? body.amenities : (body.amenities || '').split(',').map(s => s.trim()).filter(Boolean),
      description: body.description || 'Spacious, luxury room at Hotel DRS Deluxe.',
      status: body.status || 'Available',
      featured: Boolean(body.featured)
    };

    db.rooms = db.rooms || [];
    db.rooms.unshift(newRoom);
    writeDb(db);

    return sendJson(res, 201, { success: true, message: 'Room added successfully', room: newRoom });
  }

  // Rooms: PUT /api/rooms/:id
  const roomPutMatch = pathname.match(/^\/api\/rooms\/([^/]+)$/);
  if (roomPutMatch && method === 'PUT') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const roomId = roomPutMatch[1];
    const body = await parseJsonBody(req);
    const db = readDb();
    const index = (db.rooms || []).findIndex(r => r.id === roomId);

    if (index === -1) {
      return sendJson(res, 404, { success: false, message: 'Room not found' });
    }

    const existing = db.rooms[index];
    const updatedRoom = {
      ...existing,
      ...body,
      price: body.price !== undefined ? Number(body.price) : existing.price,
      originalPrice: body.originalPrice !== undefined ? Number(body.originalPrice) : existing.originalPrice,
      maxGuests: body.maxGuests !== undefined ? Number(body.maxGuests) : existing.maxGuests,
      amenities: Array.isArray(body.amenities)
        ? body.amenities
        : (typeof body.amenities === 'string'
            ? body.amenities.split(',').map(s => s.trim()).filter(Boolean)
            : existing.amenities)
    };

    db.rooms[index] = updatedRoom;
    writeDb(db);
    return sendJson(res, 200, { success: true, message: 'Room updated successfully', room: updatedRoom });
  }

  // Rooms: DELETE /api/rooms/:id
  const roomDelMatch = pathname.match(/^\/api\/rooms\/([^/]+)$/);
  if (roomDelMatch && method === 'DELETE') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const roomId = roomDelMatch[1];
    const db = readDb();
    const initLen = (db.rooms || []).length;
    db.rooms = (db.rooms || []).filter(r => r.id !== roomId);

    if (db.rooms.length === initLen) {
      return sendJson(res, 404, { success: false, message: 'Room not found' });
    }

    writeDb(db);
    return sendJson(res, 200, { success: true, message: 'Room deleted successfully' });
  }

  // Halls: GET /api/halls
  if (pathname === '/api/halls' && method === 'GET') {
    const db = readDb();
    return sendJson(res, 200, { success: true, count: (db.halls || []).length, halls: db.halls || [] });
  }

  // Halls: POST /api/halls (Admin Only)
  if (pathname === '/api/halls' && method === 'POST') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const body = await parseJsonBody(req);
    const db = readDb();

    const newHall = {
      id: 'hall-' + Date.now(),
      name: body.name || 'New Banquet Hall',
      category: body.category || 'Party & Celebration Venue',
      tagline: body.tagline || 'Grand celebrations at Hotel DRS Deluxe',
      seatingCapacity: Number(body.seatingCapacity) || 100,
      floatingCapacity: Number(body.floatingCapacity) || 200,
      pricePerDay: Number(body.pricePerDay) || 20000,
      pricePerPlate: Number(body.pricePerPlate) || 500,
      image: body.image || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
      suitableFor: Array.isArray(body.suitableFor) ? body.suitableFor : (body.suitableFor || '').split(',').map(s => s.trim()).filter(Boolean),
      facilities: Array.isArray(body.facilities) ? body.facilities : (body.facilities || '').split(',').map(s => s.trim()).filter(Boolean),
      description: body.description || 'Luxurious hall suitable for parties and weddings.',
      status: body.status || 'Available'
    };

    db.halls = db.halls || [];
    db.halls.unshift(newHall);
    writeDb(db);

    return sendJson(res, 201, { success: true, message: 'Hall added successfully', hall: newHall });
  }

  // Halls: PUT /api/halls/:id
  const hallPutMatch = pathname.match(/^\/api\/halls\/([^/]+)$/);
  if (hallPutMatch && method === 'PUT') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const hallId = hallPutMatch[1];
    const body = await parseJsonBody(req);
    const db = readDb();
    const index = (db.halls || []).findIndex(h => h.id === hallId);

    if (index === -1) {
      return sendJson(res, 404, { success: false, message: 'Hall not found' });
    }

    const existing = db.halls[index];
    const updatedHall = {
      ...existing,
      ...body,
      seatingCapacity: body.seatingCapacity !== undefined ? Number(body.seatingCapacity) : existing.seatingCapacity,
      floatingCapacity: body.floatingCapacity !== undefined ? Number(body.floatingCapacity) : existing.floatingCapacity,
      pricePerDay: body.pricePerDay !== undefined ? Number(body.pricePerDay) : existing.pricePerDay,
      pricePerPlate: body.pricePerPlate !== undefined ? Number(body.pricePerPlate) : existing.pricePerPlate,
      suitableFor: Array.isArray(body.suitableFor)
        ? body.suitableFor
        : (typeof body.suitableFor === 'string'
            ? body.suitableFor.split(',').map(s => s.trim()).filter(Boolean)
            : existing.suitableFor),
      facilities: Array.isArray(body.facilities)
        ? body.facilities
        : (typeof body.facilities === 'string'
            ? body.facilities.split(',').map(s => s.trim()).filter(Boolean)
            : existing.facilities)
    };

    db.halls[index] = updatedHall;
    writeDb(db);
    return sendJson(res, 200, { success: true, message: 'Hall updated successfully', hall: updatedHall });
  }

  // Halls: DELETE /api/halls/:id
  const hallDelMatch = pathname.match(/^\/api\/halls\/([^/]+)$/);
  if (hallDelMatch && method === 'DELETE') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const hallId = hallDelMatch[1];
    const db = readDb();
    const initLen = (db.halls || []).length;
    db.halls = (db.halls || []).filter(h => h.id !== hallId);

    if (db.halls.length === initLen) {
      return sendJson(res, 404, { success: false, message: 'Hall not found' });
    }

    writeDb(db);
    return sendJson(res, 200, { success: true, message: 'Hall deleted successfully' });
  }

  // Bookings: POST /api/bookings (Public Inquiry / Reservation)
  if (pathname === '/api/bookings' && method === 'POST') {
    const body = await parseJsonBody(req);
    const {
      type, itemId, itemTitle, guestName, phone, email,
      checkIn, checkOut, eventDate, eventType, guestsCount,
      roomsCount, foodPreference, specialRequest, totalAmount
    } = body;

    if (!guestName || !phone) {
      return sendJson(res, 400, { success: false, message: 'Guest name and phone number are required.' });
    }

    const db = readDb();
    const newBooking = {
      id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
      type: type || 'room',
      itemId: itemId || null,
      itemTitle: itemTitle || (type === 'hall' ? 'Party Hall Celebration' : 'Hotel Room Booking'),
      guestName,
      phone,
      email: email || '',
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      eventDate: eventDate || null,
      eventType: eventType || (type === 'hall' ? 'Party Celebration' : null),
      guestsCount: Number(guestsCount) || 1,
      roomsCount: Number(roomsCount) || 1,
      foodPreference: foodPreference || '',
      totalAmount: Number(totalAmount) || 0,
      specialRequest: specialRequest || '',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    db.bookings = db.bookings || [];
    db.bookings.unshift(newBooking);
    writeDb(db);

    return sendJson(res, 201, {
      success: true,
      message: 'Booking inquiry submitted successfully!',
      booking: newBooking
    });
  }

  // Bookings: GET /api/bookings (Admin Only)
  if (pathname === '/api/bookings' && method === 'GET') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const db = readDb();
    let list = db.bookings || [];
    if (parsedUrl.query.type) {
      list = list.filter(b => b.type === parsedUrl.query.type);
    }
    if (parsedUrl.query.status && parsedUrl.query.status !== 'All') {
      list = list.filter(b => b.status.toLowerCase() === parsedUrl.query.status.toLowerCase());
    }
    return sendJson(res, 200, { success: true, count: list.length, bookings: list });
  }

  // Bookings: PUT /api/bookings/:id/status (Admin Only)
  const statusMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/status$/);
  if (statusMatch && method === 'PUT') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const bookingId = statusMatch[1];
    const body = await parseJsonBody(req);
    const db = readDb();
    const booking = (db.bookings || []).find(b => b.id === bookingId);

    if (!booking) {
      return sendJson(res, 404, { success: false, message: 'Booking not found' });
    }

    booking.status = body.status || booking.status;
    writeDb(db);
    return sendJson(res, 200, { success: true, message: `Status updated to ${booking.status}`, booking });
  }

  // Bookings: POST /api/admin/bookings (Manual Walk-in)
  if (pathname === '/api/admin/bookings' && method === 'POST') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const body = await parseJsonBody(req);
    const db = readDb();

    const newBooking = {
      id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
      type: body.type || 'room',
      itemId: body.itemId || null,
      itemTitle: body.itemTitle || 'Manual Booking',
      guestName: body.guestName,
      phone: body.phone,
      email: body.email || '',
      checkIn: body.checkIn || null,
      checkOut: body.checkOut || null,
      eventDate: body.eventDate || null,
      eventType: body.eventType || null,
      guestsCount: Number(body.guestsCount) || 1,
      roomsCount: Number(body.roomsCount) || 1,
      totalAmount: Number(body.totalAmount) || 0,
      specialRequest: body.specialRequest || 'Walk-in / Phone reservation',
      status: body.status || 'Confirmed',
      createdAt: new Date().toISOString()
    };

    db.bookings = db.bookings || [];
    db.bookings.unshift(newBooking);
    writeDb(db);
    return sendJson(res, 201, { success: true, message: 'Manual booking created', booking: newBooking });
  }

  // Bookings: DELETE /api/bookings/:id
  const bookingDelMatch = pathname.match(/^\/api\/bookings\/([^/]+)$/);
  if (bookingDelMatch && method === 'DELETE') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const bookingId = bookingDelMatch[1];
    const db = readDb();
    const initLen = (db.bookings || []).length;
    db.bookings = (db.bookings || []).filter(b => b.id !== bookingId);

    if (db.bookings.length === initLen) {
      return sendJson(res, 404, { success: false, message: 'Booking not found' });
    }

    writeDb(db);
    return sendJson(res, 200, { success: true, message: 'Booking deleted successfully' });
  }

  // Stats: GET /api/stats (Admin Only)
  if (pathname === '/api/stats' && method === 'GET') {
    if (!verifyAdminToken(req)) {
      return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    }
    const db = readDb();
    const rooms = db.rooms || [];
    const halls = db.halls || [];
    const bookings = db.bookings || [];

    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === 'Available').length;
    const totalHalls = halls.length;
    const totalBookings = bookings.length;
    const roomBookings = bookings.filter(b => b.type === 'room').length;
    const hallBookings = bookings.filter(b => b.type === 'hall').length;
    const pendingInquiries = bookings.filter(b => b.status === 'Pending').length;
    const confirmedBookings = bookings.filter(b => b.status === 'Confirmed').length;

    const estimatedRevenue = bookings
      .filter(b => b.status === 'Confirmed' || b.status === 'Completed')
      .reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

    return sendJson(res, 200, {
      success: true,
      stats: {
        totalRooms, availableRooms, totalHalls,
        totalBookings, roomBookings, hallBookings,
        pendingInquiries, confirmedBookings, estimatedRevenue
      }
    });
  }

  // Packages: GET & Admin Management
  if (pathname === '/api/packages' && method === 'GET') {
    const db = readDb();
    return sendJson(res, 200, { success: true, packages: db.partyPackages || [] });
  }

  if (pathname === '/api/packages' && method === 'POST') {
    if (!verifyAdminToken(req)) return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    const body = await parseJsonBody(req);
    const db = readDb();
    db.partyPackages = db.partyPackages || [];
    db.partyPackages.push({
      title: body.title || 'New Package',
      eventType: body.eventType || 'Celebrations',
      price: body.price || 'Contact for price',
      includes: Array.isArray(body.includes) ? body.includes : (body.includes || '').split(',').map(s => s.trim()).filter(Boolean)
    });
    writeDb(db);
    return sendJson(res, 201, { success: true, message: 'Package added successfully' });
  }

  // Testimonials: GET & Admin Management
  if (pathname === '/api/testimonials' && method === 'GET') {
    const db = readDb();
    return sendJson(res, 200, { success: true, testimonials: db.testimonials || [] });
  }

  if (pathname === '/api/testimonials' && method === 'POST') {
    if (!verifyAdminToken(req)) return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    const body = await parseJsonBody(req);
    const db = readDb();
    db.testimonials = db.testimonials || [];
    db.testimonials.unshift({
      name: body.name || 'Valued Guest',
      role: body.role || 'Hotel Guest',
      rating: Number(body.rating) || 5,
      comment: body.comment || 'Wonderful stay and grand celebration experience.'
    });
    writeDb(db);
    return sendJson(res, 201, { success: true, message: 'Review added successfully' });
  }

  // Gallery: GET & Admin Management
  if (pathname === '/api/gallery' && method === 'GET') {
    const db = readDb();
    return sendJson(res, 200, { success: true, gallery: db.gallery || [] });
  }

  if (pathname === '/api/gallery' && method === 'POST') {
    if (!verifyAdminToken(req)) return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    const body = await parseJsonBody(req);
    const db = readDb();
    db.gallery = db.gallery || [];
    const item = {
      id: 'gal-' + Date.now(),
      title: body.title || 'Hotel DRS Deluxe Photo',
      category: body.category || 'Rooms',
      image: body.image || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
    };
    db.gallery.unshift(item);
    writeDb(db);
    return sendJson(res, 201, { success: true, message: 'Gallery photo added', item });
  }

  const galDelMatch = pathname.match(/^\/api\/gallery\/([^/]+)$/);
  if (galDelMatch && method === 'DELETE') {
    if (!verifyAdminToken(req)) return sendJson(res, 403, { success: false, message: 'Admin authentication required.' });
    const galId = galDelMatch[1];
    const db = readDb();
    db.gallery = (db.gallery || []).filter(g => g.id !== galId);
    writeDb(db);
    return sendJson(res, 200, { success: true, message: 'Gallery photo removed' });
  }

  // ==================== STATIC FILE SERVING ====================

  if (pathname === '/admin' || pathname === '/admin/') {
    return sendFile(res, path.join(PUBLIC_DIR, 'admin.html'), 'text/html; charset=utf-8');
  }

  // Sanitize path to prevent directory traversal
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const targetFile = path.join(PUBLIC_DIR, safePath);
  const ext = path.extname(targetFile).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(targetFile, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, targetFile, contentType);
    } else {
      // Fallback to index.html for client-side routing
      sendFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html; charset=utf-8');
    }
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` ✨ HOTEL DRS DELUXE Server active on http://localhost:${PORT}`);
  console.log(` 🌐 Website:        http://localhost:${PORT}`);
  console.log(` 🔑 Admin Portal:   http://localhost:${PORT}/admin`);
  console.log(` 📱 Admin Login No: 8292749943`);
  console.log(` 🔒 Admin Password: admin`);
  console.log(`=======================================================`);
});
