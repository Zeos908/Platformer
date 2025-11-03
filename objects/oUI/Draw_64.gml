// obj_ui → Draw GUI event

if (player_ref != noone) {
    var total_hearts = 5;
    var hp = global.hp;
    var start_x = 10;
    var start_y = 10;
    var spacing = 12; // smaller spacing to match smaller size
    var scale = 0.5;  // 50% size

    for (var i = 0; i < total_hearts; i++) {
        var spr = (i < hp) ? sHealth : sHealthGone;
        draw_sprite_ext(spr, 0, start_x + i * spacing, start_y, scale, scale, 0, c_white, 1);
    }
}