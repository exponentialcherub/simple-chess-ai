const MAX_DEPTH = 64;
const PVENTRIES = 10000;
const NOMOVE = 0;

var board,
    game = new Chess();
    
const pvTable = [];
const pvArray = new Array(MAX_DEPTH);
let posKey = 0;

const searchKillers = new Array(3 * MAX_DEPTH);
const searchHistory = new Array(14 * 120);

let ply = 0;

// Init pvTable.
for(let index = 0; index < PVENTRIES; ++index) {
		pvTable.push({
			move : NOMOVE,
			posKey : 0
		});
}

/* Search */

var calculateBestMove = function(game) {
    var depth = parseInt($('#search-depth').find(':selected').text());
    var result = searchRoot(game, depth);
    
    return result;

};

var quiescence = function(game, alpha, beta) {
    ply++;
    positionCount++;
    var eval = evaluateBoard(game);
    
    if(eval >= beta) {
        return beta;
    }
    
    if(eval > alpha) {
        alpha = eval;
    }
    
    let oldAlpha = alpha;
    let bestMove = NOMOVE;
    
    let scores = [];
    const captures = game.ugly_captures({scoreFunc: getScore, scores: scores});
    //const scores = getMVVLVAScores(captures);
    
    for(let i = 0; i < captures.length; i++) {
        nextMove(captures, scores, i);
        
        const oldPosKey = posKey;
        makeMove(game, captures[i]);
        eval = -quiescence(game, -beta, -alpha);
        game.undo();
        posKey = oldPosKey;
        ply--;
        
        if(eval >= beta){
            return beta;
        }
        
        if(eval > alpha) {
            alpha = eval;
            bestMove = captures[i];
        }
    }
    
    if(alpha != oldAlpha) {
        storePvMove(bestMove);
    }
    
    return alpha;
}

var clearForSearch = function() {
    // Clear pvTable
    for(let index = 0; index < PVENTRIES; index++) {
			pvTable[index].move = NOMOVE;
			pvTable[index].posKey = 0;		
	}
    
    for(let index = 0; index < 3 * MAX_DEPTH; index++) {
        searchKillers[index] = 0;
    }
}

var searchRoot = function(game, depth) {
    let bestMove = NOMOVE;
    let bestScore = -Infinity;
    let score = -Infinity;
    let currentDepth = 0;
    clearForSearch();
    
    for(currentDepth = 1; currentDepth <= depth; ++currentDepth) {
        score = negamax(game, currentDepth, -Infinity, Infinity);
        
        /* Time limit stop */
        
        bestScore = score;
        bestMove = probePvTable();
        console.log("yah")
    }
    
    return bestMove;
}

var negamax = function(game, depth, alpha, beta) {
    ply++;
    positionCount++;
    if(depth === 0) {
        return quiescence(game, alpha, beta);
    }
    
    if(game.in_check()){
        depth++;
    }
    
    let scores = [];
    const newGameMoves = game.ugly_moves({scoreFunc: getScore, scores: scores});
    //const scores = getScores(newGameMoves);//new Array(newGameMoves.length).fill(0); 
    let oldAlpha = alpha;
    let bestMove = NOMOVE;
    //console.log(scores);
    var pvMove = probePvTable();
	if(pvMove != NOMOVE) {
		for(let i = 0; i < newGameMoves.length; i++) {
			if(compareMoves(newGameMoves[i], pvMove)) {
                console.log("Double hit!");
				scores[i] = 2000000;
				break;
			}
		}
	}
    
    const oldPosKey = posKey;
    for(let i = 0; i < newGameMoves.length; i++) {
        nextMove(newGameMoves, scores, i);
        
        makeMove(game, newGameMoves[i]);
        var eval = -negamax(game, depth - 1, -beta, -alpha);
        game.undo();
        posKey = oldPosKey;
        ply--;
        
        if( eval >= beta ) {
            if(!newGameMoves[i].captured) {
                searchKillers[MAX_DEPTH + ply] = searchKillers[ply];
                searchKillers[ply] = newGameMoves[i];
            }
            
            return beta;
        }
        
        if( eval > alpha ) {
            if(!newGameMoves[i].captured) {
                searchHistory[getPiece(newGameMoves[i]) * 120 + newGameMoves[i].to] = depth * depth;
            }
            
            bestMove = newGameMoves[i];
            alpha = eval;
        }
    }
    
    if(alpha !== oldAlpha) {
        storePvMove(bestMove);
    }
    
    return alpha;
}

