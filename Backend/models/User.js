const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');
const { encryptField, decryptField } = require('../utils/encryption');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [6, 100]
        }
    },
    role: {
        type: DataTypes.ENUM('oncologist', 'patient', 'researcher', 'admin'),
        defaultValue: 'oncologist'
    },
    faceDescriptors: {
        type: DataTypes.TEXT, // Changed to TEXT for encrypted JSON storage
        allowNull: true
    }
}, {
    hooks: {
        beforeSave: async (user) => {
            // Hash password if changed
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
            // Encrypt face descriptors (biometric data) if changed
            if (user.changed('faceDescriptors') && user.faceDescriptors) {
                if (typeof user.faceDescriptors === 'object') {
                    user.faceDescriptors = encryptField(user.faceDescriptors);
                }
            }
        },
        // Decrypt face descriptors after reading from database
        afterFind: (result) => {
            try {
                const decryptUser = (user) => {
                    if (!user || !user.dataValues) return;
                    if (user.dataValues.faceDescriptors) {
                        user.dataValues.faceDescriptors = decryptField(
                            user.dataValues.faceDescriptors,
                            true
                        );
                    }
                };

                if (Array.isArray(result)) {
                    result.forEach(decryptUser);
                } else if (result) {
                    decryptUser(result);
                }
            } catch (err) {
                console.error('User decryption error:', err.message);
            }
        }
    }
});

// Instance method to compare password
User.prototype.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;