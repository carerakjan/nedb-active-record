'use strict';

var ActiveRecord = require('../index');

ActiveRecord.config({
    timestampData: true,
    autoload: true
});

var User = new ActiveRecord('users');

var user = new User();

user.name = 'Vova';
user.age = 31;
user.save();

user.qwe='rty';
user.save();

user.surname = 'Ivanov';
user.save();

user.education = 'KPI';
user.save();

user.address = {index:'04128', phone:'0637575757'};
user.save();