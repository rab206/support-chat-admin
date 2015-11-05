$(document).ready(function() {  
  
  // var console = {};
  // console.log = function(text) {
  //   alert(text);
  // };

  // jQuery variables attached to DOM elements
  var $error = $('.error'),
    $errorMsg = $('.errorMsg'),
    $loading = $('.loading'),
    $results = $('.results'),
    //$output = $('.output'),
    //$question = $('.questionText'),
    $connecting = $('.connecting');
    
  var mobileType = function(){
    if(/Android/i.test(navigator.userAgent)){
      return "Android";
    } else if(/BlackBerry/i.test(navigator.userAgent)){
      return "BlackBerry";
    } else if(/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      return "IOS";
    } else if(/IEMobile/i.test(navigator.userAgent)){
      return "WindowsMobile";
    } else {
      return "undefined";
    }
  };
  
}
  
  // var mob = mobileType();
  // $results.html(mob);
  // $results.show();