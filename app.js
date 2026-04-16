const SB_URL='https://jyqogzzklpwwixhoyunf.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5cW9nenprbHB3d2l4aG95dW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzg3NjgsImV4cCI6MjA5MTg1NDc2OH0.dL82bDsnCIhLkxqflLzwDADsAwgwHwyTj2KawH639w0';
const ADMIN_SIFRE='taekwondo2024';
const sb=supabase.createClient(SB_URL,SB_KEY);
const RENKLER=['#e63946','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#db2777'];

const NORMLAR={
  uzun_atlama:{ad:'Uzun Atlama',birim:'cm',E_1012:140,K_1012:130,E_1314:155,K_1314:143,E_1516:168,K_1516:152,dusuk_iyi:false,egz:'Box Jump, Squat Jump, Lunge Jump',sik:'Haftada 3x · 3x8-10 tekrar'},
  saglik_topu:{ad:'Sağlık Topu',birim:'cm',E_1012:350,K_1012:290,E_1314:420,K_1314:340,E_1516:490,K_1516:380,dusuk_iyi:false,egz:'Med-Ball Fırlatma, Push Press',sik:'Haftada 3x · 3x8 tekrar'},
  mekik_30sn:{ad:'30sn Mekik',birim:'tekrar',E_1012:18,K_1012:16,E_1314:22,K_1314:19,E_1516:26,K_1516:22,dusuk_iyi:false,egz:'Mekik, Plank, Russian Twist',sik:'Haftada 3x · 3x20-25'},
  sprint_30m:{ad:'30m Sprint',birim:'sn',E_1012:5.4,K_1012:5.8,E_1314:5.0,K_1314:5.4,E_1516:4.7,K_1516:5.1,dusuk_iyi:true,egz:'Uçuş Sprintleri, Direnç Kayışı Sprint',sik:'Haftada 3x · 6-10x20-30m'},
  illinois:{ad:'Illinois',birim:'sn',E_1012:18.5,K_1012:19.5,E_1314:17.2,K_1314:18.3,E_1516:16.2,K_1516:17.5,dusuk_iyi:true,egz:'T-Drill, 505 Çeviklik, Merdiven Drill',sik:'Haftada 3x · 5-8x10-15sn'},
  flamingo:{ad:'Flamingo Denge',birim:'hata',E_1012:6,K_1012:8,E_1314:4,K_1314:6,E_1516:3,K_1516:5,dusuk_iyi:true,egz:'BOSU Squat, Tek Ayak Gözler Kapalı',sik:'Her antrenman · 3x30-60sn'},
  otur_uzan:{ad:'Otur-Uzan',birim:'cm',E_1012:22,K_1012:26,E_1314:24,K_1314:28,E_1516:26,K_1516:30,dusuk_iyi:false,egz:'Statik Esneme (PNF), Bacak Sallamaları',sik:'Her gün · 3x30sn'},
  beep_test:{ad:'Beep Test',birim:'seviye',E_1012:5.4,K_1012:4.8,E_1314:6.2,K_1314:5.6,E_1516:7.4,K_1516:6.8,dusuk_iyi:false,egz:'Tempo Koşu, Interval Koşu (1:1)',sik:'Haftada 3x · 20-40dk'},
  cember_koordinasyon:{ad:'Çember Koord.',birim:'sn',E_1012:12.5,K_1012:13,E_1314:11.2,K_1314:11.8,E_1516:10,K_1516:10.8,dusuk_iyi:true,egz:'Çember Atlama, Koordinasyon Merdiveni',sik:'Haftada 3x · 4-6 set'},
  cetvel_reaksiyon:{ad:'Cetvel Reaksiyon',birim:'cm',E_1012:22,K_1012:24,E_1314:19,K_1314:21,E_1516:16,K_1516:18,dusuk_iyi:true,egz:'Cetvel Düşürme, Işık Reaksiyon',sik:'Her antrenman · 5x5 tekrar'},
  el_dinamometre:{ad:'El Dinamom.',birim:'kg',E_1012:20,K_1012:17,E_1314:28,K_1314:22,E_1516:36,K_1516:27,dusuk_iyi:false,egz:'Hand Grip Squeezes, Dead Hang',sik:'Haftada 3x · 3x30sn'},
  wingate:{ad:'Wingate',birim:'W/kg',E_1012:7.5,K_1012:6.8,E_1314:8.2,K_1314:7.4,E_1516:9,K_1516:8.2,dusuk_iyi:false,egz:'30m All-Out Sprint x6, Tabata Squat Jump',sik:'Haftada 2x · 6-10x10-30sn'},
};

let tumSporcular=[];
let aktifKullanici=null;
let silinecekSporcuId=null;
let aktifOdevId=null,odevBaslangic=null,timerInterval=null;

// ===== OTURUM =====
function oturumKaydet(k){localStorage.setItem('tk_oturum',JSON.stringify(k))}
function oturumYukle(){try{return JSON.parse(localStorage.getItem('tk_oturum'))}catch{return null}}
function oturumSil(){localStorage.removeItem('tk_oturum')}

// ===== BAŞLANGIÇ =====
window.onload=async function(){
  await sporcularYukle();
  const oturum=oturumYukle();
  if(oturum){
    aktifKullanici=oturum;
    if(oturum.tip==='admin') adminPaneliGoster();
    else sporcuSayfasiGoster(oturum.sporcu);
  }
};

async function sporcularYukle(){
  const{data}=await sb.from('sporcular').select('*').order('ad_soyad');
  tumSporcular=data||[];
  document.getElementById('giris-yukleniyor').style.display='none';
  const liste=document.getElementById('sporcu-giris-listesi');
  liste.innerHTML='';
  tumSporcular.forEach(s=>{
    const ini=initials(s.ad_soyad);
    const renk=RENKLER[s.ad_soyad.charCodeAt(0)%RENKLER.length];
    const yas=s.dogum_tarihi?(new Date().getFullYear()-new Date(s.dogum_tarihi).getFullYear()):'';
    liste.innerHTML+=`<div class="kullanici-item" onclick="kullaniciSec('sporcu','${s.id}')">
      <div class="k-avatar" style="background:${renk}">${ini}</div>
      <div class="k-bilgi">
        <div class="k-ad">${s.ad_soyad}</div>
        <div class="k-rol">${s.cinsiyet||''}${yas?' · '+yas+' yaş':''}${s.dan_kusak?' · '+s.dan_kusak:''}</div>
      </div>
      <div class="k-ok">›</div>
    </div>`;
  });
}

function initials(ad){return ad.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}

