const express = require('express');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'agentsRoute');
const agentsCtrl = require('../controllers/agents');

//Create router
const router = express.Router();
//Setup the service routes
router.get('/', (req, res, next) => agentsCtrl.getAgents(req, res, next));
router.post('/', (req, res, next) => agentsCtrl.postAgent(req, res, next));
router.put('/:id', (req, res, next) => agentsCtrl.putAgent(req, res, next));
router.delete('/:id', (req, res, next) => agentsCtrl.deleteAgent(req, res, next));
router.post('/:id/cmd', (req, res, next) => agentsCtrl.postCoreAgentCmd(req, res, next));

module.exports = router;