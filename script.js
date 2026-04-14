const canvas = document.getElementById('fbdCanvas');
const ctx = canvas.getContext('2d');
const forceList = document.getElementById('forceList');
let arrows = [];
let undoHistory = [];
let mode = 'add';
let isDrawing = false;
let isDragging = false;
let currentArrow = null;
let angleSnapping = false;
let showNetForce = false;
let snapToGrid = true;
let newtonsPerCell = 1;

const numCells = 10;
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
    updateForceList();
});

document.getElementById('snapToGrid').addEventListener('change', e => {
    snapToGrid = e.target.checked;
});

const scaleSlider = document.getElementById('scaleSlider');
const scaleDisplay = document.getElementById('scaleDisplay');

scaleSlider.addEventListener('input', e => {
    newtonsPerCell = parseInt(e.target.value, 10);
    scaleDisplay.textContent = newtonsPerCell + ' N per cell';
    draw();
    updateForceList();
});

document.getElementById('resetButton').addEventListener('click', () => {
    saveUndoState();
    arrows = [];
    draw();
    updateForceList();
});

document.getElementById('undoButton').addEventListener('click', undo);

document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    }
});

function saveUndoState() {
    undoHistory.push(JSON.parse(JSON.stringify(arrows)));
    if (undoHistory.length > 50) undoHistory.shift();
}

function undo() {
    if (undoHistory.length === 0) return;
    arrows = undoHistory.pop();
    draw();
    updateForceList();
}

document.getElementById('screenshotButton').addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(canvas, 0, 0);

    // Invert colors
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
    }
    tempCtx.putImageData(imageData, 0, 0);

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
        saveUndoState();
        isDrawing = true;
    } else if (mode === 'delete' || mode === 'label') {
        currentArrow = getArrowAtPosition(mousePos);
        if (currentArrow && mode === 'delete') {
            saveUndoState();
            arrows = arrows.filter(arrow => arrow !== currentArrow);
            currentArrow = null;
            draw();
            updateForceList();
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
        updateForceList();
        draw();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing && isDragging && currentArrow) {
        // Remove zero-length arrows
        const dx = currentArrow.endX - currentArrow.startX;
        const dy = currentArrow.endY - currentArrow.startY;
        if (Math.hypot(dx, dy) < 1) {
            arrows.pop();
            undoHistory.pop();
        }
    }
    isDrawing = false;
    isDragging = false;
    currentArrow = null;
    updateForceList();
});

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const mousePos = getTouchPos(e);
    if (mode === 'add') {
        saveUndoState();
        isDrawing = true;
    } else if (mode === 'delete' || mode === 'label') {
        currentArrow = getArrowAtPosition(mousePos);
        if (currentArrow && mode === 'delete') {
            saveUndoState();
            arrows = arrows.filter(arrow => arrow !== currentArrow);
            currentArrow = null;
            draw();
            updateForceList();
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
    if (isDrawing && isDragging && currentArrow) {
        const dx = currentArrow.endX - currentArrow.startX;
        const dy = currentArrow.endY - currentArrow.startY;
        if (Math.hypot(dx, dy) < 1) {
            arrows.pop();
            undoHistory.pop();
        }
    }
    isDrawing = false;
    isDragging = false;
    currentArrow = null;
    updateForceList();
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
    const touch = evt.touches[0];
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
    const snapAngle = (15 * Math.PI) / 180;
    angle = Math.round(angle / snapAngle) * snapAngle;
    const length = Math.hypot(dx, dy);
    arrow.endX = arrow.startX + length * Math.cos(angle);
    arrow.endY = arrow.startY + length * Math.sin(angle);
}

function pixelsToNewtons(pixels) {
    return pixels / cellSize * newtonsPerCell;
}

function drawGrid() {
    // Draw grid lines
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1;

    for (let i = 0; i <= numCells; i++) {
        const x = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let j = 0; j <= numCells; j++) {
        const y = j * cellSize;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw axis lines through center
    ctx.strokeStyle = '#3a6a9f';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // Draw tick labels along axes
    ctx.fillStyle = '#5a8abf';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= numCells; i++) {
        const cellsFromCenter = i - numCells / 2;
        if (cellsFromCenter === 0) continue;
        const val = cellsFromCenter * newtonsPerCell;
        const x = i * cellSize;
        ctx.fillText(val, x, centerY + 4);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let j = 0; j <= numCells; j++) {
        const cellsFromCenter = j - numCells / 2;
        if (cellsFromCenter === 0) continue;
        const val = -cellsFromCenter * newtonsPerCell;
        const y = j * cellSize;
        ctx.fillText(val, centerX - 5, y);
    }
}

function drawArrow(startX, startY, endX, endY, label, subLabel, color, lineWidth) {
    label = label || '';
    subLabel = subLabel || '';
    color = color || '#ffffff';
    lineWidth = lineWidth || 4;

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
        const labelOffset = 24;
        const labelX = endX + labelOffset * Math.cos(angle);
        const labelY = endY + labelOffset * Math.sin(angle);

        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = color;

        const mainLabelWidth = ctx.measureText(label).width;

        ctx.fillText(label, labelX, labelY);

        if (subLabel) {
            ctx.font = '11px sans-serif';
            const subLabelX = labelX + mainLabelWidth;
            const subLabelY = labelY + 5;
            ctx.fillText(subLabel, subLabelX, subLabelY);
        }
    }
}