// ===== GİRİŞ =====
let seciliK=null;
function kullaniciSec(tip,id){
  if(tip==='admin'){
    seciliK={tip:'admin'};
    document.getElementById('sifre-avatar').textContent='AD';
    document.getElementById('sifre-avatar').style.background='linear-gradient(135deg,#1a1a2e,#e63946)';
    document.getElementById('sifre-ad').textContent='Admin';
  } else {
    const s=tumSporcular.find(x=>x.id===id);
    if(!s)return;
    seciliK={tip:'sporcu',sporcu:s};
    const renk=RENKLER[s.ad_soyad.charCodeAt(0)%RENKLER.length];
    document.getElementById('sifre-avatar').textContent=initials(s.ad_soyad);
    document.getElementById('sifre-avatar').style.background=renk;
    document.getElementById('sifre-ad').textContent=s.ad_soyad;
  }
  document.getElementById('sifre-input').value='';
  document.getElementById('sifre-hata').textContent='';
  document.getElementById('sifre-ekrani').classList.remove('hidden');
  setTimeout(()=>document.getElementById('sifre-input').focus(),100);
}
document.getElementById('sifre-input').addEventListener('keypress',e=>{if(e.key==='Enter')sifreDogrula()});

function sifreDogrula(){
  const sifre=document.getElementById('sifre-input').value;
  if(!seciliK)return;
  if(seciliK.tip==='admin'){
    if(sifre===ADMIN_SIFRE){
      aktifKullanici={tip:'admin'};
      oturumKaydet(aktifKullanici);
      sifreKapat();
      adminPaneliGoster();
    } else document.getElementById('sifre-hata').textContent='Şifre yanlış!';
  } else {
    const s=seciliK.sporcu;
    if(!s.sifre||sifre===s.sifre){
      aktifKullanici={tip:'sporcu',sporcu:s};
      oturumKaydet(aktifKullanici);
      sifreKapat();
      sporcuSayfasiGoster(s);
    } else document.getElementById('sifre-hata').textContent='Şifre yanlış!';
  }
}
function sifreKapat(){document.getElementById('sifre-ekrani').classList.add('hidden')}

function cikisYap(){
  oturumSil();aktifKullanici=null;
  document.getElementById('admin-panel').classList.add('hidden');
  document.getElementById('sporcu-sayfasi').classList.add('hidden');
  document.getElementById('giris-ekrani').style.display='';
  sporcularYukle();
}

// ===== ADMİN =====
function adminPaneliGoster(){
  document.getElementById('giris-ekrani').style.display='none';
  document.getElementById('admin-panel').classList.remove('hidden');
  // Tüm sayfaları başta gizle
  document.querySelectorAll('.a-sayfa').forEach(s=>s.style.display='none');
  // İlk sayfayı göster
  document.getElementById('a-sporcular').style.display='block';
  adminSporcuListesiGoster();
  selectleriDoldur();
  antrenorAnketOlustur();
}

function adminSayfa(sayfa,el){
  document.querySelectorAll('.a-sayfa').forEach(s=>s.style.display='none');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('a-'+sayfa).style.display='block';
  el.classList.add('active');
  if(sayfa==='test') selectleriDoldur();
  if(sayfa==='psikoloji'){selectleriDoldur();antrenorAnketOlustur();}
  if(sayfa==='odev'){selectleriDoldur();adminOdevleriYukle();}
  if(sayfa==='takip')takipYukle();
}

function adminSporcuListesiGoster(){
  const kap=document.getElementById('sporcu-kart-listesi');
  kap.innerHTML='';
  if(!tumSporcular.length){kap.innerHTML='<p class="bos-mesaj">Henüz sporcu eklenmemiş.</p>';return}
  tumSporcular.forEach(s=>{
    const ini=initials(s.ad_soyad);
    const renk=RENKLER[s.ad_soyad.charCodeAt(0)%RENKLER.length];
    const yas=s.dogum_tarihi?(new Date().getFullYear()-new Date(s.dogum_tarihi).getFullYear()):'—';
    kap.innerHTML+=`
    <div class="sporcu-yonetim-kart">
      <div class="sy-avatar" style="background:${renk}">${ini}</div>
      <div class="sy-bilgi">
        <div class="sy-ad">${s.ad_soyad}</div>
        <div class="sy-alt">${s.cinsiyet||''} · ${yas} yaş · ${s.dan_kusak||''}</div>
        <div class="sy-sifre">🔑 ${s.sifre||'Şifresiz'}</div>
      </div>
      <button class="btn-tehlike" onclick="sporcuSilSor('${s.id}','${s.ad_soyad}')">Sil</button>
    </div>`;
  });
}

function selectleriDoldur(){
  ['t-sporcu','p-sporcu','odev-filtre','odev-sporcu-sec'].forEach(id=>{
    const sel=document.getElementById(id);if(!sel)return;
    const hepsi=id==='odev-filtre';
    sel.innerHTML=hepsi?'<option value="">Tüm Sporcular</option>':'<option value="">Seçin...</option>';
    tumSporcular.forEach(s=>sel.innerHTML+=`<option value="${s.id}">${s.ad_soyad}</option>`);
  });
}

async function sporcuEkle(){
  const ad=document.getElementById('s-ad').value.trim();
  if(!ad){alert('Ad soyad gerekli!');return}
  const slug=ad.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')+'-'+Date.now().toString().slice(-4);
  const{error}=await sb.from('sporcular').insert({
    ad_soyad:ad,
    dogum_tarihi:document.getElementById('s-dogum').value||null,
    cinsiyet:document.getElementById('s-cinsiyet').value,
    dan_kusak:document.getElementById('s-kusak').value||null,
    sifre:document.getElementById('s-sifre').value||null,
    boy:document.getElementById('s-boy').value||null,
    kilo:document.getElementById('s-kilo').value||null,
    slug
  });
  const m=document.getElementById('sporcu-ekle-mesaj');
  if(error){m.style.color='#e63946';m.textContent='Hata: '+error.message}
  else{
    m.style.color='#16a34a';m.textContent='Sporcu eklendi!';
    await sporcularYukle();
    adminSporcuListesiGoster();
    selectleriDoldur();
    setTimeout(()=>{modalKapat('m-sporcu-ekle');m.textContent=''},1200);
  }
}

function sporcuSilSor(id,ad){
  silinecekSporcuId=id;
  document.getElementById('sil-sporcu-ad').textContent=ad;
  modalAc('m-sporcu-sil');
}

async function sporcuSilOnayla(){
  if(!silinecekSporcuId)return;
  const id=silinecekSporcuId;
  await sb.from("test_sonuclari").delete().eq("sporcu_id",id);
  await sb.from("psikoloji_sporcu").delete().eq("sporcu_id",id);
  await sb.from("psikoloji_antrenor").delete().eq("sporcu_id",id);
  await sb.from("odev_tamamlama").delete().eq("sporcu_id",id);
  await sb.from("ev_odevleri").delete().eq("sporcu_id",id);
  const r=await sb.from("sporcular").delete().eq("id",id);
  if(r.error){alert("Silme hatasi: "+r.error.message);return;}
  silinecekSporcuId=null;
  modalKapat("m-sporcu-sil");
  await sporcularYukle();
  adminSporcuListesiGoster();
  selectleriDoldur();
}

