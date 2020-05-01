var getPiece = function(move) {
    let type = 0;
    if(move.color === 'b')
        type += 7;
    switch(move.piece) {
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
    
    return type;
}