'use strict';

var Flow = require('../lib/flow');
var ActiveRecord = require('../index');

ActiveRecord.config({timestampData:true});

var Car = new ActiveRecord('cars');

var flow = new Flow();
var car = new Car();

flow.execute(function() {
    car.name ='Ford';
    car.model = 'GT500';
    return car.save();
});

flow.execute(function(){
    car.color = 'red/white';
    return car.save();
});


