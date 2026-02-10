const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Patient = require('./Patient');
const TreatmentPlan = require('./TreatmentPlan');
const User = require('./User');

const OutcomePrediction = sequelize.define('OutcomePrediction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    overallSurvival: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    progressionFreeSurvival: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    sideEffects: {
        type: DataTypes.JSONB
    },
    qualityOfLife: {
        type: DataTypes.JSONB
    },
    modelVersion: {
        type: DataTypes.STRING,
        defaultValue: '1.0.0'
    },
    inputFeatures: {
        type: DataTypes.JSONB
    },
    predictionData: {
        type: DataTypes.JSONB
    },
    confidence: {
        type: DataTypes.FLOAT,
        defaultValue: 92.0
    }
});

// Associations
OutcomePrediction.belongsTo(Patient, { foreignKey: 'patientId' });
Patient.hasMany(OutcomePrediction, { foreignKey: 'patientId' });

OutcomePrediction.belongsTo(TreatmentPlan, { foreignKey: 'treatmentPlanId' });
OutcomePrediction.belongsTo(User, { as: 'generatedBy', foreignKey: 'generatedById' });

module.exports = OutcomePrediction;