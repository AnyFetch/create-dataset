"use strict";
require('should');

// createDataset.apply
//   should work

var Company = function(data) {
  this.name = data.name;
};

var User = function(data) {
  this.name = data.name;
  this.company = data.company;
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
    var userCalled;

    createDataset.config = {
      company: {
        generator: function(data, cb) {
          companyCalled = true;
          cb(null, new Company(data));
        }
      },
      user: {
        dependencies: ['company'],
        generator: function(data, cb) {
          userCalled = companyCalled;
          cb(null, new User(data));
        }
      }
    };

    var rawDataset = {
      user: {
        name: 'user'
      },
      company: {
        name: 'company'
      },
    };

    createDataset(rawDataset, function(err, dataset) {
      if(err) {
        return done(err);
      }

      dataset.should.have.keys(['company', 'user']);
      userCalled.should.eql(true);
      companyCalled.should.eql(userCalled);

      done();
    });
  });

  it("should call .defer before instantation", function(done) {
    createDataset.config = {
      company: {
        generator: function(data, cb) {
          cb(null, new Company(data));
        }
      },
      user: {
        dependencies: ['company'],
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
        name: 'user',
        company: createDataset.defer('company')
      },
    };

    createDataset(rawDataset, function(err, dataset) {
      if(err) {
        return done(err);
      }

      dataset.should.have.keys(['company', 'user']);
      dataset.user.company.should.eql(dataset.company);

      done();
    });
  });

  it("should allow to specify dataset on which to build", function(done) {
    createDataset.config = {
      company: {
        generator: function(data, cb) {
          cb(null, new Company(data));
        }
      },
      user: {
        dependencies: ['company'],
        generator: function(data, cb) {
          cb(null, new User(data));
        }
      }
    };

    var dataset = {
      someKey: 'someValue'
    };

    var rawDataset = {
      company: {
        name: 'company'
      },
      user: {
        name: 'user',
        company: createDataset.defer('company')
      },
    };

    createDataset(rawDataset, dataset, function(err, dataset) {
      if(err) {
        return done(err);
      }

      dataset.should.have.keys(['company', 'user', 'someKey']);
      dataset.user.company.should.eql(dataset.company);
      dataset.should.have.property('someKey', 'someValue');
      done();
    });
  });

  it("should match dependencies with models, not item names", function(done) {
    createDataset.config = {
      company: {
        generator: function(data, cb) {
          cb(null, new Company(data));
        }
      },
      user: {
        dependencies: ['company'],
        generator: function(data, cb) {
          cb(null, new User(data));
        }
      }
    };

    var rawDataset = {
      companyTest: {
        name: 'company'
      },
      userTest: {
        name: 'user',
        company: createDataset.defer('companyTest')
      },
    };

    createDataset(rawDataset, function(err, dataset) {
      if(err) {
        return done(err);
      }
      dataset.should.have.keys(['companyTest', 'userTest']);
      dataset.userTest.company.should.eql(dataset.companyTest);
      done();
    });
  });
});
