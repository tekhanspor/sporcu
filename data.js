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
// Normlar — TKD sporcusu bazlı (10-16 yaş, Erkek/Kız)
// Format: [E10-12, K10-12, E13-14, K13-14, E15-16, K15-16]
// Kaynaklar: Xu et al.2025, Da Silva Santos 2016-2019, Nikolaidis et al.2016,
//            Eurofit TKD sporcusu düzeltmeli, elite-nonelite TKD karşılaştırmaları
const NORMLAR = {
  uzun_atlama_cm:      { normlar: [155,143,172,158,188,168], yuksek_iyi: true  }, // TKD rekabetçi ort. +%10
  saglik_topu_cm:      { normlar: [375,310,450,365,525,410], yuksek_iyi: true  }, // Genel norm +%7
  mekik_tekrar:        { normlar: [22,19,26,23,32,27],       yuksek_iyi: true  }, // TKD %23 üstün
  sprint_30m_sn:       { normlar: [5.1,5.5,4.8,5.1,4.4,4.8], yuksek_iyi: false }, // Elite TKD ~%5 hızlı
  illinois_sn:         { normlar: [17.8,19.0,16.5,17.8,15.5,17.0], yuksek_iyi: false }, // Xu et al. 2025 TKD
  flamingo_hata:       { normlar: [5,7,3,5,2,4],             yuksek_iyi: false }, // TKD denge %16 iyi
  otur_uzan_cm:        { normlar: [27,31,29,33,31,36],       yuksek_iyi: true  }, // TKD +5cm
  beep_test_seviye:    { normlar: [6.5,5.8,7.5,6.8,9.0,8.0], yuksek_iyi: true  }, // TKD +1-1.5 seviye
  cetvel_reaksiyon_cm: { normlar: [20,22,17,19,14,16],       yuksek_iyi: false }, // TKD ~2cm daha iyi
  dolyo_chagi_tekrar:  { normlar: [13,11,16,14,20,17],       yuksek_iyi: true  }, // Xu et al.2025
  fskt_tekrar:         { normlar: [14,12,17,15,21,18],       yuksek_iyi: true  }, // Da Silva Santos
  fskt_kdi:            { normlar: [20,20,18,18,15,15],       yuksek_iyi: false }, // Da Silva Santos
  dck60_tekrar:        { normlar: [55,46,65,55,78,65],       yuksek_iyi: true  }, // Xu et al.2025
  sinav_tekrar:        { normlar: [15,11,22,15,30,20],       yuksek_iyi: true  }  // TKD +%25
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

const PSIKO_ACIKLAMALAR = {

  bilisselKaygi: {
    green: {
      metin: "Maç öncesi kafan sakin ve odaklı. Olumsuz düşünceler seni ele geçirmiyor, rakibini değil yapacaklarını düşünüyorsun. Bu seni sahada çok daha etkili yapıyor.",
      tavsiye: "💡 Bunu korumak için: Maç öncesi aynı rutini tekrarla. Neyin seni sakinleştirdiğini biliyorsun, ona güven."
    },
    orange: {
      metin: "Zaman zaman 'ya kaybedersem' gibi düşünceler aklına geliyor ama bunları kenara itebiliyorsun. Büyük maçlarda bu düşünceler biraz daha güçlenebilir.",
      tavsiye: "💡 Ne yapabilirsin: Olumsuz bir düşünce gelince 'dur' de içinden ve hemen bir sonraki hamleye odaklan. Kafanı geçmişe veya geleceğe değil şu ana getir."
    },
    orange2: {
      metin: "Maçtan önce kafanda oldukça fazla olumsuz düşünce var. 'Başaramam', 'rakibim çok iyi' gibi düşünceler seni maça başlamadan yoruyor.",
      tavsiye: "💡 Ne yapabilirsin: Maçtan önce sadece bir sonraki hamleye odaklan. 'Kazanacak mıyım?' yerine 'şu an ne yapmalıyım?' diye sor kendine."
    },
    red: {
      metin: "Maçtan önce kafan çok fazla olumsuz düşüncelerle dolu. 'Kaybederim', 'başaramam' gibi düşünceler seni maça başlamadan yoruyor. Rakibini düşünmek yerine kafan kendi korkularınla meşgul olunca sahada konsantrasyonun dağılıyor.",
      tavsiye: "💡 Ne yapabilirsin: Maçtan önce sadece bir sonraki hamleye odaklan. 'Kazanacak mıyım?' yerine 'şu an ne yapmalıyım?' diye sor kendine. Antrenörünle bunu konuş."
    }
  },

  somatikKaygi: {
    green: {
      metin: "Vücudun maç öncesi sakin. Kalbin çok hızlı çarpmıyor, ellerin titiremiyor, miyen bulanmıyor. Bu fiziksel sakinlik sahada çok daha iyi hareket etmeni sağlıyor.",
      tavsiye: "💡 Bunu korumak için: Maç öncesi ısınmana dikkat et. Vücudun bu sakinliği hazır olduğunun işareti."
    },
    orange: {
      metin: "Maç öncesi biraz kalp hızlanması veya gerginlik hissediyorsun ama bu çok abartılı değil. Hafif bir heyecan aslında seni daha dikkatli yapar.",
      tavsiye: "💡 Ne yapabilirsin: Maça girmeden önce 4 saniye nefes al, 4 saniye tut, 4 saniye ver. Bunu 3 kez tekrarla. Vücudun sakinleşir."
    },
    orange2: {
      metin: "Maç öncesi vücudunda belirgin gerginlik hissediyorsun. Kalbin hızlı çarpıyor, ellerinde titreme olabiliyor. Bu sahaya çıkmadan önce enerjinin büyük kısmını tüketiyor.",
      tavsiye: "💡 Ne yapabilirsin: Maça girmeden önce 4 saniye nefes al, 4 saniye tut, 4 saniye ver. Bunu 3 kez tekrarla. Vücudun sakinleşir."
    },
    red: {
      metin: "Maç öncesi vücudun çok güçlü tepkiler veriyor. Mide bulantısı, titreme, baş dönmesi gibi belirtiler var. Bu kadar yoğun bedensel gerginlik sahaya güçsüz çıkmanı sağlıyor, enerjin maç başlamadan tükeniyor.",
      tavsiye: "💡 Ne yapabilirsin: Maça girmeden önce 4 saniye nefes al, 4 saniye tut, 4 saniye ver. Bunu 5 kez tekrarla. Antrenörünle bu konuyu konuş, sana yardımcı olabilir."
    }
  },

  ozguven: {
    green: {
      metin: "Kendine çok güveniyorsun. Sahaya güçlü çıkıyorsun, zor anlarda bile 'yapabilirim' diyorsun. Rakibine baktığında 'bunu yapabilirim' hissediyorsun. Bu his seni rakibinden bir adım önde tutuyor.",
      tavsiye: "💡 Bunu korumak için: Her antrenman sonrası iyi yaptığın bir şeyi aklında tut. Güvenin bu birikimlerin üzerine inşa ediliyor."
    },
    orange: {
      metin: "Kendine genel olarak güveniyorsun ama zor maçlarda veya güçlü rakiplere karşı biraz sarsılabiliyor. Çoğu zaman iyi hissediyorsun ama bazı anlarda şüpheye düşüyorsun.",
      tavsiye: "💡 Ne yapabilirsin: Antrenmanda iyi yaptığın 3 şeyi aklında tut. Sahaya çıkarken 'bunu antrenmanımda yaptım, burada da yaparım' de."
    },
    orange2: {
      metin: "Kendine yeterince güvenmiyorsun. Özellikle güçlü rakiplere karşı veya maç başlamadan önce 'beceremem' hissi geliyor. Bu his seni sahada yapabileceğinden daha az denemeni sağlıyor.",
      tavsiye: "💡 Ne yapabilirsin: Antrenmanda iyi yaptığın 3 şeyi aklında tut. Sahaya çıkarken 'bunu antrenmanımda yaptım, burada da yaparım' de."
    },
    red: {
      metin: "Kendine güvenmiyorsun. Sahaya çıkmadan önce bile 'beceremem' hissediyorsun. Bu his sahada seni frenliyor, yapabileceğin teknikleri bile denemekten kaçınıyorsun. Rakibin bunu fark edebilir.",
      tavsiye: "💡 Ne yapabilirsin: Antrenmanda iyi yaptığın 3 şeyi yaz ve maçtan önce oku. Sahaya çıkarken 'bunu antrenmanımda yaptım, burada da yaparım' de. Antrenörünle bu konuyu konuş."
    }
  },

  gorevYon: {
    green: {
      metin: "Sporu doğru nedenden yapıyorsun — öğrenmek ve gelişmek için. Rakibini yenmekten çok kendi gelişimini takip ediyorsun. Bu yaklaşım seni uzun vadede çok daha iyi bir sporcu yapar.",
      tavsiye: "💡 Bunu korumak için: Her antrenman sonrası 'bugün ne öğrendim?' diye sor kendine. Bu soruyu sormaya devam ettiğin sürece gelişmeye devam edersin."
    },
    orange: {
      metin: "Genel olarak gelişmeye odaklısın ama bazen 'başkalarından iyi miyim?' diye düşünüyorsun. Bu normal ama rakibini değil kendini geçmeye çalıştığında çok daha hızlı gelişirsin.",
      tavsiye: "💡 Ne yapabilirsin: Antrenman hedefini sadece kendine koy. 'Bu hafta dolyo chagi'mi geçen haftadan hızlı atacağım' gibi. Rakibini değil geçen haftaki kendini geç."
    },
    orange2: {
      metin: "Zaman zaman gelişmeye odaklanıyorsun ama çoğunlukla başkalarıyla karşılaştırıyorsun kendini. Kaybettiğinde veya arkadaşın senden iyiyken motivasyonun düşüyor.",
      tavsiye: "💡 Ne yapabilirsin: Antrenman hedefini sadece kendine koy. 'Bu hafta dolyo chagi'mi geçen haftadan hızlı atacağım' gibi. Rakibini değil geçen haftaki kendini geç."
    },
    red: {
      metin: "Gelişmekten çok başkalarından iyi olmaya odaklanıyorsun. Kaybettiğinde veya başkasının senden iyi olduğunu gördüğünde motivasyonun tamamen çöküyor. Bu seni kırılgan yapıyor.",
      tavsiye: "💡 Ne yapabilirsin: Sadece dün yaptığın şeyi bugün biraz daha iyi yap. Başkasını değil, dünkü kendini geç. Antrenörünle bu konuyu konuş."
    }
  },

  egoYon: {
    green: {
      metin: "Başkalarından üstün görünmek seni fazla meşgul etmiyor. Bu çok sağlıklı. Kaybettiğinde de motivasyonunu koruyabiliyorsun, zor antrenmanlardan kaçmıyorsun.",
      tavsiye: "💡 Bunu korumak için: Kazanmaktan çok öğrenmeye odaklanmaya devam et. Bu yaklaşım seni uzun vadede çok daha güçlü yapar."
    },
    orange: {
      metin: "Zaman zaman başkalarıyla kıyaslamak istiyorsun. Biraz rekabetçi olmak normal ve iyi, ama bunu çok fazla düşünürsen kaybettiğinde çok sarsılabilirsin.",
      tavsiye: "💡 Ne yapabilirsin: Rakibini yenmekten çok kendi en iyi performansını sergilemeye odaklan. Sonuç skor tablosunda değil, sahada ne yaptığında."
    },
    orange2: {
      metin: "Başkalarından iyi görünmek seni oldukça meşgul ediyor. Kaybettiğinde çok sinirleniyor veya üzülüyorsun. Zor egzersizlerden kaçınıyor, güçlü göründüğün şeylere yöneliyorsun.",
      tavsiye: "💡 Ne yapabilirsin: Kaybetmek utanılacak bir şey değil, öğrenme fırsatı. Kaybettiğinde 'neden kaybettim?' diye sor, 'berbat biri miyim?' diye değil."
    },
    red: {
      metin: "Başkalarından üstün görünmek senin için çok önemli. Kaybettiğinde ya da birinin senden iyi olduğunu gördüğünde çok sert tepkiler veriyorsun. Bu seni zor antrenmanlarda kırılgan yapıyor.",
      tavsiye: "💡 Ne yapabilirsin: Kaybetmek utanılacak bir şey değil, öğrenme fırsatı. En iyi sporcular en çok kaybeden ve bundan en çok öğrenenlerdir. Antrenörünle bu konuyu konuş."
    }
  },

  kontrol: {
    green: {
      metin: "Zor anlarda kendini sakinleştirebiliyorsun. Sayı yesen bile paniklemiyorsun, stresli durumlarda kafan çalışmaya devam ediyor. Bu maçta çok büyük avantaj.",
      tavsiye: "💡 Bunu korumak için: Stresli anlarda ne yaptığını fark et ve aynı şeyi yapmaya devam et. Kendi sakinleşme yöntemini biliyorsun."
    },
    orange: {
      metin: "Çoğu zaman kendini kontrol edebiliyorsun ama çok stresli anlarda biraz sarsılabiliyor. Büyük maçlarda veya art arda sayı yediğinde kontrolünü kaybedebilirsin.",
      tavsiye: "💡 Ne yapabilirsin: Sayı yediğinde hemen 3 derin nefes al. Sadece 3 nefes. Sonra tekrar sahaya dön, geçmişi düşünme."
    },
    orange2: {
      metin: "Duygularını kontrol etmekte zorlanıyorsun. Maçta bir şeyler ters gittiğinde, sayı yediğinde veya ortam değiştiğinde bunalıma girebiliyorsun.",
      tavsiye: "💡 Ne yapabilirsin: Sayı yediğinde hemen 3 derin nefes al. Sadece 3 nefes. Sonra tekrar sahaya dön, geçmişi düşünme."
    },
    red: {
      metin: "Maçta bir şeyler ters gittiğinde kendini sakinleştiremiyorsun. Sayı yediğinde panikleyebiliyorsun ve bu panik sonraki hamlelerde de hata yapmanı sağlıyor. Rakibin bunu fark ederse seni daha çok baskı altına alır.",
      tavsiye: "💡 Ne yapabilirsin: Sayı yediğinde hemen 3 derin nefes al. Sadece 3 nefes. Sonra tekrar sahaya dön. Antrenörünle bunu çalış."
    }
  },

  baglilik: {
    green: {
      metin: "Zorlu antrenmanlarda bile bırakmıyorsun. Yorgun veya isteksiz olsana bile antrenmanına geliyorsun. Bu kararlılık seni diğer sporculardan ayıran en önemli şey.",
      tavsiye: "💡 Bunu korumak için: Zor bir antrenmandan sonra 'bugün de yaptım' de kendine. Bu his seni bir sonraki zorluğa da hazırlar."
    },
    orange: {
      metin: "Genel olarak bağlısın ama çok zorlandığında veya yorulduğunda 'bugün geçsem mi?' diye düşünebiliyorsun. Çoğu zaman devam ediyorsun, bu iyi.",
      tavsiye: "💡 Ne yapabilirsin: Antrenmanı bırakmak istediğinde sadece 5 dakika daha yap de kendine. Çoğu zaman o 5 dakika geçer ve devam edersin."
    },
    orange2: {
      metin: "Zorlu anlarda devam etmekte zorlanıyorsun. Yorulduğunda veya antrenman çok zorlaştığında pes etmeyi düşünebiliyorsun.",
      tavsiye: "💡 Ne yapabilirsin: Antrenmanı bırakmak istediğinde sadece 5 dakika daha yap de kendine. Bitirdiğinde kendini çok daha iyi hissedeceksin."
    },
    red: {
      metin: "Zorlu antrenmanlarda devam etmekte çok zorlanıyorsun. Zor egzersizleri atlıyor veya erken bitiriyorsun. Maçta dayanıklılık güç gerektiren anlarda bu eksiklik ortaya çıkacak.",
      tavsiye: "💡 Ne yapabilirsin: Antrenmanı bırakmak istediğinde sadece 5 dakika daha yap de kendine. Her tamamladığın zor antrenman seni bir sonraki maça daha hazır kılıyor."
    }
  },

  meydan: {
    green: {
      metin: "Zorlukları sever ve onları fırsat olarak görüyorsun. Güçlü rakiplerle karşılaşmak, zor egzersizler yapmak seni heyecanlandırıyor. Bu yaklaşım seni her maçta daha da güçlü yapıyor.",
      tavsiye: "💡 Bunu korumak için: Her zorlu maçtan sonra 'bu beni ne öğretti?' diye sor. Bu soruyu sormaya devam ettiğin sürece gelişmeye devam edersin."
    },
    orange: {
      metin: "Çoğu zaman zorluklarla baş edebiliyorsun ama çok büyük bir engelle karşılaşınca biraz çekilebiliyorsun. Hataları öğrenme fırsatı olarak görebiliyorsun ama her seferinde değil.",
      tavsiye: "💡 Ne yapabilirsin: Bir sonraki kaybettiğinde 'bu maçtan ne öğrendim?' diye yaz. Cevabı bulmak seni bir sonraki maça daha hazır yapar."
    },
    orange2: {
      metin: "Zorluklardan biraz kaçıyorsun. Zor egzersizleri veya güçlü rakipleri düşününce isteksizleşebiliyorsun. Kaybetmek veya başarısız olmak seni çok etkiliyor.",
      tavsiye: "💡 Ne yapabilirsin: Bir sonraki kaybettiğinde 'bu maçtan ne öğrendim?' diye yaz. Her kayıp bir ders. En iyi sporcular en çok kaybeden ve bundan öğrenenlerdir."
    },
    red: {
      metin: "Zorluklardan kaçıyorsun. Zor egzersizleri veya güçlü rakipleri gördüğünde çekiliyorsun. Başarısızlık seni çok uzun süre etkiliyor ve bir sonraki denemeyi engelliyor.",
      tavsiye: "💡 Ne yapabilirsin: Bir sonraki kaybettiğinde 'bu maçtan ne öğrendim?' diye yaz ve antrenörüne göster. Her zorluk seni daha güçlü yapar — ama ancak kaçmazsan."
    }
  },

  guven: {
    green: {
      metin: "Kendi kararlarına ve yeteneklerine güveniyorsun. Baskı altında bile 'yapabilirim' diyebiliyorsun. Geçmişteki hatalar seni durduramıyor, ilerlemeye devam ediyorsun.",
      tavsiye: "💡 Bunu korumak için: Zor bir antrenmandan veya maçtan sonra 'bugün ne iyi yaptım?' diye sor. Güvenin bu birikimlerin üzerine inşa ediliyor."
    },
    orange: {
      metin: "Genel olarak kendine güveniyorsun ama çok baskılı anlarda veya art arda hata yaptığında sarsılabiliyorsun. Çoğu zaman toparlanabiliyorsun.",
      tavsiye: "💡 Ne yapabilirsin: Hata yaptığında 'oldu, geçti' de ve bir sonraki hamleye odaklan. Geçmiş hatayı düşünmek sadece yeni hatalar yapmana yol açar."
    },
    orange2: {
      metin: "Kendine yeterince güvenmiyorsun. Özellikle baskı anlarında veya hata yaptıktan sonra 'beceremiyorum' hissi geliyor. Bu his seni frenliyor.",
      tavsiye: "💡 Ne yapabilirsin: Hata yaptığında 'oldu, geçti' de ve bir sonraki hamleye odaklan. Antrenmanında iyi yaptığın şeyleri aklında tut, onlar gerçek."
    },
    red: {
      metin: "Kendinle ilgili çok olumsuz düşünceler var. Hata yaptığında veya baskı altında kaldığında 'hiçbir şey yapamıyorum' hissine kapılıyorsun. Bu his maçta seni dondurabilir.",
      tavsiye: "💡 Ne yapabilirsin: Her antrenman sonrası iyi yaptığın bir şeyi yaz. Küçük de olsa. Bu liste büyüdükçe kendine olan güvenin de büyüyecek. Antrenörünle konuş."
    }
  },

  genisDissal: {
    green: {
      metin: "Sahada geniş bir görüş alanın var. Rakibini, hakemi ve sahayı aynı anda takip edebiliyorsun. Rakibinin stratejisini okuyabiliyor ve buna göre hamle yapabiliyorsun.",
      tavsiye: "💡 Bunu korumak için: Maçta sadece bir noktaya değil, tüm sahaya bakma alışkanlığını koru. Bu farkındalık seni her zaman bir adım önde tutar."
    },
    orange: {
      metin: "Çoğu zaman sahayı iyi okuyorsun ama çok stresli anlarda veya yorulduğunda dikkat alanın daralabiliyor. Tüm sahayı görmek yerine sadece rakibine odaklanıyorsun.",
      tavsiye: "💡 Ne yapabilirsin: Maçta zaman zaman gözlerini rakibinden bir an için ayır, sahayı tara. Bu alışkanlık zamanla otomatik hale gelir."
    },
    orange2: {
      metin: "Sahayı okumakta zorlanıyorsun. Sadece önündeki rakibe bakıyorsun, diğer detayları kaçırıyorsun. Hakem kararları veya ortam değişiklikleri seni şaşırtabiliyor.",
      tavsiye: "💡 Ne yapabilirsin: Antrenman maçlarında sadece rakibine değil, tüm sahaya bakmayı dene. Ne kadar çok şey fark ettiğini görünce şaşıracaksın."
    },
    red: {
      metin: "Sahada çevreni yeterince göremiyorsun. Sadece önündekilere odaklanıyorsun, rakibinin stratejisini okuyamıyorsun. Bu maçta sürprizlere karşı savunmasız kalmanı sağlıyor.",
      tavsiye: "💡 Ne yapabilirsin: Antrenman maçlarında sadece rakibine değil, tüm sahaya bakmayı dene. Antrenörüne 'sahayı daha iyi nasıl okurum?' diye sor."
    }
  },

  darDissal: {
    green: {
      metin: "Kritik anlarda tüm dikkatini bir noktaya toplayabiliyorsun. Rakibinle karşı karşıya geldiğinde başka hiçbir şey aklına gelmiyor, sadece o an var. Bu odak seni çok tehlikeli yapıyor.",
      tavsiye: "💡 Bunu korumak için: Bu odağı antrenmanlarda da uygula. Bir tekniği yaparken sadece o tekniğe odaklan."
    },
    orange: {
      metin: "Çoğu zaman iyi odaklanabiliyorsun ama bazen dikkatini dağıtan şeyler olabiliyor. Önemli anlarda genellikle toparlayabiliyorsun.",
      tavsiye: "💡 Ne yapabilirsin: Her tekme atmadan önce bir an dur ve sadece hedefe bak. Bu küçük duraksamayı alışkanlık haline getir."
    },
    orange2: {
      metin: "Kritik anlarda odaklanmakta zorlanıyorsun. Rakibinle karşı karşıya geldiğinde aklına başka şeyler gelebiliyor. Bu en önemli anlarda hata yapmanı sağlıyor.",
      tavsiye: "💡 Ne yapabilirsin: Her tekme atmadan önce bir an dur ve sadece hedefe bak. Zihnini sadece o ana getir."
    },
    red: {
      metin: "Önemli anlarda dikkatini toplayamıyorsun. Rakibinle karşı karşıya geldiğinde kafan dağılıyor, başka düşünceler geliyor. Bu maçın en kritik anlarını kaçırmanı sağlıyor.",
      tavsiye: "💡 Ne yapabilirsin: Her tekme atmadan önce bir an dur ve sadece hedefe bak. Antrenörüne 'odaklanmakta zorlanıyorum' de, birlikte çalışabilirsiniz."
    }
  },

  dikkatHatasi: {
    green: {
      metin: "Dikkatini çok iyi kontrol edebiliyorsun. Maç sırasında aklın dağılmıyor, hata yaptıktan sonra bile hızla toparlanıyorsun. Seyirci gürültüsü veya zorluklar seni etkilemiyor.",
      tavsiye: "💡 Bunu korumak için: Bu odağı korumak için her hatadan sonra 'oldu, geçti, bir sonrakine bak' de. Bu alışkanlığın seni diğerlerinden ayırıyor."
    },
    orange: {
      metin: "Genellikle dikkatini iyi koruyorsun ama öfkelendiğinde veya art arda hata yaptığında odağın biraz dağılabiliyor. Toparlanabiliyorsun ama zaman alıyor.",
      tavsiye: "💡 Ne yapabilirsin: Dikkatinin dağıldığını fark ettiğinde 'dur' de içinden ve bir derin nefes al. Sonra bir sonraki hamleye bak."
    },
    orange2: {
      metin: "Dikkatini kaybetmek senin için sık yaşanan bir durum. Bir hata yaptığında veya gürültülü bir ortamda odaklanmakta zorlanıyorsun. Bu maçta zincirleme hata yapmanı sağlayabiliyor.",
      tavsiye: "💡 Ne yapabilirsin: Dikkatinin dağıldığını fark ettiğinde 'dur' de içinden ve bir derin nefes al. Hata yaptıktan sonra eski hatayı değil bir sonraki hamleyi düşün."
    },
    red: {
      metin: "Dikkatini toplamakta ciddi zorlanıyorsun. Seyirciler, gürültü veya daha önce yaptığın bir hata aklında dolaşmaya devam ediyor. Maçta rakibine odaklanman gereken anlarda kafan başka yerlerde oluyor.",
      tavsiye: "💡 Ne yapabilirsin: Dikkatinin dağıldığını fark ettiğinde 'dur' de içinden ve bir derin nefes al. Antrenörüne bu durumu anlat, birlikte çalışabilirsiniz."
    }
  }

};

const ANTRENOR_PSIKO_ACIKLAMALAR = {

  kaygiGozlem: {
    green: {
      metin: "Sporcu maç öncesi ve maç sırasında sakin görünüyor. Gerginlik belirtileri yok, beden dili rahat ve kontrollü. Bu seviyedeki sakinlik yüksek performansla doğrudan ilişkili.",
      tavsiye: "💡 Antrenör notu: Bu durumu korumak için maç öncesi rutini aynı tut. Sporcu ne yapıyorsa işe yarıyor — değiştirme."
    },
    orange: {
      metin: "Sporcuda hafif kaygı belirtileri gözlemliyorsun. Zaman zaman gerginlik, huzursuzluk veya dikkat dağınıklığı olabiliyor ama maçı yönetebiliyorlar.",
      tavsiye: "💡 Antrenör notu: Maç öncesi kısa bir sohbet yap. 'Bugün nasılsın?' diye sor. Baskı uygulamak yerine güven ver. Isınma rutinini düzenli ve sakin tut."
    },
    orange2: {
      metin: "Belirgin kaygı belirtileri var. Maç öncesi aşırı hareketlilik, sessizleşme veya konsantrasyon güçlüğü gözlemliyorsun. Bu durum sahada hata oranını artırabilir.",
      tavsiye: "💡 Antrenör notu: Maç öncesi sporcuyu yalnız bırak, kalabalıktan uzaklaştır. Derin nefes egzersizi yaptır. 'Sen bunu yapabilirsin' yerine 'Şu an sadece bir sonraki hamleyi düşün' de."
    },
    red: {
      metin: "Ciddi kaygı belirtileri gözlemliyorsun. Sporcu maça odaklanamıyor, gerginlik fiziğine yansıyor ve performansı olumsuz etkileniyor. Bu durumda maçtan önce müdahale gerekebilir.",
      tavsiye: "💡 Antrenör notu: Sporcuyu sessiz bir yere al, 4-4-4 nefes tekniği uygulat (4 saniye al, 4 tut, 4 ver). 'Kaybetsek ne olur?' sorusu yerine 'Şu an yapman gereken tek şey ne?' diye sor. Bu durumun tekrarlanması halinde sporcu psikoloğuyla görüşmeyi düşün."
    }
  },

  gorevYonAnt: {
    green: {
      metin: "Sporcu antrenmanlarda gelişmeye ve öğrenmeye odaklı. Hata yaptığında öğrenme fırsatı olarak değerlendiriyor, rakibini yenmekten çok tekniğini geliştirmeye çalışıyor.",
      tavsiye: "💡 Antrenör notu: Bu yaklaşımı destekle. Maç sonrası 'Kazandın mı?' yerine 'Bugün ne öğrendin?' diye sor. Bu sporcu uzun vadede çok daha hızlı gelişecek."
    },
    orange: {
      metin: "Sporcu genel olarak gelişmeye odaklı ama zaman zaman sonuçlara takılabiliyor. Kaybettiğinde motivasyonu biraz düşebiliyor.",
      tavsiye: "💡 Antrenör notu: Maç sonrası değerlendirmelerde sonuçtan önce performansı konuş. 'Bugün x tekniğin çok iyiydi' gibi somut geri bildirimler ver."
    },
    orange2: {
      metin: "Sporcu çoğunlukla sonuç odaklı. Kaybettiğinde ya da beklentinin altında kaldığında motivasyon kaybı yaşıyor. Öğrenme sürecine sabrı düşük.",
      tavsiye: "💡 Antrenör notu: Her antrenman için küçük, ulaşılabilir hedefler koy. 'Bu hafta dolyo chagi'ni 2 tekrar artır' gibi. Küçük başarılar güven ve motivasyonu yavaş yavaş geliştirir."
    },
    red: {
      metin: "Sporcu neredeyse tamamen sonuç odaklı. Kaybetmek onu derinden etkiliyor, hata yaptığında çok sert tepki veriyor. Antrenmanı bir gelişim aracı olarak değil bir sınav olarak görüyor.",
      tavsiye: "💡 Antrenör notu: Yüksek baskılı ortamlardan kaçın. Hata yaptığında tepkin çok önemli — sakin kal, düzeltici geri bildirim ver. 'Yanlış yaptın' yerine 'Bir daha dene, şöyle ol' de."
    }
  },

  egoYonAnt: {
    green: {
      metin: "Sporcu başkalarından üstün görünme ihtiyacı hissetmiyor. Rekabet var ama sağlıklı sınırlar içinde. Kaybetmeyi kişisel bir yenilgi olarak almıyor.",
      tavsiye: "💡 Antrenör notu: Bu dengeyi koru. Aşırı rekabetçi ortamlar veya sürekli karşılaştırmalar bu dengeyi bozabilir."
    },
    orange: {
      metin: "Hafif ego yönelimi var. Zaman zaman rakibini yenmek veya takımda en iyi olmak önemli geliyor. Genellikle kontrol altında ama büyük maçlarda baskı yaratabilir.",
      tavsiye: "💡 Antrenör notu: Grup antrenmanlarında sporcuları kıyaslamaktan kaçın. Her sporcunun kendi gelişim eğrisini takip etmesini teşvik et."
    },
    orange2: {
      metin: "Ego yönelimi belirgin. Rakibinden iyi görünmek çok önemli. Kaybettiğinde ya da bir arkadaşı daha iyi performans gösterdiğinde sert tepkiler veriyor.",
      tavsiye: "💡 Antrenör notu: Takım içi sıralamalardan ve sürekli karşılaştırmalardan kaçın. Sporcuya kendi önceki performansıyla kıyaslama fırsatı ver. 'Geçen haftaki senin rekabetçin bu hafta sensin' anlayışını yerleştir."
    },
    red: {
      metin: "Çok yüksek ego yönelimi. Kaybetmek veya başkasının daha iyi olması bu sporcuyu ciddi şekilde etkiliyor. Antrenmanı bırakma, motivasyon kaybı veya takım içi çatışma riski var.",
      tavsiye: "💡 Antrenör notu: Bu sporcuyla birebir konuşmalar yap. 'Sen neden taekwondo yapıyorsun?' diye sor ve dinle. Uzun vadeli sporculuk kimliğini geliştirmeye odaklan. Gerekirse sporcu psikoloğuyla görüşmeyi öner."
    }
  },

  kontrolAnt: {
    green: {
      metin: "Sporcu zor anlarda kendini toparlamayı biliyor. Sayı yediğinde, hata yaptığında veya maç aleyhine döndüğünde paniklemeden devam edebiliyor.",
      tavsiye: "💡 Antrenör notu: Bu özelliği antrenmanlarında da pekiştir. Bilerek zorlu senaryolar yarat ve sporcunun sakin kalma pratiği yapmasına fırsat ver."
    },
    orange: {
      metin: "Çoğu zaman kendini kontrol edebiliyor ama çok baskılı anlarda sarsılabiliyor. Önemli maçlarda ya da art arda hata yaptığında dikkat dağılması yaşanabiliyor.",
      tavsiye: "💡 Antrenör notu: Antrenman sırasında yüksek baskı simülasyonları uygula. Örneğin 'Son 30 saniye, 2 puan gerideyiz' senaryoları ile alıştırmalar yap."
    },
    orange2: {
      metin: "Duygusal kontrol zorluğu var. Olumsuz anlarda tepkileri performansını etkiliyor. Sayı yediğinde veya hata yaptığında toparlanmak zaman alıyor.",
      tavsiye: "💡 Antrenör notu: Maç sırasında kısa 'reset' ritüelleri öğret. Mesela her sayı sonrası bir nefes alıp hazır pozisyona dönmek. Bu küçük ritüeller zamanla otomatikleşir."
    },
    red: {
      metin: "Ciddi duygusal kontrol güçlüğü gözlemliyorsun. Stresli anlarda performans belirgin şekilde düşüyor, tepkiler bazen aşırıya kaçabiliyor. Bu durum maç disiplinine de zarar verebilir.",
      tavsiye: "💡 Antrenör notu: Bu sporcuyla acele etme, baskı yapma. Küçük adımlarla ilerle. Nefes tekniklerini antrenmanın her günkü rutinine ekle. Sporcu psikoloğuyla görüşme ciddi bir seçenek olarak düşünülmeli."
    }
  },

  baglilikAnt: {
    green: {
      metin: "Sporcu antrenmanlarına kararlı ve tutarlı biçimde katılıyor. Zorlu seanslardan kaçmıyor, hedeflerine bağlı kalıyor. Bu tutarlılık performans gelişiminin en güvenilir göstergesi.",
      tavsiye: "💡 Antrenör notu: Bu bağlılığı ödüllendir — maddi değil, sözlü. 'Bugün çok kararlı çalıştın' gibi geri bildirimler motivasyonu korur."
    },
    orange: {
      metin: "Genel olarak bağlı ama zaman zaman antrenman kaçırma veya zorlu egzersizlerden çekilme eğilimi olabiliyor. Özellikle yorgun veya motivasyonu düşük dönemlerde dikkat gerekiyor.",
      tavsiye: "💡 Antrenör notu: Motivasyon düşüşü yaşadığında neden sorusunu sor. Bazen dış nedenler (okul stresi, aile durumu) antrenmana yansır. Anlayışlı ol ama hedefleri hatırlat."
    },
    orange2: {
      metin: "Bağlılık sorunları var. Antrenmanları sık atlıyor veya zorlu bölümlerde erken çıkıyor. Bu durum fiziksel gelişimi yavaşlatıyor ve teknik kalıcılığı engelliyor.",
      tavsiye: "💡 Antrenör notu: Kısa vadeli somut hedefler koy. Uzun vadeli hedefler bu sporcuya uzak geliyor olabilir. 'Bu hafta 3 antrenman' gibi mini hedefler daha etkili olabilir."
    },
    red: {
      metin: "Ciddi bağlılık eksikliği. Sporcunun antrenmanlarla bağı zayıf, motivasyon çok düşük. Bu hızla bir bırakma sürecine dönüşebilir.",
      tavsiye: "💡 Antrenör notu: Sporcu neden taekwondoda olduğunu unutmuş olabilir. Birebir bir konuşma yap — ne istiyor, neden burada, ne onu burada tutabilir? Cevapları dinle ve onlarla birlikte bir yol çiz."
    }
  },

  meyдanAnt: {
    green: {
      metin: "Sporcu zorlukları kucaklıyor. Zor antrenmanlar, güçlü rakipler veya yeni teknikler onu heyecanlandırıyor. Başarısızlıktan ders çıkarma kapasitesi yüksek.",
      tavsiye: "💡 Antrenör notu: Bu sporcuya daha zorlu görevler ver, rahat bölgesinin dışına çıkmasına fırsat yarat. Gelişimi hızlandırabilirsin."
    },
    orange: {
      metin: "Çoğunlukla zorluklara açık ama çok büyük engellerle karşılaşınca biraz çekilebiliyor. Başarısızlıkları her zaman yapıcı değerlendiremeyebiliyor.",
      tavsiye: "💡 Antrenör notu: Kaybedilen maçları sonra birlikte analiz et. 'Bugün nereyi geliştirmemiz gerekiyor?' sorusu 'Neden kaybettik?' sorusundan çok daha yapıcı."
    },
    orange2: {
      metin: "Zorluklardan kaçınma eğilimi belirgin. Zor antrenmanlardan, güçlü rakiplerden ya da yeni tekniklerden çekinebiliyor. Başarısızlık korkusu gelişimi yavaşlatıyor.",
      tavsiye: "💡 Antrenör notu: Küçük başarılar üzerine inşa et. Sporcuyu başarabileceği zorluklarla karşılaştır önce. Her küçük başarı meydan okuma cesaretini artırır."
    },
    red: {
      metin: "Zorluklardan belirgin şekilde kaçıyor. Zor antrenmanları, güçlü rakipleri veya hata yapma riskini içeren durumları aktif olarak reddediyor. Bu uzun vadede büyük bir gelişim engeli.",
      tavsiye: "💡 Antrenör notu: Baskı uygulama — daha da kaçmasına neden olur. Güvenli bir ortam yarat. Hata yaparken tepkin nasıl? Eğer sen de sert tepki veriyorsan bu korkuyu besliyor olabilirsin. Sabırla, adım adım."
    }
  },

  guvenAnt: {
    green: {
      metin: "Sporcu kendine güveniyor ve bu maça yansıyor. Zor anlarda bile 'yapabilirim' tutumunu koruyabiliyor. Hatalar onu uzun süre etkilemiyor.",
      tavsiye: "💡 Antrenör notu: Bu güveni besle. Sporcu iyi bir şey yaptığında hemen ve somut olarak söyle. Güven sürekli yenilenmesi gereken bir enerji kaynağı."
    },
    orange: {
      metin: "Genel olarak kendine güveniyor ama baskı anlarında veya art arda hata yaptığında sarsılabiliyor. Büyük maçlarda veya güçlü rakipler karşısında destek gerekebilir.",
      tavsiye: "💡 Antrenör notu: Maçtan önce kısa bir 'güç konuşması' yap. Sporcunun iyi yaptığı 2-3 şeyi hatırlat. Somut ve gerçek olmalı — abartı işe yaramaz."
    },
    orange2: {
      metin: "Kendine güven eksikliği performansını etkiliyor. Denemekten çekiniyor, teknik bildiği halde uygulamakta tereddüt ediyor. 'Yapamam' hissi sık geliyor.",
      tavsiye: "💡 Antrenör notu: Bu sporcuyu başarabileceği durumlarla sık buluştur. Her küçük başarıyı sesli olarak ödüllendir. Eleştirilerini sandviç tekniğiyle ver: iyi → gelişim alanı → iyi."
    },
    red: {
      metin: "Ciddi özgüven eksikliği gözlemliyorsun. Sporcu kendini çok olumsuz değerlendiriyor, her hatada derin bir hayal kırıklığına giriyor. Bu döngü kırılmazsa bırakma riski artıyor.",
      tavsiye: "💡 Antrenör notu: Performans değerlendirmelerini bir süre için tamamen durdur. Sadece 'sahaya çıkmak' ve 'denemek' üzerine odaklan. Sporcu psikoloğuyla görüşme bu noktada çok önemli."
    }
  },

  dikkatAnt: {
    green: {
      metin: "Sahada dikkat kalitesi yüksek. Rakibini iyi okuyor, çevresel değişimlere hızlı adapte oluyor. Hem geniş hem dar odaklanmayı gerektiğinde kullanabiliyor.",
      tavsiye: "💡 Antrenör notu: Bu özelliği taktik antrenmanlarıyla daha da geliştir. Çoklu uyaran içeren egzersizler ekle."
    },
    orange: {
      metin: "Dikkat kalitesi genel olarak iyi ama yorulduğunda veya stres altında odak dağılması olabiliyor. Uzun maçların sonunda ya da yüksek baskı altında tepki gecikmesi gözlemlenebiliyor.",
      tavsiye: "💡 Antrenör notu: Antrenmanın yorucu bölümlerine taktik egzersizler ekle. Yorgunluk altında dikkat pratiği maçın gerçek koşullarına hazırlar."
    },
    orange2: {
      metin: "Dikkat kontrolünde güçlük var. Sahada zaman zaman odağını kaybediyor, rakibinin hareketlerini kaçırabiliyor. Bu hem savunmada hem hücumda gecikmelere yol açıyor.",
      tavsiye: "💡 Antrenör notu: Kısa süreli yoğun odak egzersizleri ekle. Örneğin 'Sadece şu anda rakibinin sağ omzuna bak' gibi tek nokta odak çalışmaları dikkat kapasitesini artırır."
    },
    red: {
      metin: "Sahada dikkat kontrolü çok zayıf. Rakibinden bağımsız faktörler (seyirci, gürültü, önceki hata) sahaya yansıyor. Maç içi anlık kararlar tutarsız.",
      tavsiye: "💡 Antrenör notu: Dikkat sorunları bazen kaygı veya uyku ile ilişkili olabilir. Sporcunun genel yaşam durumunu da değerlendir. Antrenman dışında da gözlemle. Gerekirse profesyonel destek öner."
    }
  },

  dikkatBozAnt: {
    green: {
      metin: "Sahada dikkat bozukluğu gözlemlemiyorsun. Sporcu maç sırasında dış etkenlere rağmen odağını koruyabiliyor. Hata sonrası toparlanma hızlı.",
      tavsiye: "💡 Antrenör notu: Bu konsantrasyonu korumak için maç öncesi rutini istikrarlı tut. Rutin bozulursa odak da bozulabilir."
    },
    orange: {
      metin: "Ara sıra dikkat bozulması oluyor. Özellikle hata sonrası ya da seyirci tepkilerine karşı zaman zaman odak kaybı yaşıyor. Genellikle toparlanabiliyor.",
      tavsiye: "💡 Antrenör notu: Maç sırasında köşe molalarında kısa ve net talimatlar ver. Uzun açıklamalar dikkat dağıtır. 'Sol tekme, sağ açı' gibi kısa komutlar daha etkili."
    },
    orange2: {
      metin: "Dikkat bozukluğu maçı etkiliyor. Hata yaptıktan sonra o hatayı kovalıyor, bir sonraki hamleye geçemez oluyor. Gürültülü ortamlar veya yoğun seyirci baskısı performansı olumsuz etkiliyor.",
      tavsiye: "💡 Antrenör notu: 'Oldu, bitti, şimdi ne?' tekniğini öğret. Hata yaptığında sporcuya baktığında başını sallama veya kısa bir jest yap — bu 'reset' sinyali işe yarar."
    },
    red: {
      metin: "Ciddi dikkat bozukluğu. Bir hata tüm maçı etkiliyor. Seyirci, gürültü veya rakibin provokasyonları odağı tamamen dağıtabiliyor. Bu sahada zincirleme hataya dönüşüyor.",
      tavsiye: "💡 Antrenör notu: Bu sporcuyu önce düşük baskılı ortamlarda yarıştır. Kalabalık ve yüksek baskılı ortamlara kademeli olarak alıştır. Sporcu psikoloğu bu konuda somut teknikler öğretebilir."
    }
  }

};

// ── YARIŞMA TAKVİMİ ──────────────────────────────────────────────────────
async function yarismalariGetir() {
  const rows = await sbFetch('yarisma_takvimi?order=tarih.asc');
  return rows || [];
}

async function yarismaSil(id) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/yarisma_takvimi?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  if (!r.ok) throw new Error('Silme hatası');
}

