function generateCircularKernel(radius) {
  const kernel = [];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      let distance = Math.sqrt(dx * dx + dy * dy);
 
      if(distance <= radius){
        kernel.push({
          dx: dx,
          dy: dy,
          d: distance
        });
      }
    }
  }

  kernel.sort((a, b) => a.d - b.d);

  return kernel;
}

function setup() {
  let width = canvas.width
  let height = canvas.height
  
  let kernelRadius = 30
  
  let kernel = generateCircularKernel(kernelRadius)
  
  let pixels = width*height
  
  settings.distanceMap = new Float32Array(pixels)
  
  let tempCanv = document.createElement("canvas")
  tempCanv.width = scene.image.width
  tempCanv.height = scene.image.height
  let imgCtx = tempCanv.getContext("2d")
  imgCtx.drawImage(scene.image, 0, 0, scene.image.width, scene.image.height)
  
  let rawAlpha = imgCtx.getImageData(0, 0, width, height).data;
  settings.alphaMap = new Uint8Array(rawAlpha.length/4)
  
  settings.pixelsToRender = 0
  for(let i = 0; i<rawAlpha.length/4; i++){
    let value = Math.round(rawAlpha[i*4]/255)
    settings.alphaMap[i] = value
    if(value == 0) settings.pixelsToRender++
  }
  
  settings.colorMap = imgCtx.getImageData(width, 0, width, height).data;
  
  //ctx.drawImage(ctx.createImagaData(settings.colorMap, width, height, 0, 0))
  
  settings.lightMap = imgCtx.getImageData(2*width, 0, width, height).data
  
  settings.precomputedAngles.data = new Float32Array(settings.precomputedAngles.amount*2)
  for(let i = 0; i<settings.precomputedAngles.amount; i++){
    let angle = Math.PI*2*(i/settings.precomputedAngles.amount)
    settings.precomputedAngles.data[i*2] = Math.sin(angle)
    settings.precomputedAngles.data[i*2+1] = Math.cos(angle)
  }
   
  //console.log("setuped")
  
  let perFrame = 10000
  
  let index = 0  
  return new Promise((resolve)=>{
    let loop = setInterval(()=>{
      for(let j = 0; j<perFrame; j++){
        let x = index%width
        let y = Math.floor(index/width)    
    
        let dist = kernelRadius
        
        for(let {dx, dy, d} of kernel){
          if(settings.alphaMap[(x+dx | 0) + (y+dy | 0) * width] == 1){
            dist = d
            break
          }
        }
    
        settings.distanceMap[index] = dist
        
        index++
        if(index >= width*height){
          clearInterval(loop)        
          resolve()
          return
        }
      }  
      
      displaySpan.innerText = `${index}/${width*height} = ${index / (width*height)}`   
    })
  })
  
  //ctx.putImageData(ctx.createImageData(settings.colorMap, width, height), 0, 0)
}
