// Google Apps Script - Almostashar Auto (المستشار أوتو) Cloud Engine v2.6.0
// Master Account: autofyon@gmail.com
// Master Owner & WhatsApp: +201222597304 (01222597304)
// Quota: Accounting = 1 Laptop + 1 Mobile | Marketplace = 5 Mobile Phones ONLY

const SYSTEM_NAME = 'Almostashar Auto (المستشار أوتو)';
const MASTER_BACKUP_STORAGE = 'autofyon@gmail.com';
const MASTER_EMAIL = 'autofyon@gmail.com';
const MASTER_OWNER_PHONE = '+201222597304';
const MASTER_LOCAL_PHONE = '01222597304';

// ─── QUOTA CONSTANTS ────────────────────────────────────────
const MAX_ACCOUNTING_LAPTOP = 1;   // Accounting: 1 Computer/Laptop only
const MAX_ACCOUNTING_MOBILE = 1;   // Accounting: 1 Mobile only
const MAX_DEVICES_PER_BUSINESS = 2; // Total: 1 Laptop + 1 Mobile
const MAX_MARKET_MOBILE_USERS = 5;  // Marketplace: 5 Mobile Phones ONLY

const P = PropertiesService.getScriptProperties();

// ─── PUBLIC GET HANDLER (for autonegypt.com — no auth needed) ─
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'get_public_listings';
  let res;
  try {
    if (action === 'get_public_listings') {
      const allData = P.getProperty('PUBLIC_LISTINGS');
      let listings = [];
      if (allData) { try { listings = JSON.parse(allData); } catch(ex){} }
      res = {
        ok: true,
        listings: listings,
        count: listings.length,
        updatedAt: P.getProperty('PUBLIC_LISTINGS_UPDATED') || null,
        source: SYSTEM_NAME
      };
    } else {
      res = { ok: false, error: 'Only get_public_listings is allowed via GET' };
    }
  } catch(err) {
    res = { ok: false, error: String(err) };
  }
  return ContentService
    .createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let res;
  try {
    const req = JSON.parse(e.postData.contents);
    const action = req.action;
    const compName = (req.companyName || 'Auto One Egypt').trim();
    const compPhone = (req.companyPhone || '01222597304').trim();
    const clientKey = sanitizeKey(compName + '_' + compPhone);

    // 1. REGISTRATION & EULA AGREEMENT (Accounting - 1 Laptop + 1 Mobile)
    if (action === 'register_and_accept') {
      const reg = getClientRegistry();
      let client = reg.find(c => c.key === clientKey || (c.phone === compPhone && c.name === compName));
      
      const now = new Date().toISOString();
      if (!client) {
        client = {
          key: clientKey,
          name: compName,
          phone: compPhone,
          registeredAt: now,
          eulaAccepted: true,
          eulaAcceptedAt: now,
          allowedDevices: MAX_DEVICES_PER_BUSINESS,
          devices: [],
          marketUsers: [],
          status: 'Active',
          notes: req.notes || 'تسجيل واعتماد شروط الاستخدام لنظام المستشار أوتو'
        };
        reg.push(client);
      } else {
        client.eulaAccepted = true;
        client.eulaAcceptedAt = now;
        client.status = 'Active';
        if (!client.marketUsers) client.marketUsers = [];
      }

      // Check accounting device authorization (1 Laptop + 1 Mobile)
      const devType = (req.deviceType || 'Laptop').toLowerCase();
      const isLaptop = devType === 'laptop' || devType === 'computer' || devType === 'pc' || devType === 'desktop';
      const isMobile = devType === 'mobile' || devType === 'phone' || devType === 'android' || devType === 'ios';

      const devExists = (client.devices || []).find(d => d.id === req.deviceId);
      if (!devExists) {
        const laptopCount = (client.devices || []).filter(d => d.category === 'laptop').length;
        const mobileCount = (client.devices || []).filter(d => d.category === 'mobile').length;

        if (isLaptop && laptopCount >= MAX_ACCOUNTING_LAPTOP) {
          throw 'تم استهلاك حصة الكمبيوتر (كمبيوتر واحد فقط للمحاسبة). للتوسعة تواصل مع الإدارة: ' + MASTER_LOCAL_PHONE;
        }
        if (isMobile && mobileCount >= MAX_ACCOUNTING_MOBILE) {
          throw 'تم استهلاك حصة الموبايل للمحاسبة (موبايل واحد فقط). للتوسعة تواصل مع الإدارة: ' + MASTER_LOCAL_PHONE;
        }
        if ((client.devices || []).length >= MAX_DEVICES_PER_BUSINESS) {
          throw 'تم استهلاك الحصة القصوى للأجهزة (كمبيوتر واحد + موبايل واحد فقط). للتوسعة تواصل مع الإدارة: ' + MASTER_LOCAL_PHONE;
        }
        client.devices.push({
          id: req.deviceId,
          type: req.deviceType || 'Laptop',
          category: isLaptop ? 'laptop' : (isMobile ? 'mobile' : 'other'),
          firstSeen: now
        });
      }
      
      saveClientRegistry(reg);
      logMasterActivity(`تسجيل اعتماد شروط الاستخدام: [${compName}] - هاتف: [${compPhone}] - جهاز: ${req.deviceType}`);

      res = {
        ok: true,
        message: 'تم حجز وترخيص النسخة وتوثيق الموافقة على شروط نظام المستشار أوتو بنجاح',
        clientKey: client.key,
        businessName: client.name,
        businessPhone: client.phone,
        registeredDevices: client.devices.length,
        maxDevices: MAX_DEVICES_PER_BUSINESS,
        quotaInfo: '1 كمبيوتر + 1 موبايل للمحاسبة | 5 هواتف محمولة للسوق',
        masterOwner: MASTER_OWNER_PHONE,
        masterEmail: MASTER_EMAIL,
        systemName: SYSTEM_NAME
      };
    }

    // 2. ACTIVATE LICENSE PIN
    else if (action === 'activate') {
      const reg = getClientRegistry();
      const client = reg.find(c => c.key === clientKey);
      if (!client) {
        throw 'هذا المعرض غير مسجل في سحابة المستشار أوتو المركزية. يرجى إتمام التسجيل وتوثيق شروط الاستخدام أولاً.';
      }
      res = {
        ok: true,
        message: 'الجهاز مرخص ومفعل لنظام المستشار أوتو',
        deviceType: req.deviceType || 'Laptop',
        masterOwner: MASTER_OWNER_PHONE
      };
    }

    // 3. REGISTER MARKETPLACE MOBILE USER (5 Mobile Phones ONLY)
    else if (action === 'register_market_user') {
      const reg = getClientRegistry();
      let client = reg.find(c => c.key === clientKey);
      if (!client) throw 'المعرض غير مسجل. أكمل تسجيل المحاسبة أولاً.';
      if (!client.marketUsers) client.marketUsers = [];

      const marketPhone = (req.marketPhone || '').replace(/\D/g, '');
      if (!marketPhone || marketPhone.length < 10) throw 'رقم الهاتف غير صالح';

      // Mobile-only enforcement
      const devType = (req.deviceType || 'mobile').toLowerCase();
      const isDesktop = devType === 'laptop' || devType === 'computer' || devType === 'pc' || devType === 'desktop';
      if (isDesktop) throw 'سوق السيارات للموبايل فقط! لا يمكن تسجيل أجهزة الكمبيوتر في سوق البيع.';

      // Check 5-user limit
      const existing = client.marketUsers.find(u => u.phone === marketPhone);
      if (!existing) {
        if (client.marketUsers.length >= MAX_MARKET_MOBILE_USERS) {
          throw 'تم الوصول إلى الحد الأقصى: 5 هواتف محمولة فقط مصرح لهم في سوق السيارات. تواصل مع الإدارة: ' + MASTER_LOCAL_PHONE;
        }
        client.marketUsers.push({
          phone: marketPhone,
          name: req.marketUserName || 'مندوب',
          addedAt: new Date().toISOString(),
          deviceType: 'Mobile'
        });
        saveClientRegistry(reg);
        logMasterActivity(`إضافة مندوب سوق جديد: [${marketPhone}] للمعرض [${compName}]`);
      }

      res = {
        ok: true,
        message: 'تم تسجيل رقم الهاتف في سوق المستشار أوتو',
        authorizedUsers: client.marketUsers.length,
        maxMarketUsers: MAX_MARKET_MOBILE_USERS,
        remainingSlots: MAX_MARKET_MOBILE_USERS - client.marketUsers.length
      };
    }

    // 4. GET MARKETPLACE USERS
    else if (action === 'get_market_users') {
      const reg = getClientRegistry();
      const client = reg.find(c => c.key === clientKey);
      if (!client) throw 'المعرض غير مسجل.';
      res = {
        ok: true,
        marketUsers: client.marketUsers || [],
        maxMarketUsers: MAX_MARKET_MOBILE_USERS,
        authorizedCount: (client.marketUsers || []).length
      };
    }

    // 5. REMOVE MARKETPLACE USER
    else if (action === 'remove_market_user') {
      const reg = getClientRegistry();
      const client = reg.find(c => c.key === clientKey);
      if (!client) throw 'المعرض غير مسجل.';
      const targetPhone = (req.marketPhone || '').replace(/\D/g, '');
      client.marketUsers = (client.marketUsers || []).filter(u => u.phone !== targetPhone);
      saveClientRegistry(reg);
      logMasterActivity(`إلغاء تصريح مندوب سوق: [${targetPhone}] من المعرض [${compName}]`);
      res = {
        ok: true,
        message: 'تم إلغاء تصريح رقم الهاتف من سوق السيارات',
        authorizedUsers: client.marketUsers.length,
        maxMarketUsers: MAX_MARKET_MOBILE_USERS
      };
    }

    // 6. PULL DATA (معزولة بالكامل باسم ورقم المعرض)
    else if (action === 'pull') {
      verifyClientAccess(clientKey, req.deviceId);
      const data = readBusinessData(clientKey);
      res = {
        ok: true,
        data: data,
        business: compName,
        phone: compPhone,
        masterEmail: MASTER_EMAIL,
        masterOwner: MASTER_OWNER_PHONE
      };
    }

    // 7. PUSH DATA (حفظ سحابي معزول وفوري)
    else if (action === 'push') {
      verifyClientAccess(clientKey, req.deviceId);
      writeBusinessData(clientKey, compName, compPhone, req.data);
      updateClientActivity(clientKey, req.data);
      res = {
        ok: true,
        timestamp: new Date().toISOString(),
        business: compName,
        masterOwner: MASTER_OWNER_PHONE
      };
    }

    // 8. GET RIBBONS
    else if (action === 'get_ribbons') {
      const ribbons = getRibbonsData();
      res = { ok: true, ribbons: ribbons };
    }

    // 9. GET PUBLIC LISTINGS (no auth — for autonegypt.com public website)
    else if (action === 'get_public_listings') {
      // Public endpoint: returns only cars marked isPublic:true — no sensitive data
      const allData = P.getProperty('PUBLIC_LISTINGS');
      let listings = [];
      if (allData) { try { listings = JSON.parse(allData); } catch(e){} }
      res = {
        ok: true,
        listings: listings,
        count: listings.length,
        updatedAt: P.getProperty('PUBLIC_LISTINGS_UPDATED') || null,
        source: SYSTEM_NAME
      };
    }

    // 10. PUSH PUBLIC LISTINGS (called by local system when isPublic car is saved)
    else if (action === 'push_public_listings') {
      const listings = req.listings || [];
      // Strip sensitive fields before storing publicly
      const safe = listings.map(c => ({
        id:          c.id,
        brand:       c.brand || '',
        model:       c.model || '',
        year:        c.year || '',
        color:       c.color || '',
        condition:   c.condition || '',
        price:       c.price || 0,
        status:      c.status || 'Available',
        locationName:c.locationName || '',
        custody:     c.custody || '',
        showroomName: compName,
        showroomPhone: compPhone,
        addedToWebAt: c.addedToWebAt || new Date().toISOString(),
        description: c.description || ''
      }));
      P.setProperty('PUBLIC_LISTINGS', JSON.stringify(safe));
      P.setProperty('PUBLIC_LISTINGS_UPDATED', new Date().toISOString());
      logMasterActivity('تحديث قائمة السيارات العامة: ' + safe.length + ' سيارة معروضة على autonegypt.com');
      res = { ok: true, count: safe.length, updatedAt: new Date().toISOString() };
    }

    // 11. SAVE RIBBON
    else if (action === 'save_ribbon') {
      const item = req.ribbon;
      if (!item) throw 'بيانات الشريط غير صحيحة';
      const ribbons = saveRibbonData(item);
      logMasterActivity(`تحديث شريط التنبيهات: [${item.type}] ${item.title}`);
      res = { ok: true, ribbons: ribbons };
    }

    else {
      throw 'Unknown action: ' + action;
    }

  } catch (err) {
    res = { ok: false, error: String(err) };
  }

  return ContentService
    .createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── MASTER REGISTRY & SECURITY ─────────────────────────────
