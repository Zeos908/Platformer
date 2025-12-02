
if (player_ref != noone) {
    var total_hearts = global.maxHp;
    var hp = global.hp;
    var start_x = 20;
    var start_y = 20;
	var x_jelly = 58;
    var y_jelly = 40;
    var spacing = 24; // smaller spacing to match smaller size
    var scale = 1;  // size
	var keyFrames = [0, 12, 24, 38]
	var frameGoal = 0;
    for (var i = 0; i < total_hearts; i++) {
        var spr = (i < hp) ? sHealth : sHealthGone;
        draw_sprite_ext(spr, 0, start_x + i * spacing, start_y, scale, scale, 0, c_white, 1);
    }
	frameGoal = keyFrames[global.jelly];
	if(image_ind < frameGoal){
		image_ind++;
		//show_debug_message("HUH");
	} else {
		image_ind = frameGoal;
	}
	draw_sprite_ext(sJellyCont, image_ind, x_jelly, y_jelly, 2.5, 1.5, 0, c_white, 1);
	
	if (global.paused) {
	    var screen_w = display_get_gui_width();
	    var screen_h = display_get_gui_height();

	    // Dim the screen
	    draw_set_alpha(0.5);
	    draw_set_color(c_black);
	    draw_rectangle(0, 0, screen_w, screen_h, false);
	    draw_set_alpha(1);
	}
	//show_debug_message(frameGoal);
}