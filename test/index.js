"use strict";
require('should');


// createDataset(raw, cb)
//   missing generator

// createDataset.defer
//   should work

// createDataset(raw, dataset, cb)
//   main use case

// createDataset.apply
//   should work


var Company = function(data) {
  this.name = data.name;
};

var User = function(data) {
  this.name = data.name;
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

  it("should instantiate one object per key in rawDataset, respecting _model override", function(done) {
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
      fakeUser2: {
        _model: 'company',
        name: 'user2'
      }
    };

    createDataset(rawDataset, function(err, dataset) {
      if(err) {
        return done(err);
      }

      dataset.should.have.keys(['company', 'user', 'fakeUser2']);
      dataset.company.should.be.an.instanceOf(Company);
      dataset.user.should.be.an.instanceOf(User);
      dataset.fakeUser2.should.be.an.instanceOf(Company);

      done();
    });
  });

  it("should instantiate one object per key in rawDataset, respecting first key priority", function(done) {
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
      // Should be a company, since company is defined first in config
      companyUser: {
        name: 'user2'
      }
    };

    createDataset(rawDataset, function(err, dataset) {
      if(err) {
        return done(err);
      }

      dataset.should.have.keys(['company', 'user', 'companyUser']);
      dataset.company.should.be.an.instanceOf(Company);
      dataset.user.should.be.an.instanceOf(User);
      dataset.companyUser.should.be.an.instanceOf(Company);

      done();
    });
  });

  it("should respect dependencies order", function(done) {
    var companyCalled = false;

    createDataset.config = {
      company: {
        generator: function(data, cb) {
          companyCalled = true;
          cb(null, data);
        }
      },
      user: {
        dependencies: ['company'],
        generator: function(data, cb) {
          if(!companyCalled) {
            throw new Error("User must be called after company is initialized");
          }
          cb(null, data);
          done();
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
    };

    createDataset(rawDataset, function(err) {
      if(err) {
        return done(err);
      }
    });
  });
});
