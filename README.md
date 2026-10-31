# Habitopia Aile 2.0

Aileler için ortak görevler, alışveriş, Radar, aile takvimi ve **Evim ve Belgeler**.

**Web:** https://iyiyolakademi-cpu.github.io/habitopia/

## Kayıt zorunlu: Örnek aile kaldırıldı

- İlk açılışta yalnızca **Kayıt ol / Giriş yap** ekranı görünür. Örnek aile, demo verisi veya kayıt dışı kullanım yoktur.
- **Yeni hesap:** Ad + aile adı + e-posta + şifre gir → **Kayıt ol ve başla**. E-posta doğrulama açıksa bağlantıyı onayla. Oturum açılınca aile otomatik oluşturulur.
- **Davetli üye:** **Davet kodum var** seçeneğinde ad, davet kodu, e-posta ve şifre girilir. Hesap doğrulanınca kullanıcı aileye katılır.
- **Mevcut hesap:** Giriş yap → daha önce katıldığı aile alanı açılır.
- Tek seferlik aile oluşturma/katılma bilgileri, e-posta doğrulamasını sürdürmek için yalnızca geçici `sessionStorage` içinde saklanır. Bağlantı farklı tarayıcıda açılırsa aile oluşturma veya davet kodu adımının yeniden tamamlanması gerekebilir.
- Bulut bağlantısı kurulamazsa, kişisel verileri korumak için uygulama boş bir demo ekranına düşmez; yeniden deneme ekranı gösterilir.

## Yeni görsel kimlik

- **Aile Akışı:** Günün önceliği, bekleyen görevler, yaklaşan tarihler ve haftalık takvim tek akışta.
- **Hızlı işlemler:** Görev gönder, alışverişe ekle, Radar hatırlatması kur, etkinlik oluştur.
- **Görünüm:** Kırık beyaz zemin, koyu orman yeşili, sıcak şeftali vurguları, daha doğal ve geniş aralıklı düzen.
- **Kayıt tasarımı:** Masaüstünde iki bölmeli marka + form, mobilde tamamen tek sütunlu kayıt ekranı.

Bulut senkronizasyonunda Supabase Auth, Postgres RLS, Realtime ve 25 saniyelik yedek yenileme kullanılır.

**Bulut projesi:** `Habitopia Aile`, ref `bcrbkrkgsiugsmxmginx`. Patiyiz Supabase projesinden tamamen ayrı. Web istemcisinde yalnızca herkese açık **publishable** anahtar vardır, asla admin / service-role anahtarı yoktur.

## Altı geliştirme

1. **Aile hesabı ve davet:** E-posta/şifre, aile oluşturma, 128 bit rastgele davet kodu, aile üyesi olarak katılım. Üyeler farklı telefonlarla aynı haneye erişir.
2. **Görevler ve bildirimler:** Aile görevi üyeye atanır, kişisel tarih/saat ile hatırlatılır, onay gerekmeden tamamlanır. Sunucu `pg_cron` ile her dakika zamanı gelen görev/Radar kayıtlarına **uygulama içi bildirim** üretir. Uygulama açıkken tarayıcı bildirimleri izne bağlı olarak görüntülenebilir. **Uygulama kapalıyken işletim sistemi push bildirimi henüz yoktur** (VAPID, service worker ve ayrı sağlayıcı kurulumu gerekir).
3. **Evin dijital hafızası:** Ev eşyası, marka/model, seri, satın alma, garanti bitişi, servis geçmişi. Garanti tarihi girildiğinde Radar kaydı oluşturulur. Hesaba giriş yapıldığında özel PDF/fotoğraf belgeleri 5 MB sınırlı ve özel bucket'ta tutulabilir.
4. **Birbirine bağlı işler:** Görev, alışveriş ürünü veya Radar kaydı bir takvim etkinliğine bağlanabilir. Etkinliğin altında bağlantılı işler ve tamamlanma durumları listelenir.
5. **Güvenlik:** Her tabloda RLS. Aile kayıtlarını yalnızca üyeler görür. Özel kayıtları yalnızca oluşturan kişi okuyabilir. Sağlık Radar kayıtları zorunlu olarak özel kalır. Üyeye atanmayan görev tamamlanamaz. Bağlı etkinlik aynı aileye ait olmalıdır. Dosyalar anonim erişime kapalıdır. Sunucudaki 5 yetki yükseltilmiş RPC, `auth.uid()` ve aile üyeliği doğrular; Supabase security advisor bu kontrollü RPC'leri bilgilendirme/uyarı olarak listeleyebilir.
6. **Mobil:** Dar ekran tasarımı, sabit 5'li alt gezinme, ayrı Evim ve Belgeler sayfası, hesap ve davet pencereleri.

## Supabase e-posta doğrulama ayarı — yayın öncesi gerekli

Supabase → **Habitopia Aile** → **Authentication → URL Configuration**:

- **Site URL:** `https://iyiyolakademi-cpu.github.io/habitopia/`
- **Redirect URLs:** `https://iyiyolakademi-cpu.github.io/habitopia/` ve `https://iyiyolakademi-cpu.github.io/habitopia/index.html`

Bunlar ayarlanmadan e-postayla hesap doğrulaması doğru sayfaya dönmeyebilir. Bu ayarlar connector üzerinden otomatik düzenlenemediği için panelde kontrol edilmelidir. Geliştirme sırasında localhost için ayrıca izinli adres eklenmelidir.

## Veri ve güvenlik sınırları

- Eski `habitopia.html` ve `hayat-borsan.html` dosyaları korunur; eski veriler yeni buluta otomatik aktarılmaz.
- Aynı anda hızlı, çakışan değişikliklerde otomatik birleştirme garantisi yoktur. Sunucu işlemleri seri gönderilir; diğer üyelerin değişiklikleri Supabase Realtime ile yüklenir ve ayrıca düzenli yenilenir. Özellikle eşzamanlı düzenleme için gerçek cihazlarla test gereklidir.
- Aile davet kodunu yalnızca güvendiğiniz kişilerle paylaşın; davet kodu aile üyeliği sağlayabilir.
- Sağlık verileri ve özel dosyalar için RLS uygulanmıştır; yine de geniş kullanıcı dağıtımından önce kimlik, yetki, storage, veri silme ve KVKK incelemesi gereklidir.
- **Tam otomatik mobil push, telefon tamamen kapalıyken bildirim, Android/iOS mağaza paketleri, çok cihazlı kabul testleri ve hesap silme akışı henüz tamamlanmadı.** Bu sürüm halka açık mağazaya hazır olarak değerlendirilmemelidir.

## Geliştirme ve test

```sh
node scripts/build.mjs --check
node scripts/validate.mjs
node --check assets/family.js
node --check assets/family-cloud.js
node --test tests/*.test.cjs
```

Şema: `supabase/migrations/202611010001_...` ile `003_...`. Migration'lar yeni Habitopia Aile veritabanında çalıştırılmıştır; Patiyiz projesinde işlem yapılmamıştır.

## Eski dosyalar ve geri dönüş

- Önceki ana ekran yerine Habitopia Aile vardır.
- Eski Habitopia: `habitopia.html`; Hayat Borsası: `hayat-borsan.html`.
- 1.0 önceki yedek: `backup/habitopia-before-family-20261031`.
- 2.0 ana dala aktarılmadan önce ayrıca GitHub PR ve commit ile sürüm geçmişi korunur.
