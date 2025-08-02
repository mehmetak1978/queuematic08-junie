# Web Tabanlı Sıramatik Sistemi - Requirements

## Proje Özeti
- Çok şubeli marketlerde kullanılacak web tabanlı sıramatik sistemi. Ekranlar küçük tablet veya büyük pc ekranlarında düzgün görünebilecek şekilde responsive ve modern olmalı.

- Müşteriler tablet üzerinde çalışacak web uygulaması üzerinden sıra numarası alacak,
- Gişe çalışanları web uygulaması üzerinden müşteri çağıracak, işi tamamlayacak
- Pano olarak kullanılacak bir web uygulaması üzerinde çağrılar, hangi gişede hangi numaralı iş var görüntülenecek.



#### Gereksinimler:
 
- **Genel Özellikle**:
  - Sıra numaraları şube bazında verilecek ve takip edilecek.
  - Her şubedeki gişe sayısı farklı olabilecek.
  
- **Kullanıcı Yönetimi**:
  - Uygulama açılırken bir login sayfası olacak
  - Kullanıcılar bu login sayfasından giriş yapacaklar
  - Kullanıcıların profili olacak ("admin", "gişe görevlisi")
  - Bir gişe görevlisi yalnızca bir şubede çalışacak.
  - admin için şube girilmeyecek
  - Kullanıcı tanımlama, kullanıcının şifresini belirleme, kullanıcının profilini belirleme, kullanıcının şubesini belirleme, gibi işler admin sayfasından yapılacak.

- **Müşteri Web Uygulaması**:
  - Gişe görevlisi profilindeki bir kullanıcı bu sayfayı açabilecek. Ekran gişe görevlisinin çalıştığı şube için gösterilecek.
  - Sıra numarası alma butonu olacak
  - Alınan sıra numarası gösterilecek
  - En son çağrılan sıra numarası gösterilecek
  - Daha önce alınan numaralar gösterilecek
  - hem küçük tablette hem büyük bilgisayar ekranında çalışacak responsive tasarım

- **Gişe Çalışanı Uygulaması**:
  - Gişe görevlisi profilindeki bir kullanıcı bu sayfayı açabilecek. Ekran gişe görevlisinin çalıştığı şube için gösterilecek.
  - Gişe görevlisi login olduktan sonra kendi şubesinde, başka gişe görevlileri tarafından daha önce çalışma başlatılmamış müsait gişeler gösterilecek. Gişe görevlisi bunlardan hagisinde çalışmak istediğini seçecek.
  - Gişe görevlisinin seçimini yaptıktan sonra bu bilgi databasede tutulacak.
  - Gişe görevlisi sıradaki müşteri çağır butonu ile bir sonraki müşteriyi çağıracak. Bu bilgi databasede tutulacak.
  - Çağırdığı numara (şu anda işlem yapılan) gösterilecek. 
  - Gişe açılışından bu yana tamamladığı işler en yeniden en eskiye listelenecek
  - İşlemi tamamla butonu olacak. Gişe görevlisi işlemi tamamlayınca bu databasee yazılacak. 
  - Gişeyi kapatma butonu olacak. Gişe görevlisi gişeyi kapatınca bu databasee yazılacak. Kendisi yada şubedeki başka bir gişe görevlisi tekrar girdiğinde bu gişe müsait hale gelmiş olacak.
  - Gişe görevlisi uygulamadan çıkıp tekrar girerse databasedeki bilgiler aracılığı ile kaldığı yerden devam edecek. Çağırdığı numara varsa grülecek. Gişe açılışından bu yana tamamladığı iş varsa görülecek.
  - hem küçük tablette hem büyük bilgisayar ekranında çalışacak responsive tasarım
  - admin kullanıcısı, istediği şubedeki bir gişe görevlisinin çalışmasını sonlandırabilecek. Bu bilgi databasee yazılacak. 

  
- **Pano Uygulaması**:
  - Gişe görevlisi profilindeki bir kullanıcı bu sayfayı açabilecek. Ekran gişe görevlisinin çalıştığı şube için gösterilecek.
  - Çağrılan sıra numarası büyük fontla gösterilecek
  - Çağıran gişe numarası büyük fontta gösterilecek
  - Hangi sıra numarasına hangi gişede işlem yapılıyor gösterilecek.
  - Bekleyen sıra numaraları en eskiden en yeniye doğru sıralanacak
  - Sayfa otomatik yenilenecek. Beradaki yenileme süresi config dosyasında yer alacak. 
  - hem küçük tablette hem büyük bilgisayar ekranında çalışacak responsive tasarım


#### Teknik Gereksinimler:
  - PostgreSQL veritabanı
  - config dosyasında belirtilen refresh_time aralıkları ile refresh olacak ekranlar
  - tüm sayfalar ortak database'i kullanacak
  - sayfalar arasında anlık mesajlaşma olmayacak
  - refresh edilecek bilgiler database üzerinden yapılacak.

## Teknik Mimari

### Önerilen Teknolojiler:
- **Backend**: Node.js
- **Frontend**: React
- **Database**: PostgreSQL

### Sistem Bileşenleri:
1. **API Server**: Merkezi backend servisi
2. **Customer App**: Müşteri web sayfası
3. **Clerk App**: Gişe çalışanı web sayfasy
4. **Display App**: Pano görüntü web sayfası
5. **Admin App**: Yönetici web sayfası

### Veritabanı ###
1. local postgresql üzerinde şemanın yaratılması için gerekli scriptleri hazırla
2. bu scriptleri çalıştıracak bir js dosyası hazırla
3. gerektiğinde tüm database'i sıfırlayıp, yeniden başlanabilecek js dosyası hazırla

## Başarı Kriterleri:
- 1 markette 2 farklı şubede  2-3 gişe ile test
