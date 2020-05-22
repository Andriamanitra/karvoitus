class ColorPalette extends HTMLElement {
  constructor() {
    super();
    const self = this;
    const shadow = self.attachShadow({mode: "open"});
    const linkElem = document.createElement('link');
    linkElem.setAttribute('rel', 'stylesheet');
    linkElem.setAttribute('href', 'colorpalette.css');
    shadow.appendChild(linkElem);

    let currentColorEl = document.createElement("div");
    currentColorEl.id = "currentColor";
    currentColorEl.classList.add("current-color");
    currentColorEl.classList.add("clickable");
    currentColorEl.style.background = self.getAttribute("value");
    currentColorEl.onclick = function(e) {
      let colorInput = document.createElement("input");
      colorInput.setAttribute("type", "color");
      colorInput.onchange = function(e) {
        currentColorEl.style.background = colorInput.value;
        self.setAttribute("value", colorInput.value);
      }
      colorInput.click();
    };
    
    let colorWrapper = document.createElement("div");
    colorWrapper.id = "colorWrapper";
    colorWrapper.classList.add("color-wrapper");
    
    shadow.appendChild(currentColorEl)
    shadow.appendChild(colorWrapper);
  }
  _addcolor(c) {
    let self = this;
    let el = document.createElement("div");
    Object.defineProperty(el, "value", {
      get() { return el.getAttribute("value"); },
      set(val) {
        el.style.background = val;
        el.setAttribute("value", val);
      }
    });
    el.classList.add("color");
    el.classList.add("clickable");
    el.value = c;
    el.onclick = function(e) {
      self.setAttribute("value", el.value);
    };
    el.ondblclick = function(e) {
      let colorInput = document.createElement("input");
      colorInput.setAttribute("type", "color");
      colorInput.onchange = function(e) {
        el.value = colorInput.value;
        self.setAttribute("value", colorInput.value);
      }
      colorInput.click();
    };
    self.shadowRoot.getElementById("colorWrapper").appendChild(el);
  }
  _palette(val) {
    let palettes = {
      "default": "#000,#888,#fff,#f00,#0f0,#00f,#ff0,#0ff,#f0f",
      "drawing": "#000000,#353535,#696969,#9E9E9E,#C0C0C0,#FFFFFF,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#880000,#777700,#006600,#007777,#000088,#880088,#FF80AA,#9EFABE,#24E08F,#10C9E5,#C6C6FF,#E79FF7,#663300,#8A4D22,#F2741B,#F0D890,#FFBE9F,#FFD9B3"
    }
    if (!val) {
      return palettes["default"].split(",")
    }
    if (palettes.hasOwnProperty(val)) {
      return palettes[val].split(",")
    }
    return val.split(",")
  }
  static get observedAttributes() {
    return ["colors", "value"];
  }
  get value() {
    return this.getAttribute("value");
  }
  set value(val) {
    this.setAttribute("value", val);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") {
      this.shadowRoot.getElementById("currentColor").style.background = newValue;
    } else if (name === "colors") {
      this.shadowRoot.getElementById("colorWrapper").innerHTML = "";
      this._palette(newValue).forEach(c => this._addcolor(c));
    }
  }
}

customElements.define("color-palette", ColorPalette);
