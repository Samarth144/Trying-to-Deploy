const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const { encryptField, decryptField, hashSensitiveData } = require('../utils/encryption');

// ─── Sensitive Fields Configuration ─────────────────────────────────────────
// Fields that will be AES-256-GCM encrypted at rest in the database.
const ENCRYPTED_STRING_FIELDS = ['email', 'phone', 'medicalHistory'];
const ENCRYPTED_JSON_FIELDS = ['genomicProfile', 'pathologyAnalysis', 'currentMedications', 'mriPaths'];

const Patient = sequelize.define('Patient', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    mrn: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dateOfBirth: {
        type: DataTypes.DATE,
        allowNull: false
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false
    },
    email: {
        type: DataTypes.TEXT, // Changed to TEXT to accommodate encrypted strings
        allowNull: true
    },
    emailHash: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    phone: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    diagnosis: {
        type: DataTypes.STRING,
        allowNull: false
    },
    diagnosisDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Active', 'Pending', 'Completed'),
        defaultValue: 'Pending'
    },
    cancerType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    genomicProfile: {
        type: DataTypes.TEXT, // Changed to TEXT for encrypted JSON storage
        defaultValue: '{}'
    },
    kps: {
        type: DataTypes.INTEGER,
        validate: { min: 0, max: 100 }
    },
    performanceStatus: {
        type: DataTypes.ENUM('0', '1', '2', '3', '4'),
        defaultValue: '1'
    },
    symptoms: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    comorbidities: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    medicalHistory: {
        type: DataTypes.TEXT
    },
    currentMedications: {
        type: DataTypes.TEXT, // Changed to TEXT for encrypted JSON storage
        defaultValue: '[]'
    },
    allergies: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    pathologyReportPath: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mriPaths: {
        type: DataTypes.TEXT, // Changed to TEXT for encrypted JSON storage
        defaultValue: '{}'
    },
    pathologyAnalysis: {
        type: DataTypes.TEXT, // Changed to TEXT for encrypted JSON storage
        defaultValue: '{}'
    },
    vcfAnalysis: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    }
}, {
    indexes: [
        {
            fields: ['emailHash']
        },
        {
            fields: ['userId']
        },
        {
            fields: ['mrn']
        }
    ],
    hooks: {
        // ──── Encrypt sensitive fields before validation ───────────────────
        beforeValidate: (patient) => {
            try {
                // Populate emailHash for searching BEFORE encryption
                if (patient.email && (patient.changed('email') || !patient.emailHash)) {
                    let plaintextEmail = patient.email;
                    
                    // If it's already encrypted (likely from a database read or partial update), decrypt it first
                    const isEncrypted = typeof plaintextEmail === 'string' && 
                                      plaintextEmail.length > 20 && 
                                      plaintextEmail.includes(':') === false && // Base64 doesn't have ':'
                                      (() => {
                                          try {
                                              const decoded = Buffer.from(plaintextEmail, 'base64').toString('utf8');
                                              return decoded.split(':').length === 3;
                                          } catch (e) { return false; }
                                      })();

                    if (isEncrypted) {
                        plaintextEmail = decryptField(plaintextEmail);
                    }

                    if (plaintextEmail && typeof plaintextEmail === 'string') {
                        patient.emailHash = hashSensitiveData(plaintextEmail.trim().toLowerCase());
                    }
                }

                for (const field of ENCRYPTED_STRING_FIELDS) {
                    if (patient[field]) {
                        patient[field] = encryptField(patient[field]);
                    }
                }
                for (const field of ENCRYPTED_JSON_FIELDS) {
                    if (patient[field] && typeof patient[field] === 'object') {
                        patient[field] = encryptField(patient[field]);
                    }
                }
            } catch (err) {
                console.error('Encryption error during validation:', err.message);
            }
        },
        // ──── Decrypt sensitive fields after reading from database ──────────
        afterFind: (result) => {
            try {
                const decryptPatient = (patient) => {
                    if (!patient || !patient.dataValues) return;
                    for (const field of ENCRYPTED_STRING_FIELDS) {
                        if (patient.dataValues[field]) {
                            patient.dataValues[field] = decryptField(patient.dataValues[field]);
                        }
                    }
                    for (const field of ENCRYPTED_JSON_FIELDS) {
                        if (patient.dataValues[field]) {
                            patient.dataValues[field] = decryptField(patient.dataValues[field], true);
                        }
                    }
                };

                if (Array.isArray(result)) {
                    result.forEach(decryptPatient);
                } else if (result) {
                    decryptPatient(result);
                }
            } catch (err) {
                console.error('Decryption error on find:', err.message);
            }
        }
    }
});

// Associations
Patient.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasOne(Patient, { foreignKey: 'userId' });
Patient.belongsTo(User, { as: 'oncologist', foreignKey: 'oncologistId' });
User.hasMany(Patient, { foreignKey: 'oncologistId' });

module.exports = Patient;