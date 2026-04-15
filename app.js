const SUPABASE_URL = 'https://jyqogzzklpwwixhoyunf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cW9nenprbHB3d2l4aG95dW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzg3NjgsImV4cCI6MjA5MTg1NDc2OH0.dL82bDsnCIhLkxqflLzwDADsAwgwHwyTj2KawH639w0';
const ADMIN_SIFRE = 'taekwondo2024';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let sporcular = [];

// ===== GİRİŞ =====
function adminGiris() {
  const sifre = document.getElementById('login-password').value;
  if (sifre === ADMIN_SIFRE) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    sporcularıYukle();
  } else {
    document.getElementById('login-error').textContent = 'Şifre yanlış!';
  }
}

document.getElementById('login-password').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') adminGiris();
});

function cikisYap() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('login-password').value = '';
}

// ===== SAYFA NAVİGASYON =====
function sayfaGoster(sayfa) {
  document.querySelectorAll('.sayfa').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sayfa-' + sayfa).classList.remove('hidden');
  event.target.classList.add('active');

  if (sayfa === 'test-girisi') testSporculariniYukle();
  if (sayfa === 'ev-odevleri') { odevSporculariniYukle(); odevleriYukle(); }
  if (sayfa === 'odev-takip') odevTakipYukle();
}

// ===== MODAL =====
function modalAc(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'odev-modal') odevModalSporculariniYukle();
}
function modalKapat(id) {
  document.getElementById(id).classList.add('hidden');
}

// ===== SPORCULAR =====
async function sporcularıYukle() {
  const { data } = await sb.from('sporcular').select('*').order('ad_soyad');
  sporcular = data || [];
  const liste = document.getElementById('sporcu-listesi');
  liste.innerHTML = '';

  if (sporcular.length === 0) {
    liste.innerHTML = '<p style="color:#aaa;font-size:14px;">Henüz sporcu eklenmemiş.</p>';
    return;
  }

  sporcular.forEach(s => {
    const initials = s.ad_soyad.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const colors = ['#e63946','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2'];
    const renk = colors[s.ad_soyad.charCodeAt(0) % colors.length];
    const yas = s.dogum_tarihi ? (new Date().getFullYear() - new Date(s.dogum_tarihi).getFullYear()) : '—';
    const link = `${window.location.origin}/sporcu.html?slug=${s.slug}`;

    liste.innerHTML += `
      <div class="sporcu-kart">
        <div class="sporcu-kart-top">
          <div class="sporcu-kart-av" style="background:${renk}">${initials}</div>
          <div>
            <div class="sporcu-kart-ad">${s.ad_soyad}</div>
            <div class="sporcu-kart-alt">${s.cinsiyet || ''} · ${yas} yaş · ${s.dan_kusak || ''}</div>
          </div>
        </div>
        <a class="sporcu-kart-link" href="${link}" target="_blank">${link}</a>
      </div>`;
  });
}

async function sporcuKaydet() {
  const ad = document.getElementById('s-ad').value.trim();
  if (!ad) { alert('Ad soyad gerekli!'); return; }

  const slug = ad.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');

  const { error } = await sb.from('sporcular').insert({
    ad_soyad: ad,
    dogum_tarihi: document.getElementById('s-dogum').value || null,
    cinsiyet: document.getElementById('s-cinsiyet').value,
    dan_kusak: document.getElementById('s-kusak').value,
    boy: document.getElementById('s-boy').value || null,
    kilo: document.getElementById('s-kilo').value || null,
    slug: slug + '-' + Date.now().toString().slice(-4)
  });

  if (error) {
    document.getElementById('sporcu-mesaj').textContent = 'Hata: ' + error.message;
  } else {
    document.getElementById('sporcu-mesaj').textContent = 'Sporcu eklendi!';
    setTimeout(() => { modalKapat('sporcu-modal'); sporcularıYukle(); }, 1000);
  }
}

// ===== TEST GİRİŞİ =====
async function testSporculariniYukle() {
  const { data } = await sb.from('sporcular').select('id, ad_soyad').order('ad_soyad');
  const sel = document.getElementById('test-sporcu-sec');
  sel.innerHTML = '<option value="">Sporcu seçin...</option>';
  (data || []).forEach(s => sel.innerHTML += `<option value="${s.id}">${s.ad_soyad}</option>`);
}

async function testKaydet() {
  const sporcuId = document.getElementById('test-sporcu-sec').value;
  const tarih = document.getElementById('test-tarihi').value;
  if (!sporcuId || !tarih) { alert('Sporcu ve tarih seçin!'); return; }

  const { error } = await sb.from('test_sonuclari').insert({
    sporcu_id: sporcuId,
    test_tarihi: tarih,
    uzun_atlama: document.getElementById('t-uzun-atlama').value || null,
    saglik_topu: document.getElementById('t-saglik-topu').value || null,
    mekik_30sn: document.getElementById('t-mekik').value || null,
    sprint_30m: document.getElementById('t-sprint').value || null,
    illinois: document.getElementById('t-illinois').value || null,
    flamingo: document.getElementById('t-flamingo').value || null,
    otur_uzan: document.getElementById('t-otur-uzan').value || null,
    beep_test: document.getElementById('t-beep').value || null,
    cember_koordinasyon: document.getElementById('t-cember').value || null,
    cetvel_reaksiyon: document.getElementById('t-cetvel').value || null,
    el_dinamometre: document.getElementById('t-dinamometre').value || null,
    wingate: document.getElementById('t-wingate').value || null,
  });

  const mesaj = document.getElementById('test-mesaj');
  if (error) {
    mesaj.style.color = '#e63946';
    mesaj.textContent = 'Hata: ' + error.message;
  } else {
    mesaj.style.color = '#16a34a';
    mesaj.textContent = 'Test sonuçları kaydedildi!';
    setTimeout(() => mesaj.textContent = '', 3000);
  }
}

