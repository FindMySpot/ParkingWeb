mapboxgl.accessToken = 'pk.eyJ1IjoibWh1dHRpMSIsImEiOiJjam92aGF2dnkwZDM4M2tyejRsMGZ2ZnB1In0.NQeoVMY8P8v9rY_ohsUmIg';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v9',
    zoom: 11,
    center: [8.54329, 47.36356]
});

var lat = 0;
var lon = 0;
var query = '';

function getLocationCoordinates() {
    var a = navigator.geolocation.getCurrentPosition(function(location) {
        lat = location.coords.latitude;
        lon = location.coords.longitude;
    });
};

document.getElementById('searchbar').onkeydown = function(event) {
    // 13 is for Enter
    if (event.keyCode == 13) {
        query = document.getElementById('searchbar').value;
        console.log(query)
    }
}

map.on('load', function () {
    map.addSource('stations', {
        type: 'geojson',
        data: 'http://23.97.154.233:8080/geo/stations'
    });
    //map.addSource('route', {
    //    type: 'geojson',
    //    data: 'http://23.97.154.233:8080/route/start/tiefenbrunnen/end/laus'
    //});

    //map.addLayer({
    //    "id": "route-line",
    //    "type": "line",
    //    "source": "route",
    //    "paint": {
    //        "line-width": 6,
    //        "line-color": "#23202A"
    //    },
    //    "filter": ["==", "$type", "LineString"],
    //});


    map.addLayer({
        "id": "station-dots",
        "type": "circle",
        "source": "stations",
        "paint": {
            "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "Number_parking_spaces"],
                1, "#B42222",
                10, "#EC8F4F",
                50, "#F6B243",
                100, "#9F9437"
            ],
            "circle-radius": 6
        },
        "filter": ["==", "$type", "Point"],
    });

    

    getLocationCoordinates();  

    function getRoute(lat, lon) {
        console.log('Get the route');
        var url = 'http://23.97.154.233:8080/get-possible-routes/v1/lat/{0}/lon/{1}/destination/lausan'.format(lat, lon);

        console.log(url)

        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", url); 
        xmlHttp.send();

        xmlHttp.onreadystatechange=(e)=>{
            console.log(xmlHttp.responseText)
        }
    };

    


    // Create a popup, but don't add it to the map yet.
    var popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    map.on('mouseenter', 'station-dots', function (e) {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = 'pointer';

        var coordinates = e.features[0].geometry.coordinates.slice();
        var description = e.features[0].properties.Name;
        var totalSpaces = e.features[0].properties.Number_parking_spaces;
        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Populate the popup and set its coordinates
        // based on the feature found.
        popup.setLngLat(coordinates)
            .setHTML("<b>" + description + "</b><br /><span>Total Spaces: " + totalSpaces + "</span>")
            .addTo(map);
    });

    map.on('mouseleave', 'station-dots', function () {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });



});