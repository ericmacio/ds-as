const express = require('express');
const multer = require('multer');
const appsCtrl = require('../controllers/apps');
const TmpDir = './tmp/uploads/';

const router = express.Router();
//Create multer middleware to handle multipart content
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, TmpDir);
    },
    filename: function (req, file, callback) {
        var randId = Math.floor(Math.random() * Math.floor(1000));
        const fileName = 'appsrc-' + randId + '-' + req.body.name + '.js'
        //Add src file path information to request data body so it can be used later
        req.body.tmpSrcFilePath = TmpDir + fileName;
        callback(null, fileName);
    }
});
var upload = multer({ storage: storage });
//Setup the app routes
router.get('/', appsCtrl.getApps);
router.post('/', upload.single('srcFile'), appsCtrl.postApp);
router.put('/:id', upload.single('srcFile'), appsCtrl.putApp);
router.delete('/:id', appsCtrl.deleteApp);
router.get('/:id/src', appsCtrl.getAppSrcFile);

module.exports = router;