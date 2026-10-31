# Habitopia — kaynak kod ve güvenlik altyapısı

Bu depo Habitopia'nın **tek dosyalık, çevrimdışı/Flutter WebView uyumlu** yayın sürümünü `index.html` olarak sunar.

## Kaynak düzeni
- `src/index.template.html` — uygulama iskeleti
- `src/styles/` — mevcut CSS katmanları (görsel düzen korunmuştur)
- `src/scripts/core.js` — mevcut uygulama mantığı, veri şeması ve kayıt akışları
- `src/scripts/polish.js` — önceki davranış/istatistik düzeltmeleri
- `src/scripts/data-safety.js` — doğrulama ve yerel/bulut çakışma koruması
- `scripts/build.mjs` — kaynaklardan **tek dosyalık** `index.html` üretir
- `tests/` — kritik veri güvenliği senaryoları

## Geliştirme
Node.js 22+ ile:
```bash
node scripts/build.mjs
node scripts/build.mjs --check
node scripts/validate.mjs
node --test tests/*.test.cjs
```
`index.html` üretim dosyasıdır. **Değişiklikleri `src/` içinde yapın**, sonra derleyin. Harici JS/CSS ihtiyacı yoktur.

## Veri güvenliği
- Orijinal kaynak yedeği: `backup/habitopia-before-phase1-20261031`
- Eski Hayat Borsam projesi: `backup-hayat-borsam-20261031` (dokunulmadı)
- Bozuk ana kayıt için önce geçerli yerel yedek denenir; okunamayan kayıt kurtarma anahtarına korunur.
- Hesaplara özel depolama anahtarına eski, paylaşılan tarayıcı kayıtları **otomatik** taşınmaz.
- Flutter'dan gelen bulut verisi doğrulanır; daha yeni yerel kayıt ezilmez.
- Geçerli kayıt üzerine yeni kayıt yazmadan önce kurtarma kopyası saklanır.
- JSON içe aktarımı öncesinde mevcut veri ayrı kurtarma kopyasına alınır; hata varsa işlem yapılmaz.
- Metin notları 12.000 karaktere kadar korunur; geçmiş odak seansları 365 kayıtla sınırlandırılmaz.

**Sınır:** Repo yalnızca web HTML uygulamasını içerir. Firebase Authentication, Firestore güvenlik kuralları, gerçek cihazda Flutter entegrasyonu, mağaza bildirimleri ve veri silme politikasının uçtan uca doğrulanması bu depoda mümkün değildir. Canlıya alınmadan önce ayrıca sınanmalıdır.

## Geri alma
Ana sürümde sorun görülürse git ile eski yedek dalını karşılaştırın, gerektiğinde `backup/habitopia-before-phase1-20261031` dalından `index.html` dosyasını geri alın. Kullanıcı verileri kod deposunda değildir; cihaz/Firebase yedekleri ayrıca yönetilmelidir.

## Aşama 2: Ekran yenilenmesi
- `src/styles/redesign.css`: ortak renk/yazı/bileşen, erişilebilir odak, açık/koyu tema, mobil/masaüstü düzen.
- `src/scripts/redesign.js`: 5 sekmeli gezinme, veri bağlantılı günlük özet, seçilebilir aylık takvim, gelişim ve kişisel profil özeti.
- `src/index.template.html`: yeni Planım ve Profilim sayfaları, özet kartları, 5 sekmeli menü.
- `view-challenges`: 21 günlük hedefler artık Planım > 21 günlük hedefler kısayoluyla açılır.
- Eski ekranların eylemleri, kayıt anahtarları ve bütün kullanıcı verileri korunur.

Bu aşama mobil / görsel tasarım katmanıdır. Bulut/Flutter bağlantısı, gerçek ekran boyutları ve uzun süreli kullanım hâlâ ayrıca manuel test edilmelidir.

## Midnight: varsayılan ve tek görünüm
Tüm ekranlar `src/styles/midnight.css` dosyasındaki koyu renk sistemiyle gösterilir. Açık tema seçimi kaldırıldı. Eski kullanıcıların dark:false ayarı güvenle dark:true olarak normalize edilir; görev, not ve takip kayıtları korunur. Otomatik testler: `tests/midnight.test.cjs`.

## İki Dünya platformu
Habitopia ve Hayat Borsan artık aynı depoda iki ayrı işlevsel uygulama olarak yer alır; ana sayfa `index.html` büyük kutucuklu seçim menüsüdür. Ayrıntılar için `docs/TWO-WORLDS.md`.

## Yeni Habitopia Yaşam Haritası
Giriş sonrası `habitopia.html` ana ekranı artık metrik/kart paneli değil, dört etkileşimli durağı olan çizim tabanlı gece haritasıdır. Ritim Ormanı → alışkanlıklar; Görev Yolu → açılabilir günlük defter; Sessiz Vadi → odaklanma; Ufuk Noktası → plan/takvim. Haritadaki ağaç mevcut günlük görev ve alışkanlık tamamlanmasına göre 0-4 görünüm seviyesinde canlanır; ayrı puan veya veri tablosu yaratılmaz. Eski günlük araçlar aşağıdaki `<details>` defterine taşındı. Kaynaklar: `src/styles/journey.css` ve `src/scripts/journey.js`. Geri dönüş dalı: `backup/habitopia-before-journey-20261031`.

## Habitopia 4.0 — Etkileşimli Ada (mobil)
- Kullanıcıya gösterilen Habitopia ana sayfası artık **koyu, şelaleli ve ağaç evli yüzen ada**. Grafik, kart paneli ve eski yol haritası ana ekranda görünmez.
- **Alışkanlıklarım / Dünyam / İlerlemem / Profilim** adanın içinde dört büyük butondur. Sabit alt menü yoktur. Her biri uygulamada ayrı bir ekran açar; ekranlarda geri dönme butonu vardır.
- Görevler, su ve odak araçları **Görevlerim** ekranında eski veriler korunarak kullanılır.
- Alışkanlıklar için yeni günlük dokunma listesi, ilerleme için 7/30/90 gün grafikleri, Dünyam için gerçek XP'ye dayalı keşif seviyeleri eklenmiştir. Eski haftalık takip ve diğer özellikler korunmuştur.
- Görseller telifsiz olarak depoda yer alan **orijinal SVG** çizimle oluşturulmuştur: `assets/habitopia-island.svg`.
- Kod: `src/styles/island.css` ve `src/scripts/island.js`. Kullanıcı veri şeması değiştirilmedi.
- Geri dönüş: `backup/habitopia-before-island-ui-20261031`.

Not: Keşif bölgeleri puana bağlı görsel seviyelerdir, henüz serbest dünya dekorasyonu/satın alma sistemi değildir. Mobil Safari, Android ve Flutter WebView testleri ayrıca yapılmalıdır.
