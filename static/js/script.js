/* Author: YOUR NAME HERE
*/

$(document).ready(function() {   

  var socket = io.connect();

  $('#sender').bind('click', function() {
     socket.send("Message Sent on " + new Date());     
   });
   
   socket.on('message', function(data){
     var message = JSON.parse(data);
     
     switch(message.cmd){
       case 'consoleupdate':
         //do something
         $('#console').prepend(message.value);
         break;
       default:
         //do something
         break;
     }
     //$('#reciever').append('<li>' + data + '</li>');  
   });
   
   $('#homesearch form').submit(function(){
     window.location = '/' + $('#channelselector').val() + "/console";
     return false;
   });
   
   $('#response form button').click(function(){
     socket.send(JSON.stringify({
     	cmd : "saveresponse",
     	responsetext : $('#response form textarea').val(),
     	channel : channelname
     }));
     return false;
   })
});