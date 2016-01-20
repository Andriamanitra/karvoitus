var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/draw.html');
});
var anoncount = 0;
var muodot_max_length = 300;
var vuoron_pituus = 30000; // millisekunteina
var muodot = [];
var piirtovuorot = [];
var piirtovuorotimeout;

function aloitapiirtovuoro() {
  muodot = [];
  io.emit('muodot', muodot);
  var piirtaja_id = piirtovuorot[0];
  var piirtaja = io.sockets.connected[piirtaja_id].username;
  io.emit('draw', false);
  io.to(piirtaja_id).emit('draw', true);
  io.emit('message', "** Now drawing: "+piirtaja);
  piirtovuorotimeout = setTimeout(function(){lopetapiirtovuoro(false);}, vuoron_pituus);
};
function lopetapiirtovuoro(arvaaja) {
  if (arvaaja) {
    io.emit('message', "** "+arvaaja+" guessed the word!");
    clearTimeout(piirtovuorotimeout);
  }
  else {
    io.emit('message', "** Round ended. Nobody guessed the word.")
  };
  piirtovuorot.shift();
  if (piirtovuorot.length > 0) {
    aloitapiirtovuoro();
  };
};

io.on('connection', function(socket){
  socket.username = "anon_"+anoncount;
  anoncount += 1;
  socket.emit('nick', socket.username);
  socket.emit('muodot', muodot);
  console.log(socket.username+' connected');
  io.emit('message', "** "+socket.username+" connected")

  socket.on('disconnect', function(){
    console.log(socket.username+' disconnected');
    io.emit('message', "** "+socket.username+" disconnected")
  });
  socket.on('chat message', function(data){
    var msg = "<"+socket.username+"> "+data;
    console.log(msg);
    io.emit('message', msg);
  });
  socket.on('command', function(data){
    console.log("command: '"+data+"' by "+socket.username);
    if (data == "clear"){
      muodot = [];
      io.emit('muodot', muodot);
    }
    else if (data == "undo"){
      muodot = muodot.slice(0, muodot.length-1);
      io.emit('muodot', muodot);
    }
    else if (data.split(" ")[0] == "nick") {
      var new_nick = data.split(" ")[1];
      var msg = "* " + socket.username + " is now known as " + new_nick;
      socket.username = new_nick;
      console.log(msg);
      io.emit('message', msg);
      socket.emit('nick', socket.username);
    }
    else if (data == "draw"){
      if (piirtovuorot.indexOf(socket.id) != -1) {
        socket.emit('message', "** You are already in draw Q");
      }
      else {
        piirtovuorot.push(socket.id);
        if (piirtovuorot.length == 1) {
          aloitapiirtovuoro();
        }
        else {
          socket.emit('message', "** You have been added to draw Q");
        }
      }
    }
  });
  socket.on('muodot', function(muod){
    if (piirtovuorot.length == 0 || piirtovuorot[0] == socket.id) {
      if (muod.length > muodot_max_length) {
        muodot = muod.slice(muod.length-muodot_max_length);
      }
      else { 
        muodot = muod;
      }
      io.emit('muodot', muodot);
    }
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});