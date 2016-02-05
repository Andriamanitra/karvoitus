var drawzone = document.getElementById('drawzone'),
    frameLeft = drawframe.offsetLeft,
    frameTop = drawframe.offsetTop,
    context = drawzone.getContext('2d'),
    apuviivacolor = "#C0C0C0",
    x = 0,
    y = 0,
    piirt = 0,
    padd = 50,
    muodot = [];
    

drawframe.addEventListener('contextmenu', function(rightclick) {
    rightclick.preventDefault();
    return false;
}, false);

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

function aloita_piirto() {
  if (Show.tool.value == "line") {
    piirt = 1;
  }
  else if (Show.tool.value == "circle") {
    piirt = 2;
  }
  else if (Show.tool.value == "oval") {
    piirt = 3;
  }
  else if (Show.tool.value == "rect") {
    piirt = 4;
  }
  else if (Show.tool.value == "freedraw") {
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

  if (freedraw_koords.length >= 1000) {
    tallenna_free();
  }
  else {
    freedraw_timeout = setTimeout(freedraw, 5);
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
    clearTimeout(freedraw_timeout);
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
  muodot.push(["line", x, y, Show.MouseX.value, Show.MouseY.value, Show.Color.value, Show.Width.value]);
  piirt = 0;
};

function tallenna_circle() {
  var r;
  if (Show.Mid.checked) {
    r = Math.sqrt(Math.pow(Show.MouseX.value-x, 2)+Math.pow(Show.MouseY.value-y, 2));
    muodot.push(["circle", x, y, r, Show.Color.value, Show.Width.value, Show.Fill.checked]);
  }
  else {
    r = Math.sqrt( Math.pow((Show.MouseX.value-x)/2, 2) + Math.pow((Show.MouseY.value-y)/2, 2));
    x = (parseFloat(Show.MouseX.value)+parseFloat(x))/2;
    y = (parseFloat(Show.MouseY.value)+parseFloat(y))/2;
    muodot.push(["circle", x, y, r, Show.Color.value, Show.Width.value, Show.Fill.checked]);
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
    muodot.push(["oval", x, y, 1.39*lev, 1.39*kork, Show.Color.value, Show.Width.value, Show.Fill.checked]);
  }
  else {
    x1 = Show.MouseX.value;
    y1 = Show.MouseY.value;
    lev = 1.33*Math.abs(x1-x);
    kork = Math.abs(y1-y);
    x_kesk = Math.abs(-x1-x)/2;
    y_kesk = Math.abs(-y1-y)/2;
    muodot.push(["oval", x_kesk, y_kesk, lev, kork, Show.Color.value, Show.Width.value, Show.Fill.checked]);
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
    muodot.push(["rect", x-Math.abs(x1-x), y-Math.abs(y1-y), lev, kork, Show.Color.value, Show.Width.value, Show.Fill.checked]);
  }
  else {
    muodot.push(["rect", Math.min(x, x1), Math.min(y, y1), lev, kork, Show.Color.value, Show.Width.value, Show.Fill.checked]);
  }
  piirt = 0;
}

function tallenna_free() {
  freedraw_koords.push(Show.MouseX.value);
  freedraw_koords.push(Show.MouseY.value);
  muodot.push(["free", freedraw_koords, Show.Color.value, Show.Width.value]);
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

function piirra_line(x_alku, y_alku, x_loppu, y_loppu, vari, paks) {
  vari = typeof vari !== 'undefined' ? vari : "#000000";
  x_alku -= padd;
  y_alku -= padd;
  x_loppu -= padd;
  y_loppu -= padd;
  context.beginPath();
  context.moveTo(x_alku, y_alku);
  context.lineTo(x_loppu, y_loppu);
  context.strokeStyle = vari;
  context.lineWidth=paks;
  context.stroke();
  context.closePath();
}

function piirra_circle(x_keskip, y_keskip, r, vari, paks, fill) {
  vari = typeof vari !== 'undefined' ? vari : "#000000";
  x_keskip -= padd;
  y_keskip -= padd;
  context.beginPath();
  context.arc(x_keskip, y_keskip, r, 0, 2*Math.PI);
  if (fill) {
    context.fillStyle = vari;
    context.fill();
  }
  else {
    context.strokeStyle = vari;
    context.lineWidth=paks;
    context.stroke();
  }
  context.closePath();
}

function piirra_oval(x_keskip, y_keskip, lev, kork, vari, paks, fill) {
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
    context.fillStyle = vari;
    context.fill();
  }
  else {
    context.strokeStyle = vari;
    context.lineWidth=paks;
    context.stroke();
  }
  context.closePath();
}

function piirra_rect(x0, y0, lev, kork, vari, paks, fill) {
  context.beginPath();
  context.rect(x0-padd, y0-padd, lev, kork);
  if (fill) {
    context.fillStyle = vari;
    context.fill();
  }
  else {
    context.strokeStyle = vari;
    context.lineWidth=paks;
    context.stroke();
  }
  context.closePath();
}

function piirra_free(koordlist, vari, paks) {
  context.strokeStyle = vari;
  context.lineWidth = paks;
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
      piirra_line(x-(tempX-x), y-(tempY-y), tempX, tempY, Show.Color.value, Show.Width.value);
    }
    else {
      piirra_line(x, y, tempX, tempY, Show.Color.value, Show.Width.value);
    }
  }
  else if (piirt == 2) {
    refrsh();
    if (Show.Mid.checked) {
      var r = Math.sqrt(Math.pow(Show.MouseX.value-x, 2)+Math.pow(Show.MouseY.value-y, 2));
      piirra_circle(x, y, r, Show.Color.value, Show.Width.value, Show.Fill.checked);
    }
    else {
      var r = Math.sqrt( Math.pow((Show.MouseX.value-x)/2, 2) + Math.pow((Show.MouseY.value-y)/2, 2)),
      x_keskip = (parseFloat(Show.MouseX.value)+parseFloat(x))/2,
      y_keskip = (parseFloat(Show.MouseY.value)+parseFloat(y))/2;
      piirra_circle(x_keskip, y_keskip, r, Show.Color.value, Show.Width.value, Show.Fill.checked);
    }
    context.setLineDash([5]);
    piirra_line(x, y, tempX, tempY, apuviivacolor, 1);
    context.setLineDash([]);
  }
  else if (piirt == 3) {
    refrsh();
    if (Show.Mid.checked) {
      var lev = 1.33*Math.abs(2*(tempX-x)),
      kork = Math.abs(2*(tempY-y));
      piirra_oval(x, y, 1.39*lev, 1.39*kork, Show.Color.value, Show.Width.value, Show.Fill.checked);
      context.setLineDash([5]);
      piirra_line(x, y, tempX, tempY, apuviivacolor, 1);
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
      piirra_oval(x_kesk, y_kesk, lev, kork, Show.Color.value, Show.Width.value, Show.Fill.checked);
    }
  }
  else if (piirt == 4) {
    refrsh();
    if (Show.Mid.checked) {
      piirra_rect(x-Math.abs(tempX-x), y-Math.abs(tempY-y), 2*Math.abs(x-tempX), 2*Math.abs(y-tempY), Show.Color.value, Show.Width.value, Show.Fill.checked);
    }
    else {
      piirra_rect(Math.min(x, tempX), Math.min(y, tempY), Math.abs(x-tempX), Math.abs(y-tempY), Show.Color.value, Show.Width.value, Show.Fill.checked);
    }
  }
  else if (piirt == 5) {
    refrsh();
    piirra_free(freedraw_koords, Show.Color.value, Show.Width.value);
  }
}

context.lineCap = "round";
context.lineJoin = "round";


document.getElementById("drawzone").addEventListener("mousemove", getMouseXY);


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
  return true
}
