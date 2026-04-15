const SUPABASE_URL = 'https://jyqogzzklpwwixhoyunf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cW9nenprbHB3d2l4aG95dW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzg3NjgsImV4cCI6MjA5MTg1NDc2OH0.dL82bDsnCIhLkxqflLzwDADsAwgwHwyTj2KawH639w0';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const NORMLAR = {
  uzun_atlama:         { ad:'Durarak Uzun Atlama',      birim:'cm',    E_1012:140,K_1012:130,E_1314:155,K_1314:143,E_1516:168,K_1516:152, dusuk_iyi:false, egz:'Box Jump, Squat Jump, Lunge Jump, Depth Jump', sik:'Haftada 3 kez · 3x8-10 tekrar' },
  saglik_topu:         { ad:'2kg Sağlık Topu Fırlatma', birim:'cm',    E_1012:350,K_1012:290,E_1314:420,K_1314:340,E_1516:490,K_1516:380, dusuk_iyi:false, egz:'Med-Ball Fırlatma, Push Press, Plyometrik Push-Up', sik:'Haftada 3 kez · 3x8 tekrar' },
  mekik_30sn:          { ad:'30 sn Mekik',              birim:'tekrar',E_1012:18, K_1012:16, E_1314:22, K_1314:19, E_1516:26, K_1516:22,  dusuk_iyi:false, egz:'Mekik, Plank, Russian Twist, Dead Bug', sik:'Haftada 3 kez · 3x20-25 tekrar' },
  sprint_30m:          { ad:'30m Sprint',               birim:'sn',    E_1012:5.4,K_1012:5.8,E_1314:5.0,K_1314:5.4,E_1516:4.7,K_1516:5.1,dusuk_iyi:true,  egz:'Uçuş Sprintleri 20-30m, Direnç Kayışı Sprint, A-B-C Skip', sik:'Haftada 3 kez · 6-10x20-30m' },
  illinois:            { ad:'Illinois Çeviklik',        birim:'sn',    E_1012:18.5,K_1012:19.5,E_1314:17.2,K_1314:18.3,E_1516:16.2,K_1516:17.5,dusuk_iyi:true, egz:'Illinois Testi, T-Drill, 505 Çeviklik, Merdiven Drill', sik:'Haftada 3 kez · 5-8x10-15sn' },
  flamingo:            { ad:'Flamingo Denge',           birim:'hata',  E_1012:6,  K_1012:8,  E_1314:4,  K_1314:6,  E_1516:3,  K_1516:5,   dusuk_iyi:true,  egz:'Flamingo Denge, BOSU Squat, Tek Ayak Gözler Kapalı', sik:'Her antrenman · 3x30-60sn' },
  otur_uzan:           { ad:'Otur-Uzan Testi',          birim:'cm',    E_1012:22, K_1012:26, E_1314:24, K_1314:28, E_1516:26, K_1516:30,  dusuk_iyi:false, egz:'Statik Esneme (PNF), Otur-Uzan, Bacak Sallamaları', sik:'Her gün · 3x30sn tutma' },
  beep_test:           { ad:'20m Mekik Koşusu',         birim:'seviye',E_1012:5.4,K_1012:4.8,E_1314:6.2,K_1314:5.6,E_1516:7.4,K_1516:6.8,dusuk_iyi:false, egz:'Tempo Koşu, Interval Koşu (1:1), Beep Testi Çalışması', sik:'Haftada 3 kez · 20-40dk %65-80' },
  cember_koordinasyon: { ad:'Çember Koordinasyon',      birim:'sn',    E_1012:12.5,K_1012:13,E_1314:11.2,K_1314:11.8,E_1516:10,K_1516:10.8,dusuk_iyi:true, egz:'Çember Atlama, Bilişsel Drill, Koordinasyon Merdiveni', sik:'Haftada 3 kez · 4-6 set' },
  cetvel_reaksiyon:    { ad:'Cetvel Reaksiyon',         birim:'cm',    E_1012:22, K_1012:24, E_1314:19, K_1314:21, E_1516:16, K_1516:18,  dusuk_iyi:true,  egz:'Cetvel Düşürme, Işık Reaksiyon, Renk Komutu Sprint', sik:'Her antrenman · 5x5 tekrar' },
  el_dinamometre:      { ad:'El Dinamometresi',         birim:'kg',    E_1012:20, K_1012:17, E_1314:28, K_1314:22, E_1516:36, K_1516:27,  dusuk_iyi:false, egz:'Hand Grip Squeezes, Wrist Curls, Dead Hang', sik:'Haftada 3 kez · 3x30sn' },
  wingate:             { ad:'Wingate 30sn',             birim:'W/kg',  E_1012:7.5,K_1012:6.8,E_1314:8.2,K_1314:7.4,E_1516:9,  K_1516:8.2,dusuk_iyi:false, egz:'Wingate Protokolü, 30m All-Out Sprint x6, Tabata Squat Jump', sik:'Haftada 2 kez · 6-10x10-30sn' },
};

