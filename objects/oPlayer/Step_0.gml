creation++;
var inst = instance_nearest(x, y, oNextRoom);

if(global.died){
	show_debug_message("died");
	x = global.checkpoint[0];
	y = global.checkpoint[1];
	//show_debug_message(global.checkpoint[1]);
	timers[0] = secs(0.5);
	cools[0] = true;
	timers[1] = 0;
	sprite_index = sPlayer;
	global.died = false;
}

if(global.hp <= 0){
	global.hp = global.maxHp;
	kill();
}
distanceToGround = 0;
// find distance
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
//if (charging && keyboard_check_released(ord("K"))){
///	sprite_index = sPlayer;
//	charging = false;
//}
if (charging && keyboard_check_released(ord("K"))){
	charging = false;
	sprite_index = sPlayer;
}


xsp = 0;

moveDir = 0;
if (keyboard_check(ord("A"))){
	moveDir = -1;
	global.facing = -1;
}
if (keyboard_check(ord("D"))){
	moveDir = 1
	global.facing = 1;
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

if (keyboard_check(vk_space) && !cools[1] && global.canDash){
	oBlinkDouble.blink(x, y);
	global.blinking = true;
	xsp += 60 * global.facing;
	cools[1] = true;
	timers[1] = secs(1.5);
}	
// --- Apply gravity ---
ysp += grav;
max_fall = wallGrab ? 3:12;
if (ysp > max_fall) ysp = max_fall;

// --- Jumping ---
on_ground = (place_meeting(x, y + 1, oIsland) && !prevGrab);
if ((on_ground || onGroundPrev) && keyboard_check_pressed(ord("O")) && !keyboard_check(ord("K"))) {
	//reg jump
    ysp = jump_spd;
	jumping = true;
} else if (wallGrab && keyboard_check_pressed(ord("O"))){
	//wall jump
	ysp = jump_spd - 2;
	wallJumpTimer = wallJumpDuration;
	wallJumpDir = -global.facing;
	wallGrab = false;
} else if (on_ground && keyboard_check(ord("K")) && global.canSuperJump){
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
on_ground = (place_meeting(x, y + 1, oIsland) && !prevGrab);
if (keyboard_check(ord("S")) && on_ground){
	crouching = true;
	xsp *= 0.25;

} 
if(keyboard_check_released(ord("S")) && (sprite_index == sCrouch || sprite_index == sCrouchRun)) {
	// shibai im stupid // xsp *= 1;
	crouching = false;
}

// --- Horizontal movement ---
if(xsp != 0){
	if (!place_meeting(x + xsp, y, oIsland) && !cools[0]) {
		if(!global.phighting[0] || (x + xsp > global.phighting[1] && x + xsp < global.phighting[2])){ // checks if you are within the range if you are fighting
			x += xsp; // move left/right if no collision
		}
		wallGrab = false
	} else {
	    // hit wall, stop horizontal movement
		xsp = 0;
		if(!cools[0] && !on_ground){
			wallGrab = true;
		}
	}
}
else
{
	if (!place_meeting(x + global.facing, y, oIsland) && !cools[0])
	{
		wallGrab = false;
	}
	
}
// --- Vertical movement ---
if ((!place_meeting(x, y + ysp, oIsland) && !global.blinking) || wallGrab) {
    y += ysp; // move down/up if no collision
} else {
    // landed on the ground or hit ceiling
    while ((!place_meeting(x, y + sign(ysp), oIsland)) && !global.blinking) {
        y += sign(ysp);
    }
    ysp = 0;
}


if (y > 750){
	kill();
	y = 300;
}

// Collisions

if(place_meeting(x, y, oSpike)){
	kill();
}

if(place_meeting(x, y, oIdol)){
	if(keyboard_check_pressed(ord("W"))){
		global.canDash = true;
		global.checkpoint = [490, 80, 0];
		global.hp = global.maxHp;
	}
}
if(place_meeting(x, y, oInvisSpike)) kill();


//room change

if(global.nxRoom)
{
	roomChangeState = nextRoom(room);
	global.nxRoom = false;
}
else if global.prRoom 
{
	roomChangeState = prevRoom(room);
	global.prRoom = false;
}


//show_debug_message(global.prRoom)
//room change
if(place_meeting(x, y, oNextRoom)) {
	//change rooms
	room_goto(room_next(room));
	global.nxRoom = true;
	
} else if (place_meeting(x, y, oPrevRoom) && room != 0 && global.facing == -1) {
	global.debug = true;
	room_goto(room_previous(room));
	global.prRoom = true;
	
	
}

// Coyote time

on_ground = (place_meeting(x, y + 1, oIsland) && !prevGrab);

onGroundPrev = onGroundPrevHold[0];
for(var i = 0; i <= 3; i++){
	onGroundPrevHold[i] = onGroundPrevHold[i + 1];
}
onGroundPrevHold[4] = on_ground;
show_debug_message(string(on_ground) + ", " + string(onGroundPrev));

// Sprite animations
on_ground = (place_meeting(x, y + 1, oIsland) && !prevGrab); // check if standing
if(!on_ground){
	airTime++;	
} else {
	airTime = 0;	
}
var wallSlide = wallGrab && !on_ground;           // check if sliding on wall (maybe disable for testing)
var moving = keyboard_check(ord("A")) || keyboard_check(ord("D")); // left/right input

if global.blinking == true // holds the animation tree so that no other animations can be played
{
	if blinked == false //blinked = initiated blink
	{
		blinked = true;
		sprite_index = sBlinkPlayer;
		image_speed = 1;
	}
	if(image_index >= image_number - 1) //blink is done - other animations can be played
	{
		sprite_index = sPlayer;
		global.blinking = false;
		blinked = false;
	}
}

// --- Determine which sprite to use ---
else if (wallSlide) 
{
    if (sprite_index != sWallSlide) 
	{
		sprite_index = sWallSlide;
        image_speed = 1; // adjust speed for wall slide animation
    }
	on_ground = false;
} 
 
/*
animation
*/
else if (crouching && moving){
	if (sprite_index != sCrouchRun){
		sprite_index = sCrouchRun;
	}
}
else if (crouching)
{
	sprite_index = sCrouch;
}
else if (moving && on_ground) {
    if (sprite_index != sRun) {
        sprite_index = sRun;
        image_speed = 1; // running animation
    }
} 


else {
    if (sprite_index != sPlayer && !charging) {
        sprite_index = sPlayer;
        image_speed = 1; // idle is no longer static
    }
}

// --- Flip sprite left/right ---
image_xscale = global.facing; // facing = 1 for right, -1 for left
prevGrab = wallGrab;