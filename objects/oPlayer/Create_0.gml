window_set_size(2560, 1500);
xsp = 0;
ysp = 0;
grav = 0.5;
jump_spd = -7;
superJumpSpd = -12
max_fall = 12;
facing = 1;
resetCool = false;
dashCool = false;
cools = [false, false, false];
timers = [0, 0, 0]; // reset, dash, wall jump
holdO = 0;
canDash = false;
canSuperJump = true;
wallGrab = false;
moveDir = 0;
on_ground = true;
jumpTimer = 0;
jumping = false;
fallTimer = 0;
falling = false;
distanceToGround = 0;
airTime = 0;


wallJumpTimer = 0;   // frames remaining for horizontal push
wallJumpDir = 0;     // direction of push: -1 or 1
wallJumpSpeed = 4;   // horizontal speed of push-off
wallJumpDuration = 8; // how many frames the push lasts


function secs(input) {
    return (game_get_speed(gamespeed_fps)/2) * input;
}

function kill(){
	x = 32;
	y = 320;
	timers[0] = secs(1);
	cools[0] = true;
	timers[1] = 0;
}
