// app.js — Tekhan Sporcu Sistemi | Uygulama Mantığı

// ── STATE ──────────────────────────────────────────────────────────────────
let aktifRol = 'antrenor';
let oturumKullanici = null;
let aktifSporcuId = null;
let tumSporcular = [];
let aktifAnketCevaplari = {};
let grafikInstances = {};

// ── BAŞLANGIÇ ──────────────────────────────────────────────────────────────
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

// ── YARDIMCI ──────────────────────────────────────────────────────────────
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

function modalAc(id) {
  document.getElementById(id).classList.add('aktif');
}

function modalKapat(id) {
  document.getElementById(id).classList.remove('aktif');
}

function hataGoster(elId, mesaj) {
  const el = document.getElementById(elId);
  el.textContent = mesaj;
  el.style.display = 'block';
}

function hataGizle(elId) {
  document.getElementById(elId).style.display = 'none';
}

function yukleniyor(elId, goster = true) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = goster ? '<div class="yukleniyor"><div class="spinner"></div> Yükleniyor...</div>' : '';
}

function tarihFormatla(tarih) {
  if (!tarih) return '—';
  const d = new Date(tarih);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function basTaHarfler(isim) {
  if (!isim) return '?';
  return isim.split(' ').map(k => k[0]).join('').substring(0, 2).toUpperCase();
}

function geriGit(ekranId) {
  ekranGoster(ekranId);
  if (ekranId === 'antrenorEkrani') {
    sporcularYukle();
  }
}

// ── GİRİŞ ──────────────────────────────────────────────────────────────────
function rolSec(rol) {
  aktifRol = rol;
  document.querySelectorAll('.rol-btn').forEach(b => b.classList.remove('aktif'));
  event.target.classList.add('aktif');
  hataGizle('loginHata');
}

async function girisYap() {
  const kullaniciAdi = document.getElementById('loginKullanici').value.trim();
  const sifre = document.getElementById('loginSifre').value;
  hataGizle('loginHata');

  if (!kullaniciAdi || !sifre) {
    hataGoster('loginHata', 'Kullanıcı adı ve şifre gerekli');
    return;
  }

  try {
    let kullanici;
    if (aktifRol === 'antrenor') {
      kullanici = await antrenorGiris(kullaniciAdi, sifre);
    } else {
      kullanici = await sporcuGiris(kullaniciAdi, sifre);
    }
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

// ── ANTRENÖR PANELİ ────────────────────────────────────────────────────────
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
    grafikSporcuSecenekleriDoldur();
  } catch (e) {
    document.getElementById('sporcuListesiDiv').innerHTML = `<div class="bos-durum"><span class="ikon">⚠️</span><p>${e.message}</p></div>`;
  }
}

function sporcuFiltrele() {
  const q = (document.getElementById('sporcuArama').value || '').toLowerCase();
  const filtreli = q ? tumSporcular.filter(s => s.ad_soyad.toLowerCase().includes(q)) : tumSporcular;
  renderSporcuListesi(filtreli);
}

function renderSporcuListesi(liste) {
  const div = document.getElementById('sporcuListesiDiv');
  if (!liste || liste.length === 0) {
    div.innerHTML = '<div class="bos-durum"><span class="ikon">👥</span><p>Henüz sporcu yok</p></div>';
    return;
  }
  div.innerHTML = liste.map(s => {
    const yas = yasHesapla(s.dogum_tarihi);
    return `
    <div class="sporcu-kart" onclick="sporcuProfilAc('${s.id}')">
      <div class="sporcu-avatar">${basTaHarfler(s.ad_soyad)}</div>
      <div class="sporcu-info">
        <div class="sporcu-isim">${s.ad_soyad}</div>
        <div class="sporcu-meta">${yas} yaş · ${s.cinsiyet || '—'} · ${s.dan_kusak || 'Kuşak yok'}</div>
      </div>
      <div class="sporcu-ok">›</div>
    </div>`;
  }).join('');
}

// ── TAB KONTROLÜ ──────────────────────────────────────────────────────────
function tabSec(tab) {
  document.querySelectorAll('#antrenorEkrani .tab-btn').forEach(b => b.classList.remove('aktif'));
  event.target.classList.add('aktif');
  document.getElementById('tab-sporcular').style.display = 'none';
  document.getElementById('tab-testler').style.display = 'none';
  document.getElementById('tab-anketler').style.display = 'none';
  document.getElementById('tab-grafikler').style.display = 'none';
  document.getElementById(`tab-${tab}`).style.display = 'block';
  document.getElementById('fabBtn').style.display = tab === 'sporcular' ? 'flex' : 'none';

  if (tab === 'testler') testlerYukle();
  if (tab === 'anketler') anketlerYukle();
  if (tab === 'grafikler') grafikSporcuSecenekleriDoldur();
}

// ── TÜM TEST SONUÇLARI ────────────────────────────────────────────────────
async function testlerYukle() {
  yukleniyor('tumTestlerDiv');
  try {
    const testler = await tumMotorikTestler();
    if (!testler || testler.length === 0) {
      document.getElementById('tumTestlerDiv').innerHTML = '<div class="bos-durum"><span class="ikon">📊</span><p>Henüz test sonucu yok</p></div>';
      return;
    }
    const html = testler.map(t => {
      const sporcu = t.sporcular || {};
      return `
      <div class="kart" onclick="sporcuProfilAc('${t.sporcu_id}')">
        <div class="kart-baslik">👤 ${sporcu.ad_soyad || '?'} <span style="font-weight:400;color:var(--gray-500);font-size:12px">${tarihFormatla(t.test_tarihi)}</span></div>
        ${renderTestOzet(t, sporcu)}
      </div>`;
    }).join('');
    document.getElementById('tumTestlerDiv').innerHTML = html;
  } catch (e) {
    document.getElementById('tumTestlerDiv').innerHTML = `<p style="color:red">${e.message}</p>`;
  }
}

function renderTestOzet(test, sporcu) {
  const yas = yasHesapla(sporcu.dogum_tarihi);
  const cin = sporcu.cinsiyet || 'Erkek';
  const alanlar = Object.keys(TEST_ETIKETLERI);
  return `<div>${alanlar.map(alan => {
    const val = test[alan];
    if (val === null || val === undefined) return '';
    const { durum } = testDurumu(alan, val, yas, cin);
    const et = TEST_ETIKETLERI[alan];
    return `<div class="test-satir">
      <span class="test-ad">${et.ad}</span>
      <span class="test-deger">${val} <span class="test-birim">${et.birim}</span></span>
      <span class="test-durum">${durum}</span>
    </div>`;
  }).join('')}</div>`;
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
    const html = anketler.map(a => {
      const puanlar = psikolojiPuanlari(a);
      const sporcu = a.sporcular || {};
      return `
      <div class="kart" onclick="sporcuProfilAc('${a.sporcu_id}')">
        <div class="kart-baslik">👤 ${sporcu.ad_soyad || '?'} <span style="font-weight:400;color:var(--gray-500);font-size:12px">${tarihFormatla(a.anket_tarihi)}</span></div>
        ${renderPsikolojOzet(puanlar)}
      </div>`;
    }).join('');
    document.getElementById('tumAnketlerDiv').innerHTML = html;
  } catch (e) {
    document.getElementById('tumAnketlerDiv').innerHTML = `<p style="color:red">${e.message}</p>`;
  }
}