var compareMoves = function(move1, move2) {
    if(!move1 || !move2) {
        return false;
    }
    
    return move1.piece === move2.piece && move1.from === move2.from &&
               move1.to === move2.to && move1.color === move2.color;
}

var getScore = function(move) {
    let score = 0;
    
    if(move.captured){
            score += 1000000;
            switch(move.captured) {
                case 'k': 
                    score += 1000;
                case 'q':
                    score += 900;
                    break;
                case 'r':
                    score += 500;
                    break;
                case 'b':
                    score += 400;
                    break;
                case 'n':
                    score += 300;
                    break;
                case 'p':
                    score += 100;
                
            }
            switch(move.piece){
                case 'k':
                    score -= 10;
                    break;
                case 'q':
                    score -= 9;
                    break;
                case 'r':
                    score -= 5;
                    break;
                case 'b':
                    score -= 4;
                    break;
                case 'n':
                    score -= 3;
                    break;
                case 'p':
                    score -= 1;
                    break;
                
            }
            
            return score;
        }
        
        // Killer moves.
        if(compareMoves(move, searchKillers[ply])) {
            score = 900000;
        }
        else if(compareMoves(move, searchKillers[MAX_DEPTH + ply])) {
            score = 800000;
        }
        else {
            // History
            score = searchHistory[getPiece(move) * 120 + move.to];
        }
        
        return score;
}

var getScores = function(moves) {
    // Captures first.
    const scores = getMVVLVAScores(moves);
    
    for(let i = 0; i < moves.length; i++) {
        if(moves[i].captured){
            scores[i] += 1000000;
            continue;
        }
        
        // Killer moves.
        if(compareMoves(moves[i], searchKillers[ply])) {
            scores[i] = 900000;
        }
        else if(compareMoves(moves[i], searchKillers[MAX_DEPTH + ply])) {
            scores[i] = 800000;
        }
        else {
            // History
            scores[i] = searchHistory[getPiece(moves[i]) * 120 + moves[i].to];
        }
        
    }    
    
    return scores;
}

var getMVVLVAScores = function(moves) {
    const scores = [];
    for(let i = 0; i < moves.length; i++) {
        if(!moves[i].captured) {
            scores[i] = 0;
            continue;
        }
        
        scores[i] = 10;
        
        switch(moves[i].captured) {
            case 'k': 
                scores[i] += 1000;
            case 'q':
                scores[i] += 900;
                break;
            case 'r':
                scores[i] += 500;
                break;
            case 'b':
                scores[i] += 400;
                break;
            case 'n':
                scores[i] += 300;
                break;
            case 'p':
                scores[i] += 100;
            
        }
        switch(moves[i].piece){
            case 'k':
                scores[i] -= 10;
                break;
            case 'q':
                scores[i] -= 9;
                break;
            case 'r':
                scores[i] -= 5;
                break;
            case 'b':
                scores[i] -= 4;
                break;
            case 'n':
                scores[i] -= 3;
                break;
            case 'p':
                scores[i] -= 1;
                break;
            
        }
    }
    
    return scores;
}

var nextMove = function(captures, scores, num) {
    let index = 0;
    let bestScore = scores[num];
    let bestNum = num;
    
    for(index = num; index < captures.length; ++index) {
        if(scores[index] > bestScore) {
            bestScore = scores[index];
            bestNum = index;
        }
    }
    
    if(bestNum != num) {
        let temp = scores[num];
        scores[num] = scores[bestNum];
        scores[bestNum] = temp;
        
        temp = captures[num];
        captures[num] = captures[bestNum];
        captures[bestNum] = temp;
    }
}

/* Evaluate */

