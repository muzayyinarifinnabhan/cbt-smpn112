/**
 * Sistem Token Berputar (Rotating Token)
 * Token berubah otomatis setiap 5 menit.
 * Dihitung dari: ID jadwal ujian + slot waktu saat ini.
 * Tidak perlu disimpan ke database — cukup dihitung di kedua sisi (guru & siswa).
 */

const ROTATION_MINUTES = 5;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa karakter ambigu (O, 0, I, 1)

/**
 * Menghasilkan token 6 karakter berdasarkan ID jadwal dan slot waktu saat ini.
 * @param {string} jadwalId - UUID dari jadwal_ujian
 * @param {number} [offsetSlot=0] - offset slot (0=sekarang, -1=slot sebelumnya)
 * @returns {string} Token 6 karakter huruf besar
 */
export function generateRotatingToken(jadwalId, offsetSlot = 0) {
  const timeSlot = Math.floor(Date.now() / (ROTATION_MINUTES * 60 * 1000)) + offsetSlot;
  const seed = (jadwalId || '').replace(/-/g, '').slice(-8) + timeSlot.toString();

  // Simple deterministic hash
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  // Convert hash to 6-char token
  let token = '';
  let n = hash;
  for (let i = 0; i < 6; i++) {
    token += CHARS[n % CHARS.length];
    n = Math.floor(n / CHARS.length);
  }
  return token;
}

/**
 * Memverifikasi token yang dimasukkan siswa.
 * Menerima token slot saat ini ATAU slot sebelumnya (toleransi transisi).
 * @param {string} jadwalId
 * @param {string} inputToken
 * @returns {boolean}
 */
export function verifyRotatingToken(jadwalId, inputToken) {
  const normalized = (inputToken || '').replace(/\s/g, '').toUpperCase();
  const currentToken = generateRotatingToken(jadwalId, 0);
  const prevToken = generateRotatingToken(jadwalId, -1); // toleransi 1 slot sebelumnya
  return normalized === currentToken || normalized === prevToken;
}

/**
 * Menghitung detik tersisa hingga token berikutnya.
 * @returns {number} Detik tersisa (0-299)
 */
export function getSecondsUntilNextToken() {
  const slotDurationMs = ROTATION_MINUTES * 60 * 1000;
  const now = Date.now();
  const elapsedInSlot = now % slotDurationMs;
  return Math.ceil((slotDurationMs - elapsedInSlot) / 1000);
}
