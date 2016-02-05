var express = require('express');
var app = express();
var sqlite3 = require('sqlite3').verbose();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/draw.html');
});
var anoncount = 0;
var muodot_max_length = 300;
var vuoron_pituus = 180000; // millisekunteina
var muodot = [];
var userlist = [];
var piirtovuorot = [];
var piirtovuorotimeout;
var sana = "";
var piirtaja = "";

function hae_sana() {
  var db = new sqlite3.Database("karvoitus.db");
  db.each("SELECT * FROM sanasto ORDER BY RANDOM() LIMIT 1", function(err, row) {
    sana = row.sana;
  });
  db.close();
}

function aloitapiirtovuoro() {
  muodot = [];
  io.emit('muodot', muodot);
  var piirtaja_id = piirtovuorot[0];
  piirtaja = io.sockets.connected[piirtaja_id].username;
  io.emit('draw', false);
  hae_sana();
  setTimeout(function(){
    console.log("** "+piirtaja+" is drawing "+sana);
    io.to(piirtaja_id).emit('message', "** It's your turn to draw! Draw this word: "+sana);
    io.to(piirtaja_id).emit('draw', true);
  }, 5);
  io.sockets.connected[piirtaja_id].broadcast.emit('message', "** Now drawing: "+piirtaja);
  io.emit('drawtime', vuoron_pituus/1000);
  piirtovuorotimeout = setTimeout(function(){lopetapiirtovuoro(false);}, vuoron_pituus);
};

function lopetapiirtovuoro(arvaaja) {
  clearTimeout(piirtovuorotimeout);
  io.emit('drawtime', "");
  if (arvaaja) {
    io.emit('message', "** "+arvaaja+" guessed the word '"+sana+"'!");
  }
  else {
    emittoi("** Round ended. Nobody guessed the word which was "+sana+". L2P plz");
  };
  sana = "";
  piirtovuorot.shift();
  if (piirtovuorot.length > 0) {
    io.emit('draw', false);
    setTimeout(function(){aloitapiirtovuoro();}, 3000);
  }
  else {
    emittoi("** Entering ebin multiplayer free-draw mode since nobody wants to draw... If *YOU* want to draw, use the /draw command!");
    io.emit('draw', true);
  }
  send_users();
};

function emittoi(msg) {
  io.emit('message', msg);
  console.log(msg);
}

function poista_user(poistettava) {
  userlist.splice(userlist.indexOf(poistettava), 1);
  send_users();
}

function lisaa_user(lisattava) {
  userlist.push(lisattava);
  send_users();
}

function vaihda_user(wanha, uus) {
  userlist.splice(userlist.indexOf(wanha), 1);
  userlist.push(uus);
}

function send_users() {
  var usertable = [];
  var ei_piirtajat = userlist.slice(0);
  for (var i = 0; i < piirtovuorot.length; i++) {
    var usern = io.sockets.connected[piirtovuorot[i]].username;
    usertable.push([i.toString(), usern]);
    var ind = ei_piirtajat.indexOf(usern);
    if(ind > -1) {
      ei_piirtajat.splice(ind, 1);
    }
  }
  ei_piirtajat.sort()
  for ( var i = 0; i < ei_piirtajat.length; i++) {
    usertable.push(["", ei_piirtajat[i]])
  }
  io.emit('users', usertable.reverse());
}

io.on('connection', function(socket){
  socket.username = "~anon_"+anoncount;
  anoncount += 1;
  socket.emit('nick', socket.username);
  socket.emit('muodot', muodot);
  if (piirtovuorot.length > 0) {
    socket.emit('draw', false);
    socket.emit('message', "** Now drawing: "+piirtaja);
  }
  else {
    socket.emit('message', "** The game is in ebin multiplayer free-draw mode because nobody has volunteered to draw... If *YOU* want to draw, use the /draw command!")
  }
  emittoi("** "+socket.username+" connected")
  lisaa_user(socket.username)

  socket.on('disconnect', function(){
    console.log(socket.username+' disconnected');
    io.emit('message', "** "+socket.username+" disconnected");
    var ind = piirtovuorot.indexOf(socket.id);
    if (ind > -1) {
      if (ind == 0) {
        lopetapiirtovuoro();
      }
      else {
        piirtovuorot.splice(ind, 1);
      }
    }
    poista_user(socket.username);
  });

  socket.on('chat message', function(data){
    var msg = "<"+socket.username+"> "+data.slice(0,256);
    emittoi(msg);
    if (sana != "" && data.toLowerCase() == sana.toLowerCase()) {
      lopetapiirtovuoro(socket.username);
    }
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
      if (new_nick.length > 2 && new_nick.length <= 32) {
        var msg = "* " + socket.username + " is now known as " + new_nick;
        vaihda_user(socket.username, new_nick);
        socket.username = new_nick;
        emittoi(msg);
        socket.emit('nick', socket.username);
        send_users();
      }
      else {
        socket.emit('nick', socket.username);
        socket.emit('message', "** Nickname must be 3..32 characters!");
      }
    }
    else if (data == "draw"){
      if (piirtovuorot.indexOf(socket.id) != -1) {
        socket.emit('message', "** You are already in draw Q!");
      }
      else {
        piirtovuorot.push(socket.id);
        send_users();
        if (piirtovuorot.length == 1) {
          aloitapiirtovuoro();
        }
        else {
          socket.emit('message', "** You have been added to draw Q");
          console.log("** "+socket.username+" was added to draw Q");
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

http.listen(8080, function(){
  console.log('listening on *:8080');
});