const schedule = require('node-schedule');

const rule = new schedule.RecurrenceRule();
rule.second = 20;

const job = schedule.scheduleJob(rule, function(){
  console.log('The answer to life, the universe, and everything!');
});