drawzone = document.getElementById('drawzone'),
tempdrawzone = document.getElementById('tempdrawzone'),
drawframe = document.getElementById('drawframe'),
frameLeft = drawframe.offsetLeft,
frameTop = drawframe.offsetTop,
context = drawzone.getContext('2d'),
paletti = document.getElementById("paletti"),
apuviivacolor = "#C0C0C0",
x = 0,
y = 0,
MouseX = 0,
MouseY = 0,
duunikalu = 5,
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
FILL = 6,
FULL = 7,
moved = false,
buttclicked = null,
scale = 1.0;

valitse_duunikalu(5);
document.getElementById("drawframe").addEventListener("mousemove", getMouseXY);

// dirty fix for updating preview
document.onclick = function() {valitse_duunikalu(duunikalu)};

// no stupid ( / ) icons on certain unusual cases
drawzone.ondragstart = function() { return false; };
drawzone.onselectstart = function() { return false; };

drawframe.addEventListener('contextmenu', function(rightclick) {
    rightclick.preventDefault();
    return false;
}, false);

var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
if (!is_chrome) {appendmsg("** Chromium-based web browser such as Google Chrome is recommended for playing this game");}

// socket.io alustus:
socket = io();

// ################## socket-eventit: #######################

// serverin ilmoitukset ja tavalliset chat-viestit
socket.on('message', function(msg){
  appendmsg(msg);
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
    row.insertCell(0).innerHTML = (userlista[i][0] == "0" ? "Drawing" : userlista[i][0]);
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
}

function highlight_button(bid) {
  var butt = document.getElementById(bid);
  if (buttclicked != null) {
    buttclicked.className = "tool_button";
  }
  buttclicked = butt;
  butt.className = "tool_button_clicked";
}

function valitse_duunikalu(d) {
  duunikalu = d;
  // muutetaan scale ja context väliaikaisesti jotta preview on bueno
  var temp_scale = scale;
  scale = 1
  context = document.getElementById('toolpreview').getContext('2d');
  context.clearRect(0,0,60,60);
  context.lineCap = "round";
  context.lineJoin = "round";

  switch(duunikalu) {
    case FREE:
      highlight_button("butt5");
      piirra_free([66,70,66,68,67,67,69,66,70,65,71,64,73,63,75,63,76,64,76,66,77,67,77,69,76,70,76,72,76,74,
                   75,75,75,77,75,79,75,81,75,83,76,84,77,85,78,86,81,86,90,90,95,95], hae_c_a_w());
      break;
    case LINE:
      highlight_button("butt1");
      piirra_line(65, 65, 95, 95, hae_c_a_w());
      break;
    case CIRCLE:
      highlight_button("butt2");
      piirra_circle(80, 80, 20, hae_c_a_w(), Tools.Fill.checked);
      context.setLineDash([3]);
      if(Tools.Mid.checked) {
        piirra_line(80, 80, 93, 95, [apuviivacolor, 1, 1], 1);
      }
      else {
        piirra_line(67, 65, 93, 95, [apuviivacolor, 1, 1], 1);
      }
      context.setLineDash([]);
      break;
    case OVAL:
      highlight_button("butt3");
      piirra_oval(80, 80, 60, 25, hae_c_a_w(), Tools.Fill.checked);
      context.setLineDash([3]);
      if(Tools.Mid.checked) {
        piirra_line(80, 80, 93, 90, [apuviivacolor, 1, 1], 1);
      }
      else {
        piirra_rect(57, 67, 46, 26, [apuviivacolor, 1, 1], 0);
      }
      context.setLineDash([]);
      break;
    case RECT:
      highlight_button("butt4");
      piirra_rect(60, 65, 40, 30, hae_c_a_w(), Tools.Fill.checked);
      context.setLineDash([3]);
      if(Tools.Mid.checked) {
        piirra_line(80, 80, 100, 95, [apuviivacolor, 1, 1], 1);
      }
      else {
        piirra_line(60, 65, 100, 95, [apuviivacolor, 1, 1], 1);
      }
      context.setLineDash([]);
      break;
    case FILL:
      highlight_button("butt6");
      piirra_rect(50, 50, 60, 60, hae_c_a_w(), true);
      break;
  }

  scale = temp_scale;
  context = drawzone.getContext('2d');
}

function vaihda_vari(uusi_vari) {
  paletti.setAttribute("value", uusi_vari);
  valitse_duunikalu(duunikalu);
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
    cleartemp();
  }
  // middle click; värivalitsin
  else if (event.button == 1) {
    event.preventDefault();
    var pixel = context.getImageData(scale*(getX()-padd), scale*(getY()-padd), 1, 1).data;
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
    x = getX();
    y = getY();
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
    muodot.push([CIRCLE, x, y, Tools.Width.value/2, hae_c_a_w(), true]);
    socket.emit('muodot', muodot);
    cleartemp();
  }
}

