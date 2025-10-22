if(step && timer <= 0 && abs(px-x) < 150){
	facing = (px > x) ? 1 : -1;
	inst = instance_create_layer(x, y, "Instances_2", oFireball,
	{
	    spd : 5,
	    dir : facing
	});
	timer = oPlayer.secs(2);
}
timer--;
image_xscale = -facing;
var _hit_enemy = collision_line(oBlinkDouble.x, oBlinkDouble.y, oPlayer.x, oPlayer.y, oMushMage, false, true);
if(_hit_enemy){
	show_debug_message("WWWWW");
}