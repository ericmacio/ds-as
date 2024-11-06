const express = require('express');

exports.getRouter = (registrar) => {
    const caller = 'getRouter';
    //Create router
    const router = express.Router();
    //Setup the register routes
    router.post('/', (req, res, next) => registrar.register(req, res, next));
    router.put('/:id', (req, res, next) => registrar.updateRegistration(req, res, next));
    return router;
}