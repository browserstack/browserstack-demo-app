import Head from 'next/head';
import Header from '../../src/components/Header';
import Footer from '../../src/components/Footer';
import { useEffect, useState } from 'react';
import store2 from 'store2';
import Router from 'next/router';
import axios from '../../src/services/axios';
import './style.scss';

const Offers = () => {
  const [geoLocationError, setGeoLocationError] = useState('');
  const [offers, setOffers] = useState([]);
  const userName = store2.session.get('username');

  useEffect(() => {
    if (!userName) {
      Router.replace({
        pathname: '/signin',
        query: { offers: 'true' },
      });
    } else {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          function(position) {
            setGeoLocationError('');
            const latitude = Math.ceil(position.coords.latitude);
            const longitude = Math.ceil(position.coords.longitude);
            axios.get('/api/offers', { params: { userName, latitude, longitude } })
            .then((res) => {
              const { offersData } = res.data;
              setOffers(offersData);
            })
            .catch((e) => {
              setGeoLocationError('Sorry we do not have any promotional offers in your city.');
            })
          },
          function(error) {
            setGeoLocationError("Please enable Geolocation in your browser.");
          }
        );
      } else {
        setGeoLocationError("Geolocation is not available in your browser.");
      }
    }

    return (() => setOffers([]));
  }, []);

  if (!userName) {
    return <></>;
  }

  return (
    <>
      <Head>
        <title>StackDemo</title>
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml"/>
      </Head>
      <Header />
      <main className="fit">
        <div className="mx-auto max-w-8xl px-6">
          <div className="flex-1 p-10 flex flex-col justify-center items-center">
            {geoLocationError ? (
              <div className="pt-6 text-2xl font-bold tracking-wide text-center text-red-50">
                {geoLocationError}
              </div>) : (
              <>
                <div className="p-6 text-2xl tracking-wide text-center text-red-50">
                  We've promotional offers in your location.
                </div>
                <div className="pt-6 text-2xl font-bold tracking-wide text-center text-red-50 offers-listing">
                    {Object.keys(offers).map((offer) => (
                      <div id={offer} key={offer} className="offer">
                        <img style={{height: '150px'}} alt={offer} src={require(`../../public/static/${offers[offer].imageId}`)} />
                        <div className="offer-title">{offers[offer].title}</div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Offers;
