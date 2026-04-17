# Dokumentasi API backend-rinchan

> Base URL: `https://<host>/api`

---

## Catatan Umum

- Semua endpoint yang butuh autentikasi harus mengirimkan **salah satu** dari:
  - Header `Authorization: Bearer <accessToken>`
  - Cookie `authToken=<accessToken>`
- Format waktu: Unix Timestamp (integer seconds) yang dikembalikan sebagai ISO string oleh Drizzle ORM
- Error response selalu mengikuti format:
  ```json
  {
    "success": false,
    "message": "Pesan error"
  }
  ```

---

## 1. Autentikasi

### POST /api/auth/register

Mendaftarkan user baru.

**Headers:** Tidak perlu autentikasi

**Request Body (JSON):**

```json
{
  "name": "Nama User",
  "email": "user@email.com",
  "password": "passwordku123"
}
```

| Field      | Tipe     | Wajib | Validasi                         |
| ---------- | -------- | ----- | -------------------------------- |
| `name`     | `string` | ✅    | Min 2, Max 60 karakter           |
| `email`    | `string` | ✅    | Max 70 karakter, format email    |
| `password` | `string` | ✅    | Min 8, Max 255 karakter          |

**Response `201 Created`:**

```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Nama User",
      "email": "user@email.com",
      "avatarUrl": null,
      "createdAt": "2026-04-12T17:42:11.000Z"
    }
  }
}
```

---

### POST /api/auth/login

Login dan mendapatkan access + refresh token.

**Headers:** Tidak perlu autentikasi

**Request Body (JSON):**

```json
{
  "email": "user@email.com",
  "password": "passwordku123"
}
```

| Field      | Tipe     | Wajib | Validasi                         |
| ---------- | -------- | ----- | -------------------------------- |
| `email`    | `string` | ✅    | Max 70 karakter, format email    |
| `password` | `string` | ✅    | Min 8, Max 255 karakter          |

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Nama User",
      "email": "user@email.com",
      "avatarUrl": null,
      "createdAt": "2026-04-12T17:42:11.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

---

### POST /api/auth/refresh

Memperbarui access token menggunakan refresh token.

**Headers:**

| Header            | Nilai                      | Keterangan                                  |
| ----------------- | -------------------------- | ------------------------------------------- |
| `X-Refresh-Token` | `<refreshToken>`           | Refresh token dari login                    |

> Alternatif: Bisa juga dikirim lewat Cookie `refreshToken=<refreshToken>`

**Request Body:** Tidak ada

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Token diperbarui",
  "data": {
    "accessToken": "jwt-access-token-baru"
  }
}
```

---

### DELETE /api/auth/logout

Logout dan menghapus semua refresh token milik user.

**Headers:**

| Header          | Nilai                      |
| --------------- | -------------------------- |
| `Authorization` | `Bearer <accessToken>`     |

**Request Body:** Tidak ada

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Logout berhasil"
}
```

---

## 2. User / Profil

### GET /api/user/me

Mengambil data profil user yang sedang login.

**Headers:**

| Header          | Nilai                      |
| --------------- | -------------------------- |
| `Authorization` | `Bearer <accessToken>`     |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Nama User",
      "email": "user@email.com",
      "avatarUrl": null,
      "createdAt": "2026-04-12T17:42:11.000Z"
    }
  }
}
```

---

### PATCH /api/user/me

Memperbarui data profil user (nama, email, dan/atau password).

**Headers:**

| Header          | Nilai                      |
| --------------- | -------------------------- |
| `Authorization` | `Bearer <accessToken>`     |
| `Content-Type`  | `application/json`         |

**Request Body (JSON):**

```json
{
  "name": "Nama Baru",
  "email": "baru@email.com",
  "oldPassword": "passwordLama",
  "newPassword": "passwordBaru"
}
```

| Field         | Tipe     | Wajib | Validasi                                                     |
| ------------- | -------- | ----- | ------------------------------------------------------------ |
| `name`        | `string` | ❌    | Min 2, Max 60 karakter                                       |
| `email`       | `string` | ❌    | Max 70 karakter, format email                                |
| `oldPassword` | `string` | ❌    | Min 8, Max 255 karakter. **Wajib jika `newPassword` diisi.** |
| `newPassword` | `string` | ❌    | Min 8, Max 255 karakter                                      |

> **Catatan:** Minimal satu field (`name`, `email`, atau `newPassword`) harus diisi.

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Data profil berhasil diperbarui",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Nama Baru",
      "email": "baru@email.com",
      "avatarUrl": null,
      "createdAt": "2026-04-12T17:42:11.000Z"
    }
  }
}
```