let sporcuData = null;
let aktifOdevId = null;
let odevBaslangic = null;
let timerInterval = null;

// ===== BAŞLANGIÇ =====
window.onload = async function() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) { document.getElementById('giris-ekrani').innerHTML = '<div class="login-box"><p style="color:white;text-align:center;">Sporcu bulunamadı.</p></div>'; return; }
  const { data: sporcu } = await sb.from('sporcular').select('*').eq('slug', slug).single();
  if (!sporcu) { document.getElementById('giris-ekrani').innerHTML = '<div class="login-box"><p style="color:white;text-align:center;">Sporcu bulunamadı.</p></div>'; return; }
  sporcuData = sporcu;
  document.getElementById('giris-sporcu-adi').textContent = sporcu.ad_soyad;
  document.title = sporcu.ad_soyad;
  if (!sporcu.sifre) { girisGecir(); }
};

async function sporcuGiris() {
  const sifre = document.getElementById('sporcu-sifre').value;
  if (sifre === sporcuData.sifre) { girisGecir(); }
  else { document.getElementById('giris-hata').textContent = 'Şifre yanlış!'; }
}
document.getElementById('sporcu-sifre')?.addEventListener('keypress', e => { if (e.key === 'Enter') sporcuGiris(); });

async function girisGecir() {
  document.getElementById('giris-ekrani').classList.add('hidden');
  document.getElementById('sporcu-icerik').classList.remove('hidden');
  sporcuBilgileriniGoster(sporcuData);
  await motorikYukle(sporcuData);
  await psikolojiSonucYukle(sporcuData);
  await odevleriYukle(sporcuData.id);
  await psikTestDurumKontrol(sporcuData.id);
  likertleriOlustur();
}

function sporcuBilgileriniGoster(s) {
  const initials = s.ad_soyad.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('s-avatar').textContent = initials;
  document.getElementById('s-isim').textContent = s.ad_soyad;
  const yas = s.dogum_tarihi ? (new Date().getFullYear() - new Date(s.dogum_tarihi).getFullYear()) : '';
  document.getElementById('s-detay').textContent = [s.cinsiyet, yas ? yas+' yaş' : '', s.dan_kusak].filter(Boolean).join(' · ');
}

