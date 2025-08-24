function getOffsets(area) {
  const cols = Math.ceil(Math.sqrt(area));
  const rows = Math.ceil(area / cols);

  const offsets = [];

  for (let index = 0; index < area; index++) {
    const row = Math.floor(index / cols);
    const col = index % cols;

    const x = (cols > 1 ? col / (cols - 1) : 0) * 0.999
    const y = (rows > 1 ? row / (rows - 1) : 0) * 0.999
    
    offsets.push({offX: x, offY: y});
  }

  return offsets;
}

function reflect(dx, dy, nx, ny) {
  let dot = dx * nx + dy * ny;
  return {
    dx: dx - 2 * dot * nx,
    dy: dy - 2 * dot * ny
  };
}

function drawProgressBar(progress){
  let output = "["
  
  let barLength = 35
  
  for(let i = 0; i<barLength; i++){
    output += (i/barLength<progress/100)?"#":"_"    
  }
  
  output += "]"+progress+"%\n"
  
  return output
}

function clockify(seconds) {
  seconds = Math.floor(seconds)
  let secs = String(seconds%60).padStart(2, "0")
  let mins = String(Math.floor(seconds/60)%60).padStart(2, "0")
  let hrs = String(Math.floor(seconds/3600)).padStart(2, "0")
  return `${hrs}:${mins}:${secs}`
}

function download(canv, data = "") {
  return new Promise((resolve, reject) => {
    canv.toBlob(function(blob) {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }
      
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `LightMk3_(${data})_${canv.width}x${canv.height}_${Math.floor(Math.random() * 1000)}.png`;
       
      document.body.appendChild(link);
      link.click();

      URL.revokeObjectURL(url);
      link.remove();

      resolve();
    }, 'image/png');
  });
}
