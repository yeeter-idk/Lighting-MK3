let displaySpan = document.getElementById("displaySpan")
let canvas = document.getElementById("canvas")
let ctx = canvas.getContext("2d")

canvas.width = 15*20//20
canvas.height = 15*20//20

let settings = {
  raysPerPixel: 6000, //6000 //720
  bounces: 4,
  iso: 2,
  distanceMap: [],
  colorMap: [],
  lightMap: [],
  alphaMap: [],
  pixelsToRender: 0,
  pixelOffsets: [],
  precomputedAngles: {data: [], amount: 1000}
}

let scene = {
  width: 0,
  height: 0,
  image: 0
}

document.getElementById('sceneInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = function(e) {
    const img = new Image();
        
    img.onload = function() {
      scene.width = img.width/3;
      scene.height = img.height;
      scene.image = img
      
      canvas.width = scene.width
      canvas.height = scene.height
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      console.log("image loaded")
    };

    img.src = e.target.result;
  };
});

async function render() {
  let width = scene.width
  let height = scene.height
  
  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, width, height)
  
  await setup()
  
  let drawDistanceMap = document.getElementById("drawDistMap").checked
  
  settings.pixelOffsets = getOffsets(settings.raysPerPixel)
 
  let imageData = ctx.getImageData(0, 0, width, height)
  let data = imageData.data
  
  let pixels = width*height
  let perFrame = 50
  
  let index = 0
  let pixelsRendered = 0
  
  let startingTime = performance.now()
  let lastLeft = 0
  let timeLeft = 0
  let lastProgress = 0
  let progress = 0
  
  let lastSinceStart = 0
  
  let lastPreview = 0
  
  return new Promise((resolve)=>{
    let loop = setInterval(()=>{
      for(let j = 0; j<perFrame; j++){
        let x = index%width
        let y = Math.floor(index/width)
        
        if(!drawDistanceMap){
          if(settings.alphaMap[index] == 0){
            let [r, g, b] = calculatePixel(x, y)
            data[index*4] = r
            data[index*4+1] = g
            data[index*4+2] = b
            
            pixelsRendered++
          }
        }else{
          let nearest = settings.distanceMap[index]  
          
          if(nearest != 0){         
            data[index*4] = nearest*10
            data[index*4+1] = nearest*10
            data[index*4+2] = nearest*10
          }else{
            data[index*4] = 255
            data[index*4+1] = 255
            data[index*4+2] = 255
          }
        }
        
        index++
        if(index >= pixels){
          clearInterval(loop)
        
          ctx.putImageData(imageData, 0, 0)
          
          download(canvas, clockify((performance.now() - startingTime) / 1000))
          resolve()
          return
        }
      }
      
      let timeSinceStart = (performance.now() - startingTime) / 1000;
      let progress = Math.round((pixelsRendered / settings.pixelsToRender) * 100000) / 1000; 
      let timeLeft = (timeSinceStart * (1 / (index / pixels) - 1)); 

      let progressRate = (progress - lastProgress) / (timeSinceStart - lastSinceStart);

      displaySpan.innerText =
        drawProgressBar(progress) +
        `\nEstimated total time: ${clockify(timeLeft + timeSinceStart)}` +
        `\nEstimated time left: ${clockify(timeLeft)}` +
        `\nSince start: ${clockify(timeSinceStart)}` +
        `\nProgress rate: ${progressRate.toFixed(4)}%/s` +
        `\nPixels left: ${settings.pixelsToRender-pixelsRendered}`;

      lastProgress = progress;
      lastLeft = timeLeft;
      lastSinceStart = timeSinceStart;

      if(Math.floor(progress / 5) != lastPreview) {
        ctx.putImageData(imageData, 0, 0);
        lastPreview = Math.floor(progress / 5);
      }
    })
  })
}

function calculatePixel(x, y) {
  let r = 0, g = 0, b = 0;
  
  const rays = settings.raysPerPixel
  
  const iso = settings.iso;
  
  for (let i = 0; i < rays; i++) {
    let { offX, offY } = settings.pixelOffsets[i];
    let [cr, cg, cb] = calculateColor(fireRay(x + offX, y + offY));
 
    r += cr;
    g += cg;
    b += cb;
  }

  r *= iso;
  g *= iso;
  b *= iso;
  
  let finR = r / rays, finG = g / rays, finB = b / rays
  
  return [finR, finG, finB];    
}

function fireRay(x, y) {
  let {bounces} = settings;
  
  let anglesCached = settings.precomputedAngles.amount
  
  let width = canvas.width, height = canvas.height;

  let dx, dy
  
  let path = []
  for(let i = 0; i<bounces+1; i++){
    let angleIndex = (Math.random()*anglesCached | 0)*2
    dx = settings.precomputedAngles.data[angleIndex], dy = settings.precomputedAngles.data[angleIndex+1]
    
    let index = (x | 0) + (y | 0) * width
    let opacity = settings.alphaMap[index]
    while(opacity == 0){
      let safeDistance = settings.distanceMap[index];
      if (safeDistance < 1) safeDistance = 1;
      
      x += dx*safeDistance
      y += dy*safeDistance
      
      if(x>-1 && x<width && y>-1 && y<height){}else{
        return path.reverse()
      }
      
      index = (x | 0) + (y | 0) * width
      opacity = settings.alphaMap[index]
    }
    x -= dx
    y -= dy
       
    path.push((x | 0) + (y | 0) * width)
  }
  
  return path.reverse()
}

function calculateColor(sequence) {
  let r = 0, g = 0, b = 0;
  
  let {colorMap, lightMap} = settings
  
  let width = scene.width
  let height = scene.height

  for (let index of sequence) {
    let x = index%width
    let y = Math.floor(index/width)
    
    let cr, cg, cb
    let lr, lg, lb
    
    if(x >= width || x < 0 || y >= height || y < 0){
      cr = 0, cg = 0, cb = 0
      lr = 0, lg = 0, lb = 0      
    }else{    
      cr = colorMap[index*4], cg = colorMap[index*4+1], cb = colorMap[index*4+2]
      lr = lightMap[index*4], lg = lightMap[index*4+1], lb = lightMap[index*4+2]
    }

    r = r * cr / 255 + lr;
    g = g * cg / 255 + lg;
    b = b * cb / 255 + lb;
  }

  return [r, g, b];
}