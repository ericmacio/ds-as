const express = require('express');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'logsRoute');
const logsCtrl = require('../controllers/logs');

const router = express.Router();
router.get('/', logsCtrl.getLogs);
router.get('/:logFileName', logsCtrl.getLog);

module.exports = router;