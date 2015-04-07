'use strict';

var async = require('async');
var rarity = require('rarity');

module.exports = function createDataset(rawDataset, dataset, callback) {
  if(!callback) {
    callback = dataset;
    dataset = {};
  }

  // Function called by async.auto, see below
  var generateObject = function(model, key, cb) {
    // see .defer
    for(var subkey in rawDataset[key]) {
      if(rawDataset[key][subkey] instanceof Function) {
        rawDataset[key][subkey] = rawDataset[key][subkey](dataset);
      }
    }
    module.exports.config[model].generator(rawDataset[key], cb);
  };

  async.waterfall([
    function init(cb) {
      var models = [];
      var buildList = {};
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
      cb(null, buildList);
    },
    function buildAutoBuildList(buildList, cb) {
      var asyncBuildList = {};
      Object.keys(buildList).forEach(function(model) {
        Object.keys(buildList[model]).forEach(function(key) {
          asyncBuildList[key] = [];
          // push the dependencies of the object
          if(module.exports.config[model].dependencies) {
            asyncBuildList[key] = asyncBuildList[key].concat(module.exports.config[model].dependencies);
          }
          // push the function for async.auto
          asyncBuildList[key].push(function(callback) {
            generateObject(model, key, function(err, result) {
              if(err) {
                throw err;
              }
              dataset[key] = result;
              callback(null);
            });
          });
        });
      });
      cb(null, asyncBuildList);
    },
    function runAsync(asyncBuildList) {
      // let async.auto handle the dependencies issues like a boss
      async.auto(asyncBuildList, rarity.carry([dataset], callback));
    }
  ], callback);
};

module.exports.defer = function defer(key) {
  if(!key) {
    throw new Error("Defer failed: missing key");
  }
  return function(dataset) {
    return dataset[key];
  };
};

module.exports.config = {};
