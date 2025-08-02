-- queuematic08 Database User Creation Script
-- Bu script qm_user adlı kullanıcıyı oluşturur ve queuematic08 veritabanına tam yetki verir

-- Eğer kullanıcı zaten varsa, önce silelim (isteğe bağlı)
-- DROP USER IF EXISTS qm_user;
/*
-- qm_user adlı kullanıcıyı oluştur
CREATE USER qm_user WITH 
    LOGIN 
    PASSWORD 'queuematic082024'
    CREATEDB
    NOSUPERUSER
    INHERIT
    NOREPLICATION;
*/
-- Veritabanı henüz yoksa oluştur
-- CREATE DATABASE queuematic08;

-- queuematic08 veritabanının sahibini qm_user yap
ALTER DATABASE queuematic08 OWNER TO qm_user;

-- qm_user'a queuematic08 veritabanı üzerinde tüm yetkileri ver
GRANT ALL PRIVILEGES ON DATABASE queuematic08 TO qm_user;

-- queuematic08 veritabanına bağlan (manuel olarak yapılması gerekir)
\c queuematic08;

-- Mevcut şemadaki tüm tablolara yetki ver
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO qm_user;

-- Gelecekte oluşturulacak tablolara da otomatik yetki ver
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO qm_user;

-- Sequence'lara (sıra numaraları) yetki ver
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO qm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO qm_user;

-- Function'lara yetki ver
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO qm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO qm_user;

-- Şema üzerinde kullanım yetkisi ver
GRANT USAGE ON SCHEMA public TO qm_user;

-- qm_user'ın public şemasında tablo oluşturma yetkisi ver
GRANT CREATE ON SCHEMA public TO qm_user;

-- Kullanıcı bilgilerini göster
SELECT 
    usename as "Kullanıcı Adı",
    usesuper as "Süper Kullanıcı",
    usecreatedb as "Veritabanı Oluşturabilir"
FROM pg_user
WHERE usename = 'qm_user';

-- Veritabanı sahipliğini kontrol et
SELECT 
    datname as "Veritabanı",
    pg_catalog.pg_get_userbyid(datdba) as "Sahip"
FROM pg_database 
WHERE datname = 'queuematic08';

-- qm_user'ın yetkilerini göster
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
AND tableowner = 'qm_user';

-- İşlem tamamlandı mesajı
SELECT 'qm_user kullanıcısı başarıyla oluşturuldu ve tüm yetkiler verildi!' as "Durum";