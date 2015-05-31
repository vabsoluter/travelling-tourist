var MyFormatter = function(options){
    console.log(options);
};

MyFormatter.prototype.formatDistance = function(d){
    var kilometers = Math.floor(d / 1000);
    if(kilometers > 0){
        return (d / 1000).toFixed(2) + ' км';
    }else{
        return d + ' м';
    }
};

MyFormatter.prototype.formatTime = function(t){
    if (t > 86400) {
        return Math.round(t / 3600) + ' ч';
    } else if (t > 3600) {
        return Math.floor(t / 3600) + ' ч ' +
            Math.round((t % 3600) / 60) + ' мин';
    } else if (t > 300) {
        return Math.round(t / 60) + ' мин';
    } else if (t > 60) {
        return Math.floor(t / 60) + ' мин' +
            (t % 60 !== 0 ? ' ' + (t % 60) + ' сек' : '');
    } else {
        return t + ' сек';
    }
};

MyFormatter.prototype.formatInstruction = function(instr, i){
    switch(instr.type){
        case 'Straight':
            return (i === 0 ? 'Двигайтесь прямо' : 'Продолжайте движение');
        case 'SlightRight':
            return 'Примите вправо';
        case 'Right':
            return 'Поверните направо' + ((instr.road.length > 0) ? ' на ' + instr.road : '');
        case 'SharpRight':
            return 'Совершите резкий поворот направо' + ((instr.road.length > 0) ? ' на ' + instr.road : '');
        case 'TurnAround':
            return 'Развернитесь';
        case 'SharpLeft':
            return 'Совершите резкий поворот налево' + ((instr.road.length > 0) ? ' на ' + instr.road : '');
        case 'Left':
            return 'Поверните налево' + ((instr.road.length > 0) ? ' на ' + instr.road : '');
        case 'SlightLeft':
            return 'Примите влево';
        case 'WaypointReached':
            return 'Прибытие в промежуточный пункт ' + instr.road;
        case 'Roundabout':
            return 'На кольцевой дороге выполните ' + instr.exit + '-й съезд на ' + instr.road;
        case 'DestinationReached':
            return 'Прибытие в пункт назначения';
    }
};

MyFormatter.prototype.getIconName = function(instr, i){
    console.log(instr);
    switch (instr.type) {
        case 'Straight':
            return (i === 0 ? 'depart' : 'continue');
        case 'SlightRight':
            return 'bear-right';
        case 'Right':
            return 'turn-right';
        case 'SharpRight':
            return 'sharp-right';
        case 'TurnAround':
            return 'u-turn';
        case 'SharpLeft':
            return 'sharp-left';
        case 'Left':
            return 'turn-left';
        case 'SlightLeft':
            return 'bear-left';
        case 'WaypointReached':
            return 'via';
        case 'Roundabout':
            return 'enter-roundabout';
        case 'DestinationReached':
            return 'arrive';
    }
};

module.exports = MyFormatter;