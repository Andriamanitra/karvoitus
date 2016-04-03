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
muodot = [],
LINE = 1,
CIRCLE = 2,
OVAL = 3,
RECT = 4,
FREE = 5,
moved = false,
scale = 1.0;

document.getElementById("drawframe").addEventListener("mousemove", getMouseXY);

// no stupid ( / ) icons on certain unusual cases
drawzone.ondragstart = function() { return false; };
drawzone.onselectstart = function() { return false; };

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

// lainafunktio
function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}

function klik(event) {
  // right click; peruuttaa nykyisen piirron
  if (event.button == 2) {
    piirt = 0;
    refrsh();
  }
  // middle click; värivalitsin
  else if (event.button == 1) {
    event.preventDefault();
    var pixel = context.getImageData(Show.MouseX.value-padd, Show.MouseY.value-padd, 1, 1).data;
    var alpha = pixel[3]/255;

    // blendataan jotta värivalitsin ottaa oikean värin myös pikseleissä
    // joissa alpha < 255; 255 255 255 koska taustaväri on valkoinen.
    pixel[0]=pixel[0]*alpha + 255*(1.0-alpha)
    pixel[1]=pixel[1]*alpha + 255*(1.0-alpha)
    pixel[2]=pixel[2]*alpha + 255*(1.0-alpha)
    vaihda_vari("#"+("000000"+rgbToHex(pixel[0], pixel[1], pixel[2])).slice(-6));
  }
  // muu klik; aloitetaan piirto
  else if (piirt == 0) {
    x = Show.MouseX.value;
    y = Show.MouseY.value;
    moved = false;
    aloita_piirto();
  }
  else {
    viimeistele_piirto();
  }
}

function deklik(event) {
  // jos kursori on liikkunut klikkauksen aloittamisen jälkeen
  // niin viimeistellään piirto onmouseup-eventillä
  if ( moved ) {
    if (piirt != 0) {
      viimeistele_piirto();
    }
  }
  // jos ei liikkunut ja käytössä free draw niin tallennetaan
  // piirron alkaessa piirretty ympyrä
  else if ( piirt == FREE) {
    piirt = 0;
    muodot.push([CIRCLE, x, y, Show.Width.value/2, hae_c_a_w(), true]);
    socket.emit('muodot', muodot);
    refrsh();
  }
}

// [color, alpha, width]
function hae_c_a_w() {
  return [Show.Color.value, Show.Alpha.value, Show.Width.value];
}