// ===== MOTORİK =====
async function motorikYukle(sporcu) {
  const { data: testler } = await sb.from('test_sonuclari').select('*').eq('sporcu_id', sporcu.id).order('test_tarihi', { ascending: true });
  if (!testler || testler.length === 0) {
    document.getElementById('motorik-bos').classList.remove('hidden');
    document.getElementById('motorik-icerik').classList.add('hidden');
    return;
  }
  const test = testler[testler.length - 1];
  const yas = sporcu.dogum_tarihi ? (new Date().getFullYear() - new Date(sporcu.dogum_tarihi).getFullYear()) : 14;
  const cins = sporcu.cinsiyet === 'Kız' ? 'K' : 'E';
  const yas_grup = yas <= 12 ? '1012' : yas <= 14 ? '1314' : '1516';
  const norm_key = `${cins}_${yas_grup}`;
  let ustun=0, normal=0, gelistir=0, zayif=0, testHTML='', zayifHTML='';

  for (const [key, n] of Object.entries(NORMLAR)) {
    const deger = parseFloat(test[key]);
    if (isNaN(deger)) continue;
    const norm = n[norm_key] || n['E_1314'];
    const oran = n.dusuk_iyi ? (norm/deger) : (deger/norm);
    let durum, badge, barClass, barWidth;
    if (oran >= 1.10) { durum='Üstün'; badge='badge-ustun'; barClass='bar-ustun'; barWidth=100; ustun++; }
    else if (oran >= 0.90) { durum='Normal'; badge='badge-normal'; barClass='bar-normal'; barWidth=75; normal++; }
    else if (oran >= 0.80) { durum='Geliştir'; badge='badge-gelistir'; barClass='bar-gelistir'; barWidth=50; gelistir++; }
    else { durum='Zayıf'; badge='badge-zayif'; barClass='bar-zayif'; barWidth=25; zayif++; }
    testHTML += `<div class="test-kart"><div class="test-kart-sol"><div class="test-kart-ad">${n.ad}</div><div class="test-kart-deger">${deger} ${n.birim} · Norm: ${norm}</div></div><div class="test-kart-bar"><div class="test-kart-bar-fill ${barClass}" style="width:${barWidth}%"></div></div><span class="badge ${badge}">${durum}</span></div>`;
    if (durum === 'Zayıf' || durum === 'Geliştir') {
      zayifHTML += `<div class="zayif-kart"><div class="zayif-kart-baslik">${n.ad} <span class="badge ${badge}" style="font-size:10px;">${durum}</span></div><div class="zayif-kart-egz">${n.egz}</div><div class="zayif-kart-siklık">${n.sik}</div></div>`;
    }
  }

  document.getElementById('ozet-kartlar').innerHTML = `
    <div class="ozet-kart"><div class="ozet-sayi sayi-yesil">${ustun}</div><div class="ozet-etiket">Üstün</div></div>
    <div class="ozet-kart"><div class="ozet-sayi sayi-sari">${normal}</div><div class="ozet-etiket">Normal</div></div>
    <div class="ozet-kart"><div class="ozet-sayi sayi-kirmizi">${zayif+gelistir}</div><div class="ozet-etiket">Geliştirilecek</div></div>`;
  document.getElementById('test-kartlari').innerHTML = `<div class="test-kartlar">${testHTML}</div>`;
  document.getElementById('zayif-alanlar').innerHTML = `<div class="zayif-liste">${zayifHTML || '<p style="color:#16a34a;font-size:13px;">Tüm alanlarda norm değerinde veya üstünde!</p>'}</div>`;

  if (testler.length > 1) motorikGrafikOlustur(testler, norm_key);
  else document.getElementById('grafik-bolum').style.display = 'none';
}

