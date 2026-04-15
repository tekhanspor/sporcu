const SUPABASE_URL = 'https://jyqogzzklpwwixhoyunf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cW9nenprbHB3d2l4aG95dW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzg3NjgsImV4cCI6MjA5MTg1NDc2OH0.dL82bDsnCIhLkxqflLzwDADsAwgwHwyTj2KawH639w0';
const ADMIN_SIFRE = 'taekwondo2024';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== GİRİŞ =====
function adminGiris() {
  const sifre = document.getElementById('login-password').value;
  if (sifre === ADMIN_SIFRE) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    sporcularYukle();
  } else {
    document.getElementById('login-error').textContent = 'Şifre yanlış!';
  }
}
document.getElementById('login-password').addEventListener('keypress', e => { if (e.key === 'Enter') adminGiris(); });

function cikisYap() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('login-password').value = '';
}

// ===== NAVİGASYON =====
function sayfaGoster(sayfa, el) {
  document.querySelectorAll('.sayfa').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sayfa-' + sayfa).classList.remove('hidden');
  el.classList.add('active');
  if (sayfa === 'test-girisi') sporcuSelectYukle('test-sporcu-sec');
  if (sayfa === 'psikoloji') { sporcuSelectYukle('psiko-sporcu-sec'); likertleriOlustur(); }
  if (sayfa === 'odevler') { sporcuSelectYukle('odev-filtre-sporcu', true); odevleriYukle(); }
  if (sayfa === 'takip') odevTakipYukle();
}

// ===== MODAL =====
function modalAc(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'odev-modal') sporcuSelectYukle('odev-sporcu');
}
function modalKapat(id) { document.getElementById(id).classList.add('hidden'); }

