const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');
const User = require('./User');

const TreatmentPlan = sequelize.define('TreatmentPlan', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    recommendedProtocol: {
        type: DataTypes.STRING,
        allowNull: false
    },
    confidence: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
            min: 0,
            max: 100
        }
    },
    alternativeOptions: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    guidelineAlignment: {
        type: DataTypes.TEXT
    },
    planData: {
        type: DataTypes.JSONB
    },
    status: {
        type: DataTypes.ENUM('draft', 'proposed', 'approved', 'active', 'completed', 'discontinued'),
        defaultValue: 'proposed'
    },
    treatmentComponents: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    rationale: {
        type: DataTypes.TEXT
    },
    expectedOutcomes: {
        type: DataTypes.JSONB
    },
    approvalDate: {
        type: DataTypes.DATE
    }
});

// Associations
TreatmentPlan.belongsTo(Patient, { foreignKey: 'patientId' });
Patient.hasMany(TreatmentPlan, { foreignKey: 'patientId' });

TreatmentPlan.belongsTo(User, { as: 'approvedBy', foreignKey: 'approvedById' });
TreatmentPlan.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

module.exports = TreatmentPlan;