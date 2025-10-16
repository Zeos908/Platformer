window_set_size(1280, 720);
xsp = 0;
ysp = 0;
grav = 0.5;
jump_spd = -6;
superJumpSpd = -12
max_fall = 12;
facing = 1;
resetCool = false;
dashCool = false;
cools = [false, false];
timers = [0, 0]; // reset, dash
holdO = 0;
canDash = true;
canSuperJump = true;



function secs(input) {
    return (game_get_speed(gamespeed_fps)/2) * input;
}
