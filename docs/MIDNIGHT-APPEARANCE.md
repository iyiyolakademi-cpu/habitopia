# Habitopia Midnight — tamamen koyu renk düzeni

31 Ekim 2026 renk güncellemesi:
- Sadece siyah/antrasit tema; eski açık/yeşil tema seçimleri görünümü değiştiremez.
- Arka plan `#080a0f`, kartlar `#151923`, yükseltilmiş alanlar `#1c2130`, yazı `#f5f6fd`, vurgu `#a6adff`.
- Ana ekran, görevler, alışkanlıklar, plan takvimi, istatistikler, profil, notlar, su ve ruh hâli modalları, karşılama ekranı, alt menü ve odak bildirimi karanlıklaştırıldı.
- Tarayıcı renk şeması ve telefon durum çubuğu koyu olarak ayarlandı. Tema değiştirme kontrolü kaldırıldı. Ses ve hareket azaltma ayarları korunur.
- Kullanıcının görevleri, alışkanlıkları, kayıtları ve diğer veri alanları silinmedi.

## Kaynaklar
`src/styles/midnight.css` son CSS katmanıdır.
`src/scripts/core.js` başlangıçtaki `dark` sınıfını ve meta rengini kalıcı hâle getirir.

## Test
`node scripts/build.mjs --check`, `node scripts/validate.mjs` ve `node --test tests/*.test.cjs`.
Cihazdaki Flutter gömülü ekranlar, harici giriş ekranları ve gerçek mobil kullanım ayrıca kontrol gerektirir.
