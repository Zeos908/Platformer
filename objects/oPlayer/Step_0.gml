//show_debug_message("paused: " + string(global.paused));
if(exitReq()){
	exit;
} else if(unpaused){
	sprite_index = oPlayer;
}

if(keyboard_check_pressed(ord("T"))){
	global.bossStart = !global.bossStart;
}

if(global.bossStart){
	ysp += grav;
	if (ysp > 8) ysp = 8;
	if(!place_meeting(x, y + 1, oIsland)) x -= 4;
	if ((!place_meeting(x, y + ysp - 1, oIsland))) y += ysp;
	else y+= distance_to_object(oIsland) - 0.25;
	exit;
}
creation++;
var inst = instance_nearest(x, y, oNextRoom);
if(iFrames > 0){
	iFrames -= delta_time / 1000000;
}
if(eiFrames > 0){
	eiFrames -= delta_time / 1000000;
}
if(global.died){
	show_debug_message("died");
	x = global.checkpoint[0];
	y = global.checkpoint[1];
	//show_debug_message(global.checkpoint[1]);
	timers[0] = secs(0.5);
	cools[0] = true;
	timers[1] = 0;
	sprite_index = sPlayer;
	global.healing = false;
	global.died = false;
}

if(global.hp <= 0){
	global.hp = global.maxHp;
	kill();
}
on_ground = (place_meeting(x, y + 1, oIsland) && !prevGrab);
distanceToGround = 0;
// find distance

if(global.hitTimer > 0){
	global.hitTimer -= delta_time / 1000000;
} else if(global.hit){
	global.hit = false;
	global.hitTimer = 0;
}

for(var i = 1; i <= 50; i++){
	if !place_meeting(x, y+i, oIsland){
		distanceToGround++;
	} else {
		break;
	}
}

// Timers
for(var i = 0; i < array_length(timers); i++){
	if (timers[i] <= 0){
		cools[i] = false;
	} else {
		timers[i]--;
	}
}

if(!global.curled && global.coyoteBounce){
	coyoteTimer -= delta_time / 1000000;
	if(coyoteTimer <= 0){
		global.coyoteBounce = false;
	}
} else if(global.curled){
	coyoteTimer = 0.1;
}
// --- Horizontal movement ---
//if (charging && keyboard_check_released(ord("K"))){
///	sprite_index = sPlayer;
//	charging = false;
//}
/*
if (charging && keyboard_check_released(ord("K"))){
	charging = false;
	sprite_index = sPlayer;
}
*/
if(knockAccel == 0){
	xsp = 0;
}

moveDir = 0;
if (keyboard_check(global.keybinds[? "Left"])){
	moveDir = -1;
	global.facing = -1;
}
if (keyboard_check(global.keybinds[? "Right"])){
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
	if(knockAccel == 0){
		xsp = moveDir * 4;
	} else {
		xsp += knockAccel
		knockAccel = lerp(knockAccel, 0, 0.1);
		if(abs(knockAccel) <= 0.5){
			knockAccel = 0;
		}
	}
}

if (keyboard_check(global.keybinds[? "Blink"]) && !cools[1] && global.canDash && knockAccel == 0){
	oBlinkDouble.blink(x, y);
	global.blinking = true;
	xsp += 60 * global.facing;
	cools[1] = true;
	timers[1] = secs(1.5);
}	

// --- Apply gravity ---
if(!global.healing){
	if(global.coyoteBounce){
		ysp += grav * 1.5;
		max_fall = wallGrab ? 3:12;
		if (ysp > max_fall + 10) ysp = max_fall + 10;
	} else {
		ysp += grav;
		max_fall = wallGrab ? 3:12;
		if (ysp > max_fall) ysp = max_fall;
	}
}

// --- Jumping ---
on_ground = (place_meeting(x, y + 1, oIsland) && !prevGrab);




