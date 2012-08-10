//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , port = (process.env.PORT || 8081);

//channels
var datastore = {};

//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "shhhhhhhhh!"}));
    server.use(connect.static(__dirname + '/static'));
    server.use(server.router);
});

//setup the errors
server.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: { 
                  title : '404 - Not Found'
                 ,description: ''
                 ,author: ''
                 ,analyticssiteid: 'XXXXXXX' 
                },status: 404 });
    } else {
        res.render('500.jade', { locals: { 
                  title : 'The Server Encountered an Error'
                 ,description: ''
                 ,author: ''
                 ,analyticssiteid: 'XXXXXXX'
                 ,error: err 
                },status: 500 });
    }
});
server.listen( port);

//Setup Socket.IO
var io = io.listen(server);
io.sockets.on('connection', function(socket){
  console.log('Client Connected');
  socket.on('message', function(data){
    switch(data.cmd){
      case 'connect':
        console.log('GOT A CONNECT!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        //do something
        connectChannel(data.channel, socket);
        break;
      case 'saveresponse':
        updateResponseText(data.channel, data.responsetext)
        break;
      default:
        //do something
    }
  });
  socket.on('disconnect', function(){
    console.log('Client Disconnected.');
  });
});

function connectChannel(thechannelname, client){
  if(datastore.hasOwnProperty(thechannelname)){
    //the channel already exists
    console.log('Connected to Existing Channel: ' + thechannelname);
    console.log('ResponseText for this channel is: ' + datastore[thechannelname].responseText);
    datastore[thechannelname].clients.push(client);
  }
  else{
    //the channel does not exist
    console.log('Creating New Channel: ' + thechannelname);
    datastore[thechannelname] = {
      clients : [client],
      responseText : ''
    };
  }
  //set the callback to remove the client whenever it disconnects
  client.on('disconnect', function(){
    console.log('Client Disconnected from channel: ' + thechannelname);
    var toremove = datastore[thechannelname].clients.indexOf(client);
    console.log('going to delete item at index ' + toremove);
    datastore[thechannelname].clients.splice(toremove,1);
  });
  return datastore[thechannelname];  
}

function updateResponseText(thechannelname, responsetext){
  if(datastore.hasOwnProperty(thechannelname)){
    datastore[thechannelname].responseText = responsetext;
  }
}


///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

//homepage
server.get('/', function(req,res){
  res.render('index.jade', {
    locals : { 
              header: ''
             ,footer: ''
             ,title : 'HTTP Request Inspector'
             ,description: 'A website for inspecting HTTP GETS and POSTS'
             ,author: 'Rob Righter'
             ,analyticssiteid: 'XXXXXXX' 
            }
  });
});

server.get("/:channel/console", function (req, res) {
  //render out the console template and nothing else. The Channel is created and handled on the web socket event
  res.render('console.jade', {
    locals : { 
      header: '',
      footer: '',
      title : (req.params.channel +' Console'),
      description: '',
      author: 'Rob Righter',
      channelname: req.params.channel,
      responsetext: getResponseText(req.params.channel),
      analyticssiteid: 'XXXXXXX' 
    }
  });
  
});

server.get("/:channel", function (req, res, match) {
  //render reply with whatever they asked us to.
  sendConsoleUpdateToClients(req.params.channel, formatConsoleEntry(req));
  sendResponseText(req.params.channel,res);
});

server.post("/:channel", function (req, res, match) {
  //render reply with whatever they asked us to.
  sendConsoleUpdateToClients(req.params.channel, formatConsoleEntry(req));
  sendResponseText(req.params.channel,res);
});


function getResponseText(thechannelname){
  return (datastore.hasOwnProperty(thechannelname) ? datastore[thechannelname].responseText : '');
}

function sendResponseText(thechannelname,res){
  if(datastore.hasOwnProperty(thechannelname)){
    //the channel exists
    res.send(datastore[thechannelname].responseText);
  }
  else{
    //the channel does not exist so just send out an error
    res.send('{"error" : "Sorry, this channel does not exist"}');
  }
}

function sendConsoleUpdateToClients(channel, consolestring){
  var message = {
    cmd: 'consoleupdate',
    value: consolestring
  }
  if(datastore.hasOwnProperty(channel)){
    datastore[channel].clients.forEach(function(client){
      client.send(JSON.stringify(message));
    });
  }
}

function formatConsoleEntry(req){

  var toreturn = '<h5>'+req.method+' '+req.url+'</h5>';
  if(req.hasOwnProperty('rawBody')){
    toreturn += '<h5>Post Body:</h5>';
    toreturn += ('<p>'+req.rawBody+'</p>');
  }
  toreturn += '<h5>Headers:</h5>';
  objectMap(req.headers, function(key, value){
    toreturn += ("<span class='key'>"+key+":</span> " + " <span class='value'>"+value+"</span><br>");
  });
  
  toreturn += '<hr>';
  
  return toreturn;
  
}

//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

function objectMap(obj, callback){
  var toreturn = [];
  for(key in obj){
    toreturn.push(callback(key, obj[key]));
  }
  return toreturn;
}


//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on http://0.0.0.0:' + port );
