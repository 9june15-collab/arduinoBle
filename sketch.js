// 소문자 (아두이노와 동일하게 입력)
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214"; 
const WRITE_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214"; 
let writeChar, statusP, connectBtn, send1Btn, send2Btn, send3Btn, accelBtn;
let accelEnabled = false;
let accelX = 0, accelY = 0, accelZ = 0;

// 원의 물리 속성
let ball = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  radius: 10,
  angle: 0
};

function setup() {
  createCanvas(windowWidth, windowHeight);

  // BLE 연결
  connectBtn = createButton("Scan & Connect");
  connectBtn.mousePressed(connectAny);
  connectBtn.size(120, 30);
  connectBtn.position(20, 40);

  statusP = createP("Status: Not connected");
  statusP.position(22, 60);

  // Send 버튼들 추가
  send1Btn = createButton("Send 1");
  send1Btn.mousePressed(() => sendNumber(1));
  send1Btn.size(100, 30);
  send1Btn.position(20, 100);

  send2Btn = createButton("Send 2");
  send2Btn.mousePressed(() => sendNumber(2));
  send2Btn.size(100, 30);
  send2Btn.position(20, 140);

  send3Btn = createButton("Send 3");
  send3Btn.mousePressed(() => sendNumber(3));
  send3Btn.size(100, 30);
  send3Btn.position(20, 180);

  // 가속도 센서 활성화 버튼
  accelBtn = createButton("Enable Accelerometer");
  accelBtn.mousePressed(enableAccelerometer);
  accelBtn.size(150, 30);
  accelBtn.position(20, 220);

  // 원의 초기 위치를 캔버스 중앙으로 설정
  ball.x = width / 2;
  ball.y = height / 2;
}

function draw() {
  background(240);

  // 가속도 값을 텍스트로 출력
  if (accelEnabled) {
    fill(0);
    textSize(14);
    textAlign(LEFT, TOP);
    text(`Accel X: ${accelX.toFixed(2)}`, 20, 260);
    text(`Accel Y: ${accelY.toFixed(2)}`, 20, 280);
    text(`Accel Z: ${accelZ.toFixed(2)}`, 20, 300);
  }

  // 원 업데이트 및 그리기
  updateBall();
  drawBall();
}

function updateBall() {
  if (!accelEnabled) return;

  // 가속도 값에 따라 속도 업데이트 (반전 필요 - 기울임 방향으로 굴러가도록)
  const sensitivity = 0.5;
  ball.vx += -accelX * sensitivity;
  ball.vy += accelY * sensitivity;

  // 마찰 적용
  ball.vx *= 0.95;
  ball.vy *= 0.95;

  // 위치 업데이트
  ball.x += ball.vx;
  ball.y += ball.vy;

  // 경계에서 튕기기
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx *= -0.8;
  }
  if (ball.x + ball.radius > width) {
    ball.x = width - ball.radius;
    ball.vx *= -0.8;
  }
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy *= -0.8;
  }
  if (ball.y + ball.radius > height) {
    ball.y = height - ball.radius;
    ball.vy *= -0.8;
  }

  // 회전 각도 업데이트 (속도에 따라)
  ball.angle += dist(0, 0, ball.vx, ball.vy) * 0.1;
}

function drawBall() {
  push();
  translate(ball.x, ball.y);
  rotate(ball.angle);
  
  // 원 그리기
  fill(0, 0, 255); // 파랑
  stroke(0);
  strokeWeight(2);
  circle(0, 0, ball.radius * 2);
  
  // 원 위에 방향 표시선
  stroke(255);
  strokeWeight(3);
  line(0, 0, ball.radius - 5, 0);
  
  pop();
}

// ---- BLE Connect ----
async function connectAny() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID],
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    writeChar = await service.getCharacteristic(WRITE_UUID);
    statusP.html("Status: Connected to " + (device.name || "device"));
  } catch (e) {
    statusP.html("Status: Error - " + e);
    console.error(e);
  }
}

// ---- Write 1 byte to BLE ----
async function sendNumber(n) {
  if (!writeChar) {
    statusP.html("Status: Not connected");
    return;
  }
  try {
    await writeChar.writeValue(new Uint8Array([n & 0xff]));
    statusP.html("Status: Sent " + n);
  } catch (e) {
    statusP.html("Status: Write error - " + e);
  }
}

// ---- 가속도 센서 활성화 ----
async function enableAccelerometer() {
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    // iOS 13+ 에서는 명시적 권한 요청 필요
    try {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission === 'granted') {
        accelEnabled = true;
        window.addEventListener('devicemotion', handleMotion);
        accelBtn.html("Accelerometer: Enabled");
        statusP.html("Status: Accelerometer enabled");
      } else {
        accelEnabled = false;
        statusP.html("Status: Accelerometer permission denied");
      }
    } catch (e) {
      statusP.html("Status: Accelerometer error - " + e);
      console.error(e);
    }
  } else {
    // 다른 브라우저에서는 직접 활성화
    accelEnabled = true;
    window.addEventListener('devicemotion', handleMotion);
    accelBtn.html("Accelerometer: Enabled");
    statusP.html("Status: Accelerometer enabled");
  }
}

// ---- 가속도 데이터 처리 ----
function handleMotion(event) {
  if (accelEnabled && event.accelerationIncludingGravity) {
    const accel = event.accelerationIncludingGravity;
    accelX = accel.x || 0;
    accelY = accel.y || 0;
    accelZ = accel.z || 0;
  }
}
