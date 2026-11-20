// =================================================================
// HOTEL DRS DELUXE - ADMIN DASHBOARD LOGIC
// Admin ID: 8292749943 | Pass: admin
// =================================================================

let adminState = {
  token: localStorage.getItem('drs_admin_token') || null,
  rooms: [],
  halls: [],
  bookings: [],
  settings: {},
  stats: {}
};

// Curated Luxury Presets for Easy Creation
const ROOM_PRESETS = [
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80"
];

const HALL_PRESETS = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80"
];

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// Check Authentication Status
async function checkAuth() {
  if (!adminState.token) {
    showLoginScreen();
    return;
  }

  try {
    const res = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await res.json();
    if (data.authenticated) {
      showAdminApp();
      loadAllAdminData();
    } else {
      showLoginScreen();
    }
  } catch (err) {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('adminApp').classList.add('hidden');
  const loginInput = document.getElementById('adminLoginNo');
  const passInput = document.getElementById('adminPassword');
  if (loginInput) loginInput.value = '';
  if (passInput) passInput.value = '';
}

function showAdminApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');
}

// ==================== AUTHENTICATION HANDLERS ====================
async function handleAdminLogin(e) {
  e.preventDefault();
  const loginNo = document.getElementById('adminLoginNo').value.trim();
  const password = document.getElementById('adminPassword').value.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginNo, password })
    });

    const data = await res.json();
    if (data.success && data.token) {
      adminState.token = data.token;
      localStorage.setItem('drs_admin_token', data.token);
      showAdminApp();
      loadAllAdminData();
    } else {
      alert(data.message || 'Login failed. Please check phone number and password.');
    }
  } catch (err) {
    alert('Server connection error. Please make sure server is running.');
  }
}

async function handleAdminLogout() {
  if (!confirm('Are you sure you want to sign out of Hotel DRS Deluxe admin?')) return;

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
  } catch (err) {
    // ignore
  }

  adminState.token = null;
  localStorage.removeItem('drs_admin_token');
  showLoginScreen();
}

// ==================== TAB NAVIGATION ====================
function switchTab(tabName) {
  const tabs = ['dashboard', 'rooms', 'halls', 'bookings', 'gallery', 'settings'];
  
  // Hide all sections
  tabs.forEach(t => {
    const sec = document.getElementById(`view-${t}`);
    const btn = document.getElementById(`tabBtn-${t}`);
    if (sec) sec.classList.add('hidden');
    if (btn) {
      btn.classList.remove('active', 'text-gold-400', 'bg-gold-500/10', 'border', 'border-gold-500/30');
      btn.classList.add('text-slate-400');
    }
  });

  // Show active section
  const activeSec = document.getElementById(`view-${tabName}`);
  const activeBtn = document.getElementById(`tabBtn-${tabName}`);
  if (activeSec) activeSec.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('active', 'text-gold-400', 'bg-gold-500/10', 'border', 'border-gold-500/30');
    activeBtn.classList.remove('text-slate-400');
  }

  // Update Page Header
  const titleEl = document.getElementById('pageTitle');
  const descEl = document.getElementById('pageDescription');
  
  const titles = {
    dashboard: { title: 'Dashboard Overview', desc: 'Real-time performance, booking metrics, and hotel statistics.' },
    rooms: { title: 'Rooms & Suites Management', desc: 'Add rooms, modify pricing, upload images, and control availability.' },
    halls: { title: 'Party Halls & Banquet Control', desc: 'Manage venues for weddings, birthdays, anniversaries, and corporate events.' },
    bookings: { title: 'Reservations & Inquiries Feed', desc: 'View incoming guest requests, update status, and message clients.' },
    gallery: { title: 'Photo Gallery Management', desc: 'Add, view, and organize showcase images for Hotel DRS Deluxe.' },
    settings: { title: 'Theme, Location & Hotel Settings', desc: 'Control website theme color, Google Maps location, contact numbers, and policies.' }
  };

  if (titles[tabName]) {
    titleEl.textContent = titles[tabName].title;
    descEl.textContent = titles[tabName].desc;
  }
}

// ==================== DATA FETCHING ====================
async function loadAllAdminData() {
  await Promise.all([
    fetchStats(),
    fetchRooms(),
    fetchHalls(),
    fetchBookings(),
    fetchSettings(),
    fetchGallery()
  ]);
}

function refreshData() {
  loadAllAdminData();
}

