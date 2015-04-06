'use strict';

var async = require('async');

module.exports.config = {};

module.exports = function createDataSet(rawDataset, callback) {
  var dataset = {};
  var models = [];
  var buildList = {};
  // name: {generator:, data:, dependencies}

  async.waterfall([
    function init(cb) {
      // check generators and import available models
      for(var key in module.exports.config) {
        if(!module.exports.config[key].generator instanceof Function) {
          return cb(new Error('generator is not a function for ' + key + ' model.'));
        }
        models.push(key);
      }
      models.forEach(function(model) {
        buildList[model] = {};
      });
      // check if we can build and fill buildList
      Object.keys(rawDataset).forEach(function(key) {
        var matched = models.some(function(model) {
          if(rawDataset[key]._model && (rawDataset[key]._model.toLowerCase().indexOf(model.toLowerCase()) !== -1)) {
            buildList[model][key] = rawDataset[key];
            return true;
          }
          if(key.toLowerCase().indexOf(model.toLowerCase()) !== -1) {
            buildList[model][key] = rawDataset[key];
            return true;
          }
        });

        // if a model is missing
        if(!matched) {
          cb(new Error("Unable to match " + key + ". Available: " + models));
        }
      });
      console.log(buildList);
      cb();
    },
    function buildAutoBuildList(cb) {
      async.forEach(Object.keys(buildList), function(model, cb) {
        async.each(Object.keys(buildList[model]), function(key, cb) {
          module.exports.config[model].generator(buildList[model][key], function(err, res) {
            if(err) {
              cb(err);
            }
            else {
              dataset[key] = res;
              cb(null);
            }
          });
        }, cb);
      }, cb);
    },
    ], function(err) {
      if(err) {
        return callback(err);
      }
      callback(null, dataset);
    });
};
