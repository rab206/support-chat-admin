/* global angular */
'use strict';

var chatApp = angular.module('chatApp', ['ngSanitize', 'ngTouch']);

var tryAgainMessage = "Sorry I couldn't understand your question. Please make sure everything is spelt correctly or try phrasing it in a different way or I can ask one of our expert advisors to join the conversation";

chatApp.controller('ChatCtrl', function($scope, $rootScope, $http, $sce, $q, socket) {
  $rootScope.messages = [];
  $rootScope.users = [];
  $rootScope.customer;
  
  var userPromise = $http.get('/data/users.json'),
      messagePromise = $http.get('/data/messages.json');
  $q.all([
    userPromise,
    messagePromise
  ]).then(function(data) {
    $rootScope.users = data[0].data.users;
    $rootScope.customer = $rootScope.users['paul.hansen'];
    $rootScope.admin = $rootScope.users['lucille.fournier'];
    $rootScope.messages = data[1].data.messages['paul.hansen'];
    $('#loader').hide();
    $('#messageList').show();
    // infinite scroll upwards 
    // http://stackoverflow.com/questions/19929487/implementing-a-reverse-infinite-scroll-using-nginfinitescroll-directive-in-angul
  });
  
  $scope.showUserModal = function(idx){
    var user = $rootScope.users[$rootScope.messages[idx].userName];
    $scope.currUser = user;
    $('#myModalLabel').text(user.name.last ? user.name.first
        + ' ' + user.name.last : user.name.first);
    $('#myModal').modal('show');
  };
});

