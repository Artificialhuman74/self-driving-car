let xpos = 265;
let ypos = 525;
let acceleration = .5;
let neg_acceleration = .4;
let grip = 0.2;
let gas = 0;
let brake = 0;
let net = 0;
let speed = 0;
let pix;
let angle = 270;
let img;
let checkpoints = [
  [95, 453], [79, 268], [116, 96], [230, 208],
  [365, 264], [430, 99], [612, 76], [722, 205],
  [726, 392], [618, 523], [432, 526], [250, 525]
];

let nextCheckpoint = 0;
let score = 0;
let old_dist = 0;
let closest = Infinity;      // closest distance to the next checkpoint in this segment
let prevPoint = [265, 525];  // where the current segment started

let state = "fail";

let physics = false;   

let vx=0; 
let vy =0;
let totalFrames = 0;
let seconds = 0;

let mode = "human";                 
let modeButton;                     
let brain = { steer: 0, gas: 0 };   
let waiting = false;                
let carId = 0;
let finishing = false;
let runId =0;
async function setup() {
  img = await loadImage('track.png');
  
  createCanvas(800, 600);
  angleMode(DEGREES);

  modeButton = createButton("Mode: human");
  modeButton.position(10, 610);
  modeButton.mousePressed(() => {
    mode = (mode === "human") ? "ai" : "human";
    modeButton.html("Mode: " + mode);
    brain = { steer: 0, gas: 0 };
  });
}


async function askBrain(inputs) {
  let res = await fetch("http://localhost:5001/think", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: carId, inputs: inputs  }),
  });
  return await res.json();
}

async function reportFitness(){
  let res = await fetch("http://localhost:5001/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: carId, fitness: fitness() }),
  });
  return await res.json();
}

function resetCar() {
  xpos = 265;
  ypos = 525;
  angle = 270;
  vx = 0;
  vy = 0;
  speed = 0;
  gas = 0;
  brake = 0;
  net = 0;
  nextCheckpoint = 0;
  score = 0;
  old_dist = 0;
  closest = Infinity;
  prevPoint = [265, 525];
  totalFrames = 0;
  seconds = 0;
  state = "fail";
  brain = { steer: 0, gas: 0 };
  waiting = false;
  runId++;
  finishing = false;
}

async function finishRun() {
  finishing = true;
  let fit = fitness();
  print("car", carId, "fit", fit);
  if (mode === "ai") {
    await reportFitness();
    carId = (carId + 1) % 30;   // 30 = POP in brain.py
    resetCar();
  } else {
    noLoop();
  }
}

function net_acc() {
  net = acceleration * gas - neg_acceleration * brake;
}

function tilt_right() {
  angle = angle + 5;
}
function tilt_left() {
  angle = angle - 5;
}



function isSafe(c) {
  let onRoad = (c[0] == 255 && c[1] == 255 && c[2] == 255);
  let onStart = (c[0] == 0 && c[1] == 200 && c[2] == 0);
  let onStartEdge = (c[1] > c[0] && c[1]> c[2]);
  return onRoad || onStart || onStartEdge;
}


function setOffset(n){
  let offset;
  if (n ==1) {offset = 0}
  else if (n ==2 ) {offset = 30}
  else if (n ==3 ) {offset = 60}
  else if (n ==4 ) {offset = 330}
  else if (n ==5 ) {offset = 300}

  for(let i =0;i<150; i++){
    let x = xpos + i * sin(angle+offset);
    let y = ypos - i*cos(angle+offset); 
    let color = get(x, y);
    if(!isSafe(color)){
      return [x,y];
    }
  }
  return [xpos + 150* sin(angle+offset), ypos - 150*cos(angle+offset)];
  
}

function fitness(){
  if(state == "pass"){
    return (12*100 + 1000/totalFrames);
  }
  let progress = 0;
  if(nextCheckpoint<checkpoints.length){
    let cp = checkpoints[nextCheckpoint];
    let segLen = dist(prevPoint[0], prevPoint[1], cp[0], cp[1]);
    progress = constrain(1 - closest/segLen, 0, 1);
  }
  return (nextCheckpoint)*100 + progress*100;
}

