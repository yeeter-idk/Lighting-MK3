let canvas = document.getElementById("canvas")
let ctx = canvas.getContext("2d")

let alphaMap = new layer("alphaMap")
let colorMap = new layer("colorMap")
let lightMap = new layer("lightMap")

setCanvSize()

let canvasChanged = false

function updateCanvasImage() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(curLayer.canvas, 0, 0)
  
  if(curLayer.id != alphaMap.id){
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(alphaMap.canvas, 0, 0)
    ctx.globalCompositeOperation = "source-over"
  } 
}

let curLayer = alphaMap

let pen = {
  color: "#000000",
  pos: {x: 0, y: 0},
  lastPos: {x: 0, y: 0},
  radius: 10,
  draw: function() {
    let ctx = curLayer.ctx
    
    ctx.fillStyle = this.color
    ctx.strokeStyle = this.color
    ctx.lineWidth = this.radius*2
    
    ctx.beginPath()
    ctx.moveTo(this.lastPos.x, this.lastPos.y)
    ctx.lineTo(this.pos.x, this.pos.y)
    ctx.stroke()  
    
    ctx.beginPath()
    ctx.arc(this.lastPos.x, this.lastPos.y, this.radius, 0, Math.PI*2)
    ctx.fill() 
     
    canvasChanged = true
  }
}

loop()
function loop() {
  if(canvasChanged){
    updateCanvasImage()
    canvasChanged = false
  }
  window.requestAnimationFrame(loop)
}

function fixAlpha() {
  let ctx = alphaMap.ctx;
  let imageData = ctx.getImageData(0, 0, alphaMap.canvas.width, alphaMap.canvas.height);
  let data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let red = data[i];
    let bwValue = Math.round(red / 255) * 255;
    data[i] = data[i + 1] = data[i + 2] = bwValue;
  }

  ctx.putImageData(imageData, 0, 0);
  canvasChanged = true
}

function transferLayerFocus(layerName) {
  const layers = {
    alpha: { map: alphaMap, btn: "btnAlpha" },
    color: { map: colorMap, btn: "btnColor" },
    light: { map: lightMap, btn: "btnLight" }
  };

  for(const key in layers){
    if(layers[key].map === curLayer){
      document.getElementById(layers[key].btn).classList.remove("layerSelected");
      break;
    }
  }

  // Update curLayer and apply the new selection
  if(layers[layerName]){
    curLayer = layers[layerName].map;
    document.getElementById(layers[layerName].btn).classList.add("layerSelected");
  }
  
  canvasChanged = true
}

function download() {
  return new Promise((resolve, reject) => {
    let mapWidth = canvas.width
    let mapHeight = canvas.height
    
    let c = document.createElement("canvas")
    c.width = mapWidth * 3
    c.height = mapHeight
    
    let ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    // Draw maps side by side
    ctx.drawImage(alphaMap.canvas, 0, 0); // Left (Alpha)
    ctx.drawImage(colorMap.canvas, mapWidth, 0); // Middle (Color)
    ctx.drawImage(lightMap.canvas, mapWidth * 2, 0); // Right (Light)

    // Convert to image and trigger download
    c.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Lighting_Scene_(${mapWidth}x${mapHeight})-${Math.floor(Math.random() * 1000)}.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Delay revoking URL to prevent premature invalidation
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      resolve();
    }, "image/png");
  });
}