var evaluateBoard = function(game) {
    const board = game.board();
    
    // Evaluate material + position using piece-square tables, https://www.chessprogramming.org/Simplified_Evaluation_Function.
    let total = 0;
    let wBishop = 0;
    let bBishop = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            if(board[i][j] !== null) {
                total = total + getPieceValue(board[i][j], i, j);
                
                if(board[i][j].type === 'b') {
                    if(board[i][j].color === 'w')
                        wBishop++;
                    if(board[i][j].color === 'b')
                        bBishop++;
                }
            }
        }
    }
    // Single bishop considered weak as only covers light or dark squares.
    if(wBishop === 1)
        total -= 50;
    if(bBishop === 1)
        total += 50;
    
    // Evaluate mobility
    let mobility = 0;
    //const moves = game.ugly_moves().length; slow pass numMoves in.
    //mobility +=  moves * 5;
    if(true) { //moves == 0
        if(game.in_checkmate()) {
            mobility -= 100000;
        }
        if(game.in_draw()) {
            mobility -= 75000;
        }
    }
    total += game.turn() === 'w' ? mobility : -mobility;
    
    // Evaluate attacks.
    let attack = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            if(board[i][j] !== null && game.under_attack(board[i][j].color === 'w' ? 'b' : 'w', getSquare(i, j))) {
                // Is piece being attacked?
                const factor = board[i][j].color === 'w' ? -1 : 1;
                switch(board[i][j].type){
                   case 'p':
                    attack += 40 * factor;
                    break;
                   case 'b':
                    attack += 150 * factor;
                    break;
                   case 'n':
                    attack += 150 * factor;
                    break;
                   case 'q':
                    attack += 450 * factor;
                    break;
                   case 'r':
                    attack += 250 * factor;
                    break;
                   default:
               }
            }
        } 
    }
    if(game.in_check()) {
        attack += game.turn() === 'w' ? -200 : 200;
    }
    
    //total += attack;
    
    return game.turn() === 'w' ? total : -total;
}

var getSquare = function(x, y) {
    let square = "";
    switch(y){
        case 0:
            square += "a";
            break;
        case 1:
            square += "b";
            break;
        case 2:
            square += "c";
            break;
        case 3:
            square += "d";
            break;
        case 4:
            square += "e";
            break;
        case 5:
            square += "f";
            break;
        case 6:
            square += "g";
            break;
        case 7:
            square += "h";
            break;
    }
    const row = 8 - x;
    square += row;
    
    return square;
}

var getPieceValue = function(piece, x, y) {
   let pieceValue = 0;
   const isWhite = piece.color === 'w';
   switch(piece.type){
       case 'p':
        pieceValue = 100 + (isWhite ? pawnEvalWhite[x][y] : pawnEvalBlack[x][y]) * 10;
        break;
       case 'b':
        pieceValue = 300 + (isWhite ? bishopEvalWhite[x][y] : bishopEvalBlack[x][y]) * 10;
        break;
       case 'n':
        pieceValue = 300 + knightEval[x][y] * 10;
        break;
       case 'q':
        pieceValue = 900 + evalQueen[x][y] * 10;
        break;
       case 'r':
        pieceValue = 500 + (isWhite ? rookEvalWhite[x][y] : rookEvalBlack[x][y]) * 10;
        break;
       default:
   }
    
   return isWhite ? pieceValue : -pieceValue;
}

// Piece-square boards

var reverseArray = function(array) {
    return array.slice().reverse();
};

var pawnEvalWhite =
    [
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
        [5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0,  5.0],
        [1.0,  1.0,  2.0,  3.0,  3.0,  2.0,  1.0,  1.0],
        [0.5,  0.5,  1.0,  2.5,  2.5,  1.0,  0.5,  0.5],
        [0.0,  0.0,  0.0,  2.0,  2.0,  0.0,  0.0,  0.0],
        [0.5, -0.5, -1.0,  0.0,  0.0, -1.0, -0.5,  0.5],
        [0.5,  1.0, 1.0,  -2.0, -2.0,  1.0,  1.0,  0.5],
        [0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]
    ];

var pawnEvalBlack = reverseArray(pawnEvalWhite);

var knightEval =
    [
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
        [-4.0, -2.0,  0.0,  0.0,  0.0,  0.0, -2.0, -4.0],
        [-3.0,  0.0,  1.0,  1.5,  1.5,  1.0,  0.0, -3.0],
        [-3.0,  0.5,  1.5,  2.0,  2.0,  1.5,  0.5, -3.0],
        [-3.0,  0.0,  1.5,  2.0,  2.0,  1.5,  0.0, -3.0],
        [-3.0,  0.5,  1.0,  1.5,  1.5,  1.0,  0.5, -3.0],
        [-4.0, -2.0,  0.0,  0.5,  0.5,  0.0, -2.0, -4.0],
        [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0]
    ];

