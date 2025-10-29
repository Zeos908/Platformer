if(step && timer <= 0 && abs(px-x) < 200 && hp > 0){
	facing = (px > x) ? 1 : -1;
	inst = instance_create_layer(x, y, "Instances_2", oFireball,
	{
	    spd : 8,
	    dir : facing
	});
	timer = oPlayer.secs(1.5);
}
timer--;
image_xscale = -facing;
if(global.blinking && iFrame == 0){
	if((abs(oBlinkDouble.x - x) < abs(oBlinkDouble.x - oPlayer.x)) && oBlinkDouble.y < y+32 && oBlinkDouble.y > y-32){
		hp--;
		//show_debug_message("TOOK DAMAGE");
		iFrame = oPlayer.secs(0.5);
	}
}
if(iFrame > 0){
	iFrame--;
}
show_debug_message(hp)