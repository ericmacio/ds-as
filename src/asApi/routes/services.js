const express = require('express');
const multer = require('multer');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'ServicesRoutes');
const servicesCtrl = require('../controllers/services');
const TmpDir = './tmp/uploads/';

//Create router
const router = express.Router();
//Create multer middleware to handle multipart content
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, TmpDir);
    },
    filename: function (req, file, callback) {
        var randId = Math.floor(Math.random() * Math.floor(1000));
        const fileName = 'config-' + randId + '-' + req.body.name + '.json'
        //Add config file path information to request data body so it can be used later
        req.body.tmpConfigFilePath = TmpDir + fileName;
        callback(null, fileName);
    }
});
var upload = multer({ storage: storage });
//Setup the service routes
router.get('/', (req, res, next) => servicesCtrl.getServices(req, res, next));
router.post('/', upload.single('configFile'), (req, res, next) => servicesCtrl.postService(req, res, next));
router.put('/:id', upload.single('configFile'), (req, res, next) => servicesCtrl.putService(req, res, next));
router.put('/:id/status', (req, res, next) => servicesCtrl.putServiceStatus(req, res, next));
router.delete('/:id', (req, res, next) => servicesCtrl.deleteService(req, res, next));
router.get('/:id/config', (req, res, next) => servicesCtrl.getServiceConfig(req, res, next));

module.exports = router;