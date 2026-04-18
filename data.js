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