async function yarismaEkle(veri) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/yarisma_takvimi', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(veri)
  });
  if (!r.ok) throw new Error('Ekleme hatası');
  return await r.json();
}

// ── BİLEŞİK SAHA PERFORMANS SKORLARI ─────────────────────────────────────

function sahaPerfSkorlari(p) {
  if (!p) return null;
  // p: psikolojiPuanlari() çıktısı
  // Tüm değerler 1-5 veya 1-36 arasında — normalize ediyoruz 0-1'e
  var bk = (p.bilisselKaygi || 0) / 36;  // yüksek = kötü
  var sk = (p.somatikKaygi  || 0) / 36;  // yüksek = kötü
  var og = (p.ozguven        || 0) / 36;  // yüksek = iyi
  var gy = (p.gorevYon       || 0) / 5;   // yüksek = iyi
  var ey = (p.egoYon         || 0) / 5;   // yüksek = kötü
  var mk = (p.kontrol        || 0) / 5;   // yüksek = iyi
  var mb = (p.baglilik       || 0) / 5;   // yüksek = iyi
  var mm = (p.meydan         || 0) / 5;   // yüksek = iyi
  var mg = (p.guven          || 0) / 5;   // yüksek = iyi
  var gd = (p.genisDissal    || 0) / 5;   // yüksek = iyi
  var dd = (p.darDissal      || 0) / 5;   // yüksek = iyi
  var dh = (p.dikkatHatasi   || 0) / 5;   // yüksek = kötü

  // Her skor 0-100 arası — düşük = risk/zayıf, yüksek = iyi
  return {
    vurmaInhibisyon:   Math.round((sk * 0.5 + (1 - og) * 0.5) * 100),         // düşük iyi
    gucluRakipCekilme: Math.round((bk * 0.4 + (1-mm) * 0.3 + (1-og) * 0.3) * 100), // düşük iyi
    yuzSonrasiCokus:   Math.round((dh * 0.5 + (1 - mk) * 0.5) * 100),         // düşük iyi
    erkenTukenme:      Math.round(((1-mb) * 0.5 + sk * 0.5) * 100),           // düşük iyi
    motivasyonKirilma: Math.round((ey * 0.5 + (1 - mg) * 0.5) * 100),         // düşük iyi
    taktikOkuma:       Math.round((gd * 0.4 + dd * 0.4 + (1-dh) * 0.2) * 100), // yüksek iyi
    basincPerformans:  Math.round((mk * 0.4 + mg * 0.3 + mm * 0.3) * 100),    // yüksek iyi
    uzunVadePotansiyel:Math.round((gy * 0.4 + mb * 0.3 + mm * 0.3) * 100),    // yüksek iyi
    macIciDayaniklilik:Math.round((mk * 0.4 + (1-dh) * 0.3 + mg * 0.3) * 100), // yüksek iyi
    rekabetciHazirlik: Math.round((og * 0.4 + (1-bk) * 0.3 + (1-sk) * 0.3) * 100) // yüksek iyi
  };
}

