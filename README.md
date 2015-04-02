# Create dataset

When writing tests with Node, we often need to create complex objects interdependencies.

Some patterns helps : factories, fixtures... but at the end of the day we still need to spend time managing our dependencies.

This library tries to bring the best of both world: a simple JS object to define the structure, and nothing more. It is framework agnostic and will work for Mongo or SQL objects.

## Example use
For instance, to create a company, a user and a profile, one would simply write:

```js
var createDataset = require('create-dataset');
// See next section
require('./create-configuration');

// We define our dataset here
var rawDataset = {
    // Leave an empty object, to inherit all default values from some factory
    company: {},

    // Create a user, 
    user1: {
        // We can also override properties from the default values in the factory
        name: "Some name",
        // For the company, we'll use the id from the company we just created
        company: createDataset.defer("company")
    },
    // Create another user with default values (and in another company, 
    user2: {
    },

    profile: {
        user: createDataset.defer("user")
    }
};

createDataset(rawDataset, function(err, dataset) {
    // At this point, we're all set, one can do
    console.log(dataset.user.id);
    dataset.company.save();
    // etc.
});
```

## Configuration
Before using this, we need to set the config for objects creation.
You only need to call this once.

```js
var createDataset = require('create-dataset');
createDataset.config = {
    company: {
        generator: function(data, cb) {
            cb(null, CompanyFactory.create(data));
        }
    },
    user: {
        dependencies: ['company'],
        generator: function(data, cb) {
            cb(null, UserFactory.create(data));
        }
    },
    profile: {
        dependencies: ['user'],
        generator: function(data, cb) {
            cb(null, ProfileFactory.create(data));
        }
    }
};
```

There is only one mandatory key, `generator`, which must indicate how to create an instance from raw data. This can be a call to your factory builder, your ORM or your own custom function. It must return a new item (or an error following node convention).

Other keys:

* `dependencies`, an array of models to build before building this object. When unspecified, no dependencies are implied. Be careful not to introduce deadlocks here (A needs B and B needs A)

## How does it works? And potential caveats
For the sake of simplicity, the key name in your dataset is loosely matched with a model name. For instance, `mainCompany` will be matched to `company`.

This can be problematic when the name is ambiguous, for instance `myUserCompany`. In such a case, the first key to match in your config will be used (in this case, `Company`).
If this is not enough, you can add a `_model` property to your dataset to force the use of a model:

```js
var rawDataset = {
    // Will be matched with 'company' config
    startup: {
        _model: 'company'
    },
    // !! Will be matched with `user`, as `user` is defined before `profile` in createDataset.config
    userProfile: {

    }
}
```

## Advanced use
### Build over seed object
When calling `createDataset`, you may want to build over a pre-existing object.

You may then add a second parameter to `createDataset`, specifying the "seed object" on which to build:

```js
var dataset = {
    hello: 'lol'
};
var rawDataset = {
    company: {}
    /* ... */
};

createDataset(rawDataset, dataset, function(err, dataset) {
    console.log(dataset.hello); // "lol"
    console.log(dataset.company); // [object Object]
});
```

### Wrap with apply
You may also want to wrap the whole function in a simple `function(err){}`, for use with `async` or Mongoose's `before`. You can simply use `.apply`:

```js
var dataset = {
    hello: 'lol'
};
var rawDataset = { /* ... */ };

before(createDataset.apply(rawDataset, dataset));

// which is equivalent to...

before(function(done) {
    createDataset(rawDataset, dataset, done);
});
```
