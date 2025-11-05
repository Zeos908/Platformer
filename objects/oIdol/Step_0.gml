if(place_meeting(x, y, oPlayer)){
	if(keyboard_check_pressed(ord("W"))){
		if(room == 0){
			global.canDash = true;
		} else if(room == 1){
			global.canSuperJump = true
		}
		global.checkpoint = [x, y-10, room];
		global.hp = global.maxHp;
		//show_debug_message("erm");
		sprite_index = sIdolAnim;
		image_speed = 1.5;
		
	}
}
//show_debug_message(sprite_index == sIdolAnim && image_index  >= 3);
if((sprite_index == sIdolAnim && image_index  >= 3) || global.idol[room]){
	sprite_index = sIdolEnd;
	image_speed = 1;
	global.idol[room] = true;
}