// Risk skorları için renk (risk = düşük iyi, potansiyel = yüksek iyi)
function sahaSkorRenk(skor, ters) {
  var v = ters ? (100 - skor) : skor;
  if (v >= 70) return 'green';
  if (v >= 50) return 'orange';
  return 'red';
}

const SAHA_PERF_ANTRENOR = {
  vurmaInhibisyon: {
    baslik: '⚡ Vurma İnhibisyonu Riski',
    ters: true,
    green:  { metin: "Sporcu maçta tam güçle vurabiliyor, kendini frenlemiyor. Teknik ve fizik sahaya yansıyor.", tavsiye: "💡 Bu dengeyi koru. Gereksiz baskı bu özgürlüğü bozabilir." },
    orange: { metin: "Zaman zaman tam güçle gitmiyor. Antrenmanla rakibine karşı da aynı gücü çıkarabilir.", tavsiye: "💡 Kontrollu sparring'de 'tam git' komutu ver ve tekrarla. Her vuruşta ödüllendir." },
    red:    { metin: "Teknik olarak iyi vurabiliyorsunuz ama maçta kendini frenleniyor. Kasları gergin, tam güce izin vermiyor. Fizik var, cesaret eksik.", tavsiye: "💡 Antrenmanlarında punta torbasına tam güçle vurdur, sonra aynı komutu sparring'e taşı. 'Vur, git, kork' döngüsünü kır." }
  },
  gucluRakipCekilme: {
    baslik: '🛡 Güçlü Rakip Çekilme Riski',
    ters: true,
    green:  { metin: "Güçlü rakiple karşılaşınca çekilmiyor, zorlukla yüzleşiyor. Rekabetçi ortamda istikrarlı.", tavsiye: "💡 Büyük maçlara sok, bu sporcu baskıdan güç alıyor." },
    orange: { metin: "Bazı güçlü rakipler karşısında biraz pasifleşiyor ama toparlayabiliyor.", tavsiye: "💡 Antrenmanlarında daha güçlü sporcularla eşleştir. Her seferinde 'bugün ne öğrendin?' diye sor." },
    red:    { metin: "Kendi seviyesindeki rakiplere karşı iyi ama güçlü biri çıktığında içe kapanıyor. Bekleme, uzaklaşma ve pasif kalma başlıyor. Kaybetmekten değil, rakipten korkuyor.", tavsiye: "💡 Kasıtlı olarak daha güçlü sporcularla eşleştir. Skora değil öğrenmeye odaklan. 'Bu rakipten ne çalabilirsin?' diye sor." }
  },
  yuzSonrasiCokus: {
    baslik: '🔄 Yüz Sonrası Çöküş Riski',
    ters: true,
    green:  { metin: "Tekme yedikten sonra hızla toparlanıyor. Zincirleme hata riski düşük, maç boyunca istikrarlı.", tavsiye: "💡 Bu toparlanma kapasitesini pekiştir. Bilerek hatalı durumlar yarat, toparlanma pratiği yaptır." },
    orange: { metin: "Bazen hatadan sonra odağı dağılıyor ama kısa sürede toparlanabiliyor.", tavsiye: "💡 Maç sırasında her puan sonrası kısa bir sinyal ver. El hareketi ya da kısa söz — 'geçti, devam' anlamına gelsin." },
    red:    { metin: "Tekme yediğinde veya hata yaptığında o anı zihninde tekrar tekrar yaşıyor. Bir sonraki hamleyi düşünmesi gerekirken önceki hatayı düşünüyor. Zincirleme hata buradan geliyor.", tavsiye: "💡 Her puan sonrası sporcuya bir reset sinyali ver. Maç sırasında köşe molalarında 'oldu, bitti, şimdi ne?' tekniğini öğret." }
  },
  erkenTukenme: {
    baslik: '🔋 Erken Tükenme Riski',
    ters: true,
    green:  { metin: "Zor anlarda devam ediyor, maç sonuna kadar aynı kararlılıkla savaşıyor.", tavsiye: "💡 Bu bağlılığı ödüllendir. 'Bugün çok kararlı çalıştın' gibi geri bildirimler motivasyonu korur." },
    orange: { metin: "Çoğunlukla devam ediyor ama aşırı zorlandığında pes etme isteği baş gösterebiliyor.", tavsiye: "💡 Bitirebileceği ama zor antrenmanlar ver. Her bitişte 'yaptın' de — küçük zaferler direnci artırır." },
    red:    { metin: "Maçın başında iyi başlıyor ama zorlandığında devam etme isteği kırılıyor. Antrenmanların zor bölümlerinden de erken çıkıyor olabilir. Kritik anlarda bu risk sahaya yansır.", tavsiye: "💡 Kısa vadeli hedefler koy. 'Bu seti bitir' gibi. Uzun vadeli hedefler bu sporcuya uzak geliyor. Küçük adımlarla ilerle." }
  },
  motivasyonKirilma: {
    baslik: '💥 Motivasyon Kırılganlığı Riski',
    ters: true,
    green:  { metin: "Kazanma-kaybetme döngüsünden bağımsız motivasyonunu koruyabiliyor. Sağlıklı rekabet anlayışı var.", tavsiye: "💡 Takım içi sıralamalardan kaçın. Bu dengeyi bozmamak önemli." },
    orange: { metin: "Kaybetince biraz sarsılıyor ama toparlanabiliyor. Dikkatli yönetim gerekiyor.", tavsiye: "💡 Maç sonrası değerlendirmelerde kazanma-kaybetmeden önce performansı konuş." },
    red:    { metin: "Kazandığında çok iyi hissediyor, kaybettiğinde veya birinin daha iyi olduğunu gördüğünde tamamen çöküyor. Turnuvada ilk yenilgiden sonra toparlanamayabilir.", tavsiye: "💡 Maç sonrası 'bugün ne iyi yaptın?' ile başla. Performansı skora bağlama. Bu sporcuyla birebir konuşmalar yap." }
  },
  taktikOkuma: {
    baslik: '👁 Taktik Okuma Kapasitesi',
    ters: false,
    green:  { metin: "Sahayı çok iyi okuyor. Rakibini takip ediyor, açıkları fark ediyor, değişikliklere hızlı uyum sağlıyor. Taktik antrenmanlardan çok verim alır.", tavsiye: "💡 Bu sporcuya taktik sorumluluk ver. 'Rakibinin zayıf tarafı neydi?' diye sor — cevabı seni şaşırtabilir." },
    orange: { metin: "Genel olarak iyi takip ediyor ama yoğun anlarda odak dağılabiliyor.", tavsiye: "💡 Antrenmanın yorucu bölümlerine taktik egzersizler ekle. Yorgunluk altında dikkat pratiği yaptır." },
    red:    { metin: "Sahayı okumakta zorlanıyor. Sadece önüne bakıyor, rakibinin stratejisini kaçırıyor. Sürprizlere karşı savunmasız kalıyor.", tavsiye: "💡 Kısa süreli yoğun odak egzersizleri ekle. 'Rakibinin sağ omzuna bak' gibi tek nokta odak çalışmaları dikkat kapasitesini artırır." }
  },
  basincPerformans: {
    baslik: '🏆 Baskı Altında Performans',
    ters: false,
    green:  { metin: "Kritik anlarda dağılmıyor. Final maçında, sayı geride olduğunda, seyirci baskısında da aynı sporcuyu görürsün.", tavsiye: "💡 Bu sporcuyu büyük maçlara sok. Baskıdan kaçınma — baskı bu sporcuyu daha iyi yapıyor." },
    orange: { metin: "Çoğu baskı durumunda iyi ama çok yüksek stres anlarında biraz sarsılabiliyor.", tavsiye: "💡 Antrenmanlarında yüksek baskı simülasyonları uygula. 'Son 30 saniye, 2 puan gerideyiz' senaryoları yaptır." },
    red:    { metin: "Baskı altında performansı düşüyor. Kritik anlarda hata oranı artıyor, karar verme güçleşiyor.", tavsiye: "💡 Önce düşük baskılı ortamlarda güven oluştur. Kademeli olarak baskıyı artır. Acele etme." }
  },
  uzunVadePotansiyel: {
    baslik: '🌱 Uzun Vadeli Sporcu Potansiyeli',
    ters: false,
    green:  { metin: "Doğru nedenden taekwondo yapıyor — öğrenmek için. Zorluklardan kaçmıyor, antrenmanlara bağlı. Şu an en iyi olmasa bile en hızlı gelişen bu olacak.", tavsiye: "💡 Bu sporcuya zaman ayır. Zor teknikler öğret, sabırla ilerle. Verdiğin her şey geri dönecek." },
    orange: { metin: "Genel olarak gelişmeye açık ama bazı dönemler motivasyonu dalgalanabiliyor.", tavsiye: "💡 Her antrenman için küçük hedefler koy. Küçük başarılar uzun vadeli bağlılığı besler." },
    red:    { metin: "Şu an gelişime kapalı görünüyor. Sonuç odaklı yaklaşım veya düşük bağlılık uzun vadeli gelişimi engelliyor.", tavsiye: "💡 Neden taekwondo yaptığını konuş. Temeli yeniden kur. Zorlamak işe yaramaz, içsel motivasyonu bul." }
  },
  macIciDayaniklilik: {
    baslik: '💪 Maç İçi Zihinsel Dayanıklılık',
    ters: false,
    green:  { metin: "Maç boyunca istikrarlı. İlk raund nasılsa son raund da öyle. Hata yaptığında toparlanıyor, baskı altında dağılmıyor. Maçı bitirme kapasitesi yüksek.", tavsiye: "💡 Bu özelliği koru. Gereksiz eleştiri ve baskı bu dengeyi bozabilir." },
    orange: { metin: "Çoğunlukla istikrarlı ama uzun ve çekişmeli maçlarda son rauntta biraz düşüş yaşanabiliyor.", tavsiye: "💡 Uzun süreli baskı altında sparring antrenmanları yap. Maç süresi boyunca dayanıklılık pratiği." },
    red:    { metin: "Maç başı ile maç sonu arasında belirgin fark var. Zorlandıkça mental kalitesi düşüyor, hatalar artıyor.", tavsiye: "💡 Reset teknikleri öğret. Her puan sonrası bir nefes al, hazır pozisyona dön ritüelini oturtun." }
  },
  rekabetciHazirlik: {
    baslik: '🎯 Rekabetçi Hazırlık',
    ters: false,
    green:  { metin: "Bu sporcu maça hazır çıkıyor. Kafası sakin, vücudu rahat, kendine inanıyor. Maç öncesi en verimli durumda.", tavsiye: "💡 Maç öncesi rutinini bozma. Ne yapıyorsa işe yarıyor — değiştirme." },
    orange: { metin: "Çoğunlukla hazır ama büyük maçlarda ya da önemli rakipler karşısında gerginlik artıyor.", tavsiye: "💡 Büyük maç öncesi rutini standartlaştır. Isınma, müzik, nefes — hep aynı şekilde." },
    red:    { metin: "Maça gergin çıkıyor. Hem kafası hem vücudu maça başlamadan yorulmuş durumda. Bu maç başlamadan alınan bir handikap.", tavsiye: "💡 Maç öncesi saatlerde ne yapıyor? Rutini incele. Sessiz kalma, müzik, hafif hareket — neyin işe yaradığını bul." }
  }
};

