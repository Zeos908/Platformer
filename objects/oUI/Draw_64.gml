// obj_ui → Draw GUI event

if (player_ref != noone) {
    var total_hearts = 5;
    var hp = global.hp;
    var start_x = 20;
    var start_y = 20;
    var spacing = 24; // smaller spacing to match smaller size
    var scale = 1;  // size

    for (var i = 0; i < total_hearts; i++) {
        var spr = (i < hp) ? sHealth : sHealthGone;
        draw_sprite_ext(spr, 0, start_x + i * spacing, start_y, scale, scale, 0, c_white, 1);
    }
}