function draw() {


  if (finishing) {
    return;
  }

  if (state=="pass" || state =="crash"){
    finishRun();
    return;
  }

  if(totalFrames > 900){
    state ="fail";
    text(" ", 418, 400)
    text("time limit exeeded", 418, 400) 
    finishRun();
    return;
  }

  if(totalFrames % 60 == 0){
    if(totalFrames!=0){
      seconds++
    }
  }

  
  
  if (mode === "human") {
    if (keyIsDown(LEFT_ARROW)) {
      tilt_left();
    }
    if (keyIsDown(RIGHT_ARROW)) {
      tilt_right();
    }
  } else {
    if (brain.steer < -0.1) {
      tilt_left();
    }
    if (brain.steer > 0.1) {
      tilt_right();
    }
  }
  background(220);
  image(img, 0, 0);
  
  pix = get(xpos, ypos-10);

  line_1_cord = setOffset(1);
  line_2_cord = setOffset(2);
  line_3_cord = setOffset(3);
  line_4_cord = setOffset(4);
  line_5_cord = setOffset(5);
  let distances = [dist(xpos,ypos,line_1_cord[0],line_1_cord[1])/150, dist(xpos,ypos,line_2_cord[0],line_2_cord[1])/150, dist(xpos,ypos,line_3_cord[0],line_3_cord[1])/150, dist(xpos,ypos,line_4_cord[0],line_4_cord[1])/150, dist(xpos,ypos,line_5_cord[0],line_5_cord[1])/150];

  
  if (mode === "ai" && !waiting) {
    waiting = true;
    let myRun = runId;
    askBrain(distances)
      .then(answer => { if (myRun === runId) { brain = answer; waiting = false; } })
      .catch(err => { console.log("brain error", err); if (myRun === runId) waiting = false; });
  }

  for(let s = 0; s<12; s++){

      circle(checkpoints[s][0], checkpoints[s][1], 20);

  }

  rect(400, 370, 50, 50);
  textSize(20);

  if(score<12){
  text(score, 418, 400) 
  }
  else{
    text(" ", 418, 400)
    text("pass", 418, 400) 
    state = "pass";

  }
  textSize(14);

  text(seconds,700, 500);

  
  text([xpos, ypos], 10, 15);
  text(dist(xpos, ypos, checkpoints[0][0], checkpoints[0][1]), 10, 34)
  
  push();

  translate(xpos, ypos);
  rotate(angle);
  fill(225, 0, 0);
  scale(.2);
  
  rect(-25, -35, 50, 70);
  rect(-45, 35, 90, 20);
  fill(0, 0, 0);
  circle(0,0, 20);
  triangle(-25, -35, 0, -60, 25, -35);

  pop();
  
  line(xpos,ypos,line_1_cord[0],line_1_cord[1]);
  line(xpos,ypos,line_2_cord[0],line_2_cord[1]);
  line(xpos,ypos,line_3_cord[0],line_3_cord[1]);
  line(xpos,ypos,line_4_cord[0],line_4_cord[1]);
  line(xpos,ypos,line_5_cord[0],line_5_cord[1]);

if(nextCheckpoint<checkpoints.length){
  cp = checkpoints[nextCheckpoint];
  old_dist= dist(xpos, ypos, cp[0], cp[1]);
}

if (physics) {
  let curr_speed = dist(0,0,vx,vy);
  let targetvx = curr_speed*sin(angle);
  let targetvy = curr_speed*cos(angle);

  if ((mode === "human" && keyIsDown(UP_ARROW)) || (mode === "ai" && brain.gas > 0.1)) {
    gas = 1;
    brake = 0;
    net_acc();
    vx = vx + net * sin(angle);
    vy = vy + net*cos(angle);

  } 


  if ((mode === "human" && keyIsDown(DOWN_ARROW)) || (mode === "ai" && brain.gas < -0.1)) {
    brake = 1;
    gas = 0;
    net_acc();

    vx = vx + net * sin(angle);
    vy = vy + net*cos(angle);

    let forward = vx*sin(angle) + vy*cos(angle);
    if(forward<=0){
      vx = 0;
      vy=0;
    }    
  }
    vx = lerp(vx, targetvx, grip);
    vy = lerp(vy, targetvy, grip);


    //crash block
  if(!isSafe(pix)){
    vx =0;
    vy=0;
    state = "crash";

  }


  ypos = ypos - vy;
  xpos = xpos + vx;
  totalFrames++;
} else {
  // OLD driving
  if ((mode === "human" && keyIsDown(UP_ARROW)) || (mode === "ai" && brain.gas > 0.1)) {    // CHANGED
    gas = 1;
    brake = 0;
    net_acc();
    speed = speed + net;
  }
  if ((mode === "human" && keyIsDown(DOWN_ARROW)) || (mode === "ai" && brain.gas < -0.1)) {  // CHANGED
    brake = 1;
    gas = 0;
    net_acc();
    speed = speed + net;
    if (speed <= 0) {
      speed = 0;
    }
  }
  if (!isSafe(pix)) {
    speed = 0;
    state = "crash";
  }
  speed = speed * .98;
  ypos = ypos - speed * cos(angle);
  xpos = xpos + speed * sin(angle);
  totalFrames++;
}

if(nextCheckpoint<checkpoints.length){
  cp = checkpoints[nextCheckpoint];
  let new_dist = dist(xpos, ypos, cp[0], cp[1]);
  if(new_dist < closest){
    closest = new_dist;
  }
  if(new_dist > old_dist && new_dist<60){
    nextCheckpoint ++;
    score++;
    prevPoint = cp;
    closest = Infinity;
  }
}

}