const SAHA_PERF_SPORCU = {
  vurmaInhibisyon: {
    baslik: '⚡ Tam Güçle Vurma',
    ters: true,
    green:  { metin: "Maçta kendini tutmuyorsun, tam güçle vurabiliyorsun. Bu çok iyi.", tavsiye: "💡 Bunu koru. Her antrenman aynı özgürlükle çalış." },
    orange: { metin: "Bazen maçta tam güçle gitmediğini hissedebilirsin. Bu alışkanlıkla düzelir.", tavsiye: "💡 Antrenmanlarında her vuruşta 'tam git' de kendine. Bunu tekrarladıkça maçta da otomatik olur." },
    red:    { metin: "Teknik olarak iyi vurabiliyorsun ama maçta kendini frenliyor olabilirsin. Vücudun geri çekiyor, tam güce izin vermiyor. Bu fizik sorunu değil, alışkanlık sorunu.", tavsiye: "💡 Antrenmanında her vuruşta 'tam git' de kendine. Bunu tekrarladıkça maçta da otomatik hale gelir." }
  },
  gucluRakipCekilme: {
    baslik: '🛡 Güçlü Rakiple Başa Çıkma',
    ters: true,
    green:  { metin: "Güçlü rakiple karşılaşınca çekilmiyorsun. Zorlukla yüzleşebiliyorsun — bu çok değerli.", tavsiye: "💡 Büyük maçlardan kaçma. Bu özelliğin seni daha da güçlü yapar." },
    orange: { metin: "Çoğu rakiple iyi başa çıkıyorsun ama bazı güçlü sporcular karşısında biraz pasifleşebiliyorsun.", tavsiye: "💡 O rakibi değil sadece ilk hamleyi düşün. Sadece ilki — sonrası gelir." },
    red:    { metin: "Güçlü ya da daha önce seni yenmiş biriyle karşılaşınca içine kapandığını fark ediyor olabilirsin. Bu normal bir his — ama bu his seni sahada durdurmasın.", tavsiye: "💡 O rakibi düşünmek yerine sadece ilk hamleyi düşün. Sadece ilki. Sonrası kendiliğinden gelir." }
  },
  yuzSonrasiCokus: {
    baslik: '🔄 Tekme Yedikten Sonra Toparlanma',
    ters: true,
    green:  { metin: "Tekme yedikten sonra hızlıca toparlanabiliyorsun. Zincirleme hata yapmıyorsun.", tavsiye: "💡 Bu gücünü bil. Rakibin seni sarsmak isteyecek — ama sen toparlanıyorsun." },
    orange: { metin: "Genellikle toparlanabiliyorsun ama bazen bir hata diğerini tetikleyebiliyor.", tavsiye: "💡 Hata yaptığında hemen bir nefes al ve bir sonraki hamleye bak. Geçmişe değil ileriye." },
    red:    { metin: "Bir tekme yediğinde o anı kafanda tekrar tekrar oynatıyor olabilirsin. Bir sonraki hamleyi düşünmen gerekirken önceki hatayı düşünüyorsun. Zincirleme hata buradan geliyor.", tavsiye: "💡 Yedikten hemen sonra bir derin nefes al ve 'bitti, şimdi ne?' de. Geçmişe değil bir sonraki hamleye bak." }
  },
  erkenTukenme: {
    baslik: '🔋 Maçı Sonuna Kadar Götürme',
    ters: true,
    green:  { metin: "Maçın zor anlarında da devam ediyorsun. Son raundda da ilk raunddaki gibisini.", tavsiye: "💡 Bu dayanıklılığın rakibine karşı büyük avantaj. Son raundu sen kazanırsın." },
    orange: { metin: "Genellikle devam ediyorsun ama çok zorlandığında pes etme isteği gelebiliyor.", tavsiye: "💡 Zor antrenmanların zorlu yerinde 'sadece 30 saniye daha' de. Bu alışkanlık maçta seni ayakta tutar." },
    red:    { metin: "Maçın başında iyi başlıyorsun ama zorlandığında devam etme isteğin kırılabiliyor. Bu seni son rauntta zayıf bırakır.", tavsiye: "💡 Antrenmanların zor yerlerinde 'sadece 30 saniye daha' de kendine. Bu alışkanlık maçta seni ayakta tutar." }
  },
  motivasyonKirilma: {
    baslik: '💥 Kaybedince Toparlanma',
    ters: true,
    green:  { metin: "Kaybettiğinde çökmüyorsun. Kazanma-kaybetme seni sarsmıyor, devam ediyorsun.", tavsiye: "💡 Bu sağlıklı yaklaşımı koru. Her kayıp bir ders — sen bunu zaten biliyorsun." },
    orange: { metin: "Kaybedince biraz sarsılıyorsun ama toparlanabiliyorsun.", tavsiye: "💡 Kaybettiğinde kendine sor: 'Bugün ne öğrendim?' Skoru değil, öğrendiğini say." },
    red:    { metin: "Kaybettiğinde ya da birinin senden iyi olduğunu gördüğünde motivasyonun çok düşüyor olabilir. Bu seni kırılgan yapıyor.", tavsiye: "💡 Her maçtan sonra kendine sor: 'Bugün ne iyi yaptım?' Skoru değil, performansını değerlendir." }
  },
  taktikOkuma: {
    baslik: '👁 Sahayı Okuma',
    ters: false,
    green:  { metin: "Sahada çok iyi görüyorsun. Rakibini okuyabilir, açıkları fark edebilirsin. Bu çok değerli bir özellik.", tavsiye: "💡 Maç sırasında rakibinin hangi tarafının zayıf olduğunu gözlemle. Sonra antrenörüne söyle." },
    orange: { metin: "Genel olarak iyi takip ediyorsun ama çok hızlı tempoda dikkat dağılabiliyor.", tavsiye: "💡 Maçta sadece rakibinin omuzlarına bak. Omuzlar nereye giderse vücut oraya gider." },
    red:    { metin: "Sahada sadece önüne bakıyor olabilirsin. Rakibinin stratejisini kaçırıyorsun, sürprizlere hazırlıksız kalıyorsun.", tavsiye: "💡 Antrenman maçlarında sadece rakibine değil tüm sahaya bakmayı dene. Ne kadar çok şey fark ettiğini göreceksin." }
  },
  basincPerformans: {
    baslik: '🏆 Baskı Altında Kalite',
    ters: false,
    green:  { metin: "Zor anlarda dağılmıyorsun. Final maçında da ilk maçtaki gibisini. Bu çok az sporcuda olan bir özellik.", tavsiye: "💡 Büyük maçlardan kaçma. O anlar seni daha da güçlü yapar." },
    orange: { metin: "Çoğu baskıda iyi ama çok yüksek stres anlarında biraz sarsılabiliyor.", tavsiye: "💡 Baskı anında sadece bir sonraki hamleye odaklan. Skoru, seyirciyi, rakibi unut — sadece bir hamle." },
    red:    { metin: "Baskı altında performansın düşüyor. Kritik anlarda hata yapma ihtimalin artıyor.", tavsiye: "💡 Baskı anında bir derin nefes al ve kafanda 'ben hazırım' de. Bunu antrenmanlarında da pratik yap." }
  },
  uzunVadePotansiyel: {
    baslik: '🌱 Gelişim Potansiyelin',
    ters: false,
    green:  { metin: "Öğrenmek için taekwondo yapıyorsun ve zorluklardan kaçmıyorsun. Şu an en iyi olmasan bile en hızlı gelişen sen olacaksın.", tavsiye: "💡 Sabırlı ol. Her antrenman seni bir adım ilerletiyor, bunu hissetmesen bile." },
    orange: { metin: "Genel olarak gelişmeye açıksın ama bazı dönemler motivasyonun dalgalanıyor.", tavsiye: "💡 Her antrenman sonrası küçük bir hedef koy. Küçük başarılar seni ilerletiyor." },
    red:    { metin: "Şu an gelişime biraz kapalı görünüyorsun. Sonuçlara çok takılıyor, süreci kaçırıyor olabilirsin.", tavsiye: "💡 Kazanmayı değil öğrenmeyi hedefle. 'Bugün ne yeni şey denedim?' diye sor kendine." }
  },
  macIciDayaniklilik: {
    baslik: '💪 Maç Boyunca İstikrar',
    ters: false,
    green:  { metin: "Maç boyunca istikrarlısın. İlk raunddaki sen, son raunddaki sensin. Rakibin yorulurken sen hâlâ güçlüsün.", tavsiye: "💡 Bu gücünü bil. Son raundu sen kazanırsın — sabırla bekle." },
    orange: { metin: "Çoğunlukla istikrarlısın ama uzun maçlarda son rauntta hafif düşüş yaşanabiliyor.", tavsiye: "💡 Son raundu kafanda en önemli raund olarak belirle. Orada en iyini ver." },
    red:    { metin: "Maç başı ile maç sonu arasında belirgin fark var. Zoruldukça kaliten düşüyor.", tavsiye: "💡 Her tekme yediğinde veya hata yaptığında hemen bir nefes al ve 'devam' de. Ritim kırılmasın." }
  },
  rekabetciHazirlik: {
    baslik: '🎯 Maça Hazırlık',
    ters: false,
    green:  { metin: "Maça hazır çıkıyorsun. Kafan sakin, vücudun rahat, kendine inanıyorsun. Bu her sporcuda olmaz.", tavsiye: "💡 Maç öncesi ne yapıyorsan devam et. İşe yarıyor." },
    orange: { metin: "Çoğunlukla hazır çıkıyorsun ama büyük maçlarda gerginlik artabiliyor.", tavsiye: "💡 Maç öncesi rutinini standartlaştır. Hep aynı şeyleri yap — vücudun bunu tanıdık hissedecek." },
    red:    { metin: "Maça gergin çıkıyorsun. Hem kafan hem vücudun maça başlamadan yorulmuş. Bu maç başlamadan alınan bir handikap.", tavsiye: "💡 Maç öncesi 4 saniye nefes al, 4 saniye tut, 4 saniye ver. Bunu 5 kez tekrarla. Vücudun sakinleşir." }
  }
};