function renderPsikolojOzet(p) {
  if (!p) return '<p style="color:var(--gray-500);font-size:13px">Veri yok</p>';
  const alanlar = [
    { k: 'bilisselKaygi', ad: 'Bilişsel Kaygı', max: 36, ters: true },
    { k: 'ozguven', ad: 'Özgüven', max: 36, ters: false },
    { k: 'gorevYon', ad: 'Görev Yönelimi', max: 5, ters: false },
    { k: 'kontrol', ad: 'Mental Kontrol', max: 5, ters: false }
  ];
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${alanlar.map(a => {
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
      motorikTestleriGetir(id),
      anketleriGetir(id),
      sporcuGetir(id)
    ]);
    renderGrafikler(testler, anketler, sporcu);
  } catch (e) {
    document.getElementById('grafiklerDiv').innerHTML = `<p style="color:red">${e.message}</p>`;
  }
}

function renderGrafikler(testler, anketler, sporcu) {
  // Mevcut grafikleri temizle
  Object.values(grafikInstances).forEach(c => c.destroy());
  grafikInstances = {};

  if (!testler || testler.length === 0) {
    document.getElementById('grafiklerDiv').innerHTML = '<div class="bos-durum"><span class="ikon">📈</span><p>Test verisi yok</p></div>';
    return;
  }

  const sirali = [...testler].reverse();
  const etiketler = sirali.map(t => tarihFormatla(t.test_tarihi));

  let html = '<div id="motorikGrafikKap" class="kart"><div class="kart-baslik">📊 Motorik Gelişim</div>';
  const motorikAlanlar = ['uzun_atlama_cm', 'sprint_30m_sn', 'beep_test_seviye', 'otur_uzan_cm'];
  motorikAlanlar.forEach((alan, i) => {
    html += `<canvas id="chart_${alan}" height="180" style="margin-bottom:16px"></canvas>`;
  });
  html += '</div>';

  if (anketler && anketler.length > 0) {
    html += '<div class="kart"><div class="kart-baslik">🧠 Psikolojik Profil (Son Anket)</div><canvas id="chart_psiko" height="280"></canvas></div>';
  }

  document.getElementById('grafiklerDiv').innerHTML = html;

  const renkler = ['#1a56db','#e65100','#057a55','#7e22ce'];
  motorikAlanlar.forEach((alan, i) => {
    const canvas = document.getElementById(`chart_${alan}`);
    if (!canvas) return;
    const veri = sirali.map(t => t[alan] ?? null);
    grafikInstances[alan] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: etiketler,
        datasets: [{
          label: TEST_ETIKETLERI[alan]?.ad || alan,
          data: veri,
          borderColor: renkler[i],
          backgroundColor: renkler[i] + '20',
          tension: 0.3,
          fill: true,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true, position: 'top' } },
        scales: { y: { beginAtZero: false } }
      }
    });
  });

  // Psikoloji radar grafiği (son anket)
  if (anketler && anketler.length > 0) {
    const p = psikolojiPuanlari(anketler[0]);
    const canvas = document.getElementById('chart_psiko');
    if (canvas && p) {
      const normalize = (val, max, ters) => ters ? ((max - val) / max) * 5 : (val / max) * 5;
      grafikInstances['psiko'] = new Chart(canvas, {
        type: 'radar',
        data: {
          labels: ['Özgüven', 'Görev Yon.', 'Mental Kontrol', 'Bağlılık', 'Meydan Ok.', 'Konsantrasyon'],
          datasets: [{
            label: 'Profil',
            data: [
              normalize(p.ozguven, 36, false),
              p.gorevYon,
              p.kontrol,
              p.baglilik,
              p.meydan,
              p.genisDissal
            ],
            borderColor: '#1a56db',
            backgroundColor: 'rgba(26,86,219,0.15)',
            pointBackgroundColor: '#1a56db'
          }]
        },
        options: {
          responsive: true,
          scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } }
        }
      });
    }
  }
}

