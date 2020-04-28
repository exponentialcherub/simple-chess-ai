var board,
    game = new Chess();

/*The "AI" part starts here */

var calculateBestMove = function(game) {
    var depth = parseInt($('#search-depth').find(':selected').text());
    var result = minimax(game, depth, -Infinity, Infinity, false);
    console.log(result[0])
    console.log(result[1])
    return result[1];

};

var quiescence = function(game, alpha, beta, maximisingPlayer) {
    positionCount++;
    var eval = evaluateBoard(game);
    
    if(eval > beta) {
        return beta;
    }
    
    if(eval > alpha) {
        alpha = eval;
    }
    
    const captures = game.ugly_captures();
    const scores = getMVVLVAScores(captures);
    
    for(let i = 0; i < captures.length; i++) {
        nextMove(captures, scores, i, true);
        
        game.ugly_move(captures[i]);
        eval = -quiescence(game, -beta, -alpha, !maximisingPlayer);
        game.undo();
        
        if(eval >= beta){
            return beta;
        }
        
        if(eval > alpha) {
            alpha = eval;
        }
    }
    
    return alpha;
}

var minimax = function(game, depth, alpha, beta, maximisingPlayer) {
    positionCount++;
    if(depth === 0) {
        return [quiescence(game, alpha, beta, maximisingPlayer), null];
    }
    
    const newGameMoves = sortMoves(game, maximisingPlayer);
    let bestMove = newGameMoves[0];
    
    if(maximisingPlayer) {
        let maxEval = -Infinity;
        for(let i = 0; i < newGameMoves.length; i++) {
            game.ugly_move(newGameMoves[i]);
            var eval = minimax(game, depth - 1, alpha, beta, false)[0];
            game.undo();
            if(eval > maxEval) {
                bestMove = newGameMoves[i];
                maxEval = eval;
            }
            
            alpha = Math.max(alpha, maxEval);
            if(beta <= alpha) {
                break;
            }
        }
        return [maxEval, bestMove];
    }
    else {
        let minEval = Infinity;
        for(let i = 0; i < newGameMoves.length; i++) {
            game.ugly_move(newGameMoves[i]);
            var eval = minimax(game, depth - 1, alpha, beta, true)[0];
            game.undo();
            if(eval < minEval) {
                bestMove = newGameMoves[i];
                minEval = eval;
            }
            
            beta = Math.min(beta, minEval);
            if(beta <= alpha) {
                break;
            }
        }
        
        return [minEval, bestMove];
    }
}

var getScores = function(game, moves) {
    const scores = [];
    
    for(let i = 0; i < moves.length; i++) {
        game.ugly_move(moves[i]);
        scores[i] = evaluateBoard(game);
        game.undo();
    }    
    
    return scores;
}

var getMVVLVAScores = function(moves) {
    const scores = [];
    for(let i = 0; i < moves.length; i++) {
        if(!moves[i].captured) {
            console.log("WARN: not a capture move \n" + moves[i]);
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

var sortMoves = function(game, maximisingPlayer) {
    const moves = game.ugly_moves();
    const score = getScores(game, moves);
    
    const bestMoves = [];
    const movesCopy = moves.slice();
    for(let i = 0; i < Math.min(8, moves.length); i++) {
        let best = maximisingPlayer ? -Infinity : Infinity;
        let bestIndex = 0;
        for(let j = 0; j < score.length; j++) {
            if((maximisingPlayer && score[j] > best) || (!maximisingPlayer && score[j] < best)) {
                best = score[j];
                bestIndex = j;
            }
        }
        
        bestMoves.push(moves[bestIndex]);
        score[bestIndex] = maximisingPlayer ? -Infinity : Infinity;
        movesCopy.splice(movesCopy.indexOf(moves[bestIndex]), 1);
    }
    
    return bestMoves.concat(movesCopy);
}

var nextMove = function(captures, scores, num, maximisingPlayer) {
    let index = 0;
    let bestScore = scores[num];
    let bestNum = num;
    
    for(index = num; index < captures.length; ++index) {
        if((scores[index] > bestScore && maximisingPlayer) ||
           (scores[index] < bestScore && !maximisingPlayer)) {
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
    const moves = game.ugly_moves().length;
    mobility +=  moves * 5;
    if(moves === 0) {
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
    
    total += attack;
    
    return total;
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