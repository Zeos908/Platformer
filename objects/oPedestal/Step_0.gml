if(sprite_index == sPedestalOrb){
	if(oPlayer.hit(self) > 0){
		oWallBoss.orbAct = false;
		oWallBoss.hp --;
		image_speed = 1;
	}
	if(image_index == image_number - 1){
		sprite_index = sPedestal;
	}
}