function fill (xx, yy, cc, aa) {
  var pixeldata0 = context.getImageData(xx, yy, 1, 1).data;
  context.fillStyle = cc;
  context.globalAlpha = aa;
  context.rect(xx, yy, 1, 1);
  context.fill();
  var pixeldata1 = context.getImageData(xx, yy, 1, 1);
  fillN(xx, yy-1, pixeldata0, pixeldata1);
  fillW(xx+1, yy, pixeldata0, pixeldata1);
  fillS(xx, yy+1, pixeldata0, pixeldata1);
  fillE(xx-1, yy, pixeldata0, pixeldata1);
}

function fillN (xx, yy, pixeldata0, pixeldata1) {
  if (yy < 0 || yy > 450 || xx < 0 || xx > 800) {
    return;
  }
  var imgdata = context.getImageData(xx, yy, 1, 1).data;
  if (imgdata[0] == pixeldata0[0] &&
      imgdata[1] == pixeldata0[1] &&
      imgdata[2] == pixeldata0[2] &&
      imgdata[3] == pixeldata0[3]) {
    context.putImageData(pixeldata1, xx, yy);
    fillN(xx, yy-1, pixeldata0, pixeldata1);
    fillW(xx+1, yy, pixeldata0, pixeldata1);
    fillE(xx-1, yy, pixeldata0, pixeldata1);
  }
}
function fillW (xx, yy, pixeldata0, pixeldata1) {
  if (yy < 0 || yy > 450 || xx < 0 || xx > 800) {
    return;
  }
  var imgdata = context.getImageData(xx, yy, 1, 1).data;
  if (imgdata[0] == pixeldata0[0] &&
      imgdata[1] == pixeldata0[1] &&
      imgdata[2] == pixeldata0[2] &&
      imgdata[3] == pixeldata0[3]) {
    context.putImageData(pixeldata1, xx, yy);
    fillN(xx, yy-1, pixeldata0, pixeldata1);
    fillW(xx+1, yy, pixeldata0, pixeldata1);
    fillS(xx, yy+1, pixeldata0, pixeldata1);
  }
}
function fillS (xx, yy, pixeldata0, pixeldata1) {
  if (yy < 0 || yy > 450 || xx < 0 || xx > 800) {
    return;
  }
  var imgdata = context.getImageData(xx, yy, 1, 1).data;
  if (imgdata[0] == pixeldata0[0] &&
      imgdata[1] == pixeldata0[1] &&
      imgdata[2] == pixeldata0[2] &&
      imgdata[3] == pixeldata0[3]) {
    context.putImageData(pixeldata1, xx, yy);
    fillW(xx+1, yy, pixeldata0, pixeldata1);
    fillS(xx, yy+1, pixeldata0, pixeldata1);
    fillE(xx-1, yy, pixeldata0, pixeldata1);
  }
}
function fillE (xx, yy, pixeldata0, pixeldata1) {
  if (yy < 0 || yy > 450 || xx < 0 || xx > 800) {
    return;
  }
  var imgdata = context.getImageData(xx, yy, 1, 1).data;
  if (imgdata[0] == pixeldata0[0] &&
      imgdata[1] == pixeldata0[1] &&
      imgdata[2] == pixeldata0[2] &&
      imgdata[3] == pixeldata0[3]) {
    context.putImageData(pixeldata1, xx, yy);
    fillN(xx, yy-1, pixeldata0, pixeldata1);
    fillS(xx, yy+1, pixeldata0, pixeldata1);
    fillE(xx-1, yy, pixeldata0, pixeldata1);
  }
}