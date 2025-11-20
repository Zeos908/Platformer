/// @description Repeat every frame

//detect only when agro requires a refresh
if (!sleeping) && (agro < 5)
{
	agro = detectPlayer();
}

if (agro > 0)
{
	// chase player and attack when in range
	
	if checkAttackRange(oPlayer) && !attacked
	{
		attack(oPlayer)
		
	}
	else 
	{

		//must not be in attack range
		// teleport to random location near the player
		if (betweenActions <= 0)
		{
			position = move(oPlayer);
			sprite_index = sMushStrikerMove;
			
		}
	}
}

//debuging
if (keyboard_check(ord("M"))){
	position = move(oPlayer);
	x = position[0]; y = position[1];
}

// spawn cloud


if ((image_index >= image_number -1) && (sprite_index == sMushStrikerMove)) && image_speed == 1
{
	var inst = instance_create_layer(x, y, "VFX", oSmokeBase);
	inst.smmoke(1);
	x = position[0]; y = position[1];
	timeTillAppear = timeToAppear;
}

if timeTillAppear < 0
{
	sprite_index = sMushStrikerMove;
	image_speed = -1
}

if ((image_index <= 1) && (sprite_index == sMushStrikerMove)) && image_speed == -1
{
	sprite_index = sMushStriker;
	image_speed = 1;
}


//show_debug_message(agro)



/// subtract timers

agro -= 0.00001*delta_time;

show_debug_message(timeTillAppear)

betweenActions -= 0.00001*delta_time;

if !(timeTillAppear < -1)
{
	timeTillAppear -= 0.00001*delta_time;
}


