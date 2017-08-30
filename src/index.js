'use strict'

var getTime = require('date-fns/get_time');
var isWeekend = require('date-fns/is_weekend')

const nowDate = Date();
console.log(isWeekend(nowDate));