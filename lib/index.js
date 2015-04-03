'use strict';

var async = require('async');


/**
 * Quickly build some fixtures, respecting creation constraints.
 * Example use :
 * var rawDataset = {
 *   company: {},
 *   user: {
 *     company: create.defer(dataset, 'company')
 *   },
 *   document: {
 *     company: create.defer(dataset, 'company'),
 *     filePath: '/tmp/somewhere,
 *     metadata: {
 *       title: 'AnyFetch document number 1',
 *     },
 *   }
 * };
 *
 * This will create a company, a user and a document and return them in dataset.
 */
module.exports = function buildInitialState(rawDataset, dataset, waitForES, cb) {
  if(!cb) {
    cb = waitForES;
    waitForES = false;
  }

  /**
   * Build each items in `objects` of type `model`, register them in dataset, then call cb.
   */
  var createObjects = function(model, objects, cb) {
    var stack = [];
    for(var key in objects) {
      // Build data for this object
      var data = {};
      for(var subkey in objects[key]) {
        if(objects[key][subkey] instanceof Function) {
          data[subkey] = objects[key][subkey]();
        }
        else {
          data[subkey] = objects[key][subkey];
        }
      }

      // Closure time for key and data;)
      var pusher = function(key, data) {
        stack.push(function(cb) {
          if(model === 'document' && waitForES) {
            data.forceESIndexing = true;
          }

          module.exports.atomic(dataset, key, model, data, function(err) {
            if(err) {
              throw err;
            }

            if(model === 'document') {
              return async.waterfall([
                function saveDataAndMetadata(cb) {
                  dataset[key].saveDataAndMetadata(true, cb);
                },
                function waitForEs(cb) {
                  if(waitForES) {
                    dataset[key].onInstance('es-indexed', function onEsIndexed(err) {
                      if(err) {
                        throw err;
                      }
                      dataset[key].removeListener('es-indexed', onEsIndexed);
                      cb();
                    });

                    var tmp = dataset[key].documentType;

                    dataset[key].populate('documentType', function(err, document) {
                      // Send a fake signal for immediate ES indexing
                      document.emit('hydration-ended');
                      dataset[key].documentType = tmp;
                    });
                  }
                  else {
                    cb(null);
                  }
                }
              ], cb);
            }

            cb(null);
          });
        });
      };
      pusher(key, data);
    }

    async.parallel(stack, cb);
  };

  // Create list of items to build, sorted by types
  var models = ['hydrater', 'subsubcompany', 'subcompany', 'company', 'user', 'client', 'accessToken', 'documentType', 'document'];

  var buildList = {};
  models.forEach(function(model) {
    buildList[model] = {};
  });

  // Fill buildList
  Object.keys(rawDataset).forEach(function(key) {
    var matched = models.some(function(model) {
      if(key.toLowerCase().indexOf(model.toLowerCase()) !== -1) {
        buildList[model][key] = rawDataset[key];
        return true;
      }
    });

    if(!matched) {
      throw new Error("Unable to match " + key + ". Available: " + models);
    }
  });

  // Build.
  var createObjectsCb = function(buildListKey, model) {
    if(!model) {
      model = buildListKey;
    }
    return async.apply(createObjects, model, buildList[buildListKey]);
  };

  async.auto({
    hydrater: ['company', 'subcompany', 'subsubcompany', createObjectsCb('hydrater')],
    company: createObjectsCb('company'),
    client: createObjectsCb('client'),
    documentType: ['company', createObjectsCb('documentType')],
    subcompany: ['company', createObjectsCb('subcompany', 'company')],
    subsubcompany: ['company', 'subcompany', createObjectsCb('subsubcompany', 'company')],
    user: ['company', 'subcompany', 'subsubcompany', createObjectsCb('user')],
    accessToken: ['client', 'user', createObjectsCb('accessToken')],
    document: ['documentType', 'user', 'accessToken', createObjectsCb('document')],
  }, cb);
};


/**
 * Defer setting a value, waiting for another object to be created
 */
module.exports.defer = function(dataset, key) {
  if(!key) {
    throw new Error("Defer failed: missing key");
  }

  return function() {
    return dataset[key];
  };
};


module.exports.atomic = function(dataset, key, model, data, cb) {
  factory.create(model, data, function(item) {
    dataset[key] = item;

    cb();
  });
};


module.exports.apply = function createInitialDataset(rawDataset, dataset, waitForES) {
  return function(done) {
    module.exports(rawDataset, dataset, waitForES, done);
  };
};