if ((on_ground || onGroundPrev) && keyboard_check_pressed(global.keybinds[? "Jump"]) && !keyboard_check(global.keybinds[? "Super Jump"])) {
	//reg jump
    ysp = jump_spd;
	jumping = true;
} else if (wallGrab && keyboard_check_pressed(global.keybinds[? "Jump"])){
	//wall jump
	ysp = jump_spd - 2;
	wallJumpTimer = wallJumpDuration;
	wallJumpDir = -global.facing;
	wallGrab = false;
} else if (on_ground && keyboard_check(global.keybinds[? "Super Jump"]) && global.canSuperJump && !wallGrab){
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
		if (keyboard_check_pressed(global.keybinds[? "Jump"])){
			holdO = 0;
			ysp = superJumpSpd;
			charging = false;
			sprite_index = sPlayer;
		}
	}
} else {
	holdO = 0;	
}	

if(charging && keyboard_check_released(global.keybinds[? "Super Jump"])){
	charging = false;
	sprite_index = sPlayer;
}

if(global.jelly >= 2 && keyboard_check_pressed(global.keybinds[? "Heal"])){
	global.healing = true;
}

if(global.healing){
	xsp = 0;
}
on_ground = (place_meeting(x, y + 1, oIsland) && !prevGrab);

if (keyboard_check(global.keybinds[? "Crouch"]) && on_ground){
	crouching = true;
	xsp *= 0.25;

} 

if(keyboard_check_released(global.keybinds[? "Crouch"]) && (sprite_index == sCrouch || sprite_index == sCrouchRun)) {
	// shibai im stupid // xsp *= 1;
	crouching = false;
}

if(!global.healing && !charging && keyboard_check_pressed(global.keybinds[? "Dart"]) && global.jelly >= 3 && global.hitTimer <= 0){
	var direc = global.facing * -1;
	instance_create_layer(x, y, "Instances_2", oDart, {direc});
	global.jelly -= 3;
}

// --- Horizontal movement ---
if(global.coyoteBounce){
	xsp *= 0.5;
}

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

if(on_ground){
	global.lastSafe = [x, y];
	global.curled = false;
} else if (global.canPogo && keyboard_check_pressed(global.keybinds[? "Bounce"]) && !(wallGrab || charging || global.healing || crouching || global.blinking)){
	global.curled = true;
	global.coyoteBounce = true;
	sprite_index = sPogo;
	image_index = 0;
	image_speed = 2;
}

if (keyboard_check_released(global.keybinds[? "Bounce"]) || (wallGrab || charging || global.healing || crouching || global.blinking)){
	global.curled = false;
}
// --- Vertical movement ---
//var instIsland = instance_nearest(x, y, oIsland);
if ((!place_meeting(x, y + ysp, oIsland) /*&& !place_meeting(instIsland.x, instIsland.y - ysp, oIsland)*/ && !global.blinking) || wallGrab) {
    y += ysp; // move down/up if no collision
} else {
    // landed on the ground or hit ceiling
    while ((!place_meeting(x, y + sign(ysp), oIsland)) && !global.blinking) {
        y += sign(ysp);
    }
    ysp = 0;
}


if (y > 750){
	damage(1, 0, oPlayer);
	timers[0] = secs(0.75);
	cools[0] = true;
	toSafe();
}

// Collisions

if(place_meeting(x, y, oSpike)){
	damage(1, 0, oSpike);
	timers[0] = secs(0.75);
	cools[0] = true;
	toSafe();
}


if(place_meeting(x, y, oInvisSpike)) toSafe();


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
//show_debug_message(string(on_ground) + ", " + string(onGroundPrev));

// Sprite animations
on_ground = (place_meeting(x, y + 1, oIsland) && !prevGrab); // check if standing
if(!on_ground){
	airTime++;	
} else {
	airTime = 0;	
}
if(airTime > secs(1)){
	bigFall = true;
}
var wallSlide = wallGrab && !on_ground;           // check if sliding on wall (maybe disable for testing)
var moving = keyboard_check(global.keybinds[? "Left"]) || keyboard_check(global.keybinds[? "Right"]); // left/right input
if(global.healing){
	heal(2);
} else if (global.blinking == true && charging = false) // holds the animation tree so that no other animations can be played
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
else if (moving && on_ground && !charging) {
    if (sprite_index != sRun) {
        sprite_index = sRun;
        image_speed = 1; // running animation
    }
} 
else if(global.curled){
	if(image_index >= 6){
		image_speed = 0;
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
if(on_ground){
	knockAccel = 0;
}

//show_debug_message("hit: " + string(global.hit) + ", " + string(global.hitTimer));