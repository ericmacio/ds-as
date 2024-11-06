const express = require('express');

exports.getRouter = (cmdCtrl) => {
    const caller = 'getRouter';
    //Create router
    const router = express.Router();
    //Setup the register routes
    router.get('/', (req, res, next) => cmdCtrl.getCmd(req, res, next));
    router.get('/core', (req, res, next) => cmdCtrl.getCoreCmd(req, res, next));
    router.put('/core/:id', (req, res, next) => cmdCtrl.putCoreCmd(req, res, next));
    return router;
}