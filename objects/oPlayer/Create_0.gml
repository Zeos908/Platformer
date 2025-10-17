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
cools = [false, false];
timers = [0, 0]; // reset, dash
holdO = 0;
canDash = false;
canSuperJump = false;



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
