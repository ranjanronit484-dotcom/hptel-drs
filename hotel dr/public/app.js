// =================================================================
// HOTEL DRS DELUXE - CLIENT JAVASCRIPT
// =================================================================

let hotelData = {
  settings: {},
  rooms: [],
  halls: [],
  packages: [],
  testimonials: []
};

let currentSelectedRoom = null;
let currentSelectedHall = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  setDefaultDates();
  loadHotelSettings();
  loadRooms();
  loadHalls();
  loadPackages();
  loadTestimonials();
  loadGallery();
});

// Setup Mobile Menu
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });
    // Close on link click
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => menu.classList.add('hidden'));
    });
  }
}

// Set Default Dates to Today and Tomorrow
function setDefaultDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatDate = d => d.toISOString().split('T')[0];

  const quickDate = document.getElementById('quickDate');
  const quickCheckOut = document.getElementById('quickCheckOut');
  const bookCheckIn = document.getElementById('bookCheckIn');
  const bookCheckOut = document.getElementById('bookCheckOut');
  const hallEventDate = document.getElementById('hallEventDate');

  if (quickDate) quickDate.value = formatDate(today);
  if (quickCheckOut) quickCheckOut.value = formatDate(tomorrow);
  if (bookCheckIn) bookCheckIn.value = formatDate(today);
  if (bookCheckOut) bookCheckOut.value = formatDate(tomorrow);
  if (hallEventDate) hallEventDate.value = formatDate(tomorrow);
}

// Load Hotel Settings
async function loadHotelSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      hotelData.settings = data.settings;
      renderSettings(data.settings);
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

function renderSettings(s) {
  // Apply Dynamic Theme
  if (s.theme) {
    document.body.setAttribute('data-theme', s.theme);
  }

  // Heading Font & Body Font Customization
  if (s.headingFont) {
    document.documentElement.style.setProperty('--heading-font', `'${s.headingFont}', serif`);
  }
  if (s.bodyFont) {
    document.documentElement.style.setProperty('--body-font', `'${s.bodyFont}', sans-serif`);
  }

  // Golden Font Gradient Style
  if (s.goldStyle) {
    const goldGradients = {
      'champagne': 'linear-gradient(135deg, #fcebc2 0%, #c5a059 50%, #9a7833 100%)',
      'pure-gold': 'linear-gradient(135deg, #fff8b3 0%, #ffd700 50%, #b8860b 100%)',
      'rose-gold': 'linear-gradient(135deg, #fff1f2 0%, #fda4af 50%, #e11d48 100%)',
      'platinum-gold': 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #c5a059 100%)',
      'antique-bronze': 'linear-gradient(135deg, #fef3c7 0%, #d97706 50%, #78350f 100%)'
    };
    if (goldGradients[s.goldStyle]) {
      document.documentElement.style.setProperty('--text-gradient', goldGradients[s.goldStyle]);
    }
  }

  // Update Announcement Banner
  if (s.announcement) {
    const el = document.getElementById('announcementText');
    if (el) el.textContent = s.announcement;
  }
  if (s.heroSubtitle) {
    const el = document.getElementById('heroSubtitleText');
    if (el) el.textContent = s.heroSubtitle;
  }
  if (s.address) {
    const el = document.getElementById('contactAddressText');
    if (el) el.textContent = s.address;
    const snip = document.getElementById('mapAddressSnippet');
    if (snip) snip.textContent = s.address;
  }
  if (s.checkInTime) {
    const el = document.getElementById('checkInInfo');
    if (el) el.textContent = s.checkInTime;
  }
  if (s.checkOutTime) {
    const el = document.getElementById('checkOutInfo');
    if (el) el.textContent = s.checkOutTime;
  }

  // Google Maps Dynamic Location Button Only
  const mapsBtn = document.getElementById('googleMapsLocationBtn');
  if (mapsBtn && (s.googleMapsUrl || s.mapDirectionsUrl)) {
    mapsBtn.href = s.googleMapsUrl || s.mapDirectionsUrl;
  }
}

// ==================== ROOMS DISPLAY & FILTER ====================
async function loadRooms() {
  try {
    const res = await fetch('/api/rooms');
    const data = await res.json();
    if (data.success) {
      hotelData.rooms = data.rooms;
      renderRooms(data.rooms);
    }
  } catch (err) {
    console.error('Error fetching rooms:', err);
  }
}