// ===== EV ÖDEVLERİ =====
async function odevSporculariniYukle() {
  const { data } = await sb.from('sporcular').select('id, ad_soyad').order('ad_soyad');
  const sel = document.getElementById('odev-filtre-sporcu');
  sel.innerHTML = '<option value="">Tüm Sporcular</option>';
  (data || []).forEach(s => sel.innerHTML += `<option value="${s.id}">${s.ad_soyad}</option>`);
}

async function odevModalSporculariniYukle() {
  const { data } = await sb.from('sporcular').select('id, ad_soyad').order('ad_soyad');
  const sel = document.getElementById('odev-sporcu');
  sel.innerHTML = '';
  (data || []).forEach(s => sel.innerHTML += `<option value="${s.id}">${s.ad_soyad}</option>`);
}

async function odevleriYukle() {
  const filtre = document.getElementById('odev-filtre-sporcu').value;
  let query = sb.from('ev_odevleri').select('*, sporcular(ad_soyad)').order('tarih', { ascending: false });
  if (filtre) query = query.eq('sporcu_id', filtre);

  const { data } = await query;
  const liste = document.getElementById('odev-listesi');
  liste.innerHTML = '';

  if (!data || data.length === 0) {
    liste.innerHTML = '<p style="color:#aaa;font-size:14px;">Henüz ödev eklenmemiş.</p>';
    return;
  }

  data.forEach(o => {
    liste.innerHTML += `
      <div class="odev-kart">
        <div class="odev-kart-sol">
          <div class="odev-kart-baslik">${o.baslik}</div>
          <div class="odev-kart-alt">${o.sporcular?.ad_soyad || ''} · ${o.tarih || ''} · ${o.sure_dakika || '—'} dk</div>
        </div>
        <button class="odev-sil-btn" onclick="odevSil('${o.id}')">Sil</button>
      </div>`;
  });
}

async function odevKaydet() {
  const sporcuId = document.getElementById('odev-sporcu').value;
  const baslik = document.getElementById('odev-baslik').value.trim();
  if (!sporcuId || !baslik) { alert('Sporcu ve başlık gerekli!'); return; }

  const { error } = await sb.from('ev_odevleri').insert({
    sporcu_id: sporcuId,
    baslik: baslik,
    aciklama: document.getElementById('odev-aciklama').value,
    sure_dakika: document.getElementById('odev-sure').value || null,
    tarih: document.getElementById('odev-tarih').value || null,
  });

  const mesaj = document.getElementById('odev-mesaj');
  if (error) {
    mesaj.style.color = '#e63946';
    mesaj.textContent = 'Hata: ' + error.message;
  } else {
    mesaj.style.color = '#16a34a';
    mesaj.textContent = 'Ödev eklendi!';
    setTimeout(() => { modalKapat('odev-modal'); odevleriYukle(); }, 1000);
  }
}

async function odevSil(id) {
  if (!confirm('Bu ödevi silmek istediğinize emin misiniz?')) return;
  await sb.from('ev_odevleri').delete().eq('id', id);
  odevleriYukle();
}

// ===== ÖDEV TAKİP =====
async function odevTakipYukle() {
  const { data } = await sb.from('odev_tamamlama')
    .select('*, ev_odevleri(baslik, sure_dakika), sporcular(ad_soyad)')
    .order('created_at', { ascending: false });

  const liste = document.getElementById('takip-listesi');
  liste.innerHTML = '';

  if (!data || data.length === 0) {
    liste.innerHTML = '<p style="color:#aaa;font-size:14px;">Henüz ödev başlatılmamış.</p>';
    return;
  }

  data.forEach(t => {
    let sure = '—';
    if (t.baslangic_zamani && t.bitis_zamani) {
      const fark = Math.round((new Date(t.bitis_zamani) - new Date(t.baslangic_zamani)) / 60000);
      sure = fark + ' dk';
    }
    const beklenen = t.ev_odevleri?.sure_dakika || 0;
    const gercek = t.baslangic_zamani && t.bitis_zamani
      ? Math.round((new Date(t.bitis_zamani) - new Date(t.baslangic_zamani)) / 60000) : 0;

    let durumClass = 'durum-bekliyor';
    let durumText = 'Başlatıldı';
    if (t.tamamlandi) {
      if (beklenen > 0 && gercek < beklenen * 0.5) {
        durumClass = 'durum-eksik';
        durumText = `Erken bitti (${sure})`;
      } else {
        durumClass = 'durum-tamam';
        durumText = `Tamamlandı (${sure})`;
      }
    }

    const tarih = t.baslangic_zamani ? new Date(t.baslangic_zamani).toLocaleString('tr-TR') : '—';

    liste.innerHTML += `
      <div class="takip-kart">
        <div>
          <div style="font-size:14px;font-weight:500;">${t.sporcular?.ad_soyad || ''}</div>
          <div style="font-size:12px;color:#888;">${t.ev_odevleri?.baslik || ''} · ${tarih}</div>
        </div>
        <span class="takip-durum ${durumClass}">${durumText}</span>
      </div>`;
  });
}
