exitReq();
if(wait <= 0){	
	if (diry != 0) y += diry * spd;
	else x += dirx * spd;
	if(place_meeting(x, y, oPlayer)){
		oPlayer.damage(1, 0, oFireball);
		//global.hp --;
		instance_destroy(self);
	} else if(x < -50 || x > 875 || place_meeting(x, y - 10, oIsland)){
		instance_destroy(self);
	}
} else if(startWait - wait >= oPlayer.secs(0.5)) {
	sprite_index = sFireball;
	wait--;
} 
else {
	wait--;	
}
//show_debug_message(wait);