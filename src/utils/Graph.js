const { CanvasRenderService } = require('chartjs-node-canvas');
var Logger = require('../logging/logger');
var logger = new Logger(__filename, 'graph');
/*--------------------------------------------------------------------------------------------
		Graph
---------------------------------------------------------------------------------------------*/
class Graph {
    constructor(datasetKeyList, labelRef) {
        var caller = 'Graph';
        this.datasetKeyList = datasetKeyList;
        this.labelRef = labelRef
    }
    async create(graphConfig, graphDbDataList) {
        var caller = 'create';
        var labels = [];
        var datasets = [];
        //For pie graph we are dealing with data differently. Only the sum of each data (line) is displayed
        if(graphConfig.type == 'pie') {
            //Init data array that will be used to store data for graph
            var data = [];
            //Parse each line of dbData
            for(var id=0; id<graphDbDataList.length; id++) {
                //Calculate the total amount per year for each item
                var total = 0;
                //Use config key list for parsing all data and calculate the sum
                for(var keyId=0; keyId<this.datasetKeyList.length; keyId++)
                    total += graphDbDataList[id][this.datasetKeyList[keyId]];
                logger.log(caller, 'INFO2', 'Total for ' + graphDbDataList[id][this.labelRef] + ': ' + total);
                //Put total value in data array
                data.push(total);
                //Set labels
                labels.push(graphDbDataList[id][this.labelRef]);
            }
            //Set dataset for the current line
            datasets= [{
                borderColor: graphConfig.borderColor,
                backgroundColor: graphConfig.backgroundColor,
                borderWidth: graphConfig.borderWidth,
                fill: graphConfig.fill,
                data: data
            }];
        } else {
            //Parse each line of dbData
            for(var id=0; id<graphDbDataList.length; id++) {
                //Init data array that will be used to store data for graph
                var data = [];
                //Use config key list for ordering data properly
                for(var keyId=0; keyId<this.datasetKeyList.length; keyId++)
                    data.push(graphDbDataList[id][this.datasetKeyList[keyId]]);
                //Set dataset for the current line
                datasets[id] = {
                    borderColor: graphConfig.borderColor[id],
                    backgroundColor: graphConfig.backgroundColor[id],
                    borderWidth: graphConfig.borderWidth,
                    label: graphDbDataList[id][this.labelRef],
                    fill: graphConfig.fill,
                    data: data
                };
            }
            //Set labels for graph
            for(var keyId=0; keyId<this.datasetKeyList.length; keyId++)
                labels.push(this.datasetKeyList[keyId]);
        }
        //Create configuration with labels and data
        var configuration = {
            type: graphConfig.type,
            data: {labels: labels, datasets: datasets},
            options: graphConfig.options
        };
        //Create the graph
        logger.log(caller, 'INFO1', 'Create graph type: ' + configuration.type);
        logger.log(caller, 'DEBUG', 'configuration: ' + JSON.stringify(configuration));
        //Create canvas render service
        var canvasRenderService = new CanvasRenderService(graphConfig.width, graphConfig.height);
        //Return a Promise
        return canvasRenderService.renderToBuffer(configuration);
    }
}
module.exports = Graph;