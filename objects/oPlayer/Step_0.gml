// Timers
for(var i = 0; i < 2; i++){
	if (timers[i] == 0){
		cools[i] = false;
	} else {
		timers[i] -= 1;
	}
}

// --- Horizontal movement ---
xsp = 0;
if (keyboard_check(ord("A"))){
	xsp = -4;
	facing = -1;
}

if (keyboard_check(ord("D"))){
	xsp =  4;
	facing = 1;
}

if (keyboard_check(vk_space) && !cools[1] && canDash){
	xsp += 50 * facing;
	cools[1] = true;
	timers[1] = secs(1);
}	
// --- Apply gravity ---
ysp += grav;
if (ysp > max_fall) ysp = max_fall;

// --- Jumping ---
var on_ground = place_meeting(x, y + 1, oIsland);
if (on_ground && keyboard_check_pressed(ord("O")) && !keyboard_check_pressed(ord("K"))) {
    ysp = jump_spd;
} else if (on_ground && keyboard_check_pressed(ord("K")) && keyboard_check_pressed(ord("O"))){
	holdO += 1;
	if (holdO >= secs(3)){
		holdO = 0;
		ysp = superJumpSpd;
	}	
} else {
	holdO = 0;	
}	
// --- Vertical movement ---
if (!place_meeting(x, y + ysp, oIsland)) {
    y += ysp; // move down/up if no collision
} else {
    // landed on the ground or hit ceiling
    while (!place_meeting(x, y + sign(ysp), oIsland)) {
        y += sign(ysp);
    }
    ysp = 0;
}

// --- Horizontal movement ---
if (!place_meeting(x + xsp, y, oIsland) && !cools[0]) {
    x += xsp; // move left/right if no collision
} else {
    // hit wall, stop horizontal movement
    xsp = 0;
}
if (y > 190){
	x = 64;
	y = 0;
	timers[0] = secs(1);
	cools[0] = true;
	timers[1] = 0;
}