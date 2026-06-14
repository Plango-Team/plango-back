const { body, param } = require('express-validator');

const transportationTypes = ['driving', 'walking', 'bicycling', 'other'];

const locationValidator = (fieldName) => [
    body(`${fieldName}.addressName`).optional().isString().withMessage(`${fieldName} addressName must be a string`),

    body(`${fieldName}.coordinates`).isArray({ min: 2, max: 2 }).withMessage(`${fieldName} coordinates must be [lng, lat]`),

    body(`${fieldName}.coordinates.0`).isFloat().withMessage(`${fieldName} longitude must be a number`),
    body(`${fieldName}.coordinates.1`).isFloat().withMessage(`${fieldName} latitude must be a number`),
];

// Invite users to an appointment
const inviteUsers = [
    param('id').isMongoId().withMessage('Appointment ID must be a valid MongoDB ID'),
    body('usernames').isArray({ min: 1 }).withMessage('usernames must be a non-empty array'),
    body('usernames.*').isString().trim().notEmpty().withMessage('Each username must be a non-empty string'),
];

// Accept an invite (user provides startLocation and transportation)
const acceptInvite = [
    param('id').isMongoId().withMessage('Appointment ID must be a valid MongoDB ID'),
    body('startLocation').notEmpty().withMessage('startLocation is required'),
    ...locationValidator('startLocation'),
    body('transportation')
    .notEmpty().withMessage('Transportation is required')
    .isIn(transportationTypes).withMessage(`Transportation must be one of: ${transportationTypes.join(', ')}`),
];

// Decline invite - only appointment id required
const declineInvite = [
    param('id').isMongoId().withMessage('Appointment ID must be a valid MongoDB ID'),
];
const deleteInviteValidator = [
    body('appointmentId')
        .notEmpty().withMessage('Appointment ID is required')
        .isMongoId().withMessage('Appointment ID must be a valid MongoDB ID'),
        
    body('receiverId')
        .notEmpty().withMessage('Receiver ID is required')
        .isMongoId().withMessage('Receiver ID must be a valid MongoDB ID'),
    ];

module.exports = { inviteUsers, acceptInvite, declineInvite, deleteInviteValidator };
