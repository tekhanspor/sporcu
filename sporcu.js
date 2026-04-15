const SUPABASE_URL = 'https://jyqogzzklpwwixhoyunf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cW9nenprbHB3d2l4aG95dW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzg3NjgsImV4cCI6MjA5MTg1NDc2OH0.dL82bDsnCIhLkxqflLzwDADsAwgwHwyTj2KawH639w0';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Norm tablosu: { norm_erkek_1314, norm_kiz_1314, norm_erkek_1516, norm_kiz_1516, dusuk_iyi: true/false }
const NORMLAR = {
  uzun_atlama:        { ad: 'Durarak Uzun Atlama',       birim: 'cm',    E_1012: 140, K_1012: 130, E_1314: 155, K_1314: 143, E_1516: 168, K_1516: 152, dusuk_iyi: false, egzersizler: 'Box Jump, Squat Jump, Lunge Jump, Depth Jump', siklık: 'Haftada 3 kez · 3x8-10 tekrar' },
  saglik_topu:        { ad: '2kg Sağlık Topu Fırlatma',  birim: 'cm',    E_1012: 350, K_1012: 290, E_1314: 420, K_1314: 340, E_1516: 490, K_1516: 380, dusuk_iyi: false, egzersizler: 'Med-Ball Fırlatma, Push Press, Plyometrik Push-Up', siklık: 'Haftada 3 kez · 3x8 tekrar' },
  mekik_30sn:         { ad: '30 sn Mekik',               birim: 'tekrar',E_1012: 18,  K_1012: 16,  E_1314: 22,  K_1314: 19,  E_1516: 26,  K_1516: 22,  dusuk_iyi: false, egzersizler: 'Mekik, Plank, Russian Twist, Dead Bug', siklık: 'Haftada 3 kez · 3x20-25 tekrar' },
  sprint_30m:         { ad: '30m Sprint',                birim: 'sn',    E_1012: 5.4, K_1012: 5.8, E_1314: 5.0, K_1314: 5.4, E_1516: 4.7, K_1516: 5.1, dusuk_iyi: true,  egzersizler: 'Uçuş Sprintleri 20-30m, Direnç Kayışı Sprint, A-B-C Skip', siklık: 'Haftada 3 kez · 6-10x20-30m' },
  illinois:           { ad: 'Illinois Çeviklik',         birim: 'sn',    E_1012: 18.5,K_1012: 19.5,E_1314: 17.2,K_1314: 18.3,E_1516: 16.2,K_1516: 17.5,dusuk_iyi: true,  egzersizler: 'Illinois Testi, T-Drill, 505 Çeviklik, Merdiven Drill', siklık: 'Haftada 3 kez · 5-8x10-15sn' },
  flamingo:           { ad: 'Flamingo Denge',            birim: 'hata',  E_1012: 6,   K_1012: 8,   E_1314: 4,   K_1314: 6,   E_1516: 3,   K_1516: 5,   dusuk_iyi: true,  egzersizler: 'Flamingo Denge, BOSU Squat, Tek Ayak Gözler Kapalı', siklık: 'Her antrenman · 3x30-60sn' },
  otur_uzan:          { ad: 'Otur-Uzan Testi',           birim: 'cm',    E_1012: 22,  K_1012: 26,  E_1314: 24,  K_1314: 28,  E_1516: 26,  K_1516: 30,  dusuk_iyi: false, egzersizler: 'Statik Esneme (PNF), Otur-Uzan, Bacak Sallamaları', siklık: 'Her gün · 3x30sn tutma' },
  beep_test:          { ad: '20m Mekik Koşusu',          birim: 'seviye',E_1012: 5.4, K_1012: 4.8, E_1314: 6.2, K_1314: 5.6, E_1516: 7.4, K_1516: 6.8, dusuk_iyi: false, egzersizler: 'Tempo Koşu, Interval Koşu (1:1), Beep Testi Çalışması', siklık: 'Haftada 3 kez · 20-40 dk %65-80' },
  cember_koordinasyon:{ ad: 'Çember Koordinasyon',       birim: 'sn',    E_1012: 12.5,K_1012: 13,  E_1314: 11.2,K_1314: 11.8,E_1516: 10,  K_1516: 10.8,dusuk_iyi: true,  egzersizler: 'Çember Atlama, Bilişsel Drill, Koordinasyon Merdiveni', siklık: 'Haftada 3 kez · 4-6 set' },
  cetvel_reaksiyon:   { ad: 'Cetvel Reaksiyon',          birim: 'cm',    E_1012: 22,  K_1012: 24,  E_1314: 19,  K_1314: 21,  E_1516: 16,  K_1516: 18,  dusuk_iyi: true,  egzersizler: 'Cetvel Düşürme, Işık Reaksiyon, Renk Komutu Sprint', siklık: 'Her antrenman · 5x5 tekrar' },
  el_dinamometre:     { ad: 'El Dinamometresi',          birim: 'kg',    E_1012: 20,  K_1012: 17,  E_1314: 28,  K_1314: 22,  E_1516: 36,  K_1516: 27,  dusuk_iyi: false, egzersizler: 'Hand Grip Squeezes, Wrist Curls, Dead Hang', siklık: 'Haftada 3 kez · 3x30sn' },
  wingate:            { ad: 'Wingate 30sn',              birim: 'W/kg',  E_1012: 7.5, K_1012: 6.8, E_1314: 8.2, K_1314: 7.4, E_1516: 9,   K_1516: 8.2, dusuk_iyi: false, egzersizler: 'Wingate Protokolü, 30m All-Out Sprint x6, Tabata Squat Jump', siklık: 'Haftada 2 kez · 6-10x10-30sn' },
};

