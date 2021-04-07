import offersData from '../../src/constants/offers.json';

export default (req, res) => {
  const userName = req.query['userName'];
  const latitude = parseInt(req.query['latitude'], 10);
  const longitude = parseInt(req.query['longitude'], 10);
  let city = '';

  const citiesCoords = {
    mumbai: {
      lat: 20,
      lon: 78
    },
    london: {
      lat: 55,
      lon: -3
    },
    "san francisco": {
      lat: 37,
      lon: -95
    },
    singapore: {
      lat: 1,
      lon: 103
    },
    sydney: {
      lat: -31,
      lon: 115
    }
  }
  const citiesKeys = Object.keys(citiesCoords);
  citiesKeys.forEach((cityName) => {
    const cityCoords = citiesCoords[cityName];
    const hasMatchingLat = latitude >= cityCoords.lat - 3 && latitude <= cityCoords.lat + 3;
    const hasMatchingLon = longitude >= cityCoords.lon - 3 && longitude <= cityCoords.lon + 3;
    if(hasMatchingLat && hasMatchingLon) {
      city = cityName;
    } 
  });

  if (city) {
    res.statusCode = 200;
    res.json({ offersData });
  } else {
    res.statusCode = 404;
    res.json({ cityName: city });
  }
};
