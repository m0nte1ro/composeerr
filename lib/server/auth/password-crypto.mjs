import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Shared by the application and the offline recovery command.
const OPTIONS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

/** @param {string} password @param {string} salt @returns {Promise<Buffer>} */
function derive(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** @param {string} password */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return ["scrypt", "32768", "8", "3", salt, key.toString("hex")].join(":");
}

/** @param {string} password @param {string} encoded */
export async function verifyPassword(password, encoded) {
  const [algorithm, n, r, p, salt, hash] = encoded.split(":");
  if (algorithm !== "scrypt" || n !== "32768" || r !== "8" || p !== "3" ||
      !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? "")) {
    return false;
  }
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, "hex"));
}
