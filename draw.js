drawzone = document.getElementById('drawzone'),
drawframe = document.getElementById('drawframe'),
frameLeft = drawframe.offsetLeft,
frameTop = drawframe.offsetTop,
context = drawzone.getContext('2d'),
tools = document.getElementById("tools").innerHTML,
apuviivacolor = "#C0C0C0",
x = 0,
y = 0,
piirt = 0,
padd = 50,
timestamps = true,
context.lineCap = "round",
context.lineJoin = "round",
muodot = [];

document.getElementById("drawframe").addEventListener("mousemove", getMouseXY);

drawframe.addEventListener('contextmenu', function(rightclick) {
    rightclick.preventDefault();
    return false;
}, false);

var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
if (!is_chrome) {$('#messages').append($('<li>').text("** Chromium-based web browser such as Google Chrome is recommended for playing this game"));}

// socket.io alustus:
socket = io();

// ################## socket-eventit: #######################

// serverin ilmoitukset ja tavalliset chat-viestit
socket.on('message', function(msg){
  if (timestamps) {
    msg = timestamp()+msg;
  }
  $('#messages').append($('<li>').text(msg));
  $('#messages').scrollTop($('#messages')[0].scrollHeight);
});

// serveri kertoo mikä on tämän hetkinen nick
// esim. nickin vaihdon epäonnistuttua
socket.on('nick', function(newnick){
  $('#nick').val(newnick);
});

// serveri kertoo mitä kuvassa on
socket.on('muodot', function(muod){
  muodot = muod;
  refrsh();
});

// serveri kertoo oletko piirtovuorossa:
// jos et, piilotetaan työkalut (serveri
// ei kuitenkaan hyväksyisi piirtoja jos
// ei ole piirtovuorossa)
socket.on('draw', function(asdfg){
  if (asdfg) {
    piirtovuoroon();
  }
  else {
    piirtovuorosta();
  }
});

// serveri kertoo piirtovuoron alussa tai
// uuden käyttäjän liittyessä jäljellä olevan
// piirtoajan
socket.on('drawtime', function(draw_t){
  if (draw_t != "") {
    var sekunnit = draw_t+1;
    piirtoaika_tick(sekunnit);
  }
  else {
    clearTimeout(piirtoaikalaskuri);
    $('#piirtoaika').html("");
  }
});

// serveri kertoo paikalla olevat käyttäjät
// muodossa [[piirtovuoro, nick], ..., [piirtovuoro, nick]]
socket.on('users', function(userlista){
  $('#users tbody tr').remove();
  for (var i = 0; i < userlista.length; i++) {
    var row = document.getElementById('users').insertRow(0);
    row.insertCell(0).innerHTML = userlista[i][0];
    row.insertCell(1).innerHTML = userlista[i][1];
  }
});
// ################## </socket-eventit> ########################


// tallentaa html5-canvaksen sisältö .png-tiedostona
function downloadCanvas() {
  // luo uuden linkin, klikkaa sitä, ja poistaa sen saman tien
  var dlLink = document.createElement('a');
  var aikanyt = new Date();
  var aikastring = aikanyt.getFullYear()+"-"+(addz(aikanyt.getMonth()+1))+"-"+addz(aikanyt.getDate());
  dlLink.download = "karvoitus-"+aikastring+".png";
  dlLink.href = document.getElementById('drawzone').toDataURL('image/png');
  document.body.appendChild(dlLink);
  dlLink.click();
  document.body.removeChild(dlLink);
}

function set_offsets() {
  frameLeft = drawframe.offsetLeft,
  frameTop = drawframe.offsetTop;
  refrsh();
};

function vaihda_vari(uusi_vari) {
  Show.Color.value = uusi_vari;
}

function klik(event) {
  // right click; peruuttaa nykyisen piirron
  if (event.button == 2) {
    piirt = 0;
    refrsh();
  }
  // muu klik; aloitetaan piirto
  else if (piirt == 0) {
    x = Show.MouseX.value;
    y = Show.MouseY.value;
    aloita_piirto();
  }
  else {
    viimeistele_piirto();
  }
}

function deklik(event) {
  // jos kursori on liikkunut klikkauksen aloittamisen jälkeen
  // niin viimeistellään piirto onmouseup-eventillä
  if ( piirt == 5 || x != Show.MouseX.value || y != Show.MouseY.value ) {
    if (piirt != 0) {
      viimeistele_piirto();
    }
  }
}

// [color, alpha, width]
function hae_c_a_w() {
  return [Show.Color.value, Show.Alpha.value, Show.Width.value];
}