// ── LİNK KÜTÜPHANESİ ─────────────────────────────────────────────────────
async function linkleriGetir() {
  var rows = await sbFetch('link_kutuphane?order=olusturma_tarihi.desc');
  return rows || [];
}
async function linkEkle(veri) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/link_kutuphane', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(veri)
  });
  if (!r.ok) throw new Error('Link eklenemedi');
  return await r.json();
}
async function linkSil(id) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/link_kutuphane?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  if (!r.ok) throw new Error('Link silinemedi');
}

// ── SİLME FONKSİYONLARI ──────────────────────────────────────────────────
async function motorikTestSil(id) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/motorik_testler?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  if (!r.ok) throw new Error('Test silinemedi');
}

async function anketSil(id) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/psikoloji_anketler?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  if (!r.ok) throw new Error('Anket silinemedi');
}

async function antrenorAnketSil(id) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/antrenor_psikoloji?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  if (!r.ok) throw new Error('Gözlem silinemedi');
}

async function sporcuSil(id) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/sporcular?id=eq.' + id, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  if (!r.ok) throw new Error('Sporcu silinemedi');
}

// ── BESLENME ──────────────────────────────────────────────────────────────
async function beslenmeGetir(sporcuId, tarih) {
  var rows = await sbFetch('beslenme_gunluk?sporcu_id=eq.' + sporcuId + '&tarih=eq.' + tarih);
  return rows && rows[0] ? rows[0] : null;
}

