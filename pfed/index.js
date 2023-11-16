/**
 * PlayFieldEDitor @ mauri.github.io
 * 
 * (pixel editor inspired by https://codepen.io/jah2488/pen/Gimzn)
 * 
 * 
 */

const SCANLINES = 192;

const horizontalPixels = 20;
const verticalPixels = 16;

var mark = undefined;
var pixelWidth = 24;
var pixelHeight = 24;
var cursorOffset = 20;
var cursorLineW = 2;
var pixelColor = 'lime';

var pixelArray = Array(horizontalPixels);

document.addEventListener('DOMContentLoaded', function () {
    var mouse = {};
    var canvas = document.getElementById('playfield');
    var exportBtn = document.getElementById('export');
    var ctx = canvas.getContext('2d');

    canvas.width = horizontalPixels * pixelWidth;
    canvas.height = verticalPixels * pixelHeight;

    for (let x = 0; x < pixelArray.length; x++) {
        pixelArray[x] = Array(verticalPixels).fill(false);
    }

    function drawGrid() {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.75)';
        var x = 0, y = 0;
        while (x <= canvas.width) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            x += pixelWidth;
        }
        while (y <= canvas.height) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            y += pixelHeight;
        }
        ctx.stroke();
    }

    function clearCanvas() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawImage() {
        for (let x = 0; x < pixelArray.length; x++) {
            for (let y = 0; y < pixelArray[x].length; y++) {
                if (pixelArray[x][y]) {
                    ctx.fillStyle = pixelColor;
                    ctx.fillRect(x * pixelWidth,
                        y * pixelHeight,
                        pixelWidth,
                        pixelHeight);
                }
            }
        }
    }

    /** draw mouse pointer */
    function drawMouse() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(mouse.x, mouse.y, pixelWidth, cursorLineW);
        ctx.fillRect(mouse.x, mouse.y, cursorLineW, pixelHeight);

        ctx.fillStyle = pixelColor;
        ctx.fillRect(mouse.x + cursorLineW,
            mouse.y + cursorLineW,
            pixelWidth - cursorOffset,
            pixelHeight - cursorOffset);
    }

    function render() {
        clearCanvas();
        drawGrid();
        drawImage();
        drawMouse();
        window.requestAnimationFrame(render);
    }
    window.requestAnimationFrame(render);

    canvas.addEventListener('mousemove', recordMouseMovement);
    canvas.addEventListener('mousedown', startDrawing);
    document.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('contextmenu', clearPixel); // right click clears a pixel.

    exportBtn.addEventListener('mouseup', function (event) { exportImage(); });

    function recordMouseMovement(event) {
        var boundingCanvas = canvas.getBoundingClientRect();
        mouse = {
            x: (Math.round((event.clientX - boundingCanvas.left - (pixelWidth / 2)) / pixelWidth) * pixelWidth), 
            y: (Math.round((event.clientY - boundingCanvas.top - (pixelHeight / 2)) / pixelHeight) * pixelHeight)
        };
        pixel = { 
            x: Math.round(mouse.x / pixelWidth),
            y: Math.round(mouse.y / pixelHeight)
        };
        document.getElementById('dbg').innerHTML = "mouse moved: " + JSON.stringify(mouse) + ". Pixel: " + JSON.stringify(pixel);
    }

    function startDrawing(event) {
        if (event.button == 0) {
            mark = setInterval(function () {
                pixelArray[pixel.x][pixel.y] = true;
                console.log("Set Pixel: " + pixel.x + ":" + pixel.y);
            }, 20);
        }
    }

    function stopDrawing(_event) {
        clearInterval(mark);
        console.log("stopped drawing:");
        console.log(pixelArray);
    }

    function clearPixel(event) {
        event.preventDefault();
        pixelArray[pixel.x][pixel.y] = false;
        return false;
    }
});

function exportImage() {

    var pf0 = Array(SCANLINES).fill(0);
    var pf1 = Array(SCANLINES).fill(0);
    var pf2 = Array(SCANLINES).fill(0);

    console.log(pixelArray);
    
    for (let x = 0; x < pixelArray.length; x++) {
        const vertical = pixelArray[x];
        for (let y = 0; y < SCANLINES; y++) {
            const element = vertical[y];
            
            console.log("x:" + String(x) + "y:" + String(y) + " -> " + String(element) );

            if (!element) {
                continue;
            }

            if (x < 4) {          // PF0 [0..3]
                pf0[y] = (1 << (4 + x)) | pf0[y];     // PF0 is displaced to use the high nibble reversed
            } else if (x < 12) {   // PF1 [4..12]
                pf1[y] = (1 << (7 - (x - 4))) | pf1[y];
            } else if (x < 20) {   // PF2 [13..20]
                pf2[y] = (1 << (x - 12)) | pf2[y]     // PF2 is reversed
            }
        }
    }

    let resp = "ImagePF0\n";
    pf0.forEach(p => resp += "\t.byte #$" + p.toString(16) + "\n");

    resp += "\nImagePF1\n";
    pf1.forEach(p => resp += "\t.byte #$" + p.toString(16) + "\n");

    resp += "\nImagePF2\n";
    pf2.forEach(p => resp += "\t.byte #$" + p.toString(16) + "\n");
    
    document.getElementById('data').value = resp;
}

