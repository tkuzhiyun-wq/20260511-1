let capture;
let faceMesh;
let handPose;
let faces = [];
let hands = [];
let earringImages = [];
let currentEarringIndex = 0; // 預設顯示第 1 款
let faceStickerImg;

function preload() {
  // 載入 faceMesh 模型
  faceMesh = ml5.faceMesh();
  // 載入 handPose 模型
  handPose = ml5.handPose();

  // 載入 5 款指定名稱的耳環圖片
  earringImages[0] = loadImage('pic/acc1_ring.png');
  earringImages[1] = loadImage('pic/acc2_pearl.png');
  earringImages[2] = loadImage('pic/acc3_tassel.png');
  earringImages[3] = loadImage('pic/acc4_jade.png');
  earringImages[4] = loadImage('pic/acc5_phoenix.png');
  // 載入臉部貼圖圖片
  faceStickerImg = loadImage('pic/4379901.png');
}

function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  
  // 擷取攝影機影像
  capture = createCapture(VIDEO);
  capture.size(640, 480); // 設定基準解析度以利辨識
  
  // 隱藏預設產生的 HTML 影片元件
  capture.hide();

  // 開始對攝影機影像進行臉部偵測
  faceMesh.detectStart(capture, gotFaces);
  // 開始對攝影機影像進行手勢偵測
  handPose.detectStart(capture, gotHands);
}

function gotFaces(results) {
  // 儲存偵測到的臉部資料
  faces = results;
}

function gotHands(results) {
  // 儲存偵測到的手部資料
  hands = results;
}

function draw() {
  // 設定背景顏色為 e7c6ff (粉紫色)
  background('#e7c6ff');

  let videoW = windowWidth * 0.5;
  let videoH = windowHeight * 0.5;
  let x = (windowWidth - videoW) / 2;
  let y = (windowHeight - videoH) / 2;

  // 處理左右顛倒（鏡像效果）
  push();
  translate(x + videoW, y);
  scale(-1, 1);
  
  // 繪製攝影機影像
  image(capture, 0, 0, videoW, videoH);

  // 如果偵測到手勢，計算手指數量並切換耳環索引
  if (hands.length > 0) {
    let fingerCount = countFingers(hands[0]);
    if (fingerCount >= 1 && fingerCount <= 5) {
      currentEarringIndex = fingerCount - 1;
    }
  }

  // 如果偵測到臉部，則繪製耳垂位置
  if (faces.length > 0) {
    let face = faces[0];

    // 改用 234 (左臉邊緣) 與 454 (右臉邊緣)，這兩點更靠近耳朵
    let leftEarlobe = face.keypoints[234];
    let rightEarlobe = face.keypoints[454];

    // 將座標對應到畫布上的影像大小 (50% 寬高)
    let scaleX = videoW / capture.width;
    let scaleY = videoH / capture.height;
    let offsetX = videoW * 0.01; // 稍微往臉部外側偏移一點點 (1%)

    // 設定耳環大小 (約為顯示影像寬度的 10%)
    let earringSize = videoW * 0.1;

    // 取得當前選擇的耳環圖片
    let selectedEarring = earringImages[currentEarringIndex];

    // 計算臉部旋轉角度 (依據左右臉邊緣點)
    let faceAngle = atan2(rightEarlobe.y - leftEarlobe.y, rightEarlobe.x - leftEarlobe.x);

    imageMode(CENTER);

    // 繪製耳環
    if (leftEarlobe) {
      push();
      translate(leftEarlobe.x * scaleX - offsetX, leftEarlobe.y * scaleY + earringSize / 2.5);
      rotate(faceAngle);
      image(selectedEarring, 0, 0, earringSize, earringSize);
      pop();
    }
    if (rightEarlobe) {
      push();
      translate(rightEarlobe.x * scaleX + offsetX, rightEarlobe.y * scaleY + earringSize / 2.5);
      rotate(faceAngle);
      image(selectedEarring, 0, 0, earringSize, earringSize);
      pop();
    }

    // 在臉部中心貼上 4379901.png 面具
    let noseTip = face.keypoints[1];
    // 安全檢查：確保圖片已成功載入 (width > 1) 且有鼻尖點
    if (noseTip && faceStickerImg && faceStickerImg.width > 1) {
      // 根據畫布上的縮放比例計算臉部寬度
      let faceWidthOnCanvas = dist(leftEarlobe.x * scaleX, leftEarlobe.y * scaleY, rightEarlobe.x * scaleX, rightEarlobe.y * scaleY);
      
      // 設定面具寬度，約為臉部寬度的 2.5 倍以更完整覆蓋臉部邊緣
      let stickerW = faceWidthOnCanvas * 1;
      let stickerH = stickerW * (faceStickerImg.height / faceStickerImg.width);
      
      push();
      // 將座標原點移至鼻尖
      translate(noseTip.x * scaleX, noseTip.y * scaleY);
      // 隨臉部角度旋轉
      rotate(faceAngle);
      // 繪製面具
      image(faceStickerImg, 0, 0, stickerW, stickerH);
      pop();
    }
  }
  pop();
}

// 計算伸出的手指數量
function countFingers(hand) {
  let count = 0;
  // 4 根手指：食指(8, 6), 中指(12, 10), 無名指(16, 14), 小指(20, 18)
  // 判斷方式：指尖(Tip) Y 座標小於第二關節(PIP) Y 座標 (在 p5 中 Y 越小代表越高)
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];

  for (let i = 0; i < 4; i++) {
    if (hand.keypoints[tips[i]].y < hand.keypoints[pips[i]].y) {
      count++;
    }
  }

  // 大拇指(4, 2)：利用指尖到手腕(0)的距離來判斷是否張開
  let thumbTip = hand.keypoints[4];
  let thumbBase = hand.keypoints[2];
  let wrist = hand.keypoints[0];
  if (dist(thumbTip.x, thumbTip.y, wrist.x, wrist.y) > dist(thumbBase.x, thumbBase.y, wrist.x, wrist.y)) {
    count++;
  }

  return count;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