async function beslenmeGecmisGetir(sporcuId) {
  var rows = await sbFetch('beslenme_gunluk?sporcu_id=eq.' + sporcuId + '&order=tarih.desc&limit=14');
  return rows || [];
}

async function beslenmeKaydet(sporcuId, tarih, veri) {
  // Önce var mı kontrol et
  var mevcut = await beslenmeGetir(sporcuId, tarih);
  var url = SUPABASE_URL + '/rest/v1/beslenme_gunluk';
  var method = 'POST';
  if (mevcut) {
    url += '?id=eq.' + mevcut.id;
    method = 'PATCH';
  }
  var r = await fetch(url, {
    method: method,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(Object.assign({ sporcu_id: sporcuId, tarih: tarih }, veri))
  });
  if (!r.ok) throw new Error('Beslenme kaydedilemedi');
  return await r.json();
}

// Abur cubur listesi
const ABUR_CUBUR = ['cips','çips','kola','cola','çikolata','cikolata','gofret',
  'fast food','hamburger','pizza','patates kızartması','şeker','şekerleme',
  'bisküvi','hazır meyve suyu','enerji içeceği','dondurma','waffle','kraker'];

function aburCuburTespitEt(metin) {
  if (!metin) return [];
  var kucuk = metin.toLowerCase();
  return ABUR_CUBUR.filter(function(k) { return kucuk.includes(k); });
}

