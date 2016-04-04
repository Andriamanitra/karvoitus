function pixeldatamatch(pd0, pd1) {
  return (pd0.data[0] == pd1.data[0] && pd0.data[1] == pd1.data[1] && pd0.data[2] == pd1.data[2])
}

function gpd(xx, yy) {
  return context.getImageData(xx, yy, 1, 1);
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

function fill (xx, yy, cc, aa) {
  var pixeldata0 = gpd(xx, yy);

  var pixeldata1 = gpd(xx, yy);
  rgbcc = hexToRgb(cc);
  // blendataan fill taustaväriin
  pixeldata1.data[0] = rgbcc.r*aa + pixeldata0.data[0]*(1.0-aa);
  pixeldata1.data[1] = rgbcc.g*aa + pixeldata0.data[1]*(1.0-aa);
  pixeldata1.data[2] = rgbcc.b*aa + pixeldata0.data[2]*(1.0-aa);

  var pixelstack = [[xx, yy]];
  var pos, reachLeft, reachRight;

  while(pixelstack.length) {
    pos = pixelstack.pop()
    xx = pos[0];
    yy = pos[1];
    reachLeft = false;
    reachRight = false;
    // edetään ylöspäin kunnes törmätään eri väriseen pikseliin
    while (pixeldatamatch(pixeldata0, gpd(xx, yy))) {
      if (yy < 0) {break}
      yy = yy-1;
    }
    yy++;
    
    // edetään alaspäin maalaten matkalta pikselit ja katsoen joka kohdassa sivuille
    while (y < drawzone.height-1 && pixeldatamatch(pixeldata0, gpd(xx, yy))) {
      context.putImageData(pixeldata1, xx, yy);

      // katsotaan vasemmalle
      if (x > 0) {
        if (pixeldatamatch(pixeldata0, gpd(xx-1, yy))) {
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
        if (pixeldatamatch(pixeldata0, gpd(xx+1, yy))) {
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
}