let sporcuData = null;
let aktifOdevId = null;
let odevBaslangic = null;
let timerInterval = null;

// ===== BAŞLANGIÇ =====
window.onload = async function() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) { document.getElementById('yukleniyor').innerHTML = '<p style="color:white;">Sporcu bulunamadı.</p>'; return; }

  const { data: sporcu } = await sb.from('sporcular').select('*').eq('slug', slug).single();
  if (!sporcu) { document.getElementById('yukleniyor').innerHTML = '<p style="color:white;">Sporcu bulunamadı.</p>'; return; }

  sporcuData = sporcu;
  sporcuBilgileriniGoster(sporcu);

  await testAnaliziniYukle(sporcu);
  await odevleriYukle(sporcu.id);

  document.getElementById('yukleniyor').classList.add('hidden');
  document.getElementById('sporcu-icerik').classList.remove('hidden');
};

function sporcuBilgileriniGoster(s) {
  const initials = s.ad_soyad.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('s-avatar').textContent = initials;
  document.getElementById('s-isim').textContent = s.ad_soyad;
  const yas = s.dogum_tarihi ? (new Date().getFullYear() - new Date(s.dogum_tarihi).getFullYear()) : '';
  document.getElementById('s-detay').textContent = [s.cinsiyet, yas ? yas + ' yaş' : '', s.dan_kusak].filter(Boolean).join(' · ');
  document.title = s.ad_soyad + ' — Antrenman';
}

// ===== TEST ANALİZİ =====
async function testAnaliziniYukle(sporcu) {
  const { data: testler } = await sb.from('test_sonuclari')
    .select('*').eq('sporcu_id', sporcu.id)
    .order('test_tarihi', { ascending: false }).limit(1);

  if (!testler || testler.length === 0) {
    document.getElementById('analiz-bos').classList.remove('hidden');
    document.getElementById('analiz-icerik').classList.add('hidden');
    return;
  }

  const test = testler[0];
  const yas = sporcu.dogum_tarihi ? (new Date().getFullYear() - new Date(sporcu.dogum_tarihi).getFullYear()) : 14;
  const cins = sporcu.cinsiyet === 'Kız' ? 'K' : 'E';
  const yas_grup = yas <= 12 ? '1012' : yas <= 14 ? '1314' : '1516';
  const norm_key = `${cins}_${yas_grup}`;

  let ustun = 0, normal = 0, gelistir = 0, zayif = 0;
  let testKartiHTML = '';
  let zayifHTML = '';

  for (const [key, n] of Object.entries(NORMLAR)) {
    const deger = parseFloat(test[key]);
    if (isNaN(deger)) continue;

    const norm = n[norm_key] || n['E_1314'];
    const oran = n.dusuk_iyi ? (norm / deger) : (deger / norm);

    let durum, badge, barClass, barWidth;
    if (oran >= 1.10) { durum = 'Üstün'; badge = 'badge-ustun'; barClass = 'bar-ustun'; barWidth = 100; ustun++; }
    else if (oran >= 0.90) { durum = 'Normal'; badge = 'badge-normal'; barClass = 'bar-normal'; barWidth = 75; normal++; }
    else if (oran >= 0.80) { durum = 'Geliştir'; badge = 'badge-gelistir'; barClass = 'bar-gelistir'; barWidth = 50; gelistir++; }
    else { durum = 'Zayıf'; badge = 'badge-zayif'; barClass = 'bar-zayif'; barWidth = 25; zayif++; }

    testKartiHTML += `
      <div class="test-kart">
        <div class="test-kart-sol">
          <div class="test-kart-ad">${n.ad}</div>
          <div class="test-kart-deger">${deger} ${n.birim} · Norm: ${norm} ${n.birim}</div>
        </div>
        <div class="test-kart-bar"><div class="test-kart-bar-fill ${barClass}" style="width:${barWidth}%"></div></div>
        <span class="badge ${badge}">${durum}</span>
      </div>`;

    if (durum === 'Zayıf' || durum === 'Geliştir') {
      zayifHTML += `
        <div class="zayif-kart">
          <div class="zayif-kart-baslik">${n.ad} <span class="badge ${badge}" style="font-size:10px;">${durum}</span></div>
          <div class="zayif-kart-egz">${n.egzersizler}</div>
          <div class="zayif-kart-siklık">${n.siklık}</div>
        </div>`;
    }
  }

  document.getElementById('ozet-kartlar').innerHTML = `
    <div class="ozet-kart"><div class="ozet-sayi sayi-yesil">${ustun}</div><div class="ozet-etiket">Üstün</div></div>
    <div class="ozet-kart"><div class="ozet-sayi sayi-sari">${normal}</div><div class="ozet-etiket">Normal</div></div>
    <div class="ozet-kart"><div class="ozet-sayi sayi-kirmizi">${zayif + gelistir}</div><div class="ozet-etiket">Geliştirilecek</div></div>`;

  document.getElementById('test-kartlari').innerHTML = testKartiHTML || '<p style="color:#aaa;font-size:14px;">Test verisi yok.</p>';
  document.getElementById('zayif-alanlar').innerHTML = zayifHTML || '<p style="color:#16a34a;font-size:14px;">Tüm alanlarda norm değerinde veya üstünde!</p>';
}