// Protein içeriği değerlendir
const PROTEIN_KAYNAKLAR = ['yumurta','et','tavuk','balık','balik','ton','peynir',
  'yoğurt','yogurt','süt','sut','kuru fasulye','mercimek','nohut','köfte','kiyma'];

function proteinPuanHesapla(metin) {
  if (!metin) return 0;
  var kucuk = metin.toLowerCase();
  var bulunan = PROTEIN_KAYNAKLAR.filter(function(k) { return kucuk.includes(k); });
  if (bulunan.length >= 3) return 3;
  if (bulunan.length >= 2) return 2;
  if (bulunan.length >= 1) return 1;
  return 0;
}

// Günlük kalori hedefi hesapla
function kaloriHedefiHesapla(sporcu, antrenmanGunu) {
  var kilo = sporcu.kilo_kg || 55;
  var boy = sporcu.boy_cm || 160;
  var yas = yasHesapla(sporcu.dogum_tarihi) || 14;
  var cin = sporcu.cinsiyet || 'Erkek';
  var profil = sporcu.beslenme_profil || 'koru';

  // Harris-Benedict bazal metabolizma
  var bmr;
  if (cin === 'Erkek') {
    bmr = 88.4 + (13.4 * kilo) + (4.8 * boy) - (5.7 * yas);
  } else {
    bmr = 447.6 + (9.2 * kilo) + (3.1 * boy) - (4.3 * yas);
  }

  // Antrenman çarpanı
  var carpan = antrenmanGunu ? 1.6 : 1.3;
  var tdee = Math.round(bmr * carpan);

  // Profile göre ayarla
  if (profil === 'ver') {
    return { hedef: tdee - 400, min: tdee - 600, max: tdee - 200, aciklama: 'Kilo verme modu' };
  } else if (profil === 'ust_siklet') {
    return { hedef: tdee + 200, min: tdee, max: tdee + 400, aciklama: 'Güç kazanım modu' };
  } else {
    return { hedef: tdee, min: tdee - 200, max: tdee + 200, aciklama: 'Kilo koruma modu' };
  }
}

