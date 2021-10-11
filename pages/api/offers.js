import offersData from '../../src/constants/offers.json';

/**
 * @swagger
 * /api/offers:
 *   get:
 *     description: Returns all available offers on products.
 *     parameters:
 *     - in: query
 *       name: userName
 *       required: false
 *       description:  Name of the signed in user.
 *     - in: query
 *       name: latitude
 *       required: false
 *       description: Latitude of the location.
 *     - in: query
 *       name: longitude
 *       required: false
 *       description: Longitude of the location.
 *     responses:
 *       200:
 *         description: List of all offers for a specific location.
 *       404:
 *         description: City name could not be determined.
 */
export default (req, res) => {
  const userName = req.query['userName'];
  const latitude = parseInt(req.query['latitude'], 10);
  const longitude = parseInt(req.query['longitude'], 10);
  let city = '';

  const citiesCoords = {
    mumbai: {
      lat: 19,
      lon: 72
    },
    london: {
      lat: 51,
      lon: 0
    },
    "san francisco": {
      lat: 37,
      lon: -122
    },
    singapore: {
      lat: 1,
      lon: 103
    },
    sydney: {
      lat: -33,
      lon: 151
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
