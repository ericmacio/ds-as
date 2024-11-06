const express = require('express');

exports.getRouter = (coreCmdCtrl) => {
    const caller = 'getRouter';
    //Create router
    const router = express.Router();
    //Setup the register routes
    router.get('/', (req, res, next) => coreCmdCtrl.getCoreCmd(req, res, next));
    router.put('/:id', (req, res, next) => coreCmdCtrl.putCoreCmd(req, res, next));
    router.post('/status', (req, res, next) => coreCmdCtrl.postCoreStatus(req, res, next));
    return router;
}