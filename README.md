# nedb-active-record
Simple realization of ActiveRecord pattern for [NeDB](https://github.com/louischatriot/nedb)

Installation
============

Through NPM:

`npm install nedb-active-record`

Code Example
============

```javascript
ActiveRecord = require('nedb-active-record');

/*
    Global configuration for all instances.
    This is initial parameters for NeDB.
    Also was added two additional params:
    - location (internal folder), by default 'database',
    - format (e.c. 'db', 'txt')
*/
ActiveRecord.config({
    timestampData: true,
    autoload: true
});

//Creation of new collection (will create new file '/database/users.txt')
var User = new ActiveRecord('users');

//Create new user record.
var user = new User();
user.name = 'John';
user.age = 31;
user.save();

user.surname = 'Smith';
user.save();

//You can add parameters to constructor.
var user2 = new User({
    name: 'Rocky',
    surname: 'Balboa',
    age: 69
});

user2.save();

/*
    You can find data like in NeDB, unfortunately without chaining.
    Instead uses: $$sort, $$limit, $$skip, $$projection.
*/
User.find({age: {$gt: 23}, $$sort: {name: 1}})
    .then(function(users) {
        //users -> collection of User instances

        //Return new user record
        return User.insert({_id: 1, name: 'Bohdan'});
    })
    .then(function(newUser){
        newUser.citizenship = 'Ukrainian';
        newUser.save();
    })
    .then(function(){
        return User.findOne({_id:1}).then(function(foundUser){
            //Removing
            return foundUser.remove();
        });
    })
    .then(function(numRemoved) {
        console.log(numRemoved)
    })
    .catch(function(error){
        console.log(error);
    });
```