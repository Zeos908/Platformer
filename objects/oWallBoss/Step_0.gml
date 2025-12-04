if(global.phighting[0]){
	
} else {
	if(distance_to_object(oPlayer) < 30){
		global.bossStart = true;
		image_speed = 1;
		if(image_index >= sprite_get_number(sWallSpawnAnim) - 1){
			//global.phighting[1] = 
			//global.phighting[2] = 
			global.bossStart = false;
		}
	}
}