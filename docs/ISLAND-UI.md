# Habitopia Etkileşimli Ada — Uygulama kontrolü

Seçilen tasarım: **2. Etkileşimli Dünya**. Eski mobil kartlı pano ve sabit alt navigasyonun yerine.

## Akış
1. Kullanıcı `index.html` üzerinden Habitopia'yı seçer.
2. `habitopia.html` büyük yüzen ada görseli, kullanıcı ismi, XP ve dört taş butonla açılır.
3. **Alışkanlıklarım** → `view-habits`, büyük dokunmatik günlük liste; haftalık ayrıntı açılır.
4. **Dünyam** → `view-world`, ada görseli, seviye ve XP bazlı alanlar.
5. **İlerlemem** → `view-profile`, 7/30/90 günlük grafik ve mevcut analiz/sağlık kısayolları.
6. **Profilim** → `view-account`, kişisel bilgiler, notlar, ayarlar.
7. **Görevler** → `view-tasks`, eski görev, su ve odak kontrolleri.
8. Her ekranda **Dünyama dön** ile ana adaya dönüş.

## Güvenlik / uyumluluk
- `state` şeması, Firebase/native köprüsü ve localStorage anahtarları değiştirilmedi.
- Mevcut `toggleHabit`, `renderAll`, odak, ödül, içe/dışa aktarım çağrıları korunur.
- `journey.js` eski gerekli DOM alanlarını yeni görev görünümünde bulmaya devam eder.
- Gerçek telefon ve Firebase canlı testleri yapılmadı; bunlar yayın sonrası öncelikli QA adımıdır.
- Yeni keşif bölgeleri mevcut XP ile açılır, kullanıcıya gerçek para veya fiziksel ödül vaat edilmez.
