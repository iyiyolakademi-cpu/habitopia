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
