player_ref = noone;
image_ind = 0;
prevSpd = 0;
unpaused = false;
delay = 0;
prevInd = 0;
PII = -1;
imageSlow = 0;

// --- New menu / keybind variables ---
menu_state = "paused";
pause_selected_index = 0;
options_selected_index = 0;

keybind_menu_index = 0;
keybind_waiting = false;
keybind_waiting_action = "";
keybind_pulse = 0;

function paused(){
	var screen_w = display_get_gui_width();
	var screen_h = display_get_gui_height();

	// Dim the screen
	draw_set_alpha(0.5);
	draw_set_color(c_black);
	draw_rectangle(0, 0, screen_w, screen_h, false);
	draw_set_alpha(1);
		
	draw_sprite_ext(sPauseMenu, 0, screen_w / 2, screen_h / 2, 0.2, 0.2, 0, c_white, 1);
	var x_pos = global.pausePos[global.pauseIndex][0]
	var y_pos = global.pausePos[global.pauseIndex][1]
	var x_shift = 2
	draw_sprite_ext(sMenuSelector, 0, screen_w / 2 - x_pos + x_shift, y_pos, 2, 2, 0, c_white, 1);
	if(global.pauseIndex == 1){
		x_shift = 3;
	} else if(global.pauseIndex == 2){
		x_shift = -1;
	}
	draw_sprite_ext(sMenuSelector, 0, screen_w / 2 + x_pos + x_shift, y_pos, -2, 2, 0, c_white, 1);
	if(prevInd != global.pauseIndex){
		//disapear animation
		PII++;
		var x_pos = global.pausePos[prevInd][0]
		var y_pos = global.pausePos[prevInd][1]
		draw_sprite_ext(sMenuSelectorDis, PII, screen_w / 2 - x_pos + x_shift, y_pos, 2, 2, 0, c_white, 1);
		if(global.pauseIndex == 1){
			x_shift = 3;
		} else if(global.pauseIndex == 2){
			x_shift = -1;
		}
		draw_sprite_ext(sMenuSelectorDis, PII, screen_w / 2 + x_pos + x_shift, y_pos, -2, 2, 0, c_white, 1);
		if(PII >= 5){
			PII = -1;
			prevInd = global.pauseIndex;
		}
	} else {
		prevInd = global.pauseIndex;
	}
	if(delay <= 0){
		if(keyboard_check(ord("S")) || keyboard_check(vk_down)){
			global.pauseIndex++;
			if(global.pauseIndex > 2){
				global.pauseIndex = 0;
			}
			delay = oPlayer.secs(0.4);
		} else if(keyboard_check(ord("W")) || keyboard_check(vk_up)){
			global.pauseIndex--;
			if(global.pauseIndex < 0){
				global.pauseIndex = 2;
			}
			delay = oPlayer.secs(0.4);
		}
	} else {
		delay--;
	}
	if(keyboard_check_pressed(global.keybinds[? "Jump"]) || keyboard_check_pressed(vk_enter)){
		switch(global.pauseIndex){
			case 0:
				global.paused = false;
				break;
			case 1:
				// options
				menu_state = "options"
				break;
			case 2:
				//go to menu
				break;
		}
	}
}

