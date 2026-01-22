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
        <title>ShopFlowDemo</title>
        <link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml"/>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="login_logo"></div>
      <div className="login_wrapper">
        <div className="Modal_modal__3I0HK">
          <form onSubmit={formHandler} className="w-80 flex flex-col justify-between p-3">
            <div className="flex justify-center pb-12 ">
              {}
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