function aloita_piirto() {
  var duunikalu = $('input[name="tool"]:checked').val();
  if (duunikalu == "line") {
    piirt = 1;
  }
  else if (duunikalu == "circle") {
    piirt = 2;
  }
  else if (duunikalu == "oval") {
    piirt = 3;
  }
  else if (duunikalu == "rect") {
    piirt = 4;
  }
  else if (duunikalu == "freedraw") {
    freedraw_koords = [];
    freedraw();
    piirt = 5;
  }
  refrsh();
}

function freedraw() {
  if(freedraw.length == 0 || freedraw_koords.slice(-2) != [Show.MouseX.value, Show.MouseY.value]){
    freedraw_koords.push(Show.MouseX.value);
    freedraw_koords.push(Show.MouseY.value);
  }

  if (freedraw_koords.length >= 2000) {
    viimeistele_piirto();
  }
}

function viimeistele_piirto() {
  if (piirt == 1) {
    tallenna_line();
  }
  else if (piirt == 2) {
    tallenna_circle();
  }
  else if (piirt == 3) {
  	tallenna_oval();
  }
  else if (piirt == 4) {
    tallenna_rect();
  }
  else if (piirt == 5) {
    tallenna_free();
  }
  socket.emit('muodot', muodot);
  refrsh();
}

function tallenna_line() {
  if (Show.Mid.checked) {
    x = x-(Show.MouseX.value-x);
    y = y-(Show.MouseY.value-y);
  }
  muodot.push(["line", x, y, Show.MouseX.value, Show.MouseY.value, hae_c_a_w()]);
  piirt = 0;
};

function tallenna_circle() {
  var r;
  if (Show.Mid.checked) {
    r = Math.sqrt(Math.pow(Show.MouseX.value-x, 2)+Math.pow(Show.MouseY.value-y, 2));
    muodot.push(["circle", x, y, r, hae_c_a_w(), Show.Fill.checked]);
  }
  else {
    r = Math.sqrt( Math.pow((Show.MouseX.value-x)/2, 2) + Math.pow((Show.MouseY.value-y)/2, 2));
    x = (parseFloat(Show.MouseX.value)+parseFloat(x))/2;
    y = (parseFloat(Show.MouseY.value)+parseFloat(y))/2;
    muodot.push(["circle", x, y, r, hae_c_a_w(), Show.Fill.checked]);
  }
  piirt = 0;
}

function tallenna_oval() {
  var x1, y1, lev, kork, x_kesk, y_kesk;
  if (Show.Mid.checked) {
    x1 = Show.MouseX.value;
    y1 = Show.MouseY.value;
    lev = 1.33*Math.abs(2*(x1-x));
    kork = Math.abs(2*(y1-y));
    muodot.push(["oval", x, y, 1.39*lev, 1.39*kork, hae_c_a_w(), Show.Fill.checked]);
  }
  else {
    x1 = Show.MouseX.value;
    y1 = Show.MouseY.value;
    lev = 1.33*Math.abs(x1-x);
    kork = Math.abs(y1-y);
    x_kesk = Math.abs(-x1-x)/2;
    y_kesk = Math.abs(-y1-y)/2;
    muodot.push(["oval", x_kesk, y_kesk, lev, kork, hae_c_a_w(), Show.Fill.checked]);
  }
  piirt = 0;
}

function tallenna_rect() {
  var x1, y1, lev, kork;
  x1 = Show.MouseX.value;
  y1 = Show.MouseY.value;
  lev = Math.abs(x-tempX);
  kork = Math.abs(y-tempY);
  if (Show.Mid.checked) {
    lev = 2*lev;
    kork = 2*kork;
    muodot.push(["rect", x-Math.abs(x1-x), y-Math.abs(y1-y), lev, kork, hae_c_a_w(), Show.Fill.checked]);
  }
  else {
    muodot.push(["rect", Math.min(x, x1), Math.min(y, y1), lev, kork, hae_c_a_w(), Show.Fill.checked]);
  }
  piirt = 0;
}

function tallenna_free() {
  muodot.push(["free", freedraw_koords, hae_c_a_w()]);
  refrsh();
  piirt = 0;
}

function piirra_muodot() {
  for (var i = 0; i < muodot.length; i++) {
    if (muodot[i][0] == "line") {
      piirra_line.apply(this, muodot[i].slice(1));
    }
    else if (muodot[i][0] == "circle") {
      piirra_circle.apply(this, muodot[i].slice(1));
    }
    else if (muodot[i][0] == "oval") {
      piirra_oval.apply(this, muodot[i].slice(1));
    }
    else if (muodot[i][0] == "rect") {
      piirra_rect.apply(this, muodot[i].slice(1));
    }
    else if (muodot[i][0] == "free") {
      piirra_free.apply(this, muodot[i].slice(1));
    }
  }
}

