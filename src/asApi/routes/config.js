const express = require('express');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'configRoute');
const configCtrl = require('../controllers/config');

const router = express.Router();
router.get('/', configCtrl.getConfig);
router.get('/log', configCtrl.getLogConfig);
router.put('/log/:clientId', configCtrl.setLogConfig);
router.get('/services', configCtrl.getServiceConfig);
router.get('/agents', configCtrl.getAgentConfig);

module.exports = router;