---

### POST /api/user/me/avatar

Mengunggah atau mengganti avatar user.

**Headers:**

| Header          | Nilai                      |
| --------------- | -------------------------- |
| `Authorization` | `Bearer <accessToken>`     |
| `Content-Type`  | `multipart/form-data`      |

**Request Body (FormData):**

| Field    | Tipe   | Wajib | Keterangan                                  |
| -------- | ------ | ----- | ------------------------------------------- |
| `avatar` | `File` | ✅    | File gambar (harus bertipe `image/*`)        |

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Avatar berhasil diperbarui",
  "data": {
    "avatarUrl": "https://r2-public-url.com/avatars/user-uuid.png"
  }
}
```

---

### DELETE /api/user/me/avatar

Menghapus avatar user dari R2 storage dan mengembalikan `avatarUrl` ke `null`.

**Headers:**

| Header          | Nilai                      |
| --------------- | -------------------------- |
| `Authorization` | `Bearer <accessToken>`     |

**Request Body:** Tidak ada

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Avatar berhasil dihapus"
}
```

---

## 3. Device

### GET /api/device/list

Mengambil semua perangkat milik user yang sedang login.

**Headers:**

| Header          | Nilai                      |
| --------------- | -------------------------- |
| `Authorization` | `Bearer <accessToken>`     |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "deviceIotId": "RC-v1-XXXX",
      "userId": "uuid",
      "deviceName": "Nama Device",
      "tokenVersion": 1,
      "status": "claimed",
      "lastSeen": "2026-04-12T18:05:25.000Z",
      "createdAt": "2026-04-12T17:42:11.000Z"
    }
  ]
}
```

---

### POST /api/device/claim

Mengklaim perangkat IoT agar terhubung ke akun user.

**Headers:**

| Header          | Nilai                      |
| --------------- | -------------------------- |
| `Authorization` | `Bearer <accessToken>`     |
| `Content-Type`  | `application/json`         |

**Request Body (JSON):**

```json
{
  "deviceIotId": "ABCDEFGHIJ",
  "deviceName": "Meja Belajar"
}
```

| Field         | Tipe     | Wajib | Validasi                       |
| ------------- | -------- | ----- | ------------------------------ |
| `deviceIotId` | `string` | ✅    | Tepat 10 karakter              |
| `deviceName`  | `string` | ✅    | Min 3, Max 20 karakter         |

**Response `201 Created`:**

```json
{
  "success": true,
  "message": "Perangkat berhasil diklaim",
  "data": {
    "device": {
      "id": "uuid",
      "deviceIotId": "ABCDEFGHIJ",
      "userId": "uuid",
      "deviceName": "Meja Belajar",
      "tokenVersion": 1,
      "status": "claimed",
      "lastSeen": "2026-04-12T18:05:25.000Z",
      "createdAt": "2026-04-12T17:42:11.000Z"
    }
  }
}
```

---

### POST /api/device/:id/renew

Memperbarui token version perangkat (menaikkan versi +1, meng-invalidasi API key IoT lama).

**Headers:**

| Header          | Nilai                      |
| --------------- | -------------------------- |
| `Authorization` | `Bearer <accessToken>`     |

**URL Params:**

| Param | Tipe     | Keterangan             |
| ----- | -------- | ---------------------- |
| `id`  | `string` | UUID perangkat (36 char) |

**Request Body:** Tidak ada

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Token berhasil diperbarui",
  "data": {
    "version": 2
  }
}
```

---

### DELETE /api/device/:deviceId

Menghapus perangkat beserta semua sesi Pomodoro yang terkait.

**Headers:**

| Header          | Nilai                      |
| --------------- | -------------------------- |
| `Authorization` | `Bearer <accessToken>`     |

**URL Params:**

| Param      | Tipe     | Validasi               |
| ---------- | -------- | ---------------------- |
| `deviceId` | `string` | Tepat 36 karakter (UUID) |

