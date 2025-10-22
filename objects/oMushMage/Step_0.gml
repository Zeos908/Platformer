if(step && timer <= 0){
	facing = (px > x) ? 1 : -1;
	show_debug_message("erm");
	inst = instance_create_layer(x, y, "Instances_2", oFireball,
	{
	    spd : 5,
	    dir : facing
	});
	timer = oPlayer.secs(2);
}
timer--;
show_debug_message(timer);
image_xscale = facing;