function aloita_piirto() {
  var duunikalu = $('input[name="tool"]:checked').val();
  if (duunikalu == FREE) {
    // piirretään väliaikainen ympyrä alkupisteeseen; ilman tätä ympyrä piirrettäisiin
    // vasta deklikissä
    piirra_circle(Show.MouseX.value, Show.MouseY.value, Show.Width.value/2, hae_c_a_w(), true);

    freedraw_koords = [];
    freedraw();
    piirt = FREE;
  }
  else {
    piirt = duunikalu;
  }
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
  if (piirt == LINE) {
    tallenna_line();
  }
  else if (piirt == CIRCLE) {
    tallenna_circle();
  }
  else if (piirt == OVAL) {
  	tallenna_oval();
  }
  else if (piirt == RECT) {
    tallenna_rect();
  }
  else if (piirt == FREE) {
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
  muodot.push([LINE, x, y, Show.MouseX.value, Show.MouseY.value, hae_c_a_w()]);
  piirt = 0;
};

function tallenna_circle() {
  var r;
  if (Show.Mid.checked) {
    r = Math.sqrt(Math.pow(Show.MouseX.value-x, 2)+Math.pow(Show.MouseY.value-y, 2));
    muodot.push([CIRCLE, x, y, r, hae_c_a_w(), Show.Fill.checked]);
  }
  else {
    r = Math.sqrt( Math.pow((Show.MouseX.value-x)/2, 2) + Math.pow((Show.MouseY.value-y)/2, 2));
    x = (parseFloat(Show.MouseX.value)+parseFloat(x))/2;
    y = (parseFloat(Show.MouseY.value)+parseFloat(y))/2;
    muodot.push([CIRCLE, x, y, r, hae_c_a_w(), Show.Fill.checked]);
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
    muodot.push([OVAL, x, y, 1.39*lev, 1.39*kork, hae_c_a_w(), Show.Fill.checked]);
  }
  else {
    x1 = Show.MouseX.value;
    y1 = Show.MouseY.value;
    lev = 1.33*Math.abs(x1-x);
    kork = Math.abs(y1-y);
    x_kesk = Math.abs(-x1-x)/2;
    y_kesk = Math.abs(-y1-y)/2;
    muodot.push([OVAL, x_kesk, y_kesk, lev, kork, hae_c_a_w(), Show.Fill.checked]);
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
    muodot.push([RECT, x-Math.abs(x1-x), y-Math.abs(y1-y), lev, kork, hae_c_a_w(), Show.Fill.checked]);
  }
  else {
    muodot.push([RECT, Math.min(x, x1), Math.min(y, y1), lev, kork, hae_c_a_w(), Show.Fill.checked]);
  }
  piirt = 0;
}

function tallenna_free() {
  muodot.push([FREE, freedraw_koords, hae_c_a_w()]);
  refrsh();
  piirt = 0;
}

function piirra_muodot() {
  for (var i = 0; i < muodot.length; i++) {
    if (muodot[i][0] == LINE) {
      piirra_line.apply(this, muodot[i].slice(1));
    }
    else if (muodot[i][0] == CIRCLE) {
      piirra_circle.apply(this, muodot[i].slice(1));
    }
    else if (muodot[i][0] == OVAL) {
      piirra_oval.apply(this, muodot[i].slice(1));
    }
    else if (muodot[i][0] == RECT) {
      piirra_rect.apply(this, muodot[i].slice(1));
    }
    else if (muodot[i][0] == FREE) {
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
  x_alku = scale*x_alku;
  y_alku = scale*y_alku;
  x_loppu = scale*x_loppu;
  y_loppu = scale*y_loppu;
  context.beginPath();
  context.moveTo(x_alku, y_alku);
  context.lineTo(x_loppu, y_loppu);
  context.strokeStyle = caw[0];
  context.globalAlpha = caw[1];
  context.lineWidth = scale*caw[2];
  context.stroke();
  context.closePath();
}

function piirra_circle(x_keskip, y_keskip, r, caw, fill) {
  vari = typeof vari !== 'undefined' ? vari : "#000000";
  x_keskip -= padd;
  y_keskip -= padd;
  x_keskip = scale*x_keskip;
  y_keskip = scale*y_keskip;
  r = scale*r;
  context.beginPath();
  context.arc(x_keskip, y_keskip, r, 0, 2*Math.PI);
  if (fill) {
    context.fillStyle = caw[0];
    context.globalAlpha = caw[1];
    context.lineWidth = scale*caw[2];
    context.fill();
  }
  else {
    context.strokeStyle = caw[0];
    context.globalAlpha = caw[1];
    context.lineWidth = scale*caw[2];
    context.stroke();
  }
  context.closePath();
}

function piirra_oval(x_keskip, y_keskip, lev, kork, caw, fill) {
  x_keskip -= padd;
  y_keskip -= padd;
  x_keskip = scale*parseFloat(x_keskip);
  y_keskip = scale*parseFloat(y_keskip);
  lev = scale*parseFloat(lev);
  kork = scale*parseFloat(kork);

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

  context.fillStyle = caw[0];
  context.globalAlpha = caw[1];
  context.lineWidth = scale*caw[2];
  if (fill) {
    context.fill();
  }
  else {
    context.stroke();
  }
  context.closePath();
}

function piirra_rect(x0, y0, lev, kork, caw, fill) {
  context.beginPath();
  context.rect(scale*(x0-padd), scale*(y0-padd), scale*lev, scale*kork);
  context.fillStyle = caw[0];
  context.globalAlpha = caw[1];
  context.lineWidth = scale*caw[2];
  if (fill) {
    context.fill();
  }
  else {
    context.stroke();
  }
  context.closePath();
}

function piirra_free(koordlist, caw) {
  context.strokeStyle = caw[0];
  context.globalAlpha = caw[1];
  context.lineWidth = scale*caw[2];
  context.beginPath();
  context.moveTo(scale*(koordlist[0]-padd), scale*(koordlist[1]-padd));
  for(i = 2; i < koordlist.length; i=i+2) {
    context.lineTo(scale*(koordlist[i]-padd), scale*(koordlist[i+1]-padd));
  }
  context.stroke();
  context.closePath();
}

function refrsh() {
  context.clearRect(0, 0, drawzone.width, drawzone.height);
  piirra_muodot();
}

function tempPiirto() {
  if (piirt == LINE) {
    refrsh();
    if (Show.Mid.checked) {
      piirra_line(x-(tempX-x), y-(tempY-y), tempX, tempY, hae_c_a_w());
    }
    else {
      piirra_line(x, y, tempX, tempY, hae_c_a_w());
    }
  }
  else if (piirt == CIRCLE) {
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
  else if (piirt == OVAL) {
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
  else if (piirt == RECT) {
    refrsh();
    if (Show.Mid.checked) {
      piirra_rect(x-Math.abs(tempX-x), y-Math.abs(tempY-y), 2*Math.abs(x-tempX), 2*Math.abs(y-tempY), hae_c_a_w(), Show.Fill.checked);
    }
    else {
      piirra_rect(Math.min(x, tempX), Math.min(y, tempY), Math.abs(x-tempX), Math.abs(y-tempY), hae_c_a_w(), Show.Fill.checked);
    }
  }
  else if (piirt == FREE) {
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
  if (document.Show.MouseX.value != tempX || document.Show.MouseY.value != tempY) {
    moved = true;
  }
  document.Show.MouseX.value = (tempX-padd)/scale+padd;
  document.Show.MouseY.value = (tempY-padd)/scale+padd;

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
    else if (msg_val.slice(1, 6) == "scale") {
      var new_scale = parseFloat(msg_val.slice(6));
      if (isNaN(new_scale)) {
        scale = (scale % 1) + 0.5;
      }
      else {
        scale = new_scale;
      }
      drawzone.height = 450*scale;
      drawzone.width = 800*scale;
      document.getElementById('drawframe').setAttribute("style","height:"+(450*scale)+"px;width:"+(800*scale)+"px");
      document.getElementById('tools').setAttribute("style","top:"+(450*scale+2*padd+5)+"px;width:"+(800*scale-padd)+"px");
      document.getElementById('left').setAttribute("style","width:"+(800*scale+2*padd)+"px");
      document.getElementById('right').setAttribute("style","left:"+(800*scale+2*padd)+"px");
      context.lineCap = "round";
      context.lineJoin = "round";
      refrsh();
    }
    else {
      socket.emit('command', msg_val.slice(1));
    }
  }
  else {
    if (msg_val != "") {
      socket.emit('chat message', msg_val );
    }
  }
  $('#msg').val('');
  return false;
});