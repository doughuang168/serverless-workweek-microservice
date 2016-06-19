/*global require, module*/
var ApiBuilder = require('claudia-api-builder'),
    Promise = require('bluebird'),
    DOC = require('dynamodb-doc'),
    api = new ApiBuilder(),
    docClient = Promise.promisifyAll(new DOC.DynamoDB());

// Export the api
module.exports = api;

// get workweek item for {ww_date}
api.get('/workweek/{ww_date}', function (request) {
    'use strict';
    //ww_date format: "yyyy-mm-dd"
    var ww_date, params;
    // Get the ww_date from the pathParams
    ww_date = request.pathParams.ww_date;

    // Set up parameters for dynamo
    params = {
        TableName: getTableName(request),
        Key: {
            ww_date: ww_date
        }
    };

    return docClient.getItemAsync(params)
        .then(function (data) {
            if (data && data.Item) {
                var wwobj = { status: 'success', message : '', workweek: data.Item.year+'WW'+ data.Item.week};
                return wwobj;
            } else {
                return { status: 'error', message : 'Invalid date format: '+ ww_date};
            }
        }, function(error) {
            return { status: 'error', message : 'Invalid date format: '+ ww_date};
        });

}); //200 ok is standard for non-errors

function getTableName(request) {
    'use strict';
    // The table name is stored in the Lambda stage variables
    // Go to https://console.aws.amazon.com/apigateway/home/apis/[YOUR API ID]/stages/latest
    // and click Stages -> latest -> Stage variables

    // These values will be found under request.env
    // Here's use a default if not set
    return request.env.tableName || 'workweek';
}