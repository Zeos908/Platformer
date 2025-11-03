// obj_ui → Draw GUI event

if (player_ref != noone) {
    var total_hearts = global.maxHp;                // total number of hearts to display
    var hp = global.hp;                  // current health
    var start_x = 20;                    // X position of first heart
    var start_y = 20;                    // Y position (top margin)
    var spacing = 40;                    // space between hearts

    for (var i = 0; i < total_hearts; i++) {
        // If this heart index is below the player's current HP, draw full heart
        if (i < hp) {
            //draw_sprite(sHealth, 0, start_x + i * spacing, start_y);
        } 
        // Otherwise, draw the empty/“gone” heart
        else {
            //draw_sprite(sHealthGone, 0, start_x + i * spacing, start_y);
        }
    }
}