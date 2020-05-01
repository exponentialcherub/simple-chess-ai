var PieceKeys = new Array(14 * 64);
var SideKey;
var CastleKeys = new Array(16);

InitHashKeys();

const makeMove = function(posKey, move) {
    
    return posKey;
}

const generatePosKey = function(board, turn) {
    var sq = 0;
    var finalKey = 0;
    var piece = 0;
    
    for(sq = 0; sq < 64; ++sq) {
        piece = board[Math.floor(sq / 8)][sq % 8];
        if(piece !== null) {
            let type = 0;
            if(piece.color === 'b')
                type += 7;
            switch(piece.type) {
                case 'p':
                    type += 1;
                    break;
                case 'n':
                    type += 2;
                    break;
                case 'b':
                    type += 3;
                    break;
                case 'r':
                    type += 4;
                    break;
                case 'q':
                    type += 5;
                    break;
                case 'k':
                    type += 6;
                    break;
            }
            
            finalKey ^= PieceKeys[(type * 64) + sq];
        }
    }
    
    if(turn === 'w') {
        finalKey ^= SideKey;
    }
    
    // Enpas?
    
    //finalKey ^= CastleKeys[castlePerm];
    
    return finalKey;
}

function InitHashKeys() {
    var index = 0;
	
	for(index = 0; index < 14 * 64; ++index) {				
		PieceKeys[index] = RAND_32();
	}
	
	SideKey = RAND_32();
	
	for(index = 0; index < 16; ++index) {
		CastleKeys[index] = RAND_32();
	}
}

function HASH_PCE(pce, sq) {
	GameBoard.posKey ^= PieceKeys[(pce * 64) + sq];
}

function RAND_32() {

	return (Math.floor((Math.random()*255)+1) << 23) | (Math.floor((Math.random()*255)+1) << 16)
		 | (Math.floor((Math.random()*255)+1) << 8) | Math.floor((Math.random()*255)+1);

}