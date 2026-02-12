// ─── AES-256-GCM Encryption Test Suite ──────────────────────────────────────
// Run: node test_encryption.js
// Tests the core encryption utility for correctness and security.

require('dotenv').config();
const {
    encrypt,
    decrypt,
    encryptField,
    decryptField,
    hashSensitiveData,
    encryptPayload,
    decryptPayload,
    generateEncryptionKey
} = require('./utils/encryption');

let passed = 0;
let failed = 0;

const assert = (condition, testName) => {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL: ${testName}`);
        failed++;
    }
};

console.log('\n🔐 AES-256-GCM Encryption Test Suite');
console.log('════════════════════════════════════════════\n');

// ──────────────────────────────────────────────────────────────────────────────
console.log('📋 Test 1: Basic Encrypt → Decrypt Roundtrip');
// ──────────────────────────────────────────────────────────────────────────────
const testData = 'Hello, this is a secret medical record!';
const encrypted = encrypt(testData);
const decrypted = decrypt(encrypted);
assert(decrypted === testData, 'Decrypt returns original plaintext');
assert(encrypted !== testData, 'Encrypted text differs from original');
assert(typeof encrypted === 'string', 'Encrypted output is a string');

// ──────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test 2: IV Randomness (different ciphertexts for same input)');
// ──────────────────────────────────────────────────────────────────────────────
const encrypted1 = encrypt('same_data');
const encrypted2 = encrypt('same_data');
assert(encrypted1 !== encrypted2, 'Two encryptions of same data differ (IV randomness)');
assert(decrypt(encrypted1) === 'same_data', 'First encryption decrypts correctly');
assert(decrypt(encrypted2) === 'same_data', 'Second encryption decrypts correctly');

// ──────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test 3: Tampered Ciphertext Fails (Integrity Check)');
// ──────────────────────────────────────────────────────────────────────────────
const original = encrypt('integrity test');
const tampered = original.slice(0, -5) + 'XXXXX'; // Corrupt the ciphertext
const tamperedResult = decrypt(tampered);
assert(tamperedResult !== 'integrity test', 'Tampered ciphertext does not decrypt to original');

// ──────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test 4: Field Encryption (Model-like Data)');
// ──────────────────────────────────────────────────────────────────────────────
const email = 'patient@hospital.com';
const encryptedEmail = encryptField(email);
const decryptedEmail = decryptField(encryptedEmail);
assert(decryptedEmail === email, 'Email field roundtrip works');

const genomicProfile = { idh1: 'mutant', mgmt: 'methylated', brca: 'positive' };
const encryptedGenomics = encryptField(genomicProfile);
const decryptedGenomics = decryptField(encryptedGenomics, true);
assert(JSON.stringify(decryptedGenomics) === JSON.stringify(genomicProfile), 'JSON genomic profile roundtrip works');

// ──────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test 5: Large Data (Genomic/Medical Records)');
// ──────────────────────────────────────────────────────────────────────────────
const largeData = JSON.stringify({
    medicalHistory: 'A'.repeat(10000),
    genomicSequence: Array.from({ length: 1000 }, (_, i) => `gene_${i}`),
    pathologyReport: {
        findings: 'B'.repeat(5000),
        markers: Array.from({ length: 50 }, (_, i) => ({ name: `marker_${i}`, value: Math.random() }))
    }
});
const encryptedLarge = encrypt(largeData);
const decryptedLarge = decrypt(encryptedLarge);
assert(decryptedLarge === largeData, 'Large genomic data roundtrip works');

// ──────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test 6: Null/Undefined Handling');
// ──────────────────────────────────────────────────────────────────────────────
assert(encrypt(null) === null, 'Null input returns null');
assert(encrypt(undefined) === null, 'Undefined input returns null');
assert(decrypt(null) === null, 'Null decrypt returns null');
assert(decryptField(null) === null, 'Null field decrypt returns null');

// ──────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test 7: Payload Encryption (API Response Format)');
// ──────────────────────────────────────────────────────────────────────────────
const apiResponse = {
    success: true,
    data: {
        patient: { name: 'John Doe', diagnosis: 'Glioblastoma' },
        genomicProfile: { idh1: 'wildtype', mgmt: 'unmethylated' }
    }
};
const encryptedPayload = encryptPayload(apiResponse);
assert(encryptedPayload.encrypted === true, 'Payload has encrypted flag');
assert(typeof encryptedPayload.payload === 'string', 'Payload is a string');
const decryptedPayloadData = decryptPayload(encryptedPayload.payload);
assert(JSON.stringify(decryptedPayloadData) === JSON.stringify(apiResponse), 'Payload roundtrip works');

// ──────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test 8: Hash Function (One-Way)');
// ──────────────────────────────────────────────────────────────────────────────
const hash1 = hashSensitiveData('test@email.com');
const hash2 = hashSensitiveData('test@email.com');
const hash3 = hashSensitiveData('different@email.com');
assert(hash1 === hash2, 'Same input produces same hash');
assert(hash1 !== hash3, 'Different inputs produce different hashes');
assert(hash1.length === 64, 'SHA-256 hash is 64 hex characters');

// ──────────────────────────────────────────────────────────────────────────────
console.log('\n📋 Test 9: Key Generation');
// ──────────────────────────────────────────────────────────────────────────────
const newKey = generateEncryptionKey();
assert(newKey.length === 64, 'Generated key is 64 hex characters (256 bits)');
assert(/^[0-9a-f]+$/.test(newKey), 'Generated key is valid hex');

// ──────────────────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════');
console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed!'}`);
console.log('════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
