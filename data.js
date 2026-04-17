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
  fskt_kdi:            { normlar: [20,20,18,18,15,15],       yuksek_iyi: false },
  dck60_tekrar:        { normlar: [55,46,65,55,78,65],       yuksek_iyi: true  },
  sinav_tekrar:        { normlar: [12,9,18,12,25,16],        yuksek_iyi: true  }
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
  fskt_kdi:            { ad: 'FSKT KDI',             birim: '%' },
  dck60_tekrar:        { ad: '60sn DCK',              birim: 'tekrar' },
  sinav_tekrar:        { ad: 'Maksimum Şınav',        birim: 'tekrar' }
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

// Test açıklamaları — durum bazlı, taekwondo odaklı, çocuk dili
const TEST_ACIKLAMALAR = {

  uzun_atlama_cm: {
    green:  "Bacaklarından patlayıcı bir güç var. Tekmelerin hem hızlı hem sert geliyor, rakibin elektronik sistemden skor çıkarmak için düşünmek zorunda bile kalmıyor.",
    yellow: "Bacak gücün yeterli ama daha sert tekme atabileceğin için çalışma payın var. Özellikle dolyo chagi ve yop chagide bu fark hissedilir.",
    orange: "Tekmelerin şu an yeterince sert değil. Rakibin hogu yeleğini güçlü vuramıyorsan elektronik sistemden puan çıkmaz, maçı kazanmak zorlaşır.",
    red:    "Bacak gücün yaşına göre oldukça düşük. Maçta tekme atıyorsun ama rakibine pek bir şey hissettirmiyorsun. Elektronik sistem skor vermez, hakem de etkilenmez."
  },

  saglik_topu_cm: {
    green:  "Gövden ve kolların güçlü. Rakibini ittirdiğinde veya pozisyon savaşında çok daha etkilisin, dengesini bozmak senin için kolay.",
    yellow: "Gövde gücün iyi ama biraz daha geliştirirsen rakibini ittirme ve pozisyon almada çok daha etkili olursun.",
    orange: "Rakibinle yakın mesafede mücadelede zorlanabilirsin. Gövde gücün düşük olunca onu itmek veya pozisyon almak senin için zor.",
    red:    "Gövde ve kol gücün yaşına göre düşük. Yakın mesafe mücadelelerinde rakibin seni kolayca iter, sen onu itemezsin. Bu maçta ciddi dezavantaj."
  },

  mekik_tekrar: {
    green:  "Karın kasların güçlü ve dayanıklı. Maç boyunca her tekme atışında gövden sağlam kalır, tekmelerin gücünü son ana kadar korursun.",
    yellow: "Karın kasların yeterli ama maçın son dakikalarında tekmelerin biraz güçsüzleşebilir. Biraz daha çalışırsan son raundu da güçlü tamamlarsın.",
    orange: "Maçın ortalarından itibaren tekmelerin giderek zayıflamaya başlar. Gövden yorulunca tekme atarken denge kaybı da yaşayabilirsin.",
    red:    "Karın kasların yaşına göre zayıf. Maçın ilk raundundan sonra tekmelerin güçsüzleşir, denge kaybedersin ve rakibine kolay puan verirsin."
  },

  sprint_30m_sn: {
    green:  "Sahada çok hızlısın. Rakibine ani baskı yaparken o henüz hazırlanmadan tekmeyi atabilirsin. Bu hız maçta büyük avantaj.",
    yellow: "Hızın iyi. Rakibine baskı yapabilirsin ama en hızlı rakiplerine karşı biraz daha çalışman gerekebilir.",
    orange: "Rakibine baskı yapıp hızlı yaklaşmakta zorlanabilirsin. Ani hareketlerinde rakibin senden önce pozisyon alabilir.",
    red:    "Sahada yavaş kalıyorsun. Hızlı rakipler seni kolayca geçer, sen onlara yetişemezsin. Pozisyon almak ve tekme atmak için fırsat bulamayabilirsin."
  },

  illinois_sn: {
    green:  "Sahada çok çeviksin. Rakibinden kaçmak, açı almak ve aniden yön değiştirmek senin için kolay. Rakibin seni köşeye sıkıştıramaz.",
    yellow: "Çevikliğin iyi. Ama çok hızlı rakiplere karşı yön değiştirirken biraz geç kalabilirsin.",
    orange: "Yön değiştirirken biraz yavaş kalıyorsun. Rakibin seni köşeye sıkıştırabilir veya savunmasını geçmekte zorlanabilirsin.",
    red:    "Sahada hantal görünüyorsun. Rakibin kolayca açı alır, sen onu takip edemezsin. Maçta çok zor pozisyonlara düşebilirsin."
  },

  flamingo_hata: {
    green:  "Dengen mükemmel. Tekme atarken hiç sendelemiyorsun, her vuruş tam güçle ve dengeli geliyor. Elektronik sistem senin vuruşlarını iyi algılar.",
    yellow: "Dengen yeterli ama zaman zaman tekme atarken hafif sarsılma olabilir. Bu vuruş gücünü biraz düşürür.",
    orange: "Tekme atarken dengeyi kaybetme riski taşıyorsun. Bu hem vuruş gücünü hem de güvenliğini etkiler. Elektronik sistemden daha az skor çıkar.",
    red:    "Dengen yaşına göre zayıf. Tekme atarken sık sık sendeliyorsun. Bu vuruş gücünü direkt olarak düşürür, elektronik sistem yeterli vuruş gücü algılayamaz ve skor vermez."
  },

  otur_uzan_cm: {
    green:  "Çok esneksin. Yüksek tekme atmak senin için kolay, bacaklarını rahatça kaldırabilirsin. Sakatlanma riskin de düşük.",
    yellow: "Esnekliğin yeterli ama biraz daha çalışırsan daha yüksek tekme atabilir ve daha az zorlanırsın.",
    orange: "Yüksek tekme atmakta zorlanabilirsin. Bacaklarını çok yukarı kaldırmaya çalışırsan kas gerilmesi hissedebilirsin.",
    red:    "Esnekliğin düşük. Kafa hizasında tekme atmak sana çok zor geliyor ve sakatlık riski taşıyor. Rakibin bu açığını kullanabilir."
  },

  beep_test_seviye: {
    green:  "Maçın son saniyesine kadar aynı hızda tekme atabilirsin. Rakibin yorulurken sen hâlâ güçlüsün — bu sana büyük avantaj sağlar.",
    yellow: "Maç boyunca enerjini iyi yönetebilirsin. Ama en güçlü rakiplerine karşı son rauntta hafif zorlanabilirsin.",
    orange: "Son rauntta hafif yorgunluk hissedebilirsin. Tekmelerin biraz yavaşlar ama tamamen bitmezsin.",
    red:    "Maçın son raundunda çok çabuk yorulursun. Rakibin hâlâ güçlüyken sen nefes nefese kalırsın, tekme atmak yerine sadece savunmaya geçersin. Bu da rakibine kolay puan alma fırsatı verir."
  },

  cetvel_reaksiyon_cm: {
    green:  "Rakibinin hamlelerini çok hızlı fark ediyorsun. Tekme gelmeden önce bloğunu yapabilir veya karşı atak yapabilirsin.",
    yellow: "Tepki hızın iyi. Ama çok hızlı rakiplere karşı bazen bir adım geç kalabilirsin.",
    orange: "Rakibinin hareketlerine geç tepki veriyorsun. Bu özellikle hızlı kombinasyonlarda seni savunmasız bırakır.",
    red:    "Tepki hızın düşük. Rakibin tekme atarken sen hâlâ ne yapacağına karar veriyorsun. Maçta çok sayı yiyebilirsin."
  },

  dolyo_chagi_tekrar: {
    green:  "10 saniyede çok fazla tekme atabiliyorsun. Bu hem hızın hem de teknik koordinasyonunun iyi olduğunu gösteriyor. Rakibini tekme yağmuruna tutabilirsin.",
    yellow: "Tekme hızın iyi ama biraz daha çalışırsan 10 saniyede daha fazla dolyo chagi atabilirsin.",
    orange: "10 saniyede attığın tekme sayısı yaşına göre az. Rakibine baskı yaparken yeterince hızlı kombinasyon yapamıyorsun.",
    red:    "Tekme hızın yaşına göre düşük. Rakibin 10 saniyede senden çok daha fazla tekme atar. Kombinasyon mücadelelerinde geride kalırsın."
  },

  fskt_tekrar: {
    green:  "Tek seferde çok güçlü tekme atabiliyorsun. Maçta ilk temaslarda rakibini baskı altına alabilirsin.",
    yellow: "En iyi setinde iyi bir tekme hızın var. Bunu maç boyunca korumak önemli.",
    orange: "En iyi setinde attığın tekme sayısı yaşına göre biraz düşük. Daha hızlı kombinasyonlar çalışman gerekiyor.",
    red:    "En iyi setinde bile yaşına göre az tekme atıyorsun. Rakibin her turda senden daha fazla tekme atar."
  },

  fskt_kdi: {
    green:  "Maç boyunca tekme hızını koruyorsun. İlk raunddaki gibi son raundu da güçlü tamamlarsın. Rakibin yorulurken sen hâlâ aynı hızdasın.",
    yellow: "Yoruldukça tekme hızın biraz düşüyor ama çok büyük bir fark değil. Son raundu biraz daha zinde tamamlayabilirsin.",
    orange: "İlk turla son tur arasında büyük fark var. Maçın başında iyi başlıyorsun ama sonunda tekme hızın belirgin şekilde düşüyor.",
    red:    "Çok çabuk yoruluyorsun. İlk raunddaki güçlü tekmeleri son rauntta atamıyorsun. Rakibin bunu fark eder ve son raundu baskıyla geçirir."
  },

  dck60_tekrar: {
    green:  "60 saniye boyunca yüksek tempoda tekme atabiliyorsun. Bu bir maç raunduna yakın süre. Maç boyunca sürekli baskı kurabilirsin.",
    yellow: "60 saniye boyunca iyi bir tempo tutabiliyorsun. Ama en zorlu maçlarda son saniyelerde biraz düşüş yaşayabilirsin.",
    orange: "60 saniyenin son bölümünde tekme sayın belirgin şekilde düşüyor. Uzun soluklu mücadelelerde zorlanırsın.",
    red:    "60 saniye boyunca yüksek tempo tutamıyorsun. Maç boyunca sürekli yüksek hız gerektiren durumlarda erken bitiyorsun. Rakibin bunu fark eder."
  },

  sinav_tekrar: {
    green:  "Üst vücudun güçlü. Maçta rakibini ittirdiğinde veya düştükten sonra hızla kalktığında bu güç sana avantaj sağlar.",
    yellow: "Üst vücut gücün iyi. Biraz daha çalışırsan yakın mesafe mücadelelerinde çok daha etkili olursun.",
    orange: "Üst vücut gücün biraz düşük. Rakibinle yakın temasta veya düşüp kalkmalarda zorlanabilirsin.",
    red:    "Üst vücut gücün yaşına göre düşük. Maçta yakın mesafe mücadelelerinde rakibin seni kolayca iter, sen onu itemezsin."
  }

};