chatApp.controller('CustomerCtrl', function($scope, $rootScope, $http, $sce, $q, socket, sendMessage) {
  $scope.doPost = function(param) {
    if($scope.text || param){
      var newMessage = {userName : $rootScope.customer.userName};
      newMessage.html = $scope.text || param;
      sendMessage(newMessage);
      $scope.text = '';
      $http.jsonp('https://api.wit.ai/message?callback=JSON_CALLBACK&q=' + newMessage.html + '&access_token=RBERXBTB2QI7OOAJAAB7RZHIMVBCW5UO')
        .success(function(response){
          console.log(response);
          if(response.outcomes[0].confidence > 0.3){
            performAction(response.outcomes[0]);
          } else {
            sendWatsonMessage({html: tryAgainMessage});
          }
      });
    }
  };
  
  $scope.submitExample = function($event){
    $scope.doPost($event.target.innerHTML);
  };
  
  function performAction(outcomes){
    switch(outcomes.intent){
      case 'question':
        sendWatsonMessage({html: outcomes.metadata});
        queryWatson(outcomes._text);
        break;
      case 'instructions':
        // response is quick enough we don't need a interim message
        sendWatsonMessage({template: '/instructions/' + outcomes.entities.feature[0].value});
        break;
      case 'specify_device':
        var feature = $('.feature:last').attr("data-feature");
        sendWatsonMessage({template: '/instructions/' + feature + '?os=' + outcomes.entities.os[0].value});
        break;
      case 'store_locator':
        var map ='<p>Here are the results for stores near #location#</p><div style="overflow:hidden;height:500px;resize:none;max-width:100%;"><div id="gmap-display" style="height:100%; width:100%;max-width:100%;"><iframe style="height:100%;width:100%;border:0;" frameborder="0" src="https://www.google.com/maps/embed/v1/search?q=vodafone+near+#location#&key=AIzaSyAN0om9mFmy1QN6Wf54tXAowK4eT0ZUPrU"></iframe></div>#gmap-display img{max-width:none!important;background:none!important;}</style></div>';
        sendWatsonMessage({html: map.replace(/#location#/g, outcomes.entities.location[0].value)});
        break;
      case 'allowance':
        var month = new Date().toLocaleString('en-gb', { month: "long" }),
            allowance_entity = outcomes.entities.allowance_entity[0].value;
        sendWatsonMessage({template: '/allowance?month=' + month + '&allowance_entity=' + allowance_entity});
        break;
      case 'upgradeData':
        $rootScope.context = 'upgradeData';
        sendWatsonMessage({template: '/upgradeData'});
        break;
      case 'yes':
        if($rootScope.context == 'upgradeData'){
          sendWatsonMessage({template: '/upgradeData'});
        } else {
          sendWatsonMessage({html: "OK. I'm just checking to see who is free and then I will invite them to this chat. I hope they can help you!"});
        }
        break;
      case 'no':
        sendWatsonMessage({html: "OK let me know if you change your mind."});
        break;
      default:
        sendWatsonMessage({html: outcomes.metadata ? outcomes.metadata : tryAgainMessage});
    }
  }
  
  function queryWatson(query){
    $http.get('/question/' + query).success(function(response){
      var text = response.body.question.answers[0].formattedText;
      console.log(response.body.question.answers);
      var html;
      if(text && !text.includes('noAnswer')){
        html = text;
      } else {
        html = "I don't think I can answer that question. I'm still learning, though, so you may want to rephrase your question and try again.";
      }
      sendWatsonMessage({html: html, moreAnswers: response.body.question.answers});
    }).error(function(err){
      console.log("error" + err);
    });
  }
  
  function sendWatsonMessage(params){
    params.userName = 'watson';
    sendMessage(params); 
  }
  
  socket.on('send:message', function (message) {
    message = JSON.parse(message);
    message.html = $sce.trustAsHtml(message.html);
    $rootScope.messages.push(message);
  });
});

chatApp.controller('CSRChatCtrl', function($scope, $rootScope, $http, $sce, $q, socket, sendMessage) {
  $scope.doPost = function() {
    if($scope.text){
      var newMessage = {userName : $rootScope.admin.userName};
      newMessage.html = $scope.text;
      sendMessage(newMessage);
      $scope.text = '';
    }
  };
  
  socket.on('send:message', function (message) {
    message = JSON.parse(message);
    message.html = $sce.trustAsHtml(message.html);
    $rootScope.messages.push(message);
  });
});

chatApp.controller('CSRCtrl', function($scope, $rootScope, $http, $sce, $q, socket, sendMessage) {
  $scope.sendBill = function(){
    var date = new Date();
    date.setMonth(date.getMonth() - 1);
    var previousMonth = date.toLocaleString('en-gb', { month: "long" });
    var newMessage = {
      userName: 'system',
      template: 'bill?month=' + previousMonth
    };
    sendMessage(newMessage);
  };
});

chatApp.controller('FeatureCtrl', function ($scope, $rootScope, $attrs, $http) {
  $scope.feature = $attrs.feature;
  $scope.os = $attrs.os;
  if($scope.os == "undefined"){
    $scope.os = $rootScope.customer.os;
  }
  $http.get('data/instructions/' + $scope.feature + '_' + $scope.os + '.json').success(function(response){
    $scope.data = response.data;
  });

  // initial image index
  $scope._Index = 0;

  // if a current image is the same as requested image
  $scope.isActive = function (index) {
    return $scope._Index === index;
  };

  // show prev image
  $scope.showPrev = function () {
    $scope._Index = ($scope._Index > 0) ? --$scope._Index : $scope.data.steps.length - 1;
  };

  // show next image
  $scope.showNext = function () {
    $scope._Index = ($scope._Index < $scope.data.steps.length - 1) ? ++$scope._Index : 0;
  };

  // show a certain image
  $scope.showStep = function (index) {
    $scope._Index = index;
  };
});

chatApp.factory('sendMessage', function($rootScope, $sce, socket) {
  return function(params){
    var newMessage = {};
    newMessage.date = new Date();
    // copy all params into message
    Object.keys(params).forEach(function(key) {
      newMessage[key] = params[key];
    });
    // if the html is too long overwrite it with a truncated version
    if(params.html){
      var html = params.html;
      if(html.length > 500){
        newMessage.fullHtml = html;
        html = html.substring(0,500);
        newMessage.isTruncated = true;
        newMessage.showMore = true;
      }
    }
    socket.emit('post:message', JSON.stringify(newMessage));
    newMessage.html = $sce.trustAsHtml(html);
    $rootScope.messages.push(newMessage);
  };
});

chatApp.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
});

chatApp.filter('daysTill', function() {
	return function(date) {
		date = new Date(date);
		var amountms = ((date.getTime()) - (new Date().getTime()));
		var amountdays = Math.ceil(amountms/86400000);
		return amountdays;
	};
});

chatApp.filter('plus14Days', function() {
	return function(date) {
		date = new Date(date);
		date.setDate(date.getDate() + 7);
		return date;
	};
});