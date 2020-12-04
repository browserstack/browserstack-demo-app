import { FETCH_PRODUCTS, SET_FAVOURITE_PRODUCT } from './actionTypes';

const initialState = {
  products: []
};

export default function(state = initialState, action) {
  switch (action.type) {
    case FETCH_PRODUCTS:
      return {
        ...state,
        products: action.payload
      };
    case SET_FAVOURITE_PRODUCT:
      const products = JSON.parse(JSON.stringify(state.products));
      products.forEach((product) => {
        if (product.id === action.payload.id) {
          product.isFav = !product.isFav;
        }
      })
      return {
        ...state,
        products
      };
    default:
      return state;
  }
}
