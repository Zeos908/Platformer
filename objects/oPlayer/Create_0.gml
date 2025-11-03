window_set_size(2560, 1500);
xsp = 0;
ysp = 0;
grav = 0.5;
jump_spd = -7;
superJumpSpd = -12
max_fall = 12;
resetCool = false;
dashCool = false;
//cools = [false, false, false];
timers = [0, 0, 0]; // reset, dash, wall jump
holdO = 0;
wallGrab = false;
moveDir = 0;
on_ground = true;
jumpTimer = 0;
jumping = false;
fallTimer = 0;
falling = false;
distanceToGround = 0;
airTime = 0;
charging = false;
prevGrab = false;
//crouch animation
crouching = false;

//blink animation
blinked = false;
roomChangeState = 0;

//time since created
creation = 0;
onGroundPrev = true;
onGroundPrevHold = [false, false, false, false, false];








wallJumpTimer = 0;   // frames remaining for horizontal push
wallJumpDir = 0;     // direction of push: -1 or 1
wallJumpSpeed = 4;   // horizontal speed of push-off
wallJumpDuration = 8; // how many frames the push lasts


function secs(input) {
    return (game_get_speed(gamespeed_fps)/2) * input;
}

function damage(dmg){
	global.hp--;
}

function kill(){
	global.died = true;
	global.phighting = [false, 0, 0]
	room = global.checkpoint[2]
	
}


/*


function animation()
{
		 if (jumping) {
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
}
*/