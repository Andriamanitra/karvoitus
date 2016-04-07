function pdm(pd0, pd1) {
  return (pd0[0] == pd1[0] && pd0[1] == pd1[1] && pd0[2] == pd1[2] && pd0[3] == pd1[3])
}

function gpd(xx, yy, data) {
  var index = (yy*drawzone.width + xx)*4;
  return data.slice(index, index+4);
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

function fill (xx, yy, cc, aa) {
  var imagedata = context.getImageData(0, 0, drawzone.width, drawzone.height);
  var data = imagedata.data;
  var fillcolor = gpd(xx, yy, data);
  var rr, gg, bb;
  rgbcc = hexToRgb(cc);
  // blendataan fill taustaväriin
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
      if (x > 0) {
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
      if (x < drawzone.width-1) {
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