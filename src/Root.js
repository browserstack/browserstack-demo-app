import React, { useState } from 'react';
import { Provider } from 'react-redux';

import store from './services/store';

const Root = ({ children, initialState = {} }) => {
  const [appStore] = useState(() => store(initialState));
  return <Provider store={appStore}>{children}</Provider>;
};

export default Root;