async function testKaydet(){
  const sporcuId=document.getElementById('t-sporcu').value;
  const tarih=document.getElementById('t-tarih').value;
  if(!sporcuId||!tarih){alert('Sporcu ve tarih seçin!');return}
  const{error}=await sb.from('test_sonuclari').insert({
    sporcu_id:sporcuId,test_tarihi:tarih,
    donem:document.getElementById('t-donem').value||null,
    uzun_atlama:document.getElementById('ti-uzun-atlama').value||null,
    saglik_topu:document.getElementById('ti-saglik-topu').value||null,
    mekik_30sn:document.getElementById('ti-mekik').value||null,
    sprint_30m:document.getElementById('ti-sprint').value||null,
    illinois:document.getElementById('ti-illinois').value||null,
    flamingo:document.getElementById('ti-flamingo').value||null,
    otur_uzan:document.getElementById('ti-otur-uzan').value||null,
    beep_test:document.getElementById('ti-beep').value||null,
    cember_koordinasyon:document.getElementById('ti-cember').value||null,
    cetvel_reaksiyon:document.getElementById('ti-cetvel').value||null,
    el_dinamometre:document.getElementById('ti-dinamometre').value||null,
    wingate:document.getElementById('ti-wingate').value||null,
  });
  const m=document.getElementById('test-mesaj');
  if(error){m.style.color='#e63946';m.textContent='Hata: '+error.message}
  else{m.style.color='#16a34a';m.textContent='Test kaydedildi!';setTimeout(()=>m.textContent='',3000)}
}

// ===== PSİKOLOJİ ANTRENÖRFormu =====
const ANTRENOR_SORULAR=[
  {baslik:'🔵 Kaygı — Antrenör Gözlemi',alt:'0: Gözlemlemedim · 1: Hiç · 2: Hafif · 3: Belirgin · 4: Çok Belirgin',max:4,start:0,
   gruplar:[
    {ad:'Bilişsel Belirtiler',sorular:[
      {f:'ka_b1',s:"Yarış öncesi aşırı soru soruyor, onay arıyor."},
      {f:'ka_b2',s:'Dikkatini toplamakta güçlük çekiyor.'},
      {f:'ka_b3',s:"Olumsuz konuşmalar yapıyor ('Kazanamam' vb.)."},
      {f:'ka_b4',s:'Hata yaptığında uzun süre toparlanamıyor.'},
      {f:'ka_b5',s:'Rakip veya hakem hakkında aşırı endişeli.'},
    ]},
    {ad:'Somatik Belirtiler',sorular:[
      {f:'ka_s1',s:'Isınmada kaslar aşırı gergin.'},
      {f:'ka_s2',s:'Solunum hızlanmış veya düzensiz.'},
      {f:'ka_s3',s:'Ellerde titreme, yüzde solukluk.'},
      {f:'ka_s4',s:'Tuvalete sık gidiyor veya mide bulantısı.'},
      {f:'ka_s5',s:'Hareketler sertleşmiş, koordinasyon kaybı.'},
    ]},
    {ad:'Davranış Belirtileri',sorular:[
      {f:'ka_d1',s:'Antrenörden uzaklaşıyor, içe kapanıyor.'},
      {f:'ka_d2',s:'Aşırı konuşkan veya tam tersine sessiz.'},
      {f:'ka_d3',s:'Hazırlık rutinini aksatıyor.'},
      {f:'ka_d4',s:'Yarıştan kaçma davranışı veya erteleme.'},
      {f:'ka_d5',s:'Teknik uyarılara normalden farklı tepki.'},
    ]},
   ]
  },
  {baslik:'🟣 Motivasyon — Antrenör Gözlemi',alt:'1: Hiçbir zaman · 2: Nadiren · 3: Bazen · 4: Sıklıkla · 5: Her Zaman',max:5,start:1,
   gruplar:[
    {ad:'Görev Yönelimi Belirtileri',sorular:[
      {f:'ma_g1',s:'Antrenmanı merak ederek sorar.'},
      {f:'ma_g2',s:'Hata yaptığında tekrar dener.'},
      {f:'ma_g3',s:'Rakipten bağımsız memnuniyet duyar.'},
      {f:'ma_g4',s:'Zorlu egzersizlerde çaba gösterir.'},
      {f:'ma_g5',s:'Geçmiş performansıyla karşılaştırır.'},
    ]},
    {ad:'Ego Yönelimi Belirtileri',sorular:[
      {f:'ma_e1',s:'Yalnızca kazandığında motive görünür.'},
      {f:'ma_e2',s:'Rakibiyle sürekli kıyaslar.'},
      {f:'ma_e3',s:'Başarısızlıktan sonra bırakmak eğiliminde.'},
      {f:'ma_e4',s:'Zor egzersizlerden kaçar.'},
      {f:'ma_e5',s:'Kaybettiğinde sinirlenme veya ağlama.'},
    ]},
   ]
  },
  {baslik:'🟢 Mental Dayanıklılık — Antrenör Gözlemi',alt:'1: Hiçbir zaman · 5: Her Zaman',max:5,start:1,
   gruplar:[
    {ad:'Kontrol',sorular:[{f:'mda_kon1',s:'Duygusal tepkilerini uygun şekilde yönetiyor.'},{f:'mda_kon2',s:'Ortam değişse de uyum sağlıyor.'},{f:'mda_kon3',s:'Stresli durumlarda sakin kalabiliyor.'}]},
    {ad:'Bağlılık',sorular:[{f:'mda_bag1',s:'Zor antrenman seanslarında vazgeçmiyor.'},{f:'mda_bag2',s:'Hedeflere bağlılığını sürdürüyor.'},{f:'mda_bag3',s:'Olumsuz koşullarda kararlılığını koruyor.'}]},
    {ad:'Meydan Okuma',sorular:[{f:'mda_mey1',s:'Zor egzersizleri istekle deniyor.'},{f:'mda_mey2',s:'Yarışma baskısını fırsat olarak görüyor.'},{f:'mda_mey3',s:'Başarısızlıktan sonra hızlı toparlanıyor.'}]},
    {ad:'Güven',sorular:[{f:'mda_guv1',s:'Baskı altında özgüveni korunuyor.'},{f:'mda_guv2',s:'Kendi teknik kararlarına güveniyor.'},{f:'mda_guv3',s:'Zor anlarda kapasitesine inancını yitirmiyor.'}]},
   ]
  },
  {baslik:'🟠 Konsantrasyon — Antrenör Gözlemi',alt:'1: Hiçbir zaman · 5: Her Zaman',max:5,start:1,
   gruplar:[
    {ad:'Güçlü Dikkat Davranışları',sorular:[
      {f:'ka2_g1',s:'Açıklamaları ilk seferinde anlıyor.'},
      {f:'ka2_g2',s:'Birden fazla uyarıcıyı eş zamanlı takip ediyor.'},
      {f:'ka2_g3',s:'Uzun seansların sonunda bile odak kaybı yok.'},
      {f:'ka2_g4',s:'Hata sonrası hızla toparlanıyor.'},
      {f:'ka2_g5',s:"Rakibinin stratejisini okuyabiliyor."},
    ]},
    {ad:'Dikkat Bozukluğu Belirtileri',sorular:[
      {f:'ka2_d1',s:'Uzun açıklamalarda dikkati dağılıyor.'},
      {f:'ka2_d2',s:'Seyirci ve gürültü dikkatini bozuyor.'},
      {f:'ka2_d3',s:'Hata sonrası aynı hatayı tekrarlıyor.'},
      {f:'ka2_d4',s:'Yorgunluk arttıkça teknik hatalar artıyor.'},
      {f:'ka2_d5',s:'Kritik anlarda odak kaybı gözlemleniyor.'},
    ]},
   ]
  },
];