// ── YEMEK & MİKTAR LİSTESİ ───────────────────────────────────────────────
async function yemekListesiGetir() {
  return await sbFetch('yemek_listesi?order=kategori.asc,ad.asc') || [];
}
async function yemekEkle(ad, kalori, kategori) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/yemek_listesi', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({ ad: ad, kalori_tabak: kalori || null, kategori: kategori || 'diger' })
  });
  if (!r.ok) throw new Error('Yemek eklenemedi');
  return await r.json();
}
async function miktarListesiGetir() {
  return await sbFetch('miktar_listesi?order=ad.asc') || [];
}

// ── YARIŞMA-SPORCU BAĞLANTISI ─────────────────────────────────────────────
async function yarismaSporcularGetir(yarismaId) {
  return await sbFetch('yarisma_sporcu?yarisma_id=eq.' + yarismaId + '&select=sporcu_id') || [];
}
async function yarismaSporcuEkle(yarismaId, sporcuId) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/yarisma_sporcu', {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json' },
    body: JSON.stringify({ yarisma_id: yarismaId, sporcu_id: sporcuId })
  });
  if (!r.ok && r.status !== 409) throw new Error('Eklenemedi');
}
async function yarismaSporcuSil(yarismaId, sporcuId) {
  await fetch(SUPABASE_URL + '/rest/v1/yarisma_sporcu?yarisma_id=eq.' + yarismaId + '&sporcu_id=eq.' + sporcuId, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
}
async function yarismaGuncelle(id, veri) {
  var r = await fetch(SUPABASE_URL + '/rest/v1/yarisma_takvimi?id=eq.' + id, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json' },
    body: JSON.stringify(veri)
  });
  if (!r.ok) throw new Error('Güncellenemedi');
}

// Sporcu beslenme özeti (antrenör için)
async function sporcuBeslenmeOzetiGetir(sporcuId) {
  return await sbFetch('beslenme_gunluk?sporcu_id=eq.' + sporcuId + '&order=tarih.desc&limit=7') || [];
}
