distanceToGround = 0;
for(var i = 1; i <= 50; i++){
	if !place_meeting(x, y+i, oIsland){
		distanceToGround++;
	} else {
		break;
	}
}

// Timers
for(var i = 0; i < array_length(timers); i++){
	if (timers[i] == 0){
		cools[i] = false;
	} else {
		timers[i] -= 1;
	}
}

// --- Horizontal movement ---
if (charging && ){
	
}	

xsp = 0;

moveDir = 0;
if (keyboard_check(ord("A"))){
	moveDir = -1
	facing = -1;
}
if (keyboard_check(ord("D"))){
	moveDir = 1
	facing = 1;
}

// Wall jump active?
if (wallJumpTimer > 0) {
    // Gradual push away from wall
    xsp = wallJumpDir * wallJumpSpeed;

    // Player input modifies horizontal motion
    xsp += moveDir * 2; // tweak 2 for influence strength
    wallJumpTimer -= 1;
} else {
    // Normal movement
    xsp = moveDir * 4;
}

if (keyboard_check(vk_space) && !cools[1] && canDash){
	xsp += 50 * facing;
	cools[1] = true;
	timers[1] = secs(1);
}	
// --- Apply gravity ---
ysp += grav;
max_fall = wallGrab ? 3:12;
if (ysp > max_fall) ysp = max_fall;

// --- Jumping ---
on_ground = place_meeting(x, y + 1, oIsland);
if (on_ground && keyboard_check_pressed(ord("O")) && !keyboard_check(ord("K"))) {
	//reg jump
    ysp = jump_spd;
	jumping = true;
} else if (wallGrab && keyboard_check_pressed(ord("O"))){
	//wall jump
	ysp = jump_spd - 2;
	wallJumpTimer = wallJumpDuration;
	wallJumpDir = -facing;
	wallGrab = false;
} else if (on_ground && keyboard_check(ord("K")) && canSuperJump){
	//super jump
	holdO += 1;
	xsp = 0;
	if (sprite_index != sJumpCharge && sprite_index != sJumpCharge2){
		sprite_index = sJumpCharge;
		image_speed = 0.75;
		charging = true;
	} else if (sprite_index = sJumpCharge) {
		if(image_index >= 3) {
			sprite_index = sJumpCharge2;
		}
	}
	if (holdO >= secs(3)){
		sprite_index = sCharged;
		if (keyboard_check_pressed(ord("O"))){
			holdO = 0;
			ysp = superJumpSpd;
			charging = false;
			sprite_index = sPlayer;
		}
	}
} else {
	holdO = 0;	
}	

// --- Horizontal movement ---
if(xsp != 0){
	if (!place_meeting(x + xsp, y, oIsland) && !cools[0]) {
	    x += xsp; // move left/right if no collision
		wallGrab = false
	} else {
	    // hit wall, stop horizontal movement
		xsp = 0;
		if(!cools[0]){
			wallGrab = true;
		}
	}
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


if (y > 750){
	kill();
}

// Collisions

if(place_meeting(x, y, oSpike)){
	kill();
}

if(place_meeting(x, y, oIdol)){
	if(keyboard_check_pressed(ord("W"))){
		canDash = true;
	}
}
if(place_meeting(x, y, oInvisSpike)) kill();

// Sprite animations


on_ground = place_meeting(x, y + 1, oIsland); // check if standing
if(!on_ground){
	airTime++;	
} else {
	airTime = 0;	
}
var wallSlide = wallGrab && !on_ground;           // check if sliding on wall
var moving = keyboard_check(ord("A")) || keyboard_check(ord("D")); // left/right input

// --- Determine which sprite to use ---
if (wallSlide) {
    //if (sprite_index != spr_WallSlide) {
    //    sprite_index = spr_WallSlide;
    //    image_speed = 0.2; // adjust speed for wall slide animation
    //}
} 
/*
else if (jumping) {
	if (sprite_index!= sJump){
		sprite_index = sJump;
	    image_speed = 1.28;
		jumpTimer = 15;
	} else {
		if (jumpTimer <= 0){
			jumping = false;
		} else {
			jumpTimer--;
		}
	}
}
else if (!on_ground && airTime > 1 * game_get_speed(gamespeed_fps)/2 && distanceToGround < 30){
	// dive animation
	if (sprite_index!= sFall){
		sprite_index = sFall;
	    image_speed = 1.28;
	} else {
		if(distanceToGround > 20){
			if(image_index >= 3){
				image_index = 3;
				image_speed = 0;
			}
		} else {
			if(image_index >= 6){
				image_index = 6;
				image_speed = 0;
			} else {
				image_speed = 1.3;
			}
		}
	}	
}
*/
else if (moving) {
    //if (sprite_index != sRun) {
    //    sprite_index = sRun;
    //    image_speed = 0.2; // running animation
    //}
} 
else {
    if (sprite_index != sPlayer && !charging) {
        sprite_index = sPlayer;
        image_speed = 0; // idle is static
    }
}

// --- Flip sprite left/right ---
image_xscale = facing; // facing = 1 for right, -1 for left