const SPORCU_SORULAR=[
  {baslik:'🔵 Rekabet Kaygısı',alt:'1: Hiç Değil · 2: Biraz · 3: Orta · 4: Çok Fazla',max:4,start:1,
   gruplar:[
    {ad:'Bilişsel Kaygı',sorular:[
      {f:'bk1',s:'Yarışmada başarısız olacağım diye endişeleniyorum.'},
      {f:'bk2',s:'Rakibimin daha iyi performans göstereceğinden korkuyorum.'},
      {f:'bk3',s:'Hedeflerime ulaşıp ulaşamayacağımdan emin değilim.'},
      {f:'bk4',s:'Daha önce yaptığım hataları aklımdan çıkaramıyorum.'},
      {f:'bk5',s:'Yanlış hamle yaparsam ne olacağını düşünüyorum.'},
      {f:'bk6',s:'Antrenörümün hayal kırıklığına uğrayacağından endişeleniyorum.'},
      {f:'bk7',s:'Yarışma sırasında odaklanıp odaklanamayacağımı merak ediyorum.'},
      {f:'bk8',s:'Bugün kötü bir günüm olmasından korkuyorum.'},
      {f:'bk9',s:'Kendimden beklenenin altında kalacağımı düşünüyorum.'},
    ]},
    {ad:'Somatik Kaygı',sorular:[
      {f:'sk1',s:'Vücudum gergin ve kaslarım sıkışmış hissediyorum.'},
      {f:'sk2',s:'Kalbim normalden hızlı çarpıyor.'},
      {f:'sk3',s:'Midem bulanıyor veya karın ağrısı hissediyorum.'},
      {f:'sk4',s:'Ellerim titriyor veya terliyor.'},
      {f:'sk5',s:'Ağzım kuruyor, yutkunmakta güçlük çekiyorum.'},
      {f:'sk6',s:'Nefes almakta zorluk çekiyorum.'},
      {f:'sk7',s:'Bacaklarım yorgun veya ağır hissediyor.'},
      {f:'sk8',s:'Baş ağrım var ya da başım dönüyor.'},
      {f:'sk9',s:'Yarışmadan önce çok sık tuvalete çıkma ihtiyacı duyuyorum.'},
    ]},
    {ad:'Özgüven',sorular:[
      {f:'og1',s:'Bu yarışmada iyi bir performans göstereceğimden eminim.'},
      {f:'og2',s:'Antrenmanlarda öğrendiklerimi sahaya yansıtabileceğime inanıyorum.'},
      {f:'og3',s:'Baskı altında doğru kararlar verebileceğimi düşünüyorum.'},
      {f:'og4',s:'Fiziksel olarak yarışmaya hazır olduğumu hissediyorum.'},
      {f:'og5',s:'Rakibimle başa çıkabileceğime inanıyorum.'},
      {f:'og6',s:'Zor bir durumda bile odağımı koruyabilirim.'},
      {f:'og7',s:'Kendime olan güvenim yüksek.'},
      {f:'og8',s:'Bu yarışmada başarılı olma kapasiteme inanıyorum.'},
      {f:'og9',s:"Antrenörümün güvenine layık olduğumu hissediyorum."},
    ]},
   ]
  },
  {baslik:'🟣 Motivasyon',alt:"'Sporda en çok başarılı hissederim...' 1: Hiç · 5: Tamamen",max:5,start:1,
   gruplar:[
    {ad:'Görev Yönelimi',sorular:[
      {f:'g1',s:'...Yeni bir beceriyi öğrendiğimde ve bu çok çalışmamı gerektirdiğinde.'},
      {f:'g2',s:'...Kendim için belirlediğim bir hedefi gerçekleştirdiğimde.'},
      {f:'g3',s:'...Antrenmanlarımda normalden daha iyi yaptığımda.'},
      {f:'g4',s:'...Zor bir beceriyi çok çalışarak öğrendiğimde.'},
      {f:'g5',s:'...İşlerin doğru yapılmasını öğrendiğimde.'},
      {f:'g6',s:'...Diğer insanlar yapamasa da ben başardığımda.'},
      {f:'g7',s:'...Elimden gelenin en iyisini yaptığımı hissettiğimde.'},
    ]},
    {ad:'Ego Yönelimi',sorular:[
      {f:'e1',s:'...Diğerlerinden daha iyi olduğumu gösterdiğimde.'},
      {f:'e2',s:'...Çok çalışmadan başkalarından daha iyi performans gösterdiğimde.'},
      {f:'e3',s:'...Takımdaki en iyisi olduğumda.'},
      {f:'e4',s:'...Başkalarının yapamadığını ben yapabildiğimde.'},
      {f:'e5',s:'...Sınıftaki veya takımdaki en iyisi olduğumda.'},
      {f:'e6',s:'...Diğerlerini yendiğimde.'},
    ]},
   ]
  },
  {baslik:'🟢 Psikolojik Dayanıklılık',alt:'1: Hiç Değil · 5: Her Zaman',max:5,start:1,
   gruplar:[
    {ad:'Kontrol',sorular:[{f:'kon1',s:'Zor anlarda duygularımı kontrol edebiliyorum.'},{f:'kon2',s:'Ne olursa olsun kendi kendimi sakinleştirebilirim.'},{f:'kon3',s:'Antrenman ve yarışın gidişatı üzerinde etkili olabileceğimi hissediyorum.'}]},
    {ad:'Bağlılık',sorular:[{f:'bag1',s:'Zorlu bir antrenman seansında bırakmak istemesem de devam ederim.'},{f:'bag2',s:'Hedeflerim doğrultusunda kendimi antrenmanlarıma adarım.'},{f:'bag3',s:'Yorgun olsam bile antrenmanları atlamamaya çalışırım.'}]},
    {ad:'Meydan Okuma',sorular:[{f:'mey1',s:'Yarışmalar ve zorluklar beni büyütür, korkutmaz.'},{f:'mey2',s:'Yeni ve zor durumları heyecanla karşılarım.'},{f:'mey3',s:'Başarısız olduğumda bunu bir öğrenme fırsatı olarak görürüm.'}]},
    {ad:'Güven',sorular:[{f:'guv1',s:'Başkalarının baskısına rağmen kendi kararlarımda güvenle dururum.'},{f:'guv2',s:'Geçmişteki hatalar şu anki performansımı etkilemiyor.'},{f:'guv3',s:'Zor anlarda bile başarabileceğime inanıyorum.'}]},
   ]
  },
  {baslik:'🟠 Konsantrasyon & Dikkat',alt:'1: Hiç Değil · 5: Her Zaman',max:5,start:1,
   gruplar:[
    {ad:'Geniş-Dışsal Dikkat',sorular:[
      {f:'gd1',s:'Sahadaki birden fazla rakibi aynı anda takip edebiliyorum.'},
      {f:'gd2',s:'Hakem, seyirci ve ortam değişikliklerini çabuk fark ediyorum.'},
      {f:'gd3',s:"Rakibimin vücut dilini ve stratejisini yarış içinde okuyabiliyorum."},
      {f:'gd4',s:'Sahada olup biteni geniş bir perspektifle görmeyi seviyorum.'},
    ]},
    {ad:'Dar-Dışsal Dikkat',sorular:[
      {f:'dd1',s:'Rakibimle karşı karşıya geldiğimde tüm dikkatimi ona verebiliyorum.'},
      {f:'dd2',s:'Kritik anlarda tek bir hedefe odaklanmakta zorlanmıyorum.'},
      {f:'dd3',s:'Belirli bir tekmeyi yaparken odağım dağılmıyor.'},
      {f:'dd4',s:'Önemli anlarda gereksiz şeyleri zihnimden uzaklaştırabilirim.'},
    ]},
    {ad:'Dikkat Hatası (düşük puan iyidir)',sorular:[
      {f:'dh1',s:'Yarışma sırasında aklım dağılıyor ve dikkatim başka şeylere gidiyor.'},
      {f:'dh2',s:'Öfke sonrası odağımı tekrar toplamakta güçlük çekiyorum.'},
      {f:'dh3',s:'Seyirci, gürültü veya yorgunluk dikkatimi önemli ölçüde bozuyor.'},
      {f:'dh4',s:'Bir hata yaptığımda o hatayı düşünmeye devam ederek sonraki hamlemi etkiliyorum.'},
    ]},
   ]
  },
];

