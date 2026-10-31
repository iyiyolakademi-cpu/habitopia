# İKİ DÜNYA — Kullanım ve geri dönüş

**İlk giriş:** `index.html` üzerinde iki büyük seçim kutusu vardır:
1. **Hayat Borsan** → `hayat-borsan.html`
2. **Habitopia Dünyan** → `habitopia.html`

## Her iki uygulama birbirine bağlıdır
- Habitopia başlığındaki **İKİ DÜNYA** bağlantısı seçim ekranına; **Hayat Borsan ↗** diğer uygulamaya götürür.
- Hayat Borsan üstündeki gezinme çubuğundan Habitopia'ya ve seçim ekranına gidilir.
- Hayat Borsan'ın Firebase giriş ekranında da seçim ekranına dönüş vardır.
- Seçim kutuları tamamen tıklanabilir ve mobilde alt alta dizilir. Yönlendirme zorunlu değildir; kullanıcı kendisi seçer.

## Veri sınırları
- Habitopia'nın özgün depolama anahtarları ve kullanıcı verileri korunur; dosya yolu `habitopia.html` olur.
- Hayat Borsam, `backup-hayat-borsam-20261031` dalından orijinal hâliyle geri getirildi; giriş, portföy ve Firebase JS mantığı değiştirilmedi. Sadece yeni görsel stil ve gezinme bağlantıları eklendi.
- Hayat Borsan yerel verileri `hayatborsasi_terminal_v2` anahtarında saklar; Habitopia anahtarlarından farklıdır.
- Firebase Google girişinin GitHub Pages alan adı için yetkilendirilmiş olması gerekir. Gerçek kullanıcıyla giriş ve bulut senkronizasyonu ayrıca sınanmalıdır.
- Üç sayfa da statik GitHub Pages üzerinde çalışacak şekilde hazırlanmıştır.

## Kaynak / Build
- `src/launcher.html` → `index.html` (ana seçim)
- `src/index.template.html` + CSS/JS → `habitopia.html` (Habitopia)
- `src/hayat-borsan.html` → `hayat-borsan.html` (Hayat Borsan)
- `node scripts/build.mjs` tüm çıktıları günceller.
- `node scripts/build.mjs --check`, `node scripts/validate.mjs`, `node --test tests/*.test.cjs` otomatik testlerdir.

## Geri dönüş
- Değişiklik öncesi Habitopia yedeği: `backup/habitopia-before-dual-app-20261031`
- Hayat Borsam eski dal: `backup-hayat-borsam-20261031`
- Veriler Git deposunda bulunmaz. Cihaz/Firebase kayıtlarının yedekleri ayrıca korunmalıdır.

## Kontrol edilmesi gerekenler
- [ ] Android ve iPhone'da iki uygulamaya giriş ve karşılıklı geçiş
- [ ] Google Firebase ile Hayat Borsan giriş ve senkronizasyon
- [ ] Habitopia notlar/görevler/alışkanlıklar/odak geçmişi
- [ ] Farklı ekran ölçüleri, takvim açılır pencereler ve büyük metinler
