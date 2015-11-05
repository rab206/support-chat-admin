'use strict';

var express    = app = require('express.io'),
  app          = express().http().io(),
  request      = require('request');

// Bootstrap application settings
require('./config/express')(app);

app.use(function(req, res, next){
  var ip = req.headers['x-forwarded-for'] || 
     req.connection.remoteAddress || 
     req.socket.remoteAddress ||
     req.connection.socket.remoteAddress;
  console.log(new Date() + "; ip: " +ip + " url: " + req.url);
  next();
});

// render index page
app.get('/', function(req, res) {
  res.render('index');
});

// render admin page
app.get('/admin', function(req, res) {
  res.render('admin');
});

// post a question to watson and return json response to App
app.get('/question/:query', function(req, res, next){
  request({
    url: "https://watson-wdc01.ihost.com/instance/696/deepqa/v1/question",
    json: {'question': {'questionText': req.params.query, "formattedAnswer": true}}, //Query string data
    method: 'POST',
    headers: {
      "content-type": "application/json",
      "authorization": "Basic ZWNvMTQxX2FkbWluaXN0cmF0b3I6cGJ3RXhDTDU=",
    },
  }, function(error, response, body){
    if(error) {
      console.log(error);
      next(error);
    } else {
      res.json(response);
    }
  });
});

// templates
app.get('/instructions/:feature', function(req, res) {
  res.render('feature', {feature: req.params.feature, os: req.query.os});
});

app.get('/allowance', function(req, res){
  res.render('allowance', {month: req.query.month, allowance_entity: req.query.allowance_entity});
});

app.get('/bill', function(req, res){
  res.render('bill', {month: req.query.month});
});

app.get('/upgradeData', function(req, res){
  res.render('upgradeData');
});

app.io.route('post:message', function(req) {
  req.io.broadcast('send:message', req.data);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.code = 404;
  err.message = 'Not Found: ' + req.url;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  var error = {
    code: err.code || 500,
    error: err.message || err.error
  };
  console.log('error:', error);

  res.status(error.code).json(error);
});

var port = process.env.VCAP_APP_PORT || process.env.PORT;
app.listen(port, process.env.ip);
console.log('listening at:', port);