function anketFormOlustur(sorular,kapsayici){
  const el=document.getElementById(kapsayici);if(!el)return;
  let html='';
  sorular.forEach(b=>{
    html+=`<div class="psiko-bolum"><div class="psiko-bolum-baslik">${b.baslik}</div><div class="psiko-bolum-alt">${b.alt}</div>`;
    b.gruplar.forEach(g=>{
      html+=`<div class="psiko-grup-baslik">${g.ad}</div>`;
      g.sorular.forEach(s=>{
        html+=`<div class="psiko-soru"><div class="psiko-soru-metin">${s.s}</div><div class="likert-satir" data-field="${s.f}" data-kap="${kapsayici}">`;
        for(let i=b.start;i<=b.max;i++) html+=`<button type="button" class="l-btn" data-val="${i}" onclick="lSec(this)">${i}</button>`;
        html+=`</div></div>`;
      });
    });
    html+=`</div>`;
  });
  el.innerHTML=html;
}

function antrenorAnketOlustur(){anketFormOlustur(ANTRENOR_SORULAR,'antrenor-anket-alani')}

function lSec(btn){
  const satir=btn.closest('.likert-satir');
  satir.querySelectorAll('.l-btn').forEach(b=>b.classList.remove('secili'));
  btn.classList.add('secili');
}

function lDeger(field,kapsayici){
  const sel=document.querySelector(`#${kapsayici} .likert-satir[data-field="${field}"] .l-btn.secili`);
  return sel?parseInt(sel.dataset.val):null;
}

async function antrenorPsikoKaydet(){
  const sporcuId=document.getElementById('p-sporcu').value;
  const tarih=document.getElementById('p-tarih').value;
  if(!sporcuId||!tarih){alert('Sporcu ve tarih seçin!');return}
  const fields=['ka_b1','ka_b2','ka_b3','ka_b4','ka_b5','ka_s1','ka_s2','ka_s3','ka_s4','ka_s5','ka_d1','ka_d2','ka_d3','ka_d4','ka_d5',
    'ma_g1','ma_g2','ma_g3','ma_g4','ma_g5','ma_e1','ma_e2','ma_e3','ma_e4','ma_e5',
    'mda_kon1','mda_kon2','mda_kon3','mda_bag1','mda_bag2','mda_bag3','mda_mey1','mda_mey2','mda_mey3','mda_guv1','mda_guv2','mda_guv3',
    'ka2_g1','ka2_g2','ka2_g3','ka2_g4','ka2_g5','ka2_d1','ka2_d2','ka2_d3','ka2_d4','ka2_d5'];
  const veri={sporcu_id:sporcuId,test_tarihi:tarih,donem:document.getElementById('p-donem').value||null,onaylandi:true};
  fields.forEach(f=>{veri[f]=lDeger(f,'antrenor-anket-alani')});
  const{error}=await sb.from('psikoloji_antrenor').insert(veri);
  const m=document.getElementById('psiko-a-mesaj');
  if(error){m.style.color='#e63946';m.textContent='Hata: '+error.message}
  else{m.style.color='#16a34a';m.textContent='Kaydedildi ve onaylandı!';setTimeout(()=>m.textContent='',3000)}
}

async function adminOdevleriYukle(){
  const filtre=document.getElementById('odev-filtre')?.value;
  let q=sb.from('ev_odevleri').select('*, sporcular(ad_soyad)').order('tarih',{ascending:false});
  if(filtre)q=q.eq('sporcu_id',filtre);
  const{data}=await q;
  const liste=document.getElementById('admin-odev-liste');
  liste.innerHTML='';
  if(!data||!data.length){liste.innerHTML='<p class="bos-mesaj">Henüz ödev eklenmemiş.</p>';return}
  data.forEach(o=>{
    liste.innerHTML+=`<div class="admin-liste-kart">
      <div class="al-sol"><div class="al-baslik">${o.baslik}</div><div class="al-alt">${o.sporcular?.ad_soyad||''} · ${o.tarih||''} · ${o.sure_dakika||'—'} dk</div></div>
      <button class="sil-btn" onclick="odevSil('${o.id}')">Sil</button>
    </div>`;
  });
}

async function odevEkle(){
  const sporcuId=document.getElementById('odev-sporcu-sec').value;
  const baslik=document.getElementById('odev-baslik').value.trim();
  if(!sporcuId||!baslik){alert('Sporcu ve başlık gerekli!');return}
  const{error}=await sb.from('ev_odevleri').insert({
    sporcu_id:sporcuId,baslik,
    aciklama:document.getElementById('odev-aciklama').value,
    sure_dakika:document.getElementById('odev-sure').value||null,
    tarih:document.getElementById('odev-tarih').value||null,
  });
  const m=document.getElementById('odev-ekle-mesaj');
  if(error){m.style.color='#e63946';m.textContent='Hata: '+error.message}
  else{m.style.color='#16a34a';m.textContent='Ödev eklendi!';setTimeout(()=>{modalKapat('m-odev-ekle');adminOdevleriYukle();m.textContent=''},1200)}
}

