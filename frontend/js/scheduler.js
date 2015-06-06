var moment = require('moment'),
    R = require('ramda');

moment.locale('ru', {
    months : "январь_февраль_март_апрель_май_июнь_июль_август_сентябрь_октябрь_ноябрь_декабрь".split("_"),
    monthsShort : "янв._февр._март_апр._май_июнь_июль._авг._сен._окт._нояб._дек.".split("_"),
    weekdays : "воскресенье_понедельник_вторник_среда_четверг_пятница_суббота".split("_"),
    weekdaysShort : "вс._пон._вт._ср._четв._пят._суб.".split("_")
});
function schedule(visitInfos, startTime, route, gt){
    var instructions = route.instructions,
        departureTime = moment(startTime),
        gatheringTime = moment.duration(gt, 'minutes'),
        schedule = R.reduce(function(carry, instruction){
            if(instruction.type === 'WaypointReached' || instruction.type === 'DestinationReached'){
                var visitInfos = R.last(carry).infosLeft,
                    visitInfo = R.head(visitInfos),
                    workdayBeggining = departureTime.clone().hours(9).minutes(0).seconds(0).milliseconds(0),
                    workdayEnd = departureTime.clone().hours(18).minutes(0).seconds(0).milliseconds(0);
                if(!departureTime.isBetween(workdayBeggining, workdayEnd)){
                    if(departureTime.isAfter(workdayEnd)){
                        departureTime.add(1, 'day');
                    }
                    departureTime.hours(9).minutes(0).seconds(0).milliseconds(0);
                }
                carry.push({
                    item: {
                        name: visitInfo.name,
                        type: visitInfo.type,
                        timeOfArrival: departureTime.format('dddd, MMMM Do YYYY, H:mm'),
                        lat: visitInfo.waypoint.latLng.lat,
                        lng: visitInfo.waypoint.latLng.lng
                    },
                    infosLeft: R.tail(visitInfos)
                });
                departureTime.add(visitInfo.visitTime.add(gatheringTime));
            }
            departureTime.add(instruction.time, 's');
            return carry;
        }, [{
            item: {
                name: visitInfos[0].name,
                type: visitInfos[0].type,
                timeOfArrival: departureTime.format('dddd, MMMM Do YYYY, H:mm'),
                lat: visitInfos[0].waypoint.latLng.lat,
                lng: visitInfos[0].waypoint.latLng.lng
            },
            infosLeft: R.tail(visitInfos)
        }], instructions);
    return R.compose(
        R.mapIndexed(function(item, index, items){
            if(index === 0 || index === items.length - 1){
                return R.assoc('editable', false, item);
            }
            return R.assoc('editable', true, item);
        }),
        R.pluck('item')
    )(schedule);
}

module.exports = schedule;