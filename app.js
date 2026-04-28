// app.js — Tekhan Sporcu Sistemi

let aktifRol = 'antrenor';
let oturumKullanici = null;
let aktifSporcuId = null;
let tumSporcular = [];
let aktifAnketCevaplari = {};
let grafikInstances = {};

function oturumGuncelle(yeniAlanlar) {
  Object.assign(oturumKullanici, yeniAlanlar);
  sessionStorage.setItem('oturum', JSON.stringify({ kullanici: oturumKullanici, rol: aktifRol }));
}

// ── BAŞLANGIÇ ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const kayitli = sessionStorage.getItem('oturum');
  if (kayitli) {
    const veri = JSON.parse(kayitli);
    oturumKullanici = veri.kullanici;
    aktifRol = veri.rol;
    if (aktifRol === 'antrenor') antrenorPanelAc();
    else sporcuPanelAc();
  }
  document.getElementById('loginKullanici').addEventListener('keydown', e => { if (e.key === 'Enter') girisYap(); });
  document.getElementById('loginSifre').addEventListener('keydown', e => { if (e.key === 'Enter') girisYap(); });
});

// ── YARDIMCILAR ───────────────────────────────────────────────────────────
function ekranGoster(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('aktif'));
  document.getElementById(id).classList.add('aktif');
  window.scrollTo(0, 0);
}

function bildirimGoster(mesaj, sure = 2500) {
  const el = document.getElementById('bildirim');
  el.textContent = mesaj;
  el.style.zIndex = '99999';
  el.classList.add('goster');
  setTimeout(() => el.classList.remove('goster'), sure);
}

function modalAc(id) { document.getElementById(id).classList.add('aktif'); }
function modalKapat(id) { document.getElementById(id).classList.remove('aktif'); }

function hataGoster(elId, mesaj) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = mesaj;
  el.style.display = 'block';
}
function hataGizle(elId) {
  const el = document.getElementById(elId);
  if (el) el.style.display = 'none';
}

function yukleniyor(elId) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = '<div class="yukleniyor"><div class="spinner"></div> Yükleniyor...</div>';
}

