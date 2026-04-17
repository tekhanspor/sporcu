// data.js — Supabase bağlantısı & veri katmanı

const SUPABASE_URL = 'https://moryygjzanzqgqjcaqda.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vcnl5Z2p6YW56cWdxamNhcWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjY2ODksImV4cCI6MjA5MTk0MjY4OX0.gXsYQu9msebmcr9hjSidGeuwVP-NdGZtOhbsk1DO4Nw';

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── ANTRENÖR ──────────────────────────────────────────────────────────────
async function antrenorGiris(kullaniciAdi, sifre) {
  const rows = await sbFetch(`antrenor?kullanici_adi=eq.${encodeURIComponent(kullaniciAdi)}&select=*`);
  if (!rows || rows.length === 0) throw new Error('Kullanıcı adı bulunamadı');
  const antrenor = rows[0];
  if (antrenor.sifre_hash !== sifre) throw new Error('Şifre hatalı');
  return antrenor;
}

// ── SPORCU ────────────────────────────────────────────────────────────────
async function sporcuListesi() {
  return await sbFetch('sporcular?aktif=eq.true&order=ad_soyad.asc&select=*');
}

async function sporcuGetir(id) {
  const rows = await sbFetch(`sporcular?id=eq.${id}&select=*`);
  return rows?.[0] || null;
}

