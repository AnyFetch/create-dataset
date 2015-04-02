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

createDataset.apply(rawDataset, dataset, function(err, dataset) {
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
        generator: function(data) {
            return CompanyFactory.create(data);
        }
    },
    user: {
        dependencies: ['company'],
        generator: function(data) {
            return UserFactory.create(data);
        }
    },
    profile: {
        dependencies: ['company'],
        generator: function(data) {
            return ProfileFactory.create(data);
        }
    }
};
```