var bishopEvalWhite = [
    [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
    [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  1.0,  1.0,  0.5,  0.0, -1.0],
    [ -1.0,  0.5,  0.5,  1.0,  1.0,  0.5,  0.5, -1.0],
    [ -1.0,  0.0,  1.0,  1.0,  1.0,  1.0,  0.0, -1.0],
    [ -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0],
    [ -1.0,  0.5,  0.0,  0.0,  0.0,  0.0,  0.5, -1.0],
    [ -2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0]
];

var bishopEvalBlack = reverseArray(bishopEvalWhite);

var rookEvalWhite = [
    [  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
    [  0.5,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [ -0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5],
    [  0.0,   0.0, 0.0,  0.5,  0.5,  0.0,  0.0,  0.0]
];

var rookEvalBlack = reverseArray(rookEvalWhite);

var evalQueen = [
    [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
    [ -1.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
    [ -0.5,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
    [  0.0,  0.0,  0.5,  0.5,  0.5,  0.5,  0.0, -0.5],
    [ -1.0,  0.5,  0.5,  0.5,  0.5,  0.5,  0.0, -1.0],
    [ -1.0,  0.0,  0.5,  0.0,  0.0,  0.0,  0.0, -1.0],
    [ -2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0]
];

var kingEvalWhite = [

    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [ -2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
    [ -1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
    [  2.0,  2.0,  0.0,  0.0,  0.0,  0.0,  2.0,  2.0],
    [  2.0,  3.0,  1.0,  0.0,  0.0,  1.0,  3.0,  2.0]
];

var kingEvalBlack = reverseArray(kingEvalWhite);

/* PvTable */

function probePvTable() {
	var index = posKey % PVENTRIES;
	
	if(pvTable[index].posKey === posKey) {
        console.log("Hit!");
		return pvTable[index].move;
	}
	
	return NOMOVE;
}

function storePvMove(move) {
	var index = posKey % PVENTRIES;
	pvTable[index].posKey = posKey;
	pvTable[index].move = move;
}

function makeMove(game, move) {
    game.ugly_move(move);
    //posKey = makeMove(posKey, move);
    posKey = generatePosKey(game.board(), game.turn());
}

/* board visualization and games state handling starts here*/

var onDragStart = function (source, piece, position, orientation) {
    if (game.in_checkmate() === true || game.in_draw() === true ||
        piece.search(/^b/) !== -1) {
        return false;
    }
};

var makeBestMove = function () {
    var bestMove = getBestMove(game);
    game.ugly_move(bestMove);
    board.position(game.fen());
    renderMoveHistory(game.history());
    if (game.game_over()) {
        alert('Game over');
    }
};

var positionCount;
var getBestMove = function (game) {
    if (game.game_over()) {
        alert('Game over');
    }

    positionCount = 0;
    var depth = parseInt($('#search-depth').find(':selected').text());

    var d = new Date().getTime();
    var bestMove = calculateBestMove(game);
    var d2 = new Date().getTime();
    var moveTime = (d2 - d);
    var positionsPerS = ( positionCount * 1000 / moveTime);

    $('#position-count').text(positionCount);
    $('#time').text(moveTime/1000 + 's');
    $('#positions-per-s').text(positionsPerS);
    return bestMove;
};

var renderMoveHistory = function (moves) {
    var historyElement = $('#move-history').empty();
    historyElement.empty();
    for (var i = 0; i < moves.length; i = i + 2) {
        historyElement.append('<span>' + moves[i] + ' ' + ( moves[i + 1] ? moves[i + 1] : ' ') + '</span><br>')
    }
    historyElement.scrollTop(historyElement[0].scrollHeight);

};

var onDrop = function (source, target) {

    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    removeGreySquares();
    if (move === null) {
        return 'snapback';
    }

    renderMoveHistory(game.history());
    window.setTimeout(makeBestMove, 250);
};

var onSnapEnd = function () {
    board.position(game.fen());
};

/** Grey square logic for showing where a piece can move **/
var onMouseoverSquare = function(square, piece) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    greySquare(square);

    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
};

var onMouseoutSquare = function(square, piece) {
    removeGreySquares();
};

var removeGreySquares = function() {
    $('#board .square-55d63').css('background', '');
};

var greySquare = function(square) {
    var squareEl = $('#board .square-' + square);

    var background = '#a9a9a9';
    if (squareEl.hasClass('black-3c85d') === true) {
        background = '#696969';
    }

    squareEl.css('background', background);
};

var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onSnapEnd: onSnapEnd
};
board = ChessBoard('board', cfg);