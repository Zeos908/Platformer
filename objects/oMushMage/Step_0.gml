if(step && timer <= 0 && abs(px-x) < 200){
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
if(global.blinking && iFrame = 0){
	if(abs(oBlinkDouble.x - x) < abs(oBlinkDouble.x - oPlayer.x)){
		hp--;
		show_debug_message("TOOK DAMAGE");
		iFrame = oPlayer.secs(0.5);
	}
}
iFrame--;
show_debug_message(abs(oBlinkDouble.x - x))
show_debug_message(abs(oBlinkDouble.x - oPlayer.x));