**Request Body:** Tidak ada

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Perangkat berhasil dihapus."
}
```

---

### GET /api/device/poll/:deviceIotId

**⚠️ Endpoint khusus untuk perangkat IoT (ESP32).** Tidak membutuhkan autentikasi user.  
Digunakan perangkat untuk melakukan polling status klaim dan mendapatkan API key.

**Headers:** Tidak perlu autentikasi

**URL Params:**

| Param         | Tipe     | Validasi               |
| ------------- | -------- | ---------------------- |
| `deviceIotId` | `string` | Tepat 10 karakter      |

**Response `200 OK` — Belum diklaim:**

```json
{
  "success": true,
  "status": "waiting",
  "message": "Menunggu klaim",
  "data": {
    "status": "waiting",
    "device": {
      "deviceIotId": "ABCDEFGHIJ",
      "deviceName": "Unnamed Device",
      "deviceStatus": "unclaimed"
    },
    "apiKey": null
  }
}
```

**Response `200 OK` — Sudah diklaim:**

```json
{
  "success": true,
  "status": "claimed",
  "message": "Klaim sukses",
  "data": {
    "status": "claimed",
    "device": {
      "deviceIotId": "ABCDEFGHIJ",
      "deviceName": "Meja Belajar",
      "deviceStatus": "claimed"
    },
    "apiKey": "jwt-iot-token"
  }
}
```

---

## 4. Sensor

### GET /api/sensors/:deviceId

Mengambil 50 data telemetri terbaru dari perangkat (diurutkan terbaru lebih dulu).

**Headers:** Tidak ada middleware autentikasi pada endpoint ini

**URL Params:**

| Param      | Tipe     | Keterangan               |
| ---------- | -------- | ------------------------ |
| `deviceId` | `string` | UUID perangkat (36 char)   |

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Data telemetri berhasil diambil",
  "data": [
    {
      "id": "uuid",
      "deviceId": "uuid",
      "temperature": 27.5,
      "lightLux": 300.2,
      "noiseLevel": 40.1,
      "createdAt": "2026-04-12T17:42:11.000Z"
    }
  ]
}
```

---

## 5. Pomodoro

### POST /api/pomodoro/start

Memulai sesi Pomodoro baru dan mengirim perintah ke perangkat IoT via Durable Object WebSocket.

**Headers:** Tidak ada middleware autentikasi pada endpoint ini (dipanggil langsung)

**Request Body (JSON):**

```json
{
  "deviceId": "uuid-perangkat-36-karakter",
  "recipe": {
    "focusDuration": 25,
    "breakDuration": 5,
    "cycles": 4,
    "sensorIntervalSec": 60,
    "mode": "normal",
    "currentCycle": 1,
    "currentMode": "fokus",
    "currentPhase": "awal",
    "status": "running"
  }
}
```

| Field                     | Tipe     | Wajib | Validasi / Keterangan                                        |
| ------------------------- | -------- | ----- | ------------------------------------------------------------ |
| `deviceId`                | `string` | ✅    | Tepat 36 karakter (UUID)                                      |
| `recipe.focusDuration`    | `number` | ✅    | Integer positif (menit)                                       |
| `recipe.breakDuration`    | `number` | ✅    | Integer positif (menit)                                       |
| `recipe.cycles`           | `number` | ✅    | Integer positif                                               |
| `recipe.sensorIntervalSec`| `number`| ✅    | Integer positif (detik)                                       |
| `recipe.mode`             | `string` | ❌    | `"normal"` \| `"panjang"` \| `"deadline"`. Default: `"normal"` |
| `recipe.currentCycle`     | `number` | ❌    | Integer positif. Default: `1`                                  |
| `recipe.currentMode`      | `string` | ❌    | `"fokus"` \| `"istirahat"`. Default: `"fokus"`                 |
| `recipe.currentPhase`     | `string` | ❌    | `"awal"` \| `"tengah"` \| `"akhir"`. Default: `"awal"`        |
| `recipe.status`           | `string` | ❌    | `"running"` \| `"paused"` \| `"completed"` \| `"cancelled"`. Default: `"running"` |

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Data konfigurasi berhasil dikirim dan perangkat merespons.",
  "sessionId": "uuid-session-baru"
}
```

---

### POST /api/pomodoro/stop

Menghentikan (membatalkan) sesi Pomodoro yang sedang berjalan.

**Headers:** Tidak ada middleware autentikasi pada endpoint ini

**Request Body (JSON):**

```json
{
  "sessionId": "uuid-session",
  "deviceId": "uuid-perangkat"
}
```

| Field       | Tipe     | Wajib | Keterangan               |
| ----------- | -------- | ----- | ------------------------ |
| `sessionId` | `string` | ✅    | UUID sesi Pomodoro        |
| `deviceId`  | `string` | ✅    | UUID perangkat            |

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Sesi Pomodoro berhasil dibatalkan."
}
```

