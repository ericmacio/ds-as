const express = require('express');
const authCtrl = require('../controllers/auth');

const router = express.Router();

router.post('/login', authCtrl.login);
router.post('/logout', authCtrl.logout);
router.put('/password', authCtrl.setPassword);
router.post('/refresh', authCtrl.refresh);

module.exports = router;