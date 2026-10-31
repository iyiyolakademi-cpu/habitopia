# Habitopia Nova / 5.0 — sıfırdan tasarlanan önizleme

Bu klasör, mevcut Habitopia'nın üzerine eklenmiş bir tema **değildir**. Yeni arayüz ve uygulama mantığı için ayrı bir başlangıçtır.

## Nasıl açılır?

Depo kökünde bir statik HTTP sunucusu çalıştırın:

```bash
python3 -m http.server 8000
```

Tarayıcı: `http://localhost:8000/next/`

Alternatif olarak `next/index.html` dosyasını açabilirsiniz; fakat dosya modu yerine yerel sunucu kullanılması önerilir.

## İlk çalışan özellikler
- Mobil öncelikli, bento düzenli yeni ana sayfa; **sabit alt gezinme yok**.
- Alışkanlık ekleme, bugün işaretleme, son 7 gün, günlük seri ve silme.
- Görev ekleme, tamamlandı/geri alma ve silme.
- 10/25/45 dakikalık odak zamanlayıcısı, tamamlanan seansı kaydetme.
- 7 günlük günlük aktivite grafiği, seviye ve deneyim puanı.
- Dört seçenekli günlük ruh hâli kaydı.
- İlk açılışta isteğe bağlı kullanıcı adı ve başlangıç rutinleri.
- Verileri JSON olarak dışa aktarma ve Nova JSON yedeğinden geri yükleme.
- Erişilebilir buton açıklamaları ve küçük telefonlara uyarlanmış yerleşim.

## Veri politikası

Bu sürümde kullanıcı verileri **yalnızca bu tarayıcıda** `localStorage` içinde, `habitopia:nova:v1` anahtarında tutulur. Bulut senkronizasyonu, hesap girişi, Firebase/Flutter bağlantısı **henüz yoktur**. Bu klasör mevcut Habitopia ana sürümündeki yerel kayıtları **okumaz, taşımaz veya değiştirmez**. Eski kullanıcı verisi için kontrollü dışa aktarma / şema dönüştürme / doğrulama / kullanıcı onaylı içe aktarma geliştirilmeden eski sistemi değiştirmeyin.

Eski `index.html`, `habitopia.html`, `hayat-borsan.html` ve üretim kaynakları değiştirilmedi. Bu çalışma `feat/habitopia-rebuild-v5-20261031` dalındadır.

Odak zamanlayıcısı sayfa belleğindedir: sekme arka plandayken süre hesaba katılır; fakat sayfa tamamen kapatılırsa aktif seans sürdürülmez. Bu kısıt ileriki sürümde ele alınmalıdır.

## Sonraki geliştirme aşamaları

1. **Ürün kararı / kullanıcı testi:** Eski sürümden ne aktarılacak, yeni Habitopia'nın çekirdek hedef kitlesi, kullanıcı yolculuğu.
2. **Veri ve güvenlik:** Eski veri formatını inceleme; açık rızayla tek seferlik geçiş; hesaplar, erişim kuralları, yedekleme ve senkronizasyon.
3. **Zamanlayıcı ve hatırlatıcılar:** Kalıcı zamanlayıcı durumu, tarayıcı/cihaz bildirimleri (izinli), güvenilir tarih-saat davranışı.
4. **Ürün kalitesi:** Mobil Safari/Chrome, dar ekran, erişilebilirlik, boş durumlar, hatalar, otomatik tarayıcı testleri.
5. **Yayın:** PWA ikonları, manifest, offline önbellek ve gerekiyorsa Flutter WebView entegrasyonu.

## Testler

```bash
node --test tests/nova.test.cjs
```

Bu testler temel sözdizimi ve HTML yapısını kontrol eder; gerçek cihazlarda uçtan uca testi **yerine geçmez**.
