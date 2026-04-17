// app.js — Tekhan Sporcu Sistemi

let aktifRol = 'antrenor';
let oturumKullanici = null;
let aktifSporcuId = null;
let tumSporcular = [];
let aktifAnketCevaplari = {};
let grafikInstances = {};

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
}

async function sporcularYukle() {
  yukleniyor('sporcuListesiDiv');
  try {
    tumSporcular = await sporcuListesi();
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
        <div class="sporcu-meta">${yas} yaş · ${s.cinsiyet || '—'} · ${s.dan_kusak || '—'}</div>
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
      <div class="profil-meta">${s.kulup_okul || ''}</div>
    </div>
    <button style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;border-radius:8px;padding:8px 12px;color:white;font-size:13px;cursor:pointer" onclick="sporcuDuzModalAc('${s.id}')">Düzenle</button>
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
    { etiket: 'Kulüp / Okul', deger: s.kulup_okul || '—' },
    { etiket: 'Kullanıcı Adı', deger: s.kullanici_adi }
  ];
  const izinDurum = s.anket_izin;
  document.getElementById('profilBilgilerDiv').innerHTML = `
  <div class="kart">
    ${bilgiler.map(b => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-100)">
      <span style="color:var(--gray-500);font-size:13px">${b.etiket}</span>
      <span style="font-size:13px;font-weight:600">${b.deger || '—'}</span>
    </div>`).join('')}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">
      <div>
        <div style="font-size:13px;font-weight:600">🧠 Anket İzni</div>
        <div style="font-size:11px;color:var(--gray-500)">Sporcu psikoloji anketi doldurabilsin mi?</div>
      </div>
      <button onclick="anketIzniToggle('${s.id}', ${izinDurum})"
        style="padding:8px 16px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;background:${izinDurum ? '#def7ec' : '#fde8e8'};color:${izinDurum ? '#057a55' : '#c81e1e'}">
        ${izinDurum ? '✅ Açık' : '🔒 Kapalı'}
      </button>
    </div>
  </div>`;
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
    <div class="kart-baslik">📊 Son Test — ${tarihFormatla(enSon.test_tarihi)}
      ${enSon.sonraki_test_tarihi ? `<span style="font-size:11px;color:var(--gray-500);font-weight:400;margin-left:8px">Sonraki: ${tarihFormatla(enSon.sonraki_test_tarihi)}</span>` : ''}
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
      return `<div class="test-satir">
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
      </div>`;
    }).join('')}
    ${enSon.notlar ? `<div style="margin-top:10px;padding:8px;background:var(--gray-50);border-radius:8px;font-size:12px;color:var(--gray-500)">📝 ${enSon.notlar}</div>` : ''}
  </div>`;

  if (testler.length > 1) {
    html += '<div class="kart"><div class="kart-baslik">📋 Test Geçmişi</div>';
    testler.slice(1).forEach(function(t) {
      const ustunlar = alanlar.filter(k => { const r = testDurumu(k, t[k], yas, cin); return r.renk === 'green'; });
      const zayiflar = alanlar.filter(k => { const r = testDurumu(k, t[k], yas, cin); return r.renk === 'red'; });
      html += '<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">';
      html += '<div style="font-size:12px;font-weight:700;color:var(--gray-500);margin-bottom:6px">' + tarihFormatla(t.test_tarihi) + '</div>';
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
  function psikoListeSatir(ad, val, durum, renk, max, ters) {
    if (!val) return '';
    const barRenk = renk === 'green' ? '#057a55' : renk === 'orange' ? '#e65100' : '#c81e1e';
    const normVal = max;
    const yuzde = ters ? Math.max(0, Math.min(100, (1 - val/max)*100)) : Math.min(100, (val/max)*100);
    return '<div class="test-satir">' +
      '<div style="flex:1">' +
        '<div style="font-size:13px;font-weight:500">' + ad + '</div>' +
        '<div class="ilerleme-kap" style="margin:3px 0"><div class="ilerleme-bar" style="width:' + yuzde + '%;background:' + barRenk + '"></div></div>' +
      '</div>' +
      '<div style="text-align:right;flex-shrink:0;min-width:90px">' +
        '<div style="font-size:15px;font-weight:700">' + (val.toFixed ? val.toFixed(1) : val) + '</div>' +
        '<span class="badge badge-' + (renk === 'green' ? 'green' : renk === 'orange' ? 'orange' : 'red') + '">' + durum + '</span>' +
      '</div>' +
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
    html += '<div class="kart"><div class="kart-baslik">👤 Sporcu Öz-Bildirimi — ' + tarihFormatla(anketler[0].anket_tarihi) + '</div>';
    boyutlar.forEach(function(b) {
      const val = p[b.k];
      if (!val) return;
      const { durum, renk } = psikolojiBoyutDurumu(b.k, val);
      html += psikoListeSatir(b.ad, val, durum, renk, b.max, b.ters);
    });
    html += '</div>';
    if (anketler.length > 1) {
      html += `<div class="kart"><div class="kart-baslik">📋 Sporcu Anket Geçmişi</div>
        ${anketler.slice(1).map(a => `<div class="gecmis-item"><span class="gecmis-tarih">${tarihFormatla(a.anket_tarihi)}</span><span class="gecmis-icerik">Anket dolduruldu</span></div>`).join('')}
      </div>`;
    }
  } else {
    html += '<div class="kart"><div class="kart-baslik">👤 Sporcu Öz-Bildirimi</div><div class="bos-durum" style="padding:20px 0"><span class="ikon" style="font-size:32px">📋</span><p>Sporcu henüz anket doldurmamış</p></div></div>';
  }

  // ANTRENÖR GÖZLEM FORMU SONUÇLARI
  if (antPsiko && antPsiko.length > 0) {
    const g = antPsiko[0];
    const ag = antrenorPsikolojiPuanlari(g);
    const gozlemBoyutlar = [
      { k: 'kaygiGozlem',  ad: '😰 Kaygı Gözlemi', ters: true, max: 4 },
      { k: 'gorevYonAnt',  ad: '🎯 Görev Yönelimi', ters: false, max: 5 },
      { k: 'egoYonAnt',    ad: '🏆 Ego Yönelimi', ters: true, max: 5 },
      { k: 'kontrolAnt',   ad: '🧘 Mental Kontrol', ters: false, max: 5 },
      { k: 'baglilikAnt',  ad: '🔗 Bağlılık', ters: false, max: 5 },
      { k: 'meyдanAnt',    ad: '⚡ Meydan Okuma', ters: false, max: 5 },
      { k: 'guvenAnt',     ad: '🛡 Güven', ters: false, max: 5 },
      { k: 'dikkatAnt',    ad: '👁 Güçlü Dikkat', ters: false, max: 5 },
      { k: 'dikkatBozAnt', ad: '⚠️ Dikkat Bozukluğu', ters: true, max: 5 }
    ];
    html += '<div class="kart"><div class="kart-baslik">🏆 Antrenör Gözlemi — ' + tarihFormatla(g.gozlem_tarihi) + '</div>';
    gozlemBoyutlar.forEach(function(b) {
      const val = ag[b.k];
      if (!val) return;
      const iyi = b.ters ? val <= (b.max * 0.4) : val >= (b.max * 0.7);
      const orta = b.ters ? val <= (b.max * 0.6) : val >= (b.max * 0.5);
      const renk = iyi ? 'green' : orta ? 'orange' : 'red';
      const durum = iyi ? '✅ İyi' : orta ? '⚠️ Orta' : '🔴 Gelişim';
      html += psikoListeSatir(b.ad, val, durum, renk, b.max, b.ters);
    });
    if (g.antrenor_notu) html += '<div style="margin-top:10px;padding:8px;background:var(--gray-50);border-radius:8px;font-size:12px;color:var(--gray-700)">📝 ' + g.antrenor_notu + '</div>';
    html += '</div>';
    if (antPsiko.length > 1) {
      html += `<div class="kart"><div class="kart-baslik">📋 Antrenör Gözlem Geçmişi</div>
        ${antPsiko.slice(1).map(g2 => `<div class="gecmis-item"><span class="gecmis-tarih">${tarihFormatla(g2.gozlem_tarihi)}</span><span class="gecmis-icerik">Gözlem formu dolduruldu</span></div>`).join('')}
      </div>`;
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
      <div class="form-row">
        <div class="form-grup">
          <label class="form-etiket">Gözlem Tarihi *</label>
          <input type="date" id="gozlemTarih" class="form-input">
        </div>
        <div class="form-grup">
          <label class="form-etiket">Yaklaşan Yarış</label>
          <input type="text" id="gozlemYaris" class="form-input" placeholder="Opsiyonel">
        </div>
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
    yaklasan_yaris: document.getElementById('gozlemYaris')?.value?.trim() || null,
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
      html += `<div class="kart"><div class="kart-baslik">💊 Motorik Antrenman Reçetesi</div>
      ${zayiflar.map(alan => {
        const { durum } = testDurumu(alan, test[alan], yas, cin);
        return `<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;font-weight:600">${TEST_ETIKETLERI[alan].ad}</span>
            <span class="badge badge-${durum.includes('🔴') ? 'red' : 'orange'}">${durum}</span>
          </div>
          <div style="font-size:12px;color:var(--gray-500)">${motorikReceteGetir(alan)}</div>
        </div>`;
      }).join('')}</div>`;
    } else {
      html += '<div class="kart"><div class="kart-baslik">💊 Motorik Reçete</div><div style="color:#057a55;padding:12px 0">✅ Tüm testler norm düzeyinde veya üzerinde!</div></div>';
    }
  }

  if (anketler && anketler.length > 0) {
    const p = psikolojiPuanlari(anketler[0]);
    const gelisimler = Object.keys(p || {}).filter(k => {
      const { renk } = psikolojiBoyutDurumu(k, p[k]);
      return renk === 'red' || renk === 'orange';
    });
    if (gelisimler.length > 0) {
      html += `<div class="kart"><div class="kart-baslik">🧠 Psikolojik Reçete</div>
      ${gelisimler.map(k => {
        const { durum } = psikolojiBoyutDurumu(k, p[k]);
        return `<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;font-weight:600">${psikolojiAlanAdi(k)}</span>
            <span class="badge badge-${durum.includes('🔴') ? 'red' : 'orange'}">${durum}</span>
          </div>
          <div style="font-size:12px;color:var(--gray-500)">${psikolojiReceteGetir(k)}</div>
        </div>`;
      }).join('')}</div>`;
    }
  }

  if (!html) html = '<div class="bos-durum"><span class="ikon">💊</span><p>Reçete için test ve anket verileri gerekli</p></div>';
  document.getElementById('profilReceteDiv').innerHTML = html;
}

function motorikReceteGetir(alan) {
  const r = {
    uzun_atlama_cm: 'Box Jump 3x8, Squat Jump 3x10, Lunge Jump 3x8. Haftada 3 kez.',
    saglik_topu_cm: 'Med-Ball Fırlatma 3x8, Plyometrik Push-Up 3x10. Haftada 3 kez.',
    mekik_tekrar: 'Plank 3x30sn, Russian Twist 3x20, Mekik 3x25. Her gün.',
    sprint_30m_sn: 'Uçuş Sprintleri 6-10x20-30m, Merdiven Drill 4x. Tam dinlenme.',
    illinois_sn: 'Illinois x5, T-Drill 5x, 505 Çeviklik 6x. Haftada 3 kez.',
    flamingo_hata: 'Tek ayak denge 3x30sn, BOSU Squat, gözler kapalı denge. Haftada 4 kez.',
    otur_uzan_cm: 'PNF Esneme 3x30sn, Bacak sallamaları, dinamik esneme. Her gün.',
    beep_test_seviye: 'Tempo koşu 20-40dk, Interval koşu 1:1. %65-80 maks. KAH.',
    cember_koord_sn: 'Çember atlama 4-6 set, koordinasyon merdiveni. Haftada 3 kez.',
    cetvel_reaksiyon_cm: 'Cetvel düşürme 5x5, renk komutu sprint 8x. Haftada 3 kez.',
    el_dinamometre_kg: 'Hand Grip 3x30sn, Wrist Curls 3x15, Dead Hang 3x. Haftada 3 kez.',
    wingate_wkg: 'Tabata Squat Jump, 30m All-Out Sprint x6. Tam dinlenme.'
  };
  return r[alan] || 'Antrenman planına eklenecek.';
}

function psikolojiAlanAdi(k) {
  const a = { bilisselKaygi:'Bilişsel Kaygı', somatikKaygi:'Somatik Kaygı', ozguven:'Özgüven', gorevYon:'Görev Yönelimi', egoYon:'Ego Yönelimi', kontrol:'Mental Kontrol', baglilik:'Bağlılık', meydan:'Meydan Okuma', guven:'Güven', genisDissal:'Geniş Dikkat', darDissal:'Dar Dikkat', dikkatHatasi:'Dikkat Hatası' };
  return a[k] || k;
}

function psikolojiReceteGetir(k) {
  const r = {
    bilisselKaygi: 'Bilişsel yeniden yapılandırma: "DUR" komutu + olumlu iç ses. Günlük 5dk Düşünce Günlüğü.',
    somatikKaygi: 'Kutu Nefesi (4-4-4-4) + Progresif Kas Gevşemesi. Isınma öncesi 3dk, uyku öncesi 10dk.',
    ozguven: 'Başarı Envanteri: 3 güçlü an yaz. Her antrenman sonu "bugün iyi yaptığım 1 şey" sorusu.',
    egoYon: 'Süreç Hedefleme: "Ben vs Geçen Hafta Ben". Geri bildirimi süreç odaklı yap.',
    kontrol: 'Duygu düzenleme: 10sn reset (nefes→odak→devam). Mindfulness 5dk/gün.',
    baglilik: 'Uzun vadeli hedef planı. Zor seansları tamamlamayı ödüllendir.',
    meydan: 'Kademeli zorluk artışı. "Ne öğrendim?" sorusu. Büyüme Anı günlüğü.',
    guven: 'Yeterlilik geçmişi gözden geçirme. Zor anlarda destekleyici iç ses.',
    genisDissal: 'Çoklu uyarıcı takip drilleri. Saha okuma egzersizleri. Haftada 2x.',
    darDissal: 'Odak nokta belirli drilleri. Pre-performance rutini oluştur.',
    dikkatHatasi: 'Odak Kelimesi antrenmanı. Park Et & Git tekniği. Günlük 5dk dikkat meditasyonu.'
  };
  return r[k] || 'Antrenör ile birlikte çalışılacak.';
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
  ['sAd','sKullaniciAdi','sSifre','sDogum','sBoy','sKilo','sDan','sKulup'].forEach(id => {
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
  document.getElementById('sKulup').value = sporcu.kulup_okul || '';
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
    kulup_okul: document.getElementById('sKulup').value.trim() || null
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
  document.getElementById('tSonrakiTarih').value = '';
  ['t_uzun_atlama','t_saglik_topu','t_mekik','t_sprint','t_illinois',
   't_flamingo','t_otur_uzan','t_beep','t_cetvel','t_dolyo',
   't_fskt_1','t_fskt_2','t_fskt_3','t_fskt_4','t_fskt_5','t_dck60','t_notlar']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  hataGizle('testModalHata');
  modalAc('testModal');
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
    sonraki_test_tarihi: document.getElementById('tSonrakiTarih').value || null,
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
    ...hesaplaFSKT(),
    notlar: document.getElementById('t_notlar').value.trim() || null
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
  document.getElementById('sporcuProfilDiv').innerHTML = `
  <div class="profil-header" style="margin:-16px -16px 16px">
    <div class="profil-avatar-buyuk">${basTaHarfler(s.ad_soyad)}</div>
    <div>
      <div class="profil-isim">${s.ad_soyad}</div>
      <div class="profil-meta">${yas} yaş · ${s.cinsiyet || '—'}</div>
      <div class="profil-meta">${s.dan_kusak || ''}</div>
    </div>
  </div>
  <div class="istat-grid">
    <div class="istat-kart"><div class="istat-sayi">${yas}</div><div class="istat-etiket">Yaş</div></div>
    <div class="istat-kart"><div class="istat-sayi">${s.boy_cm || '—'}</div><div class="istat-etiket">Boy (cm)</div></div>
    <div class="istat-kart"><div class="istat-sayi">${s.kilo_kg || '—'}</div><div class="istat-etiket">Kilo (kg)</div></div>
    <div class="istat-kart"><div class="istat-sayi" style="font-size:18px">${s.dan_kusak || '—'}</div><div class="istat-etiket">Kuşak</div></div>
  </div>`;
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
      return `<div class="test-satir">
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
      </div>`;
    }).join('')}
  </div>`;
}

function sporcuTabSec(tab, btn) {
  document.querySelectorAll('#sporcuEkrani .tab-btn').forEach(b => b.classList.remove('aktif'));
  if (btn) btn.classList.add('aktif');
  ['profil','anketim','sonuclarim'].forEach(t => {
    document.getElementById(`stab-${t}`).style.display = t === tab ? 'block' : 'none';
  });
  if (tab === 'anketim') anketIzinKontrol();
  if (tab === 'sonuclarim') sporcuSonuclariniYukle();
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
  let html = '<div style="margin-bottom:16px"><div class="form-row">';
  html += '<div class="form-grup"><label class="form-etiket">Yaklaşan yarış</label>';
  html += '<input type="text" id="anketYaris" class="form-input" placeholder="Bölge Şampiyonası..."></div>';
  html += '<div class="form-grup"><label class="form-etiket">Kaç gün kaldı?</label>';
  html += '<input type="number" id="anketGun" class="form-input" placeholder="7"></div>';
  html += '</div></div>';

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
  var yaris = document.getElementById('anketYaris').value.trim();
  var gun = parseInt(document.getElementById('anketGun').value);
  var not = document.getElementById('anketNot').value.trim();
  var veri = Object.assign({
    sporcu_id: oturumKullanici.id,
    anket_tarihi: new Date().toISOString().split('T')[0],
    yaklasan_yaris: yaris || null,
    yarisa_gun: gun || null,
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
        html += '<div class="test-satir">';
        html += '<span style="font-size:11px;color:var(--gray-500);width:18px;flex-shrink:0">' + (i+1) + '</span>';
        html += '<div style="flex:1"><div style="font-size:13px;font-weight:500">' + et.ad + '</div>';
        html += '<div class="ilerleme-kap" style="margin:3px 0"><div class="ilerleme-bar" style="width:' + Math.min(r.oran||80,100) + '%;background:' + barRenk + '"></div></div>';
        html += '<div style="font-size:10px;color:var(--gray-500)">Norm: ' + r.norm + ' ' + et.birim + ' · Fark: <b style="color:' + barRenk + '">' + farkStr + '</b></div></div>';
        html += '<div style="text-align:right;flex-shrink:0;min-width:80px">';
        html += '<div style="font-size:14px;font-weight:700">' + val + ' <span style="font-size:10px;color:var(--gray-500)">' + et.birim + '</span></div>';
        html += '<span class="badge badge-' + (r.renk === 'green' ? 'green' : r.renk === 'yellow' ? 'yellow' : r.renk === 'orange' ? 'orange' : 'red') + '">' + r.durum + '</span>';
        html += '</div></div>';
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

      html += '<div class="kart"><div class="kart-baslik">🧠 Psikolojik Profilim — ' + tarihFormatla(anketler[0].anket_tarihi) + '</div>';
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
        var yuzde = b.ters ? Math.max(0, Math.min(100, (1 - finalVal/b.max)*100)) : Math.min(100, (finalVal/b.max)*100);
        html += '<div class="test-satir">';
        html += '<div style="flex:1">';
        html += '<div style="font-size:13px;font-weight:500">' + b.ad + '</div>';
        html += '<div class="ilerleme-kap" style="margin:3px 0"><div class="ilerleme-bar" style="width:' + yuzde + '%;background:' + barRenk + '"></div></div>';
        html += '<div style="font-size:10px;color:var(--gray-500)">' + kaynak + '</div>';
        html += '</div>';
        html += '<div style="text-align:right;flex-shrink:0;min-width:90px">';
        html += '<div style="font-size:14px;font-weight:700">' + (finalVal.toFixed ? finalVal.toFixed(1) : finalVal) + '</div>';
        html += '<span class="badge badge-' + (r.renk === 'green' ? 'green' : r.renk === 'orange' ? 'orange' : 'red') + '">' + r.durum + '</span>';
        html += '</div></div>';
      });
      html += '</div>';
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