function tarihFormatla(tarih) {
  if (!tarih) return '—';
  return new Date(tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function basTaHarfler(isim) {
  if (!isim) return '?';
  return isim.split(' ').map(k => k[0]).join('').substring(0, 2).toUpperCase();
}

function geriGit(ekranId) {
  ekranGoster(ekranId);
  if (ekranId === 'antrenorEkrani') sporcularYukle();
}

// ── GİRİŞ ─────────────────────────────────────────────────────────────────
function rolSec(rol, btn) {
  aktifRol = rol;
  document.querySelectorAll('.rol-btn').forEach(b => b.classList.remove('aktif'));
  if (btn) btn.classList.add('aktif');
  hataGizle('loginHata');
}

async function girisYap() {
  const kadi = document.getElementById('loginKullanici').value.trim();
  const sifre = document.getElementById('loginSifre').value;
  hataGizle('loginHata');
  if (!kadi || !sifre) { hataGoster('loginHata', 'Kullanıcı adı ve şifre gerekli'); return; }
  try {
    const kullanici = aktifRol === 'antrenor'
      ? await antrenorGiris(kadi, sifre)
      : await sporcuGiris(kadi, sifre);
    oturumKullanici = kullanici;
    sessionStorage.setItem('oturum', JSON.stringify({ kullanici, rol: aktifRol }));
    if (aktifRol === 'antrenor') antrenorPanelAc();
    else sporcuPanelAc();
  } catch (e) {
    hataGoster('loginHata', e.message || 'Giriş hatası');
  }
}

function cikisYap() {
  sessionStorage.removeItem('oturum');
  oturumKullanici = null;
  aktifSporcuId = null;
  document.getElementById('loginKullanici').value = '';
  document.getElementById('loginSifre').value = '';
  ekranGoster('loginEkrani');
}

// ── ANTRENÖR PANELİ ───────────────────────────────────────────────────────
function antrenorPanelAc() {
  ekranGoster('antrenorEkrani');
  document.getElementById('antrenorAdi').textContent = oturumKullanici.ad_soyad || '';
  sporcularYukle();
  yarismaTakvimiYukle('yarismaDiv', true);
  setTimeout(antrenorBeslenmeUyariYukle, 800);
}

async function sporcularYukle() {
  yukleniyor('sporcuListesiDiv');
  try {
    tumSporcular = await sporcuListesi();
    // Her sporcu için son test tarihini ekle
    await Promise.all(tumSporcular.map(async function(s) {
      try {
        var testler = await motorikTestleriGetir(s.id);
        s.son_test_tarihi = testler && testler.length > 0 ? testler[0].test_tarihi : null;
      } catch(e) { s.son_test_tarihi = null; }
    }));
    sporcuFiltrele();
  } catch (e) {
    document.getElementById('sporcuListesiDiv').innerHTML = `<div class="bos-durum"><span class="ikon">⚠️</span><p>${e.message}</p></div>`;
  }
}

function sporcuFiltrele() {
  const q = (document.getElementById('sporcuArama').value || '').toLowerCase();
  const filtreli = q ? tumSporcular.filter(s => s.ad_soyad.toLowerCase().includes(q)) : tumSporcular;
  const div = document.getElementById('sporcuListesiDiv');
  if (!filtreli || filtreli.length === 0) {
    div.innerHTML = '<div class="bos-durum"><span class="ikon">👥</span><p>Henüz sporcu yok. + butonuyla ekle.</p></div>';
    return;
  }
  div.innerHTML = filtreli.map(s => {
    const yas = yasHesapla(s.dogum_tarihi);
    return `<div class="sporcu-kart" onclick="sporcuProfilAc('${s.id}')">
      <div class="sporcu-avatar">${basTaHarfler(s.ad_soyad)}</div>
      <div class="sporcu-info">
        <div class="sporcu-isim">${s.ad_soyad}</div>
        <div class="sporcu-meta">${yas} yaş · ${s.cinsiyet || '—'}</div>
        <div style="margin-top:2px">${testHatirlaticiEkle(s, s.son_test_tarihi)}</div>
      </div>
      <div class="sporcu-ok">›</div>
    </div>`;
  }).join('');
}

function tabSec(tab, btn) {
  document.querySelectorAll('#antrenorEkrani .tab-btn').forEach(b => b.classList.remove('aktif'));
  if (btn) btn.classList.add('aktif');
  var el = document.getElementById('tab-' + tab);
  if (el) {
    var divs = document.querySelectorAll('#antrenorEkrani .icerik > div');
    divs.forEach(function(d) { d.style.display = 'none'; });
    el.style.display = 'block';
  }
  if (tab === 'linkler') quizListesiYukle();
  if (tab === 'yarisma') yarismaTakvimiYukle('yarismaDiv', true);
}

// ── TÜM TESTLER ───────────────────────────────────────────────────────────
async function testlerYukle() {
  yukleniyor('tumTestlerDiv');
  try {
    const testler = await tumMotorikTestler();
    if (!testler || testler.length === 0) {
      document.getElementById('tumTestlerDiv').innerHTML = '<div class="bos-durum"><span class="ikon">📊</span><p>Henüz test yok</p></div>';
      return;
    }
    document.getElementById('tumTestlerDiv').innerHTML = testler.map(t => {
      const s = t.sporcular || {};
      return `<div class="kart" onclick="sporcuProfilAc('${t.sporcu_id}')">
        <div class="kart-baslik">👤 ${s.ad_soyad || '?'} <span style="font-weight:400;color:var(--gray-500);font-size:12px">${tarihFormatla(t.test_tarihi)}</span></div>
        ${renderNormSatirlar(t, s)}
      </div>`;
    }).join('');
  } catch (e) {
    document.getElementById('tumTestlerDiv').innerHTML = `<p style="color:red">${e.message}</p>`;
  }
}

// ── TÜM ANKETLER ──────────────────────────────────────────────────────────
async function anketlerYukle() {
  yukleniyor('tumAnketlerDiv');
  try {
    const anketler = await tumAnketler();
    if (!anketler || anketler.length === 0) {
      document.getElementById('tumAnketlerDiv').innerHTML = '<div class="bos-durum"><span class="ikon">🧠</span><p>Henüz anket yok</p></div>';
      return;
    }
    document.getElementById('tumAnketlerDiv').innerHTML = anketler.map(a => {
      const p = psikolojiPuanlari(a);
      const s = a.sporcular || {};
      return `<div class="kart" onclick="sporcuProfilAc('${a.sporcu_id}')">
        <div class="kart-baslik">👤 ${s.ad_soyad || '?'} <span style="font-weight:400;color:var(--gray-500);font-size:12px">${tarihFormatla(a.anket_tarihi)}</span></div>
        ${renderPsikolojOzet(p)}
      </div>`;
    }).join('');
  } catch (e) {
    document.getElementById('tumAnketlerDiv').innerHTML = `<p style="color:red">${e.message}</p>`;
  }
}

// ── NORM SATIRLARI (görsel) ────────────────────────────────────────────────
function renderNormSatirlar(test, sporcu) {
  const yas = yasHesapla(sporcu.dogum_tarihi);
  const cin = sporcu.cinsiyet || 'Erkek';
  return Object.keys(TEST_ETIKETLERI).map(alan => {
    const val = test[alan];
    if (val === null || val === undefined) return '';
    const et = TEST_ETIKETLERI[alan];
    const { durum, renk, norm, oran } = testDurumu(alan, val, yas, cin);
    const barRenk = renk === 'green' ? '#057a55' : renk === 'yellow' ? '#b45309' : renk === 'orange' ? '#e65100' : '#c81e1e';
    const barYuzde = Math.min(oran || 80, 100);
    return `<div class="test-satir">
      <div class="test-ad">
        <div style="font-size:13px;font-weight:500">${et.ad}</div>
        <div class="ilerleme-kap"><div class="ilerleme-bar" style="width:${barYuzde}%;background:${barRenk}"></div></div>
        <div style="font-size:10px;color:var(--gray-500);margin-top:2px">Norm: ${norm} ${et.birim}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="test-deger">${val} <span class="test-birim">${et.birim}</span></div>
        <span class="badge badge-${renk === 'green' ? 'green' : renk === 'yellow' ? 'yellow' : renk === 'orange' ? 'orange' : 'red'}">${durum}</span>
      </div>
    </div>`;
  }).join('');
}

function renderPsikolojOzet(p) {
  if (!p) return '<p style="color:var(--gray-500);font-size:13px">Veri yok</p>';
  const items = [
    { k: 'bilisselKaygi', ad: 'Bilişsel Kaygı' },
    { k: 'ozguven', ad: 'Özgüven' },
    { k: 'gorevYon', ad: 'Görev Yon.' },
    { k: 'kontrol', ad: 'Mental Kontrol' }
  ];
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${items.map(a => {
    const val = p[a.k];
    if (!val) return '';
    const { durum, renk } = psikolojiBoyutDurumu(a.k, val);
    return `<div style="background:var(--gray-50);border-radius:8px;padding:8px 10px">
      <div style="font-size:11px;color:var(--gray-500)">${a.ad}</div>
      <div style="font-size:16px;font-weight:700">${typeof val === 'number' ? val.toFixed(1) : val}</div>
      <span class="badge badge-${renk === 'green' ? 'green' : renk === 'orange' ? 'orange' : 'red'}">${durum}</span>
    </div>`;
  }).join('')}</div>`;
}

// ── GRAFİKLER ─────────────────────────────────────────────────────────────
function grafikSporcuSecenekleriDoldur() {
  const sel = document.getElementById('grafikSporcuSec');
  sel.innerHTML = '<option value="">— Sporcu seçin —</option>';
  (tumSporcular || []).forEach(s => {
    sel.innerHTML += `<option value="${s.id}">${s.ad_soyad}</option>`;
  });
}

async function grafikYukle() {
  const id = document.getElementById('grafikSporcuSec').value;
  if (!id) { document.getElementById('grafiklerDiv').innerHTML = ''; return; }
  yukleniyor('grafiklerDiv');
  try {
    const [testler, anketler, sporcu] = await Promise.all([
      motorikTestleriGetir(id), anketleriGetir(id), sporcuGetir(id)
    ]);
    renderGrafikler(testler, anketler, sporcu);
  } catch (e) {
    document.getElementById('grafiklerDiv').innerHTML = `<p style="color:red">${e.message}</p>`;
  }
}

function renderGrafikler(testler, anketler, sporcu, hedefDiv) {
  hedefDiv = hedefDiv || 'grafiklerDiv';
  Object.values(grafikInstances).forEach(c => c.destroy());
  grafikInstances = {};

  if (!testler || testler.length === 0) {
    document.getElementById(hedefDiv).innerHTML = '<div class="bos-durum"><span class="ikon">📈</span><p>Test verisi yok</p></div>';
    return;
  }

  const sirali = [...testler].reverse();
  const etiketler = sirali.map(t => tarihFormatla(t.test_tarihi));
  const renkler = ['#1a56db','#e65100','#057a55','#7e22ce','#0891b2','#65a30d'];
  const motorikAlanlar = ['uzun_atlama_cm','sprint_30m_sn','beep_test_seviye','otur_uzan_cm','illinois_sn','el_dinamometre_kg'];

  let html = '<div class="kart"><div class="kart-baslik">📊 Motorik Gelişim Grafikleri</div>';
  motorikAlanlar.forEach(alan => { html += `<canvas id="chart_${alan}" height="160" style="margin-bottom:20px"></canvas>`; });
  html += '</div>';

  if (anketler && anketler.length > 0) {
    html += '<div class="kart"><div class="kart-baslik">🧠 Psikolojik Profil (Radar)</div><canvas id="chart_psiko" height="300"></canvas></div>';
  }
  document.getElementById(hedefDiv).innerHTML = html;

  motorikAlanlar.forEach((alan, i) => {
    const canvas = document.getElementById(`chart_${alan}`);
    if (!canvas) return;
    const yas = yasHesapla(sporcu?.dogum_tarihi);
    const cin = sporcu?.cinsiyet || 'Erkek';
    const idx = normIndeksiHesapla(yas, cin);
    const normVal = NORMLAR[alan]?.normlar[idx];
    const veri = sirali.map(t => t[alan] ?? null);
    grafikInstances[alan] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: etiketler,
        datasets: [
          { label: TEST_ETIKETLERI[alan]?.ad, data: veri, borderColor: renkler[i], backgroundColor: renkler[i]+'20', tension: 0.3, fill: true, pointRadius: 5 },
          { label: 'Norm', data: etiketler.map(() => normVal), borderColor: '#d1d5db', borderDash: [5,5], pointRadius: 0, fill: false }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: false } } }
    });
  });

  if (anketler && anketler.length > 0) {
    const p = psikolojiPuanlari(anketler[0]);
    const canvas = document.getElementById('chart_psiko');
    if (canvas && p) {
      grafikInstances['psiko'] = new Chart(canvas, {
        type: 'radar',
        data: {
          labels: ['Özgüven','Görev Yon.','Mental Kontrol','Bağlılık','Meydan Okuma','Konsantrasyon'],
          datasets: [{
            label: 'Profil',
            data: [(p.ozguven/36)*5, p.gorevYon, p.kontrol, p.baglilik, p.meydan, p.genisDissal],
            borderColor: '#1a56db', backgroundColor: 'rgba(26,86,219,0.15)', pointBackgroundColor: '#1a56db'
          }]
        },
        options: { responsive: true, scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } } }
      });
    }
  }
}


// ── BMI HESAPLAMA & WHO NORMLARI ──────────────────────────────────────────
// WHO BMI-for-age persentil sınırları (yaş: 10-16, erkek ve kız)
// [zayıf_ust(<5p), normal_ust(<85p), fazla_ust(<95p)] → üstü obez
const WHO_BMI = {
  Erkek: {
    10: [13.7, 18.9, 21.5],
    11: [14.1, 19.7, 22.5],
    12: [14.5, 20.5, 23.5],
    13: [15.0, 21.3, 24.5],
    14: [15.5, 22.0, 25.3],
    15: [16.0, 22.7, 26.0],
    16: [16.5, 23.3, 26.7]
  },
  Kiz: {
    10: [13.4, 19.0, 22.0],
    11: [13.8, 19.9, 23.1],
    12: [14.3, 20.8, 24.1],
    13: [14.8, 21.6, 25.0],
    14: [15.3, 22.3, 25.7],
    15: [15.7, 22.9, 26.3],
    16: [16.1, 23.4, 26.8]
  }
};

function hesaplaBMI(boy, kilo) {
  if (!boy || !kilo) return null;
  return Math.round((kilo / Math.pow(boy / 100, 2)) * 10) / 10;
}

function bmiKategori(bmi, yas, cinsiyet) {
  if (!bmi || !yas) return null;
  var yasKey = Math.min(Math.max(Math.round(yas), 10), 16);
  var cin = (cinsiyet === 'Kız') ? 'Kiz' : 'Erkek';
  var sinirlar = WHO_BMI[cin] && WHO_BMI[cin][yasKey];
  if (!sinirlar) return null;
  if (bmi < sinirlar[0]) return { kategori: 'Zayıf', renk: 'blue' };
  if (bmi < sinirlar[1]) return { kategori: 'Normal', renk: 'green' };
  if (bmi < sinirlar[2]) return { kategori: 'Fazla Kilolu', renk: 'orange' };
  return { kategori: 'Obez', renk: 'red' };
}

function bmiUyariMetni(kategori) {
  if (kategori === 'Fazla Kilolu') {
    return {
      metin: 'Kilonu kontrol etmek taekwondoda çok önemli. Fazla kilo taşımak hem tekme atarken seni yoruyor hem de elektronik sistemden daha az puan çıkmasına neden olabiliyor — çünkü daha fazla enerji harcayarak aynı sonucu almak zorunda kalıyorsun.',
      tavsiye: '💡 Ne yapabilirsin: Antrenmanlarına düzenli katıl, şekerli ve yağlı yiyecekleri azalt. Antrenörünle veya bir beslenme uzmanıyla konuş.'
    };
  }
  if (kategori === 'Obez') {
    return {
      metin: 'Kilonu yönetmek şu an en önemli önceliğin olmalı. Bu seviyedeki fazla kilo maçta seni çok erken yoruyor, tekme hızın ve gücün düşüyor. Rakibin aynı sıklette senden çok daha avantajlı konumda.',
      tavsiye: '💡 Ne yapabilirsin: Bir sağlık uzmanı veya diyetisyenle görüşmeni şiddetle tavsiye ederiz. Antrenörünle birlikte bir plan yapın.'
    };
  }
  return null;
}

function renderBMIKart(testler, sporcu) {
  if (!testler || testler.length === 0) return '';
  var yas = yasHesapla(sporcu.dogum_tarihi);
  var cin = sporcu.cinsiyet || 'Erkek';
  
  // BMI geçmişi — boy/kilo olan testleri filtrele
  var bmiGecmis = testler.filter(function(t) { return t.boy_cm && t.kilo_kg; });
  if (bmiGecmis.length === 0) return '';
  
  var html = '<div class="kart"><div class="kart-baslik">⚖️ Boy · Kilo · BMI Geçmişi</div>';
  
  bmiGecmis.forEach(function(t) {
    var bmi = hesaplaBMI(t.boy_cm, t.kilo_kg);
    var kat = bmiKategori(bmi, yas, cin);
    var barRenk = !kat ? '#gray' : kat.renk === 'green' ? '#057a55' : kat.renk === 'blue' ? '#1a56db' : kat.renk === 'orange' ? '#e65100' : '#c81e1e';
    var badgeClass = !kat ? '' : kat.renk === 'green' ? 'green' : kat.renk === 'blue' ? 'blue' : kat.renk === 'orange' ? 'orange' : 'red';
    var uyari = kat ? bmiUyariMetni(kat.kategori) : null;
    var bgRenk = !kat ? '#f9fafb' : kat.renk === 'green' ? '#f0fdf4' : kat.renk === 'blue' ? '#eff6ff' : kat.renk === 'orange' ? '#fff7ed' : '#fef2f2';
    
    html += '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<span style="font-size:12px;color:var(--gray-500);font-weight:600">' + tarihFormatla(t.test_tarihi) + '</span>';
    if (kat) html += '<span class="badge badge-' + badgeClass + '">' + kat.kategori + '</span>';
    html += '</div>';
    html += '<div style="display:flex;gap:16px;margin-top:6px">';
    html += '<div style="text-align:center"><div style="font-size:18px;font-weight:800;color:var(--gray-800)">' + t.boy_cm + '</div><div style="font-size:10px;color:var(--gray-500)">Boy (cm)</div></div>';
    html += '<div style="text-align:center"><div style="font-size:18px;font-weight:800;color:var(--gray-800)">' + t.kilo_kg + '</div><div style="font-size:10px;color:var(--gray-500)">Kilo (kg)</div></div>';
    html += '<div style="text-align:center"><div style="font-size:18px;font-weight:800;color:' + barRenk + '">' + (bmi || '—') + '</div><div style="font-size:10px;color:var(--gray-500)">BMI</div></div>';
    html += '</div>';
    if (uyari) {
      html += '<div style="font-size:12px;color:var(--gray-700);margin-top:8px;padding:8px 10px;background:' + bgRenk + ';border-radius:8px;line-height:1.6">';
      html += uyari.metin + '<br><br><span style="color:' + barRenk + ';font-weight:600">' + uyari.tavsiye + '</span>';
      html += '</div>';
    }
    html += '</div>';
  });
  
  html += '</div>';
  return html;
}

// ── SPORCU PROFİL (ANT. GÖRÜNÜM) ─────────────────────────────────────────
async function sporcuProfilAc(id) {
  aktifSporcuId = id;
  ekranGoster('sporcuProfilEkrani');
  yukleniyor('profilBilgilerDiv');
  yukleniyor('profilTestlerDiv');
  yukleniyor('profilPsikolojiDiv');
  yukleniyor('profilReceteDiv');
  try {
    const [sporcu, testler, anketler, antPsiko] = await Promise.all([
      sporcuGetir(id), motorikTestleriGetir(id), anketleriGetir(id), antrenorPsikolojiGetir(id)
    ]);
    document.getElementById('profilBaslik').textContent = sporcu.ad_soyad;
    window._aktifTestler = testler;
    renderProfilHeader(sporcu);
    renderProfilBilgiler(sporcu);
    renderProfilTestler(testler, sporcu);
    renderProfilPsikoloji(anketler, antPsiko);
    renderRecete(testler, anketler, sporcu);
    renderGrafikler(testler, anketler, sporcu, 'profilGrafiklerDiv');
  } catch (e) {
    bildirimGoster('Hata: ' + e.message);
  }
}

function renderProfilHeader(s) {
  const yas = yasHesapla(s.dogum_tarihi);
  document.getElementById('profilHeaderDiv').innerHTML = `
  <div class="profil-header">
    <div class="profil-avatar-buyuk">${basTaHarfler(s.ad_soyad)}</div>
    <div>
      <div class="profil-isim">${s.ad_soyad}</div>
      <div class="profil-meta">${yas} yaş · ${s.cinsiyet || '—'} · ${s.dan_kusak || '—'}</div>
    </div>
    <button style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;border-radius:8px;padding:8px 12px;color:white;font-size:13px;cursor:pointer" onclick="sporcuOkumalariniGoster('${s.id}','${s.ad_soyad}')">📖</button>
    <button style="background:rgba(255,255,255,0.2);border:none;border-radius:8px;padding:8px 12px;color:white;font-size:13px;cursor:pointer;margin-left:6px" onclick="sporcuDuzModalAc('${s.id}')">Düzenle</button>
    <button style="background:rgba(255,0,0,0.3);border:none;border-radius:8px;padding:8px 12px;color:white;font-size:13px;cursor:pointer;margin-left:6px" onclick="sporcuSilBtn('${s.id}','${s.ad_soyad}')">Sil</button>
  </div>`;
}

function renderProfilBilgiler(s) {
  const yas = yasHesapla(s.dogum_tarihi);
  const bilgiler = [
    { etiket: 'Ad Soyad', deger: s.ad_soyad },
    { etiket: 'Doğum Tarihi', deger: tarihFormatla(s.dogum_tarihi) },
    { etiket: 'Yaş', deger: yas + ' yaş' },
    { etiket: 'Cinsiyet', deger: s.cinsiyet || '—' },
    { etiket: 'Boy', deger: s.boy_cm ? s.boy_cm + ' cm' : '—' },
    { etiket: 'Kilo', deger: s.kilo_kg ? s.kilo_kg + ' kg' : '—' },
    { etiket: 'Dan / Kuşak', deger: s.dan_kusak || '—' },
    { etiket: 'Kullanıcı Adı', deger: s.kullanici_adi }
  ];
  const izinDurum = s.anket_izin;
  document.getElementById('profilBilgilerDiv').innerHTML = `
  <div class="kart">
    ${bilgiler.map(b => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-100)">
      <span style="color:var(--gray-500);font-size:13px">${b.etiket}</span>
      <span style="font-size:13px;font-weight:600">${b.deger || '—'}</span>
    </div>`).join('')}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--gray-100)">
      <div>
        <div style="font-size:13px;font-weight:600">🧠 Anket İzni</div>
        <div style="font-size:11px;color:var(--gray-500)">Sporcu psikoloji anketi doldurabilsin mi?</div>
      </div>
      <button onclick="anketIzniToggle('${s.id}', ${izinDurum})"
        style="padding:8px 16px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;background:${izinDurum ? '#def7ec' : '#fde8e8'};color:${izinDurum ? '#057a55' : '#c81e1e'}">
        ${izinDurum ? '✅ Açık' : '🔒 Kapalı'}
      </button>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">
      <div>
        <div style="font-size:13px;font-weight:600">🍽️ Beslenme Takibi</div>
        <div style="font-size:11px;color:var(--gray-500)">Sporcu beslenme ekranını görebilsin mi?</div>
      </div>
      <button onclick="beslenmeIzniToggle('${s.id}', ${s.beslenme_aktif})"
        id="beslenmeToggleBtn_${s.id}"
        style="padding:8px 16px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;background:${s.beslenme_aktif ? '#def7ec' : '#fde8e8'};color:${s.beslenme_aktif ? '#057a55' : '#c81e1e'}">
        ${s.beslenme_aktif ? '✅ Açık' : '🔒 Kapalı'}
      </button>
    </div>
  </div>`;

  // BMI kartı ekle
  var bmiVal = hesaplaBMI(s.boy_cm, s.kilo_kg);
  var bmiYas = yasHesapla(s.dogum_tarihi);
  var bmiKatObj = bmiVal ? bmiKategori(bmiVal, bmiYas, s.cinsiyet) : null;
  if (bmiVal && bmiKatObj) {
    var bmiR = bmiKatObj.renk === 'green' ? '#057a55' : bmiKatObj.renk === 'blue' ? '#1a56db' : bmiKatObj.renk === 'orange' ? '#e65100' : '#c81e1e';
    var bmiHtml = '<div class="kart" style="margin-top:8px">';
    bmiHtml += '<div class="kart-baslik">⚖️ Vücut Kitle Endeksi (BMI)</div>';
    bmiHtml += '<div style="display:flex;align-items:center;gap:16px;padding:8px 0">';
    bmiHtml += '<div style="text-align:center;min-width:60px"><div style="font-size:28px;font-weight:800;color:' + bmiR + '">' + bmiVal + '</div><div style="font-size:11px;color:var(--gray-500)">BMI</div></div>';
    bmiHtml += '<div style="flex:1"><div style="font-size:14px;font-weight:700;color:' + bmiR + '">' + bmiKatObj.kategori + '</div><div style="font-size:12px;color:var(--gray-500)">' + s.boy_cm + ' cm · ' + s.kilo_kg + ' kg</div></div>';
    bmiHtml += '</div>';
    var uyari = bmiUyariMetni(bmiKatObj.kategori);
    if (uyari) {
      var bgRenkU = bmiKatObj.renk === 'orange' ? '#fff7ed' : '#fef2f2';
      bmiHtml += '<div style="font-size:12px;color:var(--gray-700);padding:8px 10px;background:' + bgRenkU + ';border-radius:8px;line-height:1.5">' + uyari.metin + '</div>';
    }
    bmiHtml += '</div>';
    document.getElementById('profilBilgilerDiv').innerHTML += bmiHtml;
  }
}

function renderProfilTestler(testler, sporcu) {
  const div = document.getElementById('profilTestlerDiv');
  const ekleBtn = `<button class="btn btn-primary" style="margin-bottom:12px" onclick="testEkleModalAc()">+ Test Ekle</button>`;

  if (!testler || testler.length === 0) {
    div.innerHTML = `<div class="bos-durum"><span class="ikon">📊</span><p>Henüz test sonucu yok</p></div>${ekleBtn}`;
    return;
  }

  const enSon = testler[0];
  const yas = yasHesapla(sporcu.dogum_tarihi);
  const cin = sporcu.cinsiyet || 'Erkek';

  // Özet istatistikler
  const alanlar = Object.keys(TEST_ETIKETLERI);
  const sonuclar = alanlar.map(alan => testDurumu(alan, enSon[alan], yas, cin));
  const ustun  = sonuclar.filter(r => r.renk === 'green').length;
  const normal = sonuclar.filter(r => r.renk === 'yellow').length;
  const gelistir = sonuclar.filter(r => r.renk === 'orange').length;
  const zayif  = sonuclar.filter(r => r.renk === 'red').length;
  const toplam = sonuclar.filter(r => r.renk !== 'gray').length;

  let html = `${ekleBtn}
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">
    <div style="background:#def7ec;border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#057a55">${ustun}</div>
      <div style="font-size:10px;color:#057a55;font-weight:600">🟢 Üstün</div>
    </div>
    <div style="background:#fef3c7;border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#b45309">${normal}</div>
      <div style="font-size:10px;color:#b45309;font-weight:600">🟡 Normal</div>
    </div>
    <div style="background:#fff3e0;border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#e65100">${gelistir}</div>
      <div style="font-size:10px;color:#e65100;font-weight:600">🟠 Geliştir</div>
    </div>
    <div style="background:#fde8e8;border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#c81e1e">${zayif}</div>
      <div style="font-size:10px;color:#c81e1e;font-weight:600">🔴 Zayıf</div>
    </div>
  </div>

  <div class="kart">
    <div class="kart-baslik" style="display:flex;justify-content:space-between;align-items:center">
      <span>📊 Son Test — ${tarihFormatla(enSon.test_tarihi)}</span>
      <button onclick="testSilBtn('${enSon.id}')" style="background:none;border:1px solid #fca5a5;border-radius:6px;color:#c81e1e;font-size:11px;padding:2px 8px;cursor:pointer;font-weight:600">Sil</button>
    </div>
    ${alanlar.map((alan, i) => {
      const val = enSon[alan];
      if (val === null || val === undefined) return '';
      const et = TEST_ETIKETLERI[alan];
      const { durum, renk, norm, oran } = testDurumu(alan, val, yas, cin);
      const barRenk = renk === 'green' ? '#057a55' : renk === 'yellow' ? '#b45309' : renk === 'orange' ? '#e65100' : '#c81e1e';
      const barYuzde = Math.min(oran || 80, 100);
      const fark = NORMLAR[alan]?.yuksek_iyi ? (val - norm) : (norm - val);
      const farkStr = fark >= 0 ? `+${Math.abs(fark).toFixed(1)}` : `-${Math.abs(fark).toFixed(1)}`;
      const aciklama = TEST_ACIKLAMALAR[alan] ? TEST_ACIKLAMALAR[alan][renk] || '' : '';
      return `<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">
        <div class="test-satir" style="border-bottom:none;padding:0">
          <span class="test-no" style="font-size:11px;color:var(--gray-500);width:18px;flex-shrink:0">${i+1}</span>
          <div class="test-ad" style="flex:1">
            <div style="font-size:13px;font-weight:500">${et.ad}</div>
            <div class="ilerleme-kap" style="margin:3px 0">
              <div class="ilerleme-bar" style="width:${barYuzde}%;background:${barRenk}"></div>
            </div>
            <div style="font-size:10px;color:var(--gray-500)">Norm: <b>${norm}</b> ${et.birim} · Fark: <b style="color:${barRenk}">${farkStr}</b></div>
          </div>
          <div style="text-align:right;flex-shrink:0;min-width:90px">
            <div style="font-size:15px;font-weight:700">${val} <span style="font-size:10px;color:var(--gray-500)">${et.birim}</span></div>
            <span class="badge badge-${renk === 'green' ? 'green' : renk === 'yellow' ? 'yellow' : renk === 'orange' ? 'orange' : 'red'}">${durum}</span>
          </div>
        </div>
        ${aciklama ? `<div style="font-size:12px;color:var(--gray-600);margin-top:6px;padding:8px 10px;background:${renk === 'green' ? '#f0fdf4' : renk === 'yellow' ? '#fefce8' : renk === 'orange' ? '#fff7ed' : '#fef2f2'};border-radius:8px;line-height:1.5">${aciklama}</div>` : ''}
      </div>`;
    }).join('')}
    ${enSon.hrr_max ? (() => {
      const hrr60v  = enSon.hrr_60  ? Math.round((enSon.hrr_max - enSon.hrr_60)  / 10 * 100) : null;
      const hrr90v  = enSon.hrr_90  ? Math.round((enSon.hrr_max - enSon.hrr_90)  / 10 * 100) : null;
      const hrr120v = enSon.hrr_120 ? Math.round((enSon.hrr_max - enSon.hrr_120) / 10 * 100) : null;
      const hRenk = hrr60v >= 280 ? '#057a55' : hrr60v >= 180 ? '#e65100' : '#c81e1e';
      const hYorum = hrr60v >= 280 ? '✅ Hızlı toparlanma — aerobik kapasite güçlü' : hrr60v >= 180 ? '🟡 Orta toparlanma' : '🔴 Yavaş toparlanma — aerobik kapasite geliştirilebilir';
      return `<div style="margin-top:8px;padding:10px;background:var(--gray-50);border-radius:8px">
        <div style="font-size:12px;font-weight:700;color:var(--gray-600);margin-bottom:6px">❤️ Kalp Atış Toparlanması</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:12px">HRmax: <b>${enSon.hrr_max} bpm</b></span>
          ${hrr60v  ? `<span style="font-size:12px">HRR₆₀: <b style="color:${hRenk}">${hrr60v}%</b></span>`  : ''}
          ${hrr90v  ? `<span style="font-size:12px">HRR₉₀: <b style="color:${hRenk}">${hrr90v}%</b></span>`  : ''}
          ${hrr120v ? `<span style="font-size:12px">HRR₁₂₀: <b style="color:${hRenk}">${hrr120v}%</b></span>` : ''}
        </div>
        <div style="font-size:11px;color:${hRenk};font-weight:600">${hYorum}</div>
      </div>`;
    })() : ''}
    ${enSon.notlar ? `<div style="margin-top:10px;padding:8px;background:var(--gray-50);border-radius:8px;font-size:12px;color:var(--gray-500)">📝 ${enSon.notlar}</div>` : ''}
  </div>`;

  if (testler.length > 1) {
    html += '<div class="kart"><div class="kart-baslik">📋 Test Geçmişi</div>';
    testler.slice(1).forEach(function(t) {
      const ustunlar = alanlar.filter(k => { const r = testDurumu(k, t[k], yas, cin); return r.renk === 'green'; });
      const zayiflar = alanlar.filter(k => { const r = testDurumu(k, t[k], yas, cin); return r.renk === 'red'; });
      html += '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
      html += '<span style="font-size:12px;font-weight:700;color:var(--gray-500)">' + tarihFormatla(t.test_tarihi) + '</span>';
      html += '<button onclick="testSilBtn(&quot;' + t.id + '&quot;)" style="background:none;border:1px solid #fca5a5;border-radius:6px;color:#c81e1e;font-size:11px;padding:2px 8px;cursor:pointer">Sil</button>';
      html += '</div>';
      if (ustunlar.length > 0) {
        html += '<div style="margin-bottom:4px"><span style="font-size:11px;color:#057a55;font-weight:600">🟢 Üstün: </span>';
        html += '<span style="font-size:12px;color:var(--gray-700)">' + ustunlar.map(k => TEST_ETIKETLERI[k].ad).join(', ') + '</span></div>';
      }
      if (zayiflar.length > 0) {
        html += '<div><span style="font-size:11px;color:#c81e1e;font-weight:600">🔴 Zayıf: </span>';
        html += '<span style="font-size:12px;color:var(--gray-700)">' + zayiflar.map(k => TEST_ETIKETLERI[k].ad).join(', ') + '</span></div>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  div.innerHTML = html;
}

function renderProfilPsikoloji(anketler, antPsiko) {
  const div = document.getElementById('profilPsikolojiDiv');
  const ekleBtn = '<button class="btn btn-primary" style="margin-bottom:12px" onclick="antrenorGozlemFormuAc()">+ Gözlem Formu Doldur</button>';

  // Liste görünümü için yardımcı
  function psikoListeSatir(ad, val, durum, renk, max, ters, key, antrenorMod) {
    if (!val) return '';
    const barRenk = renk === 'green' ? '#057a55' : renk === 'orange' ? '#e65100' : '#c81e1e';
    const bgRenk = renk === 'green' ? '#f0fdf4' : renk === 'orange' ? '#fff7ed' : '#fef2f2';
    const yuzde = ters ? Math.max(0, Math.min(100, (1 - val/max)*100)) : Math.min(100, (val/max)*100);
    const aciklamaObj = key && !antrenorMod && typeof PSIKO_ACIKLAMALAR !== 'undefined' && PSIKO_ACIKLAMALAR[key] ? PSIKO_ACIKLAMALAR[key][renk]
      : key && antrenorMod && typeof ANTRENOR_PSIKO_ACIKLAMALAR !== 'undefined' && ANTRENOR_PSIKO_ACIKLAMALAR[key] ? ANTRENOR_PSIKO_ACIKLAMALAR[key][renk]
      : null;
    const aciklamaHTML = aciklamaObj ?
      '<div style="font-size:12px;color:var(--gray-700);margin-top:6px;padding:8px 10px;background:' + bgRenk + ';border-radius:8px;line-height:1.6">' +
        aciklamaObj.metin +
        '<br><br><span style="color:' + barRenk + ';font-weight:600">' + aciklamaObj.tavsiye + '</span>' +
      '</div>' : '';
    return '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">' +
      '<div class="test-satir" style="border-bottom:none;padding:0">' +
        '<div style="flex:1">' +
          '<div style="font-size:13px;font-weight:500">' + ad + '</div>' +
          '<div class="ilerleme-kap" style="margin:3px 0"><div class="ilerleme-bar" style="width:' + yuzde + '%;background:' + barRenk + '"></div></div>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;min-width:90px">' +
          '<div style="font-size:15px;font-weight:700">' + (val.toFixed ? val.toFixed(1) : val) + '</div>' +
          '<span class="badge badge-' + (renk === 'green' ? 'green' : renk === 'orange' ? 'orange' : 'red') + '">' + durum + '</span>' +
        '</div>' +
      '</div>' +
      aciklamaHTML +
    '</div>';
  }

  let html = ekleBtn;

  // SPORCU ANKETİ
  if (anketler && anketler.length > 0) {
    const p = psikolojiPuanlari(anketler[0]);
    const boyutlar = [
      { k: 'bilisselKaygi', ad: '😰 Bilişsel Kaygı', max: 36, ters: true },
      { k: 'somatikKaygi',  ad: '💓 Somatik Kaygı',  max: 36, ters: true },
      { k: 'ozguven',       ad: '💪 Özgüven',         max: 36, ters: false },
      { k: 'gorevYon',      ad: '🎯 Görev Yönelimi',  max: 5,  ters: false },
      { k: 'egoYon',        ad: '🏆 Ego Yönelimi',    max: 5,  ters: true },
      { k: 'kontrol',       ad: '🧘 Mental Kontrol',  max: 5,  ters: false },
      { k: 'baglilik',      ad: '🔗 Bağlılık',        max: 5,  ters: false },
      { k: 'meydan',        ad: '⚡ Meydan Okuma',    max: 5,  ters: false },
      { k: 'guven',         ad: '🛡 Güven',           max: 5,  ters: false },
      { k: 'genisDissal',   ad: '👁 Geniş Dikkat',    max: 5,  ters: false },
      { k: 'darDissal',     ad: '🎯 Dar Dikkat',      max: 5,  ters: false },
      { k: 'dikkatHatasi',  ad: '⚠️ Dikkat Hatası',  max: 5,  ters: true }
    ];
    // key = psikoloji boyutu adı (PSIKO_ACIKLAMALAR için)
    html += '<div class="kart"><div class="kart-baslik">👤 Sporcu Öz-Bildirimi — ' + tarihFormatla(anketler[0].anket_tarihi) + '</div>';
    boyutlar.forEach(function(b) {
      const val = p[b.k];
      if (!val) return;
      const { durum, renk } = psikolojiBoyutDurumu(b.k, val);
      html += psikoListeSatir(b.ad, val, durum, renk, b.max, b.ters, b.k);
    });
    html += '</div>';
    if (anketler.length > 1) {
      html += '<div class="kart"><div class="kart-baslik">📋 Sporcu Anket Geçmişi</div>';
      anketler.slice(1).forEach(function(a) {
        html += '<div class="gecmis-item">';
        html += '<span class="gecmis-tarih">' + tarihFormatla(a.anket_tarihi) + '</span>';
        html += '<span class="gecmis-icerik">Anket dolduruldu</span>';
        html += '<button onclick="anketSilBtn(&quot;' + a.id + '&quot;)" style="background:none;border:1px solid #fca5a5;border-radius:6px;color:#c81e1e;font-size:11px;padding:2px 8px;cursor:pointer;margin-left:auto">Sil</button>';
        html += '</div>';
      });
      html += '</div>';
    }
  } else {
    html += '<div class="kart"><div class="kart-baslik">👤 Sporcu Öz-Bildirimi</div><div class="bos-durum" style="padding:20px 0"><span class="ikon" style="font-size:32px">📋</span><p>Sporcu henüz anket doldurmamış</p></div></div>';
  }

  // ANTRENÖR GÖZLEM FORMU SONUÇLARI
  if (antPsiko && antPsiko.length > 0) {
    const g = antPsiko[0];
    const ag = antrenorPsikolojiPuanlari(g);
    const gozlemBoyutlar = [
      { k: 'kaygiGozlem',  acikKey: 'kaygiGozlem',  ad: '😰 Kaygı Gözlemi',      ters: true,  max: 4 },
      { k: 'gorevYonAnt',  acikKey: 'gorevYonAnt',  ad: '🎯 Görev Yönelimi',      ters: false, max: 5 },
      { k: 'egoYonAnt',    acikKey: 'egoYonAnt',    ad: '🏆 Ego Yönelimi',         ters: true,  max: 5 },
      { k: 'kontrolAnt',   acikKey: 'kontrolAnt',   ad: '🧘 Mental Kontrol',       ters: false, max: 5 },
      { k: 'baglilikAnt',  acikKey: 'baglilikAnt',  ad: '🔗 Bağlılık',             ters: false, max: 5 },
      { k: 'meyдanAnt',    acikKey: 'meyдanAnt',    ad: '⚡ Meydan Okuma',         ters: false, max: 5 },
      { k: 'guvenAnt',     acikKey: 'guvenAnt',     ad: '🛡 Güven',                ters: false, max: 5 },
      { k: 'dikkatAnt',    acikKey: 'dikkatAnt',    ad: '👁 Güçlü Dikkat',         ters: false, max: 5 },
      { k: 'dikkatBozAnt', acikKey: 'dikkatBozAnt', ad: '⚠️ Dikkat Bozukluğu',   ters: true,  max: 5 }
    ];
    html += '<div class="kart"><div class="kart-baslik">🏆 Antrenör Gözlemi — ' + tarihFormatla(g.gozlem_tarihi) + '</div>';
    gozlemBoyutlar.forEach(function(b) {
      const val = ag[b.k];
      if (!val) return;
      const iyi = b.ters ? val <= (b.max * 0.4) : val >= (b.max * 0.7);
      const orta = b.ters ? val <= (b.max * 0.6) : val >= (b.max * 0.5);
      const renk = iyi ? 'green' : orta ? 'orange' : 'red';
      const durum = iyi ? '✅ İyi' : orta ? '⚠️ Orta' : '🔴 Gelişim';
      html += psikoListeSatir(b.ad, val, durum, renk, b.max, b.ters, b.acikKey, true);
    });
    if (g.antrenor_notu) html += '<div style="margin-top:10px;padding:8px;background:var(--gray-50);border-radius:8px;font-size:12px;color:var(--gray-700)">📝 ' + g.antrenor_notu + '</div>';
    html += '</div>';
    if (antPsiko.length > 1) {
      html += '<div class="kart"><div class="kart-baslik">📋 Antrenör Gözlem Geçmişi</div>';
      antPsiko.slice(1).forEach(function(g2) {
        html += '<div class="gecmis-item">';
        html += '<span class="gecmis-tarih">' + tarihFormatla(g2.gozlem_tarihi) + '</span>';
        html += '<span class="gecmis-icerik">Gözlem formu dolduruldu</span>';
        html += '<button onclick="antrenorAnketSilBtn(&quot;' + g2.id + '&quot;)" style="background:none;border:1px solid #fca5a5;border-radius:6px;color:#c81e1e;font-size:11px;padding:2px 8px;cursor:pointer;margin-left:auto">Sil</button>';
        html += '</div>';
      });
      html += '</div>';
    }
  } else {
    html += '<div class="kart"><div class="kart-baslik">🏆 Antrenör Gözlemi</div><div class="bos-durum" style="padding:20px 0"><span class="ikon" style="font-size:32px">👀</span><p>Henüz gözlem formu doldurulmamış</p></div></div>';
  }

  div.innerHTML = html;
}

// ── ANTRENÖR GÖZLEM FORMU ─────────────────────────────────────────────────
function antrenorGozlemFormuAc() {
  if (!aktifSporcuId) return;
  const modal = document.getElementById('gozlemModal');
  if (!modal) { antrenorGozlemModalOlustur(); return; }
  document.getElementById('gozlemSporcuId').value = aktifSporcuId;
  document.getElementById('gozlemTarih').value = new Date().toISOString().split('T')[0];
  hataGizle('gozlemHata');
  // Tüm butonları sıfırla
  document.querySelectorAll('#gozlemModal .gozlem-btn').forEach(b => b.classList.remove('secili'));
  document.getElementById('gozlemNot').value = '';
  modalAc('gozlemModal');
}

function antrenorGozlemModalOlustur() {
  // Kaygı soruları 0-4, diğerleri 1-5
  const bolumler = [
    { baslik: '🔵 Kaygı — Bilişsel Belirtiler', renk: '#1a56db', scale: [0,1,2,3,4], labels: ['Gözlemlemedim','Hiç','Hafif','Belirgin','Çok Belirgin'], sorular: [
      { k: 'kb1', metin: 'Yarış öncesi aşırı soru soruyor, onay arıyor.' },
      { k: 'kb2', metin: 'Dikkatini toplamakta güçlük çekiyor, dağınık görünüyor.' },
      { k: 'kb3', metin: 'Olumsuz konuşmalar yapıyor ("Kazanamam" vb.).' },
      { k: 'kb4', metin: 'Hata yaptığında uzun süre toparlanamıyor.' },
      { k: 'kb5', metin: 'Rakip/hakem hakkında aşırı endişeli konuşuyor.' }
    ]},
    { baslik: '🔵 Kaygı — Somatik Belirtiler', renk: '#1a56db', scale: [0,1,2,3,4], labels: ['Gözlemlemedim','Hiç','Hafif','Belirgin','Çok Belirgin'], sorular: [
      { k: 'ks1', metin: 'Isınmada kaslar aşırı gergin görünüyor.' },
      { k: 'ks2', metin: 'Solunum hızlanmış veya düzensiz.' },
      { k: 'ks3', metin: 'Ellerde titreme, yüzde solukluk/kızarıklık.' },
      { k: 'ks4', metin: 'Sık tuvalete gidiyor veya mide bulantısı.' },
      { k: 'ks5', metin: 'Hareketler koordinasyonunu kaybetmiş, sertleşmiş.' }
    ]},
    { baslik: '🔵 Kaygı — Davranış Belirtileri', renk: '#1a56db', scale: [0,1,2,3,4], labels: ['Gözlemlemedim','Hiç','Hafif','Belirgin','Çok Belirgin'], sorular: [
      { k: 'kd1', metin: 'Antrenörden veya takımdan uzaklaşıyor.' },
      { k: 'kd2', metin: 'Aşırı konuşkan veya tam tersine sessiz/donuk.' },
      { k: 'kd3', metin: 'Hazırlık rutinini aksatıyor veya değiştiriyor.' },
      { k: 'kd4', metin: 'Yarıştan kaçma davranışı gösteriyor.' },
      { k: 'kd5', metin: 'Teknik uyarılara normalden farklı tepki veriyor.' }
    ]},
    { baslik: '🟣 Motivasyon — Görev Yönelimi', renk: '#7e22ce', scale: [1,2,3,4,5], labels: ['Hiçbir Zaman','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
      { k: 'mg1', metin: 'Antrenman içeriğini merak ederek sorar.' },
      { k: 'mg2', metin: 'Hata yapınca tekrar dener, pes etmez.' },
      { k: 'mg3', metin: 'Kendi performansından memnuniyet duyar.' },
      { k: 'mg4', metin: 'Zorlu egzersizlerde çaba gösterir.' },
      { k: 'mg5', metin: 'Gelişimini takip eder, geçmişiyle karşılaştırır.' }
    ]},
    { baslik: '🟣 Motivasyon — Ego Yönelimi', renk: '#7e22ce', scale: [1,2,3,4,5], labels: ['Hiçbir Zaman','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
      { k: 'me1', metin: 'Yalnızca kazandığında motive görünür.' },
      { k: 'me2', metin: 'Sürekli başkalarıyla kıyaslar.' },
      { k: 'me3', metin: 'Başarısızlıkta bahane üretir veya bırakmak ister.' },
      { k: 'me4', metin: 'Zor egzersizlerden kaçar.' },
      { k: 'me5', metin: 'Kaybedince sinirlenme, suçlama, ağlama tepkileri.' }
    ]},
    { baslik: '🟢 Mental Dayanıklılık — Kontrol', renk: '#057a55', scale: [1,2,3,4,5], labels: ['Hiçbir Zaman','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
      { k: 'mk1', metin: 'Duygusal tepkileri uygun şekilde yönetiyor.' },
      { k: 'mk2', metin: 'Ortam değişince paniğe kapılmadan uyum sağlıyor.' },
      { k: 'mk3', metin: 'Stresli durumda sakin ve odaklı kalabiliyor.' }
    ]},
    { baslik: '🟢 Mental Dayanıklılık — Bağlılık & Meydan Okuma', renk: '#057a55', scale: [1,2,3,4,5], labels: ['Hiçbir Zaman','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
      { k: 'mb1', metin: 'Zor antrenmanlarda çabadan vazgeçmiyor.' },
      { k: 'mb2', metin: 'Uzun vadeli hedeflere bağlılığını koruyor.' },
      { k: 'mb3', metin: 'Olumsuz koşullarda kararlılığını sürdürüyor.' },
      { k: 'mm1', metin: 'Yeni ve zor egzersizleri istekle deniyor.' },
      { k: 'mm2', metin: 'Yarışma baskısını fırsat olarak değerlendiriyor.' },
      { k: 'mm3', metin: 'Başarısızlıktan sonra hızlı toparlanıyor.' }
    ]},
    { baslik: '🟢 Mental Dayanıklılık — Güven', renk: '#057a55', scale: [1,2,3,4,5], labels: ['Hiçbir Zaman','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
      { k: 'mgu1', metin: 'Baskı altında özgüveni korunuyor.' },
      { k: 'mgu2', metin: 'Kendi teknik kararlarına güvenebiliyor.' },
      { k: 'mgu3', metin: 'Zor anlarda kendi kapasitesine inancını yitirmiyor.' }
    ]},
    { baslik: '🟠 Konsantrasyon — Güçlü Dikkat', renk: '#e65100', scale: [1,2,3,4,5], labels: ['Hiçbir Zaman','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
      { k: 'kg1', metin: 'Açıklamaları ilk seferinde anlıyor ve uygulayabiliyor.' },
      { k: 'kg2', metin: 'Çoklu uyarıcıyı eş zamanlı takip edebiliyor.' },
      { k: 'kg3', metin: 'Uzun seansların sonunda bile odak kaybı yaşamıyor.' },
      { k: 'kg4', metin: 'Hata sonrası hızlıca toparlanarak odaklı kalıyor.' },
      { k: 'kg5', metin: 'Rakibin stratejisini ve vücut dilini okuyabiliyor.' }
    ]},
    { baslik: '🟠 Konsantrasyon — Dikkat Bozukluğu', renk: '#e65100', scale: [1,2,3,4,5], labels: ['Hiçbir Zaman','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
      { k: 'kboz1', metin: 'Uzun açıklamalarda dikkati dağılıyor.' },
      { k: 'kboz2', metin: 'Seyirci/gürültü dikkatini kolayca bozuyor.' },
      { k: 'kboz3', metin: 'Hata sonrası aynı hatayı tekrarlıyor.' },
      { k: 'kboz4', metin: 'Yorgunlukta teknik hatalar belirgin artıyor.' },
      { k: 'kboz5', metin: 'Kritik anlarda odak kaybı gözlemleniyor.' }
    ]}
  ];

  let formHtml = `
  <div id="gozlemModal" class="modal-overlay">
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-baslik">👁 Antrenör Psikoloji Gözlem Formu</div>
      <input type="hidden" id="gozlemSporcuId">
      <div class="form-grup">
        <label class="form-etiket">Gözlem Tarihi *</label>
        <input type="date" id="gozlemTarih" class="form-input">
      </div>`;

  bolumler.forEach(bolum => {
    formHtml += `
    <div class="anket-alan" style="margin-bottom:10px">
      <div class="anket-alan-baslik" onclick="anketBolumToggle(this)" style="border-left:4px solid ${bolum.renk}">
        <span style="flex:1">${bolum.baslik}</span><span>▼</span>
      </div>
      <div class="anket-alan-icerik">
        ${bolum.sorular.map(soru => `
        <div class="soru" id="gsoru_${soru.k}">
          <div class="soru-metin">${soru.metin}</div>
          <div class="likert-secenekler">
            ${bolum.scale.map((n, i) => `<button type="button" class="likert-btn gozlem-btn" data-key="${soru.k}" data-val="${n}" onclick="gozlemSec(this)" title="${bolum.labels[i].replace('\n',' ')}">${n}</button>`).join('')}
          </div>
          <div class="likert-etiketler">
            <span>${bolum.labels[0].replace('\n',' ')}</span>
            <span>${bolum.labels[bolum.labels.length-1].replace('\n',' ')}</span>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  });

  formHtml += `
      <div class="form-grup" style="margin-top:12px">
        <label class="form-etiket">Genel Gözlem Notu</label>
        <textarea id="gozlemNot" class="form-input" rows="3" placeholder="Gözlemlerinizi yazın..."></textarea>
      </div>
      <div id="gozlemHata" class="hata-mesaji"></div>
      <button class="btn btn-primary" onclick="gozlemKaydet()">Kaydet</button>
      <button class="btn btn-outline" style="margin-top:8px" onclick="modalKapat('gozlemModal')">İptal</button>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', formHtml);
  document.getElementById('gozlemSporcuId').value = aktifSporcuId;
  document.getElementById('gozlemTarih').value = new Date().toISOString().split('T')[0];
  modalAc('gozlemModal');
}

let gozlemCevaplari = {};

function gozlemSec(btn) {
  const key = btn.dataset.key;
  const val = parseInt(btn.dataset.val);
  gozlemCevaplari[key] = val;
  const soru = document.getElementById(`gsoru_${key}`);
  if (soru) soru.querySelectorAll('.gozlem-btn').forEach(b => b.classList.toggle('secili', parseInt(b.dataset.val) === val));
}

async function gozlemKaydet() {
  const sporcuId = document.getElementById('gozlemSporcuId').value;
  const tarih = document.getElementById('gozlemTarih').value;
  if (!tarih) { hataGoster('gozlemHata', 'Tarih gerekli'); return; }

  const veri = {
    sporcu_id: sporcuId,
    gozlem_tarihi: tarih,
    yaklasan_yaris: null,
    antrenor_notu: document.getElementById('gozlemNot').value.trim() || null,
    ...gozlemCevaplari
  };

  try {
    await antrenorPsikolojiEkle(veri);
    gozlemCevaplari = {};
    modalKapat('gozlemModal');
    bildirimGoster('✅ Gözlem formu kaydedildi');
    sporcuProfilAc(sporcuId);
  } catch (e) {
    hataGoster('gozlemHata', e.message || 'Kayıt hatası');
  }
}

function renderRecete(testler, anketler, sporcu) {
  const yas = yasHesapla(sporcu?.dogum_tarihi);
  const cin = sporcu?.cinsiyet || 'Erkek';
  let html = '';

  if (testler && testler.length > 0) {
    const test = testler[0];
    const zayiflar = Object.keys(TEST_ETIKETLERI).filter(alan => {
      const { renk } = testDurumu(alan, test[alan], yas, cin);
      return renk === 'red' || renk === 'orange';
    });
    if (zayiflar.length > 0) {
      html += '<div class="kart"><div class="kart-baslik">💊 Motorik Antrenman Reçetesi</div>';
      zayiflar.forEach(function(alan) {
        const { durum } = testDurumu(alan, test[alan], yas, cin);
        const ozellikAd = MOTORIK_OZELLIK[alan] || TEST_ETIKETLERI[alan].ad;
        const badgeRenk = durum.includes('🔴') ? 'red' : 'orange';
        const receteMetni = motorikReceteGetir(alan);
        html += '<div style="padding:12px 0;border-bottom:1px solid var(--gray-100)">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
        html += '<span style="font-size:13px;font-weight:700">' + ozellikAd + '</span>';
        html += '<span class="badge badge-' + badgeRenk + '">' + durum + '</span>';
        html += '</div>';
        const receteDiv = document.createElement('div');
        receteDiv.style.cssText = 'font-size:12px;color:var(--gray-600);line-height:1.9;background:var(--gray-50);padding:10px;border-radius:8px';
        receteDiv.innerHTML = receteMetni;
        html += receteDiv.outerHTML;
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div class="kart"><div class="kart-baslik">💊 Motorik Reçete</div><div style="color:#057a55;padding:12px 0">✅ Tüm testler norm düzeyinde veya üzerinde! Böyle devam!</div></div>';
    }
  }

  if (anketler && anketler.length > 0) {
    const p = psikolojiPuanlari(anketler[0]);
    const gelisimler = Object.keys(p || {}).filter(k => {
      const { renk } = psikolojiBoyutDurumu(k, p[k]);
      return renk === 'red' || renk === 'orange';
    });
    if (gelisimler.length > 0) {
      html += '<div class="kart"><div class="kart-baslik">🧠 Psikolojik Reçete</div>';
      gelisimler.forEach(function(k) {
        const { durum } = psikolojiBoyutDurumu(k, p[k]);
        const badgeRenk = durum.includes('🔴') ? 'red' : 'orange';
        const receteMetni = psikolojiReceteGetir(k);
        html += '<div style="padding:12px 0;border-bottom:1px solid var(--gray-100)">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
        html += '<span style="font-size:13px;font-weight:600">' + psikolojiAlanAdi(k) + '</span>';
        html += '<span class="badge badge-' + badgeRenk + '">' + durum + '</span>';
        html += '</div>';
        const receteDiv = document.createElement('div');
        receteDiv.style.cssText = 'font-size:12px;color:var(--gray-600);line-height:1.9;background:var(--gray-50);padding:10px;border-radius:8px';
        receteDiv.innerHTML = receteMetni;
        html += receteDiv.outerHTML;
        html += '</div>';
      });
      html += '</div>';
    }
  }

  // SAHA PERFORMANS SKORLARI
  if (anketler && anketler.length > 0) {
    var sp = psikolojiPuanlari(anketler[0]);
    var skorlar = sahaPerfSkorlari(sp);
    if (skorlar) {
      html += '<div class="kart"><div class="kart-baslik">🧠 Saha Performans Profili</div>';
      Object.keys(SAHA_PERF_ANTRENOR).forEach(function(key) {
        var tanim = SAHA_PERF_ANTRENOR[key];
        var skor = skorlar[key];
        if (skor === undefined) return;
        var renk = sahaSkorRenk(skor, tanim.ters);
        var aciklama = tanim[renk];
        var barRenk = renk === 'green' ? '#057a55' : renk === 'orange' ? '#e65100' : '#c81e1e';
        var bgRenk = renk === 'green' ? '#f0fdf4' : renk === 'orange' ? '#fff7ed' : '#fef2f2';
        var gosterSkor = tanim.ters ? (100 - skor) : skor;
        html += '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
        html += '<span style="font-size:13px;font-weight:600">' + tanim.baslik + '</span>';
        html += '<span style="font-size:13px;font-weight:800;color:' + barRenk + '">' + gosterSkor + '</span>';
        html += '</div>';
        html += '<div class="ilerleme-kap" style="margin-bottom:8px"><div class="ilerleme-bar" style="width:' + gosterSkor + '%;background:' + barRenk + '"></div></div>';
        html += '<div style="font-size:12px;color:var(--gray-700);padding:8px 10px;background:' + bgRenk + ';border-radius:8px;line-height:1.6">';
        html += aciklama.metin + '<br><br><span style="color:' + barRenk + ';font-weight:600">' + aciklama.tavsiye + '</span>';
        html += '</div></div>';
      });
      html += '</div>';
    }
  }

  if (!html) html = '<div class="bos-durum"><span class="ikon">💊</span><p>Reçete için test ve anket verileri gerekli</p></div>';
  document.getElementById('profilReceteDiv').innerHTML = html;

}

const MOTORIK_OZELLIK = {
  uzun_atlama_cm:      '💥 Patlayıcı Güç',
  saglik_topu_cm:      '💥 Patlayıcı Güç (Üst Vücut)',
  mekik_tekrar:        '💪 Karın & Gövde Gücü',
  sprint_30m_sn:       '⚡ Hız',
  illinois_sn:         '🔄 Çeviklik',
  flamingo_hata:       '🧘 Denge',
  otur_uzan_cm:        '🤸 Esneklik',
  beep_test_seviye:    '🫀 Aerobik Kapasite',
  cetvel_reaksiyon_cm: '⚡ Reaksiyon & Dikkat',
  dolyo_chagi_tekrar:  '🦵 Tekme Hızı',
  fskt_tekrar:         '🔁 Anaerobik Dayanıklılık',
  fskt_kdi:            '📉 Kondisyon Sürekliliği',
  dck60_tekrar:        '🔋 Uzun Süreli Güç',
  sinav_tekrar:        '💪 Üst Vücut Dayanıklılığı'
};

function motorikReceteGetir(alan) {
  const r = {

    uzun_atlama_cm: `
      <b>💥 Patlayıcı Güç</b><br>
      <b>🏋️ Antrenman döneminde:</b> Her gün yapabilirsin — malzeme gerekmez.<br>
      • Squat Jump: Çök, iki ayakla yukarı fırlat, yumuşak in. 3 set × 10 tekrar.<br>
      • Lunge Jump: Bir adım öne çök, zıpla ve ayak değiştir. 3 set × 8 tekrar.<br>
      • Tek ayak hop: Sağ ayakla 5 hop → sol ayakla 5 hop. 3 set.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Ağır çalışma yapma. Sadece hafif 2 set squat jump, vücudu hazır tut.<br><br>
      <b>⚡ Maçtan hemen önce:</b> 5-6 squat jump yeterli — kasları uyandırır, yorgunluk vermez.`,

    saglik_topu_cm: `
      <b>💥 Patlayıcı Güç (Üst Vücut)</b><br>
      <b>🏋️ Antrenman döneminde:</b> Malzeme gerekmez, duvara karşı da yapılabilir.<br>
      • Patlayıcı şınav: İnerken yavaş, kalkarken iki el yerden kalksın. 3 set × 8 tekrar.<br>
      • Duvara itme: Duvara 50cm mesafede dur, öne düş, iki elle dur, geri it. 3 set × 10.<br>
      • Yumruk kombinasyonu hızlı: 10sn boyunca mümkün olan en hızlı yumruk. 5 set.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Hafif germe ve hafif patlayıcı çalışma.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Kolları çevir, omuz açma hareketi yap.`,

    mekik_tekrar: `
      <b>💪 Karın & Gövde Gücü</b><br>
      <b>🏋️ Antrenman döneminde:</b> Hiç malzeme gerekmez, yerde yapılır.<br>
      • Mekik: Dizler bükük, eller ensede. 3 set × 20 tekrar.<br>
      • Plank: Dirsek üzerinde düz dur. 3 set × 30 saniye. Her hafta 5sn artır.<br>
      • Bacak indirme: Sırt üstü yat, bacakları dik tut, yavaşça indir, yere değdirme. 3 set × 10.<br>
      • Yan plank: Her iki taraf 20sn. 3 set.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Sadece plank yap — 2 set × 30sn.<br><br>
      <b>⚡ Maçtan hemen önce:</b> 10 mekik yeterli — gövdeyi aktive eder.`,

    sprint_30m_sn: `
      <b>⚡ Hız</b><br>
      <b>🏋️ Antrenman döneminde:</b> Açık alan yeterli — park, bahçe, koridor.<br>
      • 20-30 adım sprint: Tam hızla koş, yürüyerek geri dön. 6-8 tekrar. Tam dinlenme şart.<br>
      • Duvardan sprint başlangıcı: Duvara ellerini koy, 45 derece eğil, sinyal gelince patla.<br>
      • Merdiven koşusu: Eğer merdiven varsa iki basamak atlayarak çık. 5 set.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Sadece 3-4 kısa sprint, vücudu uyan dursun.<br><br>
      <b>⚡ Maçtan hemen önce:</b> 2-3 kısa hızlı adım yeterli.`,

    illinois_sn: `
      <b>🔄 Çeviklik</b><br>
      <b>🏋️ Antrenman döneminde:</b> Yer işaretleri veya ayakkabılarla yapılır.<br>
      • Yön değiştirme koşusu: 5 adım sağa sprint, dur, 5 adım sola sprint. 8 set.<br>
      • Salınım adımı: Savunma pozisyonunda sağa-sola hızlı kayma. 30sn × 5 set.<br>
      • Geri koşu + dönüş: 5 adım geri koş, dönerek öne sprint. 8 tekrar.<br>
      • TKD adımı: Rakip yaklaşırken geri çekil, fırsat çıkınca öne patla. 10 tekrar.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Hafif yön değiştirme, sadece ısınma amaçlı.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Savunma adımlarıyla ısın, ritim bul.`,

    flamingo_hata: `
      <b>🧘 Denge</b><br>
      <b>🏋️ Antrenman döneminde:</b> Her yerde yapılabilir, hiç malzeme gerekmez.<br>
      • Tek ayak duruş: 30sn sağ, 30sn sol. Gözler açık → sonra kapalı. 3 set.<br>
      • Tek ayak squat: Bir ayak üzerinde yavaşça çök. 3 set × 8 tekrar.<br>
      • Tekme pozisyonunda tut: Dolyo chagi pozisyonunu 5sn tut, indir. 10 tekrar her ayak.<br>
      • Yastık/katlanmış battaniye üzerinde tek ayak duruş: 20sn × 3 set.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Denge çalışması her gün yapılabilir, yormuyor.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Tek ayak üzerinde 10sn dur — odaklanma ve denge için.`,

    otur_uzan_cm: `
      <b>🤸 Esneklik</b><br>
      <b>🏋️ Antrenman döneminde:</b> Sadece antrenman SONRASI — asla soğuk kasla yapma.<br>
      • Hamstring germe: Otur, bacaklar düz, öne uzan. 30sn tut. 3 tekrar.<br>
      • Kelebek: Ayak tabanlarını birleştir, dizleri yere doğru bastır. 30sn. 3 tekrar.<br>
      • İç uyluk: Ayakları yana aç, yavaşça yere yaklaş. 30sn tut.<br>
      • Ayakta hamstring: Ayağı sandalyeye koy, öne eğil. 30sn her bacak.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Hafif dinamik germe — bacak sallama, diz çekme.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Statik germe YAPMA — kas gevşer, patlayıcılık düşer. Sadece dinamik hareketler.`,

    beep_test_seviye: `
      <b>🫀 Aerobik Kapasite (Nefes Dayanıklılığı)</b><br>
      <b>🏋️ Antrenman döneminde:</b> Açık alan veya uzun koridor yeterli.<br>
      • Tempo koşusu: Nefes alıp verebileceğin hızda 15-20 dk koş. Haftada 2-3 kez.<br>
      • Merdiven koşusu: Çık-in, dur, 1dk dinlen. 5-8 set. Merdiven yoksa yerinde yüksek diz koşusu.<br>
      • 3 raunt simülasyonu: 2dk boyunca tekme-savunma karışımı sürekli hareket, 1dk dinlen. 3 raund.<br>
      • Burpee: 10 tekrar → 30sn dinlen. 5 set. Nefes dayanıklılığını hızlı geliştirir.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Ağır koşu yapma. 10dk hafif tempolu yürüyüş-koşu yeterli.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Derin ve ritmik nefes al. Vücudunu ısıt ama yorma.`,

    cetvel_reaksiyon_cm: `
      <b>⚡ Reaksiyon & Dikkat</b><br>
      <b>🏋️ Antrenman döneminde:</b> Arkadaşınla veya aynaya karşı yapılabilir.<br>
      • El tepki drilli: Arkadaşın elini kaldırınca sen hemen tekme at veya hareket et. 10 tekrar.<br>
      • Ayna drilli: Karşındaki kişinin hareketini 0.5sn gecikmeli taklit et. 1dk × 5 set.<br>
      • Bekleyip patla: Gözlerini kapat, ses duyunca hemen harekete geç. 10 tekrar.<br>
      • Top yakala: Arkadaşın aniden bir şey fırlatsın, sen yakala. Basit ama çok etkili.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Reaksiyon drilleri yapılabilir — yormuyor, odak artırıyor.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Gözlerini kapat 10sn, aç. Odaklan. Rakibinin ilk hareketine dikkat et.`,

    dolyo_chagi_tekrar: `
      <b>🦵 Tekme Hızı</b><br>
      <b>🏋️ Antrenman döneminde:</b> Kese veya ped yoksa havaya da yapılabilir.<br>
      • 10sn hızlı tekme: Mümkün olan en hızlı dolyo chagi, 10sn. 30sn dinlen. 8 set.<br>
      • Yavaş-hızlı-yavaş: 5 yavaş tekme → 5 çok hızlı → 5 yavaş. Kas kontrolü öğretir.<br>
      • Tek ayak güçlendirme: Tekme atılan ayakla tek ayak hop 3×10. Destek bacağı güçlendirir.<br>
      • Bant çalışması (bant varsa): Ayak bileğine lastik bant takıp tekme at. 3 set × 15.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Hafif teknik çalışma, hız odaklı değil.<br><br>
      <b>⚡ Maçtan hemen önce:</b> 10 hızlı tekme her ayakla — kasları uyandırır.`,

    fskt_tekrar: `
      <b>🔁 Anaerobik Dayanıklılık (Tekme Kondisyonu)</b><br>
      <b>🏋️ Antrenman döneminde:</b> Kese veya havaya yapılabilir.<br>
      • FSKT tekrar: 10sn hızlı tekme → 10sn dinlen. Bunu 5 tur yap. Haftada 2x.<br>
      • Tabata tekme: 20sn hızlı → 10sn dinlen × 8 set. Çok etkili ama zor.<br>
      • 30sn sürekli tekme: Dur madan 30sn at, 30sn dinlen. 5 set.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Ağır kondisyon çalışması yapma. Sadece 2 set FSKT.<br><br>
      <b>⚡ Maçtan hemen önce:</b> 5sn hızlı tekme × 3 set — kasları aktive et, yorma.`,

    fskt_kdi: `
      <b>📉 Kondisyon Sürekliliği (Turlar Arası Düşüş)</b><br>
      <b>🏋️ Antrenman döneminde:</b> Aerobik taban olmadan bu düzelmez — önce nefes kapasitesi.<br>
      • Tempo koşusu: Nefes alıp verebileceğin tempoda 15-20dk. Haftada 3x. Bu en önemli adım.<br>
      • Interval tekme: 10sn hızlı → 10sn dinlen × 10 set. Her hafta 1 set ekle.<br>
      • Maç simülasyonu: 2dk sürekli hareket → 1dk dinlen × 3. Gerçek maç koşullarını taklit et.<br>
      • Burpee + tekme: 5 burpee → 10sn hızlı tekme. 5 set. Yorgunluk altında tekme pratiği.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Ağır çalışma yapma. Bacaklar dinç olsun.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Derin nefes al. Son raundda da güçlü olduğunu kafanda canlandır.`,

    dck60_tekrar: `
      <b>🔋 Uzun Süreli Güç (60sn Dayanıklılık)</b><br>
      <b>🏋️ Antrenman döneminde:</b> Hem aerobik hem anaerobik çalışma gerekir.<br>
      • 60sn kesintisiz tekme: Dur madan 60sn at. Sayı önemli değil, durmamak önemli. 3 set.<br>
      • Merdiven + tekme: Çık-in, hemen 10 tekme at. 5 set.<br>
      • Yerinde yüksek diz: 20sn → 10sn hızlı tekme → 20sn yüksek diz. 5 set.<br>
      • Tempo koşusu: Haftada 2-3x 15-20dk. Aerobik taban olmadan 60sn güçlü kalınmaz.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Sadece 2 set 30sn tekme — bacakları uyandır.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Son dakikada da güçlü olduğunu düşün. Rakibin yorulur, sen devam et.`,

    sinav_tekrar: `
      <b>💪 Üst Vücut Dayanıklılığı</b><br>
      <b>🏋️ Antrenman döneminde:</b> Hiç malzeme gerekmez.<br>
      • Şınav: Göğüs yere değsin, dirsekler tam açılsın. 3 set × maks tekrar. Her hafta 2 tekrar ekle.<br>
      • Diz şınavı: Şınav zorsa önce dizden başla. Aynı teknik, daha kolay.<br>
      • Plank şınav: Plank pozisyonundan şınav pozisyonuna geç. 3 set × 10.<br>
      • Yavaş şınav: 3sn in, 3sn çık. Güç gelişimi için çok etkili. 3 set × 8.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Üst vücut çalışması yapma — kollar dinlensin.<br><br>
      <b>⚡ Maçtan hemen önce:</b> 10 şınav yeterli — omuzları ve kolları ısıtır.`
  };
  return r[alan] || 'Antrenörünle birlikte çalış.';
}

function psikolojiAlanAdi(k) {
  const a = { bilisselKaygi:'Bilişsel Kaygı', somatikKaygi:'Somatik Kaygı', ozguven:'Özgüven', gorevYon:'Görev Yönelimi', egoYon:'Ego Yönelimi', kontrol:'Mental Kontrol', baglilik:'Bağlılık', meydan:'Meydan Okuma', guven:'Güven', genisDissal:'Geniş Dikkat', darDissal:'Dar Dikkat', dikkatHatasi:'Dikkat Hatası' };
  return a[k] || k;
}

function psikolojiReceteGetir(k) {
  const r = {
    bilisselKaygi: `
      <b>🏋️ Antrenman döneminde:</b> Her antrenman sonrası kafanda o gün iyi yaptığın 1 şeyi düşün ve aklında tut. Olumsuz bir düşünce gelince içinden "dur" de ve o iyi anı hatırla.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> "Ya kaybedersem" diye düşünmeye başlarsan hemen dur. Yerine şunu sor: "Maçta ne yapmak istiyorum?" Sonucu değil, yapacağını düşün.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Soyunma odasında 3 kez yavaşça nefes al. Sadece ilk hamleyi düşün — sadece ilkini. Geri kalanı gelir.`,

    somatikKaygi: `
      <b>🏋️ Antrenman döneminde:</b> Her gece yatmadan önce: 4 saniye nefes al, 4 saniye tut, 4 saniye ver. Bunu 5 kez tekrarla. Zamanla vücudun bunu tanımaya başlar.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Vücudun gerginleşmeye başlarsa ellerin, omuzların, çeneni sıkıştır — sonra bırak. Bu gerginliği atmana yardımcı olur.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Isınırken kasıtlı olarak yavaş ve derin nefes al. Vücuduna "hazırım, sakinim" sinyali veriyorsun.`,

    ozguven: `
      <b>🏋️ Antrenman döneminde:</b> Her hafta antrenmanında iyi yaptığın 3 şeyi yaz. Küçük de olsa. Bu liste büyüdükçe kendine güvenin de büyüyecek.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> O listeyi oku. "Bunları yapabiliyorum" de. Rakibini değil, kendi güçlü yönlerini düşün.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Sahaya çıkmadan önce içinden "bunu antrenmanımda yaptım, burada da yaparım" de. Bir kez, yüksek sesle değil — ama net olarak.`,

    egoYon: `
      <b>🏋️ Antrenman döneminde:</b> Maç sonuçlarına değil, o maçta ne kadar iyi oynadığına odaklan. Kaybetsen bile "bugün şunu iyi yaptım" diyebiliyorsan doğru yoldasın.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Rakibini değil, kendini düşün. "Geçen müsabakamdan bu sefer ne farklı yapacağım?" sorusunu sor.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Rakibinin kim olduğunu aklından çıkar. Sahada sadece sen ve taekwondo var.`,

    kontrol: `
      <b>🏋️ Antrenman döneminde:</b> Antrenman sırasında bir hata yapınca ne hissediyorsun? Fark etmeye başla. Sonra hemen bir nefes al ve devam et. Bu alışkanlık olana kadar tekrarla.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Aklına kötü senaryolar gelirse hepsini bir kenara bırak ve şunu sor: "Şu an yapabileceğim en iyi şey ne?" O soruya odaklan.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Sayı yersen veya hata yaparsan hemen bir derin nefes al — sadece bir. Sonra "oldu, bitti, devam" de ve bir sonraki hamleye bak.`,

    baglilik: `
      <b>🏋️ Antrenman döneminde:</b> Her antrenman öncesi kendine küçük bir hedef koy. "Bugün dolyo chagiyi 2 daha hızlı atacağım" gibi. Bitirince kendinle gurur duy.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> "Neden taekwondo yapıyorum?" diye sor. Cevabın neyse, onu hatırla. O his seni maçta ayakta tutar.<br><br>
      <b>⚡ Maçtan hemen önce:</b> "Buraya kadar geldim çünkü çalıştım" de. Bu maç da o çalışmanın bir parçası.`,

    meydan: `
      <b>🏋️ Antrenman döneminde:</b> Zor bir egzersiz veya güçlü bir rakip gördüğünde "bu beni geliştirecek" de. Her hafta antrenman sonrası "bugün ne öğrendim?" diye sor kendine.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Güçlü bir rakiple karşılaşacaksan "bu benim için iyi bir sınav" diye düşün. Kaybetmek öğrenmek demek — kazanmak da.<br><br>
      <b>⚡ Maçtan hemen önce:</b> "Bu maçtan ne öğreneceğim?" diye sor. Skoru değil, deneyimi düşün.`,

    guven: `
      <b>🏋️ Antrenman döneminde:</b> Hata yaptığında "berbat biriyim" değil "bir daha dene" de. Bu çok basit görünür ama içindeki sesin tonu zamanla değişir.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Geçmişte çok zor bir antrenmandan ya da maçtan çıktın ve atlattın. Onu hatırla. "Onu atlattım, bunu da atlarım" de.<br><br>
      <b>⚡ Maçtan hemen önce:</b> "Hazırım" de. Mükemmel olmak zorunda değilsin — hazır olman yeterli.`,

    genisDissal: `
      <b>🏋️ Antrenman döneminde:</b> Sparring'de sadece rakibine değil, tüm sahaya bak. Hakemin nerede olduğunu, rakibinin hangi ayağına bastığını fark etmeye çalış.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Rakibinin videosunu izlerken sadece tekniklerine değil, vücut diline de bak. Yorulunca ne yapıyor, güçlü tarafı hangi yön?<br><br>
      <b>⚡ Maçtan hemen önce:</b> Sahaya çıkınca bir an dur ve tüm alanı gözlerinle tara. "Ben buradayım, her şeyi görüyorum" hissini ver kendine.`,

    darDissal: `
      <b>🏋️ Antrenman döneminde:</b> Her tekme atmadan önce bir an dur ve hedefe bak. Sadece hedefe. Bu küçük duraklama odaklanma alışkanlığı yaratır.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Zihninde maçı canlandır. Rakibin geliyor, sen ne yapıyorsun? Bu hayali prova seni hazırlar.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Rakibinin gözlerine bak ve "şu an buradayım" de içinden. Geçmiş maç yok, sonraki raunt yok — sadece şu an.`,

    dikkatHatasi: `
      <b>🏋️ Antrenman döneminde:</b> Hata yaptıktan sonra ne kadar süre o hatayı düşündüğünü fark etmeye başla. Fark etmek ilk adım. Sonra "oldu, geçti" de ve devam et.<br><br>
      <b>📅 Müsabakaya 2-3 gün kala:</b> Geçmiş maçlardaki hatalar aklına gelirse onları bir kağıda yaz ve "bunlar öğrendiğim şeyler" de. Kağıdı kapat.<br><br>
      <b>⚡ Maçtan hemen önce:</b> Sayı yersen veya hata yaparsan hemen 1 nefes al ve bir "kelime" söyle içinden — "devam", "güçlü", ne olursa. Bu kelime seni o andan koparır ve ileriye bakmana yardımcı olur.`
  };
  return r[k] || 'Antrenörünle birlikte çalış.';
}

function profilTabSec(tab, btn) {
  document.querySelectorAll('#sporcuProfilEkrani .tab-btn').forEach(b => b.classList.remove('aktif'));
  if (btn) btn.classList.add('aktif');
  ['bilgiler','testler','psikoloji','recete','grafikler'].forEach(t => {
    document.getElementById(`ptab-${t}`).style.display = t === tab ? 'block' : 'none';
  });
}

// ── SPORCU EKLE / DÜZENLE ─────────────────────────────────────────────────
function sporcuEklePanelAc() {
  document.getElementById('sporcuModalBaslik').textContent = 'Sporcu Ekle';
  document.getElementById('sporcuDuzId').value = '';
  ['sAd','sKullaniciAdi','sSifre','sDogum','sBoy','sKilo','sDan'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sc = document.getElementById('sCinsiyet');
  if (sc) sc.value = '';
  hataGizle('sporcuModalHata');
  modalAc('sporcuModal');
}

async function sporcuDuzModalAc(id) {
  const sporcu = await sporcuGetir(id);
  if (!sporcu) return;
  document.getElementById('sporcuModalBaslik').textContent = 'Sporcu Düzenle';
  document.getElementById('sporcuDuzId').value = id;
  document.getElementById('sAd').value = sporcu.ad_soyad || '';
  document.getElementById('sKullaniciAdi').value = sporcu.kullanici_adi || '';
  document.getElementById('sSifre').value = sporcu.sifre_hash || '';
  document.getElementById('sDogum').value = sporcu.dogum_tarihi || '';
  document.getElementById('sCinsiyet').value = sporcu.cinsiyet || '';
  document.getElementById('sBoy').value = sporcu.boy_cm || '';
  document.getElementById('sKilo').value = sporcu.kilo_kg || '';
  document.getElementById('sDan').value = sporcu.dan_kusak || '';
  hataGizle('sporcuModalHata');
  modalAc('sporcuModal');
}

async function sporcuKaydet() {
  const id = document.getElementById('sporcuDuzId').value;
  const veri = {
    ad_soyad: document.getElementById('sAd').value.trim(),
    kullanici_adi: document.getElementById('sKullaniciAdi').value.trim(),
    sifre_hash: document.getElementById('sSifre').value.trim(),
    dogum_tarihi: document.getElementById('sDogum').value || null,
    cinsiyet: document.getElementById('sCinsiyet').value || null,
    boy_cm: parseFloat(document.getElementById('sBoy').value) || null,
    kilo_kg: parseFloat(document.getElementById('sKilo').value) || null,
    dan_kusak: document.getElementById('sDan').value.trim() || null,
  };
  if (!veri.ad_soyad)      { hataGoster('sporcuModalHata', 'Ad soyad gerekli'); return; }
  if (!veri.kullanici_adi) { hataGoster('sporcuModalHata', 'Kullanıcı adı gerekli'); return; }
  if (!veri.sifre_hash)    { hataGoster('sporcuModalHata', 'Şifre gerekli'); return; }
  try {
    if (id) await sporcuGuncelle(id, veri);
    else    await sporcuEkle(veri);
    modalKapat('sporcuModal');
    bildirimGoster(id ? '✅ Sporcu güncellendi' : '✅ Sporcu eklendi');
    sporcularYukle();
    if (id && aktifSporcuId === id) sporcuProfilAc(id);
  } catch (e) {
    hataGoster('sporcuModalHata', e.message || 'Kayıt hatası');
  }
}

// ── TEST EKLE ─────────────────────────────────────────────────────────────
function testEkleModalAc() {
  if (!aktifSporcuId) { bildirimGoster('Önce bir sporcu seçin'); return; }
  document.getElementById('testSporcuId').value = aktifSporcuId;
  document.getElementById('tTarih').value = new Date().toISOString().split('T')[0];
  ['t_uzun_atlama','t_saglik_topu','t_mekik','t_sprint','t_illinois',
   't_flamingo','t_otur_uzan','t_beep','t_cetvel','t_dolyo',
   't_fskt_1','t_fskt_2','t_fskt_3','t_fskt_4','t_fskt_5','t_dck60','t_sinav','t_notlar']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  hataGizle('testModalHata');
  modalAc('testModal');
}

function hrrOnizle() {
  var hrrMax = parseInt(document.getElementById('t_hrr_max')?.value) || 0;
  var hr60   = parseInt(document.getElementById('t_hrr_60')?.value)  || 0;
  var hr90   = parseInt(document.getElementById('t_hrr_90')?.value)  || 0;
  var hr120  = parseInt(document.getElementById('t_hrr_120')?.value) || 0;
  var div = document.getElementById('hrrOnizleDiv');
  if (!div) return;
  if (!hrrMax) { div.textContent = 'HRmax ve HR değerlerini gir'; return; }
  var satirlar = [];
  if (hr60)  satirlar.push('HRR₆₀: <b>' + Math.round((hrrMax - hr60) / 10 * 100) + '%</b>');
  if (hr90)  satirlar.push('HRR₉₀: <b>' + Math.round((hrrMax - hr90) / 10 * 100) + '%</b>');
  if (hr120) satirlar.push('HRR₁₂₀: <b>' + Math.round((hrrMax - hr120) / 10 * 100) + '%</b>');
  if (satirlar.length === 0) { div.textContent = 'HR değerlerini gir'; return; }
  // Toparlanma değerlendirmesi
  var hrr60val = hr60 ? Math.round((hrrMax - hr60) / 10 * 100) : 0;
  var yorum = hrr60val >= 280 ? '✅ Hızlı toparlanma' : hrr60val >= 180 ? '🟡 Orta toparlanma' : hrr60val > 0 ? '🔴 Yavaş toparlanma' : '';
  div.innerHTML = satirlar.join(' · ') + (yorum ? '<br><span style="font-size:11px">' + yorum + '</span>' : '');
}

function fsktOnizle() {
  var turlar = [1,2,3,4,5].map(function(i) {
    return parseInt(document.getElementById('t_fskt_' + i).value) || 0;
  });
  var dolu = turlar.filter(function(v) { return v > 0; });
  var div = document.getElementById('fsktOnizleDiv');
  if (!div) return;
  if (dolu.length < 5) {
    div.textContent = dolu.length + '/5 tur girildi';
    div.style.color = 'var(--gray-500)';
    return;
  }
  var enIyi = Math.max.apply(null, turlar);
  var toplam = turlar.reduce(function(a,b) { return a+b; }, 0);
  var kdi = Math.round((1 - toplam / (enIyi * 5)) * 100 * 10) / 10;
  div.innerHTML = 'En iyi: <b>' + enIyi + '</b> tekrar · KDI: <b style="color:' + (kdi <= 20 ? '#057a55' : '#c81e1e') + '">' + kdi + '%</b>';
}

function hesaplaFSKT() {
  var turlar = [1,2,3,4,5].map(function(i) {
    return parseInt(document.getElementById('t_fskt_' + i).value) || 0;
  }).filter(function(v) { return v > 0; });
  if (turlar.length === 0) return { fskt_tekrar: null, fskt_kdi: null };
  var enIyi = Math.max.apply(null, turlar);
  var toplam = turlar.reduce(function(a,b) { return a+b; }, 0);
  var kdi = turlar.length === 5 ? Math.round((1 - toplam / (enIyi * 5)) * 100 * 10) / 10 : null;
  return { fskt_tekrar: enIyi, fskt_kdi: kdi };
}

async function testKaydet() {
  const sporcuId = document.getElementById('testSporcuId').value;
  if (!sporcuId) { hataGoster('testModalHata', 'Sporcu seçilmedi'); return; }
  const tarih = document.getElementById('tTarih').value;
  if (!tarih) { hataGoster('testModalHata', 'Test tarihi gerekli'); return; }

  const veri = {
    sporcu_id: sporcuId,
    test_tarihi: tarih,
    uzun_atlama_cm:      parseFloat(document.getElementById('t_uzun_atlama').value) || null,
    saglik_topu_cm:      parseFloat(document.getElementById('t_saglik_topu').value) || null,
    mekik_tekrar:        parseInt(document.getElementById('t_mekik').value)          || null,
    sprint_30m_sn:       parseFloat(document.getElementById('t_sprint').value)       || null,
    illinois_sn:         parseFloat(document.getElementById('t_illinois').value)     || null,
    flamingo_hata:       parseInt(document.getElementById('t_flamingo').value)        || null,
    otur_uzan_cm:        parseFloat(document.getElementById('t_otur_uzan').value)    || null,
    beep_test_seviye:    parseFloat(document.getElementById('t_beep').value)         || null,
    cetvel_reaksiyon_cm: parseFloat(document.getElementById('t_cetvel').value)       || null,
    dolyo_chagi_tekrar:  parseInt(document.getElementById('t_dolyo').value)           || null,
    dck60_tekrar:        parseInt(document.getElementById('t_dck60').value)           || null,
    sinav_tekrar:        parseInt(document.getElementById('t_sinav').value)           || null,
    ...hesaplaFSKT(),
    notlar: document.getElementById('t_notlar').value.trim() || null,
    // HRR hesabı
    hrr_max: parseInt(document.getElementById('t_hrr_max')?.value) || null,
    hrr_60: parseInt(document.getElementById('t_hrr_60')?.value) || null,
    hrr_90: parseInt(document.getElementById('t_hrr_90')?.value) || null,
    hrr_120: parseInt(document.getElementById('t_hrr_120')?.value) || null
  };

  try {
    await motorikTestEkle(veri);
    modalKapat('testModal');
    bildirimGoster('✅ Test sonuçları kaydedildi');
    sporcuProfilAc(sporcuId);
  } catch (e) {
    hataGoster('testModalHata', e.message || 'Kayıt hatası');
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  SPORCU EKRANI
// ══════════════════════════════════════════════════════════════════════════
async function sporcuPanelAc() {
  ekranGoster('sporcuEkrani');
  const s = oturumKullanici;
  document.getElementById('sporcuKullaniciAdi').textContent = s.ad_soyad || 'Profilim';
  document.getElementById('sporcuKusak').textContent = s.dan_kusak || '';
  renderSporcuProfil(s);
  sporcuTestleriniYukle();
}

function renderSporcuProfil(s) {
  const yas = yasHesapla(s.dogum_tarihi);
  const bmi = hesaplaBMI(s.boy_cm, s.kilo_kg);
  const bmiKat = bmi ? bmiKategori(bmi, yas, s.cinsiyet) : null;
  const bmiRenk = !bmiKat ? '#6b7280' : bmiKat.renk === 'green' ? '#057a55' : bmiKat.renk === 'blue' ? '#1a56db' : bmiKat.renk === 'orange' ? '#e65100' : '#c81e1e';
  const bmiUyari = bmiKat ? bmiUyariMetni(bmiKat.kategori) : null;
  const bmiBg = !bmiKat ? '#f9fafb' : bmiKat.renk === 'green' ? '#f0fdf4' : bmiKat.renk === 'blue' ? '#eff6ff' : bmiKat.renk === 'orange' ? '#fff7ed' : '#fef2f2';

  let html = `
  <div class="profil-header" style="margin:-16px -16px 16px">
    <div class="profil-avatar-buyuk">${basTaHarfler(s.ad_soyad)}</div>
    <div>
      <div class="profil-isim">${s.ad_soyad}</div>
      <div class="profil-meta">${yas} yaş · ${s.cinsiyet || '—'}</div>

    </div>
  </div>
  <div class="istat-grid">
    <div class="istat-kart"><div class="istat-sayi">${yas}</div><div class="istat-etiket">Yaş</div></div>
    <div class="istat-kart"><div class="istat-sayi">${s.boy_cm || '—'}</div><div class="istat-etiket">Boy (cm)</div></div>
    <div class="istat-kart"><div class="istat-sayi">${s.kilo_kg || '—'}</div><div class="istat-etiket">Kilo (kg)</div></div>
    <div class="istat-kart"><div class="istat-sayi" style="color:${bmiRenk}">${bmi || '—'}</div><div class="istat-etiket">BMI</div></div>
  </div>`;

  // BMI uyarı metni
  if (bmiUyari) {
    html += `<div style="font-size:12px;color:var(--gray-700);margin-top:8px;padding:10px;background:${bmiBg};border-radius:10px;line-height:1.6">
      <b style="color:${bmiRenk}">${bmiKat.kategori}</b><br>${bmiUyari.metin}<br><br>
      <span style="color:${bmiRenk};font-weight:600">${bmiUyari.tavsiye}</span>
    </div>`;
  }

  // Profil güncelleme formu
  html += `<div class="kart" style="margin-top:12px">
    <div class="kart-baslik">✏️ Bilgilerimi Güncelle</div>
    <div class="form-row">
      <div class="form-grup">
        <label class="form-etiket">Boy (cm)</label>
        <input type="number" id="spBoy" class="form-input" value="${s.boy_cm || ''}" placeholder="160" step="0.1">
      </div>
      <div class="form-grup">
        <label class="form-etiket">Kilo (kg)</label>
        <input type="number" id="spKilo" class="form-input" value="${s.kilo_kg || ''}" placeholder="55" step="0.1">
      </div>
    </div>
    <div class="form-grup">
      <label class="form-etiket">Doğum Tarihi</label>
      <input type="date" id="spDogum" class="form-input" value="${s.dogum_tarihi || ''}">
    </div>
    <div class="form-grup">
      <label class="form-etiket">Hedef Kilo (kg)</label>
      <input type="number" id="spHedefKilo" class="form-input" value="${s.hedef_kilo || ''}" placeholder="Hedef yok ise boş bırak" step="0.1">
    </div>
    <button class="btn btn-primary" style="margin-top:4px;width:100%" onclick="sporcuBoyKiloGuncelle()">Kaydet</button>
  </div>`;

  document.getElementById('sporcuProfilDiv').innerHTML = html;
}

async function sporcuBoyKiloGuncelle() {
  var boy = parseFloat(document.getElementById('spBoy')?.value) || null;
  var kilo = parseFloat(document.getElementById('spKilo')?.value) || null;
  var dogum = document.getElementById('spDogum')?.value || null;
  var hedefKiloRaw = document.getElementById('spHedefKilo')?.value;
  var hedefKilo = hedefKiloRaw === '' ? null : (parseFloat(hedefKiloRaw) || null);
  var hedefKiloGirildi = hedefKiloRaw !== undefined && hedefKiloRaw !== null;
  var guncelleme = {};
  if (boy) guncelleme.boy_cm = boy;
  if (kilo) guncelleme.kilo_kg = kilo;
  if (dogum) guncelleme.dogum_tarihi = dogum;
  if (hedefKiloGirildi) guncelleme.hedef_kilo = hedefKilo;
  if (!Object.keys(guncelleme).length) { bildirimGoster('En az bir alan doldur'); return; }
  try {
    await sporcuGuncelle(oturumKullanici.id, guncelleme);
    oturumGuncelle(guncelleme);
    bildirimGoster('✅ Bilgilerin güncellendi');
    renderSporcuProfil(oturumKullanici);
  } catch(e) {
    bildirimGoster('Hata: ' + e.message);
  }
}

async function sporcuTestleriniYukle() {
  try {
    const testler = await motorikTestleriGetir(oturumKullanici.id);
    renderSporcuTestler(testler, oturumKullanici);
  } catch (e) {
    document.getElementById('sporcuTestlerDiv').innerHTML = `<p style="color:red">${e.message}</p>`;
  }
}

function renderSporcuTestler(testler, sporcu) {
  if (!testler || testler.length === 0) {
    document.getElementById('sporcuTestlerDiv').innerHTML = '<div class="bos-durum"><span class="ikon">📊</span><p>Henüz test sonucunuz yok. Antrenörünüz ekleyecek.</p></div>';
    return;
  }
  const enSon = testler[0];
  const yas = yasHesapla(sporcu.dogum_tarihi);
  const cin = sporcu.cinsiyet || 'Erkek';

  document.getElementById('sporcuTestlerDiv').innerHTML = `
  <div class="kart">
    <div class="kart-baslik">📊 Test Sonuçlarınız — ${tarihFormatla(enSon.test_tarihi)}</div>
    ${Object.keys(TEST_ETIKETLERI).map((alan, i) => {
      const val = enSon[alan];
      if (val === null || val === undefined) return '';
      const et = TEST_ETIKETLERI[alan];
      const { durum, renk, norm, oran } = testDurumu(alan, val, yas, cin);
      const barRenk = renk === 'green' ? '#057a55' : renk === 'yellow' ? '#b45309' : renk === 'orange' ? '#e65100' : '#c81e1e';
      const aciklama = typeof TEST_ACIKLAMALAR !== 'undefined' && TEST_ACIKLAMALAR[alan] ? TEST_ACIKLAMALAR[alan][renk] || '' : '';
      const bgRenk2 = renk === 'green' ? '#f0fdf4' : renk === 'yellow' ? '#fefce8' : renk === 'orange' ? '#fff7ed' : '#fef2f2';
      return `<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">
        <div class="test-satir" style="border-bottom:none;padding:0">
          <span style="font-size:11px;color:var(--gray-500);width:18px;flex-shrink:0">${i+1}</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${et.ad}</div>
            <div class="ilerleme-kap" style="margin:3px 0">
              <div class="ilerleme-bar" style="width:${Math.min(oran||80,100)}%;background:${barRenk}"></div>
            </div>
            <div style="font-size:10px;color:var(--gray-500)">Norm: ${norm} ${et.birim}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;min-width:80px">
            <div style="font-size:14px;font-weight:700">${val} <span style="font-size:10px;color:var(--gray-500)">${et.birim}</span></div>
            <span class="badge badge-${renk === 'green' ? 'green' : renk === 'yellow' ? 'yellow' : renk === 'orange' ? 'orange' : 'red'}">${durum}</span>
          </div>
        </div>
        ${aciklama ? `<div style="font-size:12px;color:var(--gray-700);margin-top:6px;padding:8px 10px;background:${bgRenk2};border-radius:8px;line-height:1.6">${aciklama}</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

function sporcuTabSec(tab, btn) {
  document.querySelectorAll('#sporcuEkrani .tab-btn').forEach(b => b.classList.remove('aktif'));
  if (btn) btn.classList.add('aktif');
  ['profil','anketim','sonuclarim','takvim','linkler','beslenme'].forEach(t => {
    document.getElementById(`stab-${t}`).style.display = t === tab ? 'block' : 'none';
  });
  if (tab === 'anketim') anketIzinKontrol();
  if (tab === 'sonuclarim') sporcuSonuclariniYukle();
  if (tab === 'takvim') yarismaTakvimiYukle('sporcuYarismaDiv', false);
  if (tab === 'linkler') sporcuQuizYukle();
  if (tab === 'beslenme') beslenmeEkraniYukle();
}



// ── ANKET İZİN KONTROLÜ ───────────────────────────────────────────────────
async function anketIzinKontrol() {
  var div = document.getElementById('sporcuAnketDiv');
  div.innerHTML = '<div class="yukleniyor"><div class="spinner"></div> Kontrol ediliyor...</div>';
  try {
    var rows = await sbFetch('sporcular?id=eq.' + oturumKullanici.id + '&select=anket_izin');
    var izin = rows && rows[0] && rows[0].anket_izin;
    if (izin) {
      anketFormuHazirla();
    } else {
      div.innerHTML = '<div class="bos-durum"><span class="ikon">🔒</span><p>Anket şu an kapalı.</p><p style="font-size:12px;margin-top:8px;color:var(--gray-500)">Antrenörünüz anketi açtığında doldurabilirsiniz.</p></div>';
    }
  } catch(e) {
    div.innerHTML = '<div class="bos-durum"><span class="ikon">🔒</span><p>Anket şu an kapalı.</p></div>';
  }
}

// ── ANKET VERİSİ ──────────────────────────────────────────────────────────
const ANKET_BOLUMLER = [
  {
    id: 'kaygi', renk: '#1a56db',
    baslik: '🔵 Rekabet Kaygısı',
    aciklama: 'Yarış öncesi nasıl hissettiğini 1-5 arasında işaretle.',
    alt: [
      { id: 'biliskel', baslik: 'Bilişsel Kaygı', labels: ['Hiç','Az','Orta','Çok','Fazla'], sorular: [
        { k: 'bk1', metin: 'Yarışmada başarısız olacağım diye endişeleniyorum.' },
        { k: 'bk2', metin: 'Rakibimin benden daha iyi performans göstereceğinden korkuyorum.' },
        { k: 'bk3', metin: 'Hedeflerime ulaşıp ulaşamayacağımdan emin değilim.' },
        { k: 'bk4', metin: 'Daha önce yaptığım hataları aklımdan çıkaramıyorum.' },
        { k: 'bk5', metin: 'Yanlış bir hamle yaparsam ne olacağını düşünüyorum.' },
        { k: 'bk6', metin: 'Antrenörümün hayal kırıklığına uğrayacağından endişeleniyorum.' },
        { k: 'bk7', metin: 'Yarışma sırasında odaklanıp odaklanamayacağımı merak ediyorum.' },
        { k: 'bk8', metin: 'Bugün kötü bir günüm olmasından korkuyorum.' },
        { k: 'bk9', metin: 'Kendimden beklenenin altında kalacağım diye düşünüyorum.' }
      ]},
      { id: 'somatik', baslik: 'Somatik Kaygı', labels: ['Hiç','Az','Orta','Çok','Fazla'], sorular: [
        { k: 'sk1', metin: 'Vücudum gergin ve kaslarım sıkışmış hissediyorum.' },
        { k: 'sk2', metin: 'Kalbim normalden hızlı çarpıyor.' },
        { k: 'sk3', metin: 'Midem bulanıyor veya karın ağrısı hissediyorum.' },
        { k: 'sk4', metin: 'Ellerim titriyor veya terliyor.' },
        { k: 'sk5', metin: 'Ağzım kuruyor, yutkunmakta güçlük çekiyorum.' },
        { k: 'sk6', metin: 'Nefes almakta zorluk çektiğimi hissediyorum.' },
        { k: 'sk7', metin: 'Bacaklarım yorgun veya ağır hissediyor.' },
        { k: 'sk8', metin: 'Baş ağrım var ya da başım dönüyor.' },
        { k: 'sk9', metin: 'Yarışmadan önce çok sık tuvalete çıkma ihtiyacı duyuyorum.' }
      ]},
      { id: 'ozguven', baslik: 'Özgüven', labels: ['Hiç','Az','Orta','Çok','Tam'], sorular: [
        { k: 'og1', metin: 'Bu yarışmada iyi bir performans göstereceğimden eminim.' },
        { k: 'og2', metin: 'Antrenmanlarda öğrendiklerimi sahaya yansıtabileceğime inanıyorum.' },
        { k: 'og3', metin: 'Baskı altında doğru kararlar verebileceğimi düşünüyorum.' },
        { k: 'og4', metin: 'Fiziksel olarak yarışmaya hazır olduğumu hissediyorum.' },
        { k: 'og5', metin: 'Rakibimle başa çıkabileceğime inanıyorum.' },
        { k: 'og6', metin: 'Zor bir durumda bile odağımı koruyabilirim.' },
        { k: 'og7', metin: 'Kendime olan güvenim yüksek.' },
        { k: 'og8', metin: 'Bu yarışmada başarılı olma kapasiteme inanıyorum.' },
        { k: 'og9', metin: 'Takım arkadaşlarımın güvenine layık olduğumu hissediyorum.' }
      ]}
    ]
  },
  {
    id: 'motivasyon', renk: '#7e22ce',
    baslik: '🟣 Motivasyon Yönelimi',
    aciklama: 'Sporda en çok başarılı hissederim... cümlesini tamamla.',
    alt: [
      { id: 'gorev', baslik: 'Görev Yönelimi', labels: ['Hiç','Hayır','Kararsız','Evet','Kesinlikle'], sorular: [
        { k: 'g1', metin: '...yeni bir beceriyi öğrendiğimde ve bu çok çalışmamı gerektirdiğinde.' },
        { k: 'g2', metin: '...kendim için belirlediğim bir hedefi gerçekleştirdiğimde.' },
        { k: 'g3', metin: '...antrenmanlarımda normalden daha iyi yaptığımda.' },
        { k: 'g4', metin: '...zor bir beceriyi çok çalışarak öğrendiğimde.' },
        { k: 'g5', metin: '...işlerin doğru yapılmasını öğrendiğimde.' },
        { k: 'g6', metin: '...diğer insanlar yapamasa da ben başardığımda.' },
        { k: 'g7', metin: '...elimden gelenin en iyisini yaptığımı hissettiğimde.' }
      ]},
      { id: 'ego', baslik: 'Ego Yönelimi', labels: ['Hiç','Hayır','Kararsız','Evet','Kesinlikle'], sorular: [
        { k: 'e1', metin: '...diğerlerinden daha iyi olduğumu gösterdiğimde.' },
        { k: 'e2', metin: '...az çalışarak başkalarından daha iyi performans gösterdiğimde.' },
        { k: 'e3', metin: '...takımdaki en iyisi olduğumda.' },
        { k: 'e4', metin: '...başkalarının yapamadığını ben yapabildiğimde.' },
        { k: 'e5', metin: '...sınıftaki veya takımdaki en iyisi olduğumda.' },
        { k: 'e6', metin: '...diğerlerini yendiğimde.' }
      ]}
    ]
  },
  {
    id: 'mental', renk: '#057a55',
    baslik: '🟢 Mental Dayanıklılık',
    aciklama: 'Spordaki deneyimlerini düşünerek yanıtla.',
    alt: [
      { id: 'kontrol', baslik: 'Kontrol', labels: ['Hiç','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
        { k: 'kon1', metin: 'Zor anlarda duygularımı kontrol edebiliyorum.' },
        { k: 'kon2', metin: 'Ne olursa olsun kendi kendimi sakinleştirebilirim.' },
        { k: 'kon3', metin: 'Antrenman ve yarışın gidişatı üzerinde etkili olabileceğimi hissediyorum.' }
      ]},
      { id: 'baglilik', baslik: 'Bağlılık', labels: ['Hiç','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
        { k: 'bag1', metin: 'Zorlu antrenmanlarda bırakmak istemesem de devam ederim.' },
        { k: 'bag2', metin: 'Hedeflerim doğrultusunda antrenmanlarıma adarım.' },
        { k: 'bag3', metin: 'Yorgun olsam bile antrenmanları atlamamaya çalışırım.' }
      ]},
      { id: 'meydan', baslik: 'Meydan Okuma', labels: ['Hiç','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
        { k: 'mey1', metin: 'Yarışmalar ve zorluklar beni büyütür, korkutmaz.' },
        { k: 'mey2', metin: 'Yeni ve zor durumları heyecanla karşılarım.' },
        { k: 'mey3', metin: 'Başarısız olduğumda bunu bir öğrenme fırsatı olarak görürüm.' }
      ]},
      { id: 'guven', baslik: 'Güven', labels: ['Hiç','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
        { k: 'guv1', metin: 'Başkalarının baskısına rağmen kendi kararlarımda duruyorum.' },
        { k: 'guv2', metin: 'Geçmişteki hatalar şu anki performansımı etkilemiyor.' },
        { k: 'guv3', metin: 'Zor anlarda bile başarabileceğime inanıyorum.' }
      ]}
    ]
  },
  {
    id: 'konsantrasyon', renk: '#e65100',
    baslik: '🟠 Konsantrasyon & Dikkat',
    aciklama: 'Spordaki dikkat alışkanlıklarını dürüstçe işaretle.',
    alt: [
      { id: 'genisDissal', baslik: 'Geniş Dikkat', labels: ['Hiç','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
        { k: 'gd1', metin: 'Sahadaki birden fazla rakibi veya durumu aynı anda takip edebiliyorum.' },
        { k: 'gd2', metin: 'Hakem ve ortam değişikliklerini çabuk fark ediyorum.' },
        { k: 'gd3', metin: 'Rakibimin vücut dilini yarış içinde okuyabiliyorum.' },
        { k: 'gd4', metin: 'Sahada olup biteni geniş perspektifle görmeyi seviyorum.' }
      ]},
      { id: 'darDissal', baslik: 'Dar Dikkat', labels: ['Hiç','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
        { k: 'dd1', metin: 'Rakibimle karşılaştığımda tüm dikkatimi ona verebiliyorum.' },
        { k: 'dd2', metin: 'Kritik anlarda tek bir hedefe odaklanmakta zorlanmıyorum.' },
        { k: 'dd3', metin: 'Belirli bir tekmeyi yaparken odağım dağılmıyor.' },
        { k: 'dd4', metin: 'Önemli anlarda gereksiz şeyleri zihnimden uzaklaştırabiliyorum.' }
      ]},
      { id: 'dikkatHatasi', baslik: 'Dikkat Hatası (Düşük puan iyi)', labels: ['Hiç','Nadiren','Bazen','Sıklıkla','Her Zaman'], sorular: [
        { k: 'dh1', metin: 'Yarışma sırasında aklım dağılıyor ve dikkatim başka yerlere gidiyor.' },
        { k: 'dh2', metin: 'Öfke sonrası odağımı tekrar toplamakta güçlük çekiyorum.' },
        { k: 'dh3', metin: 'Seyirci veya gürültü dikkatimi önemli ölçüde bozuyor.' },
        { k: 'dh4', metin: 'Hata yaptığımda o hatayı düşünmeye devam ederek sonraki hamlemi etkiliyorum.' }
      ]}
    ]
  }
];

// ── ANKET FORMU ───────────────────────────────────────────────────────────
function anketFormuHazirla() {
  aktifAnketCevaplari = {};
  let html = '';

  ANKET_BOLUMLER.forEach(function(bolum) {
    html += '<div class="anket-alan">';
    html += '<div class="anket-alan-baslik" onclick="anketBolumToggle(this)" style="border-left:4px solid ' + bolum.renk + '">';
    html += '<span style="flex:1">' + bolum.baslik + '</span><span>▼</span></div>';
    html += '<div class="anket-alan-icerik">';
    html += '<p style="font-size:12px;color:var(--gray-500);margin-bottom:14px">' + bolum.aciklama + '</p>';
    bolum.alt.forEach(function(alt) {
      html += '<div style="margin-bottom:20px">';
      html += '<div style="font-size:13px;font-weight:700;color:var(--gray-700);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--gray-200)">' + alt.baslik + '</div>';
      alt.sorular.forEach(function(soru) {
        html += '<div class="soru" id="soru_' + soru.k + '">';
        html += '<div class="soru-metin">' + soru.metin + '</div>';
        html += '<div class="likert-secenekler">';
        [1,2,3,4,5].forEach(function(n) {
          html += '<button type="button" class="likert-btn" data-key="' + soru.k + '" data-val="' + n + '" onclick="likertSec(this)">' + n + '</button>';
        });
        html += '</div>';
        html += '<div class="likert-etiketler"><span>' + alt.labels[0] + '</span><span>' + alt.labels[4] + '</span></div>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div></div>';
  });

  html += '<div style="margin-top:16px">';
  html += '<div class="form-grup"><label class="form-etiket">Notun var mı?</label>';
  html += '<textarea id="anketNot" class="form-input" rows="3" placeholder="Aklından geçenler..."></textarea></div>';
  html += '<div id="anketHata" class="hata-mesaji"></div>';
  html += '<button class="btn btn-primary" onclick="anketGonder()">Anketi Gönder</button>';
  html += '</div>';

  document.getElementById('sporcuAnketDiv').innerHTML = html;
}

function anketBolumToggle(el) {
  var icerik = el.nextElementSibling;
  var ok = el.querySelector('span:last-child');
  var gizli = icerik.style.display === 'none';
  icerik.style.display = gizli ? 'block' : 'none';
  ok.textContent = gizli ? '▼' : '▶';
}

function likertSec(btn) {
  var key = btn.dataset.key;
  var val = parseInt(btn.dataset.val);
  aktifAnketCevaplari[key] = val;
  var soru = document.getElementById('soru_' + key);
  if (soru) {
    soru.querySelectorAll('.likert-btn').forEach(function(b) {
      b.classList.toggle('secili', parseInt(b.dataset.val) === val);
    });
  }
}

async function anketGonder() {
  var tumSorular = ANKET_BOLUMLER.flatMap(function(b) {
    return b.alt.flatMap(function(a) { return a.sorular.map(function(s) { return s.k; }); });
  });
  var eksikler = tumSorular.filter(function(k) { return !aktifAnketCevaplari[k]; });
  if (eksikler.length > 8) {
    hataGoster('anketHata', eksikler.length + ' soru yanıtsız. Lütfen tüm soruları yanıtla.');
    return;
  }
  var not = document.getElementById('anketNot').value.trim();
  var veri = Object.assign({
    sporcu_id: oturumKullanici.id,
    anket_tarihi: new Date().toISOString().split('T')[0],
    yaklasan_yaris: null,
    yarisa_gun: null,
    sporcu_notu: not || null
  }, aktifAnketCevaplari);

  try {
    await anketEkle(veri);
    var p = psikolojiPuanlari(veri);
    var tamamHtml = '<div class="tamamlandi-ekrani">';
    tamamHtml += '<span class="tamamlandi-ikon">🎉</span>';
    tamamHtml += '<div class="tamamlandi-baslik">Anket Tamamlandı!</div>';
    tamamHtml += '<div class="tamamlandi-metin">Yanıtların kaydedildi. Antrenörün sonuçları inceleyecek.</div>';
    if (p) tamamHtml += renderPsikolojOzet(p);
    tamamHtml += '</div>';
    document.getElementById('sporcuAnketDiv').innerHTML = tamamHtml;
  } catch (e) {
    hataGoster('anketHata', e.message || 'Gönderme hatası');
  }
}

// ── SPORCU SONUÇLARI ──────────────────────────────────────────────────────
async function sporcuSonuclariniYukle() {
  yukleniyor('sporcuSonuclarDiv');
  try {
    var sonuclar = await Promise.all([
      motorikTestleriGetir(oturumKullanici.id),
      anketleriGetir(oturumKullanici.id)
    ]);
    var testler = sonuclar[0];
    var anketler = sonuclar[1];
    var sporcu = oturumKullanici;
    var yas = yasHesapla(sporcu.dogum_tarihi);
    var cin = sporcu.cinsiyet || 'Erkek';
    var html = '';

    // MOTORİK TEST SONUÇLARI
    if (testler && testler.length > 0) {
      var enSon = testler[0];
      var alanlar = Object.keys(TEST_ETIKETLERI);
      var ozet = alanlar.map(function(alan) { return testDurumu(alan, enSon[alan], yas, cin); });
      var ustun = ozet.filter(function(r) { return r.renk === 'green'; }).length;
      var normal = ozet.filter(function(r) { return r.renk === 'yellow'; }).length;
      var gelistir = ozet.filter(function(r) { return r.renk === 'orange'; }).length;
      var zayif = ozet.filter(function(r) { return r.renk === 'red'; }).length;

      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">';
      html += '<div style="background:#def7ec;border-radius:10px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#057a55">' + ustun + '</div><div style="font-size:10px;color:#057a55;font-weight:600">🟢 Üstün</div></div>';
      html += '<div style="background:#fef3c7;border-radius:10px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#b45309">' + normal + '</div><div style="font-size:10px;color:#b45309;font-weight:600">🟡 Normal</div></div>';
      html += '<div style="background:#fff3e0;border-radius:10px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#e65100">' + gelistir + '</div><div style="font-size:10px;color:#e65100;font-weight:600">🟠 Geliştir</div></div>';
      html += '<div style="background:#fde8e8;border-radius:10px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:#c81e1e">' + zayif + '</div><div style="font-size:10px;color:#c81e1e;font-weight:600">🔴 Zayıf</div></div>';
      html += '</div>';

      html += '<div class="kart"><div class="kart-baslik">📊 Motorik Test Sonuçlarım — ' + tarihFormatla(enSon.test_tarihi) + '</div>';
      alanlar.forEach(function(alan, i) {
        var val = enSon[alan];
        if (val === null || val === undefined) return;
        var et = TEST_ETIKETLERI[alan];
        var r = testDurumu(alan, val, yas, cin);
        var barRenk = r.renk === 'green' ? '#057a55' : r.renk === 'yellow' ? '#b45309' : r.renk === 'orange' ? '#e65100' : '#c81e1e';
        var fark = NORMLAR[alan].yuksek_iyi ? (val - r.norm) : (r.norm - val);
        var farkStr = fark >= 0 ? ('+' + Math.abs(fark).toFixed(1)) : ('-' + Math.abs(fark).toFixed(1));
        var aciklamaObj2 = typeof TEST_ACIKLAMALAR !== 'undefined' && TEST_ACIKLAMALAR[alan] ? TEST_ACIKLAMALAR[alan][r.renk] : null;
        var bgRenk3 = r.renk === 'green' ? '#f0fdf4' : r.renk === 'yellow' ? '#fefce8' : r.renk === 'orange' ? '#fff7ed' : '#fef2f2';
        html += '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">';
        html += '<div class="test-satir" style="border-bottom:none;padding:0">';
        html += '<span style="font-size:11px;color:var(--gray-500);width:18px;flex-shrink:0">' + (i+1) + '</span>';
        html += '<div style="flex:1"><div style="font-size:13px;font-weight:500">' + et.ad + '</div>';
        html += '<div class="ilerleme-kap" style="margin:3px 0"><div class="ilerleme-bar" style="width:' + Math.min(r.oran||80,100) + '%;background:' + barRenk + '"></div></div>';
        html += '<div style="font-size:10px;color:var(--gray-500)">Norm: ' + r.norm + ' ' + et.birim + ' · Fark: <b style="color:' + barRenk + '">' + farkStr + '</b></div></div>';
        html += '<div style="text-align:right;flex-shrink:0;min-width:80px">';
        html += '<div style="font-size:14px;font-weight:700">' + val + ' <span style="font-size:10px;color:var(--gray-500)">' + et.birim + '</span></div>';
        html += '<span class="badge badge-' + (r.renk === 'green' ? 'green' : r.renk === 'yellow' ? 'yellow' : r.renk === 'orange' ? 'orange' : 'red') + '">' + r.durum + '</span>';
        html += '</div></div>';
        if (aciklamaObj2) {
          html += '<div style="font-size:12px;color:var(--gray-700);margin-top:6px;padding:8px 10px;background:' + bgRenk3 + ';border-radius:8px;line-height:1.6">' + aciklamaObj2 + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    // PSİKOLOJİ SONUÇLARI — sporcu + antrenör ortalaması
    if (anketler && anketler.length > 0) {
      var sp = psikolojiPuanlari(anketler[0]);
      // Antrenör gözlem verisi de çek
      var antData = null;
      try { var antRows = await antrenorPsikolojiGetir(oturumKullanici.id); antData = antRows && antRows[0] ? antrenorPsikolojiPuanlari(antRows[0]) : null; } catch(e2) {}

      // Sporcu boyutları — antrenörden eşleşen boyut varsa ortalamasını al
      var boyutlar = [
        { k: 'bilisselKaygi', ad: '😰 Bilişsel Kaygı', antK: 'kaygiGozlem', max: 36, ters: true },
        { k: 'somatikKaygi',  ad: '💓 Somatik Kaygı',  antK: null,           max: 36, ters: true },
        { k: 'ozguven',       ad: '💪 Özgüven',         antK: null,           max: 36, ters: false },
        { k: 'gorevYon',      ad: '🎯 Görev Yönelimi',  antK: 'gorevYonAnt', max: 5,  ters: false },
        { k: 'egoYon',        ad: '🏆 Ego Yönelimi',    antK: 'egoYonAnt',   max: 5,  ters: true },
        { k: 'kontrol',       ad: '🧘 Mental Kontrol',  antK: 'kontrolAnt',  max: 5,  ters: false },
        { k: 'baglilik',      ad: '🔗 Bağlılık',        antK: 'baglilikAnt', max: 5,  ters: false },
        { k: 'meydan',        ad: '⚡ Meydan Okuma',    antK: null,           max: 5,  ters: false },
        { k: 'guven',         ad: '🛡 Güven',           antK: 'guvenAnt',    max: 5,  ters: false },
        { k: 'genisDissal',   ad: '👁 Geniş Dikkat',    antK: 'dikkatAnt',   max: 5,  ters: false },
        { k: 'darDissal',     ad: '🎯 Dar Dikkat',      antK: null,           max: 5,  ters: false },
        { k: 'dikkatHatasi',  ad: '⚠️ Dikkat Hatası',  antK: 'dikkatBozAnt',max: 5,  ters: true }
      ];

      html += '<div class="kart">';
      html += '<div class="kart-baslik" style="margin:0">🧠 Sporcu Öz Bildirim Formu — ' + tarihFormatla(anketler[0].anket_tarihi) + '</div>';
      html += '</div>';
      html += '<div style="display:none">';
      boyutlar.forEach(function(b) {
        var spVal = sp[b.k];
        if (!spVal) return;
        // Antrenör puanını normalize et (aynı 0-max skalaya çek) ve ortalamasını al
        var finalVal = spVal;
        var kaynak = 'Öz-bildirim';
        if (antData && b.antK && antData[b.antK]) {
          var antVal = antData[b.antK];
          // Antrenör puanını sporcu skalasına normalize et
          var antNorm = (antVal / (b.ters ? 4 : 5)) * b.max;
          finalVal = (spVal + antNorm) / 2;
          kaynak = 'Ortalama';
        }
        var r = psikolojiBoyutDurumu(b.k, finalVal);
        var barRenk = r.renk === 'green' ? '#057a55' : r.renk === 'orange' ? '#e65100' : '#c81e1e';
        var bgRenk = r.renk === 'green' ? '#f0fdf4' : r.renk === 'orange' ? '#fff7ed' : '#fef2f2';
        var yuzde = b.ters ? Math.max(0, Math.min(100, (1 - finalVal/b.max)*100)) : Math.min(100, (finalVal/b.max)*100);
        var aciklamaObj = typeof PSIKO_ACIKLAMALAR !== 'undefined' && PSIKO_ACIKLAMALAR[b.k] ? PSIKO_ACIKLAMALAR[b.k][r.renk] : null;
        html += '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">';
        html += '<div class="test-satir" style="border-bottom:none;padding:0">';
        html += '<div style="flex:1">';
        html += '<div style="font-size:13px;font-weight:500">' + b.ad + '</div>';
        html += '<div class="ilerleme-kap" style="margin:3px 0"><div class="ilerleme-bar" style="width:' + yuzde + '%;background:' + barRenk + '"></div></div>';
        html += '<div style="font-size:10px;color:var(--gray-500)">' + kaynak + '</div>';
        html += '</div>';
        html += '<div style="text-align:right;flex-shrink:0;min-width:90px">';
        html += '<div style="font-size:14px;font-weight:700">' + (finalVal.toFixed ? finalVal.toFixed(1) : finalVal) + '</div>';
        html += '<span class="badge badge-' + (r.renk === 'green' ? 'green' : r.renk === 'orange' ? 'orange' : 'red') + '">' + r.durum + '</span>';
        html += '</div></div>';
        if (aciklamaObj) {
          var acikId = 'acik_' + b.k + '_' + Math.floor(Math.random()*9999);
          html += '<div style="margin-top:6px">';
          html += '<button onclick="gizliAciklamaAc(this,&quot;' + b.k + '&quot;,&quot;psikoloji_profil&quot;,&quot;' + b.ad + '&quot;)" style="background:none;border:1px solid var(--gray-200);border-radius:6px;padding:3px 10px;font-size:11px;color:var(--primary);cursor:pointer">▼ Oku</button>';
          html += '<div style="display:none;font-size:12px;color:var(--gray-700);margin-top:6px;padding:8px 10px;background:' + bgRenk + ';border-radius:8px;line-height:1.6">';
          html += aciklamaObj.metin;
          html += '<br><br><span style="color:' + barRenk + ';font-weight:600">' + aciklamaObj.tavsiye + '</span>';
          html += '</div></div>';
        }
        html += '</div>';
      });
      html += '</div>'; // icerik kapanış
      html += '</div>'; // kart kapanış
    }

    // PSİKOLOJİK REÇETE — SPORCU VERSİYONU
    if (anketler && anketler.length > 0) {
      var p2 = psikolojiPuanlari(anketler[0]);
      var gelisimAlanlar = ['bilisselKaygi','somatikKaygi','ozguven','egoYon',
        'kontrol','baglilik','meydan','guven','genisDissal','darDissal','dikkatHatasi'];
      var spZayiflar = gelisimAlanlar.filter(function(k) {
        var r = psikolojiBoyutDurumu(k, p2[k]);
        return r.renk === 'red' || r.renk === 'orange';
      });
      if (spZayiflar.length > 0) {
        html += '<div class="kart">';
        html += '<div class="kart-baslik" style="margin:0">💊 Psikolojik Reçetem</div>';
        html += '</div>';
        html += '<div style="display:none">';
        spZayiflar.forEach(function(k) {
          var r = psikolojiBoyutDurumu(k, p2[k]);
          var barRenk = r.renk === 'orange' ? '#e65100' : '#c81e1e';
          var bgRenk = r.renk === 'orange' ? '#fff7ed' : '#fef2f2';
          var recete = psikolojiReceteGetir(k);
          html += '<div style="padding:12px 0;border-bottom:1px solid var(--gray-100)">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
          html += '<span style="font-size:13px;font-weight:600">' + psikolojiAlanAdi(k) + '</span>';
          html += '<span class="badge badge-' + (r.renk === 'orange' ? 'orange' : 'red') + '">' + r.durum + '</span>';
          html += '</div>';
          html += '<div style="margin-top:6px">';
          html += '<button onclick="gizliAciklamaAc(this,&quot;' + k + '&quot;,&quot;psikoloji_recete&quot;,&quot;' + psikolojiAlanAdi(k) + '&quot;)" style="background:none;border:1px solid var(--gray-200);border-radius:6px;padding:3px 10px;font-size:11px;color:var(--primary);cursor:pointer">▼ Oku</button>';
          var receteDiv = document.createElement('div');
          receteDiv.style.cssText = 'display:none;font-size:12px;color:var(--gray-600);line-height:1.9;background:' + bgRenk + ';padding:10px;border-radius:8px;margin-top:6px';
          receteDiv.innerHTML = recete;
          html += receteDiv.outerHTML;
          html += '</div>';
          html += '</div>';
        });
        html += '</div>'; // icerik kapanış
        html += '</div>'; // kart kapanış
      }
    }

    // SAHA PERFORMANS SKORLARI — SPORCU VERSİYONU
    if (anketler && anketler.length > 0) {
      var sp2 = psikolojiPuanlari(anketler[0]);
      var skorlar2 = sahaPerfSkorlari(sp2);
      if (skorlar2) {
        html += '<div class="kart">';
        html += '<div class="kart-baslik" style="margin:0">🧠 Saha Performans Profilim</div>';
        html += '</div>';
        html += '<div style="display:none">';
        Object.keys(SAHA_PERF_SPORCU).forEach(function(key) {
          var tanim = SAHA_PERF_SPORCU[key];
          var skor = skorlar2[key];
          if (skor === undefined) return;
          var renk = sahaSkorRenk(skor, tanim.ters);
          var aciklama = tanim[renk];
          var barRenk = renk === 'green' ? '#057a55' : renk === 'orange' ? '#e65100' : '#c81e1e';
          var bgRenk = renk === 'green' ? '#f0fdf4' : renk === 'orange' ? '#fff7ed' : '#fef2f2';
          var gosterSkor = tanim.ters ? (100 - skor) : skor;
          html += '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
          html += '<span style="font-size:13px;font-weight:600">' + tanim.baslik + '</span>';
          html += '<span style="font-size:13px;font-weight:800;color:' + barRenk + '">' + gosterSkor + '</span>';
          html += '</div>';
          html += '<div class="ilerleme-kap" style="margin-bottom:8px"><div class="ilerleme-bar" style="width:' + gosterSkor + '%;background:' + barRenk + '"></div></div>';
          html += '<div style="margin-top:4px">';
          html += '<button onclick="gizliAciklamaAc(this,&quot;' + key + '&quot;,&quot;saha_performans&quot;,&quot;' + tanim.baslik + '&quot;)" style="background:none;border:1px solid var(--gray-200);border-radius:6px;padding:3px 10px;font-size:11px;color:var(--primary);cursor:pointer">▼ Oku</button>';
          html += '<div style="display:none;font-size:12px;color:var(--gray-700);padding:8px 10px;background:' + bgRenk + ';border-radius:8px;line-height:1.6;margin-top:6px">';
          html += aciklama.metin + '<br><br><span style="color:' + barRenk + ';font-weight:600">' + aciklama.tavsiye + '</span>';
          html += '</div></div>';
          html += '</div>';
        });
        html += '</div>'; // icerik kapanış
        html += '</div>'; // kart kapanış
      }
    }

    if (!html) html = '<div class="bos-durum"><span class="ikon">📋</span><p>Henüz sonuç yok</p></div>';
    document.getElementById('sporcuSonuclarDiv').innerHTML = html;
  } catch (e) {
    document.getElementById('sporcuSonuclarDiv').innerHTML = '<p style="color:red">' + e.message + '</p>';
  }
}

// ── ANKET İZNİ TOGGLE ─────────────────────────────────────────────────────
async function anketIzniToggle(sporcuId, mevcutDurum) {
  try {
    await sporcuGuncelle(sporcuId, { anket_izin: !mevcutDurum });
    bildirimGoster(mevcutDurum ? '🔒 Anket kapatıldı' : '✅ Anket açıldı');
    sporcuProfilAc(sporcuId);
  } catch(e) {
    bildirimGoster('Hata: ' + e.message);
  }
}

async function beslenmeIzniToggle(sporcuId, mevcutDurum) {
  try {
    var yeniDurum = !mevcutDurum;
    await sporcuGuncelle(sporcuId, { beslenme_aktif: yeniDurum });
    bildirimGoster(yeniDurum ? '✅ Beslenme takibi açıldı' : '🔒 Beslenme takibi kapatıldı');
    sporcuProfilAc(sporcuId);
  } catch(e) {
    bildirimGoster('Hata: ' + e.message);
  }
}

// ── YARIŞMA TAKVİMİ ──────────────────────────────────────────────────────
async function yarismaTakvimiYukle(hedefDiv, antrenorMod) {
  var div = document.getElementById(hedefDiv);
  if (!div) return;
  div.innerHTML = '<div class="yukleniyor"><div class="spinner"></div></div>';
  try {
    var yarislar = await yarismalariGetir();
    var bugun = new Date();
    bugun.setHours(0,0,0,0);

    // Tüm yarışmalar için sporcu bağlantılarını çek
    var sporcuMap = {};
    if (yarislar && yarislar.length > 0) {
      try {
        var tumBaglanti = await sbFetch('yarisma_sporcu?select=yarisma_id,sporcular(id,ad_soyad)');
        (tumBaglanti || []).forEach(function(b) {
          if (!sporcuMap[b.yarisma_id]) sporcuMap[b.yarisma_id] = [];
          if (b.sporcular) sporcuMap[b.yarisma_id].push(b.sporcular.ad_soyad);
        });
      } catch(e) {}
    }

    var html = '';

    if (antrenorMod) {
      html += '<button class="btn btn-primary" style="margin-bottom:12px" onclick="yarismaEkleFormAc()">+ Müsabaka Ekle</button>';
    }

    if (!yarislar || yarislar.length === 0) {
      html += '<div class="bos-durum"><span class="ikon">🏆</span><p>Henüz müsabaka eklenmemiş.</p></div>';
      div.innerHTML = html;
      return;
    }

    // Gelecek ve geçmiş olarak ayır
    var gelecek = yarislar.filter(function(y) { return new Date(y.tarih) >= bugun; });
    var gecmis  = yarislar.filter(function(y) { return new Date(y.tarih) < bugun; });

    if (gelecek.length > 0) {
      html += '<div class="kart-baslik" style="margin-bottom:8px">📅 Yaklaşan Müsabakalar</div>';
      gelecek.forEach(function(y) {
        var tarihObj = new Date(y.tarih);
        var kalanGun = Math.ceil((tarihObj - bugun) / (1000 * 60 * 60 * 24));
        var renk = kalanGun <= 7 ? '#c81e1e' : kalanGun <= 30 ? '#e65100' : '#057a55';
        var bg   = kalanGun <= 7 ? '#fef2f2' : kalanGun <= 30 ? '#fff7ed' : '#f0fdf4';
        var sporcular = sporcuMap[y.id] || [];

        html += '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px;background:' + bg + ';border-radius:12px;margin-bottom:8px">';
        html += '<div style="text-align:center;min-width:52px;background:white;border-radius:10px;padding:6px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:18px;font-weight:800;color:' + renk + '">' + tarihObj.getDate() + '</div>';
        html += '<div style="font-size:10px;color:var(--gray-500)">' + tarihObj.toLocaleString('tr-TR',{month:'short'}).toUpperCase() + '</div>';
        html += '</div>';
        html += '<div style="flex:1">';
        html += '<div style="font-size:14px;font-weight:700;color:var(--gray-800)">' + y.musabaka_adi + '</div>';
        if (y.yer) html += '<div style="font-size:12px;color:var(--gray-500)">📍 ' + y.yer + '</div>';
        if (y.aciklama) html += '<div style="font-size:12px;color:var(--gray-600);margin-top:2px">' + y.aciklama + '</div>';
        if (sporcular.length > 0) {
          html += '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">';
          sporcular.forEach(function(ad) {
            html += '<span style="font-size:11px;background:rgba(0,0,0,0.08);border-radius:10px;padding:2px 8px;font-weight:600">👤 ' + ad + '</span>';
          });
          html += '</div>';
        }
        html += '</div>';
        html += '<div style="text-align:right;flex-shrink:0">';
        html += '<div style="font-size:11px;font-weight:700;color:' + renk + '">' + kalanGun + ' gün</div>';
        if (antrenorMod) {
          html += '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;margin-top:4px">';
          html += '<button onclick="yarismasDuzenleAc(&quot;' + y.id + '&quot;)" style="background:none;border:1px solid var(--gray-200);border-radius:6px;color:var(--gray-600);cursor:pointer;font-size:11px;padding:2px 8px">Düzenle</button>';
          html += '<button onclick="yarismaKaldır(&quot;' + y.id + '&quot;)" style="background:none;border:none;color:var(--gray-400);cursor:pointer;font-size:18px;line-height:1">×</button>';
          html += '</div>';
        }
        html += '</div>';
        html += '</div>';
      });
    }

    if (gecmis.length > 0) {
      html += '<div class="kart-baslik" style="margin:16px 0 8px;color:var(--gray-400)">📋 Geçmiş Müsabakalar</div>';
      gecmis.slice().reverse().forEach(function(y) {
        var tarihObj = new Date(y.tarih);
        html += '<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--gray-50);border-radius:10px;margin-bottom:6px;opacity:0.7">';
        html += '<div style="text-align:center;min-width:52px;background:white;border-radius:10px;padding:6px">';
        html += '<div style="font-size:16px;font-weight:800;color:var(--gray-400)">' + tarihObj.getDate() + '</div>';
        html += '<div style="font-size:10px;color:var(--gray-400)">' + tarihObj.toLocaleString('tr-TR',{month:'short'}).toUpperCase() + '</div>';
        html += '</div>';
        html += '<div style="flex:1">';
        html += '<div style="font-size:13px;font-weight:600;color:var(--gray-500)">' + y.musabaka_adi + '</div>';
        if (y.yer) html += '<div style="font-size:11px;color:var(--gray-400)">📍 ' + y.yer + '</div>';
        html += '</div>';
        if (antrenorMod) {
          html += '<button onclick="yarismaKaldır(\'' + y.id + '\')" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:18px;line-height:1">×</button>';
        }
        html += '</div>';
      });
    }

    div.innerHTML = html;
  } catch(e) {
    div.innerHTML = '<p style="color:red">' + e.message + '</p>';
  }
}

function yarismaEkleFormAc() {
  var html = '<div class="kart" id="yarismaForm" style="margin-bottom:12px">';
  html += '<div class="kart-baslik">+ Yeni Müsabaka</div>';
  html += '<div class="form-row">';
  html += '<div class="form-grup"><label class="form-etiket">Tarih *</label><input type="date" id="yfTarih" class="form-input"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Müsabaka Adı *</label><input type="text" id="yfAd" class="form-input" placeholder="Bölge Şampiyonası"></div>';
  html += '</div>';
  html += '<div class="form-row">';
  html += '<div class="form-grup"><label class="form-etiket">Yer</label><input type="text" id="yfYer" class="form-input" placeholder="Samsun Spor Salonu"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Açıklama</label><input type="text" id="yfAciklama" class="form-input" placeholder="Opsiyonel not..."></div>';
  html += '</div>';
  html += '<div style="display:flex;gap:8px;margin-top:8px">';
  html += '<button class="btn btn-primary" onclick="yarismaKaydet()">Kaydet</button>';
  html += '<button class="btn btn-outline" onclick="yarismaTakvimiYukle(\'yarismaDiv\', true)">İptal</button>';
  html += '</div></div>';

  var div = document.getElementById('yarismaDiv');
  div.innerHTML = html + div.innerHTML;
}

async function yarismaKaydet() {
  var tarih = document.getElementById('yfTarih')?.value;
  var ad = document.getElementById('yfAd')?.value?.trim();
  if (!tarih || !ad) { bildirimGoster('Tarih ve müsabaka adı zorunlu'); return; }
  try {
    await yarismaEkle({
      tarih: tarih,
      musabaka_adi: ad,
      yer: document.getElementById('yfYer')?.value?.trim() || null,
      aciklama: document.getElementById('yfAciklama')?.value?.trim() || null
    });
    bildirimGoster('✅ Müsabaka eklendi');
    yarismaTakvimiYukle('yarismaDiv', true);
  } catch(e) {
    bildirimGoster('Hata: ' + e.message);
  }
}

async function yarismaKaldır(id) {
  try {
    await yarismaSil(id);
    bildirimGoster('Müsabaka silindi');
    yarismaTakvimiYukle('yarismaDiv', true);
  } catch(e) {
    bildirimGoster('Hata: ' + e.message);
  }
}

// ── LİNK KÜTÜPHANESİ ─────────────────────────────────────────────────────
async function linkKutuphanesiniYukle(hedefDiv, antrenorMod) {
  var div = document.getElementById(hedefDiv);
  if (!div) return;
  div.innerHTML = '<div class="yukleniyor"><div class="spinner"></div></div>';
  try {
    var linkler = await linkleriGetir();
    var bugun = new Date();
    var html = '';

    if (antrenorMod) {
      html += '<div class="kart" style="margin-bottom:12px">';
      html += '<div class="kart-baslik">+ Yeni Link Ekle</div>';
      html += '<div class="form-grup"><label class="form-etiket">Başlık</label>';
      html += '<input type="text" id="linkBaslik" class="form-input" placeholder="Dolyo Chagi Teknik Antrenmanı"></div>';
      html += '<div class="form-grup"><label class="form-etiket">URL</label>';
      html += '<input type="text" id="linkUrl" class="form-input" placeholder="https://youtube.com/..."></div>';
      html += '<button class="btn btn-primary" onclick="linkKaydet()">Ekle</button>';
      html += '</div>';
    }

    if (!linkler || linkler.length === 0) {
      html += '<div class="bos-durum"><span class="ikon">🎬</span><p>Henüz video eklenmemiş.</p></div>';
      div.innerHTML = html;
      return;
    }

    html += '<div class="kart"><div class="kart-baslik">🎬 Video Kütüphanesi</div>';
    linkler.forEach(function(l) {
      var eklenme = new Date(l.olusturma_tarihi);
      var farkGun = Math.floor((bugun - eklenme) / (1000 * 60 * 60 * 24));
      var yeni = farkGun < 7;
      var isYoutube = l.url.includes('youtube') || l.url.includes('youtu.be');
      var thumbId = '';
      if (isYoutube) {
        var match = l.url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
        if (match) thumbId = match[1];
      }

      html += '<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--gray-100);align-items:center">';
      if (thumbId) {
        html += '<img src="https://img.youtube.com/vi/' + thumbId + '/mqdefault.jpg" style="width:80px;height:54px;object-fit:cover;border-radius:8px;flex-shrink:0">';
      } else {
        html += '<div style="width:80px;height:54px;background:var(--gray-100);border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:24px">🔗</div>';
      }
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
      html += '<a href="' + l.url + '" target="_blank" style="font-size:13px;font-weight:600;color:var(--primary);text-decoration:none">' + l.baslik + '</a>';
      if (yeni) html += '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:10px">YENİ</span>';
      html += '</div>';
      html += '<div style="font-size:11px;color:var(--gray-400);margin-top:2px">' + eklenme.toLocaleDateString('tr-TR') + '</div>';
      html += '</div>';
      if (antrenorMod) {
        html += '<button onclick="linkSilBtn(\'' + l.id + '\')" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:20px;flex-shrink:0">×</button>';
      }
      html += '</div>';
    });
    html += '</div>';
    div.innerHTML = html;
  } catch(e) {
    div.innerHTML = '<p style="color:red">' + e.message + '</p>';
  }
}

async function linkKaydet() {
  var baslik = document.getElementById('linkBaslik')?.value?.trim();
  var url = document.getElementById('linkUrl')?.value?.trim();
  if (!baslik || !url) { bildirimGoster('Başlık ve URL gerekli'); return; }
  try {
    await linkEkle({ baslik: baslik, url: url });
    bildirimGoster('✅ Link eklendi');
    linkKutuphanesiniYukle('antrenorLinkDiv', true);
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

async function linkSilBtn(id) {
  try {
    await linkSil(id);
    bildirimGoster('Link silindi');
    linkKutuphanesiniYukle('antrenorLinkDiv', true);
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

// ── TEST PERİYODU HATIRLATICI ─────────────────────────────────────────────
function testHatirlaticiEkle(sporcu, sonTestTarihi) {
  if (!sonTestTarihi) return '<span style="font-size:11px;color:#c81e1e">⚠️ Hiç test yok</span>';
  var gun = Math.floor((new Date() - new Date(sonTestTarihi)) / (1000*60*60*24));
  if (gun >= 56) return '<span style="font-size:11px;color:#c81e1e;font-weight:600">⚠️ ' + gun + ' gün önce</span>';
  if (gun >= 42) return '<span style="font-size:11px;color:#e65100">⏰ ' + gun + ' gün önce</span>';
  return '<span style="font-size:11px;color:var(--gray-400)">' + gun + ' gün önce</span>';
}

// ── SİLME HANDLER FONKSİYONLARI ──────────────────────────────────────────
async function sporcuSilBtn(id, ad) {
  if (!confirm(ad + ' adlı sporcuyu silmek istediğine emin misin?\nTüm test ve anket verileri de silinecek.')) return;
  try {
    await sporcuSil(id);
    bildirimGoster('✅ Sporcu silindi');
    geriGit('antrenorEkrani');
    sporcularYukle();
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

async function testSilBtn(id) {
  if (!confirm('Bu test kaydını silmek istediğine emin misin?')) return;
  try {
    await motorikTestSil(id);
    bildirimGoster('✅ Test silindi');
    sporcuProfilAc(aktifSporcuId);
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

async function anketSilBtn(id) {
  if (!confirm('Bu anketi silmek istediğine emin misin?')) return;
  try {
    await anketSil(id);
    bildirimGoster('✅ Anket silindi');
    sporcuProfilAc(aktifSporcuId);
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

async function antrenorAnketSilBtn(id) {
  if (!confirm('Bu gözlem formunu silmek istediğine emin misin?')) return;
  try {
    await antrenorAnketSil(id);
    bildirimGoster('✅ Gözlem silindi');
    sporcuProfilAc(aktifSporcuId);
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

// ── BESLENME ANALİZ API ────────────────────────────────────────────────────
async function yemekAnalizEt(yemekMetni, antrenmanGunu, profil) {
  var prompt = `Sen bir spor beslenmesi uzmanısın ve Türk mutfağını çok iyi biliyorsun.

Sporcu şunları yedi: "${yemekMetni}"

Türk ev yemeklerinde standart porsiyonlar:
- 1 tabak pilav/makarna = 300-350 kalori
- 1 yarım tabak = 150-175 kalori  
- 1 kepçe yemek = 180-220 kalori
- 1 kase çorba = 150-200 kalori
- 1 kase salata = 50-80 kalori
- 1 dilim ekmek = 80 kalori
- 1 yumurta = 70 kalori
- 1 su bardağı süt/ayran = 100-130 kalori
- 1 porsiyon et/tavuk = 200-250 kalori
- 1 muz/elma/portakal = 80-100 kalori

Şunu JSON formatında döndür, başka hiçbir şey yazma:
{
  "kalori": 1250,
  "protein": "yüksek|orta|düşük",
  "karbonhidrat": "yüksek|orta|düşük",
  "yag": "saglikli|kotu|yok",
  "sebze_meyve": "yeterli|az|yok",
  "abur_cubur": ["cips","kola"] veya [],
  "ozet": "Kısa değerlendirme"
}`;

  try {
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    var data = await resp.json();
    var text = data.content && data.content[0] ? data.content[0].text : '';
    var clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch(e) {
    return null;
  }
}

// ── BESLENME EKRANI ────────────────────────────────────────────────────────

// ── TAKVIM DÜZENLEME ──────────────────────────────────────────────────────
async function yarismasDuzenleAc(id) {
  var yarislar = await yarismalariGetir();
  var y = yarislar.find(function(x) { return x.id === id; });
  if (!y) return;
  var sporcular = tumSporcular || [];
  var baglilar = await yarismaSporcularGetir(id);
  var bagliIdler = baglilar.map(function(b) { return b.sporcu_id; });

  var html = '<div class="kart" id="yarismaForm" style="margin-bottom:12px">';
  html += '<div class="kart-baslik">✏️ Müsabakayı Düzenle</div>';
  html += '<div class="form-row">';
  html += '<div class="form-grup"><label class="form-etiket">Tarih</label><input type="date" id="yfTarih" class="form-input" value="' + y.tarih + '"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Müsabaka Adı</label><input type="text" id="yfAd" class="form-input" value="' + y.musabaka_adi + '"></div>';
  html += '</div><div class="form-row">';
  html += '<div class="form-grup"><label class="form-etiket">Yer</label><input type="text" id="yfYer" class="form-input" value="' + (y.yer || '') + '"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Açıklama</label><input type="text" id="yfAciklama" class="form-input" value="' + (y.aciklama || '') + '"></div>';
  html += '</div>';

  // Sporcu seçimi
  if (sporcular.length > 0) {
    html += '<div style="margin-top:8px"><label class="form-etiket">Bu müsabakayı ilgilendiren sporcular</label>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">';
    sporcular.forEach(function(s) {
      var secili = bagliIdler.includes(s.id);
      html += '<label style="display:flex;align-items:center;gap:4px;padding:4px 10px;background:' + (secili ? '#def7ec' : 'var(--gray-100)') + ';border-radius:20px;cursor:pointer;font-size:12px">';
      html += '<input type="checkbox" value="' + s.id + '" ' + (secili ? 'checked' : '') + ' style="margin:0">';
      html += s.ad_soyad + '</label>';
    });
    html += '</div></div>';
  }

  html += '<div style="display:flex;gap:8px;margin-top:10px">';
  html += '<button class="btn btn-primary" onclick="yarismaGuncelleKaydet(\'' + id + '\')">Kaydet</button>';
  html += '<button class="btn btn-outline" onclick="yarismaTakvimiYukle(\'yarismaDiv\', true)">İptal</button>';
  html += '</div></div>';

  var div = document.getElementById('yarismaDiv');
  div.innerHTML = html;
}

async function yarismaGuncelleKaydet(id) {
  var tarih = document.getElementById('yfTarih')?.value;
  var ad = document.getElementById('yfAd')?.value?.trim();
  if (!tarih || !ad) { bildirimGoster('Tarih ve ad gerekli'); return; }
  try {
    await yarismaGuncelle(id, {
      tarih: tarih, musabaka_adi: ad,
      yer: document.getElementById('yfYer')?.value?.trim() || null,
      aciklama: document.getElementById('yfAciklama')?.value?.trim() || null
    });
    // Sporcu bağlantılarını güncelle (tablo yoksa sessizce geç)
    try {
      var checkboxlar = document.querySelectorAll('#yarismaForm input[type=checkbox]');
      var baglilar = await yarismaSporcularGetir(id);
      var eskiIdler = baglilar.map(function(b) { return b.sporcu_id; });
      var yeniIdler = Array.from(checkboxlar)
        .filter(function(c) { return c.checked; })
        .map(function(c) { return c.value; });
      // Ekle
      var eklePromisler = yeniIdler
        .filter(function(nId) { return !eskiIdler.includes(nId); })
        .map(function(nId) { return yarismaSporcuEkle(id, nId); });
      // Sil
      var silPromisler = eskiIdler
        .filter(function(eId) { return !yeniIdler.includes(eId); })
        .map(function(eId) { return yarismaSporcuSil(id, eId); });
      await Promise.all(eklePromisler.concat(silPromisler));
    } catch(spErr) {
      console.warn('Sporcu bağlantısı güncellenemedi:', spErr.message);
    }
    bildirimGoster('✅ Müsabaka güncellendi');
    yarismaTakvimiYukle('yarismaDiv', true);
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

// ── ANTRENÖR BESLENMEöZETİ ────────────────────────────────────────────────
async function antrenorBeslenmeOzetiGoster(sporcuId, sporcuAd) {
  var div = document.getElementById('profilBilgilerDiv');
  if (!div) return;
  var kayitlar = await sporcuBeslenmeOzetiGetir(sporcuId);
  if (!kayitlar || kayitlar.length === 0) {
    bildirimGoster(sporcuAd + ' henüz beslenme kaydı yok'); return;
  }
  var html = '<div class="kart"><div class="kart-baslik">🍽️ ' + sporcuAd + ' — Son 7 Gün Beslenme</div>';
  kayitlar.forEach(function(g) {
    var renk = !g.toplam_kalori ? '#9ca3af' : '#057a55';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100)">';
    html += '<div><span style="font-size:12px;color:var(--gray-500)">' + tarihFormatla(g.tarih) + (g.antrenman_gunu ? ' 🏋️' : '') + '</span>';
    if (g.abur_cubur_notlar) html += '<div style="font-size:11px;color:#c81e1e">⚠️ ' + g.abur_cubur_notlar + '</div>';
    html += '</div>';
    html += '<span style="font-size:13px;font-weight:700;color:' + renk + '">' + (g.toplam_kalori || '—') + ' kal</span>';
    html += '</div>';
  });
  html += '</div>';
  div.insertAdjacentHTML('afterbegin', html);
}


// ── GİZLE/GÖSTER KART ────────────────────────────────────────────────────
function gizliKartAc(btn, bolum, baslik) {
  var icerik = btn.parentElement.nextElementSibling;
  if (!icerik) return;
  if (icerik.style.display === 'none' || icerik.style.display === '') {
    icerik.style.display = 'block';
    btn.textContent = '▲ Kapat';
    // Okuma kaydı
    icerikOkumaKaydet(oturumKullanici.id, bolum, baslik).catch(function(){});
  } else {
    icerik.style.display = 'none';
    btn.textContent = '▼ Oku';
  }
}

function gizliAciklamaAc(btn, key, bolum, baslik) {
  var icerik = btn.nextElementSibling;
  if (!icerik) return;
  if (icerik.style.display === 'none' || icerik.style.display === '') {
    icerik.style.display = 'block';
    btn.textContent = '▲ Kapat';
    icerikOkumaKaydet(oturumKullanici.id, bolum + '_' + key, baslik).catch(function(){});
  } else {
    icerik.style.display = 'none';
    btn.textContent = '▼ Oku';
  }
}

// ── BESLENME SİSTEMİ ──────────────────────────────────────────────────────
var secilenYemekler = [];
var secilenSabah = [];
var secilenOgle = [];
var secilenAksam = [];
var aktifOgun = 'aksam';
var tumYemekler = [];

async function beslenmeEkraniYukle() {
  var div = document.getElementById('sporcuBeslenmeDiv');
  if (!div) return;
  div.innerHTML = '<div class="yukleniyor"><div class="spinner"></div></div>';

  var sporcu = oturumKullanici;

  // Beslenme aktif mi kontrol et
  if (!sporcu.beslenme_aktif) {
    div.innerHTML = '<div class="bos-durum"><span class="ikon">🍽️</span><p>Beslenme takibi henüz aktif değil.</p><p style="font-size:12px;color:var(--gray-400)">Antrenörün aktif ettiğinde buradan takip yapabilirsin.</p></div>';
    return;
  }

  var bugun = new Date().toISOString().split('T')[0];

  try {
    var [kayit, yemekListesi] = await Promise.all([
      beslenmeGetir(sporcu.id, bugun),
      yemekListesiGetir()
    ]);

    // Miktar listesi sabit — DB'ye gerek yok
    var miktarListesi = [
      { ad: '1 tabak',        carpan: 1    },
      { ad: '1 yarım tabak',  carpan: 0.5  },
      { ad: '2 tabak',        carpan: 2    },
      { ad: '1 kepçe',        carpan: 0.8  },
      { ad: '2 kepçe',        carpan: 1.6  },
      { ad: '1 kase',         carpan: 0.9  },
      { ad: '1 yarım kase',   carpan: 0.45 },
      { ad: '1 porsiyon',     carpan: 1    },
      { ad: '2 porsiyon',     carpan: 2    },
      { ad: '1 dilim',        carpan: 0.3  },
      { ad: '2 dilim',        carpan: 0.6  },
      { ad: '1 adet',         carpan: 0.4  },
      { ad: '2 adet',         carpan: 0.8  },
      { ad: '3 adet',         carpan: 1.2  },
      { ad: '1 su bardağı',   carpan: 0.5  },
      { ad: '1 çay bardağı',  carpan: 0.25 },
      { ad: '1 avuç',         carpan: 0.3  },
      { ad: '1 dilim ekmek',  carpan: 1    },
      { ad: '2 dilim ekmek',  carpan: 2    }
    ];

    tumYemekler = yemekListesi || [];
    var antTur = kayit ? (kayit.antrenman_turu || 'yok') : 'yok';
    var hedefObj = kaloriHedefiHesapla(sporcu, antTur);

    // Kaydedilmiş yemek listelerini öğünlere göre yükle
    try { secilenYemekler = kayit && kayit.yemek_listesi_json ? JSON.parse(kayit.yemek_listesi_json) : []; } catch(e) { secilenYemekler = []; }
    try { secilenSabah = kayit && kayit.sabah_json ? JSON.parse(kayit.sabah_json) : []; } catch(e) { secilenSabah = []; }
    try { secilenOgle = kayit && kayit.ogle_json ? JSON.parse(kayit.ogle_json) : []; } catch(e) { secilenOgle = []; }
    try { secilenAksam = kayit && kayit.aksam_json ? JSON.parse(kayit.aksam_json) : []; } catch(e) { secilenAksam = []; }

    // Geriye dönük uyumluluk: eski yemek_listesi_json varsa akşama say
    if (secilenYemekler.length > 0 && secilenSabah.length === 0 && secilenOgle.length === 0 && secilenAksam.length === 0) {
      secilenAksam = secilenYemekler;
    }

    var toplamKalori = [...secilenSabah, ...secilenOgle, ...secilenAksam].reduce(function(t,y){ return t+(y.kalori||0); }, 0);
    var html = '';

    // Kilo kartı
    var mevcutKilo = parseFloat(sporcu.kilo_kg) || 0;
    var hedefKilo = parseFloat(sporcu.hedef_kilo) || 0;
    if (mevcutKilo || hedefKilo) {
      var fark = mevcutKilo - hedefKilo;
      var fRenk = fark > 0.5 ? '#e65100' : fark < -0.5 ? '#1a56db' : '#057a55';
      html += '<div class="kart"><div style="display:flex;gap:8px;margin-bottom:10px">';
      html += '<div style="flex:1;background:var(--gray-50);border-radius:10px;padding:10px;text-align:center"><div style="font-size:20px;font-weight:800">' + (mevcutKilo||'—') + ' kg</div><div style="font-size:11px;color:var(--gray-500)">Şu anki kilo</div></div>';
      if (hedefKilo) {
        html += '<div style="flex:1;background:var(--gray-50);border-radius:10px;padding:10px;text-align:center"><div style="font-size:20px;font-weight:800;color:' + fRenk + '">' + hedefKilo + ' kg</div><div style="font-size:11px;color:var(--gray-500)">Hedef</div></div>';
        html += '<div style="flex:1;background:var(--gray-50);border-radius:10px;padding:10px;text-align:center"><div style="font-size:18px;font-weight:800;color:' + fRenk + '">' + (fark>0?'-':'+') + Math.abs(fark).toFixed(1) + '</div><div style="font-size:10px;color:' + fRenk + '">' + (fark>0.5?'verilecek':fark<-0.5?'alınacak':'hedefe ulaştın!') + '</div></div>';
      }
      html += '</div>';
      // Kilo güncelle
      html += '<div style="display:flex;gap:8px"><input type="number" id="yeniKiloInput" class="form-input" placeholder="Yeni kilonu gir" step="0.1" style="flex:1">';
      html += '<button onclick="kiloGuncelle()" class="btn btn-primary">Güncelle</button></div>';
      html += '</div>';
    }

    // 2 ay uyarısı
    html += '<div id="beslenmeUyariDiv"></div>';

    // Kalori hedefi
    var kaloriRenk = toplamKalori > hedefObj.max ? '#c81e1e' : toplamKalori < hedefObj.min && toplamKalori > 0 ? '#1a56db' : '#057a55';
    var kaloriYuzde = Math.min(Math.round((toplamKalori / hedefObj.hedef) * 100), 120);
    html += '<div class="kart">';

    // Kalori çubuğu
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:var(--gray-500)">' + hedefObj.aciklama + ' — Hedef: ' + hedefObj.hedef + ' kal</span><span style="font-size:13px;font-weight:700;color:' + kaloriRenk + '">' + toplamKalori + ' kal</span></div>';
    html += '<div class="ilerleme-kap" style="margin-bottom:8px"><div class="ilerleme-bar" style="width:' + kaloriYuzde + '%;background:' + kaloriRenk + '"></div></div>';
    if (toplamKalori > hedefObj.max) html += '<div style="font-size:11px;color:#c81e1e;font-weight:600;margin-bottom:8px">⚠️ Hedefin ' + (toplamKalori-hedefObj.hedef) + ' kalori üzerinde!</div>';
    else if (toplamKalori < hedefObj.min && toplamKalori > 0) html += '<div style="font-size:11px;color:#1a56db;font-weight:600;margin-bottom:8px">💡 Bugün az yedin — performansın etkilenebilir.</div>';

    // ÖĞÜN SEKMELERİ
    html += '<div class="kart">';
    html += '<div class="kart-baslik" style="margin-bottom:10px">🍽️ Öğünlerim</div>';
    // Öğün sekme butonları
    html += '<div style="display:flex;gap:4px;margin-bottom:12px">';
    var ogunler = [{k:'sabah',label:'☀️ Sabah'},{k:'ogle',label:'🌤️ Öğlen'},{k:'aksam',label:'🌙 Akşam'}];
    ogunler.forEach(function(o) {
      html += '<button onclick="aktifOgunSec(&quot;' + o.k + '&quot;)" id="ogunBtn_' + o.k + '" style="flex:1;padding:8px;border-radius:8px;border:none;font-size:12px;font-weight:700;cursor:pointer;background:var(--gray-100);color:var(--gray-600)">' + o.label + '</button>';
    });
    html += '</div>';
    html += '<div id="aktifOgunLabel" style="font-size:12px;color:var(--gray-500);margin-bottom:8px">Öğün seç</div>';

    // Yemek arama
    html += '<input type="text" id="yemekArama" class="form-input" placeholder="Örn: mercimek, pilav, tavuk..." oninput="yemekAramaFiltrele()" onfocus="yemekAramaFiltrele()" style="margin-bottom:6px">';
    html += '<div id="yemekAramaSonuclari" style="max-height:160px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:8px;display:none;background:white"></div>';

    // Miktar + ekle
    html += '<div style="display:flex;gap:6px;margin-top:8px;align-items:flex-end">';
    html += '<div style="flex:1"><label style="font-size:11px;color:var(--gray-500)">Seçilen</label><div id="seciliYemekGoster" style="padding:8px;background:var(--gray-50);border-radius:8px;font-size:12px;color:var(--gray-500);margin-top:2px">— seç —</div></div>';
    html += '<div><label style="font-size:11px;color:var(--gray-500)">Miktar</label><select id="miktarSec" class="form-input" onchange="miktarSecildi()" style="margin-top:2px">';
    (miktarListesi||[]).forEach(function(m) { html += '<option value="' + m.carpan + '" data-ad="' + m.ad + '">' + m.ad + '</option>'; });
    html += '</select></div>';
    html += '<button onclick="yemekSepeteEkle()" class="btn btn-primary" style="white-space:nowrap">+ Ekle</button>';
    html += '</div>';
    html += '<div id="kaloriOnizle" style="font-size:11px;color:var(--primary);margin:4px 0"></div>';
    html += '<div style="text-align:center;margin-top:4px"><button onclick="yeniYemekFormAc()" style="background:none;border:none;color:var(--gray-400);font-size:11px;cursor:pointer">+ Listede yoksa ekle</button></div>';
    html += '<div id="yeniYemekFormDiv"></div>';
    html += '</div>';

    // Öğün listeleri
    var ogunGoster = [
      {k:'sabah', label:'☀️ Sabah', liste: secilenSabah},
      {k:'ogle',  label:'🌤️ Öğlen', liste: secilenOgle},
      {k:'aksam', label:'🌙 Akşam', liste: secilenAksam}
    ];
    var herhangiBirYemek = secilenSabah.length > 0 || secilenOgle.length > 0 || secilenAksam.length > 0;
    if (herhangiBirYemek) {
      html += '<div class="kart"><div class="kart-baslik">📋 Bugün Yediklerim — ' + toplamKalori + ' kal</div>';
      ogunGoster.forEach(function(o) {
        if (o.liste.length === 0) return;
        html += '<div style="font-size:11px;font-weight:700;color:var(--gray-500);margin:8px 0 4px">' + o.label + '</div>';
        o.liste.forEach(function(item, i) {
          var aburCubur = aburCuburTespitEt(item.yemek).length > 0;
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--gray-100)">';
          html += '<span style="font-size:13px">' + (aburCubur?'⚠️ ':'') + item.miktar + ' ' + item.yemek + '</span>';
          html += '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--gray-500)">' + item.kalori + ' kal</span>';
          html += '<button onclick="yemekListedenSil(&quot;' + o.k + '&quot;,' + i + ')" style="background:none;border:none;color:#c81e1e;cursor:pointer;font-size:18px;padding:0;line-height:1">×</button></div></div>';
        });
      });
      html += '</div>';
    }

    // Analiz sonuçları
    if (kayit && kayit.analiz_json) html += renderBeslenmeAnaliz(kayit);

    // Son 7 gün
    var gecmis = await beslenmeGecmisGetir(sporcu.id);
    if (gecmis && gecmis.length > 1) {
      html += '<div class="kart"><div class="kart-baslik">📊 Son 7 Gün</div>';
      gecmis.slice(0,7).forEach(function(g) {
        var gH = kaloriHedefiHesapla(sporcu, g.antrenman_gunu).hedef;
        var gR = !g.toplam_kalori ? '#9ca3af' : g.toplam_kalori > gH*1.15 ? '#c81e1e' : g.toplam_kalori < gH*0.8 ? '#1a56db' : '#057a55';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--gray-100)">';
        html += '<span style="font-size:12px;color:var(--gray-500)">' + tarihFormatla(g.tarih) + (g.antrenman_gunu?' 🏋️':'') + '</span>';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        if (g.abur_cubur) html += '<span style="font-size:10px;color:#c81e1e">⚠️ abur cubur</span>';
        html += '<span style="font-size:12px;font-weight:700;color:' + gR + '">' + (g.toplam_kalori||'—') + ' kal</span></div></div>';
      });
      html += '</div>';
    }

    div.innerHTML = html;
    beslenmeUyariYukle();

  } catch(e) {
    div.innerHTML = '<p style="color:red">Hata: ' + e.message + '</p>';
  }
}

// Yemek arama
function yemekAramaFiltrele() {
  var arama = (document.getElementById('yemekArama')?.value || '').toLowerCase().trim();
  var sonucDiv = document.getElementById('yemekAramaSonuclari');
  if (!sonucDiv) return;

  // Boşken tüm listeyi göster (max 20)
  var sonuclar = arama
    ? tumYemekler.filter(function(y) { return y.ad.toLowerCase().includes(arama); }).slice(0, 15)
    : tumYemekler.slice(0, 20);

  if (tumYemekler.length === 0) {
    sonucDiv.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--gray-400)">Yemek listesi yükleniyor...</div>';
    sonucDiv.style.display = 'block';
    return;
  }

  if (sonuclar.length === 0) {
    sonucDiv.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--gray-400)">Bulunamadı — aşağıdan yeni yemek ekleyebilirsin</div>';
  } else {
    sonucDiv.innerHTML = sonuclar.map(function(y) {
      return '<div onclick="yemekSec(\'' + y.ad.replace(/'/g,'\\\'') + '\',' + (y.kalori_tabak||0) + ')" style="padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--gray-100);font-size:13px;display:flex;justify-content:space-between" onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'white\'">'
        + '<span>' + y.ad + '</span>'
        + '<span style="color:var(--gray-400);font-size:11px">~' + (y.kalori_tabak||'?') + ' kal</span></div>';
    }).join('');
  }
  sonucDiv.style.display = 'block';
}

var _seciliYemekAd = '';
var _seciliYemekKalori = 0;

function yemekSec(ad, kalori) {
  _seciliYemekAd = ad;
  _seciliYemekKalori = kalori;
  var g = document.getElementById('seciliYemekGoster');
  if (g) { g.textContent = ad + ' (~' + kalori + ' kal/porsiyon)'; g.style.color = 'var(--gray-800)'; }
  var s = document.getElementById('yemekAramaSonuclari');
  if (s) s.style.display = 'none';
  var a = document.getElementById('yemekArama');
  if (a) a.value = ad;
}

function aktifOgunSec(ogun) {
  aktifOgun = ogun;
  var label = ogun === 'sabah' ? '☀️ Sabah öğününe ekleniyor' : ogun === 'ogle' ? '🌤️ Öğlen öğününe ekleniyor' : '🌙 Akşam öğününe ekleniyor';
  var el = document.getElementById('aktifOgunLabel');
  if (el) el.textContent = label;
  // Buton stillerini güncelle
  ['sabah','ogle','aksam'].forEach(function(k) {
    var btn = document.getElementById('ogunBtn_' + k);
    if (!btn) return;
    btn.style.background = k === ogun ? 'var(--primary)' : 'var(--gray-100)';
    btn.style.color = k === ogun ? 'white' : 'var(--gray-600)';
  });
}

function yemekSepeteEkle() {
  if (!_seciliYemekAd) { bildirimGoster('Önce bir yemek seç'); return; }
  if (!aktifOgun) { bildirimGoster('Önce öğün seç (Sabah/Öğlen/Akşam)'); return; }
  var miktarEl = document.getElementById('miktarSec');
  var carpan = miktarEl ? parseFloat(miktarEl.options[miktarEl.selectedIndex]?.value||1) : 1;
  var miktarAd = miktarEl ? miktarEl.options[miktarEl.selectedIndex]?.getAttribute('data-ad') : '1 porsiyon';
  var kalori = Math.round(_seciliYemekKalori * carpan);
  var item = { miktar: miktarAd, yemek: _seciliYemekAd, kalori: kalori };
  if (aktifOgun === 'sabah') secilenSabah.push(item);
  else if (aktifOgun === 'ogle') secilenOgle.push(item);
  else secilenAksam.push(item);
  _seciliYemekAd = ''; _seciliYemekKalori = 0;
  var goster = document.getElementById('seciliYemekGoster');
  if (goster) { goster.textContent = '— seç —'; goster.style.color = 'var(--gray-500)'; }
  var arama = document.getElementById('yemekArama');
  if (arama) arama.value = '';
  yemekListeKaydet();
}

async function yemekListeKaydet() {
  var sporcu = oturumKullanici;
  var bugun = new Date().toISOString().split('T')[0];
  var toplamKalori = secilenYemekler.reduce(function(t,y){ return t+(y.kalori||0); }, 0);

  var tumYemekBirlestir = [...secilenSabah, ...secilenOgle, ...secilenAksam];
  // Önce kaydet — API analizi olmadan
  try {
    await beslenmeKaydet(sporcu.id, bugun, {
      yemek_listesi_json: JSON.stringify(tumYemekBirlestir),
      sabah_json: JSON.stringify(secilenSabah),
      ogle_json: JSON.stringify(secilenOgle),
      aksam_json: JSON.stringify(secilenAksam),
      toplam_kalori: toplamKalori
    });
    bildirimGoster('✅ Eklendi');
    beslenmeEkraniYukle();
  } catch(e) {
    bildirimGoster('Hata: ' + e.message);
    return;
  }

  // Sonra arka planda API analizi yap (başarısız olsa sorun yok)
  try {
    var yemekMetni = secilenYemekler.map(function(y){ return y.miktar+' '+y.yemek; }).join(', ');
    var analiz = await yemekAnalizEt(yemekMetni, false, sporcu.beslenme_profil||'koru');
    if (analiz) {
      await beslenmeKaydet(sporcu.id, bugun, {
        toplam_kalori: analiz.kalori || toplamKalori,
        analiz_json: JSON.stringify(analiz),
        abur_cubur: analiz.abur_cubur && analiz.abur_cubur.length > 0,
        abur_cubur_notlar: analiz.abur_cubur ? analiz.abur_cubur.join(', ') : null
      });
      beslenmeEkraniYukle();
    }
  } catch(e) {
    // API hatası — sessizce geç, kayıt zaten yapıldı
    console.log('Analiz yapılamadı:', e.message);
  }
}

async function yemekListedenSil(ogun, index) {
  if (ogun === 'sabah') secilenSabah.splice(index, 1);
  else if (ogun === 'ogle') secilenOgle.splice(index, 1);
  else secilenAksam.splice(index, 1);
  yemekListeKaydet();
}

function yeniYemekFormAc() {
  var div = document.getElementById('yeniYemekFormDiv');
  if (!div) return;
  div.innerHTML = '<div style="margin-top:8px;padding:10px;background:var(--gray-50);border-radius:8px">'
    + '<div class="form-row">'
    + '<div class="form-grup"><label class="form-etiket">Yemek Adı *</label><input type="text" id="yeniYemekAd" class="form-input" placeholder="Tarhana çorbası"></div>'
    + '<div class="form-grup"><label class="form-etiket">Kalori (1 porsiyon)</label><input type="number" id="yeniYemekKalori" class="form-input" placeholder="Boş bırakırsan tahmin edilir"></div>'
    + '</div>'
    + '<button onclick="yeniYemekKaydet()" class="btn btn-primary">Kaydet & Ekle</button> '
    + '<button onclick="document.getElementById(\'yeniYemekFormDiv\').innerHTML=\'\'" class="btn btn-outline">İptal</button>'
    + '</div>';
}

async function yeniYemekKaydet() {
  var ad = document.getElementById('yeniYemekAd')?.value?.trim();
  var kaloriEl = document.getElementById('yeniYemekKalori');
  var kalori = kaloriEl ? (parseInt(kaloriEl.value)||null) : null;
  if (!ad) { bildirimGoster('Yemek adı gerekli'); return; }
  if (!kalori) {
    bildirimGoster('Kalori hesaplanıyor...');
    try {
      var resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 100,
          messages: [{ role: 'user', content: 'Türk mutfağında "' + ad + '" yemeğinin 1 standart ev porsiyonunun kalorisi kaçtır? Sadece sayıyı yaz. Örnek: 220' }]
        })
      });
      var data = await resp.json();
      var text = data.content?.[0]?.text?.trim()||'';
      var h = parseInt(text.replace(/[^0-9]/g,''));
      if (h > 0 && h < 2000) kalori = h;
    } catch(e) {}
  }
  try {
    await yemekEkle(ad, kalori, 'diger');
    tumYemekler.push({ ad: ad, kalori_tabak: kalori, kategori: 'diger' });
    yemekSec(ad, kalori||0);
    document.getElementById('yeniYemekFormDiv').innerHTML = '';
    bildirimGoster('✅ ' + ad + ' eklendi (~' + (kalori||'?') + ' kal)');
  } catch(e) {
    if (e.message.includes('duplicate')||e.message.includes('unique')) bildirimGoster('Bu yemek zaten listede');
    else bildirimGoster('Hata: ' + e.message);
  }
}

async function kiloGuncelle() {
  var yeniKilo = parseFloat(document.getElementById('yeniKiloInput')?.value);
  if (!yeniKilo) { bildirimGoster('Kilo gir'); return; }
  try {
    await sporcuGuncelle(oturumKullanici.id, { kilo_kg: yeniKilo });
    oturumGuncelle({ kilo_kg: yeniKilo });
    bildirimGoster('✅ Kilo güncellendi');
    beslenmeEkraniYukle();
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

async function beslenmeAntrGunToggle(tur) {
  var sporcu = oturumKullanici;
  var bugun = new Date().toISOString().split('T')[0];
  try {
    var antGunu = tur !== 'yok';
    await beslenmeKaydet(sporcu.id, bugun, { antrenman_turu: tur, antrenman_gunu: antGunu });
    beslenmeEkraniYukle();
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

async function beslenmeUyariYukle() {
  var div = document.getElementById('beslenmeUyariDiv');
  if (!div) return;
  try {
    var yarislar = await yarismalariGetir();
    var bugun = new Date(); bugun.setHours(0,0,0,0);
    var uyarilar = yarislar.filter(function(y) {
      var g = Math.ceil((new Date(y.tarih) - bugun) / (1000*60*60*24));
      return g > 0 && g <= 60;
    });
    if (!uyarilar.length) return;
    var html = '';
    uyarilar.forEach(function(y) {
      var g = Math.ceil((new Date(y.tarih) - bugun) / (1000*60*60*24));
      var acil = g <= 30;
      html += '<div style="background:' + (acil?'#fef2f2':'#fff7ed') + ';border-radius:12px;padding:12px;margin-bottom:8px;border-left:4px solid ' + (acil?'#c81e1e':'#e65100') + '">';
      html += '<div style="font-size:13px;font-weight:700;color:' + (acil?'#c81e1e':'#e65100') + '">' + (acil?'🔴 ':'🟠 ') + y.musabaka_adi + ' — ' + g + ' gün kaldı</div>';
      html += '<div style="font-size:12px;color:var(--gray-600);margin-top:4px">Beslenme takibini düzenli tutman önemli. Hedef kilona ' + g + ' günün var.</div>';
      html += '</div>';
    });
    div.innerHTML = html;
  } catch(e) {}
}

// ── ANTRENÖR BESLENMEUYARİ ────────────────────────────────────────────────
async function antrenorBeslenmeUyariYukle() {
  try {
    var uyarilar = await sporcuYarismaUyariGetir();
    if (!uyarilar.length) return;
    var html = '<div class="kart" style="border-left:4px solid #c81e1e"><div class="kart-baslik">🔔 Beslenme Takip Uyarıları</div>';
    uyarilar.forEach(function(u) {
      var hedefUzak = u.fark && parseFloat(u.fark) > 1;
      html += '<div style="padding:8px 0;border-bottom:1px solid var(--gray-100)">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center">';
      html += '<div>';
      html += '<div style="font-size:13px;font-weight:700">' + u.sporcu.ad_soyad + '</div>';
      html += '<div style="font-size:11px;color:var(--gray-500)">' + u.musabaka + ' — ' + u.gun + ' gün kaldı</div>';
      if (u.fark && parseFloat(u.fark) > 0) {
        html += '<div style="font-size:11px;color:#e65100">⚖️ Hedeften ' + u.fark + ' kg uzakta</div>';
      }
      html += '</div>';
      var aktif = u.sporcu.beslenme_aktif;
      html += '<button onclick="antrenorBeslenmeToggle(\'' + u.sporcu.id + '\',' + !aktif + ',this)" style="padding:5px 12px;border-radius:8px;border:none;font-size:11px;font-weight:700;cursor:pointer;background:' + (aktif?'#def7ec':'#fee2e2') + ';color:' + (aktif?'#057a55':'#c81e1e') + '">';
      html += aktif ? '✅ Takip Açık' : '❌ Takip Kapalı';
      html += '</button></div></div>';
    });
    html += '</div>';
    // Sporcular listesinin başına ekle
    var listDiv = document.getElementById('sporcuListesiDiv');
    if (listDiv) listDiv.insertAdjacentHTML('beforebegin', html);
  } catch(e) {}
}

async function antrenorBeslenmeToggle(sporcuId, durum, btn) {
  try {
    await beslenmeAktifToggle(sporcuId, durum);
    btn.style.background = durum ? '#def7ec' : '#fee2e2';
    btn.style.color = durum ? '#057a55' : '#c81e1e';
    btn.textContent = durum ? '✅ Takip Açık' : '❌ Takip Kapalı';
    bildirimGoster(durum ? '✅ Beslenme takibi açıldı' : 'Beslenme takibi kapatıldı');
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

function miktarSecildi() {
  var miktarEl = document.getElementById('miktarSec');
  var onizleEl = document.getElementById('kaloriOnizle');
  if (!miktarEl || !onizleEl) return;
  var carpan = parseFloat(miktarEl.value || 1);
  var miktarAd = miktarEl.options[miktarEl.selectedIndex]?.getAttribute('data-ad') || '';
  if (_seciliYemekAd && _seciliYemekKalori) {
    var kalori = Math.round(_seciliYemekKalori * carpan);
    onizleEl.textContent = miktarAd + ' ' + _seciliYemekAd + ' ≈ ' + kalori + ' kalori';
    onizleEl.style.color = 'var(--primary)';
  }
}

// ── TAKTİK QUİZ SİSTEMİ ──────────────────────────────────────────────────
var aktifQuiz = null;
var aktifSoruIndex = 0;
var dogruSayisi = 0;
var ytPlayer = null;
var ytHazir = false;

// YouTube iframe API yükle
function ytApiYukle() {
  if (window.YT) return;
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function() {
  ytHazir = true;
};

function youtubeIdAl(url) {
  var match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match ? match[1] : null;
}

// ── ANTRENÖR: QUİZ LİSTESİ ───────────────────────────────────────────────
async function quizListesiYukle() {
  var div = document.getElementById('antrenorLinkDiv');
  if (!div) return;

  var quizler = await quizleriGetir();
  var linkler = await linkleriGetir();
  var bugun = new Date();

  var html = '';

  // Quiz bölümü
  html += '<div class="kart"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  html += '<div class="kart-baslik" style="margin:0">🧩 Taktik Quiz</div>';
  html += '<button class="btn btn-primary" onclick="quizOlusturAc()" style="font-size:12px;padding:6px 12px">+ Quiz Ekle</button>';
  html += '</div>';
  html += '<div id="quizOlusturDiv"></div>';

  if (quizler.length === 0) {
    html += '<div style="font-size:13px;color:var(--gray-400);padding:8px 0">Henüz quiz yok.</div>';
  } else {
    quizler.forEach(function(q) {
      var soruSayisi = Array.isArray(q.sorular) ? q.sorular.length : 0;
      var thumbId = youtubeIdAl(q.youtube_url);
      html += '<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-100);align-items:center">';
      if (thumbId) {
        html += '<img src="https://img.youtube.com/vi/' + thumbId + '/mqdefault.jpg" style="width:70px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0">';
      }
      html += '<div style="flex:1"><div style="font-size:13px;font-weight:700">' + q.baslik + '</div>';
      html += '<div style="font-size:11px;color:var(--gray-400)">' + soruSayisi + ' soru</div></div>';
      html += '<div style="display:flex;gap:6px">';
      html += '<button onclick="quizIzleyenleriGoster(&quot;' + q.id + '&quot;,&quot;' + q.baslik + '&quot;)" style="background:none;border:1px solid var(--gray-200);border-radius:6px;font-size:11px;padding:3px 8px;cursor:pointer">👁 Kim İzledi</button>';
      html += '<button onclick="quizDuzenle(&quot;' + q.id + '&quot;)" style="background:none;border:1px solid var(--gray-200);border-radius:6px;font-size:11px;padding:3px 8px;cursor:pointer">Düzenle</button>';
      html += '<button onclick="quizSilBtn(&quot;' + q.id + '&quot;)" style="background:none;border:none;color:#c81e1e;cursor:pointer;font-size:18px;line-height:1">×</button>';
      html += '</div></div>';
    });
  }
  html += '</div>';

  // Video kütüphanesi
  html += '<div class="kart"><div class="kart-baslik">🎬 Videolar</div>';
  html += '<div style="margin-bottom:10px"><div class="form-grup"><label class="form-etiket">Başlık</label><input type="text" id="linkBaslik" class="form-input" placeholder="Video başlığı"></div>';
  html += '<div class="form-grup"><label class="form-etiket">URL</label><input type="text" id="linkUrl" class="form-input" placeholder="https://youtube.com/..."></div>';
  html += '<button class="btn btn-primary" onclick="linkKaydet()">Ekle</button></div>';
  if (linkler.length > 0) {
    linkler.forEach(function(l) {
      var eklenme = new Date(l.olusturma_tarihi);
      var farkGun = Math.floor((bugun - eklenme) / (1000*60*60*24));
      var thumbId = youtubeIdAl(l.url);
      html += '<div style="padding:8px 0;border-bottom:1px solid var(--gray-100)">';
      html += '<div style="display:flex;gap:10px;align-items:center">';
      if (thumbId) html += '<img src="https://img.youtube.com/vi/' + thumbId + '/mqdefault.jpg" style="width:70px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0">';
      html += '<div style="flex:1"><a href="' + l.url + '" target="_blank" style="font-size:13px;font-weight:600;color:var(--primary);text-decoration:none">' + l.baslik + '</a>';
      if (farkGun < 7) html += ' <span style="font-size:10px;background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:10px;font-weight:700">YENİ</span>';
      html += '</div>';
      html += '<button onclick="linkSilBtn(&quot;' + l.id + '&quot;)" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:20px">×</button>';
      html += '</div>';
      html += '<button onclick="linkIzleyenleriGoster(&quot;' + l.id + '&quot;,&quot;' + l.baslik + '&quot;)" style="background:none;border:none;color:var(--primary);font-size:11px;cursor:pointer;margin-top:2px;padding:0">👁 Kim izledi?</button>';
      html += '</div>';
    });
  }
  html += '</div>';

  div.innerHTML = html;
}

function quizOlusturAc() {
  var div = document.getElementById('quizOlusturDiv');
  if (!div) return;
  div.innerHTML = '<div style="background:var(--gray-50);border-radius:10px;padding:12px;margin-bottom:12px">' +
    '<div class="form-grup"><label class="form-etiket">Quiz Başlığı *</label><input type="text" id="qBaslik" class="form-input" placeholder="Savunma Taktikleri Quiz 1"></div>' +
    '<div class="form-grup"><label class="form-etiket">YouTube URL *</label><input type="text" id="qUrl" class="form-input" placeholder="https://youtube.com/watch?v=..."></div>' +
    '<div style="font-size:12px;color:var(--gray-500);margin-bottom:8px">Soruları kaydettikten sonra düzenle bölümünden ekleyebilirsin.</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn btn-primary" onclick="quizKaydet()">Kaydet</button>' +
    '<button class="btn btn-outline" onclick="document.getElementById(\'quizOlusturDiv\').innerHTML=\'\'">İptal</button>' +
    '</div></div>';
}

async function quizKaydet() {
  var baslik = document.getElementById('qBaslik')?.value?.trim();
  var url = document.getElementById('qUrl')?.value?.trim();
  if (!baslik || !url) { bildirimGoster('Başlık ve URL gerekli'); return; }
  try {
    await quizEkle({ baslik: baslik, youtube_url: url, sorular: [] });
    bildirimGoster('✅ Quiz oluşturuldu — şimdi düzenle butonuyla soru ekle');
    quizListesiYukle();
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

async function quizSilBtn(id) {
  if (!confirm('Bu quizi silmek istediğine emin misin?')) return;
  try {
    await quizSil(id);
    bildirimGoster('Silindi');
    quizListesiYukle();
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

async function quizDuzenle(id) {
  var quiz = await quizGetir(id);
  if (!quiz) return;
  var sorular = Array.isArray(quiz.sorular) ? quiz.sorular : [];
  var thumbId = youtubeIdAl(quiz.youtube_url);

  var html = '<div style="background:var(--gray-50);border-radius:10px;padding:12px;margin-bottom:12px">';
  html += '<div style="font-size:14px;font-weight:700;margin-bottom:10px">✏️ ' + quiz.baslik + '</div>';
  if (thumbId) html += '<img src="https://img.youtube.com/vi/' + thumbId + '/mqdefault.jpg" style="width:160px;border-radius:8px;margin-bottom:10px">';

  // Mevcut sorular
  if (sorular.length > 0) {
    html += '<div style="margin-bottom:12px">';
    sorular.forEach(function(s, i) {
      html += '<div style="background:white;border-radius:8px;padding:8px;margin-bottom:6px;font-size:12px">';
      html += '<div style="font-weight:700;margin-bottom:4px">⏱ ' + s.saniye + 'sn — ' + s.soru + '</div>';
      html += '<div style="color:var(--gray-500)">✅ ' + s.siklar[s.dogru] + '</div>';
      html += '<button onclick="soruSilBtn(&quot;' + id + '&quot;,' + i + ')" style="background:none;border:none;color:#c81e1e;font-size:11px;cursor:pointer;margin-top:4px">Sil</button>';
      html += '</div>';
    });
    html += '</div>';
  }

  // Yeni soru ekle
  html += '<div style="border-top:1px solid var(--gray-200);padding-top:10px;margin-top:8px">';
  html += '<div style="font-size:12px;font-weight:700;margin-bottom:8px">+ Yeni Soru Ekle</div>';
  html += '<div class="form-row">';
  html += '<div class="form-grup"><label class="form-etiket">Video saniyesi (sn)</label><input type="number" id="sSaniye" class="form-input" placeholder="45"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Hangi köşe?</label><select id="sKose" class="form-input"><option value="mavi">Mavi köşe</option><option value="kirmizi">Kırmızı köşe</option></select></div>';
  html += '</div>';
  html += '<div class="form-grup"><label class="form-etiket">Soru</label><input type="text" id="sSoru" class="form-input" placeholder="Bu pozisyonda ne yapmalı?"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Şık A</label><input type="text" id="sA" class="form-input" placeholder="Dolyo chagi at"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Şık B</label><input type="text" id="sB" class="form-input" placeholder="Geri çekil"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Şık C</label><input type="text" id="sC" class="form-input" placeholder="Savun ve karşı atak"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Şık D</label><input type="text" id="sD" class="form-input" placeholder="Pozisyon al ve bekle"></div>';
  html += '<div class="form-grup"><label class="form-etiket">Doğru cevap</label><select id="sDogru" class="form-input"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></div>';
  html += '<div class="form-grup"><label class="form-etiket">Açıklama</label><input type="text" id="sAciklama" class="form-input" placeholder="Bu pozisyonda rakip açıkta çünkü..."></div>';
  html += '<div style="display:flex;gap:8px;margin-top:8px">';
  html += '<button class="btn btn-primary" onclick="soruEkle(&quot;' + id + '&quot;)">Soru Ekle</button>';
  html += '<button class="btn btn-outline" onclick="quizListesiYukle()">Kapat</button>';
  html += '</div></div></div>';

  document.getElementById('quizOlusturDiv').innerHTML = html;
}

async function soruEkle(quizId) {
  var saniye = parseInt(document.getElementById('sSaniye')?.value);
  var kose = document.getElementById('sKose')?.value;
  var soru = document.getElementById('sSoru')?.value?.trim();
  var a = document.getElementById('sA')?.value?.trim();
  var b = document.getElementById('sB')?.value?.trim();
  var c = document.getElementById('sC')?.value?.trim();
  var d = document.getElementById('sD')?.value?.trim();
  var dogru = parseInt(document.getElementById('sDogru')?.value);
  var aciklama = document.getElementById('sAciklama')?.value?.trim();

  if (!saniye || !soru || !a || !b || !c || !d) { bildirimGoster('Tüm alanları doldur'); return; }

  var quiz = await quizGetir(quizId);
  var sorular = Array.isArray(quiz.sorular) ? quiz.sorular : [];
  sorular.push({ saniye: saniye, kose: kose, soru: soru, siklar: [a,b,c,d], dogru: dogru, aciklama: aciklama || '' });
  sorular.sort(function(x,y) { return x.saniye - y.saniye; });

  await quizGuncelle(quizId, { sorular: sorular });
  bildirimGoster('✅ Soru eklendi');
  quizDuzenle(quizId);
}

async function soruSilBtn(quizId, index) {
  var quiz = await quizGetir(quizId);
  var sorular = Array.isArray(quiz.sorular) ? quiz.sorular : [];
  sorular.splice(index, 1);
  await quizGuncelle(quizId, { sorular: sorular });
  bildirimGoster('Soru silindi');
  quizDuzenle(quizId);
}

// ── SPORCU: QUİZ OYNAMA ───────────────────────────────────────────────────
async function sporcuQuizYukle() {
  var div = document.getElementById('sporcuLinkDiv');
  if (!div) return;
  div.innerHTML = '<div class="yukleniyor"><div class="spinner"></div></div>';
  ytApiYukle();

  var [quizler, linkler, cevaplar] = await Promise.all([
    quizleriGetir(),
    linkleriGetir(),
    quizCevaplariGetir(oturumKullanici.id)
  ]);

  var html = '';

  // Quiz bölümü
  if (quizler.length > 0) {
    html += '<div class="kart"><div class="kart-baslik">🧩 Taktik Quiz</div>';
    quizler.forEach(function(q) {
      var cevap = cevaplar.find(function(c) { return c.quiz_id === q.id; });
      var soruSayisi = Array.isArray(q.sorular) ? q.sorular.length : 0;
      var thumbId = youtubeIdAl(q.youtube_url);
      html += '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">';
      html += '<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px">';
      if (thumbId) html += '<img src="https://img.youtube.com/vi/' + thumbId + '/mqdefault.jpg" style="width:70px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0">';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-size:13px;font-weight:700">' + q.baslik + '</div>';
      html += '<div style="font-size:11px;color:var(--gray-400)">' + soruSayisi + ' soru</div>';
      if (cevap && cevap.tamamlandi) {
        var oran = Math.round((cevap.dogru_sayisi / cevap.toplam_soru) * 100);
        html += '<div style="font-size:11px;color:#057a55;font-weight:600">✅ ' + cevap.dogru_sayisi + '/' + cevap.toplam_soru + ' doğru (' + oran + '%)</div>';
      }
      html += '</div></div>';
      html += '<button onclick="quizBaslat(&quot;' + q.id + '&quot;)" class="btn btn-primary" style="width:100%;font-size:13px">' + (cevap && cevap.tamamlandi ? '🔄 Tekrar Başla' : '▶ Quiz Başlat') + '</button>';
      html += '</div>';
    });
    html += '</div>';
  }

  // Video kütüphanesi
  if (linkler.length > 0) {
    html += '<div class="kart"><div class="kart-baslik">🎬 Antrenör Videoları</div>';
    var bugun = new Date();
    linkler.forEach(function(l) {
      var eklenme = new Date(l.olusturma_tarihi);
      var farkGun = Math.floor((bugun - eklenme) / (1000*60*60*24));
      var thumbId = youtubeIdAl(l.url);
      html += '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100);align-items:center">';
      if (thumbId) html += '<img src="https://img.youtube.com/vi/' + thumbId + '/mqdefault.jpg" style="width:70px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0">';
      html += '<div style="flex:1"><a href="' + l.url + '" target="_blank" onclick="linkIzlemeKaydet(&quot;' + oturumKullanici.id + '&quot;,&quot;' + l.id + '&quot;)" style="font-size:13px;font-weight:600;color:var(--primary);text-decoration:none">' + l.baslik + '</a>';
      if (farkGun < 7) html += ' <span style="font-size:10px;background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:10px;font-weight:700">YENİ</span>';
      html += '</div></div>';
    });
    html += '</div>';
  }

  if (!quizler.length && !linkler.length) {
    html = '<div class="bos-durum"><span class="ikon">🎬</span><p>Henüz içerik eklenmemiş.</p></div>';
  }

  div.innerHTML = html;
}

async function quizBaslat(quizId) {
  var quiz = await quizGetir(quizId);
  if (!quiz || !Array.isArray(quiz.sorular) || quiz.sorular.length === 0) {
    bildirimGoster('Bu quizde henüz soru yok'); return;
  }
  aktifQuiz = quiz;
  aktifSoruIndex = 0;
  dogruSayisi = 0;
  // İzleme kaydı
  videoIzlemeKaydet(oturumKullanici.id, quizId).catch(function(){});

  var videoId = youtubeIdAl(quiz.youtube_url);
  if (!videoId) { bildirimGoster('Geçersiz YouTube linki'); return; }

  var div = document.getElementById('sporcuLinkDiv');
  div.innerHTML = '<div id="quizOynatmaDiv">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
    '<div style="font-size:14px;font-weight:700">' + quiz.baslik + '</div>' +
    '<button onclick="sporcuQuizYukle()" style="background:none;border:none;color:var(--gray-400);cursor:pointer;font-size:13px">✕ Çık</button>' +
    '</div>' +
    '<div id="ytContainer" style="width:100%;position:relative;padding-bottom:56.25%;border-radius:10px;overflow:hidden;margin-bottom:10px;background:#000">' +
    '<div id="ytPlayer" style="position:absolute;top:0;left:0;width:100%;height:100%"></div>' +
    '</div>' +
    '<div id="quizSoruDiv"></div>' +
    '</div>';

  // YouTube player oluştur
  setTimeout(function() {
    if (!window.YT || !window.YT.Player) {
      // YT henüz yüklenmediyse tekrar dene
      setTimeout(function() { quizPlayerOlustur(videoId); }, 1500);
    } else {
      quizPlayerOlustur(videoId);
    }
  }, 500);
}

function quizPlayerOlustur(videoId) {
  var ilkSaniye = aktifQuiz.sorular[0] ? Math.max(0, aktifQuiz.sorular[0].saniye - 5) : 0;
  ytPlayer = new YT.Player('ytPlayer', {
    videoId: videoId,
    width: '100%',
    height: '100%',
    playerVars: { rel: 0, modestbranding: 1, start: ilkSaniye },
    events: {
      onReady: function(e) {
        e.target.playVideo();
        quizSoruKontrol();
      }
    }
  });
}

var quizInterval = null;
var quizBekliyor = false;

function quizSoruKontrol() {
  if (quizInterval) clearInterval(quizInterval);
  quizInterval = setInterval(function() {
    if (!ytPlayer || !aktifQuiz) return;
    if (aktifSoruIndex >= aktifQuiz.sorular.length) {
      clearInterval(quizInterval);
      return;
    }
    var sure = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
    var soruSaniye = aktifQuiz.sorular[aktifSoruIndex].saniye;
    if (sure >= soruSaniye && !quizBekliyor) {
      quizBekliyor = true;
      clearInterval(quizInterval);
      ytPlayer.pauseVideo();
      quizSoruGoster(aktifSoruIndex);
    }
  }, 300);
}

function quizSoruGoster(index) {
  var soru = aktifQuiz.sorular[index];
  var koseRenk = soru.kose === 'mavi' ? '#1a56db' : '#c81e1e';
  var koseAd = soru.kose === 'mavi' ? '🔵 Mavi Köşe' : '🔴 Kırmızı Köşe';
  var harfler = ['A', 'B', 'C', 'D'];

  // Mevcut popup varsa kaldır
  var eskiPopup = document.getElementById('quizPopup');
  if (eskiPopup) eskiPopup.remove();

  var popup = document.createElement('div');
  popup.id = 'quizPopup';
  popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:2147483647;display:flex;align-items:flex-end;justify-content:center;padding:0';

  var kart = document.createElement('div');
  kart.style.cssText = 'background:white;border-radius:20px 20px 0 0;padding:20px 16px;width:100%;max-height:80vh;overflow-y:auto;animation:slideUp 0.3s ease';

  var html = '<div style="width:40px;height:4px;background:var(--gray-200);border-radius:2px;margin:0 auto 14px"></div>';
  html += '<div style="font-size:11px;font-weight:700;color:' + koseRenk + ';margin-bottom:6px">' + koseAd + ' ne yapmalı?</div>';
  html += '<div style="font-size:15px;font-weight:700;color:var(--gray-800);margin-bottom:14px;line-height:1.4">' + soru.soru + '</div>';
  soru.siklar.forEach(function(sik, i) {
    html += '<button onclick="quizCevapla(' + index + ',' + i + ')" style="width:100%;text-align:left;padding:12px 14px;margin-bottom:8px;border-radius:12px;border:2px solid var(--gray-200);background:white;cursor:pointer;font-size:13px;font-weight:600;display:block">';
    html += '<span style="color:var(--primary);margin-right:8px;font-weight:800">' + harfler[i] + ')</span>' + sik;
    html += '</button>';
  });
  html += '<div style="font-size:11px;color:var(--gray-400);text-align:center;margin-top:8px">Soru ' + (index+1) + ' / ' + aktifQuiz.sorular.length + '</div>';

  kart.innerHTML = html;
  popup.appendChild(kart);
  document.body.appendChild(popup);
}

function quizCevapla(soruIndex, secim) {
  var soru = aktifQuiz.sorular[soruIndex];
  var dogru = secim === soru.dogru;
  if (dogru) dogruSayisi++;
  aktifSoruIndex++;

  var harfler = ['A', 'B', 'C', 'D'];
  var popup = document.getElementById('quizPopup');
  if (!popup) return;

  var kart = popup.querySelector('div');
  var html = '<div style="width:40px;height:4px;background:var(--gray-200);border-radius:2px;margin:0 auto 14px"></div>';
  html += '<div style="font-size:20px;font-weight:800;color:' + (dogru ? '#057a55' : '#c81e1e') + ';margin-bottom:10px;text-align:center">';
  html += dogru ? '✅ Doğru!' : '❌ Yanlış!';
  html += '</div>';
  if (!dogru) {
    html += '<div style="font-size:13px;color:var(--gray-700);margin-bottom:8px;background:#f0fdf4;padding:10px;border-radius:8px">Doğru cevap: <b>' + harfler[soru.dogru] + ') ' + soru.siklar[soru.dogru] + '</b></div>';
  }
  if (soru.aciklama) {
    html += '<div style="font-size:13px;color:var(--gray-600);background:var(--gray-50);padding:10px 12px;border-radius:8px;margin-bottom:12px;line-height:1.7">💡 ' + soru.aciklama + '</div>';
  }

  if (aktifSoruIndex >= aktifQuiz.sorular.length) {
    var oran = Math.round((dogruSayisi / aktifQuiz.sorular.length) * 100);
    html += '<div style="text-align:center;padding:10px 0">';
    html += '<div style="font-size:32px;font-weight:800;color:' + (oran >= 70 ? '#057a55' : oran >= 50 ? '#e65100' : '#c81e1e') + '">' + oran + '%</div>';
    html += '<div style="font-size:13px;color:var(--gray-600);margin:4px 0">' + dogruSayisi + ' / ' + aktifQuiz.sorular.length + ' doğru</div>';
    html += '<div style="font-size:13px;margin-bottom:16px">' + (oran >= 70 ? '🏆 Harika taktik okuma!' : oran >= 50 ? '👍 İyi gidiyorsun' : '💪 Antrenmanla gelişeceksin') + '</div>';
    html += '<button class="btn btn-primary" style="width:100%" onclick="sporcuQuizYukle()">Quizlere Dön</button>';
    html += '</div>';
    quizCevapKaydet(oturumKullanici.id, aktifQuiz.id, dogruSayisi, aktifQuiz.sorular.length).catch(function(){});
  } else {
    html += '<div style="display:flex;gap:8px;margin-top:4px">';
    html += '<button class="btn btn-outline" style="flex:1;font-size:12px" onclick="quizTekrarIzle(' + aktifSoruIndex + ')">🔄 Tekrar İzle</button>';
    html += '<button class="btn btn-primary" style="flex:1;font-size:12px" onclick="quizDevam()">▶ Devam Et</button>';
    html += '</div>';
  }

  kart.innerHTML = html;
}

function quizDevam() {
  var popup = document.getElementById('quizPopup');
  if (popup) popup.remove();
  quizBekliyor = false;
  // 1.5sn bekle sonra 3sn oynat
  setTimeout(function() {
    ytPlayer.playVideo();
    setTimeout(function() {
      ytPlayer.pauseVideo();
      var gecenSoru = aktifQuiz.sorular[aktifSoruIndex - 1];
      var tekrarBas = Math.max(0, gecenSoru.saniye - 5);
      var tekrarBit = gecenSoru.saniye + 3;
      ytPlayer.seekTo(tekrarBas, true);
      ytPlayer.playVideo();
      var tekrarInterval = setInterval(function() {
        var t = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
        if (t >= tekrarBit) {
          clearInterval(tekrarInterval);
          ytPlayer.pauseVideo();
          if (aktifSoruIndex < aktifQuiz.sorular.length) {
            var sonrakiBas = Math.max(0, aktifQuiz.sorular[aktifSoruIndex].saniye - 5);
            ytPlayer.seekTo(sonrakiBas, true);
            setTimeout(function() {
              ytPlayer.playVideo();
              quizSoruKontrol();
            }, 500);
          }
        }
      }, 300);
    }, 3000);
  }, 1500);
}

function quizTekrarIzle(soruIndex) {
  var popup = document.getElementById('quizPopup');
  if (popup) popup.remove();
  quizBekliyor = false;
  var gecenSoru = aktifQuiz.sorular[soruIndex - 1];
  var tekrarBas = Math.max(0, gecenSoru.saniye - 5);
  var tekrarBit = gecenSoru.saniye + 3;
  ytPlayer.seekTo(tekrarBas, true);
  ytPlayer.playVideo();
  var tekrarInterval = setInterval(function() {
    var t = ytPlayer.getCurrentTime ? ytPlayer.getCurrentTime() : 0;
    if (t >= tekrarBit) {
      clearInterval(tekrarInterval);
      ytPlayer.pauseVideo();
      if (aktifSoruIndex < aktifQuiz.sorular.length) {
        var sonrakiBas = Math.max(0, aktifQuiz.sorular[aktifSoruIndex].saniye - 5);
        ytPlayer.seekTo(sonrakiBas, true);
        setTimeout(function() {
          ytPlayer.playVideo();
          quizSoruKontrol();
        }, 500);
      }
    }
  }, 300);
}

async function quizIzleyenleriGoster(quizId, baslik) {
  try {
    var izleyenler = await quizIzleyenleriGetir(quizId);
    var cevaplar = await sbFetch('quiz_cevaplar?quiz_id=eq.' + quizId + '&select=sporcu_id,dogru_sayisi,toplam_soru') || [];

    var popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';

    var kart = document.createElement('div');
    kart.style.cssText = 'background:white;border-radius:16px;padding:20px;width:100%;max-width:400px;max-height:80vh;overflow-y:auto';

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">';
    html += '<div style="font-size:14px;font-weight:700">👁 ' + baslik + '</div>';
    html += '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray-400)">×</button>';
    html += '</div>';

    if (!izleyenler || izleyenler.length === 0) {
      html += '<div style="text-align:center;color:var(--gray-400);padding:20px">Henüz kimse izlemedi</div>';
    } else {
      // Tekil sporcu listesi
      var sporcuMap = {};
      izleyenler.forEach(function(i) {
        var ad = i.sporcular ? i.sporcular.ad_soyad : i.sporcu_id;
        if (!sporcuMap[i.sporcu_id]) {
          sporcuMap[i.sporcu_id] = { ad: ad, sayac: 0, son: i.izleme_tarihi };
        }
        sporcuMap[i.sporcu_id].sayac++;
      });

      Object.keys(sporcuMap).forEach(function(sid) {
        var s = sporcuMap[sid];
        var cevap = cevaplar.find(function(c) { return c.sporcu_id === sid; });
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--gray-100)">';
        html += '<div>';
        html += '<div style="font-size:13px;font-weight:600">' + s.ad + '</div>';
        html += '<div style="font-size:11px;color:var(--gray-400)">' + s.sayac + ' kez izledi · ' + tarihFormatla(s.son) + '</div>';
        html += '</div>';
        if (cevap) {
          var oran = Math.round((cevap.dogru_sayisi / cevap.toplam_soru) * 100);
          var renk = oran >= 70 ? '#057a55' : oran >= 50 ? '#e65100' : '#c81e1e';
          html += '<div style="font-size:12px;font-weight:700;color:' + renk + '">' + cevap.dogru_sayisi + '/' + cevap.toplam_soru + ' (' + oran + '%)</div>';
        } else {
          html += '<div style="font-size:11px;color:var(--gray-400)">Quiz yapmadı</div>';
        }
        html += '</div>';
      });
    }

    kart.innerHTML = html;
    popup.appendChild(kart);
    document.body.appendChild(popup);
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

async function linkIzleyenleriGoster(linkId, baslik) {
  try {
    var izleyenler = await linkIzleyenleriGetir(linkId);
    var popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    var kart = document.createElement('div');
    kart.style.cssText = 'background:white;border-radius:16px;padding:20px;width:100%;max-width:400px;max-height:80vh;overflow-y:auto';

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">';
    html += '<div style="font-size:14px;font-weight:700">👁 ' + baslik + '</div>';
    html += '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray-400)">×</button>';
    html += '</div>';

    if (!izleyenler || izleyenler.length === 0) {
      html += '<div style="text-align:center;color:var(--gray-400);padding:20px">Henüz kimse izlemedi</div>';
    } else {
      var sporcuMap = {};
      izleyenler.forEach(function(i) {
        var ad = i.sporcular ? i.sporcular.ad_soyad : i.sporcu_id;
        if (!sporcuMap[i.sporcu_id]) {
          sporcuMap[i.sporcu_id] = { ad: ad, sayac: 0, son: i.izleme_tarihi };
        }
        sporcuMap[i.sporcu_id].sayac++;
      });

      Object.keys(sporcuMap).forEach(function(sid) {
        var s = sporcuMap[sid];
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--gray-100)">';
        html += '<div><div style="font-size:13px;font-weight:600">' + s.ad + '</div>';
        html += '<div style="font-size:11px;color:var(--gray-400)">' + tarihFormatla(s.son) + '</div></div>';
        html += '<div style="font-size:12px;color:var(--gray-500)">' + s.sayac + ' kez izledi</div>';
        html += '</div>';
      });
    }

    kart.innerHTML = html;
    popup.appendChild(kart);
    document.body.appendChild(popup);
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}

// ── OKUMA TAKİBİ GÖRÜNTÜLEME ──────────────────────────────────────────────
async function sporcuOkumalariniGoster(sporcuId, sporcuAd) {
  try {
    var okumalar = await sporcuOkumalariniGetir(sporcuId);

    var popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    var kart = document.createElement('div');
    kart.style.cssText = 'background:white;border-radius:16px;padding:20px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto';

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">';
    html += '<div style="font-size:14px;font-weight:700">📖 ' + sporcuAd + ' — Okuma Takibi</div>';
    html += '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray-400)">×</button>';
    html += '</div>';

    if (!okumalar || okumalar.length === 0) {
      html += '<div style="text-align:center;color:var(--gray-400);padding:20px">Henüz hiçbir içerik okunmadı</div>';
    } else {
      // Bölüm bazında grupla
      var bolumMap = {};
      okumalar.forEach(function(o) {
        var key = o.bolum + '|||' + o.baslik;
        if (!bolumMap[key]) bolumMap[key] = { bolum: o.bolum, baslik: o.baslik, sayac: 0, son: o.okuma_tarihi };
        bolumMap[key].sayac++;
      });

      // Ana bölümler önce
      var sirali = Object.values(bolumMap).sort(function(a,b) {
        return new Date(b.son) - new Date(a.son);
      });

      sirali.forEach(function(bilgi) {
        var renk = bilgi.sayac >= 5 ? '#057a55' : bilgi.sayac >= 2 ? '#e65100' : '#6b7280';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--gray-100)">';
        html += '<div><div style="font-size:12px;font-weight:600">' + bilgi.baslik + '</div>';
        html += '<div style="font-size:10px;color:var(--gray-400)">Son: ' + tarihFormatla(bilgi.son) + '</div></div>';
        html += '<div style="font-size:15px;font-weight:800;color:' + renk + '">' + bilgi.sayac + 'x</div>';
        html += '</div>';
      });
    }

    kart.innerHTML = html;
    popup.appendChild(kart);
    document.body.appendChild(popup);
  } catch(e) { bildirimGoster('Hata: ' + e.message); }
}
