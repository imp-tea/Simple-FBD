canvas.addEventListener('mousedown', e => {
    const mousePos = getMousePos(e);
    if (mode === 'add') {
        isDrawing = true;
        currentArrow = {
            startX: centerX,
            startY: centerY,
            endX: mousePos.x,
            endY: mousePos.y,
            label: 'F',
            subscript: 'g', // Add subscript field
        };
        arrows.push(currentArrow);
    } else if (mode === 'delete' || mode === 'label') {
        currentArrow = getArrowAtPosition(mousePos);
        if (currentArrow && mode === 'delete') {
            arrows = arrows.filter(arrow => arrow !== currentArrow);
            currentArrow = null;
            draw();
        } else if (currentArrow && mode === 'label') {
            const labelDialog = document.createElement('div');
            labelDialog.style.position = 'fixed';
            labelDialog.style.top = '50%';
            labelDialog.style.left = '50%';
            labelDialog.style.transform = 'translate(-50%, -50%)';
            labelDialog.style.backgroundColor = '#fff';
            labelDialog.style.padding = '20px';
            labelDialog.style.border = '1px solid #000';
            labelDialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';

            const labelInput = document.createElement('input');
            labelInput.type = 'text';
            labelInput.placeholder = 'Main Label';
            labelInput.value = currentArrow.label;

            const subscriptInput = document.createElement('input');
            subscriptInput.type = 'text';
            subscriptInput.placeholder = 'Subscript';
            subscriptInput.value = currentArrow.subscript;

            const submitButton = document.createElement('button');
            submitButton.textContent = 'OK';
            submitButton.onclick = () => {
                currentArrow.label = labelInput.value;
                currentArrow.subscript = subscriptInput.value;
                document.body.removeChild(labelDialog);
                draw();
            };

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.onclick = () => {
                document.body.removeChild(labelDialog);
            };

            labelDialog.appendChild(labelInput);
            labelDialog.appendChild(document.createElement('br'));
            labelDialog.appendChild(subscriptInput);
            labelDialog.appendChild(document.createElement('br'));
            labelDialog.appendChild(submitButton);
            labelDialog.appendChild(cancelButton);

            document.body.appendChild(labelDialog);
        }
    }
});

function drawArrow(startX, startY, endX, endY, label = '', subscript = '', color = '#ffffff', lineWidth = 4) {
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

    // Draw label with subscript
    if (label) {
        ctx.font = '14px Arial';
        ctx.fillStyle = color;
        const labelOffset = 20; // Additional padding
        ctx.fillText(label, endX + labelOffset * Math.cos(angle), endY + labelOffset * Math.sin(angle));
        if (subscript) {
            ctx.font = '10px Arial'; // Smaller font for subscript
            ctx.fillText(subscript, endX + labelOffset * Math.cos(angle) + 14, endY + labelOffset * Math.sin(angle));
        }
    }
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
        drawArrow(arrow.startX, arrow.startY, arrow.endX, arrow.endY, arrow.label, arrow.subscript, '#ffffff', 4);
    });

    // Draw net force
    if (showNetForce) {
        drawNetForce();
    }
}

draw();
