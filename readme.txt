Junie ile hazırlandı

Database'i pgAdmin ile kendim yarattım
Daha sonra bu database'e bağlantıyı WS Database plugin sayfasında sağladım
create_user.sql i buradan çalıştırdım.

- config/dataabase/js
    database: process.env.DB_NAME || 'queuematic',
    user: process.env.DB_USER || 'qm_user',
    password: process.env.DB_PASSWORD || 'queuematic2024'


cd backend
npm run setup-db

rootdir
npm run deb

Admin: admin / password123
Clerk1: clerk1 / password123 (Ana Şube)
Clerk2: clerk2 / password123 (Ana Şube)
Clerk3: clerk3 / password123 (Kadıköy Şubesi)
Clerk4: clerk4 / password123 (Kadıköy Şubesi)


# Find what's using port 3008
netstat -ano | findstr :3008
# Kill the process (replace PID with the actual process ID)
taskkill /PID <PID> /F
