/// @description Insert description here
// You can write your code in this editor

x_factor = random_range(-1,1);
y_factor = random_range(-1,1);

function smoke(duration)
{
	image_angle = random(360);

	image_speed = duration;
	
	
	if (image_alpha <= 0)
	{
		sprite_index = -1;
		// end of the poof animation and remove this excess smoke
		instance_destroy();
		//show_debug_message("STOPPING")
	}
}

prevSpd = 0;
unpaused = false;