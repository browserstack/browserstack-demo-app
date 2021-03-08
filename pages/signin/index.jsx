import Head from 'next/head';
import { useState, useEffect } from 'react';
import store2 from 'store2';
import Router from 'next/router';
import Creatable from 'react-select/creatable';
import axios from '../../src/services/axios';
import './style.scss';

const usernameOptions = [
  {
    label: 'Accepted usernames are', 
    options: [
      { value: 'demouser', label: 'demouser' },
      { value: 'image_not_loading_user', label: 'image_not_loading_user' },
      { value: 'existing_orders_user', label: 'existing_orders_user' },
      { value: 'fav_user', label: 'fav_user' },
      { value: 'locked_user', label: 'locked_user' }
    ]
  }
];

const passwordOptions = [
  {
    label: 'Password for all users',
    options: [{ value: 'testingisfun99', label: 'testingisfun99' }]
  }
];

const groupStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const groupBadgeStyles = {
  backgroundColor: '#EBECF0',
  borderRadius: '2em',
  color: '#172B4D',
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 'normal',
  lineHeight: '1',
  minWidth: 1,
  padding: '0.16666666666667em 0.5em',
  textAlign: 'center',
};


const formatGroupLabel = data => (
  <div style={groupStyles}>
    <span>{data.label}</span>
    <span style={groupBadgeStyles}>{data.options.length}</span>
  </div>
);

const SignIn = () => {
  const [userName, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiError, setApiError] = useState('');
  const userSession = store2.session.get('username');
  if (userSession) {
    Router.replace('/');
    return <></>;
  }

  const handleChange = selectedOption => {
    setUsername(selectedOption.value);
  };

  useEffect(() => {
    setApiError('');
  }, [setApiError]);

  const formHandler = e => {
    e.preventDefault();
    setApiError('');
    axios.post('/api/signin', {
      userName,
      password
    }).then((data) => {
      store2.session.set('username', userName);
      if (window.location.search.indexOf('checkout') >= 0) {
        Router.replace('/checkout');
      } else if (window.location.search.indexOf('favourites') >= 0) {
        Router.replace('/favourites');
      } else if (window.location.search.indexOf('offers') >= 0) {
        Router.replace('/offers');
      } else if (window.location.search.indexOf('orders') >= 0) {
        Router.replace('/orders');
      } else {
        Router.replace({
          pathname: '/',
          query: { signin: 'true' },
        });
      }
    }).catch((err) => {
      store2.session.remove('username');
      setApiError(err.response.data.errorMessage);
    });
  };

  return (
    <>
      <Head>
        <title>StackDemo</title>
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml"/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="login_logo"></div>
      <div className="login_wrapper">
        <div className="Modal_modal__3I0HK">
          <form onSubmit={formHandler} className="w-80 flex flex-col justify-between p-3">
            <div className="flex justify-center pb-12 ">
              <svg width="156px" height="156px" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/1999/xlink" preserveAspectRatio="xMinYMin meet">
                <defs>
                    <radialGradient cx="50.1407407%" cy="50.0030864%" fx="50.1407407%" fy="50.0030864%" r="50.1188272%" id="radialGradient-1">
                        <stop stopColor="#797979" offset="0%"></stop>
                        <stop stopColor="#4C4C4C" offset="100%"></stop>
                    </radialGradient>
                </defs>
                <g>
                  <circle fill="#F5BB60" cx="127.949264" cy="128.603432" r="127.396568"></circle>
                  <circle fill="#E86F32" cx="114.960894" cy="115.615062" r="114.684546"></circle>
                  <circle fill="#E53D42" cx="130.160051" cy="100.415906" r="99.485389"></circle>
                  <circle fill="#BFD141" cx="138.174151" cy="108.430006" r="91.4712882"></circle>
                  <circle fill="#6DB64C" cx="131.541792" cy="115.062366" r="84.8389289"></circle>
                  <circle fill="#AFDBE7" cx="118.000725" cy="101.797647" r="71.2978621"></circle>
                  <circle fill="#57BADF" cx="129.607354" cy="89.91467" r="59.6912334"></circle>
                  <circle fill="#02B2D6" cx="137.068758" cy="97.3760742" r="52.5061775"></circle>
                  <circle fill="url(#radialGradient-1)" cx="129.331006" cy="104.837478" r="44.768425"></circle>
                  <circle fill="#231F20" cx="129.331006" cy="104.837478" r="44.768425"></circle>
                  <path d="M141.088096,98.9711966 C145.526792,100.962869 151.64783,96.9551361 154.759818,90.0196748 C157.871806,83.0842136 156.796297,75.847342 152.357602,73.8556697 C147.918907,71.8639974 141.797868,75.8717302 138.68588,82.8071914 C135.573892,89.7426526 136.649401,96.9795243 141.088096,98.9711966 L141.088096,98.9711966 Z" fill="#FFFFFF"></path>
                </g>
              </svg>
            </div>
            <div className="flex flex-col space-y-3">
              <Creatable
                id="username"
                onChange={handleChange}
                placeholder="Select Username"
                options={usernameOptions}
                formatGroupLabel={formatGroupLabel}
              />
              <Creatable
                id="password"
                onChange={(option) => setPassword(option.value)}
                placeholder="Select Password"
                options={passwordOptions}
                formatGroupLabel={formatGroupLabel}
              />
              <button id="login-btn" type="submit" className="Button_root__24MxS Button_slim__2caxo" defaultValue="LOGIN">Log In</button>
              {apiError && <h3 className="api-error">{apiError}</h3>}
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SignIn;