function motorikGrafikOlustur(testler, norm_key) {
  const container = document.getElementById('grafik-container');
  const testKeys = ['uzun_atlama','sprint_30m','illinois','flamingo','beep_test','cetvel_reaksiyon'];
  const renkler = ['#e63946','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2'];

  testKeys.forEach((key, idx) => {
    const n = NORMLAR[key];
    const norm = n[norm_key] || n['E_1314'];
    const degerler = testler.map(t => parseFloat(t[key])).filter(v => !isNaN(v));
    if (degerler.length < 2) return;
    const donemler = testler.filter(t => !isNaN(parseFloat(t[key]))).map(t => t.donem || t.test_tarihi?.substring(0,7) || '');
    const max = Math.max(...degerler, norm) * 1.15;
    const min = Math.min(...degerler, norm) * 0.85;
    const W = 280, H = 120, PL = 8, PR = 8, PT = 10, PB = 24;
    const iW = W - PL - PR, iH = H - PT - PB;
    const xStep = iW / (degerler.length - 1);
    const toX = i => PL + i * xStep;
    const toY = v => PT + iH - ((v - min) / (max - min)) * iH;

    let polyline = degerler.map((v,i) => `${toX(i)},${toY(v)}`).join(' ');
    let noktalar = degerler.map((v,i) => `<circle cx="${toX(i)}" cy="${toY(v)}" r="4" fill="${renkler[idx]}"/>`).join('');
    let etiketler = degerler.map((v,i) => `<text x="${toX(i)}" y="${toY(v)-7}" text-anchor="middle" font-size="9" fill="${renkler[idx]}">${v}</text>`).join('');
    let xLabels = donemler.map((d,i) => `<text x="${toX(i)}" y="${H-4}" text-anchor="middle" font-size="8" fill="#aaa">${d}</text>`).join('');
    const normY = toY(norm);

    container.innerHTML += `
      <div class="grafik-container" style="margin-bottom:10px;">
        <div class="grafik-baslik">${n.ad}</div>
        <svg class="grafik-svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">
          <line x1="${PL}" y1="${normY}" x2="${W-PR}" y2="${normY}" stroke="#ddd" stroke-width="1" stroke-dasharray="4,3"/>
          <text x="${W-PR-2}" y="${normY-3}" text-anchor="end" font-size="8" fill="#bbb">Norm: ${norm}</text>
          <polyline points="${polyline}" fill="none" stroke="${renkler[idx]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          ${noktalar}${etiketler}${xLabels}
        </svg>
      </div>`;
  });
}