---

### GET /api/pomodoro/sessions

Mengambil semua sesi Pomodoro yang ada di database.

**Headers:** Tidak ada middleware autentikasi pada endpoint ini

**Response `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "deviceId": "uuid",
      "focusDuration": 25,
      "restDuration": 5,
      "targetCycles": 4,
      "condition": "normal",
      "sensorIntervalSec": 60,
      "currentCycle": 1,
      "currentMode": "fokus",
      "currentPhase": "awal",
      "status": "running",
      "startedAt": "2026-04-12T17:42:11.000Z",
      "endedAt": null
    }
  ]
}
```

---

### GET /api/pomodoro/histories/:pomodoroId

Mengambil log/riwayat AI (Pomodoro Logs) berdasarkan session ID.

**Headers:** Tidak ada middleware autentikasi pada endpoint ini

**URL Params:**

| Param         | Tipe     | Validasi                  |
| ------------- | -------- | ------------------------- |
| `pomodoroId`  | `string` | Tepat 36 karakter (UUID)    |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "deviceId": "uuid",
      "sessionId": "uuid",
      "currentCycle": 1,
      "pomodoroMode": "fokus",
      "timePhase": "awal",
      "triggerContext": "Konteks trigger (sensor anomali / fase waktu)",
      "aiResponse": "Respons AI dari Rin-chan",
      "emotion": "COLD",
      "temperatureAtTime": 27.5,
      "lightAtTime": 300.2,
      "noiseAtTime": 40.1,
      "createdAt": "2026-04-12T17:42:11.000Z"
    }
  ]
}
```

---

### DELETE /api/pomodoro/histories/:pomodoroId

Menghapus sesi Pomodoro beserta log-nya berdasarkan session ID.

**Headers:** Tidak ada middleware autentikasi pada endpoint ini

**URL Params:**

| Param         | Tipe     | Validasi                  |
| ------------- | -------- | ------------------------- |
| `pomodoroId`  | `string` | Tepat 36 karakter (UUID)    |

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Sesi Pomodoro dan history berhasil dihapus."
}
```

---

## 6. WebSocket (IoT)

### GET /api/ws/iot

**⚠️ Endpoint WebSocket khusus untuk perangkat IoT (ESP32).**  
Menggunakan `deviceAuthMiddleware` — autentikasi via IoT token permanen.

**Koneksi:**

```
ws://<host>/api/ws/iot?token=<jwt-iot-token>
```

| Query Param | Tipe     | Keterangan                                    |
| ----------- | -------- | --------------------------------------------- |
| `token`     | `string` | IoT JWT token (didapat dari endpoint poll)     |

> Alternatif: Bisa juga via Header `Authorization: Bearer <jwt-iot-token>`

Setelah terkoneksi, perangkat akan masuk ke Durable Object room berdasarkan `deviceId` dengan role `iot`.

---

## 7. Health Check

### GET /api/health

Endpoint untuk cek status kesehatan API.

**Headers:** Tidak perlu autentikasi

**Response `200 OK`:**

```json
{
  "success": true,
  "message": "Rin-chan API is healthy",
  "timestamp": "2026-04-17T07:00:00.000Z",
  "version": "1.0.0",
  "runtime": "hono",
  "platform": "cloudflare-workers"
}
```

---

## Ringkasan Autentikasi

| Mekanisme                | Sumber Token                                       | Digunakan Oleh         |
| ------------------------ | -------------------------------------------------- | ---------------------- |
| **authMiddleware**       | Header `Authorization: Bearer <token>` ATAU Cookie `authToken` | Endpoint user & device |
| **refreshTokenMiddleware** | Header `X-Refresh-Token` ATAU Cookie `refreshToken` | `POST /api/auth/refresh` |
| **deviceAuthMiddleware** | Header `Authorization: Bearer <token>` ATAU query `?token=<token>` | WebSocket IoT          |