// ── SPORCU PROFİL (ANT. GÖRÜNÜM) ──────────────────────────────────────────
async function sporcuProfilAc(id) {
  aktifSporcuId = id;
  ekranGoster('sporcuProfilEkrani');
  yukleniyor('profilBilgilerDiv');
  yukleniyor('profilTestlerDiv');
  yukleniyor('profilPsikolojiDiv');

  try {
    const [sporcu, testler, anketler] = await Promise.all([
      sporcuGetir(id),
      motorikTestleriGetir(id),
      anketleriGetir(id)
    ]);

    document.getElementById('profilBaslik').textContent = sporcu.ad_soyad;
    renderProfilHeader(sporcu);
    renderProfilBilgiler(sporcu);
    renderProfilTestler(testler, sporcu);
    renderProfilPsikoloji(anketler);
    renderRecete(testler, anketler, sporcu);

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
      <div class="profil-meta" style="margin-top:4px">${s.kulup_okul || ''}</div>
    </div>
    <button style="margin-left:auto;background:rgba(255,255,255,0.15);border:none;border-radius:8px;padding:8px 12px;color:white;font-size:13px;cursor:pointer" onclick="sporcuDuzModalAc('${s.id}')">Düzenle</button>
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
    { etiket: 'E-posta', deger: s.email }
  ];
  document.getElementById('profilBilgilerDiv').innerHTML = `
  <div class="kart">
    ${bilgiler.map(b => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-100)">
      <span style="color:var(--gray-500);font-size:13px">${b.etiket}</span>
      <span style="font-size:13px;font-weight:600">${b.deger}</span>
    </div>`).join('')}
  </div>`;
}

function renderProfilTestler(testler, sporcu) {
  if (!testler || testler.length === 0) {
    document.getElementById('profilTestlerDiv').innerHTML = `
    <div class="bos-durum"><span class="ikon">📊</span><p>Henüz test sonucu yok</p></div>
    <button class="btn btn-primary" onclick="testEkleModalAc()">+ Test Ekle</button>`;
    return;
  }
  const enSon = testler[0];
  const yas = yasHesapla(sporcu.dogum_tarihi);
  const cin = sporcu.cinsiyet || 'Erkek';
  const alanlar = Object.keys(TEST_ETIKETLERI);

  let html = `
  <button class="btn btn-outline" style="margin-bottom:12px" onclick="testEkleModalAc()">+ Yeni Test Ekle</button>
  <div class="kart">
    <div class="kart-baslik">📊 Son Test — ${tarihFormatla(enSon.test_tarihi)}</div>
    ${alanlar.map((alan, i) => {
      const val = enSon[alan];
      if (val === null || val === undefined) return '';
      const et = TEST_ETIKETLERI[alan];
      const { durum, renk, norm } = testDurumu(alan, val, yas, cin);
      return `<div class="test-satir">
        <span class="test-no">${i+1}</span>
        <div class="test-ad">
          <div style="font-size:13px">${et.ad}</div>
          <div style="font-size:11px;color:var(--gray-500)">Norm: ${norm} ${et.birim}</div>
        </div>
        <div style="text-align:right">
          <div class="test-deger">${val} <span class="test-birim">${et.birim}</span></div>
          <div class="test-durum">${durum}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  if (testler.length > 1) {
    html += `<div class="kart"><div class="kart-baslik">📋 Test Geçmişi</div>
    ${testler.slice(1).map(t => `
    <div class="gecmis-item">
      <span class="gecmis-tarih">${tarihFormatla(t.test_tarihi)}</span>
      <span class="gecmis-icerik">
        ${Object.keys(TEST_ETIKETLERI).filter(k => t[k] != null).map(k => `${TEST_ETIKETLERI[k].ad}: ${t[k]}`).slice(0,3).join(' · ')}
      </span>
    </div>`).join('')}
    </div>`;
  }
  document.getElementById('profilTestlerDiv').innerHTML = html;
}

function renderProfilPsikoloji(anketler) {
  if (!anketler || anketler.length === 0) {
    document.getElementById('profilPsikolojiDiv').innerHTML = '<div class="bos-durum"><span class="ikon">🧠</span><p>Henüz anket doldurulmamış</p></div>';
    return;
  }
  const p = psikolojiPuanlari(anketler[0]);
  const boyutlar = [
    { k: 'bilisselKaygi', ad: '😰 Bilişsel Kaygı', tip: 'kaygi' },
    { k: 'somatikKaygi',  ad: '💓 Somatik Kaygı',  tip: 'kaygi' },
    { k: 'ozguven',       ad: '💪 Özgüven',         tip: 'ozguven' },
    { k: 'gorevYon',      ad: '🎯 Görev Yönelimi',  tip: 'motivasyon' },
    { k: 'egoYon',        ad: '🏆 Ego Yönelimi',    tip: 'motivasyon' },
    { k: 'kontrol',       ad: '🧘 Mental Kontrol',  tip: 'mental' },
    { k: 'baglilik',      ad: '🔗 Bağlılık',         tip: 'mental' },
    { k: 'meydan',        ad: '⚡ Meydan Okuma',    tip: 'mental' },
    { k: 'guven',         ad: '🛡 Güven',            tip: 'mental' },
    { k: 'genisDissal',   ad: '👁 Geniş Dikkat',    tip: 'konsant' },
    { k: 'darDissal',     ad: '🎯 Dar Dikkat',       tip: 'konsant' },
    { k: 'dikkatHatasi',  ad: '⚠️ Dikkat Hatası',   tip: 'konsant' }
  ];

  const html = `
  <div class="kart">
    <div class="kart-baslik">🧠 Psikolojik Profil — ${tarihFormatla(anketler[0].anket_tarihi)}</div>
    <div class="psiko-ozet-grid">
      ${boyutlar.map(b => {
        const val = p[b.k];
        if (!val) return '';
        const { durum, renk } = psikolojiBoyutDurumu(b.k, val);
        const renk2 = renk === 'green' ? 'success' : renk === 'orange' ? 'warning' : 'danger';
        return `<div class="psiko-alan-kart">
          <div class="psiko-alan-baslik">${b.ad}</div>
          <div class="psiko-alan-puan" style="color:var(--${renk2})">${val.toFixed ? val.toFixed(1) : val}</div>
          <div class="psiko-alan-durum">${durum}</div>
        </div>`;
      }).join('')}
    </div>
  </div>
  ${anketler.length > 1 ? `<div class="kart"><div class="kart-baslik">📋 Anket Geçmişi</div>
    ${anketler.slice(1).map(a => `<div class="gecmis-item"><span class="gecmis-tarih">${tarihFormatla(a.anket_tarihi)}</span><span class="gecmis-icerik">Anket dolduruldu</span></div>`).join('')}
  </div>` : ''}`;
  document.getElementById('profilPsikolojiDiv').innerHTML = html;
}

function renderRecete(testler, anketler, sporcu) {
  const yas = yasHesapla(sporcu?.dogum_tarihi);
  const cin = sporcu?.cinsiyet || 'Erkek';
  let html = '';

  // Motorik reçete
  if (testler && testler.length > 0) {
    const test = testler[0];
    const zayifAlanlar = Object.keys(TEST_ETIKETLERI).filter(alan => {
      const val = test[alan];
      if (!val) return false;
      const { renk } = testDurumu(alan, val, yas, cin);
      return renk === 'red' || renk === 'orange';
    });

    if (zayifAlanlar.length > 0) {
      html += `<div class="kart"><div class="kart-baslik">💊 Motorik Antrenman Reçetesi</div>
      ${zayifAlanlar.map(alan => {
        const { durum } = testDurumu(alan, test[alan], yas, cin);
        const et = TEST_ETIKETLERI[alan];
        return `<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;font-weight:600">${et.ad}</span>
            <span class="badge badge-${durum.includes('🔴') ? 'red' : 'orange'}">${durum}</span>
          </div>
          <div style="font-size:12px;color:var(--gray-500)">${reçeteMetniGetir(alan)}</div>
        </div>`;
      }).join('')}
      </div>`;
    } else {
      html += '<div class="kart"><div class="kart-baslik">💊 Motorik Reçete</div><div style="color:var(--success);padding:12px 0;font-size:14px">✅ Tüm testler norm düzeyinde veya üzerinde!</div></div>';
    }
  }

  // Psikolojik reçete
  if (anketler && anketler.length > 0) {
    const p = psikolojiPuanlari(anketler[0]);
    const gelisimAlanlari = Object.keys(p || {}).filter(k => {
      const { renk } = psikolojiBoyutDurumu(k, p[k]);
      return renk === 'red' || renk === 'orange';
    });

    if (gelisimAlanlari.length > 0) {
      html += `<div class="kart"><div class="kart-baslik">🧠 Psikolojik Reçete</div>
      ${gelisimAlanlari.map(k => {
        const { durum } = psikolojiBoyutDurumu(k, p[k]);
        return `<div style="padding:10px 0;border-bottom:1px solid var(--gray-100)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;font-weight:600">${psikolojiAlanAdi(k)}</span>
            <span class="badge badge-${durum.includes('🔴') ? 'red' : 'orange'}">${durum}</span>
          </div>
          <div style="font-size:12px;color:var(--gray-500)">${psikolojiReceteGetir(k)}</div>
        </div>`;
      }).join('')}
      </div>`;
    }
  }

  if (!html) html = '<div class="bos-durum"><span class="ikon">💊</span><p>Reçete için önce test ve anket verileri gerekli</p></div>';
  document.getElementById('profilReceteDiv').innerHTML = html;
}

function reçeteMetniGetir(alan) {
  const receteler = {
    uzun_atlama_cm: 'Box Jump 3x8, Squat Jump 3x10, Lunge Jump 3x8. Haftada 3 kez.',
    saglik_topu_cm: 'Med-Ball Fırlatma 3x8, Plyometrik Push-Up 3x10. Haftada 3 kez.',
    mekik_tekrar: 'Plank 3x30sn, Russian Twist 3x20, Mekik 3x25. Her gün.',
    sprint_30m_sn: 'Uçuş Sprintleri 6-10x20-30m, Merdiven Drill 4x. Tam dinlenme ile.',
    illinois_sn: 'Illinois x5, T-Drill 5x, 505 Çeviklik 6x. Haftada 3 kez.',
    flamingo_hata: 'Tek ayak denge 3x30sn, BOSU Squat, gözler kapalı denge. Haftada 4 kez.',
    otur_uzan_cm: 'PNF Esneme 3x30sn, Bacak sallamaları, dinamik esneme. Her gün.',
    beep_test_seviye: 'Tempo koşu 20-40dk, Interval koşu 1:1. %65-80 maks. KAH.',
    cember_koord_sn: 'Çember atlama 4-6x set, koordinasyon merdiveni. Haftada 3 kez.',
    cetvel_reaksiyon_cm: 'Cetvel düşürme 5x5, renk komutu sprint 8x. Haftada 3 kez.',
    el_dinamometre_kg: 'Hand Grip 3x30sn, Wrist Curls 3x15, Dead Hang 3x. Haftada 3 kez.',
    wingate_wkg: 'Tabata Squat Jump, 30m All-Out Sprint x6. Tam dinlenme ile.'
  };
  return receteler[alan] || 'Antrenman planına eklenecek.';
}

function psikolojiAlanAdi(k) {
  const adlar = { bilisselKaygi: 'Bilişsel Kaygı', somatikKaygi: 'Somatik Kaygı', ozguven: 'Özgüven', gorevYon: 'Görev Yönelimi', egoYon: 'Ego Yönelimi', kontrol: 'Mental Kontrol', baglilik: 'Bağlılık', meydan: 'Meydan Okuma', guven: 'Güven', genisDissal: 'Geniş Dikkat', darDissal: 'Dar Dikkat', dikkatHatasi: 'Dikkat Hatası' };
  return adlar[k] || k;
}

function psikolojiReceteGetir(k) {
  const receteler = {
    bilisselKaygi: 'Bilişsel yeniden yapılandırma: "DUR" komutu + olumlu iç ses antrenmanı. Günlük 5dk Düşünce Günlüğü.',
    somatikKaygi: 'Kutu Nefesi (4-4-4-4) + Progresif Kas Gevşemesi. Isınma öncesi 3dk, uyku öncesi 10dk.',
    ozguven: 'Başarı Envanteri: 3 güçlü an yaz. Her antrenman sonu "bugün iyi yaptığım 1 şey" sorusu.',
    egoYon: 'Süreç Hedefleme: "Ben vs Geçen Hafta Ben" karşılaştırması. Antrenör geri bildirimini süreç odaklı yap.',
    kontrol: 'Duygu düzenleme: 10sn reset protokolü (nefes→odak→devam). Mindfulness 5dk/gün.',
    baglilik: 'Uzun vadeli hedef planı + anlam çalışması. Zor seansları tamamlamayı ödüllendir.',
    meydan: 'Kademeli zorluk artışı. "Başarısız olduğumda ne öğrendim?" sorusu. Büyüme Anı günlüğü.',
    guven: 'Yeterlilik geçmişi gözden geçirme. Kendilik etkinliği çalışması. Zor anlarda destekleyici iç ses.',
    genisDissal: 'Çoklu uyarıcı takip drilleri. Saha okuma egzersizleri. Haftada 2x.',
    darDissal: 'Odak nokta belirli drilleri. Pre-performance rutini oluştur.',
    dikkatHatasi: 'Odak Kelimesi antrenmanı. Park Et & Git tekniği. Günlük 5dk dikkat meditasyonu.'
  };
  return receteler[k] || 'Antrenör ile birlikte çalışılacak.';
}

function profilTabSec(tab) {
  document.querySelectorAll('#sporcuProfilEkrani .tab-btn').forEach(b => b.classList.remove('aktif'));
  event.target.classList.add('aktif');
  ['bilgiler','testler','psikoloji','recete'].forEach(t => {
    document.getElementById(`ptab-${t}`).style.display = t === tab ? 'block' : 'none';
  });
}

// ── SPORCU EKLE / DÜZENLE ─────────────────────────────────────────────────
function sporcuEklePanelAc() {
  document.getElementById('sporcuModalBaslik').textContent = 'Sporcu Ekle';
  document.getElementById('sporcuDuzId').value = '';
  ['sAd','sKullaniciAdi','sSifre','sDogum','sCinsiyet','sBoy','sKilo','sDan','sKulup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.tagName === 'SELECT' ? '' : '';
  });
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
  document.getElementById('sEmail').value = sporcu.email || '';
  document.getElementById('sSifre').value = sporcu.sifre_hash || '';
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

// ── TEST EKLE MODALİ ──────────────────────────────────────────────────────
function testEkleModalAc() {
  document.getElementById('testSporcuId').value = aktifSporcuId || '';
  document.getElementById('testDuzId').value = '';
  document.getElementById('tTarih').value = new Date().toISOString().split('T')[0];
  document.getElementById('tSonrakiTarih').value = '';
  ['t_uzun_atlama','t_saglik_topu','t_mekik','t_sprint','t_illinois',
   't_flamingo','t_otur_uzan','t_beep','t_cember','t_cetvel','t_el_dina','t_wingate','t_notlar']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  hataGizle('testModalHata');
  modalAc('testModal');
}

async function testKaydet() {
  const sporcuId = document.getElementById('testSporcuId').value;
  if (!sporcuId) { hataGoster('testModalHata', 'Sporcu ID eksik'); return; }
  const tarih = document.getElementById('tTarih').value;
  if (!tarih) { hataGoster('testModalHata', 'Test tarihi gerekli'); return; }

  const veri = {
    sporcu_id: sporcuId,
    test_tarihi: tarih,
    sonraki_test_tarihi: document.getElementById('tSonrakiTarih').value || null,
    uzun_atlama_cm: parseFloat(document.getElementById('t_uzun_atlama').value) || null,
    saglik_topu_cm: parseFloat(document.getElementById('t_saglik_topu').value) || null,
    mekik_tekrar: parseInt(document.getElementById('t_mekik').value) || null,
    sprint_30m_sn: parseFloat(document.getElementById('t_sprint').value) || null,
    illinois_sn: parseFloat(document.getElementById('t_illinois').value) || null,
    flamingo_hata: parseInt(document.getElementById('t_flamingo').value) || null,
    otur_uzan_cm: parseFloat(document.getElementById('t_otur_uzan').value) || null,
    beep_test_seviye: parseFloat(document.getElementById('t_beep').value) || null,
    cember_koord_sn: parseFloat(document.getElementById('t_cember').value) || null,
    cetvel_reaksiyon_cm: parseFloat(document.getElementById('t_cetvel').value) || null,
    el_dinamometre_kg: parseFloat(document.getElementById('t_el_dina').value) || null,
    wingate_wkg: parseFloat(document.getElementById('t_wingate').value) || null,
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
  const s = oturumKullanici;
  try {
    const testler = await motorikTestleriGetir(s.id);
    renderSporcuTestler(testler, s);
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
    <div class="kart-baslik">📊 Son Test Sonuçlarınız — ${tarihFormatla(enSon.test_tarihi)}</div>
    ${Object.keys(TEST_ETIKETLERI).map((alan, i) => {
      const val = enSon[alan];
      if (val === null || val === undefined) return '';
      const et = TEST_ETIKETLERI[alan];
      const { durum, norm, oran } = testDurumu(alan, val, yas, cin);
      const renk = durum.includes('🟢') ? '#057a55' : durum.includes('🟡') ? '#b45309' : durum.includes('🟠') ? '#e65100' : '#c81e1e';
      const yuzde = Math.min(oran || 80, 120);
      return `<div class="test-satir">
        <span class="test-no">${i+1}</span>
        <div class="test-ad">
          <div style="font-size:13px">${et.ad}</div>
          <div class="ilerleme-kap" style="margin-top:4px">
            <div class="ilerleme-bar" style="width:${Math.min(yuzde,100)}%;background:${renk}"></div>
          </div>
        </div>
        <div style="text-align:right">
          <div class="test-deger">${val} <span class="test-birim">${et.birim}</span></div>
          <div style="font-size:11px;color:var(--gray-500)">Norm: ${norm}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function sporcuTabSec(tab) {
  document.querySelectorAll('#sporcuEkrani .tab-btn').forEach(b => b.classList.remove('aktif'));
  event.target.classList.add('aktif');
  ['profil','testlerim','anketim','sonuclarim'].forEach(t => {
    document.getElementById(`stab-${t}`).style.display = t === tab ? 'block' : 'none';
  });
  if (tab === 'anketim') anketFormuHazirla();
  if (tab === 'sonuclarim') sporcuSonuclariniYukle();
}

// ── ANKET FORMU (SPORCU) ──────────────────────────────────────────────────
const ANKET_BOLUMLER = [
  {
    id: 'kaygi_sporcu',
    renk: '#1a56db',
    baslik: '🔵 Rekabet Kaygısı',
    aciklama: 'Yarış öncesi nasıl hissettiğini işaretle. Doğru/yanlış cevap yok.',
    alt: [
      { id: 'biliskel', baslik: 'Bilişsel Kaygı (Olumsuz Düşünceler)', sorular: [
        { k: 'bk1', metin: 'Yarışmada başarısız olacağım diye endişeleniyorum.' },
        { k: 'bk2', metin: 'Rakibimin benden daha iyi performans göstereceğinden korkuyorum.' },
        { k: 'bk3', metin: 'Hedeflerime ulaşıp ulaşamayacağımdan emin değilim.' },
        { k: 'bk4', metin: 'Daha önce yaptığım hataları aklımdan çıkaramıyorum.' },
        { k: 'bk5', metin: 'Yanlış bir hamle yaparsam ne olacağını düşünüyorum.' },
        { k: 'bk6', metin: 'Antrenörümün veya ailelerimin hayal kırıklığına uğrayacağından endişeleniyorum.' },
        { k: 'bk7', metin: 'Yarışma sırasında odaklanıp odaklanamayacağımı merak ediyorum.' },
        { k: 'bk8', metin: 'Bugün kötü bir günüm olmasından korkuyorum.' },
        { k: 'bk9', metin: 'Bu yarışmada kendimden beklenenin altında kalacağım diye düşünüyorum.' }
      ], scale: 4, labels: ['Hiç Değil', 'Biraz', 'Orta', 'Çok Fazla'] },
      { id: 'somatik', baslik: 'Somatik Kaygı (Bedensel Belirtiler)', sorular: [
        { k: 'sk1', metin: 'Vücudum gergin ve kaslarım sıkışmış hissediyorum.' },
        { k: 'sk2', metin: 'Kalbim normalden hızlı çarpıyor.' },
        { k: 'sk3', metin: 'Midem bulanıyor veya karın ağrısı hissediyorum.' },
        { k: 'sk4', metin: 'Ellerim titriyor veya terliyor.' },
        { k: 'sk5', metin: 'Ağzım kuruyor, yutkunmakta güçlük çekiyorum.' },
        { k: 'sk6', metin: 'Nefes almakta zorluk çektiğimi hissediyorum.' },
        { k: 'sk7', metin: 'Bacaklarım yorgun veya ağır hissediyor.' },
        { k: 'sk8', metin: 'Baş ağrım var ya da başım dönüyor.' },
        { k: 'sk9', metin: 'Yarışmadan önce çok sık tuvalete çıkma ihtiyacı duyuyorum.' }
      ], scale: 4, labels: ['Hiç Değil', 'Biraz', 'Orta', 'Çok Fazla'] },
      { id: 'ozguven', baslik: 'Spor Özgüveni', sorular: [
        { k: 'og1', metin: 'Bu yarışmada iyi bir performans göstereceğimden eminim.' },
        { k: 'og2', metin: 'Antrenmanlarda öğrendiklerimi sahaya yansıtabileceğime inanıyorum.' },
        { k: 'og3', metin: 'Baskı altında doğru kararlar verebileceğimi düşünüyorum.' },
        { k: 'og4', metin: 'Fiziksel olarak yarışmaya hazır olduğumu hissediyorum.' },
        { k: 'og5', metin: 'Rakibimle başa çıkabileceğime inanıyorum.' },
        { k: 'og6', metin: 'Zor bir durumda bile odağımı koruyabilirim.' },
        { k: 'og7', metin: 'Kendime olan güvenim yüksek.' },
        { k: 'og8', metin: 'Bu yarışmada başarılı olma kapasiteme inanıyorum.' },
        { k: 'og9', metin: 'Antrenörümün ve takım arkadaşlarımın güvenine layık olduğumu hissediyorum.' }
      ], scale: 4, labels: ['Hiç Değil', 'Biraz', 'Orta', 'Çok Fazla'] }
    ]
  },
  {
    id: 'motivasyon',
    renk: '#7e22ce',
    baslik: '🟣 Motivasyon Yönelimi',
    aciklama: '"Sporda en çok başarılı hissederim..." cümlesini tamamla.',
    alt: [
      { id: 'gorev', baslik: 'Görev Yönelimi (Kişisel Gelişim)', sorular: [
        { k: 'g1', metin: '...yeni bir beceriyi öğrendiğimde ve bu benim çok çalışmamı gerektirdiğinde.' },
        { k: 'g2', metin: '...kendim için belirlediğim bir hedefi gerçekleştirdiğimde.' },
        { k: 'g3', metin: '...antrenmanlarımda normalden daha iyi yaptığımda.' },
        { k: 'g4', metin: '...zor bir beceriyi çok çalışarak öğrendiğimde.' },
        { k: 'g5', metin: '...işlerin doğru yapılmasını öğrendiğimde.' },
        { k: 'g6', metin: '...diğer insanlar yapamasa da ben başardığımda.' },
        { k: 'g7', metin: '...elimden gelenin en iyisini yaptığımı hissettiğimde.' }
      ], scale: 5, labels: ['Hiç', 'Katılmıyorum', 'Kararsız', 'Katılıyorum', 'Kesinlikle'] },
      { id: 'ego', baslik: 'Ego Yönelimi (Sosyal Karşılaştırma)', sorular: [
        { k: 'e1', metin: '...diğerlerinden daha iyi olduğumu gösterdiğimde.' },
        { k: 'e2', metin: '...çok çalışmadan başkalarından daha iyi performans gösterdiğimde.' },
        { k: 'e3', metin: '...takımdaki en iyisi olduğumda.' },
        { k: 'e4', metin: '...başkalarının yapamadığını ben yapabildiğimde.' },
        { k: 'e5', metin: '...sınıftaki veya takımdaki en iyisi olduğumda.' },
        { k: 'e6', metin: '...diğerlerini yendiğimde.' }
      ], scale: 5, labels: ['Hiç', 'Katılmıyorum', 'Kararsız', 'Katılıyorum', 'Kesinlikle'] }
    ]
  },
  {
    id: 'mental',
    renk: '#057a55',
    baslik: '🟢 Mental Dayanıklılık',
    aciklama: 'Spordaki deneyimlerini düşünerek yanıtla.',
    alt: [
      { id: 'kontrol', baslik: 'Kontrol (Duygu Yönetimi)', sorular: [
        { k: 'kon1', metin: 'Zor anlarda duygularımı kontrol edebiliyorum.' },
        { k: 'kon2', metin: 'Ne olursa olsun kendi kendimi sakinleştirebilirim.' },
        { k: 'kon3', metin: 'Antrenman ve yarışın gidişatı üzerinde etkili olabileceğimi hissediyorum.' }
      ], scale: 5, labels: ['Hiç Değil', 'Nadiren', 'Bazen', 'Sıklıkla', 'Her Zaman'] },
      { id: 'baglilik', baslik: 'Bağlılık (Kararlılık)', sorular: [
        { k: 'bag1', metin: 'Zorlu bir antrenman seansında bırakmak istemesem de devam ederim.' },
        { k: 'bag2', metin: 'Hedeflerim doğrultusunda kendimi antrenmanlarıma adarım.' },
        { k: 'bag3', metin: 'Yorgun veya isteksiz olsam bile antrenmanları atlamamaya çalışırım.' }
      ], scale: 5, labels: ['Hiç Değil', 'Nadiren', 'Bazen', 'Sıklıkla', 'Her Zaman'] },
      { id: 'meydan', baslik: 'Meydan Okuma (Zorlukları Fırsat Görme)', sorular: [
        { k: 'mey1', metin: 'Yarışmalar ve zorluklar beni büyütür, korkutmaz.' },
        { k: 'mey2', metin: 'Yeni ve zor durumları heyecanla karşılarım.' },
        { k: 'mey3', metin: 'Başarısız olduğumda bunu bir öğrenme fırsatı olarak görürüm.' }
      ], scale: 5, labels: ['Hiç Değil', 'Nadiren', 'Bazen', 'Sıklıkla', 'Her Zaman'] },
      { id: 'guven', baslik: 'Güven (Kişisel Yeterlilik)', sorular: [
        { k: 'guv1', metin: 'Başkalarının baskısına rağmen kendi kararlarımda güvenle dururum.' },
        { k: 'guv2', metin: 'Geçmişte yaptığım hatalar şu anki performansımı etkilemiyor.' },
        { k: 'guv3', metin: 'Zor anlarda bile başarabileceğime inanıyorum.' }
      ], scale: 5, labels: ['Hiç Değil', 'Nadiren', 'Bazen', 'Sıklıkla', 'Her Zaman'] }
    ]
  },
  {
    id: 'konsantrasyon',
    renk: '#e65100',
    baslik: '🟠 Konsantrasyon & Dikkat',
    aciklama: 'Spordaki dikkat alışkanlıklarını dürüstçe işaretle.',
    alt: [
      { id: 'genisDissal', baslik: 'Geniş-Dışsal Dikkat (Ortamı Okuma)', sorular: [
        { k: 'gd1', metin: 'Yarışma esnasında sahadaki birden fazla rakibi veya durumu aynı anda takip edebiliyorum.' },
        { k: 'gd2', metin: 'Hakem, seyirci ve ortam değişikliklerini çabuk fark ediyorum.' },
        { k: 'gd3', metin: 'Rakibimin vücut dilini ve stratejisini yarış içinde okuyabiliyorum.' },
        { k: 'gd4', metin: 'Sahada olup biteni geniş bir perspektifle görmeyi seviyorum.' }
      ], scale: 5, labels: ['Hiç Değil', 'Nadiren', 'Bazen', 'Sıklıkla', 'Her Zaman'] },
      { id: 'darDissal', baslik: 'Dar-Dışsal Dikkat (Hedefe Odaklanma)', sorular: [
        { k: 'dd1', metin: 'Rakibimle karşı karşıya geldiğimde tüm dikkatimi ona verebiliyorum.' },
        { k: 'dd2', metin: 'Kritik anlarda tek bir hedefe odaklanmakta zorlanmıyorum.' },
        { k: 'dd3', metin: 'Belirli bir tekmeyi veya hareketi gerçekleştirirken odağım dağılmıyor.' },
        { k: 'dd4', metin: 'Önemli anlarda gereksiz şeyleri zihnimden kolayca uzaklaştırabilirim.' }
      ], scale: 5, labels: ['Hiç Değil', 'Nadiren', 'Bazen', 'Sıklıkla', 'Her Zaman'] },
      { id: 'dikkatHatasi', baslik: '⚠️ Dikkat Hatası Eğilimleri (Düşük puan iyi)', sorular: [
        { k: 'dh1', metin: 'Yarışma sırasında aklım dağılıyor ve dikkatim başka şeylere gidiyor.' },
        { k: 'dh2', metin: 'Öfke veya hayal kırıklığı sonrası odağımı tekrar toplamakta güçlük çekiyorum.' },
        { k: 'dh3', metin: 'Seyirci, gürültü veya yorgunluk dikkatimi önemli ölçüde bozuyor.' },
        { k: 'dh4', metin: 'Bir hata yaptığımda o hatayı düşünmeye devam ederek sonraki hamlemi etkiliyorum.' }
      ], scale: 5, labels: ['Hiç Değil', 'Nadiren', 'Bazen', 'Sıklıkla', 'Her Zaman'] }
    ]
  }
];

function anketFormuHazirla() {
  aktifAnketCevaplari = {};
  const div = document.getElementById('sporcuAnketDiv');
  let html = `
  <div style="margin-bottom:16px">
    <div class="form-row">
      <div class="form-grup">
        <label class="form-etiket">Yaklaşan yarış/etkinlik</label>
        <input type="text" id="anketYaris" class="form-input" placeholder="Bölge Şampiyonası...">
      </div>
      <div class="form-grup">
        <label class="form-etiket">Kaç gün kaldı?</label>
        <input type="number" id="anketGun" class="form-input" placeholder="7">
      </div>
    </div>
  </div>`;

  ANKET_BOLUMLER.forEach(bolum => {
    html += `<div class="anket-alan">
    <div class="anket-alan-baslik" onclick="anketBolumToggle(this)" style="border-left:4px solid ${bolum.renk}">
      <span style="flex:1">${bolum.baslik}</span>
      <span>▼</span>
    </div>
    <div class="anket-alan-icerik">
      <p style="font-size:12px;color:var(--gray-500);margin-bottom:14px">${bolum.aciklama}</p>
      ${bolum.alt.map(alt => `
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;color:var(--gray-700);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--gray-200)">${alt.baslik}</div>
        ${alt.sorular.map(soru => `
        <div class="soru" id="soru_${soru.k}">
          <div class="soru-metin">${soru.metin}</div>
          <div class="likert-secenekler">
            ${Array.from({length: alt.scale}, (_, i) => i+1).map(n => `
              <button type="button" class="likert-btn" data-key="${soru.k}" data-val="${n}" onclick="likertSec(this)">${n}</button>
            `).join('')}
          </div>
          <div class="likert-etiketler">
            <span>${alt.labels[0]}</span>
            <span>${alt.labels[alt.labels.length-1]}</span>
          </div>
        </div>`).join('')}
      </div>`).join('')}
    </div>
    </div>`;
  });

  html += `
  <div style="margin-top:16px">
    <div class="form-grup">
      <label class="form-etiket">Notun var mı?</label>
      <textarea id="anketNot" class="form-input" rows="3" placeholder="Bu anketi doldururken aklından geçenler..."></textarea>
    </div>
    <div id="anketHata" class="hata-mesaji"></div>
    <button class="btn btn-primary" onclick="anketGonder()">✅ Anketi Gönder</button>
  </div>`;

  div.innerHTML = html;
}

function anketBolumToggle(el) {
  const icerik = el.nextElementSibling;
  const ok = el.querySelector('span:last-child');
  if (icerik.style.display === 'none') {
    icerik.style.display = 'block';
    ok.textContent = '▼';
  } else {
    icerik.style.display = 'none';
    ok.textContent = '▶';
  }
}

function likertSec(btn) {
  const key = btn.dataset.key;
  const val = parseInt(btn.dataset.val);
  aktifAnketCevaplari[key] = val;
  const soru = document.getElementById(`soru_${key}`);
  if (soru) soru.querySelectorAll('.likert-btn').forEach(b => b.classList.toggle('secili', parseInt(b.dataset.val) === val));
}

async function anketGonder() {
  // Zorunlu soru sayısını kontrol et
  const tumSorular = ANKET_BOLUMLER.flatMap(b => b.alt.flatMap(a => a.sorular.map(s => s.k)));
  const eksikler = tumSorular.filter(k => !aktifAnketCevaplari[k]);
  if (eksikler.length > 10) {
    hataGoster('anketHata', `Lütfen tüm soruları yanıtla (${eksikler.length} soru eksik)`);
    return;
  }

  const veri = {
    sporcu_id: oturumKullanici.id,
    anket_tarihi: new Date().toISOString().split('T')[0],
    yaklasan_yaris: document.getElementById('anketYaris').value.trim() || null,
    yarisa_gun: parseInt(document.getElementById('anketGun').value) || null,
    sporcu_notu: document.getElementById('anketNot').value.trim() || null,
    ...aktifAnketCevaplari
  };

  try {
    await anketEkle(veri);
    const p = psikolojiPuanlari(veri);
    document.getElementById('sporcuAnketDiv').innerHTML = `
    <div class="tamamlandi-ekrani">
      <span class="tamamlandi-ikon">🎉</span>
      <div class="tamamlandi-baslik">Anket Tamamlandı!</div>
      <div class="tamamlandi-metin">Yanıtların kaydedildi. Antrenörün sonuçlarını inceleyecek.</div>
      ${p ? renderPsikolojOzetKucuk(p) : ''}
    </div>`;
  } catch (e) {
    hataGoster('anketHata', e.message || 'Gönderme hatası');
  }
}

function renderPsikolojOzetKucuk(p) {
  const items = [
    { k: 'bilisselKaygi', ad: 'Bilişsel Kaygı', val: p.bilisselKaygi?.toFixed(0) },
    { k: 'ozguven', ad: 'Özgüven', val: p.ozguven?.toFixed(0) },
    { k: 'gorevYon', ad: 'Görev Yönelimi', val: p.gorevYon?.toFixed(1) },
    { k: 'kontrol', ad: 'Mental Kontrol', val: p.kontrol?.toFixed(1) }
  ];
  return `<div class="psiko-ozet-grid" style="margin-top:20px">
    ${items.map(i => {
      const { durum, renk } = psikolojiBoyutDurumu(i.k, parseFloat(i.val));
      return `<div class="psiko-alan-kart">
        <div class="psiko-alan-baslik">${i.ad}</div>
        <div class="psiko-alan-puan" style="color:var(--${renk === 'green' ? 'success' : renk === 'orange' ? 'warning' : 'danger'})">${i.val}</div>
        <div class="psiko-alan-durum">${durum}</div>
      </div>`;
    }).join('')}
  </div>`;
}

async function sporcuSonuclariniYukle() {
  const s = oturumKullanici;
  yukleniyor('sporcuSonuclarDiv');
  try {
    const [testler, anketler] = await Promise.all([
      motorikTestleriGetir(s.id),
      anketleriGetir(s.id)
    ]);
    let html = '';
    if (testler && testler.length > 0) {
      html += `<div class="kart"><div class="kart-baslik">📊 Test Geçmişim</div>
        ${testler.map(t => `<div class="gecmis-item">
          <span class="gecmis-tarih">${tarihFormatla(t.test_tarihi)}</span>
          <span class="gecmis-icerik">${Object.keys(TEST_ETIKETLERI).filter(k=>t[k]!=null).length} test sonucu</span>
        </div>`).join('')}
      </div>`;
    }
    if (anketler && anketler.length > 0) {
      html += `<div class="kart"><div class="kart-baslik">🧠 Anket Geçmişim</div>
        ${anketler.map(a => {
          const p = psikolojiPuanlari(a);
          return `<div class="gecmis-item">
            <span class="gecmis-tarih">${tarihFormatla(a.anket_tarihi)}</span>
            <span class="gecmis-icerik">${p ? `Özgüven: ${p.ozguven?.toFixed(0)} · Kaygı: ${p.bilisselKaygi?.toFixed(0)}` : 'Anket'}</span>
          </div>`;
        }).join('')}
      </div>`;
    }
    if (!html) html = '<div class="bos-durum"><span class="ikon">📋</span><p>Henüz sonuç yok</p></div>';
    document.getElementById('sporcuSonuclarDiv').innerHTML = html;
  } catch (e) {
    document.getElementById('sporcuSonuclarDiv').innerHTML = `<p style="color:red">${e.message}</p>`;
  }
}