async function odevSil(id){
  if(!confirm('Bu ödevi silmek istiyor musun?'))return;
  await sb.from('ev_odevleri').delete().eq('id',id);
  adminOdevleriYukle();
}

async function takipYukle(){
  const{data}=await sb.from('odev_tamamlama').select('*, ev_odevleri(baslik,sure_dakika), sporcular(ad_soyad)').order('created_at',{ascending:false});
  const liste=document.getElementById('takip-liste');
  liste.innerHTML='';
  if(!data||!data.length){liste.innerHTML='<p class="bos-mesaj">Henüz ödev başlatılmamış.</p>';return}
  data.forEach(t=>{
    const b=t.ev_odevleri?.sure_dakika||0;
    let g=0;if(t.baslangic_zamani&&t.bitis_zamani)g=Math.round((new Date(t.bitis_zamani)-new Date(t.baslangic_zamani))/60000);
    let dc='d-bekle',dt='Devam ediyor';
    if(t.tamamlandi){
      if(b>0&&g<b*.5){dc='d-eksik';dt=`Erken bitti (${g}dk)`}
      else{dc='d-tamam';dt=`Tamamlandı (${g}dk)`}
    }
    const tarih=t.baslangic_zamani?new Date(t.baslangic_zamani).toLocaleString('tr-TR'):'—';
    liste.innerHTML+=`<div class="admin-liste-kart">
      <div class="al-sol"><div class="al-baslik">${t.sporcular?.ad_soyad||''}</div><div class="al-alt">${t.ev_odevleri?.baslik||''} · ${tarih}</div></div>
      <span class="takip-durum ${dc}">${dt}</span>
    </div>`;
  });
}

