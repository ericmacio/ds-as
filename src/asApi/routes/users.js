const express = require('express');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'userRoute');
const userCtrl = require('../controllers/users');

const router = express.Router();
router.get('/', userCtrl.getUsers);
router.put('/:id', userCtrl.putUser);
router.delete('/:id', userCtrl.deleteUser);
router.post('/', userCtrl.postUser);

module.exports = router;