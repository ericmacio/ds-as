const jwt = require('jsonwebtoken');
const Logger = require('../../logging/logger');
const logger = new Logger(__filename, 'configRoute');
const loginCtrl = require('../controllers/auth');

const jwtLoginKey = loginCtrl.getJwtLoginKey();

const auth = (req, res, next) => {
    const caller = 'auth';
    //Get access token from Authorization HTTP header
    if(req.headers && req.headers.authorization)
        var accessToken = req.headers.authorization.split(' ')[1];
    if(accessToken) {
        try {
            //Check access token
            const decodedToken = jwt.verify(accessToken, jwtLoginKey);
            //Get user id
            const userId = decodedToken.userId;
            logger.log(caller, 'INFO2', 'Authorized access from user: ' + userId);
            //Inject the user id into the request so that later controller can make use of it
            req.userId = userId;
            logger.log(caller, 'DEBUG', 'Body: ' + JSON.stringify(req.body));
            //Invoke next controller
            next();
        } catch(error) {
            if (error instanceof jwt.JsonWebTokenError) {
                // if the error thrown is because the JWT is unauthorized, return a 401 error
                logger.log(caller, 'WARNING', 'WARNING: UnAuthorized access : ' + error);
                res.status(401).send({ok: false, error: {msg: 'Unauthorized request'}});
            } else {
                // otherwise, return a bad request error
                logger.log(caller, 'ERROR', 'ERROR: Invalid request: ' + error);
                res.status(400).send({ok: false, error: {msg: 'Invalid request: ' + error}});
            }
        }
    } else {
        logger.log(caller, 'ERROR', 'ERROR: Forbidden request. Access token is missing');
        res.status(403).send({ok: false, error: {msg: 'Forbidden request. Access token is missing'}});
    }
};
module.exports = auth;