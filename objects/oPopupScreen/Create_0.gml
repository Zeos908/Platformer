/// oPopupScreen - Create Event
active = true;               // popup is active
alpha = 0;                    // start fully transparent
fade_speed = 0.05;            // speed of fade in/out
message = global.msg;  // default message
button_prompt = "Press " + string(oUI.keycode_to_string(global.keybinds[? "Jump"])) +  " key to continue";     // optional prompt
closing = false;              // track if fading out
font_main = fntPopup;         // main font
font_prompt = fntPopup;       // smaller or same font
