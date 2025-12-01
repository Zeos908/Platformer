//window_set_size(2560, 1500);
window_set_size(1920, 1080);
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


healCool = 0;

//time since created
creation = 0;
onGroundPrev = true;
onGroundPrevHold = [false, false, false, false, false];

// big fall

bigFall = false;

iFrames = 0;

delta = 1;
dt = 0;

knockAccel = 0;
knockbackDir = 0;



wallJumpTimer = 0;   // frames remaining for horizontal push
wallJumpDir = 0;     // direction of push: -1 or 1
wallJumpSpeed = 4;   // horizontal speed of push-off
wallJumpDuration = 8; // how many frames the push lasts


// soul

jelly = 3;


function secs(input){
    return (game_get_speed(gamespeed_fps)/2) * input;
}

function spdSmooth(relX, maxSpd, minSpd){
	// ur mom
}

function damage(dmg, strength, obj){
	if(iFrames <= 0){
		global.hp -= dmg;
		iFrames = 0.5;
		if(!global.blinking){
		    var knockbackUp = -6 * strength;         // vertical knockback lift
		    knockbackDir = sign(x - obj.x); // push away from hazard
			xsp = 0;
		    // Apply horizontal and vertical knockback
		    knockAccel = strength * knockbackDir;
		    ysp = knockbackUp;
			//show_debug_message(knockAccel);
			sprite_index = sPlayer;
		}
	}
}

function bounce(strength){
	ysp = strength * -6;
}

function heal(amt){
	sprite_index = sHeal;
	image_speed = 1;
	if(image_index >= 3 && image_index <= 5){
		ysp = -5;
	} else if(image_index == 6){
		ysp = -3;
	} else {
		ysp = 0;
	}
	if(image_index >= 13){
		global.hp += amt;
		global.hp = min(global.maxHp, global.hp);
		sprite_index = sPlayer;
		global.healing = false;
		jelly -= 3;
		show_debug_message(jelly);
	}
}

function kill(){
	global.died = true;
	global.phighting = [false, 0, 0]
	global.hp = global.maxHp;
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