// [color, alpha, width]
function hae_c_a_w() {
  return [paletti.value, Tools.Alpha.value, Tools.Width.value];
}

function aloita_piirto() {
  if (duunikalu == FREE) {
    // piirretään väliaikainen ympyrä alkupisteeseen; ilman tätä ympyrä piirrettäisiin
    // vasta deklikissä
    context = tempdrawzone.getContext('2d');
  	var temp_scale = scale;
  	scale = 1;
    piirra_circle(getX(), getY(), Tools.Width.value/2, hae_c_a_w(), true);
    context = drawzone.getContext('2d');
    scale = temp_scale;

    freedraw_koords = [];
    freedraw();
    piirt = FREE;
  }
  else if (duunikalu == FILL) {
  	//fuck this stupid fill
    //if (count_m(FULL) == muodot.length) {
      muodot.push([FULL, paletti.value, Tools.Alpha.value]);
      socket.emit('muodot', muodot);
      return;
    //}
    //if (count_m(FILL) > 10) {
    //  alert("too much fill, fuck you!");
    //  return;
    //}
    //muodot.push([FILL, x-padd, y-padd, paletti.value, Tools.Alpha.value]);
    //socket.emit('muodot', muodot);
  }
  else {
    piirt = duunikalu;
  }
}

function freedraw() {
  if(freedraw.length == 0 || freedraw_koords.slice(-2) != [getX(), getY()]){
    freedraw_koords.push(getX());
    freedraw_koords.push(getY());
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
  cleartemp();
}

function tallenna_line() {
  if (Tools.Mid.checked) {
    x = x-(getX()-x);
    y = y-(getY()-y);
  }
  muodot.push([LINE, x, y, getX(), getY(), hae_c_a_w()]);
  piirt = 0;
};

function tallenna_circle() {
  var r;
  if (Tools.Mid.checked) {
    r = Math.sqrt(Math.pow(getX()-x, 2)+Math.pow(getY()-y, 2));
    muodot.push([CIRCLE, x, y, r, hae_c_a_w(), Tools.Fill.checked]);
  }
  else {
    r = Math.sqrt( Math.pow((getX()-x)/2, 2) + Math.pow((getY()-y)/2, 2));
    x = (parseFloat(getX())+parseFloat(x))/2;
    y = (parseFloat(getY())+parseFloat(y))/2;
    muodot.push([CIRCLE, x, y, r, hae_c_a_w(), Tools.Fill.checked]);
  }
  piirt = 0;
}

function tallenna_oval() {
  var x1, y1, lev, kork, x_kesk, y_kesk;
  if (Tools.Mid.checked) {
    x1 = getX();
    y1 = getY();
    lev = 1.33*Math.abs(2*(x1-x));
    kork = Math.abs(2*(y1-y));
    muodot.push([OVAL, x, y, 1.39*lev, 1.39*kork, hae_c_a_w(), Tools.Fill.checked]);
  }
  else {
    x1 = getX();
    y1 = getY();
    lev = 1.33*Math.abs(x1-x);
    kork = Math.abs(y1-y);
    x_kesk = Math.abs(-x1-x)/2;
    y_kesk = Math.abs(-y1-y)/2;
    muodot.push([OVAL, x_kesk, y_kesk, lev, kork, hae_c_a_w(), Tools.Fill.checked]);
  }
  piirt = 0;
}

function tallenna_rect() {
  var x1, y1, lev, kork;
  x1 = getX();
  y1 = getY();
  lev = Math.abs(x-x1);
  kork = Math.abs(y-y1);
  if (Tools.Mid.checked) {
    lev = 2*lev;
    kork = 2*kork;
    muodot.push([RECT, x-Math.abs(x1-x), y-Math.abs(y1-y), lev, kork, hae_c_a_w(), Tools.Fill.checked]);
  }
  else {
    muodot.push([RECT, Math.min(x, x1), Math.min(y, y1), lev, kork, hae_c_a_w(), Tools.Fill.checked]);
  }
  piirt = 0;
}

function tallenna_free() {
  muodot.push([FREE, freedraw_koords, hae_c_a_w()]);
  cleartemp();
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
    else if (muodot[i][0] == FILL) {
      //fuck this stupid shit fill
      //drawfill.apply(this, muodot[i].slice(1));
    }
    else if (muodot[i][0] == FULL) {
      piirra_rect(0, 0, 850, 500, [muodot[i][1], muodot[i][2], 1], true);
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

  context.globalAlpha = caw[1];
  context.lineWidth = scale*caw[2];
  if (fill) {
    context.fillStyle = caw[0];
    context.fill();
  }
  else {
    context.strokeStyle = caw[0];
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

  context.globalAlpha = caw[1];
  context.lineWidth = scale*caw[2];
  if (fill) {
    context.fillStyle = caw[0];
    context.fill();
  }
  else {
    context.strokeStyle = caw[0];
    context.stroke();
  }
  context.closePath();
}

function piirra_rect(x0, y0, lev, kork, caw, fill) {
  context.beginPath();
  context.rect(scale*(x0-padd), scale*(y0-padd), scale*lev, scale*kork);
  context.globalAlpha = caw[1];
  context.lineWidth = scale*caw[2];
  if (fill) {
    context.fillStyle = caw[0];
    context.fill();
  }
  else {
    context.strokeStyle = caw[0];
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

function cleartemp() {
  tempdrawzone.getContext('2d').clearRect(0, 0, tempdrawzone.width, tempdrawzone.height);
}

function tempPiirto(tempX, tempY) {
  context = tempdrawzone.getContext('2d');
  var temp_scale = scale;
  scale = 1;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (piirt == LINE) {
    cleartemp();
    if (Tools.Mid.checked) {
      piirra_line(x-(tempX-x), y-(tempY-y), tempX, tempY, hae_c_a_w());
    }
    else {
      piirra_line(x, y, tempX, tempY, hae_c_a_w());
    }
  }
  else if (piirt == CIRCLE) {
    cleartemp();
    if (Tools.Mid.checked) {
      var r = Math.sqrt(Math.pow(getX()-x, 2)+Math.pow(getY()-y, 2));
      piirra_circle(x, y, r, hae_c_a_w(), Tools.Fill.checked);
    }
    else {
      var r = Math.sqrt( Math.pow((getX()-x)/2, 2) + Math.pow((getY()-y)/2, 2)),
      x_keskip = (parseFloat(getX())+parseFloat(x))/2,
      y_keskip = (parseFloat(getY())+parseFloat(y))/2;
      piirra_circle(x_keskip, y_keskip, r, hae_c_a_w(), Tools.Fill.checked);
    }
    context.setLineDash([5]);
    piirra_line(x, y, tempX, tempY, [apuviivacolor, 1, 1], 1);
    context.setLineDash([]);
  }
  else if (piirt == OVAL) {
    cleartemp();
    if (Tools.Mid.checked) {
      var lev = 1.33*Math.abs(2*(tempX-x)),
      kork = Math.abs(2*(tempY-y));
      piirra_oval(x, y, 1.39*lev, 1.39*kork, hae_c_a_w(), Tools.Fill.checked);
      context.setLineDash([5]);
      piirra_line(x, y, tempX, tempY, [apuviivacolor, 1, 1], 1);
      context.setLineDash([]);
    }
    else {
      context.setLineDash([5]);
      piirra_rect(Math.min(x, tempX), Math.min(y, tempY), Math.abs(x-tempX), Math.abs(y-tempY), [apuviivacolor, 1, 1], false);
      context.setLineDash([]);

      var lev = 1.33*Math.abs(tempX-x),
      kork = Math.abs(tempY-y),
      x_kesk = Math.abs(-tempX-x)/2,
      y_kesk = Math.abs(-tempY-y)/2;
      piirra_oval(x_kesk, y_kesk, lev, kork, hae_c_a_w(), Tools.Fill.checked);
    }
  }
  else if (piirt == RECT) {
    cleartemp();
    if (Tools.Mid.checked) {
      piirra_rect(x-Math.abs(tempX-x), y-Math.abs(tempY-y), 2*Math.abs(x-tempX), 2*Math.abs(y-tempY), hae_c_a_w(), Tools.Fill.checked);
    }
    else {
      piirra_rect(Math.min(x, tempX), Math.min(y, tempY), Math.abs(x-tempX), Math.abs(y-tempY), hae_c_a_w(), Tools.Fill.checked);
    }
  }
  else if (piirt == FREE) {
    cleartemp();
    piirra_free(freedraw_koords, hae_c_a_w());
  }
  scale = temp_scale;
  context = drawzone.getContext('2d');
}


// modifioitua lainacoodia
// Main function to retrieve mouse x-y pos.s
function getMouseXY(e) {
  var tempX = 0;
  var tempY = 0;
  tempX = e.pageX
  tempY = e.pageY
  tempX = tempX-frameLeft;
  tempY = tempY-frameTop;

  // catch possible negative values in NS4
  if (tempX < 0){tempX = 0}
  if (tempY < 0){tempY = 0}
  if (MouseX != tempX || MouseY != tempY) {
    moved = true;
    if (piirt == 5) {
      freedraw();
    }
  }
  MouseX = (tempX-padd)/scale+padd;
  MouseY = (tempY-padd)/scale+padd;
  // näytä koordinaatit
  document.getElementById("koords").innerHTML = getX()+","+getY();

  // jos piirto on aloitettu
  if (piirt != 0) {
    tempPiirto(MouseX, MouseY);
  }

  return true
}

function getX() {
  return Math.round(MouseX);
}

function getY() {
  return Math.round(MouseY);
}

function piirtovuoroon() {
  document.getElementById("drawframe").onmousedown = klik;
  // show tools
  toggletools(false);
}

function piirtovuorosta() {
  piirt = 0;
  document.getElementById("drawframe").onmousedown = notyourturn;
  // hide tools
  toggletools(true);
}

function toggletools(hidetools) {
  // toggle if no parameter given
  if (typeof hidetools == "undefined") {
    hidetools = (document.getElementById("tools1").style.display == "");
  }

  if (hidetools) {
    document.getElementById("tools1").style.display="none";
    document.getElementById("tools2").style.display="none";
  }
  else {
    document.getElementById("tools1").style.display="";
    document.getElementById("tools2").style.display="";
  }
}

function notyourturn() {
  appendmsg("** It's not your turn to draw!")
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
  sekunnit = sekunnit-1;
  var mins = Math.floor(sekunnit/60);
  var seks = addz(sekunnit%60);
  $('#piirtoaika').html(mins+":"+seks);
  piirtoaikalaskuri = setTimeout(function() {piirtoaika_tick(sekunnit);}, 1000);
}

function appendmsg(msg) {
  if (timestamps) {
    msg = timestamp()+msg;
  }
  $('#messages').append($('<li>').text(msg));
  $('#messages').scrollTop($('#messages')[0].scrollHeight);
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
        if (new_scale < 0.2) {scale = 0.2}
        else if (new_scale > 10) {scale = 10}
        else {scale = new_scale}
      }
      drawzone.height = 450*scale;
      drawzone.width = 800*scale;
      document.getElementById('drawframe').setAttribute("style","height:"+(450*scale)+"px;width:"+(800*scale)+"px");
      document.getElementById('tempdrawzone').setAttribute("style","height:"+(450*scale)+"px;width:"+(800*scale)+"px");
      document.getElementById('tools').setAttribute("style","top:"+(450*scale+2*padd+5)+"px;width:"+(800*scale+2*padd)+"px");
      document.getElementById('left').setAttribute("style","width:"+(800*scale+2*padd)+"px");
      document.getElementById('right').setAttribute("style","left:"+(800*scale+2*padd)+"px");
      context.lineCap = "round";
      context.lineJoin = "round";
      refrsh();
    }
    else if (msg_val.slice(1,6) == "color") {
      if (msg_val.length < 8) {
        appendmsg("-- Current color is "+paletti.value);
      }
      else {
        vaihda_vari(msg_val.slice(7));
        appendmsg("-- Changed color to "+paletti.value);
      }
    }
    else if (msg_val.slice(1,11) == "toggletool") {
      toggletools();
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



// goodfill!

function pdm(pd0, pd1) {
  return (pd0[0] == pd1[0] && pd0[1] == pd1[1] && pd0[2] == pd1[2] && pd0[3] == pd1[3]);
}

function gpd(xx, yy, data) {
  var index = (yy*drawzone.width + xx)*4;
  if (data[index+3] == 0) {return [255, 255, 255, 0];}
  return [data[index], data[++index], data[++index], data[++index]];
}

// lainafunktio
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function count_m(muoto) {
  var counter = 0;
  for (var i = 0; i < muodot.length; i++) {
    if (muodot[i][0] == muoto) {
      ++counter;
    }
  }
  return counter;
}

function drawfill (xx, yy, cc, aa) {
  xx = scale*xx;
  yy = scale*yy;
  var imagedata = context.getImageData(0, 0, drawzone.width, drawzone.height);
  var data = imagedata.data;
  var fillcolor = gpd(xx, yy, data);
  var rr, gg, bb;
  rgbcc = hexToRgb(cc);
  // blendataan fill taustaväriin
  fillcolor[0] = fillcolor[0]*fillcolor[3]/255 + 255*(1.0-fillcolor[3]/255);
  fillcolor[1] = fillcolor[1]*fillcolor[3]/255 + 255*(1.0-fillcolor[3]/255);
  fillcolor[2] = fillcolor[2]*fillcolor[3]/255 + 255*(1.0-fillcolor[3]/255);

  rr = rgbcc.r*aa + fillcolor[0]*(1.0-aa);
  gg = rgbcc.g*aa + fillcolor[1]*(1.0-aa);
  bb = rgbcc.b*aa + fillcolor[2]*(1.0-aa);

  var pixelstack = [[xx, yy]];
  var pos, reachLeft, reachRight, index;

  while(pixelstack.length) {
    pos = pixelstack.pop()
    xx = pos[0];
    yy = pos[1];
    reachLeft = false;
    reachRight = false;
    // edetään ylöspäin kunnes törmätään eri väriseen pikseliin
    while (pdm(fillcolor, gpd(xx, yy, data))) {
      if (yy < 0) {break}
      yy = yy-1;
    }
    yy++;

    // edetään alaspäin maalaten matkalta pikselit ja katsoen joka kohdassa sivuille
    while (y < drawzone.height-1 && pdm(fillcolor, gpd(xx, yy, data))) {
      index = (yy*drawzone.width + xx)*4;
      data[index] = rr;
      data[++index] = gg;
      data[++index] = bb;
      data[++index] = 255;

      // katsotaan vasemmalle
      if (xx > 0) {
        if (pdm(fillcolor, gpd(xx-1, yy, data))) {
          if (!reachLeft) {
            pixelstack.push([xx-1, yy]);
            reachLeft = true;
          }
        }
        else if(reachLeft) {
          reachLeft = false;
        }
      }

      // katsotaan oikealle
      if (xx < drawzone.width-1) {
        if (pdm(fillcolor, gpd(xx+1, yy, data))) {
          if (!reachRight) {
            pixelstack.push([xx+1, yy]);
            reachRight = true;
          }
        }
        else if (reachRight) {
          reachRight = false;
        }
      }
      yy++;
    }
  }
  context.putImageData(imagedata, 0, 0);
}