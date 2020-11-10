import { FETCH_PRODUCTS, SET_FAVOURITE_PRODUCT } from './actionTypes';
import store2 from 'store2';
import axios from '../axios';

const compare = {
  lowestprice: (a, b) => {
    if (a.price < b.price) return -1;
    if (a.price > b.price) return 1;
    return 0;
  },
  highestprice: (a, b) => {
    if (a.price > b.price) return -1;
    if (a.price < b.price) return 1;
    return 0;
  }
};

export const setFavProduct = product => dispatch => {
  dispatch({
    type: SET_FAVOURITE_PRODUCT,
    payload: product
  });
};

export const fetchProducts = (filters, sortBy, callback) => dispatch => {
  const userName = store2.session.get('username');
  return axios
    .get('/api/products', { params: { userName } })
    .then(res => {
      let { products } = res.data;
      if (!!filters && filters.length > 0) {
        products = products.filter(p =>
          filters.find(f => p.availableSizes.find(size => size === f))
        );
      }

      if (!!sortBy) {
        products = products.sort(compare[sortBy]);
      }

      if (!!callback) {
        callback();
      }

      return dispatch({
        type: FETCH_PRODUCTS,
        payload: products
      });
    })
    .catch(err => {
      console.log('Could not fetch products. Try again later.');
    });
};