function sanitizeKey(str) {
  return String(str || '').replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_').substring(0, 30);
}

function getClientRegistry() {
  const raw = P.getProperty('CLIENTS_REGISTRY');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch(e) { return []; }
}

function saveClientRegistry(arr) {
  P.setProperty('CLIENTS_REGISTRY', JSON.stringify(arr));
  syncRegistryToSheet(arr);
}

function verifyClientAccess(clientKey, deviceId) {
  const reg = getClientRegistry();
  const client = reg.find(c => c.key === clientKey);
  if (!client) throw 'المعرض غير مسجل بسحابة autofyon@gmail.com. تواصل مع: ' + MASTER_LOCAL_PHONE;
  if (client.status !== 'Active') throw 'تم تعليق هذا الترخيص مؤقتاً. راجع الإدارة: ' + MASTER_LOCAL_PHONE;
  const dev = (client.devices || []).find(d => d.id === deviceId);
  if (!dev) {
    if ((client.devices || []).length < MAX_DEVICES_PER_BUSINESS) {
      client.devices.push({ id: deviceId, type: 'Device', category: 'other', firstSeen: new Date().toISOString() });
      saveClientRegistry(reg);
    } else {
      throw 'تجاوزت الحد الأقصى للأجهزة (كمبيوتر واحد + موبايل واحد). تواصل مع الإدارة: ' + MASTER_LOCAL_PHONE;
    }
  }
}

