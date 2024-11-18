const canvas = document.getElementById('fbdCanvas');
const ctx = canvas.getContext('2d');

let arrows = [];
let mode = 'add';
let isDrawing = false;
let isDragging = false;
let currentArrow = null;
let angleSnapping = false;
let showNetForce = false;
let snapToGrid = true;

const numCells = 10; // Maintain a 10x10 grid
const cellSize = canvas.width / numCells;

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', e => {
        mode = e.target.value;
    });
});

document.getElementById('angleSnapping').addEventListener('change', e => {
    angleSnapping = e.target.checked;
});

document.getElementById('showNetForce').addEventListener('change', e => {
    showNetForce = e.target.checked;
    draw();
});

document.getElementById('snapToGrid').addEventListener('change', e => {
    snapToGrid = e.target.checked;
});

document.getElementById('resetButton').addEventListener('click', () => {
    arrows = [];
    draw();
});

document.getElementById('screenshotButton').addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Copy original content to the temp canvas
    tempCtx.drawImage(canvas, 0, 0);

    // Invert colors
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];     // Red
        data[i + 1] = 255 - data[i + 1]; // Green
        data[i + 2] = 255 - data[i + 2]; // Blue
    }
    tempCtx.putImageData(imageData, 0, 0);

    // Copy inverted image to clipboard
    tempCanvas.toBlob(blob => {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
            alert('Screenshot copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy screenshot to clipboard.');
        });
    });
});

canvas.addEventListener('mousedown', e => {
    const mousePos = getMousePos(e);
    if (mode === 'add') {
        isDrawing = true;
    } else if (mode === 'delete' || mode === 'label') {
        currentArrow = getArrowAtPosition(mousePos);
        if (currentArrow && mode === 'delete') {
            arrows = arrows.filter(arrow => arrow !== currentArrow);
            currentArrow = null;
            draw();
        } else if (currentArrow && mode === 'label') {
            showLabelDialog(currentArrow);
        }
    }
});

canvas.addEventListener('mousemove', e => {
    const mousePos = getMousePos(e);
    if (!isDrawing) return;
    if (!isDragging) {
        currentArrow = {
            startX: centerX,
            startY: centerY,
            endX: mousePos.x,
            endY: mousePos.y,
            mainLabel: 'F',
            subLabel: '',
        };
        arrows.push(currentArrow);
        isDragging = true;
    }
    if (mode === 'add') {
        currentArrow.endX = mousePos.x;
        currentArrow.endY = mousePos.y;

        if (snapToGrid) {
            currentArrow.endX = Math.round(currentArrow.endX / cellSize) * cellSize;
            currentArrow.endY = Math.round(currentArrow.endY / cellSize) * cellSize;
        }

        if (angleSnapping) {
            snapArrowToAngle(currentArrow);
        }

        draw();
    }
});

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    isDragging = false;
    currentArrow = null;
});

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const mousePos = getTouchPos(e);
    if (mode === 'add') {
        isDrawing = true;
    } else if (mode === 'delete' || mode === 'label') {
        currentArrow = getArrowAtPosition(mousePos);
        if (currentArrow && mode === 'delete') {
            arrows = arrows.filter(arrow => arrow !== currentArrow);
            currentArrow = null;
            draw();
        } else if (currentArrow && mode === 'label') {
            showLabelDialog(currentArrow);
        }
    }
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const mousePos = getTouchPos(e);
    if (!isDrawing) return;
    if (!isDragging) {
        currentArrow = {
            startX: centerX,
            startY: centerY,
            endX: mousePos.x,
            endY: mousePos.y,
            mainLabel: 'F',
            subLabel: '',
        };
        arrows.push(currentArrow);
        isDragging = true;
    }
    if (mode === 'add') {
        currentArrow.endX = mousePos.x;
        currentArrow.endY = mousePos.y;

        if (snapToGrid) {
            currentArrow.endX = Math.round(currentArrow.endX / cellSize) * cellSize;
            currentArrow.endY = Math.round(currentArrow.endY / cellSize) * cellSize;
        }

        if (angleSnapping) {
            snapArrowToAngle(currentArrow);
        }

        draw();
    }
});

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    isDrawing = false;
    isDragging = false;
    currentArrow = null;
});

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * (canvas.width / rect.width),
        y: (evt.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function getTouchPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const touch = evt.touches[0]; // Get the first touch point
    return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    };
}

