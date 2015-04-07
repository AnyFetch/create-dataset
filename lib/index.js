'use strict';

var async = require('async');

module.exports.config = {};
module.exports.dataset = {};

module.exports = function createDataset(rawDataset, dataset, callback) {
  if(!callback) {
    module.exports.dataset = {};
    callback = dataset;
  }
  else {
    module.exports.dataset = dataset;
  }
  var asyncBuildList = {};

  // Function called by async.auto, see below
  var generateObject = function(model, key, cb) {
    module.exports.config[model].generator(rawDataset[key], function(err, result) {
      if(err) {
        cb(err);
      }
      // see .defer
      for(var subkey in result) {
        if(result[subkey] instanceof Function) {
          result[subkey] = result[subkey]();
        }
      }
      module.exports.dataset[key] = result;
      cb(null);
    });
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
      async.each(Object.keys(buildList), function(model, cb) {
        async.each(Object.keys(buildList[model]), function(key, cb) {
          asyncBuildList[key] = [];
          // push the dependencies of the object
          if(module.exports.config[model].dependencies) {
            asyncBuildList[key] = module.exports.config[model].dependencies;
          }
          // push the function for async.auto
          asyncBuildList[key].push(function(cb) {
            generateObject(model, key, cb);
          });
          cb();
        }, cb);
      }, cb);
    },
    function callFinalCb() {
      async.auto(asyncBuildList, function(err) {
        callback(err, module.exports.dataset);
      });
    }
    ], callback);
};

module.exports.defer = function(key) {
  if(!key) {
    throw new Error("Defer failed: missing key");
  }
  return function() {
    return module.exports.dataset[key];
  };
};