// ─── RIBBONS / ANNOUNCEMENT SYSTEM ─────────────────────────
function getRibbonsData() {
  const raw = P.getProperty('MARKET_RIBBONS');
  if (raw) {
    try { return JSON.parse(raw); } catch(e){}
  }
  return [{
    id: 'ribbon-welcome-cloud',
    title: 'مرحباً بكم في منصة المستشار أوتو (Almostashar Auto)',
    content: 'أهلاً بكم في منظومة المستشار أوتو لإدارة معارض السيارات وسوق البيع المباشر. [تواصل مع الإدارة عبر الواتساب](https://wa.me/201222597304) لأي استفسارات.',
    type: 'news',
    audience: 'public',
    targetPhone: '',
    fromDateTime: '2026-11-01T00:00',
    toDateTime: '2026-12-31T23:59',
    active: true
  }];
}

function saveRibbonData(item) {
  let list = getRibbonsData();
  if (!item.id) item.id = 'ribbon-' + Date.now();
  item.updatedAt = new Date().toISOString();
  const idx = list.findIndex(r => r.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  P.setProperty('MARKET_RIBBONS', JSON.stringify(list));
  syncRibbonsToSheet(list);
  return list;
}

function syncRibbonsToSheet(list) {
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName('📢_شريط_الإعلانات_والتنبيهات') || ss.insertSheet('📢_شريط_الإعلانات_والتنبيهات');
    sh.clear();
    const headers = ['معرّف', 'النوع (news/notice/warning)', 'الجمهور (public/private)', 'الهاتف المستهدف', 'من تاريخ', 'إلى تاريخ', 'العنوان', 'النص والروابط'];
    const rows = list.map(r => [r.id, r.type, r.audience, r.targetPhone || 'الجميع', r.fromDateTime, r.toDateTime, r.title, r.content]);
    const all = [headers].concat(rows);
    sh.getRange(1, 1, all.length, headers.length).setValues(all);
    sh.getRange(1, 1, 1, headers.length).setBackground('#1A73E8').setFontColor('#ffffff').setFontWeight('bold');
  } catch(e){}
}

