/// oPopupScreen - Draw GUI Event
if (active) {
    // Draw semi-transparent overlay
    draw_set_alpha(alpha);
    draw_set_color(c_black);
    draw_rectangle(0, 0, display_get_gui_width(), display_get_gui_height(), false);

    // Draw main message
    draw_set_alpha(1);
    draw_set_font(font_main);
    draw_set_color(c_white);
    var mx = display_get_gui_width()/2;
    var my = display_get_gui_height()/2;
    draw_text(mx, my - 20, message); // main message

    // Draw button prompt
    draw_set_font(font_prompt);
    draw_set_color(c_gray);
    draw_text(mx, my + 40, button_prompt);
}