function keys() {
    // --- Initialize persistent variables ---
    if (!variable_instance_exists(id, "keybind_menu_index")) keybind_menu_index = 0;
    if (!variable_instance_exists(id, "keybind_waiting")) keybind_waiting = false;
    if (!variable_instance_exists(id, "keybind_waiting_action")) keybind_waiting_action = "";
    if (!variable_instance_exists(id, "keybind_pulse")) keybind_pulse = 0;

    // Get all actions from global.keybinds
    if (!variable_instance_exists(id, "keybind_actions")) {
        if (!variable_global_exists("keybinds") || global.keybinds == undefined) return;
        keybind_actions = ds_map_keys_to_array(global.keybinds);
    }

    // --- Step / Input Handling ---
    keybind_pulse += 0.05;
	var num_actions = array_length(keybind_actions);
	var total_items = num_actions + 1; // +1 for the Done button
    if (!keybind_waiting) {
	    if (keyboard_check_pressed(vk_up)) keybind_menu_index = (keybind_menu_index + total_items - 1) mod total_items;
	    if (keyboard_check_pressed(vk_down)) keybind_menu_index = (keybind_menu_index + 1) mod total_items;

	    // Start rebinding or select Done
	    if (keyboard_check_pressed(vk_enter)) {
	        if (keybind_menu_index < array_length(keybind_actions)) {
	            // Rebinding key
	            keybind_waiting = true;
	            keybind_waiting_action = keybind_actions[keybind_menu_index];
	        } else {
	            menu_state = "paused";
	        }
	    }
	} else {
        var k = keyboard_lastkey;
        if (k != 0 && k != vk_enter) {
		    // Get array of all actions
		    var actions = ds_map_keys_to_array(global.keybinds);

		    // Check if any other action already uses this key
		    var duplicate_action = undefined;
		    for (var i = 0; i < array_length(actions); i++) {
		        var act = actions[i];
		        if (act != keybind_waiting_action && global.keybinds[? act] == k) {
		            duplicate_action = act;
		            break;
		        }
		    }

		    // Swap if duplicate exists
		    if (duplicate_action != undefined) {
		        var old_key = global.keybinds[? keybind_waiting_action];
		        global.keybinds[? duplicate_action] = old_key;
		    }

		    // Assign the new key
		    global.keybinds[? keybind_waiting_action] = k;

		    // Reset waiting state
		    keybind_waiting = false;
		    keybind_waiting_action = "";
		}


    }

    // --- Draw GUI ---
    var screen_w = display_get_gui_width();
    var screen_h = display_get_gui_height();
    var cx = screen_w * 0.5;
    var cy_title = screen_h * 0.2;
    var cy_list = cy_title + 40;
    var spacing = 35;

    // Column / highlight settings
    var col_offset = 160;      // increased horizontal distance between columns
    var rect_half_width = 100; // wider highlight rectangles

    // --- Draw semi-transparent background ---
    draw_set_color(c_black);
    draw_set_alpha(0.6);
    draw_rectangle(0, 0, screen_w, screen_h, false);
    draw_set_alpha(1);

    // Title (centered)
    draw_set_color(c_white);
    draw_set_halign(fa_center);
    draw_text(cx, cy_title, "Keybindings");

    // Two-column layout
    var num_actions = array_length(keybind_actions);
    var half = ceil(num_actions / 2);

    for (var i = 0; i < num_actions; i++) {
        var action = keybind_actions[i];
        var key = global.keybinds[? action];
        var key_name = keycode_to_string(key);

        var col_x = (i < half) ? cx - col_offset : cx + col_offset;
        var row_index = (i < half) ? i : i - half;
        var yy = cy_list + row_index * spacing;

        // Highlight selected action
        if (i == keybind_menu_index && !keybind_waiting) {
            draw_set_alpha(0.2 + 0.05 * sin(current_time / 200));
            draw_set_color(c_white);
		
            draw_rectangle(col_x - rect_half_width - 50, yy - 10, col_x + rect_half_width + 50, yy + 25, false);
            draw_set_alpha(1);
        }

        // Draw action text
        draw_set_color(make_color_rgb(230, 230, 255));
        draw_text(col_x - rect_half_width, yy, string_upper(action));

        // Draw key text
        draw_set_color(c_white);
        draw_text(col_x + rect_half_width, yy, key_name);
    }

    // Draw waiting-for-key prompt
    if (keybind_waiting) {
        var alpha = 0.65 + 0.25 * sin(keybind_pulse);
        draw_set_alpha(alpha);
        draw_text(cx, cy_list + spacing * ceil(half) + 20,
                  "Press a key for " + string_upper(keybind_waiting_action) + "...");
        draw_set_alpha(1);
    }
}






function keycode_to_string(key) {
    switch (key) {
        case vk_left:   return "LEFT";
        case vk_right:  return "RIGHT";
        case vk_up:     return "UP";
        case vk_down:   return "DOWN";
        case vk_space:  return "SPACE";
        case vk_shift:  return "SHIFT";
        case vk_control:return "CTRL";
        case vk_enter:  return "ENTER";
        case vk_tab:    return "TAB";
        case vk_escape: return "ESC";
        default:
            if (key >= ord("A") && key <= ord("Z")) return chr(key);
            if (key >= ord("0") && key <= ord("9")) return chr(key);
            return "KEY" + string(key); // fallback
    }
}