// ===== EV ÖDEVLERİ =====
async function odevleriYukle(sporcuId) {
  const { data: odevler } = await sb.from('ev_odevleri')
    .select('*').eq('sporcu_id', sporcuId)
    .order('tarih', { ascending: false });

  if (!odevler || odevler.length === 0) return;

  // tamamlananları kontrol et
  const { data: tamamlananlar } = await sb.from('odev_tamamlama')
    .select('odev_id').eq('sporcu_id', sporcuId).eq('tamamlandi', true);
  const tamamSet = new Set((tamamlananlar || []).map(t => t.odev_id));

  document.getElementById('odev-bos').classList.add('hidden');
  document.getElementById('odev-icerik').classList.remove('hidden');

  let html = '<div class="odev-kartlari">';
  odevler.forEach(o => {
    const tamam = tamamSet.has(o.id);
    html += `
      <div class="odev-sporcu-kart">
        <div class="odev-sporcu-kart-header">
          <div class="odev-sporcu-baslik">${o.baslik}</div>
          ${tamam ? '<span class="odev-tamam-badge">Tamamlandı</span>' : ''}
        </div>
        ${o.aciklama ? `<div class="odev-sporcu-aciklama">${o.aciklama}</div>` : ''}
        <div class="odev-sporcu-alt">
          <span>${o.tarih || ''} · ${o.sure_dakika || '—'} dk</span>
          ${!tamam ? `<button class="odev-baslat-btn" onclick="odevModalAc('${o.id}','${o.baslik}','${(o.aciklama||'').replace(/'/g,"\\'")}',${o.sure_dakika||0})">Başlat</button>` : ''}
        </div>
      </div>`;
  });
  html += '</div>';
  document.getElementById('odev-kartlari').innerHTML = html;
}

function odevModalAc(id, baslik, aciklama, sure) {
  aktifOdevId = id;
  document.getElementById('modal-odev-baslik').textContent = baslik;
  document.getElementById('modal-odev-aciklama').textContent = aciklama;
  document.getElementById('modal-odev-sure').textContent = sure + ' dakika';
  document.getElementById('timer-display').textContent = '00:00';
  document.getElementById('timer-durum').textContent = 'Hazır';
  document.getElementById('odev-baslat-btn').classList.remove('hidden');
  document.getElementById('odev-bitir-btn').classList.add('hidden');
  document.getElementById('odev-baslat-modal').classList.remove('hidden');
}

async function odevBaslat() {
  odevBaslangic = new Date();

  // Kayıt oluştur
  await sb.from('odev_tamamlama').insert({
    odev_id: aktifOdevId,
    sporcu_id: sporcuData.id,
    baslangic_zamani: odevBaslangic.toISOString(),
    tamamlandi: false
  });

  document.getElementById('odev-baslat-btn').classList.add('hidden');
  document.getElementById('odev-bitir-btn').classList.remove('hidden');
  document.getElementById('timer-durum').textContent = 'Devam ediyor...';

  timerInterval = setInterval(() => {
    const fark = Math.floor((new Date() - odevBaslangic) / 1000);
    const dk = String(Math.floor(fark / 60)).padStart(2, '0');
    const sn = String(fark % 60).padStart(2, '0');
    document.getElementById('timer-display').textContent = dk + ':' + sn;
  }, 1000);
}

async function odevBitir() {
  clearInterval(timerInterval);
  const bitis = new Date();

  await sb.from('odev_tamamlama')
    .update({ bitis_zamani: bitis.toISOString(), tamamlandi: true })
    .eq('odev_id', aktifOdevId)
    .eq('sporcu_id', sporcuData.id)
    .eq('tamamlandi', false);

  document.getElementById('timer-durum').textContent = 'Tamamlandı!';
  setTimeout(() => {
    modalKapat('odev-baslat-modal');
    odevleriYukle(sporcuData.id);
  }, 1500);
}

// ===== SEKMELER =====
function sekmeGoster(sekme, el) {
  document.querySelectorAll('.sekme-icerik').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('sekme-' + sekme).classList.remove('hidden');
  el.classList.add('active');
}

function modalKapat(id) {
  document.getElementById(id).classList.add('hidden');
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