// ===== PSİKOLOJİ SONUÇ =====
async function psikolojiSonucYukle(sporcu) {
  const { data: antrenorData } = await sb.from('psikoloji_antrenor').select('*').eq('sporcu_id', sporcu.id).eq('onaylandi', true).order('created_at', { ascending: false });
  const { data: sporcuData2 } = await sb.from('psikoloji_sporcu').select('*').eq('sporcu_id', sporcu.id).eq('onaylandi', true).order('created_at', { ascending: false });

  if ((!antrenorData || antrenorData.length === 0) && (!sporcuData2 || sporcuData2.length === 0)) return;

  document.getElementById('psiko-bos').classList.add('hidden');
  document.getElementById('psiko-icerik').classList.remove('hidden');

  const a = antrenorData?.[0];
  const s = sporcuData2?.[0];

  const bolumler = [
    {
      baslik: '🔵 Rekabet Kaygısı',
      alt: [
        { ad: 'Bilişsel Kaygı', key: 'bilisselKaygi', sporcu: s ? ortalama([s.bk1,s.bk2,s.bk3,s.bk4,s.bk5,s.bk6,s.bk7,s.bk8,s.bk9]) : null, antrenor: null, max:4, dusukIyi:true },
        { ad: 'Somatik Kaygı', key: 'somatikKaygi', sporcu: s ? ortalama([s.sk1,s.sk2,s.sk3,s.sk4,s.sk5,s.sk6,s.sk7,s.sk8,s.sk9]) : null, antrenor: null, max:4, dusukIyi:true },
        { ad: 'Özgüven', key: 'ozguven', sporcu: s ? ortalama([s.og1,s.og2,s.og3,s.og4,s.og5,s.og6,s.og7,s.og8,s.og9]) : null, antrenor: null, max:4, dusukIyi:false },
      ]
    },
    {
      baslik: '🟣 Motivasyon',
      alt: [
        { ad: 'Görev Yönelimi', sporcu: s ? ortalama([s.g1,s.g2,s.g3,s.g4,s.g5,s.g6,s.g7]) : null, antrenor: a ? ortalama([a.ma_g1,a.ma_g2,a.ma_g3,a.ma_g4,a.ma_g5]) : null, max:5, dusukIyi:false },
        { ad: 'Ego Yönelimi', sporcu: s ? ortalama([s.e1,s.e2,s.e3,s.e4,s.e5,s.e6]) : null, antrenor: a ? ortalama([a.ma_e1,a.ma_e2,a.ma_e3,a.ma_e4,a.ma_e5]) : null, max:5, dusukIyi:true },
      ]
    },
    {
      baslik: '🟢 Mental Dayanıklılık',
      alt: [
        { ad: 'Kontrol', sporcu: s ? ortalama([s.kon1,s.kon2,s.kon3]) : null, antrenor: a ? ortalama([a.mda_kon1,a.mda_kon2,a.mda_kon3]) : null, max:5, dusukIyi:false },
        { ad: 'Bağlılık', sporcu: s ? ortalama([s.bag1,s.bag2,s.bag3]) : null, antrenor: a ? ortalama([a.mda_bag1,a.mda_bag2,a.mda_bag3]) : null, max:5, dusukIyi:false },
        { ad: 'Meydan Okuma', sporcu: s ? ortalama([s.mey1,s.mey2,s.mey3]) : null, antrenor: a ? ortalama([a.mda_mey1,a.mda_mey2,a.mda_mey3]) : null, max:5, dusukIyi:false },
        { ad: 'Güven', sporcu: s ? ortalama([s.guv1,s.guv2,s.guv3]) : null, antrenor: a ? ortalama([a.mda_guv1,a.mda_guv2,a.mda_guv3]) : null, max:5, dusukIyi:false },
      ]
    },
    {
      baslik: '🟠 Konsantrasyon',
      alt: [
        { ad: 'Geniş-Dışsal', sporcu: s ? ortalama([s.gd1,s.gd2,s.gd3,s.gd4]) : null, antrenor: a ? ortalama([a.ka2_g1,a.ka2_g2,a.ka2_g3]) : null, max:5, dusukIyi:false },
        { ad: 'Dar-Dışsal', sporcu: s ? ortalama([s.dd1,s.dd2,s.dd3,s.dd4]) : null, antrenor: null, max:5, dusukIyi:false },
        { ad: 'Dikkat Hatası', sporcu: s ? ortalama([s.dh1,s.dh2,s.dh3,s.dh4]) : null, antrenor: a ? ortalama([a.ka2_d1,a.ka2_d2,a.ka2_d3,a.ka2_d4,a.ka2_d5]) : null, max:5, dusukIyi:true },
      ]
    }
  ];

  let html = '';
  bolumler.forEach(b => {
    html += `<div class="psiko-sonuc-kart"><div class="psiko-sonuc-baslik">${b.baslik}</div>`;
    b.alt.forEach(alt => {
      const spPuan = alt.sporcu ? alt.sporcu.toFixed(1) : '—';
      const anPuan = alt.antrenor ? alt.antrenor.toFixed(1) : '—';
      const puan = alt.sporcu || alt.antrenor || 0;
      const oran = (puan / alt.max) * 100;
      const renk = alt.dusukIyi ? (puan <= alt.max*0.5 ? '#16a34a' : puan <= alt.max*0.75 ? '#ea580c' : '#dc2626') : (puan >= alt.max*0.75 ? '#16a34a' : puan >= alt.max*0.5 ? '#ea580c' : '#dc2626');
      html += `
        <div class="psiko-alt-boyut">
          <div class="psiko-alt-boyut-ad">${alt.ad}</div>
          <div class="psiko-bar-track"><div class="psiko-bar-fill" style="width:${oran}%;background:${renk}"></div></div>
          <div class="psiko-puan" style="color:${renk}">${spPuan}</div>
        </div>`;
      if (alt.antrenor) html += `<div style="font-size:10px;color:#aaa;text-align:right;margin-bottom:4px;">Antrenör: ${anPuan}</div>`;
    });
    html += '</div>';
  });
  document.getElementById('psiko-sonuc-kartlari').innerHTML = html;

  if ((antrenorData?.length || 0) > 1 || (sporcuData2?.length || 0) > 1) psikolojiGrafikOlustur(antrenorData, sporcuData2);
  else document.getElementById('psiko-grafik-bolum').style.display = 'none';
}

function ortalama(arr) {
  const valid = arr.filter(v => v !== null && v !== undefined);
  return valid.length ? valid.reduce((a,b) => a+b, 0) / valid.length : null;
}

