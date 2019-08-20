// Analyser
import { interval } from "rxjs";
import { animationFrame } from "rxjs/internal/scheduler/animationFrame";

const BUFFER_SIZE = 2048;
const DISPLAY_INTERVAL = 17; // = 60 fps

export const drawOscilloscope = (elementId: string, analyser: AnalyserNode) => {
  const dataArray = new Uint8Array(BUFFER_SIZE);
  const oscilloscopeCanvas = document.getElementById(
    elementId
  ) as HTMLCanvasElement;
  const { width, height } = oscilloscopeCanvas.getBoundingClientRect();
  oscilloscopeCanvas.width = width;
  oscilloscopeCanvas.height = height;
  const drawContext = oscilloscopeCanvas.getContext("2d");

  interval(DISPLAY_INTERVAL, animationFrame).subscribe(i => {
    analyser.getByteTimeDomainData(dataArray);
    drawContext.fillStyle = "rgba(20,40,20,1.0)";
    drawContext.fillRect(0, 0, width, height);
    drawContext.lineWidth = 1;
    drawContext.strokeStyle = "rgba(0,255,0,1.0)";
    drawContext.beginPath();
    const sliceWidth = (width * 1.0) / BUFFER_SIZE;
    let x = 0;
    for (let i = 0; i < BUFFER_SIZE; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        drawContext.moveTo(x, y);
      } else {
        drawContext.lineTo(x, y);
      }

      x += sliceWidth;
    }
    drawContext.lineTo(width, height / 2);
    drawContext.stroke();
  });
};
