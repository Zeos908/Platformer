/// @description Insert description here
// You can write your code in this editor

// Step event of CameraFollow
if (!instance_exists(player)) {
    player = instance_find(oPlayer, 0);
}
if (instance_exists(player)) {
    x_player = player.x;
    y_player = player.y;

    // Calculate distance safely
    //distance = distance_to_point(x_player, y_player);

    // Call camera function
    camera(player);
}

show_debug_message(instance_find(oPlayer, 0))
show_debug_message(y_player);
show_debug_message(x)
show_debug_message(y)