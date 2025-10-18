/// @description Clear Sprite
// You can write your code in this editor
sprite_index = -1;
doStep = false;
function blink(x_pos, y_pos)
{
	x = x_pos;
	y = y_pos;
	sprite_index = sBlinkDouble;
	image_speed = 1;
	doStep = true;
	//return true; 
}