// ─── MULTI-TENANT ISOLATED DATA STORAGE ─────────────────────
const B_TABS = ['Cars', 'Contracts', 'Installments', 'Customers', 'Journal', 'Settings', 'Leads'];

function readBusinessData(clientKey) {
  const ss = SpreadsheetApp.getActive();
  const out = {};
  B_TABS.forEach(tabName => {
    const sheetTitle = `${clientKey}_${tabName}`;
    const sh = ss.getSheetByName(sheetTitle);
    if (!sh) { out[tabName] = []; return; }
    const vals = sh.getDataRange().getValues();
    if (vals.length < 2) { out[tabName] = []; return; }
    const headers = vals.shift();
    out[tabName] = vals.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
  });
  return out;
}

function writeBusinessData(clientKey, compName, compPhone, data) {
  const ss = SpreadsheetApp.getActive();
  B_TABS.forEach(tabName => {
    const sheetTitle = `${clientKey}_${tabName}`;
    const sh = ss.getSheetByName(sheetTitle) || ss.insertSheet(sheetTitle);
    sh.clear();
    const rows = data[tabName] || [];
    if (!rows.length) return;
    const headers = [...new Set(rows.flatMap(Object.keys))];
    const vals = [headers].concat(rows.map(r => headers.map(k => String(r[k] ?? ''))));
    const rg = sh.getRange(1, 1, vals.length, headers.length);
    rg.setNumberFormat('@');
    rg.setValues(vals);
  });
}