function piirra_line(x_alku, y_alku, x_loppu, y_loppu, caw) {
  vari = typeof vari !== 'undefined' ? vari : "#000000";
  x_alku -= padd;
  y_alku -= padd;
  x_loppu -= padd;
  y_loppu -= padd;
  context.beginPath();
  context.moveTo(x_alku, y_alku);
  context.lineTo(x_loppu, y_loppu);
  context.strokeStyle = caw[0];
  context.globalAlpha = caw[1];
  context.lineWidth = caw[2];
  context.stroke();
  context.closePath();
}

function piirra_circle(x_keskip, y_keskip, r, caw, fill) {
  vari = typeof vari !== 'undefined' ? vari : "#000000";
  x_keskip -= padd;
  y_keskip -= padd;
  context.beginPath();
  context.arc(x_keskip, y_keskip, r, 0, 2*Math.PI);
  if (fill) {
    context.fillStyle = caw[0];
    context.globalAlpha = caw[1];
    context.lineWidth = caw[2];
    context.fill();
  }
  else {
    context.strokeStyle = caw[0];
    context.globalAlpha = caw[1];
    context.lineWidth = caw[2];
    context.stroke();
  }
  context.closePath();
}

function piirra_oval(x_keskip, y_keskip, lev, kork, caw, fill) {
  x_keskip -= padd;
  y_keskip -= padd;
  x_keskip = parseFloat(x_keskip);
  y_keskip = parseFloat(y_keskip);
  lev = parseFloat(lev);
  kork = parseFloat(kork);

  context.beginPath();

  context.moveTo(x_keskip, y_keskip - kork/2); // A1

  context.bezierCurveTo(
    x_keskip + lev/2, y_keskip - kork/2, // C1
    x_keskip + lev/2, y_keskip + kork/2, // C2
    x_keskip, y_keskip + kork/2); // A2

  context.bezierCurveTo(
    x_keskip - lev/2, y_keskip + kork/2, // C3
    x_keskip - lev/2, y_keskip - kork/2, // C4
    x_keskip, y_keskip - kork/2); // A1

  if (fill) {
    context.fillStyle = caw[0];
    context.globalAlpha = caw[1];
    context.lineWidth = caw[2];
    context.fill();
  }
  else {
    context.strokeStyle = caw[0];
    context.globalAlpha = caw[1]
    context.lineWidth = caw[2];
    context.stroke();
  }
  context.closePath();
}

function piirra_rect(x0, y0, lev, kork, caw, fill) {
  context.beginPath();
  context.rect(x0-padd, y0-padd, lev, kork);
  if (fill) {
    context.fillStyle = caw[0];
    context.globalAlpha = caw[1];
    context.lineWidth = caw[2];
    context.fill();
  }
  else {
    context.strokeStyle = caw[0];
    context.globalAlpha = caw[1];
    context.lineWidth = caw[2];
    context.stroke();
  }
  context.closePath();
}

function piirra_free(koordlist, caw) {
  context.strokeStyle = caw[0];
  context.globalAlpha = caw[1];
  context.lineWidth = caw[2];
  context.beginPath();
  context.moveTo(koordlist[0]-padd, koordlist[1]-padd);
  for(i = 2; i < koordlist.length; i=i+2) {
    context.lineTo(koordlist[i]-padd, koordlist[i+1]-padd);
  }
  context.stroke();
  context.closePath();
}

function refrsh() {
  context.clearRect(0, 0, drawzone.width, drawzone.height);
  piirra_muodot();
}

