const { body, param, query } = require('express-validator');
const { validate } = require('../middlewares');

const categories = [
    'music',
    'sports',
    'education',
    'technology',
    'photography',
    'art',
    'other',
];

const visibilityOptions = ['public', 'private'];

const locationValidator = (fieldName, required = true) => {
    const rules = [
    body(`${fieldName}.addressName`)
        .optional()
        .isString()
        .withMessage(`${fieldName}.addressName must be a string`),

    body(`${fieldName}.fullAddress`)
        .optional()
        .isString()
        .withMessage(`${fieldName}.fullAddress must be a string`),

    body(`${fieldName}.type`)
        .optional()
        .equals('Point')
        .withMessage(`${fieldName}.type must be Point`),

    body(`${fieldName}.coordinates`)
        .exists({ checkNull: true })
        .withMessage(`${fieldName}.coordinates is required`)
        .isArray({ min: 2, max: 2 })
        .withMessage(`${fieldName}.coordinates must be [lng, lat]`),

    body(`${fieldName}.coordinates.0`)
        .isFloat({ min: -180, max: 180 })
        .withMessage(`${fieldName}.coordinates[0] must be a valid longitude`),

    body(`${fieldName}.coordinates.1`)
        .isFloat({ min: -90, max: 90 })
        .withMessage(`${fieldName}.coordinates[1] must be a valid latitude`),

    body(`${fieldName}.placeId`)
        .optional()
        .isString()
        .withMessage(`${fieldName}.placeId must be a string`),
    ];

    if (required) {
    rules.unshift(
        body(fieldName)
        .exists({ checkNull: true })
        .withMessage(`${fieldName} is required`),
    );
    } else {
    rules.unshift(
        body(fieldName)
        .optional({ nullable: true })
        .custom((value) => {
            if (value == null) return true;
            return typeof value === 'object';
        })
        .withMessage(`${fieldName} must be an object`),
    );
    }

    return rules;
};

const validateDates = [
    body('startDate')
    .exists({ checkNull: true })
    .withMessage('startDate is required')
    .isISO8601()
    .toDate()
    .withMessage('startDate must be a valid ISO 8601 date'),

    body('endDate')
    .exists({ checkNull: true })
    .withMessage('endDate is required')
    .isISO8601()
    .toDate()
    .withMessage('endDate must be a valid ISO 8601 date')
    .custom((value, { req }) => {
        if (!req.body.startDate) return true;
        const startDate = new Date(req.body.startDate);
        if (new Date(value) <= startDate) {
        throw new Error('endDate must be after startDate');
        }
        return true;
    }),
];

const createEventValidator = [
    body('title')
    .exists({ checkNull: true })
    .withMessage('title is required')
    .isString()
    .withMessage('title must be a string')
    .isLength({ min: 3, max: 100 })
    .withMessage('title must be between 3 and 100 characters'),

    body('description')
    .exists({ checkNull: true })
    .withMessage('description is required')
    .isString()
    .withMessage('description must be a string'),

    body('category')
    .exists({ checkNull: true })
    .withMessage('category is required')
    .isIn(categories)
    .withMessage(`category must be one of: ${categories.join(', ')}`),

    body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('price must be a non-negative number'),

    body('visibility')
    .optional()
    .isIn(visibilityOptions)
    .withMessage(`visibility must be one of: ${visibilityOptions.join(', ')}`),

    body('images')
    .optional()
    .isArray()
    .withMessage('images must be an array'),

    body('images.*')
    .optional()
    .isString()
    .withMessage('each image must be a string'),

    ...locationValidator('location', true),
    ...validateDates,
];

const updateEventValidator = [
    body('title')
    .optional()
    .isString()
    .withMessage('title must be a string')
    .isLength({ min: 3, max: 100 })
    .withMessage('title must be between 3 and 100 characters'),

    body('description')
    .optional()
    .isString()
    .withMessage('description must be a string'),

    body('category')
    .optional()
    .isIn(categories)
    .withMessage(`category must be one of: ${categories.join(', ')}`),

    body('price')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('price must be a non-negative number'),

    body('visibility')
    .optional()
    .isIn(visibilityOptions)
    .withMessage(`visibility must be one of: ${visibilityOptions.join(', ')}`),

    body('images')
    .optional()
    .isArray()
    .withMessage('images must be an array'),

    body('images.*')
    .optional()
    .isString()
    .withMessage('each image must be a string'),

    ...locationValidator('location', false),

    body('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('startDate must be a valid ISO 8601 date'),

    body('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('endDate must be a valid ISO 8601 date')
    .custom((value, { req }) => {
        const hasStartDate = req.body.startDate;
        if (!hasStartDate) return true;
        const startDate = new Date(req.body.startDate);
        if (new Date(value) <= startDate) {
        throw new Error('endDate must be after startDate');
        }
        return true;
    }),
];

const eventIdValidator = [
    param('id')
    .exists({ checkNull: true })
    .withMessage('id is required')
    .isMongoId()
    .withMessage('id must be a valid MongoDB ObjectId'),
];

const addEventToScheduleValidator = [
    body('transportation')
    .exists({ checkNull: true })
    .withMessage('transportation is required')
    .isString()
    .withMessage('transportation must be a string'),

    body('startLocation')
    .exists({ checkNull: true })
    .withMessage('startLocation is required'),

    body('startLocation.coordinates')
    .exists({ checkNull: true })
    .withMessage('startLocation.coordinates is required')
    .isArray({ min: 2, max: 2 })
    .withMessage('startLocation.coordinates must be [lng, lat]'),

    body('startLocation.coordinates.0')
    .isFloat({ min: -180, max: 180 })
    .withMessage('startLocation longitude must be valid'),

    body('startLocation.coordinates.1')
    .isFloat({ min: -90, max: 90 })
    .withMessage('startLocation latitude must be valid'),
];

const getEventsValidator = [
    query('category')
    .optional()
    .isIn(categories)
    .withMessage(`category must be one of: ${categories.join(', ')}`),

    query('from')
    .optional()
    .isISO8601()
    .withMessage('from must be a valid ISO 8601 date'),

    query('to')
    .optional()
    .isISO8601()
    .withMessage('to must be a valid ISO 8601 date'),

    query('priceType')
    .optional()
    .isIn(['free', 'paid'])
    .withMessage('priceType must be free or paid'),

    query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('lng must be a valid longitude'),

    query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat must be a valid latitude'),
];

module.exports = {
    createEventValidator,
    updateEventValidator,
    eventIdValidator,
    addEventToScheduleValidator,
    getEventsValidator,
    validate,
};
