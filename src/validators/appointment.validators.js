const { body, param } = require('express-validator');

// Reusable enums
const transportationTypes = ["driving", "walking","bicycling", "other"];
const repeatTypes = ["daily", "weekly", "monthly"];
const arrivalBufferOptions = [0, 5, 10, 15, 30];
const preparationOptions = [0, 10, 20, 30, 45, 60];

// Location validator helper
const locationValidator = (fieldName) => [
    body(`${fieldName}.addressName`)
    .optional()
    .isString()
    .withMessage(`${fieldName} addressName must be a string`),

    body(`${fieldName}.coordinates`)
    .isArray({ min: 2, max: 2 })
    .withMessage(`${fieldName} coordinates must be [lng, lat]`),

    body(`${fieldName}.coordinates.0`)
    .isFloat()
    .withMessage(`${fieldName} longitude must be a number`),

    body(`${fieldName}.coordinates.1`)
    .isFloat()
    .withMessage(`${fieldName} latitude must be a number`),
];

const optionalLocationValidator = (fieldName) => [
    body(`${fieldName}.addressName`)
    .optional()
    .isString()
    .withMessage(`${fieldName} addressName must be a string`),

    body(`${fieldName}.coordinates`)
    .if((value, { req }) => req.body[fieldName] !== undefined)
    .isArray({ min: 2, max: 2 })
    .withMessage(`${fieldName} coordinates must be [lng, lat]`),

    body(`${fieldName}.coordinates.0`)
    .if((value, { req }) => req.body[fieldName] !== undefined)
    .isFloat()
    .withMessage(`${fieldName} longitude must be a number`),

    body(`${fieldName}.coordinates.1`)
    .if((value, { req }) => req.body[fieldName] !== undefined)
    .isFloat()
    .withMessage(`${fieldName} latitude must be a number`),
];
// Create Appointment validator
const createAppointment = [
    body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 32 }).withMessage('Title must be 2–32 characters'),

    body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

    body('transportation')
    .notEmpty().withMessage('Transportation method is required')
    .isIn(transportationTypes).withMessage(`Transportation must be one of: ${transportationTypes.join(', ')}`),

    body('arrivalTime')
    .notEmpty().withMessage('Arrival time is required')
    .isISO8601().withMessage('Arrival time must be a valid date'),

    body('actualDepartureTime')
    .optional()
    .isISO8601().withMessage('Actual departure time must be a valid date'),

    ...locationValidator('startLocation'),
    ...locationValidator('destinationLocation'),

    body('isRecurring')
    .optional()
    .isBoolean().withMessage('isRecurring must be true or false'),

    body('repeatType')
    .optional()
    .isIn(repeatTypes).withMessage(`Repeat type must be one of: ${repeatTypes.join(', ')}`),

    body('repeatUntil')
    .optional()
    .isISO8601().withMessage('Repeat until must be a valid date'),

    body('arrivalBuffer')
    .optional()
    .isIn(arrivalBufferOptions)
    .withMessage(`Arrival buffer must be one of: ${arrivalBufferOptions.join(', ')}`),

    body('preparationTime')
    .optional()
    .isIn(preparationOptions)
    .withMessage(`Preparation time must be one of: ${preparationOptions.join(', ')}`),
];

// Update Appointment validator (all optional)
const updateSingleAppointment = [
    body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 32 }).withMessage('Title must be 2–32 characters'),

    body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

    body('eventId')
    .optional()
    .isMongoId().withMessage('Event ID must be a valid MongoDB ID'),

    body('transportation')
    .optional()
    .isIn(transportationTypes).withMessage(`Transportation must be one of: ${transportationTypes.join(', ')}`),

    body('arrivalTime')
    .optional()
    .isISO8601().withMessage('Arrival time must be a valid date'),

    body('actualDepartureTime')
    .optional()
    .isISO8601().withMessage('Actual departure time must be a valid date'),

    ...optionalLocationValidator('startLocation'),
    ...optionalLocationValidator('destinationLocation'),


    body('repeatUntil')
    .optional()
    .isISO8601().withMessage('Repeat until must be a valid date'),

    body('startedTrip')
    .optional()
    .isBoolean()
    .withMessage('startedTrip must be true or false'),

    body('arrivalBuffer')
    .optional()
    .isIn(arrivalBufferOptions)
    .withMessage(`Arrival buffer must be one of: ${arrivalBufferOptions.join(', ')}`),

    body('preparationTime')
    .optional()
    .isIn(preparationOptions)
    .withMessage(`Preparation time must be one of: ${preparationOptions.join(', ')}`),

    body('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be true or false'),
    
];

// Get Appointment by ID validator
// Get Appointment by ID validator
const getAppointment = [
    param('id')
    .isMongoId()
    .withMessage('Appointment ID must be a valid MongoDB ID'),
];

const getAppointmentsValidator = [];
const getAppointmentSeriesValidator = [
    param('id')
    .isMongoId()
    .withMessage('Invalid appointment id'),
];

const updateAppointmentSeries = updateSingleAppointment;

module.exports = {
    createAppointment,
    updateSingleAppointment,
    updateAppointmentSeries,
    getAppointment,
    getAppointmentsValidator,
    getAppointmentSeriesValidator,
};