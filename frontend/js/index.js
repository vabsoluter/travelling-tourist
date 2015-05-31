var mapFunc = require('./clean-map.js');

$(function(){
    var map = mapFunc('map');
    $('#datetimepicker').datetimepicker({
        lang: 'ru'
    });
});