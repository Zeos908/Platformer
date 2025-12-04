if(exitReq()) exit;
if(place_meeting(x, y, oPlayer)){
	if(keyboard_check_pressed(global.keybinds[? "Interact"])){
		if(room == 0){
			global.canDash = true;
			global.msg = "Learned to Blink"; // custom text
			//var popup = instance_create_layer(0, 0, "Vfx", oPopupScreen);

		} else if(room == 3){
			global.canSuperJump = true
			global.msg = "Learned to Super Jump"; // custom text
			//var popup = instance_create_layer(0, 0, "Vfx", oPopupScreen);
		} else if(room == 4){
			global.canPogo = true;
		}
		global.checkpoint = [x, y-10, room];
		global.hp = global.maxHp;
		global.jelly = global.jellyMax;
		//show_debug_message("erm");
		sprite_index = sIdolAnim;
		image_speed = 1.5;
		
	}
}
//show_debug_message(sprite_index == sIdolAnim && image_index  >= 3);
if(sprite_index == sIdolAnim && image_index  >= 3){
	sprite_index = sIdolAct;
	image_speed = 1;
	global.idol[room] = true;
} else if(room == global.checkpoint[2] && global.idol[room]){
	sprite_index = sIdolAct;
	image_speed = 1;
} else if(global.idol[room]){
	sprite_index = sIdolEnd;
	image_speed = 1;
}

