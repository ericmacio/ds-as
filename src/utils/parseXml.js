const Logger = require('../logging/logger');
const logger = new Logger(__filename, 'parseXml');
const parseXmlString = require('xml2js').parseStringPromise;

exports.parse = async(xml) => {
    const caller = 'parse';
    return new Promise((resolve, reject) => {
        parseXmlString(xml)
            .then((result) => {
                resolve(result);
            })
            .catch((error) => {
                logger.log(caller, 'ERROR', 'ERROR: parseXmlString failed');
                reject(error);
            });
    });
}