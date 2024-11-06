const express = require('express');

exports.getRouter = (heartbeatCtrl) => {
    const caller = 'getRouter';
    //Create router
    const router = express.Router();
    //Setup the register routes
    router.post('/', (req, res, next) => heartbeatCtrl.set(req, res, next));
    return router;
}