// ===== LİKERT OLUŞTUR =====
function likertleriOlustur() {
  document.querySelectorAll('.likert-group').forEach(group => {
    if (group.children.length > 0) return;
    const max = parseInt(group.dataset.max) || 4;
    const start = max === 4 ? 0 : 1;
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
  const group = document.querySelector(`.likert-group[data-field="${field}"]`);
  if (!group) return null;
  const sel = group.querySelector('.likert-btn.selected');
  return sel ? parseInt(sel.dataset.val) : null;
}

// ===== SPORCULAR =====
async function sporcularYukle() {
  const { data } = await sb.from('sporcular').select('*').order('ad_soyad');
  const liste = document.getElementById('sporcu-listesi');
  liste.innerHTML = '';
  if (!data || data.length === 0) { liste.innerHTML = '<p style="color:#aaa;font-size:13px;grid-column:1/-1;">Henüz sporcu eklenmemiş.</p>'; return; }
  const colors = ['#e63946','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2'];
  data.forEach(s => {
    const initials = s.ad_soyad.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const renk = colors[s.ad_soyad.charCodeAt(0) % colors.length];
    const yas = s.dogum_tarihi ? (new Date().getFullYear() - new Date(s.dogum_tarihi).getFullYear()) : '—';
    const link = `${window.location.origin.replace('index.html','')}/sporcu.html?slug=${s.slug}`;
    liste.innerHTML += `
      <div class="sporcu-kart">
        <div class="sporcu-kart-top">
          <div class="sporcu-kart-av" style="background:${renk}">${initials}</div>
          <div>
            <div class="sporcu-kart-ad">${s.ad_soyad}</div>
            <div class="sporcu-kart-alt">${s.cinsiyet||''} · ${yas} yaş</div>
          </div>
        </div>
        <div class="sporcu-kart-alt" style="margin-bottom:4px;">${s.dan_kusak||''} ${s.sifre ? '· 🔑 '+s.sifre : ''}</div>
        <a class="sporcu-kart-link" href="${link}" target="_blank">Sporcu sayfasını aç</a>
      </div>`;
  });
}

async function sporcuSelectYukle(selectId, tumHepsi = false) {
  const { data } = await sb.from('sporcular').select('id, ad_soyad').order('ad_soyad');
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = tumHepsi ? '<option value="">Tüm Sporcular</option>' : '<option value="">Sporcu seçin...</option>';
  (data || []).forEach(s => sel.innerHTML += `<option value="${s.id}">${s.ad_soyad}</option>`);
}

async function sporcuKaydet() {
  const ad = document.getElementById('s-ad').value.trim();
  if (!ad) { alert('Ad soyad gerekli!'); return; }
  const slug = ad.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') + '-' + Date.now().toString().slice(-4);
  const { error } = await sb.from('sporcular').insert({
    ad_soyad: ad,
    dogum_tarihi: document.getElementById('s-dogum').value || null,
    cinsiyet: document.getElementById('s-cinsiyet').value,
    dan_kusak: document.getElementById('s-kusak').value || null,
    sifre: document.getElementById('s-sifre').value || null,
    boy: document.getElementById('s-boy').value || null,
    kilo: document.getElementById('s-kilo').value || null,
    slug
  });
  const mesaj = document.getElementById('sporcu-mesaj');
  if (error) { mesaj.textContent = 'Hata: ' + error.message; }
  else { mesaj.textContent = 'Sporcu eklendi!'; setTimeout(() => { modalKapat('sporcu-modal'); sporcularYukle(); mesaj.textContent=''; }, 1200); }
}

// ===== MOTORİK TEST =====
async function testKaydet() {
  const sporcuId = document.getElementById('test-sporcu-sec').value;
  const tarih = document.getElementById('test-tarihi').value;
  if (!sporcuId || !tarih) { alert('Sporcu ve tarih seçin!'); return; }
  const { error } = await sb.from('test_sonuclari').insert({
    sporcu_id: sporcuId,
    test_tarihi: tarih,
    donem: document.getElementById('test-donem').value || null,
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
  if (error) { mesaj.style.color='#e63946'; mesaj.textContent = 'Hata: ' + error.message; }
  else { mesaj.style.color='#16a34a'; mesaj.textContent = 'Test sonuçları kaydedildi!'; setTimeout(() => mesaj.textContent='', 3000); }
}

// ===== PSİKOLOJİ ANTRENÖRFormu =====
async function psikolojiAntrenorKaydet() {
  const sporcuId = document.getElementById('psiko-sporcu-sec').value;
  const tarih = document.getElementById('psiko-tarihi').value;
  if (!sporcuId || !tarih) { alert('Sporcu ve tarih seçin!'); return; }

  const fields = ['ka_b1','ka_b2','ka_b3','ka_b4','ka_b5',
    'ka_s1','ka_s2','ka_s3','ka_s4','ka_s5',
    'ka_d1','ka_d2','ka_d3','ka_d4','ka_d5',
    'ma_g1','ma_g2','ma_g3','ma_g4','ma_g5',
    'ma_e1','ma_e2','ma_e3','ma_e4','ma_e5',
    'mda_kon1','mda_kon2','mda_kon3',
    'mda_bag1','mda_bag2','mda_bag3',
    'mda_mey1','mda_mey2','mda_mey3',
    'mda_guv1','mda_guv2','mda_guv3',
    'ka2_g1','ka2_g2','ka2_g3','ka2_g4','ka2_g5',
    'ka2_d1','ka2_d2','ka2_d3','ka2_d4','ka2_d5'];

  const veri = { sporcu_id: sporcuId, test_tarihi: tarih, donem: document.getElementById('psiko-donem').value || null, antrenor_notu: document.getElementById('psiko-antrenor-notu').value || null, onaylandi: true };
  fields.forEach(f => { veri[f] = likertDegerAl(f); });

  const { error } = await sb.from('psikoloji_antrenor').insert(veri);
  const mesaj = document.getElementById('psiko-mesaj');
  if (error) { mesaj.style.color='#e63946'; mesaj.textContent = 'Hata: ' + error.message; }
  else { mesaj.style.color='#16a34a'; mesaj.textContent = 'Kaydedildi ve onaylandı!'; setTimeout(() => mesaj.textContent='', 3000); }
}

// ===== ÖDEVLER =====
async function odevleriYukle() {
  const filtre = document.getElementById('odev-filtre-sporcu')?.value;
  let query = sb.from('ev_odevleri').select('*, sporcular(ad_soyad)').order('tarih', { ascending: false });
  if (filtre) query = query.eq('sporcu_id', filtre);
  const { data } = await query;
  const liste = document.getElementById('odev-listesi');
  liste.innerHTML = '';
  if (!data || data.length === 0) { liste.innerHTML = '<p style="color:#aaa;font-size:13px;">Henüz ödev eklenmemiş.</p>'; return; }
  data.forEach(o => {
    liste.innerHTML += `
      <div class="odev-kart">
        <div class="odev-kart-sol">
          <div class="odev-kart-baslik">${o.baslik}</div>
          <div class="odev-kart-alt">${o.sporcular?.ad_soyad||''} · ${o.tarih||''} · ${o.sure_dakika||'—'} dk</div>
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
    baslik,
    aciklama: document.getElementById('odev-aciklama').value,
    sure_dakika: document.getElementById('odev-sure').value || null,
    tarih: document.getElementById('odev-tarih').value || null,
  });
  const mesaj = document.getElementById('odev-mesaj');
  if (error) { mesaj.style.color='#e63946'; mesaj.textContent = 'Hata: ' + error.message; }
  else { mesaj.style.color='#16a34a'; mesaj.textContent = 'Ödev eklendi!'; setTimeout(() => { modalKapat('odev-modal'); odevleriYukle(); mesaj.textContent=''; }, 1200); }
}

async function odevSil(id) {
  if (!confirm('Bu ödevi silmek istiyor musun?')) return;
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
  if (!data || data.length === 0) { liste.innerHTML = '<p style="color:#aaa;font-size:13px;">Henüz ödev başlatılmamış.</p>'; return; }
  data.forEach(t => {
    const beklenen = t.ev_odevleri?.sure_dakika || 0;
    let gercek = 0;
    if (t.baslangic_zamani && t.bitis_zamani) gercek = Math.round((new Date(t.bitis_zamani) - new Date(t.baslangic_zamani)) / 60000);
    let durumClass = 'durum-bekliyor', durumText = 'Devam ediyor';
    if (t.tamamlandi) {
      if (beklenen > 0 && gercek < beklenen * 0.5) { durumClass = 'durum-eksik'; durumText = `Erken bitti (${gercek} dk)`; }
      else { durumClass = 'durum-tamam'; durumText = `Tamamlandı (${gercek} dk)`; }
    }
    const tarih = t.baslangic_zamani ? new Date(t.baslangic_zamani).toLocaleString('tr-TR') : '—';
    liste.innerHTML += `
      <div class="takip-kart">
        <div>
          <div style="font-size:14px;font-weight:600;">${t.sporcular?.ad_soyad||''}</div>
          <div style="font-size:12px;color:#888;">${t.ev_odevleri?.baslik||''} · ${tarih}</div>
        </div>
        <span class="takip-durum ${durumClass}">${durumText}</span>
      </div>`;
  });
}