function psikolojiGrafikOlustur(antrenorData, sporcuData2) {
  const container = document.getElementById('psiko-grafik-container');
  const donemler = [...new Set([...(antrenorData||[]), ...(sporcuData2||[])].map(d => d.donem || d.test_tarihi?.substring(0,7) || ''))].sort();

  const veriGrup = [
    { ad: 'Görev Yönelimi', renk: '#9333ea', al: (a, s) => s ? ortalama([s.g1,s.g2,s.g3,s.g4,s.g5,s.g6,s.g7]) : null },
    { ad: 'Mental Dayanıklılık', renk: '#16a34a', al: (a, s) => s ? ortalama([s.kon1,s.kon2,s.kon3,s.bag1,s.bag2,s.bag3,s.mey1,s.mey2,s.mey3,s.guv1,s.guv2,s.guv3]) : null },
    { ad: 'Özgüven', renk: '#2563eb', al: (a, s) => s ? ortalama([s.og1,s.og2,s.og3,s.og4,s.og5,s.og6,s.og7,s.og8,s.og9]) : null },
  ];

  veriGrup.forEach(g => {
    const degerler = donemler.map(d => {
      const s = sporcuData2?.find(x => (x.donem || x.test_tarihi?.substring(0,7)) === d);
      const a = antrenorData?.find(x => (x.donem || x.test_tarihi?.substring(0,7)) === d);
      return g.al(a, s);
    }).filter(v => v !== null);
    if (degerler.length < 2) return;
    const W=280, H=100, PL=8, PR=8, PT=10, PB=20;
    const iW=W-PL-PR, iH=H-PT-PB;
    const xStep = iW/(degerler.length-1);
    const toX = i => PL+i*xStep;
    const toY = v => PT+iH-((v-1)/(5-1))*iH;
    const polyline = degerler.map((v,i) => `${toX(i)},${toY(v)}`).join(' ');
    const noktalar = degerler.map((v,i) => `<circle cx="${toX(i)}" cy="${toY(v)}" r="4" fill="${g.renk}"/><text x="${toX(i)}" y="${toY(v)-7}" text-anchor="middle" font-size="9" fill="${g.renk}">${v.toFixed(1)}</text>`).join('');
    const xLabels = donemler.map((d,i) => `<text x="${toX(i)}" y="${H-4}" text-anchor="middle" font-size="8" fill="#aaa">${d}</text>`).join('');
    container.innerHTML += `
      <div class="grafik-container" style="margin-bottom:10px;">
        <div class="grafik-baslik">${g.ad}</div>
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">
          <polyline points="${polyline}" fill="none" stroke="${g.renk}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          ${noktalar}${xLabels}
        </svg>
      </div>`;
  });
}

// ===== PSİKOLOJİ TEST DURUM =====
async function psikTestDurumKontrol(sporcuId) {
  const { data } = await sb.from('psikoloji_sporcu').select('id').eq('sporcu_id', sporcuId).order('created_at', { ascending: false }).limit(1);
  if (data && data.length > 0) {
    document.getElementById('psiko-test-tamam').classList.remove('hidden');
    document.getElementById('psiko-test-form').classList.add('hidden');
  }
}

