const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

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
        type: DataTypes.STRING,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING
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
        type: DataTypes.JSONB,
        defaultValue: {}
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
        type: DataTypes.JSONB, // Store array of objects as JSONB
        defaultValue: []
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
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    pathologyAnalysis: {
        type: DataTypes.JSONB,
        defaultValue: {}
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
});

// Associations
Patient.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasOne(Patient, { foreignKey: 'userId' });
Patient.belongsTo(User, { as: 'oncologist', foreignKey: 'oncologistId' });
User.hasMany(Patient, { foreignKey: 'oncologistId' });

module.exports = Patient;