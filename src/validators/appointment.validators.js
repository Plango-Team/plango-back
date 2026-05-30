const { body, param,query } = require('express-validator');

// Reusable enums
const categories = ["work", "personal", "travel", "other"];
const transportationTypes = ["car", "walking", "biking", "other"];
const repeatTypes = ["daily", "weekly", "monthly"];
const statusTypes = ["scheduled", "completed", "canceled"];
const arrivalBufferOptions = [0, 5, 10, 15, 30];
const preparationTimeOptions = [0, 10, 20, 30, 45, 60];

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

    body('category')
    .optional()
    .isIn(categories).withMessage(`Category must be one of: ${categories.join(', ')}`),

    body('transportation')
    .notEmpty().withMessage('Transportation method is required')
    .isIn(transportationTypes).withMessage(`Transportation must be one of: ${transportationTypes.join(', ')}`),

    body('estimatedTravelTime')
    .notEmpty().withMessage('Estimated travel time is required')
    .isFloat({ min: 0 }).withMessage('Estimated travel time must be a positive number'),

    body('arrivalTime')
    .notEmpty().withMessage('Arrival time is required')
    .isISO8601().withMessage('Arrival time must be a valid date'),

    ...locationValidator('startLocation'),
    ...locationValidator('destinationLocation'),

    body('coordinates')
    .notEmpty().withMessage('Coordinates are required'),

    body('isRecurring')
    .optional()
    .isBoolean().withMessage('isRecurring must be true or false'),

    body('repeatType')
    .optional()
    .isIn(repeatTypes).withMessage(`Repeat type must be one of: ${repeatTypes.join(', ')}`),

    body('repeatUntil')
    .optional()
    .isISO8601().withMessage('Repeat until must be a valid date'),

    body('status')
    .optional()
    .isIn(statusTypes).withMessage(`Status must be one of: ${statusTypes.join(', ')}`),

    body('arrivalBufferMinutes')
    .optional()
    .isin(arrivalBufferOptions).withMessage(`Arrival buffer minutes must be one of: ${arrivalBufferOptions.join(', ')}`),

    body('preparationTimeMinutes')
    .optional()
    .isin(preparationTimeOptions).withMessage(`Preparation time minutes must be one of: ${preparationTimeOptions.join(', ')}`)
];

// Update Appointment validator (all optional)
const updateAppointment = [
    body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 32 }).withMessage('Title must be 2–32 characters'),

    body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

    body('category')
    .optional()
    .isIn(categories).withMessage(`Category must be one of: ${categories.join(', ')}`),

    body('transportation')
    .optional()
    .isIn(transportationTypes).withMessage(`Transportation must be one of: ${transportationTypes.join(', ')}`),

    body('estimatedTravelTime')
    .optional()
    .isFloat({ min: 0 }).withMessage('Estimated travel time must be a positive number'),

    body('arrivalTime')
    .optional()
    .isISO8601().withMessage('Arrival time must be a valid date'),

    body('isRecurring')
    .optional()
    .isBoolean().withMessage('isRecurring must be true or false'),

    body('repeatType')
    .optional()
    .isIn(repeatTypes).withMessage(`Repeat type must be one of: ${repeatTypes.join(', ')}`),
    
    body('repeatUntil')
    .optional()
    .isISO8601().withMessage('Repeat until must be a valid date'),
    
    body('status')
    .optional()
    .isIn(statusTypes).withMessage(`Status must be one of: ${statusTypes.join(', ')}`),
];

// Get Appointment by ID validator
const getAppointment = [
    param('id')
    .isHexadecimal().withMessage('Invalid appointment ID format')
    .isLength({ min: 24, max: 24 }).withMessage('Appointment ID must be a valid MongoDB ID'),
];

const getAppointmentsValidator = [
    query("category")
    .optional()
    .isIn(["work", "personal", "travel", "other"])
    .withMessage("Invalid category"),
];
const getAppointmentSeriesValidator = [
    param("id")
    .isMongoId()
    .withMessage("Invalid appointment id"),
];

module.exports = {
    createAppointment,
    updateAppointment,
    getAppointment,
    getAppointmentsValidator,
    getAppointmentSeriesValidator
};