// ===== PSİKOLOJİ TEST GÖNDER =====
function likertleriOlustur() {
  document.querySelectorAll('.likert-group').forEach(group => {
    if (group.children.length > 0) return;
    const max = parseInt(group.dataset.max) || 4;
    const start = max === 4 ? 1 : 1;
    for (let i = start; i <= max; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'likert-btn';
      btn.textContent = i;
      btn.dataset.val = i;
      btn.onclick = function() {
        group.querySelectorAll('.likert-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
      };
      group.appendChild(btn);
    }
  });
}

function likertDegerAl(field) {
  const group = document.querySelector(`#sekme-psiko-test .likert-group[data-field="${field}"]`);
  if (!group) return null;
  const sel = group.querySelector('.likert-btn.selected');
  return sel ? parseInt(sel.dataset.val) : null;
}

async function sporcuPsikolojiKaydet() {
  const fields = ['bk1','bk2','bk3','bk4','bk5','bk6','bk7','bk8','bk9',
    'sk1','sk2','sk3','sk4','sk5','sk6','sk7','sk8','sk9',
    'og1','og2','og3','og4','og5','og6','og7','og8','og9',
    'g1','g2','g3','g4','g5','g6','g7',
    'e1','e2','e3','e4','e5','e6',
    'kon1','kon2','kon3','bag1','bag2','bag3',
    'mey1','mey2','mey3','guv1','guv2','guv3',
    'gd1','gd2','gd3','gd4','dd1','dd2','dd3','dd4',
    'gi1','gi2','gi3','gi4','di1','di2','di3','di4',
    'dh1','dh2','dh3','dh4'];

  const bos = fields.filter(f => likertDegerAl(f) === null);
  if (bos.length > 10) { document.getElementById('psiko-test-mesaj').textContent = 'Lütfen daha fazla soruyu yanıtla!'; return; }

  const veri = { sporcu_id: sporcuData.id, test_tarihi: new Date().toISOString().split('T')[0], onaylandi: false };
  fields.forEach(f => { veri[f] = likertDegerAl(f); });

  const { error } = await sb.from('psikoloji_sporcu').insert(veri);
  const mesaj = document.getElementById('psiko-test-mesaj');
  if (error) { mesaj.style.color='#e63946'; mesaj.textContent = 'Hata: ' + error.message; }
  else {
    mesaj.style.color='#16a34a';
    mesaj.textContent = 'Test gönderildi! Antrenörün onaylamasını bekle.';
    document.getElementById('psiko-test-tamam').classList.remove('hidden');
    document.getElementById('psiko-test-form').classList.add('hidden');
  }
}

// ===== EV ÖDEVİ =====
async function odevleriYukle(sporcuId) {
  const { data: odevler } = await sb.from('ev_odevleri').select('*').eq('sporcu_id', sporcuId).order('tarih', { ascending: false });
  if (!odevler || odevler.length === 0) return;
  const { data: tamamlananlar } = await sb.from('odev_tamamlama').select('odev_id').eq('sporcu_id', sporcuId).eq('tamamlandi', true);
  const tamamSet = new Set((tamamlananlar||[]).map(t => t.odev_id));
  document.getElementById('odev-bos').classList.add('hidden');
  document.getElementById('odev-icerik').classList.remove('hidden');
  let html = '';
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
          <span style="font-size:12px;color:#888;">${o.tarih||''} · ${o.sure_dakika||'—'} dk</span>
          ${!tamam ? `<button class="odev-baslat-btn" onclick="odevModalAc('${o.id}','${o.baslik}','${(o.aciklama||'').replace(/'/g,"\\'")}',${o.sure_dakika||0})">Başlat</button>` : ''}
        </div>
      </div>`;
  });
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
  await sb.from('odev_tamamlama').insert({ odev_id: aktifOdevId, sporcu_id: sporcuData.id, baslangic_zamani: odevBaslangic.toISOString(), tamamlandi: false });
  document.getElementById('odev-baslat-btn').classList.add('hidden');
  document.getElementById('odev-bitir-btn').classList.remove('hidden');
  document.getElementById('timer-durum').textContent = 'Devam ediyor...';
  timerInterval = setInterval(() => {
    const fark = Math.floor((new Date() - odevBaslangic) / 1000);
    document.getElementById('timer-display').textContent = String(Math.floor(fark/60)).padStart(2,'0') + ':' + String(fark%60).padStart(2,'0');
  }, 1000);
}

async function odevBitir() {
  clearInterval(timerInterval);
  const bitis = new Date();
  await sb.from('odev_tamamlama').update({ bitis_zamani: bitis.toISOString(), tamamlandi: true }).eq('odev_id', aktifOdevId).eq('sporcu_id', sporcuData.id).eq('tamamlandi', false);
  document.getElementById('timer-durum').textContent = 'Tamamlandı!';
  setTimeout(() => { modalKapat('odev-baslat-modal'); odevleriYukle(sporcuData.id); }, 1500);
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