function renderRooms(rooms) {
  const container = document.getElementById('roomsGrid');
  if (!container) return;

  if (rooms.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i class="fa-solid fa-bed text-3xl mb-3 text-gold-500/50"></i>
        <p class="text-base font-semibold">No rooms found in this category.</p>
      </div>`;
    return;
  }

  container.innerHTML = rooms.map(room => {
    const isAvail = room.status === 'Available';
    const amenitiesHtml = (room.amenities || []).slice(0, 4).map(a => `
      <span class="inline-flex items-center gap-1 text-[11px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60">
        <i class="fa-solid fa-check text-[9px] text-gold-400"></i> ${escapeHtml(a)}
      </span>
    `).join('');

    return `
      <div class="glass-panel rounded-2xl overflow-hidden card-zoom gold-border-glow flex flex-col justify-between transition-all duration-300 border border-hotel-border bg-hotel-surface">
        
        <!-- Image & Badges -->
        <div class="relative h-60 w-full overflow-hidden">
          <img src="${escapeHtml(room.image)}" alt="${escapeHtml(room.title)}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-hotel-surface via-transparent to-black/30"></div>
          
          <div class="absolute top-3 left-3 flex gap-2">
            <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 text-gold-400 backdrop-blur-md border border-gold-500/30">
              ${escapeHtml(room.category)}
            </span>
            ${room.featured ? `
              <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/90 text-slate-950 font-bold">
                Featured
              </span>` : ''}
          </div>

          <div class="absolute top-3 right-3">
            <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isAvail ? 'status-badge-available' : 'status-badge-booked'} backdrop-blur-md">
              ${escapeHtml(room.status)}
            </span>
          </div>

          <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div class="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700">
              <span class="text-xs text-slate-400">from </span>
              <span class="text-lg font-bold text-gold-400 font-serif">₹${room.price.toLocaleString('en-IN')}</span>
              <span class="text-[11px] text-slate-400">/night</span>
              ${room.originalPrice ? `<span class="text-xs text-slate-500 line-through ml-1.5">₹${room.originalPrice.toLocaleString('en-IN')}</span>` : ''}
            </div>
            <div class="text-[11px] text-slate-300 bg-black/70 px-2 py-1 rounded backdrop-blur-md">
              <i class="fa-solid fa-users text-gold-400 mr-1"></i> Max ${room.maxGuests} Guests
            </div>
          </div>
        </div>

        <!-- Room Details -->
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-serif text-lg font-bold text-white mb-2">${escapeHtml(room.title)}</h3>
            <p class="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">${escapeHtml(room.description)}</p>

            <!-- Specs Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-4 pb-4 border-b border-slate-800">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-bed text-gold-500/80"></i>
                <span class="truncate">${escapeHtml(room.bedType || 'King Bed')}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-maximize text-gold-500/80"></i>
                <span>${escapeHtml(room.size || '300 sq.ft')}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-mountain-sun text-gold-500/80"></i>
                <span class="truncate">${escapeHtml(room.view || 'City View')}</span>
              </div>
              <div class="flex items-center gap-2 text-emerald-400">
                <i class="fa-solid fa-circle-check"></i>
                <span>Free Wi-Fi</span>
              </div>
            </div>

            <!-- Amenities Pills -->
            <div class="flex flex-wrap gap-1.5 mb-5">
              ${amenitiesHtml}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-2">
            <button onclick="openBookingModal('room', '${room.id}')" ${!isAvail ? 'disabled' : ''} class="flex-1 btn-gold py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${!isAvail ? 'opacity-50 cursor-not-allowed' : ''}">
              <i class="fa-solid fa-calendar-check"></i>
              <span>${isAvail ? 'Book Room' : 'Unavailable'}</span>
            </button>
            <a href="https://wa.me/918292749943?text=Hi%20Hotel%20DRS%20Deluxe,%20I%20am%20interested%20in%20${encodeURIComponent(room.title)}" target="_blank" class="px-3 py-2.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center transition" title="Quick Inquiry via WhatsApp">
              <i class="fa-brands fa-whatsapp text-sm"></i>
            </a>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

function filterRooms(category) {
  // Update button active state
  document.querySelectorAll('#roomCategoryFilters button').forEach(btn => {
    btn.classList.remove('bg-gold-500', 'text-black');
    btn.classList.add('bg-hotel-card', 'text-slate-300');
  });
  event.target.classList.remove('bg-hotel-card', 'text-slate-300');
  event.target.classList.add('bg-gold-500', 'text-black');

  if (category === 'All') {
    renderRooms(hotelData.rooms);
  } else {
    const filtered = hotelData.rooms.filter(r => r.category.toLowerCase() === category.toLowerCase());
    renderRooms(filtered);
  }
}

// ==================== HALLS & PARTY ARRANGEMENTS ====================
async function loadHalls() {
  try {
    const res = await fetch('/api/halls');
    const data = await res.json();
    if (data.success) {
      hotelData.halls = data.halls;
      renderHalls(data.halls);
      populateHallSelect(data.halls);
    }
  } catch (err) {
    console.error('Error fetching halls:', err);
  }
}

function renderHalls(halls) {
  const container = document.getElementById('hallsGrid');
  if (!container) return;

  container.innerHTML = halls.map(hall => {
    const suitableHtml = (hall.suitableFor || []).map(s => `
      <span class="inline-block text-[10px] font-bold uppercase tracking-wider bg-gold-500/10 text-gold-400 border border-gold-500/30 px-2 py-0.5 rounded">
        ${escapeHtml(s)}
      </span>
    `).join('');

    const facilitiesHtml = (hall.facilities || []).slice(0, 6).map(f => `
      <li class="flex items-center gap-2 text-xs text-slate-300">
        <i class="fa-solid fa-circle-check text-gold-400 text-xs shrink-0"></i>
        <span>${escapeHtml(f)}</span>
      </li>
    `).join('');

    return `
      <div class="glass-panel rounded-2xl overflow-hidden card-zoom gold-border-glow transition-all duration-300 border border-hotel-border bg-[#121c27] flex flex-col justify-between">
        
        <!-- Hall Image & Badges -->
        <div class="relative h-72 w-full overflow-hidden">
          <img src="${escapeHtml(hall.image)}" alt="${escapeHtml(hall.name)}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-[#121c27] via-transparent to-black/40"></div>
          
          <div class="absolute top-4 left-4">
            <span class="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-black/70 text-gold-400 backdrop-blur-md border border-gold-500/40">
              ${escapeHtml(hall.category)}
            </span>
          </div>

          <div class="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-2">
            <div class="bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700">
              <span class="text-xs text-slate-400">Hall Rent: </span>
              <span class="text-xl font-serif font-bold text-gold-400">₹${hall.pricePerDay.toLocaleString('en-IN')}</span>
              <span class="text-xs text-slate-400">/day</span>
              ${hall.pricePerPlate ? `
                <div class="text-[11px] text-amber-300 font-semibold mt-0.5">
                  or ₹${hall.pricePerPlate}/plate catering
                </div>` : ''}
            </div>

            <div class="bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 text-right">
              <div class="text-xs font-bold text-white flex items-center gap-1.5">
                <i class="fa-solid fa-chair text-gold-400"></i> ${hall.seatingCapacity} Seating
              </div>
              <div class="text-[11px] text-slate-300">
                <i class="fa-solid fa-people-group text-slate-400"></i> ${hall.floatingCapacity} Floating
              </div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-serif text-xl font-bold text-white mb-1">${escapeHtml(hall.name)}</h3>
            <p class="text-xs text-gold-500/90 font-semibold mb-3">${escapeHtml(hall.tagline || '')}</p>
            <p class="text-xs text-slate-300 mb-5 leading-relaxed">${escapeHtml(hall.description)}</p>

            <!-- Event Types Tags -->
            <div class="mb-4">
              <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ideal For Celebrations:</div>
              <div class="flex flex-wrap gap-1.5">
                ${suitableHtml}
              </div>
            </div>

            <!-- Facilities Checklist -->
            <div class="bg-[#182433] p-4 rounded-xl border border-slate-800 mb-6">
              <div class="text-[11px] font-bold uppercase tracking-wider text-gold-400 mb-2 flex items-center gap-1.5">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Included Arrangements &amp; Facilities
              </div>
              <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${facilitiesHtml}
              </ul>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button onclick="openBookingModal('hall', '${hall.id}')" class="flex-1 btn-gold py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
              <i class="fa-solid fa-calendar-plus"></i>
              <span>Book / Check Hall Dates</span>
            </button>
            <a href="https://wa.me/918292749943?text=Hi%20Hotel%20DRS%20Deluxe,%20I%20want%20to%20inquire%20about%20${encodeURIComponent(hall.name)}%20for%20my%20party" target="_blank" class="px-4 py-3 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center transition" title="Direct WhatsApp Inquiry">
              <i class="fa-brands fa-whatsapp text-base"></i>
            </a>
          </div>

        </div>

      </div>
    `;
  }).join('');
}

function populateHallSelect(halls) {
  const sel = document.getElementById('bookingHallSelect');
  if (!sel) return;
  sel.innerHTML = halls.map(h => `
    <option value="${h.id}">${h.name} (${h.category} - ${h.seatingCapacity} to ${h.floatingCapacity} Guests)</option>
  `).join('');
}

// Load Celebration Packages
async function loadPackages() {
  try {
    const res = await fetch('/api/packages');
    const data = await res.json();
    if (data.success && data.packages) {
      hotelData.packages = data.packages;
      renderPackages(data.packages);
    }
  } catch (err) {
    console.error('Error fetching packages:', err);
  }
}

function renderPackages(pkgs) {
  const container = document.getElementById('packagesGrid');
  if (!container) return;

  container.innerHTML = pkgs.map(p => `
    <div class="glass-panel p-5 rounded-2xl border border-slate-800 gold-border-glow flex flex-col justify-between">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-gold-400">${escapeHtml(p.eventType)}</span>
        <h4 class="font-serif text-base font-bold text-white mt-1 mb-2">${escapeHtml(p.title)}</h4>
        <div class="text-base font-bold text-amber-400 font-serif mb-4">${escapeHtml(p.price)}</div>
        <ul class="space-y-1.5 text-xs text-slate-300 mb-4">
          ${(p.includes || []).map(inc => `
            <li class="flex items-start gap-1.5">
              <i class="fa-solid fa-check text-gold-500 text-[10px] mt-0.5 shrink-0"></i>
              <span>${escapeHtml(inc)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      <button onclick="openBookingModal('hall', null, '${escapeHtml(p.eventType)}')" class="btn-outline-gold w-full py-2 rounded-lg text-xs font-bold text-center">
        Inquire Package
      </button>
    </div>
  `).join('');
}

// Load Testimonials
async function loadTestimonials() {
  try {
    const res = await fetch('/api/testimonials');
    const data = await res.json();
    if (data.success && data.testimonials) {
      hotelData.testimonials = data.testimonials;
      renderTestimonials(data.testimonials);
    }
  } catch (err) {
    console.error('Error fetching testimonials:', err);
  }
}

function renderTestimonials(tests) {
  const container = document.getElementById('testimonialsGrid');
  if (!container) return;

  container.innerHTML = tests.map(t => `
    <div class="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
      <div>
        <div class="flex text-amber-400 text-xs gap-1 mb-3">
          ${'<i class="fa-solid fa-star"></i>'.repeat(t.rating || 5)}
        </div>
        <p class="text-xs text-slate-300 italic mb-5 leading-relaxed">"${escapeHtml(t.comment)}"</p>
      </div>
      <div class="border-t border-slate-800 pt-3">
        <h5 class="text-xs font-bold text-white">${escapeHtml(t.name)}</h5>
        <span class="text-[10px] text-gold-400 font-semibold">${escapeHtml(t.role)}</span>
      </div>
    </div>
  `).join('');
}

// ==================== GALLERY FUNCTIONS ====================
async function loadGallery() {
  try {
    const res = await fetch('/api/gallery');
    const data = await res.json();
    if (data.success && data.gallery) {
      hotelData.gallery = data.gallery;
      renderGallery(data.gallery);
    }
  } catch (err) {
    console.error('Error fetching gallery:', err);
  }
}

function renderGallery(items) {
  const container = document.getElementById('dynamicGalleryGrid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-xs">No gallery photos added yet.</div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="card-zoom rounded-2xl overflow-hidden h-60 border border-slate-800 relative group bg-hotel-card">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-gold-400">${escapeHtml(item.category)}</span>
          <h4 class="text-xs font-bold text-white">${escapeHtml(item.title)}</h4>
        </div>
      </div>
    </div>
  `).join('');
}

function filterGallery(category) {
  document.querySelectorAll('#galleryCategoryFilters button').forEach(btn => {
    btn.classList.remove('bg-gold-500', 'text-black');
    btn.classList.add('bg-hotel-card', 'text-slate-300');
  });
  event.target.classList.remove('bg-hotel-card', 'text-slate-300');
  event.target.classList.add('bg-gold-500', 'text-black');

  if (category === 'All') {
    renderGallery(hotelData.gallery || []);
  } else {
    const filtered = (hotelData.gallery || []).filter(g => g.category.toLowerCase() === category.toLowerCase());
    renderGallery(filtered);
  }
}

// ==================== SEARCH & MODAL CONTROLS ====================
function toggleQuickSearchFields() {
  const type = document.getElementById('quickType').value;
  const dateLabel = document.getElementById('quickDateLabel');
  const guestsLabel = document.getElementById('quickGuestsLabel');
  const checkOutContainer = document.getElementById('quickCheckOutContainer');

  if (type === 'hall') {
    dateLabel.textContent = 'Event Date';
    guestsLabel.textContent = 'Expected Guests';
    checkOutContainer.style.display = 'none';
  } else {
    dateLabel.textContent = 'Check-In Date';
    guestsLabel.textContent = 'Total Guests';
    checkOutContainer.style.display = 'block';
  }
}

function handleQuickSearch(e) {
  e.preventDefault();
  const type = document.getElementById('quickType').value;
  const date = document.getElementById('quickDate').value;
  const guests = document.getElementById('quickGuests').value;

  if (type === 'hall') {
    openBookingModal('hall');
    const hallDateInput = document.getElementById('hallEventDate');
    const hallGuestsInput = document.getElementById('hallGuestsCount');
    if (hallDateInput && date) hallDateInput.value = date;
    if (hallGuestsInput && guests) hallGuestsInput.value = guests;
  } else {
    const checkOut = document.getElementById('quickCheckOut').value;
    openBookingModal('room');
    const bookCheckIn = document.getElementById('bookCheckIn');
    const bookCheckOut = document.getElementById('bookCheckOut');
    const bookGuests = document.getElementById('bookGuests');
    if (bookCheckIn && date) bookCheckIn.value = date;
    if (bookCheckOut && checkOut) bookCheckOut.value = checkOut;
    if (bookGuests && guests) bookGuests.value = guests;
  }
}

function openBookingModal(type, itemId = null, eventType = null) {
  if (type === 'room') {
    const modal = document.getElementById('roomBookingModal');
    modal.classList.remove('hidden');

    let room = hotelData.rooms.find(r => r.id === itemId);
    if (!room && hotelData.rooms.length > 0) room = hotelData.rooms[0];

    currentSelectedRoom = room;
    if (room) {
      document.getElementById('bookingRoomId').value = room.id;
      document.getElementById('bookingRoomDisplay').value = `${room.title} (₹${room.price}/night)`;
      document.getElementById('bookingEstimatedTotal').textContent = `₹${room.price.toLocaleString('en-IN')} / night`;
    }
  } else if (type === 'hall') {
    const modal = document.getElementById('hallBookingModal');
    modal.classList.remove('hidden');

    const sel = document.getElementById('bookingHallSelect');
    if (itemId && sel) {
      sel.value = itemId;
    }
    if (eventType) {
      const typeSel = document.getElementById('hallEventType');
      if (typeSel) typeSel.value = eventType;
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

// Close modals when clicking backdrop
window.onclick = function(event) {
  if (event.target.classList.contains('modal-overlay')) {
    event.target.classList.add('hidden');
  }
};

// ==================== FORM SUBMISSIONS ====================
async function submitRoomBooking(e) {
  e.preventDefault();

  const payload = {
    type: 'room',
    itemId: document.getElementById('bookingRoomId').value,
    itemTitle: document.getElementById('bookingRoomDisplay').value,
    guestName: document.getElementById('bookGuestName').value.trim(),
    phone: document.getElementById('bookPhone').value.trim(),
    email: document.getElementById('bookEmail').value.trim(),
    checkIn: document.getElementById('bookCheckIn').value,
    checkOut: document.getElementById('bookCheckOut').value,
    guestsCount: Number(document.getElementById('bookGuests').value) || 2,
    roomsCount: Number(document.getElementById('bookRoomsCount').value) || 1,
    specialRequest: document.getElementById('bookRequests').value.trim(),
    totalAmount: currentSelectedRoom ? currentSelectedRoom.price * (Number(document.getElementById('bookRoomsCount').value) || 1) : 0
  };

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      closeModal('roomBookingModal');
      e.target.reset();
      showBookingInvoice(data.booking);
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to connect to hotel booking server. Please call 8292749943.');
  }
}

function bookViaWhatsApp() {
  const roomName = document.getElementById('bookingRoomDisplay').value || 'Deluxe Room';
  const name = document.getElementById('bookGuestName').value || 'Guest';
  const phone = document.getElementById('bookPhone').value || '';
  const checkIn = document.getElementById('bookCheckIn').value;
  const checkOut = document.getElementById('bookCheckOut').value;
  const guests = document.getElementById('bookGuests').value;

  const msg = `Hi Hotel DRS Deluxe! I want to book a room stay:%0A- Room: ${encodeURIComponent(roomName)}%0A- Name: ${encodeURIComponent(name)}%0A- Phone: ${phone}%0A- Check-In: ${checkIn}%0A- Check-Out: ${checkOut}%0A- Guests: ${guests}%0APlease confirm availability!`;
  window.open(`https://wa.me/918292749943?text=${msg}`, '_blank');
}

async function submitHallBooking(e) {
  e.preventDefault();

  const sel = document.getElementById('bookingHallSelect');
  const selectedHallTitle = sel.options[sel.selectedIndex]?.text || 'Banquet Hall';

  const payload = {
    type: 'hall',
    itemId: sel.value,
    itemTitle: selectedHallTitle,
    guestName: document.getElementById('hallContactName').value.trim(),
    phone: document.getElementById('hallContactPhone').value.trim(),
    email: document.getElementById('hallContactEmail').value.trim(),
    eventDate: document.getElementById('hallEventDate').value,
    eventType: document.getElementById('hallEventType').value,
    guestsCount: Number(document.getElementById('hallGuestsCount').value) || 100,
    foodPreference: document.getElementById('hallFoodPreference').value,
    specialRequest: document.getElementById('hallSpecialRequests').value.trim(),
    totalAmount: 25000 // default estimate
  };

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      closeModal('hallBookingModal');
      e.target.reset();
      showBookingInvoice(data.booking);
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to connect to hotel server. Please call 8292749943.');
  }
}

function showBookingInvoice(b) {
  if (!b) return;
  document.getElementById('invBookingId').textContent = b.id;
  document.getElementById('invDate').textContent = new Date().toLocaleDateString('en-IN');
  document.getElementById('invGuestName').textContent = b.guestName;
  document.getElementById('invPhone').textContent = b.phone;
  document.getElementById('invItemTitle').textContent = b.itemTitle;
  document.getElementById('invDates').textContent = b.type === 'hall'
    ? `${b.eventDate} (${b.eventType || 'Party'})`
    : `${b.checkIn} to ${b.checkOut}`;
  document.getElementById('invGuests').textContent = b.type === 'hall'
    ? `${b.guestsCount} Expected Guests`
    : `${b.guestsCount} Guests (${b.roomsCount || 1} Room)`;
  document.getElementById('invAmount').textContent = b.totalAmount ? `₹${b.totalAmount.toLocaleString('en-IN')}` : 'Pay at Hotel';

  const modal = document.getElementById('bookingInvoiceModal');
  if (modal) modal.classList.remove('hidden');
}

function inquireHallViaWhatsApp() {
  const sel = document.getElementById('bookingHallSelect');
  const hallName = sel.options[sel.selectedIndex]?.text || 'Party Hall';
  const name = document.getElementById('hallContactName').value || 'Client';
  const phone = document.getElementById('hallContactPhone').value || '';
  const date = document.getElementById('hallEventDate').value;
  const eventType = document.getElementById('hallEventType').value;
  const guests = document.getElementById('hallGuestsCount').value;

  const msg = `Hi Hotel DRS Deluxe! I want to inquire about Party Hall / Banquet:%0A- Hall: ${encodeURIComponent(hallName)}%0A- Event: ${encodeURIComponent(eventType)}%0A- Date: ${date}%0A- Expected Guests: ${guests}%0A- Name: ${encodeURIComponent(name)}%0A- Phone: ${phone}%0APlease provide package details and quotes!`;
  window.open(`https://wa.me/918292749943?text=${msg}`, '_blank');
}

async function handleContactInquiry(e) {
  e.preventDefault();
  const name = document.getElementById('contactName').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  const req = document.getElementById('contactRequirement').value;
  const msg = document.getElementById('contactMessage').value.trim();

  const payload = {
    type: req.includes('Hall') || req.includes('Party') ? 'hall' : 'room',
    guestName: name,
    phone: phone,
    eventType: req,
    specialRequest: msg
  };

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert(`Thank you, ${name}! Your inquiry has been sent to Hotel DRS Deluxe. We will call you shortly on ${phone}.`);
      e.target.reset();
    }
  } catch (err) {
    alert('Inquiry sent. You can also call 8292749943 directly for instant booking.');
  }
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