async function sporcuEkle(data) {
  return await sbFetch('sporcular', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function sporcuGuncelle(id, data) {
  return await sbFetch(`sporcular?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

async function sporcuGiris(kullaniciAdi, sifre) {
  const rows = await sbFetch(`sporcular?kullanici_adi=eq.${encodeURIComponent(kullaniciAdi)}&aktif=eq.true&select=*`);
  if (!rows || rows.length === 0) throw new Error('Kullanıcı adı bulunamadı');
  const sporcu = rows[0];
  if (sporcu.sifre_hash !== sifre) throw new Error('Şifre hatalı');
  return sporcu;
}

// ── MOTORİK TESTLER ───────────────────────────────────────────────────────
async function motorikTestleriGetir(sporcuId) {
  return await sbFetch(`motorik_testler?sporcu_id=eq.${sporcuId}&order=test_tarihi.desc&select=*`);
}

async function motorikTestEkle(data) {
  return await sbFetch('motorik_testler', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function tumMotorikTestler() {
  return await sbFetch('motorik_testler?order=test_tarihi.desc&select=*,sporcular(ad_soyad,cinsiyet,dogum_tarihi)');
}

// ── PSİKOLOJİK ANKETLER ──────────────────────────────────────────────────
async function anketleriGetir(sporcuId) {
  return await sbFetch(`psikoloji_anketler?sporcu_id=eq.${sporcuId}&order=anket_tarihi.desc&select=*`);
}

async function anketEkle(data) {
  return await sbFetch('psikoloji_anketler', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function tumAnketler() {
  return await sbFetch('psikoloji_anketler?order=anket_tarihi.desc&select=*,sporcular(ad_soyad)');
}

// ── NORM & HESAPLAMA ──────────────────────────────────────────────────────
const NORMLAR = {
  uzun_atlama_cm:      { normlar: [140,130,155,143,168,152], yuksek_iyi: true  },
  saglik_topu_cm:      { normlar: [350,290,420,340,490,380], yuksek_iyi: true  },
  mekik_tekrar:        { normlar: [18,16,22,19,26,22],       yuksek_iyi: true  },
  sprint_30m_sn:       { normlar: [5.4,5.8,5.0,5.4,4.7,5.1], yuksek_iyi: false },
  illinois_sn:         { normlar: [18.5,19.5,17.2,18.3,16.2,17.5], yuksek_iyi: false },
  flamingo_hata:       { normlar: [6,8,4,6,3,5],             yuksek_iyi: false },
  otur_uzan_cm:        { normlar: [22,26,24,28,26,30],       yuksek_iyi: true  },
  beep_test_seviye:    { normlar: [5.4,4.8,6.2,5.6,7.4,6.8], yuksek_iyi: true  },
  cetvel_reaksiyon_cm: { normlar: [22,24,19,21,16,18],       yuksek_iyi: false },
  dolyo_chagi_tekrar:  { normlar: [13,11,16,14,20,17],       yuksek_iyi: true  },
  fskt_tekrar:         { normlar: [14,12,17,15,21,18],       yuksek_iyi: true  },
  dck60_tekrar:        { normlar: [55,46,65,55,78,65],       yuksek_iyi: true  }
};

function normIndeksiHesapla(yas, cinsiyet) {
  const e = cinsiyet === 'Erkek';
  if (yas <= 12) return e ? 0 : 1;
  if (yas <= 14) return e ? 2 : 3;
  return e ? 4 : 5;
}

function yasHesapla(dogumTarihi) {
  if (!dogumTarihi) return 13;
  const bugun = new Date();
  const dogum = new Date(dogumTarihi);
  let yas = bugun.getFullYear() - dogum.getFullYear();
  const m = bugun.getMonth() - dogum.getMonth();
  if (m < 0 || (m === 0 && bugun.getDate() < dogum.getDate())) yas--;
  return yas;
}

function testDurumu(alan, deger, yas, cinsiyet) {
  if (deger === null || deger === undefined || deger === '') return { durum: '—', renk: 'gray' };
  const conf = NORMLAR[alan];
  if (!conf) return { durum: '—', renk: 'gray' };
  const idx = normIndeksiHesapla(yas, cinsiyet);
  const norm = conf.normlar[idx];
  const oran = conf.yuksek_iyi ? (deger / norm) : (norm / deger);
  let durum, renk;
  if (oran >= 1.10)      { durum = '🟢 Üstün';    renk = 'green'; }
  else if (oran >= 0.90) { durum = '🟡 Normal';   renk = 'yellow'; }
  else if (oran >= 0.80) { durum = '🟠 Geliştir'; renk = 'orange'; }
  else                   { durum = '🔴 Zayıf';    renk = 'red'; }
  return { durum, renk, norm, oran: Math.round(oran * 100) };
}

function psikolojiPuanlari(anket) {
  if (!anket) return null;
  const s = (keys) => keys.reduce((t, k) => t + (parseInt(anket[k]) || 0), 0);
  const avg = (keys) => {
    const vals = keys.map(k => parseInt(anket[k])).filter(v => v > 0);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };
  return {
    bilisselKaygi: s(['bk1','bk2','bk3','bk4','bk5','bk6','bk7','bk8','bk9']),
    somatikKaygi:  s(['sk1','sk2','sk3','sk4','sk5','sk6','sk7','sk8','sk9']),
    ozguven:       s(['og1','og2','og3','og4','og5','og6','og7','og8','og9']),
    gorevYon:      avg(['g1','g2','g3','g4','g5','g6','g7']),
    egoYon:        avg(['e1','e2','e3','e4','e5','e6']),
    kontrol:       avg(['kon1','kon2','kon3']),
    baglilik:      avg(['bag1','bag2','bag3']),
    meydan:        avg(['mey1','mey2','mey3']),
    guven:         avg(['guv1','guv2','guv3']),
    genisDissal:   avg(['gd1','gd2','gd3','gd4']),
    darDissal:     avg(['dd1','dd2','dd3','dd4']),
    dikkatHatasi:  avg(['dh1','dh2','dh3','dh4'])
  };
}

function psikolojiBoyutDurumu(alan, puan) {
  const kurallar = {
    bilisselKaygi: { esik: [18, 27], ters: true },
    somatikKaygi:  { esik: [18, 27], ters: true },
    ozguven:       { esik: [20, 28], ters: false },
    gorevYon:      { esik: [3.0, 4.0], ters: false },
    egoYon:        { esik: [2.5, 3.5], ters: true },
    kontrol:       { esik: [3.0, 4.0], ters: false },
    baglilik:      { esik: [3.0, 4.0], ters: false },
    meydan:        { esik: [2.5, 3.5], ters: false },
    guven:         { esik: [3.0, 4.0], ters: false },
    genisDissal:   { esik: [3.0, 3.5], ters: false },
    darDissal:     { esik: [3.0, 3.5], ters: false },
    dikkatHatasi:  { esik: [2.0, 3.0], ters: true }
  };
  const k = kurallar[alan];
  if (!k || !puan) return { durum: '—', renk: 'gray' };
  const iyi  = !k.ters ? puan >= k.esik[1] : puan <= k.esik[0];
  const orta = !k.ters ? puan >= k.esik[0] : puan <= k.esik[1];
  if (iyi)  return { durum: '✅ İyi',    renk: 'green' };
  if (orta) return { durum: '⚠️ Orta',  renk: 'orange' };
  return      { durum: '🔴 Gelişim', renk: 'red' };
}

const TEST_ETIKETLERI = {
  uzun_atlama_cm:      { ad: 'Durarak Uzun Atlama', birim: 'cm' },
  saglik_topu_cm:      { ad: '2kg Top Fırlatma',    birim: 'cm' },
  mekik_tekrar:        { ad: '30sn Mekik',           birim: 'tekrar' },
  sprint_30m_sn:       { ad: '30m Sprint',           birim: 'sn' },
  illinois_sn:         { ad: 'Illinois Çeviklik',    birim: 'sn' },
  flamingo_hata:       { ad: 'Flamingo Denge',       birim: 'hata' },
  otur_uzan_cm:        { ad: 'Otur-Uzan',            birim: 'cm' },
  beep_test_seviye:    { ad: 'Beep Test',             birim: 'seviye' },
  cetvel_reaksiyon_cm: { ad: 'Cetvel Reaksiyon',     birim: 'cm' },
  dolyo_chagi_tekrar:  { ad: '10sn Dolyo Chagi',     birim: 'tekrar' },
  fskt_tekrar:         { ad: 'FSKT (Tekme Hızı)',    birim: 'tekrar' },
  dck60_tekrar:        { ad: '60sn DCK',              birim: 'tekrar' }
};

// ── ANTRENÖR PSİKOLOJİ GÖZLEM ────────────────────────────────────────────
async function antrenorPsikolojiGetir(sporcuId) {
  return await sbFetch(`antrenor_psikoloji?sporcu_id=eq.${sporcuId}&order=gozlem_tarihi.desc&select=*`);
}

async function antrenorPsikolojiEkle(data) {
  return await sbFetch('antrenor_psikoloji', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

function antrenorPsikolojiPuanlari(g) {
  if (!g) return null;
  const avg = (keys) => {
    const vals = keys.map(k => parseInt(g[k])).filter(v => v > 0);
    return vals.length ? +(vals.reduce((a,b) => a+b,0) / vals.length).toFixed(2) : 0;
  };
  return {
    kaygiGozlem: avg(['kb1','kb2','kb3','kb4','kb5','ks1','ks2','ks3','ks4','ks5','kd1','kd2','kd3','kd4','kd5']),
    gorevYonAnt: avg(['mg1','mg2','mg3','mg4','mg5']),
    egoYonAnt:   avg(['me1','me2','me3','me4','me5']),
    kontrolAnt:  avg(['mk1','mk2','mk3']),
    baglilikAnt: avg(['mb1','mb2','mb3']),
    meyданAnt:   avg(['mm1','mm2','mm3']),
    guvenAnt:    avg(['mgu1','mgu2','mgu3']),
    dikkatAnt:   avg(['kg1','kg2','kg3','kg4','kg5']),
    dikkatBozAnt:avg(['kboz1','kboz2','kboz3','kboz4','kboz5'])
  };
}
