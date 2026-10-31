# Habitopia Aile — Birlikte daha kolay

**Yeni ana uygulama:** `index.html` — mobil ve masaüstünde çalışan Habitopia Aile önizlemesi.

## Ne var?

- **Aile Görevleri:** Bir aile üyesi çok satırlı görev listesi hazırlar; aile üyesine atar, bitiş ve hatırlatma tarihi/saatini belirler. Sorumlu kişi tamamlandığını tek dokunuşla işaretler; onay gerekmez. Bildirim açıldığında ilgili listeye yönlendirme desteklenir.
- **Ortak Alışveriş:** Ürün, miktar, birim, birim fiyatı, bütçe, tahmini toplam ve satın alınanlar. Listeyi aile üyesine atama ve hatırlatma tarihi.
- **Aile Radarı:** Fatura, abonelik, araç, garanti, ev bakımı, sağlık, okul, özel hatırlatmalar kategorileri. Son tarih, hatırlatma saati, sorumlu, tamamlandı durumu. Sağlık kaydı seçilince gizlilik kutusu otomatik seçilir.
- **Aile Takvimi:** Ay görünümü, etkinlik oluşturma, aile üyelerini davet etme ve katılıyorum/belki/katılamam yanıtları.
- **Ailem:** Aynı cihazda farklı aile üyelerinin görünümünü deneyebilme.
- **Ayarlar:** Aile adını değiştirme, JSON veri dışa/içe aktarma, bildirim izni, yerel sıfırlama.

## Önemli: önizlemenin sınırları

Bu sürüm **tek cihazda çalışan işlevsel bir prototiptir**. Veriler yalnızca `localStorage` içinde `habitopia-family-v1` anahtarıyla saklanır. Örnek aile verileri ürünün nasıl çalıştığını göstermek içindir.

- **Henüz farklı aile üyelerinin telefonları eşzamanlanmaz.** Üye değiştirme sadece aynı cihazdaki simülasyondur. Gerçek davet, oturum açma, erişim kontrolü, güvenli aile paylaşımı **yoktur**.
- Hatırlatma zamanı gelen kayıtlar uygulama açıkken bildirimler bölümünde görünür. Bildirim izni verilirse tarayıcıda, uygulama açık ve görünürken sistem bildirimi denenir. **Uygulama kapalıyken garantili bildirim gönderilmez**. Sunucu tarafı zamanlama, push altyapısı ve bildirim servis anahtarları ayrı kurulmalıdır.
- Sağlık ve özel etkinliklerde yerel görünüm filtresi vardır; **gerçek çok hesaplı veri güvenliği yerine geçmez**. Güvenli kullanıcı kimlik doğrulaması ve sunucu erişim politikaları tamamlanmadan hassas veri için kullanılmamalıdır.
- Eski Habitopia hesapları, bulut verileri ve görevleri **otomatik aktarılmaz**. Eski uygulamanın kodları ve veri anahtarları değiştirilmez.

## Eski uygulamalar korundu

- Eski Habitopia: `habitopia.html`
- Eski Hayat Borsası: `hayat-borsan.html`
- Değişiklik öncesi tam dal yedeği: `backup/habitopia-before-family-20261031`
- Önceki Habitopia Nova denemesi: `feat/habitopia-rebuild-v5-20261031`

`src/launcher.html` ana sayfa için kaynak dosyasıdır; `scripts/build.mjs` `index.html` içeriğini buradan üretir. `assets/family.css` ve `assets/family.js` aile uygulamasının kendi dosyalarıdır.

## Çalıştırma

Statik sunucuyla:

```sh
python3 -m http.server 8000
```

Tarayıcı: `http://localhost:8000/`

## Test

```sh
node scripts/build.mjs --check
node scripts/validate.mjs
node --test tests/*.test.cjs
```

GitHub Actions eski uygulamaların davranış kontrollerini ve yeni aile uygulamasının sözdizimi, gezinme, veri alanı ve ana ekran testlerini yürütür.

## Gerçek aile kullanımına açılmadan önce

1. Hesap oluşturma ve aile daveti (gerçek üyelik/roller).
2. Paylaşım yetkileri, özel sağlık verisi izolasyonu, güvenlik kuralları.
3. Gerçek zamanlı bulut senkronizasyonu ve çoklu cihaz tutarlılığı.
4. Sunucu taraflı zamanlanmış push, cihaz token yönetimi ve bildirim tercihleri.
5. Eski Habitopia kullanıcı verileri için kontrollü, onaylı geçiş ve geri alma.
6. iPhone/Android manuel testleri, erişilebilirlik, veri silme ve hukuki metinler.