function syncRegistryToSheet(reg) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('🏢_سجل_المعارض_والتراخيص') || ss.insertSheet('🏢_سجل_المعارض_والتراخيص', 0);
  sh.clear();
  const headers = [
    'كود المعرض', 'اسم المعرض', 'رقم الهاتف/واتساب', 'الحالة',
    'تاريخ التسجيل', 'موافقة الشروط EULA',
    'أجهزة المحاسبة (1 PC + 1 Mobile)', 'مندوبو السوق (5 موبايل)',
    'أحدث نشاط'
  ];
  const rows = reg.map(c => [
    c.key,
    c.name,
    c.phone,
    c.status || 'Active',
    c.registeredAt || '',
    c.eulaAccepted ? 'نعم (مقبول)' : 'معلق',
    (c.devices || []).length + ' / ' + MAX_DEVICES_PER_BUSINESS + ' (1 PC + 1 Mobile)',
    (c.marketUsers || []).length + ' / ' + MAX_MARKET_MOBILE_USERS + ' هواتف محمولة',
    c.lastActivity || ''
  ]);
  const allVals = [headers].concat(rows);
  sh.getRange(1, 1, allVals.length, headers.length).setValues(allVals);
  sh.getRange(1, 1, 1, headers.length).setBackground('#075E54').setFontColor('#ffffff').setFontWeight('bold');
}

function updateClientActivity(clientKey, data) {
  const reg = getClientRegistry();
  const client = reg.find(c => c.key === clientKey);
  if (client) {
    client.lastActivity = new Date().toISOString();
    if (data && data.Cars) client.carsCount = data.Cars.length;
    if (data && data.Contracts) client.contractsCount = data.Contracts.length;
    saveClientRegistry(reg);
  }
}

function logMasterActivity(msg) {
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName('📜_سجل_العمليات_المركزي') || ss.insertSheet('📜_سجل_العمليات_المركزي');
    sh.appendRow([new Date().toISOString(), msg, MASTER_EMAIL, MASTER_OWNER_PHONE]);
  } catch(e){}
}
