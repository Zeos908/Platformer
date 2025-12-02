// If we don’t currently have a valid player reference, try to find one
if(exitReq()) exit;
if (!instance_exists(player_ref)) {
    player_ref = instance_find(oPlayer, 0);
}