/// @description Insert description here
// You can write your code in this editor
function smoke(duration)
{
	image_angle = random(360);
	sprite_index = sSmokeRed;
	image_speed = duration;
	
	if (image_alpha <= 0)
	{
		
		sprite_index = -1;
		// end of the poof animation and remove this excess smoke
		instance_destroy();
		//show_debug_message("STOPPING")
	}
}