// ===== SPORCU SAYFASI =====
async function sporcuSayfasiGoster(sporcu){
  document.getElementById('giris-ekrani').style.display='none';
  document.getElementById('sporcu-sayfasi').classList.remove('hidden');
  const ini=initials(sporcu.ad_soyad);
  const renk=RENKLER[sporcu.ad_soyad.charCodeAt(0)%RENKLER.length];
  document.getElementById('sh-av').textContent=ini;
  document.getElementById('sh-av').style.background=renk;
  document.getElementById('sh-ad').textContent=sporcu.ad_soyad;
  const yas=sporcu.dogum_tarihi?(new Date().getFullYear()-new Date(sporcu.dogum_tarihi).getFullYear()):'';
  document.getElementById('sh-alt').textContent=[sporcu.cinsiyet,yas?yas+' yaş':'',sporcu.dan_kusak].filter(Boolean).join(' · ');
  document.title=sporcu.ad_soyad;

  const icerik=document.getElementById('sporcu-icerik');
  icerik.innerHTML='<div class="bos-mesaj">Yükleniyor...</div>';

  const yas2=sporcu.dogum_tarihi?(new Date().getFullYear()-new Date(sporcu.dogum_tarihi).getFullYear()):14;
  const cins=sporcu.cinsiyet==='Kız'?'K':'E';
  const yg=yas2<=12?'1012':yas2<=14?'1314':'1516';
  const nk=`${cins}_${yg}`;

  const[{data:testler},{data:aList},{data:sList},{data:odevler},{data:tamList},{data:psikoBekle}]=await Promise.all([
    sb.from('test_sonuclari').select('*').eq('sporcu_id',sporcu.id).order('test_tarihi',{ascending:true}),
    sb.from('psikoloji_antrenor').select('*').eq('sporcu_id',sporcu.id).eq('onaylandi',true).order('created_at',{ascending:false}),
    sb.from('psikoloji_sporcu').select('*').eq('sporcu_id',sporcu.id).eq('onaylandi',true).order('created_at',{ascending:false}),
    sb.from('ev_odevleri').select('*').eq('sporcu_id',sporcu.id).order('tarih',{ascending:false}),
    sb.from('odev_tamamlama').select('odev_id').eq('sporcu_id',sporcu.id).eq('tamamlandi',true),
    sb.from('psikoloji_sporcu').select('id').eq('sporcu_id',sporcu.id).eq('onaylandi',false).order('created_at',{ascending:false}).limit(1),
  ]);

  const tamSet=new Set((tamList||[]).map(t=>t.odev_id));
  let html='';

  // 1. MOTORİK BÖLÜM
  html+=`<div class="bolum">
    <div class="bolum-baslik-row">
      <div class="bolum-ikon">💪</div>
      <div><div class="bolum-baslik">Motorik Değerlendirme</div><div class="bolum-alt">Fiziksel performans analizi</div></div>
    </div>`;
  if(!testler||!testler.length){
    html+=`<div class="bos-mesaj" style="padding:20px 0;">Henüz test sonucu girilmemiş.</div>`;
  } else {
    const test=testler[testler.length-1];
    let ustun=0,normal=0,gelistir=0,zayif=0,satirlar='',zayiflar='';
    for(const[key,n] of Object.entries(NORMLAR)){
      const d=parseFloat(test[key]);if(isNaN(d))continue;
      const norm=n[nk]||n['E_1314'];
      const oran=n.dusuk_iyi?(norm/d):(d/norm);
      let durum,rClass,barClass,barW;
      if(oran>=1.10){durum='Üstün';rClass='rb-ustun';barClass='bar-ustun';barW=100;ustun++}
      else if(oran>=0.90){durum='Normal';rClass='rb-normal';barClass='bar-normal';barW=75;normal++}
      else if(oran>=0.80){durum='Geliştir';rClass='rb-gelistir';barClass='bar-gelistir';barW=50;gelistir++}
      else{durum='Zayıf';rClass='rb-zayif';barClass='bar-zayif';barW=25;zayif++}
      satirlar+=`<div class="test-satir">
        <div class="ts-sol"><div class="ts-ad">${n.ad}</div><div class="ts-deger">${d} ${n.birim} · Norm: ${norm}</div></div>
        <div class="ts-bar"><div class="ts-bar-ic ${barClass}" style="width:${barW}%"></div></div>
        <span class="rozet-badge ${rClass}">${durum}</span>
      </div>`;
      if(durum==='Zayıf'||durum==='Geliştir'){
        zayiflar+=`<div class="zayif-kart">
          <div class="zayif-kart-ad">${n.ad} <span class="rozet-badge ${rClass}" style="font-size:10px;">${durum}</span></div>
          <div class="zayif-kart-egz">${n.egz}</div>
          <div class="zayif-kart-sik">${n.sik}</div>
        </div>`;
      }
    }
    html+=`<div class="rozet-satir">
      <div class="rozet-kutu ustun"><div class="rozet-sayi">${ustun}</div><div class="rozet-etiket">Üstün</div></div>
      <div class="rozet-kutu normal"><div class="rozet-sayi">${normal}</div><div class="rozet-etiket">Normal</div></div>
      <div class="rozet-kutu zayif"><div class="rozet-sayi">${zayif+gelistir}</div><div class="rozet-etiket">Geliştirilecek</div></div>
    </div>`;
    html+=`<div class="alt-cizgi-baslik">Test Sonuçları</div>${satirlar}`;
    if(zayiflar){html+=`<div class="alt-cizgi-baslik" style="margin-top:16px;">Geliştirilmesi Gereken Alanlar</div>${zayiflar}`}
    if(testler.length>1){html+=`<div class="alt-cizgi-baslik" style="margin-top:16px;">Dönemsel Gelişim</div><div id="motorik-grafik-alani"></div>`}
  }
  html+=`</div>`;

  // 2. PSİKOLOJİ BÖLÜM
  html+=`<div class="bolum">
    <div class="bolum-baslik-row">
      <div class="bolum-ikon">🧠</div>
      <div><div class="bolum-baslik">Psikolojik Değerlendirme</div><div class="bolum-alt">Antrenör değerlendirmesi</div></div>
    </div>`;

  const a=aList?.[0],s=sList?.[0];
  if(!a&&!s){
    html+=`<div class="psiko-bekliyor">Antrenörün değerlendirmesi henüz yapılmadı.</div>`;
  } else {
    const bolumler=[
      {baslik:'🔵 Rekabet Kaygısı',altlar:[
        {ad:'Bilişsel Kaygı',puan:s?ort([s.bk1,s.bk2,s.bk3,s.bk4,s.bk5,s.bk6,s.bk7,s.bk8,s.bk9]):null,max:4,dusukIyi:true},
        {ad:'Somatik Kaygı',puan:s?ort([s.sk1,s.sk2,s.sk3,s.sk4,s.sk5,s.sk6,s.sk7,s.sk8,s.sk9]):null,max:4,dusukIyi:true},
        {ad:'Özgüven',puan:s?ort([s.og1,s.og2,s.og3,s.og4,s.og5,s.og6,s.og7,s.og8,s.og9]):null,max:4,dusukIyi:false},
      ]},
      {baslik:'🟣 Motivasyon',altlar:[
        {ad:'Görev Yönelimi',puan:s?ort([s.g1,s.g2,s.g3,s.g4,s.g5,s.g6,s.g7]):null,max:5,dusukIyi:false},
        {ad:'Ego Yönelimi',puan:s?ort([s.e1,s.e2,s.e3,s.e4,s.e5,s.e6]):null,max:5,dusukIyi:true},
      ]},
      {baslik:'🟢 Mental Dayanıklılık',altlar:[
        {ad:'Kontrol',puan:s?ort([s.kon1,s.kon2,s.kon3]):null,max:5,dusukIyi:false},
        {ad:'Bağlılık',puan:s?ort([s.bag1,s.bag2,s.bag3]):null,max:5,dusukIyi:false},
        {ad:'Meydan Okuma',puan:s?ort([s.mey1,s.mey2,s.mey3]):null,max:5,dusukIyi:false},
        {ad:'Güven',puan:s?ort([s.guv1,s.guv2,s.guv3]):null,max:5,dusukIyi:false},
      ]},
      {baslik:'🟠 Konsantrasyon',altlar:[
        {ad:'Geniş-Dışsal',puan:s?ort([s.gd1,s.gd2,s.gd3,s.gd4]):null,max:5,dusukIyi:false},
        {ad:'Dar-Dışsal',puan:s?ort([s.dd1,s.dd2,s.dd3,s.dd4]):null,max:5,dusukIyi:false},
        {ad:'Dikkat Hatası',puan:s?ort([s.dh1,s.dh2,s.dh3,s.dh4]):null,max:5,dusukIyi:true},
      ]},
    ];
    bolumler.forEach(b=>{
      html+=`<div class="alt-cizgi-baslik">${b.baslik}</div>`;
      b.altlar.forEach(alt=>{
        if(alt.puan===null)return;
        const oran=(alt.puan/alt.max)*100;
        const renk=alt.dusukIyi?(alt.puan<=alt.max*.5?'#16a34a':alt.puan<=alt.max*.75?'#ea580c':'#dc2626'):(alt.puan>=alt.max*.75?'#16a34a':alt.puan>=alt.max*.5?'#ea580c':'#dc2626');
        html+=`<div class="psiko-sonuc-satir">
          <div class="psiko-sonuc-ad">${alt.ad}</div>
          <div class="psiko-bar-zemin"><div class="psiko-bar-ic" style="width:${oran}%;background:${renk}"></div></div>
          <div class="psiko-puan" style="color:${renk}">${alt.puan.toFixed(1)}</div>
        </div>`;
      });
    });
  }

  // Sporcu testi gönderme
  html+=`<div style="margin-top:14px;">`;
  if(psikoBekle&&psikoBekle.length>0){
    html+=`<div class="psiko-gonderildi">✓ Testini gönderdik! Antrenörün onaylamasını bekliyoruz.</div>`;
  } else if(s){
    html+=`<div class="psiko-gonderildi">✓ Bu döneme ait testini doldurdun.</div>`;
  } else {
    html+=`<button class="test-doldur-btn" onclick="psikTestFormAc()">🧪 Psikoloji Testimi Doldur</button>`;
  }
  html+=`</div></div>`;

  // 3. EV ÖDEVİ BÖLÜM
  html+=`<div class="bolum">
    <div class="bolum-baslik-row">
      <div class="bolum-ikon">📚</div>
      <div><div class="bolum-baslik">Ev Ödevleri</div><div class="bolum-alt">Antrenörden gelen görevler</div></div>
    </div>`;
  if(!odevler||!odevler.length){
    html+=`<div class="bos-mesaj" style="padding:20px 0;">Henüz ev ödevi atanmamış.</div>`;
  } else {
    odevler.forEach(o=>{
      const tamam=tamSet.has(o.id);
      html+=`<div class="odev-kart">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">
          <div class="odev-kart-baslik">${o.baslik}</div>
          ${tamam?'<span class="odev-tamam-rozet">Tamamlandı</span>':''}
        </div>
        ${o.aciklama?`<div class="odev-kart-aciklama">${o.aciklama}</div>`:''}
        <div class="odev-kart-alt">
          <div class="odev-kart-bilgi">${o.tarih||''} · ${o.sure_dakika||'—'} dk</div>
          ${!tamam?`<button class="odev-baslat-btn" onclick="odevModalAc('${o.id}','${o.baslik}','${(o.aciklama||'').replace(/'/g,"\\'")}',${o.sure_dakika||0})">Başlat</button>`:''}
        </div>
      </div>`;
    });
  }
  html+=`</div>`;

  // PSİKOLOJİ TEST FORMU (başta gizli)
  html+=`<div id="psik-test-bolum" style="display:none;">
    <div class="bolum">
      <div class="bolum-baslik-row">
        <div class="bolum-ikon">🧪</div>
        <div><div class="bolum-baslik">Psikoloji Testim</div><div class="bolum-alt">Dürüstçe ve içten yanıtla</div></div>
      </div>
      <div id="sporcu-anket-alani"></div>
      <button class="btn-tam-kirmizi" style="margin-top:8px;" onclick="sporcuPsikoGonder(this,'${sporcu.id}')">Testi Gönder</button>
      <p id="sporcu-psiko-mesaj" class="basari-yazi"></p>
    </div>
  </div>`;

  icerik.innerHTML=html;

  // Motorik grafik
  if(testler&&testler.length>1){
    motorikGrafik(testler,nk);
  }

  // Sporcu anket formunu oluştur
  anketFormOlustur(SPORCU_SORULAR,'sporcu-anket-alani');
}

function psikTestFormAc(){
  const bolum=document.getElementById('psik-test-bolum');
  if(bolum){
    bolum.style.display='block';
    bolum.scrollIntoView({behavior:'smooth'});
  }
}

async function sporcuPsikoGonder(btn,sporcuId){
  btn.disabled=true;btn.textContent='Gönderiliyor...';
  const fields=['bk1','bk2','bk3','bk4','bk5','bk6','bk7','bk8','bk9',
    'sk1','sk2','sk3','sk4','sk5','sk6','sk7','sk8','sk9',
    'og1','og2','og3','og4','og5','og6','og7','og8','og9',
    'g1','g2','g3','g4','g5','g6','g7','e1','e2','e3','e4','e5','e6',
    'kon1','kon2','kon3','bag1','bag2','bag3','mey1','mey2','mey3','guv1','guv2','guv3',
    'gd1','gd2','gd3','gd4','dd1','dd2','dd3','dd4','dh1','dh2','dh3','dh4'];
  const bos=fields.filter(f=>lDeger(f,'sporcu-anket-alani')===null);
  if(bos.length>8){btn.disabled=false;btn.textContent='Testi Gönder';alert('Lütfen daha fazla soruyu yanıtla!');return}
  const veri={sporcu_id:sporcuId,test_tarihi:new Date().toISOString().split('T')[0],onaylandi:false};
  fields.forEach(f=>{veri[f]=lDeger(f,'sporcu-anket-alani')});
  const{error}=await sb.from('psikoloji_sporcu').insert(veri);
  btn.disabled=false;btn.textContent='Testi Gönder';
  if(error){alert('Hata: '+error.message)}
  else{
    document.getElementById('psik-test-bolum').style.display='none';
    const m=document.getElementById('sporcu-psiko-mesaj');
    // bilgi kutusunu bul ve güncelle
    const birimler=document.querySelectorAll('.test-doldur-btn, .psiko-bekliyor, .psiko-gonderildi');
    birimler.forEach(el=>{
      if(el.closest('.bolum')&&!el.closest('#psik-test-bolum')){
        el.outerHTML=`<div class="psiko-gonderildi">✓ Test gönderildi! Antrenörün onaylamasını bekle.</div>`;
      }
    });
  }
}

// ===== MOTORİK GRAFİK =====
function motorikGrafik(testler,nk){
  const alani=document.getElementById('motorik-grafik-alani');
  if(!alani)return;
  const keys=['uzun_atlama','sprint_30m','illinois','beep_test'];
  const renkler=['#e63946','#2563eb','#16a34a','#ea580c'];
  keys.forEach((key,idx)=>{
    const n=NORMLAR[key];
    const norm=n[nk]||n['E_1314'];
    const gecerli=testler.filter(t=>!isNaN(parseFloat(t[key])));
    if(gecerli.length<2)return;
    const degerler=gecerli.map(t=>parseFloat(t[key]));
    const donemler=gecerli.map(t=>t.donem||(t.test_tarihi?.substring(0,7))||'');
    const W=300,H=110,PL=6,PR=6,PT=14,PB=22;
    const iW=W-PL-PR,iH=H-PT-PB;
    const xS=iW/(degerler.length-1);
    const toX=i=>PL+i*xS;
    const mx=Math.max(...degerler,norm)*1.15,mn=Math.min(...degerler,norm)*.85;
    const toY=v=>PT+iH-((v-mn)/(mx-mn))*iH;
    const poly=degerler.map((v,i)=>`${toX(i)},${toY(v)}`).join(' ');
    const pts=degerler.map((v,i)=>`<circle cx="${toX(i)}" cy="${toY(v)}" r="4" fill="${renkler[idx]}"/><text x="${toX(i)}" y="${toY(v)-7}" text-anchor="middle" font-size="9" fill="${renkler[idx]}">${v}</text>`).join('');
    const xL=donemler.map((d,i)=>`<text x="${toX(i)}" y="${H-4}" text-anchor="middle" font-size="8" fill="#aaa">${d}</text>`).join('');
    const nY=toY(norm);
    alani.innerHTML+=`<div class="grafik-kutu"><div class="grafik-kutu-baslik">${n.ad}</div><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">
      <line x1="${PL}" y1="${nY}" x2="${W-PR}" y2="${nY}" stroke="#eee" stroke-width="1" stroke-dasharray="4,3"/>
      <polyline points="${poly}" fill="none" stroke="${renkler[idx]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts}${xL}
    </svg></div>`;
  });
}

// ===== ÖDEV =====
function odevModalAc(id,baslik,aciklama,sure){
  aktifOdevId=id;
  document.getElementById('ob-baslik').textContent=baslik;
  document.getElementById('ob-aciklama').textContent=aciklama;
  document.getElementById('ob-sure').textContent=sure+' dakika';
  document.getElementById('timer-ekran').textContent='00:00';
  document.getElementById('timer-durum').textContent='Hazır';
  document.getElementById('ob-baslat-btn').classList.remove('hidden');
  document.getElementById('ob-bitir-btn').classList.add('hidden');
  modalAc('m-odev-baslat');
}

async function odevBaslat(){
  odevBaslangic=new Date();
  await sb.from('odev_tamamlama').insert({odev_id:aktifOdevId,sporcu_id:aktifKullanici.sporcu.id,baslangic_zamani:odevBaslangic.toISOString(),tamamlandi:false});
  document.getElementById('ob-baslat-btn').classList.add('hidden');
  document.getElementById('ob-bitir-btn').classList.remove('hidden');
  document.getElementById('timer-durum').textContent='Devam ediyor...';
  timerInterval=setInterval(()=>{
    const f=Math.floor((new Date()-odevBaslangic)/1000);
    document.getElementById('timer-ekran').textContent=String(Math.floor(f/60)).padStart(2,'0')+':'+String(f%60).padStart(2,'0');
  },1000);
}

async function odevBitir(){
  clearInterval(timerInterval);
  const bitis=new Date();
  await sb.from('odev_tamamlama').update({bitis_zamani:bitis.toISOString(),tamamlandi:true}).eq('odev_id',aktifOdevId).eq('sporcu_id',aktifKullanici.sporcu.id).eq('tamamlandi',false);
  document.getElementById('timer-durum').textContent='Tamamlandı!';
  setTimeout(()=>{modalKapat('m-odev-baslat');sporcuSayfasiGoster(aktifKullanici.sporcu)},1500);
}

// ===== YARDIMCI =====
function ort(arr){const v=arr.filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}
function modalAc(id){document.getElementById(id).classList.remove('hidden')}
function modalKapat(id){document.getElementById(id).classList.add('hidden');if(timerInterval){clearInterval(timerInterval);timerInterval=null}}
