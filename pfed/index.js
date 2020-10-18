/**
 * PlayFieldEDitor @ mauri.github.io
 * 
 * 
 * canvas editor based on https://codepen.io/jah2488/pen/Gimzn
 */

const SCANLINES = 192;

var pixelWidth = 40,
    pixelHeight = 24,
    cursorOffset = 20,
    cursorLineW = 2,
    pixelColor = 'blue',
    drawPos = [];

document.addEventListener('DOMContentLoaded', function () {
    var mouse = {};
    var oldTime, delta;
    var canvas = document.getElementsByTagName('canvas')[0];
    var colorInput = document.getElementById('color')
    var exportBtn = document.getElementById('export');
    var ctx = canvas.getContext('2d');

    canvas.width = 20 * pixelWidth;
    canvas.height = 16 * pixelHeight;

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

    function getMousePos(event) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: (Math.round((event.clientX - rect.left - (pixelWidth / 2)) / pixelWidth) * pixelWidth),
            y: (Math.round((event.clientY - rect.top - (pixelHeight / 2)) / pixelHeight) * pixelHeight)
        };
    }

    function clearCanvas() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawImage() {
        var p = 0;
        while (p < drawPos.length) {
            ctx.fillStyle = drawPos[p].color || pixelColor;
            ctx.fillRect(drawPos[p].x, drawPos[p].y, pixelWidth, pixelHeight);
            p++;
        }
    }

    function drawMouse() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(mouse.x, mouse.y, pixelWidth, cursorLineW);
        ctx.fillRect(mouse.x, mouse.y, cursorLineW, pixelHeight);

        ctx.fillStyle = pixelColor;
        ctx.fillRect(mouse.x + cursorLineW, mouse.y + cursorLineW, pixelWidth - cursorOffset, pixelHeight - cursorOffset);
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
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('contextmenu', clearPixel);

    exportBtn.addEventListener('mouseup', function (event) { exportImage(); });
    colorInput.addEventListener('change', function (event) { pixelColor = colorInput.value; });

    function recordMouseMovement(event) {
        mouse = getMousePos(event);
    }

    function startDrawing(event) {
        if (event.button == 0) {
            mark = setInterval(function () {
                var pos = mouse;
                if (drawPos.length > 1 && drawPos.slice(-1)[0].x == pos.x && drawPos.slice(-1)[0].y == pos.y) { }
                else {
                    pos['color'] = pixelColor;
                    drawPos.push(pos);
                }
            }, 10);
        }
    }

    function stopDrawing(event) {
        clearInterval(mark);
    }

    function clearPixel(event) {
        event.preventDefault();
        var savedPos = drawPos.filter(function (savedPos) { return !(savedPos.x == mouse.x && savedPos.y == mouse.y); });
        drawPos = savedPos;
        return false;
    }

});

function exportImage() {
    var scanline = 0;
    var p = 0;

    var pf0 = Array(SCANLINES).fill(0);
    var pf1 = Array(SCANLINES).fill(0);
    var pf2 = Array(SCANLINES).fill(0);

    while (p < drawPos.length) {
        var x0 = drawPos[p].x / pixelWidth;
        var y0 = drawPos[p].y / pixelHeight;
        
        if (x0 < 4 ) {          // PF0 [0..3]
            pf0[y0] = (1 << (4 + x0)) | pf0[y0];     // PF0 is displaced to use the high nibble reversed
        } else if (x0 < 12) {   // PF1 [4..12]
            pf1[y0] = (1 << (7 - (x0 - 4))) | pf1[y0];
        } else if (x0 < 20) {   // PF2 [13..20]
            pf2[y0] = (1<< (x0 - 12)) | pf2[y0]     // PF2 is reversed
        }
        p++;
    }
    var resp = "ImagePF0\n";
    pf0.forEach( p => resp += "\t.byte #$" + p.toString(16) + "\n"); 

    resp += "\nImagePF1\n";
    pf1.forEach( p => resp += "\t.byte #$" + p.toString(16) + "\n"); 

    resp += "\nImagePF2\n";
    pf2.forEach( p => resp += "\t.byte #$" + p.toString(16) + "\n"); 

    document.getElementById('data').innerHTML = resp;
}