function drawNetForce() {
    const netForce = calculateNetForce();
    if (netForce.netX === 0 && netForce.netY === 0) return;

    const endX = centerX + netForce.netX;
    const endY = centerY + netForce.netY;

    drawArrow(centerX, centerY, endX, endY, 'Net', '', '#ff4444', 4);
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
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
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
    const dialog = document.getElementById('labelDialog');
    const overlay = document.getElementById('labelDialogOverlay');
    const mainLabelInput = document.getElementById('mainLabelInput');
    const subLabelInput = document.getElementById('subLabelInput');
    const okButton = document.getElementById('labelOkButton');
    const cancelButton = document.getElementById('labelCancelButton');

    mainLabelInput.value = arrow.mainLabel || '';
    subLabelInput.value = arrow.subLabel || '';

    dialog.style.display = 'block';
    overlay.style.display = 'block';
    mainLabelInput.focus();

    function onOk() {
        saveUndoState();
        arrow.mainLabel = mainLabelInput.value;
        arrow.subLabel = subLabelInput.value;
        close();
        draw();
        updateForceList();
    }

    function onCancel() {
        close();
    }

    function onKeyDown(e) {
        if (e.key === 'Enter') onOk();
        if (e.key === 'Escape') onCancel();
    }

    function close() {
        dialog.style.display = 'none';
        overlay.style.display = 'none';
        okButton.removeEventListener('click', onOk);
        cancelButton.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKeyDown);
    }

    okButton.addEventListener('click', onOk);
    cancelButton.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
}

function formatAngle(dy, dx) {
    // Standard math convention: angle from positive x-axis, counterclockwise positive
    // Canvas y is inverted, so negate dy
    let a = Math.round(Math.atan2(-dy, dx) * 180 / Math.PI);
    if (a < 0) a += 360;
    return a;
}

function updateForceList() {
    while (forceList.firstChild) {
        forceList.removeChild(forceList.firstChild);
    }

    arrows.forEach(arrow => {
        const dx = arrow.endX - arrow.startX;
        const dy = arrow.endY - arrow.startY;
        const magnitudeN = pixelsToNewtons(Math.hypot(dx, dy));
        const angle = formatAngle(dy, dx);
        const d = Math.round(magnitudeN * 10) / 10;

        const item = document.createElement('div');
        item.className = 'force-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'force-name';
        nameSpan.innerHTML = arrow.mainLabel + (arrow.subLabel ? '<sub>' + escapeHtml(arrow.subLabel) + '</sub>' : '');

        const valueSpan = document.createElement('span');
        valueSpan.className = 'force-value';
        valueSpan.textContent = ': ' + d + ' N @ ' + angle + '\u00B0';

        item.appendChild(nameSpan);
        item.appendChild(valueSpan);
        forceList.appendChild(item);
    });

    // Show net force entry when enabled
    if (showNetForce && arrows.length > 0) {
        const net = calculateNetForce();
        const netMag = pixelsToNewtons(Math.hypot(net.netX, net.netY));
        const netAngle = formatAngle(net.netY, net.netX);
        const netD = Math.round(netMag * 10) / 10;

        const item = document.createElement('div');
        item.className = 'force-item net-force';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'force-name';
        nameSpan.textContent = 'Net Force';

        const valueSpan = document.createElement('span');
        valueSpan.className = 'force-value';
        valueSpan.textContent = ': ' + netD + ' N @ ' + netAngle + '\u00B0';

        item.appendChild(nameSpan);
        item.appendChild(valueSpan);
        forceList.appendChild(item);
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

draw();