function getArrowAtPosition(pos) {
    for (let i = arrows.length - 1; i >= 0; i--) {
        const arrow = arrows[i];
        const dx = arrow.endX - arrow.startX;
        const dy = arrow.endY - arrow.startY;
        const length = Math.hypot(dx, dy);
        const proj = ((pos.x - arrow.startX) * dx + (pos.y - arrow.startY) * dy) / (length * length);
        if (proj > 0 && proj < 1) {
            const closestX = arrow.startX + proj * dx;
            const closestY = arrow.startY + proj * dy;
            const distance = Math.hypot(pos.x - closestX, pos.y - closestY);
            if (distance < 10) {
                return arrow;
            }
        }
    }
    return null;
}

function snapArrowToAngle(arrow) {
    const dx = arrow.endX - arrow.startX;
    const dy = arrow.endY - arrow.startY;
    let angle = Math.atan2(dy, dx);
    const snapAngle = (15 * Math.PI) / 180; // 15 degrees in radians
    angle = Math.round(angle / snapAngle) * snapAngle;
    const length = Math.hypot(dx, dy);
    arrow.endX = arrow.startX + length * Math.cos(angle);
    arrow.endY = arrow.startY + length * Math.sin(angle);
}

function drawGrid() {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;

    // Draw vertical grid lines
    for (let i = 0; i <= numCells; i++) {
        const x = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Draw horizontal grid lines
    for (let j = 0; j <= numCells; j++) {
        const y = j * cellSize;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawArrow(startX, startY, endX, endY, label = '', subLabel = '', color = '#ffffff', lineWidth = 4) {
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    const pointX = endX + Math.cos(angle) * lineWidth;
    const pointY = endY + Math.sin(angle) * lineWidth;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrowhead
    const headLength = lineWidth * 5;
    ctx.beginPath();
    ctx.moveTo(pointX, pointY);
    ctx.lineTo(
        pointX - headLength * Math.cos(angle - Math.PI / 6),
        pointY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        pointX - headLength * Math.cos(angle + Math.PI / 6),
        pointY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.lineTo(pointX, pointY);
    ctx.fill();

    // Draw label
    if (label) {
        const labelOffset = 20; // Additional padding
        const labelX = endX + labelOffset * Math.cos(angle);
        const labelY = endY + labelOffset * Math.sin(angle);

        ctx.font = '14px Arial';
        ctx.fillStyle = color;

        // Measure the width of the main label
        const mainLabelWidth = ctx.measureText(label).width;

        // Draw main label
        ctx.fillText(label, labelX, labelY);

        if (subLabel) {
            // Draw subscript
            ctx.font = '10px Arial';
            // Subscript is drawn slightly lower and to the right
            const subLabelX = labelX + mainLabelWidth;
            const subLabelY = labelY + 4; // Adjust as needed
            ctx.fillText(subLabel, subLabelX, subLabelY);
        }
    }
}

function drawNetForce() {
    const netForce = calculateNetForce();
    if (netForce.netX === 0 && netForce.netY === 0) return;

    const endX = centerX + netForce.netX;
    const endY = centerY + netForce.netY;

    drawArrow(centerX, centerY, endX, endY, 'Net Force', '', 'red', 4);
}

function calculateNetForce() {
    let netX = 0;
    let netY = 0;
    arrows.forEach(arrow => {
        netX += arrow.endX - arrow.startX;
        netY += arrow.endY - arrow.startY;
    });
    return { netX, netY };
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    // Draw center mass
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Draw arrows
    arrows.forEach(arrow => {
        drawArrow(arrow.startX, arrow.startY, arrow.endX, arrow.endY, arrow.mainLabel, arrow.subLabel, '#ffffff', 4);
    });

    // Draw net force
    if (showNetForce) {
        drawNetForce();
    }
}

function showLabelDialog(arrow) {
    // Get the dialog elements
    const dialog = document.getElementById('labelDialog');
    const mainLabelInput = document.getElementById('mainLabelInput');
    const subLabelInput = document.getElementById('subLabelInput');
    const okButton = document.getElementById('labelOkButton');
    const cancelButton = document.getElementById('labelCancelButton');

    // Set current values
    mainLabelInput.value = arrow.mainLabel || '';
    subLabelInput.value = arrow.subLabel || '';

    // Show the dialog
    dialog.style.display = 'block';

    // Define the handlers
    function onOk() {
        arrow.mainLabel = mainLabelInput.value;
        arrow.subLabel = subLabelInput.value;
        dialog.style.display = 'none';
        // Remove event listeners
        okButton.removeEventListener('click', onOk);
        cancelButton.removeEventListener('click', onCancel);
        draw();
    }

    function onCancel() {
        dialog.style.display = 'none';
        // Remove event listeners
        okButton.removeEventListener('click', onOk);
        cancelButton.removeEventListener('click', onCancel);
    }

    // Add event listeners
    okButton.addEventListener('click', onOk);
    cancelButton.addEventListener('click', onCancel);
}

draw();
