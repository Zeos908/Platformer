/// oPopupScreen - Step Event
if (active) {
    if (!closing) {
        // Fade in
        alpha = min(alpha + fade_speed, 0.8);
    }
    
    // Wait for input
    if (keyboard_check_pressed(vk_enter)) {
        closing = true;
    }
    
    // Fade out
    if (closing) {
        alpha -= fade_speed;
        if (alpha <= 0) {
            instance_destroy();
        }
    }
}
