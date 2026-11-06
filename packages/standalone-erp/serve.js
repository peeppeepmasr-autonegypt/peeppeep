const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT = process.env.PORT || 8080;
const ORDERS_FILE = path.join(__dirname, 'market_orders.json');
const RIBBONS_FILE = path.join(__dirname, 'market_ribbons.json');
const MARKET_USERS_FILE = path.join(__dirname, 'market_users.json');
const MAX_MARKET_USERS = 5;

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':  'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png','.jpg':'image/jpeg',
  '.svg': 'image/svg+xml','.ico':'image/x-icon'
};

function loadOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE,'utf-8')); }
  catch { return []; }
}
function saveOrders(arr) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
}

function loadRibbons() {
  try { 
    if (!fs.existsSync(RIBBONS_FILE)) {
      const def = [{
        id: 'ribbon-welcome-1',
        title: 'مرحباً بكم في منصة مستشارك (Mostasharak)',
        content: 'أهلاً بكم في منظومة مستشارك لإدارة معارض السيارات وسوق البيع المباشر. [تواصل مع الإدارة عبر الواتساب](https://wa.me/201222597304) لأي استفسارات أو طلبات حجز خاصة.',
        type: 'news',
        audience: 'public',
        targetPhone: '',
        fromDateTime: '2026-11-01T00:00',
        toDateTime: '2026-12-31T23:59',
        active: true,
        createdAt: new Date().toISOString()
      }];
      fs.writeFileSync(RIBBONS_FILE, JSON.stringify(def, null, 2), 'utf-8');
      return def;
    }
    return JSON.parse(fs.readFileSync(RIBBONS_FILE,'utf-8')); 
  }
  catch { return []; }
}
function saveRibbons(arr) {
  fs.writeFileSync(RIBBONS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
}
function loadMarketUsers() {
  try {
    if (!fs.existsSync(MARKET_USERS_FILE)) {
      const def = [{ phone: '01222597304', name: 'مدير المعرض', addedAt: new Date().toISOString() }];
      fs.writeFileSync(MARKET_USERS_FILE, JSON.stringify(def, null, 2), 'utf-8');
      return def;
    }
    return JSON.parse(fs.readFileSync(MARKET_USERS_FILE, 'utf-8'));
  } catch { return []; }
}
function saveMarketUsers(arr) {
  fs.writeFileSync(MARKET_USERS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
}


const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // ── API: POST /api/orders  (Market App → Accounting PC) ────
  if (url === '/api/orders' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const order = JSON.parse(body);
        order.id      = 'ORD-' + Date.now();
        order.received = new Date().toISOString();
        order.status  = 'pending';
        const orders = loadOrders();
        orders.unshift(order);
        saveOrders(orders);
        console.log(`📲 New Market Order received: ${order.productName} from ${order.buyerName}`);
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: true, orderId: order.id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // ── API: GET /api/orders ──
  if (url === '/api/orders' && req.method === 'GET') {
    const orders = loadOrders();
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify({ ok: true, orders }));
    return;
  }

  // ── API: POST /api/orders/action ──
  if (url === '/api/orders/action' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { orderId, action } = JSON.parse(body);
        const orders = loadOrders();
        const order  = orders.find(o => o.id === orderId);
        if (!order) throw new Error('Order not found');
        order.status    = action;
        order.actionAt  = new Date().toISOString();
        saveOrders(orders);
        console.log(`✅ Order ${orderId} → ${action}`);
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: true, order }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // ── API: GET /api/ribbons (Retrieve announcements) ──
  if (url === '/api/ribbons' && req.method === 'GET') {
    const ribbons = loadRibbons();
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify({ ok: true, ribbons }));
    return;
  }

  // ── API: POST /api/ribbons (Save / Create announcement) ──
  if (url === '/api/ribbons' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        const ribbons = loadRibbons();
        if (!item.id) item.id = 'ribbon-' + Date.now();
        item.updatedAt = new Date().toISOString();
        if (!item.createdAt) item.createdAt = item.updatedAt;
        const idx = ribbons.findIndex(r => r.id === item.id);
        if (idx >= 0) {
          ribbons[idx] = item;
        } else {
          ribbons.unshift(item);
        }
        saveRibbons(ribbons);
        console.log(`📢 Ribbon Saved: [${item.type}] ${item.title}`);
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: true, ribbon: item }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // ── API: POST /api/ribbons/delete ──
  if (url === '/api/ribbons/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body);
        let ribbons = loadRibbons();
        ribbons = ribbons.filter(r => r.id !== id);
        saveRibbons(ribbons);
        console.log(`🗑 Ribbon Deleted: ${id}`);
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // ── API: GET /api/ping ──
  if (url === '/api/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    const mu = loadMarketUsers(); res.end(JSON.stringify({ ok: true, server: 'Almostashar Auto Server', port: PORT, time: new Date().toISOString(), marketUsers: mu.length, maxMarketUsers: MAX_MARKET_USERS }));
    return;
  }

  // ── API: GET /api/public-listings (for autonegypt.com dev testing) ──
  
  // ── API: POST /api/public-listings (Sync car to local server) ──
  if (url === '/api/public-listings' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const car = JSON.parse(body);
        const dbFile = path.join(__dirname, 'db.json');
        let db = { cars: [], settings: {} };
        if (fs.existsSync(dbFile)) {
          try { db = JSON.parse(fs.readFileSync(dbFile, 'utf-8')); } catch(e){}
        }
        if (!db.cars) db.cars = [];
        const existingIdx = db.cars.findIndex(c => c.id === car.id);
        if (existingIdx >= 0) {
          db.cars[existingIdx] = { ...db.cars[existingIdx], ...car };
        } else {
          db.cars.unshift(car);
        }
        fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf-8');
        console.log('🚗 Car synced to server:', car.brand, car.model);
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: true, id: car.id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  if (url === '/api/public-listings' && req.method === 'GET') {
    // Read cars from local storage and return only public ones
    const dbFile = path.join(__dirname, 'db.json');
    let publicCars = [];
    if (fs.existsSync(dbFile)) {
      try {
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
        const cars = db.cars || [];
        const settings = db.settings || {};
        publicCars = cars
          .filter(c => c.isPublic && c.status !== 'Sold')
          .map(c => ({
            id: c.id,
            brand: c.brand || '',
            model: c.model || '',
            year: c.year || '',
            color: c.color || '',
            condition: c.condition || '',
            price: c.price || 0,
            status: c.status || 'Available',
            locationName: c.locationName || '',
            showroomName: settings.companyName || 'المستشار أوتو',
            showroomPhone: settings.companyPhone || '01222597304',
            transmission: c.transmission || 'أوتوماتيك',
            engineCC: c.engineCC || '',
            mileage: c.mileage || 0,
            arabicSummary: c.arabicSummary || c.description || '',
            specsBadges: c.specsBadges || (c.arabicSummary ? c.arabicSummary.split(' - ') : ['فابريكا بالكامل', 'معتمد']),
            photos: c.photos || (c.photoUrl ? [c.photoUrl] : []),
            addedToWebAt: c.addedToWebAt || null,
            description: c.description || ''
          }));
      } catch(e) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify({ ok: true, listings: publicCars, count: publicCars.length }));
    return;
  }

  // ── API: GET /api/market-users ──
  if (url === '/api/market-users' && req.method === 'GET') {
    const users = loadMarketUsers();
    res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
    res.end(JSON.stringify({ ok: true, users, maxUsers: MAX_MARKET_USERS, remaining: MAX_MARKET_USERS - users.length }));
    return;
  }

  // ── API: POST /api/market-users (Add phone — mobile only, max 5) ──
  if (url === '/api/market-users' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { phone, name } = JSON.parse(body);
        const cleanPhone = (phone || '').replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 10) throw new Error('رقم الهاتف غير صالح');
        const users = loadMarketUsers();
        if (users.find(u => u.phone === cleanPhone)) {
          res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
          res.end(JSON.stringify({ ok: true, message: 'الرقم مسجل مسبقاً', users, maxUsers: MAX_MARKET_USERS }));
          return;
        }
        if (users.length >= MAX_MARKET_USERS) {
          res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
          res.end(JSON.stringify({ ok: false, error: 'الحد الأقصى: 5 هواتف محمولة فقط مصرح لهم في سوق السيارات' }));
          return;
        }
        users.push({ phone: cleanPhone, name: name || 'مندوب', addedAt: new Date().toISOString() });
        saveMarketUsers(users);
        console.log('📱 Market user added: ' + cleanPhone);
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: true, users, maxUsers: MAX_MARKET_USERS, remaining: MAX_MARKET_USERS - users.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // ── API: POST /api/market-users/delete (Remove by phone) ──
  if (url === '/api/market-users/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { phone } = JSON.parse(body);
        const cleanPhone = (phone || '').replace(/\D/g, '');
        let users = loadMarketUsers();
        users = users.filter(u => u.phone !== cleanPhone);
        saveMarketUsers(users);
        console.log('🗑 Market user removed: ' + cleanPhone);
        res.writeHead(200, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: true, users, maxUsers: MAX_MARKET_USERS, remaining: MAX_MARKET_USERS - users.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...CORS });
        res.end(JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  // ── Static files ──
  let reqPath = url === '/' || url === '' ? '/index.html' : url;
  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', ...CORS });
    res.end(data);
  });
});

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets))
    for (const net of nets[name])
      if (net.family === 'IPv4' && !net.internal) return net.address;
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp();
  console.log('═══════════════════════════════════════════════════');
  console.log('🚗  Mostasharak Server (نظام مستشارك) — PC & Mobile');
  console.log('═══════════════════════════════════════════════════');
  console.log(`💻  Accounting PC   :  http://localhost:${PORT}`);
  console.log(`📱  Market Mobile   :  http://${ip}:${PORT}/market.html`);
  console.log('───────────────────────────────────────────────────');
  console.log(`📲  Orders API      :  http://${ip}:${PORT}/api/orders`);
  console.log(`📢  Ribbons API     :  http://${ip}:${PORT}/api/ribbons`);
  console.log(`📡  Ping check      :  http://${ip}:${PORT}/api/ping`);
  console.log('═══════════════════════════════════════════════════');
});