function tempPiirto() {
  if (piirt == 1) {
    refrsh();
    if (Show.Mid.checked) {
      piirra_line(x-(tempX-x), y-(tempY-y), tempX, tempY, hae_c_a_w());
    }
    else {
      piirra_line(x, y, tempX, tempY, hae_c_a_w());
    }
  }
  else if (piirt == 2) {
    refrsh();
    if (Show.Mid.checked) {
      var r = Math.sqrt(Math.pow(Show.MouseX.value-x, 2)+Math.pow(Show.MouseY.value-y, 2));
      piirra_circle(x, y, r, hae_c_a_w(), Show.Fill.checked);
    }
    else {
      var r = Math.sqrt( Math.pow((Show.MouseX.value-x)/2, 2) + Math.pow((Show.MouseY.value-y)/2, 2)),
      x_keskip = (parseFloat(Show.MouseX.value)+parseFloat(x))/2,
      y_keskip = (parseFloat(Show.MouseY.value)+parseFloat(y))/2;
      piirra_circle(x_keskip, y_keskip, r, hae_c_a_w(), Show.Fill.checked);
    }
    context.setLineDash([5]);
    piirra_line(x, y, tempX, tempY, [apuviivacolor, 1, 1], 1);
    context.setLineDash([]);
  }
  else if (piirt == 3) {
    refrsh();
    if (Show.Mid.checked) {
      var lev = 1.33*Math.abs(2*(tempX-x)),
      kork = Math.abs(2*(tempY-y));
      piirra_oval(x, y, 1.39*lev, 1.39*kork, hae_c_a_w(), Show.Fill.checked);
      context.setLineDash([5]);
      piirra_line(x, y, tempX, tempY, [apuviivacolor, 1, 1], 1);
      context.setLineDash([]);
    }
    else {
      context.setLineDash([5]);
      context.strokeStyle = apuviivacolor;
      context.lineWidth = 1;
      context.strokeRect(x-padd, y-padd, tempX-x, tempY-y);
      context.setLineDash([]);

      var lev = 1.33*Math.abs(tempX-x),
      kork = Math.abs(tempY-y),
      x_kesk = Math.abs(-tempX-x)/2,
      y_kesk = Math.abs(-tempY-y)/2;
      piirra_oval(x_kesk, y_kesk, lev, kork, hae_c_a_w(), Show.Fill.checked);
    }
  }
  else if (piirt == 4) {
    refrsh();
    if (Show.Mid.checked) {
      piirra_rect(x-Math.abs(tempX-x), y-Math.abs(tempY-y), 2*Math.abs(x-tempX), 2*Math.abs(y-tempY), hae_c_a_w(), Show.Fill.checked);
    }
    else {
      piirra_rect(Math.min(x, tempX), Math.min(y, tempY), Math.abs(x-tempX), Math.abs(y-tempY), hae_c_a_w(), Show.Fill.checked);
    }
  }
  else if (piirt == 5) {
    refrsh();
    piirra_free(freedraw_koords, hae_c_a_w());
  }
}


// modifioitua lainacoodia
// Temporary variables to hold mouse x-y pos.s
var tempX = 0;
var tempY = 0;
// Main function to retrieve mouse x-y pos.s
function getMouseXY(e) {
  tempX = e.pageX
  tempY = e.pageY
  tempX = tempX-frameLeft;
  tempY = tempY-frameTop;

  // jos piirto on aloitettu
  if (piirt != 0) {
    tempPiirto(tempX, tempY);
  }

  // catch possible negative values in NS4
  if (tempX < 0){tempX = 0}
  if (tempY < 0){tempY = 0}
  // show the position values in the form named Show
  // in the text fields named MouseX and MouseY
  document.Show.MouseX.value = tempX
  document.Show.MouseY.value = tempY

  if (piirt == 5) {
    freedraw()
  }
  return true
}

function piirtovuoroon() {
  document.getElementById("tools").innerHTML = tools;
  document.onmousemove = getMouseXY;
  document.getElementById("drawframe").onmousedown = klik;
  document.getElementById("drawframe").onmouseup = deklik;
}

function piirtovuorosta() {
  document.onmousemove = "";
  document.getElementById("drawframe").onmousedown = "";
  document.getElementById("drawframe").onmouseup = "";
  document.getElementById("tools").innerHTML = "";
}

function toggle_timestamp() {
  if (timestamps) {
    timestamps = false;
  }
  else {
    timestamps = true;
  }
}

function addz(x) {
  if (x < 10) {
    return "0"+x;
  }
  return x;
}

function timestamp() {
  var d = new Date();
  var timestring = addz(d.getHours())+":"+addz(d.getMinutes())+":"+addz(d.getSeconds());
  return "["+timestring+"] ";
}

function piirtoaika_tick(sekunnit) {
  console.log(sekunnit);
  sekunnit = sekunnit-1;
  var mins = Math.floor(sekunnit/60);
  var seks = addz(sekunnit%60);
  $('#piirtoaika').html(mins+":"+seks);
  piirtoaikalaskuri = setTimeout(function() {piirtoaika_tick(sekunnit);}, 1000);
}

// Nickinvaihto
$('#nick').change(function(){
  socket.emit('command', "nick "+$('#nick').val());
});
// Tekstikenttä
$('form').submit(function(){
  var msg_val = $('#msg').val()
  if (msg_val[0] == '/') {
    if (msg_val.slice(1) == "timestamp") {
      toggle_timestamp();
    }
    else {
      socket.emit('command', msg_val.slice(1));
    }
  }
  else {
    socket.emit('chat message', msg_val );
  }
  $('#msg').val('');
  return false;
});