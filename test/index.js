"use strict";
require('should');


// createDataset(raw, cb)
//   main use case
//     config
//     check all ok
//   _model override
//   first key must be more important (company > user) on ambiguous reference
//   missing generator

// createDataset.defer
//   should work

// createDataset(raw, dataset, cb)
//   main use case

// createDataset.apply
//   should work


var Company = function(data) {
  this.data = data;
};

var User = function(data) {
  this.data = data;
};

var createDataset = require('../lib');
describe("createDataset(rawDataset, cb)", function() {
  it("should instantiate one object per key in rawDataset", function(done) {
    createDataset.config = {
      company: {
        generator: function(data, cb) {
          cb(null, new Company(data));
        }
      },
      user: {
        generator: function(data, cb) {
          cb(null, new User(data));
        }
      }
    };

    var rawDataset = {
      company: {
        name: 'company'
      },
      user: {
        name: 'user'
      },
      user2: {
        name: 'user2'
      }
    };

    createDataset(rawDataset, function(err, dataset) {
      if(err) {
        return done(err);
      }

      dataset.should.have.keys(['company', 'user', 'user2']);
      dataset.company.should.be.an.instanceOf(Company);
      dataset.company.should.have.property('name', 'company');
      dataset.user.should.be.an.instanceOf(User);
      dataset.user.should.have.property('name', 'user');
      dataset.user2.should.be.an.instanceOf(User);
      dataset.user2.should.have.property('name', 'user2');

      done();
    });
  });
});