async function authFetch(url, options = {}) {
  const headers = options.headers || {};
  headers['Authorization'] = `Bearer ${adminState.token}`;
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    handleAdminLogout();
    throw new Error('Session expired');
  }
  return res;
}

// 1. Fetch Stats
async function fetchStats() {
  try {
    const res = await authFetch('/api/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      adminState.stats = data.stats;
      renderStats(data.stats);
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

function renderStats(s) {
  document.getElementById('statTotalRooms').textContent = s.totalRooms || 0;
  document.getElementById('statAvailableRooms').textContent = s.availableRooms || 0;
  document.getElementById('statTotalHalls').textContent = s.totalHalls || 0;
  document.getElementById('statTotalBookings').textContent = s.totalBookings || 0;
  document.getElementById('statPendingInquiries').textContent = s.pendingInquiries || 0;
  document.getElementById('statEstimatedRevenue').textContent = `₹${(s.estimatedRevenue || 0).toLocaleString('en-IN')}`;
}

// 2. Fetch Rooms
async function fetchRooms() {
  try {
    const res = await fetch('/api/rooms');
    const data = await res.json();
    if (data.success) {
      adminState.rooms = data.rooms;
      renderAdminRooms(data.rooms);
    }
  } catch (err) {
    console.error('Error fetching rooms:', err);
  }
}

function renderAdminRooms(rooms) {
  const tbody = document.getElementById('adminRoomsTableBody');
  if (!tbody) return;

  if (rooms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">No rooms configured. Click "+ Add New Room" to add one.</td></tr>`;
    return;
  }

  tbody.innerHTML = rooms.map(room => {
    const isAvail = room.status === 'Available';
    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="p-3.5 flex items-center gap-3">
          <img src="${escapeHtml(room.image)}" class="w-12 h-10 object-cover rounded-lg border border-slate-700 shrink-0">
          <div>
            <div class="font-bold text-white">${escapeHtml(room.title)}</div>
            <div class="text-[10px] text-slate-400">${escapeHtml(room.size || '')} • ${escapeHtml(room.view || '')}</div>
          </div>
        </td>
        <td class="p-3.5 font-semibold text-gold-400">${escapeHtml(room.category)}</td>
        <td class="p-3.5 font-bold text-white">
          ₹${room.price.toLocaleString('en-IN')}
          ${room.originalPrice ? `<span class="text-[10px] text-slate-500 line-through block">₹${room.originalPrice.toLocaleString('en-IN')}</span>` : ''}
        </td>
        <td class="p-3.5 text-slate-300">
          <div>${room.maxGuests} Guests</div>
          <div class="text-[10px] text-slate-400">${escapeHtml(room.bedType || '')}</div>
        </td>
        <td class="p-3.5">
          <button onclick="toggleRoomStatus('${room.id}', '${room.status}')" class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${isAvail ? 'status-badge-available' : 'status-badge-booked'} transition hover:scale-105" title="Click to toggle Available/Booked">
            ${escapeHtml(room.status)}
          </button>
        </td>
        <td class="p-3.5 text-right space-x-1.5 whitespace-nowrap">
          <button onclick="openEditRoomModal('${room.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-gold-500 hover:text-black text-slate-200 transition font-semibold" title="Edit Room Details">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button onclick="handleDeleteRoom('${room.id}', '${escapeHtml(room.title)}')" class="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition font-semibold" title="Delete Room">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 3. Fetch Halls
async function fetchHalls() {
  try {
    const res = await fetch('/api/halls');
    const data = await res.json();
    if (data.success) {
      adminState.halls = data.halls;
      renderAdminHalls(data.halls);
    }
  } catch (err) {
    console.error('Error fetching halls:', err);
  }
}

function renderAdminHalls(halls) {
  const tbody = document.getElementById('adminHallsTableBody');
  if (!tbody) return;

  if (halls.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400">No banquet halls configured. Click "+ Add Party Hall" to add one.</td></tr>`;
    return;
  }

  tbody.innerHTML = halls.map(hall => {
    const eventsStr = (hall.suitableFor || []).slice(0, 3).join(', ');
    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="p-3.5 flex items-center gap-3">
          <img src="${escapeHtml(hall.image)}" class="w-14 h-10 object-cover rounded-lg border border-slate-700 shrink-0">
          <div>
            <div class="font-bold text-white">${escapeHtml(hall.name)}</div>
            <div class="text-[10px] text-gold-400/90">${escapeHtml(hall.tagline || '')}</div>
          </div>
        </td>
        <td class="p-3.5 font-semibold text-slate-300">${escapeHtml(hall.category)}</td>
        <td class="p-3.5 text-slate-300">
          <div><strong class="text-white">${hall.seatingCapacity}</strong> Seating</div>
          <div class="text-[10px] text-slate-400">${hall.floatingCapacity} Floating</div>
        </td>
        <td class="p-3.5 font-bold text-gold-400">
          ₹${hall.pricePerDay.toLocaleString('en-IN')}/day
          ${hall.pricePerPlate ? `<div class="text-[10px] text-slate-400 font-normal">₹${hall.pricePerPlate}/plate</div>` : ''}
        </td>
        <td class="p-3.5 text-slate-400 text-[11px] max-w-xs truncate">${escapeHtml(eventsStr)}</td>
        <td class="p-3.5 text-right space-x-1.5 whitespace-nowrap">
          <button onclick="openEditHallModal('${hall.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-gold-500 hover:text-black text-slate-200 transition font-semibold" title="Edit Hall Details">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button onclick="handleDeleteHall('${hall.id}', '${escapeHtml(hall.name)}')" class="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition font-semibold" title="Delete Hall">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 4. Fetch Bookings & Inquiries
async function fetchBookings() {
  try {
    const res = await authFetch('/api/bookings');
    const data = await res.json();
    if (data.success) {
      adminState.bookings = data.bookings;
      renderAdminBookings(data.bookings);
      renderDashboardRecentBookings(data.bookings.slice(0, 5));
    }
  } catch (err) {
    console.error('Error fetching bookings:', err);
  }
}

function renderAdminBookings(bookings) {
  const tbody = document.getElementById('adminBookingsTableBody');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">No bookings match the filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const isHall = b.type === 'hall';
    const datesStr = isHall
      ? `<span class="text-gold-400 font-bold">${escapeHtml(b.eventDate || 'Date TBD')}</span> (${escapeHtml(b.eventType || 'Party')})`
      : `${escapeHtml(b.checkIn || '')} to ${escapeHtml(b.checkOut || '')}`;

    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="p-3.5">
          <div class="font-bold text-white">${escapeHtml(b.id)}</div>
          <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isHall ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}">
            ${isHall ? 'Party Hall' : 'Room Stay'}
          </span>
        </td>
        <td class="p-3.5">
          <div class="font-bold text-white">${escapeHtml(b.guestName)}</div>
          <div class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <a href="tel:${b.phone}" class="hover:text-gold-400 text-white font-mono">${escapeHtml(b.phone)}</a>
          </div>
        </td>
        <td class="p-3.5">
          <div class="font-semibold text-slate-200">${escapeHtml(b.itemTitle)}</div>
          <div class="text-[10px] text-slate-400">${b.guestsCount} Guests ${b.foodPreference ? `• ${escapeHtml(b.foodPreference)}` : ''}</div>
        </td>
        <td class="p-3.5 text-slate-300 text-[11px]">
          ${datesStr}
          ${b.totalAmount ? `<div class="font-bold text-gold-400 mt-0.5">₹${b.totalAmount.toLocaleString('en-IN')}</div>` : ''}
        </td>
        <td class="p-3.5 text-[11px] text-slate-400 max-w-xs truncate" title="${escapeHtml(b.specialRequest || '')}">
          ${escapeHtml(b.specialRequest || 'None')}
        </td>
        <td class="p-3.5">
          <select onchange="handleUpdateBookingStatus('${b.id}', this.value)" class="bg-[#121c27] border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none ${getStatusColorClass(b.status)}">
            <option value="Pending" ${b.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Confirmed" ${b.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Cancelled" ${b.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            <option value="Completed" ${b.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td class="p-3.5 text-right space-x-1 whitespace-nowrap">
          <a href="https://wa.me/91${b.phone}?text=Hello%20${encodeURIComponent(b.guestName)},%20this%20is%20Hotel%20DRS%20Deluxe%20regarding%20your%20reservation%20(${b.id})" target="_blank" class="px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition text-xs font-semibold inline-block" title="Chat on WhatsApp">
            <i class="fa-brands fa-whatsapp"></i>
          </a>
          <a href="tel:${b.phone}" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-semibold inline-block" title="Call Guest">
            <i class="fa-solid fa-phone"></i>
          </a>
          <button onclick="handleDeleteBooking('${b.id}')" class="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition text-xs font-semibold" title="Delete Booking">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderDashboardRecentBookings(bookings) {
  const tbody = document.getElementById('dashboardRecentBookingsTable');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">No bookings yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr class="hover:bg-slate-800/30 transition">
      <td class="p-3 font-bold text-white">${escapeHtml(b.id)}</td>
      <td class="p-3">
        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${b.type === 'hall' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}">
          ${b.type === 'hall' ? 'Hall' : 'Room'}
        </span>
      </td>
      <td class="p-3 font-semibold text-white">
        ${escapeHtml(b.guestName)}
        <span class="block text-[10px] text-slate-400">${escapeHtml(b.phone)}</span>
      </td>
      <td class="p-3 text-slate-300 truncate max-w-xs">${escapeHtml(b.itemTitle)}</td>
      <td class="p-3 text-[11px] text-slate-400">${escapeHtml(b.eventDate || `${b.checkIn} to ${b.checkOut}`)}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColorClass(b.status)}">
          ${escapeHtml(b.status)}
        </span>
      </td>
      <td class="p-3 text-right">
        <button onclick="switchTab('bookings')" class="text-gold-400 hover:underline text-[11px]">Manage &rarr;</button>
      </td>
    </tr>
  `).join('');
}

function getStatusColorClass(status) {
  switch (status) {
    case 'Confirmed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'Cancelled': return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'Completed': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    default: return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  }
}

function filterBookings() {
  const type = document.getElementById('filterBookingType').value;
  const status = document.getElementById('filterBookingStatus').value;

  let filtered = [...adminState.bookings];
  if (type) {
    filtered = filtered.filter(b => b.type === type);
  }
  if (status && status !== 'All') {
    filtered = filtered.filter(b => b.status.toLowerCase() === status.toLowerCase());
  }

  renderAdminBookings(filtered);
}

async function handleUpdateBookingStatus(id, newStatus) {
  try {
    const res = await authFetch(`/api/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      await fetchBookings();
      await fetchStats();
    }
  } catch (err) {
    alert('Failed to update status');
  }
}

async function handleDeleteBooking(id) {
  if (!confirm(`Delete booking ${id}?`)) return;
  try {
    const res = await authFetch(`/api/bookings/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchBookings();
      await fetchStats();
    }
  } catch (err) {
    alert('Failed to delete booking');
  }
}

// 5. Fetch Settings
async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      adminState.settings = data.settings;
      populateSettingsForm(data.settings);
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }
}

const GOLD_GRADIENTS = {
  'champagne': 'linear-gradient(135deg, #fcebc2 0%, #c5a059 50%, #9a7833 100%)',
  'pure-gold': 'linear-gradient(135deg, #fff8b3 0%, #ffd700 50%, #b8860b 100%)',
  'rose-gold': 'linear-gradient(135deg, #fff1f2 0%, #fda4af 50%, #e11d48 100%)',
  'platinum-gold': 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #c5a059 100%)',
  'antique-bronze': 'linear-gradient(135deg, #fef3c7 0%, #d97706 50%, #78350f 100%)'
};

function populateSettingsForm(s) {
  if (document.getElementById('settingHotelName')) document.getElementById('settingHotelName').value = s.name || 'HOTEL DRS DELUXE';
  if (document.getElementById('settingTagline')) document.getElementById('settingTagline').value = s.tagline || '';
  if (document.getElementById('settingPhone')) document.getElementById('settingPhone').value = s.phone || '8292749943';
  if (document.getElementById('settingWhatsapp')) document.getElementById('settingWhatsapp').value = s.whatsapp || '8292749943';
  if (document.getElementById('settingEmail')) document.getElementById('settingEmail').value = s.email || '';
  if (document.getElementById('settingCurrency')) document.getElementById('settingCurrency').value = s.currency || '₹';
  if (document.getElementById('settingAddress')) document.getElementById('settingAddress').value = s.address || '';
  if (document.getElementById('settingCheckIn')) document.getElementById('settingCheckIn').value = s.checkInTime || '12:00 PM';
  if (document.getElementById('settingAnnouncement')) document.getElementById('settingAnnouncement').value = s.announcement || '';
  if (document.getElementById('settingAdminLoginNo')) document.getElementById('settingAdminLoginNo').value = s.adminLoginNo || '8292749943';
  if (document.getElementById('settingAdminNewPassword')) document.getElementById('settingAdminNewPassword').value = '';

  // Fonts & Golden Styles
  if (document.getElementById('settingHeadingFont')) document.getElementById('settingHeadingFont').value = s.headingFont || 'Cinzel';
  if (document.getElementById('settingBodyFont')) document.getElementById('settingBodyFont').value = s.bodyFont || 'Plus Jakarta Sans';
  if (document.getElementById('settingGoldStyle')) document.getElementById('settingGoldStyle').value = s.goldStyle || 'champagne';
  updateLiveFontPreview();

  // Google Maps Location Button Link
  const mapLink = s.googleMapsUrl || s.mapDirectionsUrl || 'https://maps.google.com/?q=Hotel+DRS+Deluxe+Station+Road';
  const mapInput = document.getElementById('settingGoogleMapsUrl');
  const testBtn = document.getElementById('adminTestMapLink');
  if (mapInput) {
    mapInput.value = mapLink;
    mapInput.oninput = () => {
      if (testBtn) testBtn.href = mapInput.value.trim() || '#';
    };
  }
  if (testBtn) testBtn.href = mapLink;

  // Theme
  previewTheme(s.theme || 'royal-gold');
}

function updateLiveFontPreview() {
  const headingFont = document.getElementById('settingHeadingFont')?.value || 'Cinzel';
  const bodyFont = document.getElementById('settingBodyFont')?.value || 'Plus Jakarta Sans';
  const goldStyle = document.getElementById('settingGoldStyle')?.value || 'champagne';

  const titlePreview = document.getElementById('adminFontPreviewTitle');
  const subtitlePreview = document.getElementById('adminFontPreviewSubtitle');

  if (titlePreview) {
    titlePreview.style.fontFamily = `"${headingFont}", serif`;
    const grad = GOLD_GRADIENTS[goldStyle] || GOLD_GRADIENTS['champagne'];
    titlePreview.style.background = grad;
    titlePreview.style.webkitBackgroundClip = 'text';
    titlePreview.style.webkitTextFillColor = 'transparent';
  }

  if (subtitlePreview) {
    subtitlePreview.style.fontFamily = `"${bodyFont}", sans-serif`;
  }
}

function previewTheme(themeName) {
  adminState.selectedTheme = themeName;
  document.body.setAttribute('data-theme', themeName);

  // Update visual selection border on theme cards
  document.querySelectorAll('.theme-radio-card').forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.value === themeName) {
      radio.checked = true;
      card.classList.add('border-gold-500', 'ring-2', 'ring-gold-500/30');
    } else {
      card.classList.remove('border-gold-500', 'ring-2', 'ring-gold-500/30');
    }
  });
}

function autoGenerateMapUrls() {
  const addr = (document.getElementById('settingAddress')?.value || 'Station Road, Near City Center, Hotel DRS Deluxe').trim();
  const hotel = (document.getElementById('settingHotelName')?.value || 'Hotel DRS Deluxe').trim();
  const query = `${hotel} ${addr}`;
  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(query)}`;

  const mapInput = document.getElementById('settingGoogleMapsUrl');
  const testBtn = document.getElementById('adminTestMapLink');
  if (mapInput) mapInput.value = mapUrl;
  if (testBtn) testBtn.href = mapUrl;
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const mapUrl = (document.getElementById('settingGoogleMapsUrl')?.value || '').trim() || 'https://maps.google.com/?q=Hotel+DRS+Deluxe+Station+Road';

  const payload = {
    name: document.getElementById('settingHotelName').value.trim(),
    tagline: document.getElementById('settingTagline').value.trim(),
    phone: document.getElementById('settingPhone').value.trim(),
    whatsapp: document.getElementById('settingWhatsapp').value.trim(),
    email: document.getElementById('settingEmail') ? document.getElementById('settingEmail').value.trim() : 'booking@hoteldrsdeluxe.com',
    currency: document.getElementById('settingCurrency') ? document.getElementById('settingCurrency').value.trim() : '₹',
    address: document.getElementById('settingAddress').value.trim(),
    checkInTime: document.getElementById('settingCheckIn').value.trim(),
    checkOutTime: document.getElementById('settingCheckOut').value.trim(),
    announcement: document.getElementById('settingAnnouncement').value.trim(),
    theme: adminState.selectedTheme || 'royal-gold',
    headingFont: document.getElementById('settingHeadingFont').value,
    bodyFont: document.getElementById('settingBodyFont').value,
    goldStyle: document.getElementById('settingGoldStyle').value,
    googleMapsUrl: mapUrl,
    mapDirectionsUrl: mapUrl
  };

  const newLoginNo = document.getElementById('settingAdminLoginNo')?.value.trim();
  const newPassword = document.getElementById('settingAdminNewPassword')?.value.trim();
  if (newLoginNo) payload.adminLoginNo = newLoginNo;
  if (newPassword) payload.adminPassword = newPassword;

  try {
    const res = await authFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Hotel Settings, Fonts, Theme & Google Maps Button Link updated successfully!\nAll changes are live on the hotel website.');
      adminState.settings = data.settings;
    } else {
      alert('Error updating settings: ' + data.message);
    }
  } catch (err) {
    alert('Failed to save settings');
  }
}

// ==================== GALLERY FUNCTIONS ====================
async function fetchGallery() {
  try {
    const res = await fetch('/api/gallery');
    const data = await res.json();
    if (data.success) {
      adminState.gallery = data.gallery;
      renderAdminGallery(data.gallery);
    }
  } catch (err) {
    console.error('Error fetching gallery:', err);
  }
}

function renderAdminGallery(items) {
  const container = document.getElementById('adminGalleryGrid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div class="col-span-full py-10 text-center text-slate-400">No photos in gallery. Click "+ Add Gallery Photo" to add.</div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="glass-panel rounded-xl overflow-hidden border border-slate-800 relative group bg-hotel-card flex flex-col justify-between">
      <div class="relative h-44 overflow-hidden">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover">
        <span class="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-black/70 text-gold-400 px-2 py-0.5 rounded backdrop-blur-md">
          ${escapeHtml(item.category)}
        </span>
      </div>
      <div class="p-3 flex items-center justify-between">
        <div class="text-xs font-bold text-white truncate max-w-[150px]">${escapeHtml(item.title)}</div>
        <button onclick="handleDeleteGalleryPhoto('${item.id}')" class="text-red-400 hover:text-red-300 text-xs p-1" title="Delete Photo">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `).join('');
}

const GALLERY_PRESETS = [
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
];

function setGalleryPreset(idx) {
  if (GALLERY_PRESETS[idx]) {
    document.getElementById('gfImage').value = GALLERY_PRESETS[idx];
  }
}

function openAddGalleryModal() {
  document.getElementById('gfTitle').value = '';
  document.getElementById('gfImage').value = GALLERY_PRESETS[0];
  document.getElementById('galleryModal').classList.remove('hidden');
}

async function handleSaveGalleryPhoto(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('gfTitle').value.trim(),
    category: document.getElementById('gfCategory').value,
    image: document.getElementById('gfImage').value.trim()
  };

  try {
    const res = await authFetch('/api/gallery', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Photo added to hotel gallery!');
      closeAdminModal('galleryModal');
      await fetchGallery();
    }
  } catch (err) {
    alert('Failed to add photo to gallery');
  }
}

async function handleDeleteGalleryPhoto(id) {
  if (!confirm('Are you sure you want to delete this gallery photo?')) return;
  try {
    const res = await authFetch(`/api/gallery/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchGallery();
    }
  } catch (err) {
    alert('Failed to delete photo');
  }
}

// ==================== ROOM MODALS & CRUD ====================
function openAddRoomModal() {
  document.getElementById('roomForm').reset();
  document.getElementById('roomFormId').value = '';
  document.getElementById('roomModalTitle').textContent = 'Add New Luxury Room';
  document.getElementById('rfImage').value = ROOM_PRESETS[0];
  document.getElementById('rfAmenities').value = 'Air Conditioning, Free Wi-Fi, 4K Smart TV, 24/7 Room Service, Hot Water';
  document.getElementById('roomModal').classList.remove('hidden');
}

function openEditRoomModal(id) {
  const room = adminState.rooms.find(r => r.id === id);
  if (!room) return;

  document.getElementById('roomFormId').value = room.id;
  document.getElementById('roomModalTitle').textContent = `Edit Room: ${room.title}`;
  document.getElementById('rfTitle').value = room.title;
  document.getElementById('rfCategory').value = room.category;
  document.getElementById('rfPrice').value = room.price;
  document.getElementById('rfOriginalPrice').value = room.originalPrice || '';
  document.getElementById('rfMaxGuests').value = room.maxGuests;
  document.getElementById('rfBedType').value = room.bedType || 'King Bed';
  document.getElementById('rfSize').value = room.size || '';
  document.getElementById('rfView').value = room.view || '';
  document.getElementById('rfImage').value = room.image;
  document.getElementById('rfAmenities').value = (room.amenities || []).join(', ');
  document.getElementById('rfDescription').value = room.description || '';
  document.getElementById('rfStatus').value = room.status || 'Available';
  document.getElementById('rfFeatured').checked = Boolean(room.featured);

  document.getElementById('roomModal').classList.remove('hidden');
}

function setRoomPresetImage(idx) {
  if (ROOM_PRESETS[idx]) {
    document.getElementById('rfImage').value = ROOM_PRESETS[idx];
  }
}

async function handleSaveRoom(e) {
  e.preventDefault();
  const id = document.getElementById('roomFormId').value;

  const payload = {
    title: document.getElementById('rfTitle').value.trim(),
    category: document.getElementById('rfCategory').value,
    price: Number(document.getElementById('rfPrice').value),
    originalPrice: Number(document.getElementById('rfOriginalPrice').value) || null,
    maxGuests: Number(document.getElementById('rfMaxGuests').value),
    bedType: document.getElementById('rfBedType').value.trim(),
    size: document.getElementById('rfSize').value.trim(),
    view: document.getElementById('rfView').value.trim(),
    image: document.getElementById('rfImage').value.trim(),
    amenities: document.getElementById('rfAmenities').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('rfDescription').value.trim(),
    status: document.getElementById('rfStatus').value,
    featured: document.getElementById('rfFeatured').checked
  };

  try {
    const url = id ? `/api/rooms/${id}` : '/api/rooms';
    const method = id ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Room ${id ? 'updated' : 'created'} successfully!`);
      closeAdminModal('roomModal');
      await fetchRooms();
      await fetchStats();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to save room details.');
  }
}

async function toggleRoomStatus(id, currentStatus) {
  const newStatus = currentStatus === 'Available' ? 'Booked' : 'Available';
  try {
    const res = await authFetch(`/api/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      await fetchRooms();
      await fetchStats();
    }
  } catch (err) {
    alert('Failed to update status');
  }
}

async function handleDeleteRoom(id, title) {
  if (!confirm(`Are you sure you want to delete room "${title}"?`)) return;
  try {
    const res = await authFetch(`/api/rooms/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchRooms();
      await fetchStats();
    }
  } catch (err) {
    alert('Failed to delete room');
  }
}

// ==================== HALL MODALS & CRUD ====================
function openAddHallModal() {
  document.getElementById('hallForm').reset();
  document.getElementById('hallFormId').value = '';
  document.getElementById('hallModalTitle').textContent = 'Add Banquet / Party Hall';
  document.getElementById('hfImage').value = HALL_PRESETS[0];
  document.getElementById('hfSuitableFor').value = 'Weddings, Reception Parties, Birthday Celebrations, Anniversaries, Corporate Meets';
  document.getElementById('hfFacilities').value = 'Centrally Air Conditioned, Grand Stage, JBL Sound System, Party LED Lights, Valet Parking, Power Backup';
  document.getElementById('hallModal').classList.remove('hidden');
}

function openEditHallModal(id) {
  const hall = adminState.halls.find(h => h.id === id);
  if (!hall) return;

  document.getElementById('hallFormId').value = hall.id;
  document.getElementById('hallModalTitle').textContent = `Edit Hall: ${hall.name}`;
  document.getElementById('hfName').value = hall.name;
  document.getElementById('hfCategory').value = hall.category;
  document.getElementById('hfTagline').value = hall.tagline || '';
  document.getElementById('hfSeatingCapacity').value = hall.seatingCapacity;
  document.getElementById('hfFloatingCapacity').value = hall.floatingCapacity;
  document.getElementById('hfPricePerDay').value = hall.pricePerDay;
  document.getElementById('hfPricePerPlate').value = hall.pricePerPlate || '';
  document.getElementById('hfImage').value = hall.image;
  document.getElementById('hfSuitableFor').value = (hall.suitableFor || []).join(', ');
  document.getElementById('hfFacilities').value = (hall.facilities || []).join(', ');
  document.getElementById('hfDescription').value = hall.description || '';

  document.getElementById('hallModal').classList.remove('hidden');
}

function setHallPresetImage(idx) {
  if (HALL_PRESETS[idx]) {
    document.getElementById('hfImage').value = HALL_PRESETS[idx];
  }
}

async function handleSaveHall(e) {
  e.preventDefault();
  const id = document.getElementById('hallFormId').value;

  const payload = {
    name: document.getElementById('hfName').value.trim(),
    category: document.getElementById('hfCategory').value.trim(),
    tagline: document.getElementById('hfTagline').value.trim(),
    seatingCapacity: Number(document.getElementById('hfSeatingCapacity').value),
    floatingCapacity: Number(document.getElementById('hfFloatingCapacity').value),
    pricePerDay: Number(document.getElementById('hfPricePerDay').value),
    pricePerPlate: Number(document.getElementById('hfPricePerPlate').value) || null,
    image: document.getElementById('hfImage').value.trim(),
    suitableFor: document.getElementById('hfSuitableFor').value.split(',').map(s => s.trim()).filter(Boolean),
    facilities: document.getElementById('hfFacilities').value.split(',').map(s => s.trim()).filter(Boolean),
    description: document.getElementById('hfDescription').value.trim()
  };

  try {
    const url = id ? `/api/halls/${id}` : '/api/halls';
    const method = id ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert(`✅ Hall ${id ? 'updated' : 'added'} successfully!`);
      closeAdminModal('hallModal');
      await fetchHalls();
      await fetchStats();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to save hall details.');
  }
}

async function handleDeleteHall(id, name) {
  if (!confirm(`Are you sure you want to delete banquet hall "${name}"?`)) return;
  try {
    const res = await authFetch(`/api/halls/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await fetchHalls();
      await fetchStats();
    }
  } catch (err) {
    alert('Failed to delete hall');
  }
}

// ==================== MANUAL BOOKING MODAL ====================
function openManualBookingModal() {
  document.getElementById('manualBookingModal').classList.remove('hidden');
  toggleManualBookingFields();
}

function toggleManualBookingFields() {
  const type = document.getElementById('mbType').value;
  const itemSelect = document.getElementById('mbItemSelect');
  const roomDates = document.getElementById('mbRoomDatesGrid');
  const hallDates = document.getElementById('mbHallDatesGrid');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  if (type === 'hall') {
    roomDates.classList.add('hidden');
    hallDates.classList.remove('hidden');
    hallDates.classList.add('grid');
    document.getElementById('mbEventDate').value = tomorrow;

    itemSelect.innerHTML = adminState.halls.map(h => `
      <option value="${h.id}">${h.name} (₹${h.pricePerDay}/day)</option>
    `).join('');
  } else {
    roomDates.classList.remove('hidden');
    hallDates.classList.add('hidden');
    hallDates.classList.remove('grid');
    document.getElementById('mbCheckIn').value = today;
    document.getElementById('mbCheckOut').value = tomorrow;

    itemSelect.innerHTML = adminState.rooms.map(r => `
      <option value="${r.id}">${r.title} (₹${r.price}/night)</option>
    `).join('');
  }
}

async function handleManualBooking(e) {
  e.preventDefault();
  const type = document.getElementById('mbType').value;
  const sel = document.getElementById('mbItemSelect');
  const selectedText = sel.options[sel.selectedIndex]?.text || '';

  const payload = {
    type,
    itemId: sel.value,
    itemTitle: selectedText,
    guestName: document.getElementById('mbGuestName').value.trim(),
    phone: document.getElementById('mbPhone').value.trim(),
    checkIn: type === 'room' ? document.getElementById('mbCheckIn').value : null,
    checkOut: type === 'room' ? document.getElementById('mbCheckOut').value : null,
    eventDate: type === 'hall' ? document.getElementById('mbEventDate').value : null,
    eventType: type === 'hall' ? (document.getElementById('mbEventType').value.trim() || 'Celebration') : null,
    totalAmount: Number(document.getElementById('mbTotalAmount').value) || 0,
    status: document.getElementById('mbStatus').value,
    specialRequest: document.getElementById('mbSpecialRequest').value.trim() || 'Walk-in booking added by admin'
  };

  try {
    const res = await authFetch('/api/admin/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ Walk-in reservation recorded successfully!');
      closeAdminModal('manualBookingModal');
      await fetchBookings();
      await fetchStats();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to record manual booking.');
  }
}

function closeAdminModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
