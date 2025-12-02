// At the very top of your room creation code
if (!variable_global_exists("died")) {
    global.facing       = 1;
    global.canDash      = false;
    global.canSuperJump = false;
    global.debug        = false;
    global.blinking     = false;
    global.checkpoint   = [32, 330, 0];
	global.safepoint    = [32, 330];
	global.lastSafe     = [32, 330];
    global.died         = false;
	global.phighting    = [false, 0, 0]; // Fighting?, x min, x max
	global.hp           = 5;
	global.maxHp        = 5;
	global.idol         = [];
	global.roomCount    = 4;
	for(var i = 0; i < global.roomCount; i++){
		global.idol[i]  = false;
	}
	global.beatBoss     = [false];
	global.paused       = false;
	global.prevSpeed    = 1;
	global.pauseCount   = 0;
	global.parkourRooms = [1, 3];
	global.testRoomCondition = "no";
	global.healing      = false;
	global.jelly        = 0;
	global.jellyMax     = 3;
	global.damage       = 1;
	global.msg          = "";
	global.pausePos     = [[50, 170], [53, 199], [37, 227]];
	global.pauseIndex   = 0;
    show_debug_message("Globals initialized");
	
	
}