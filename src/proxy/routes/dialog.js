const express = require('express');

exports.getRouter = (dialogCtrl) => {
    const caller = 'getRouter';
    //Create router
    const router = express.Router();
    router.post('/', dialogCtrl.createDialog);
    router.put('/:id', dialogCtrl.updateDialog);
    router.delete('/:id', dialogCtrl.deleteDialog);
    return router;
}