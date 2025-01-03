import React from 'react';
import PropTypes from 'prop-types';
import store2 from 'store2';
import Router from 'next/router';
import { connect } from 'react-redux';
import {
  isFirefox,
  browserVersion
} from "react-device-detect";

import { setFavProduct } from '../../../services/shelf/actions';

import FavouriteButton from '../../FavouriteButton';
import { isImageNotLoadingUser } from '../../../constants/users';

import Thumb from '../../Thumb';
import util from '../../../services/util';

const Product = props => {
  const { product, setFavProduct } = props;
  const isFirefox50 = isFirefox && browserVersion == 50;
  // Bug: Hide first product image for firefox 50
  const hideFirstProductImageForFirefox50 = product.id === 1 && isFirefox50;
  let username = store2.session.get('username');
  product.quantity = 1;

  let formattedPrice = util.formatPrice(product.price, product.currencyId);

  let productInstallment;

  if (!!product.installments) {
    const installmentPrice = product.price / product.installments;

    productInstallment = (
      <div className="installment">
        <span>or {product.installments} x</span>
        <b>
          {' '}
          {product.currencyFormat}{' '}
          {util.formatPrice(installmentPrice, product.currencyId)}
        </b>
      </div>
    );
  }

  const favClickHandler = () => {
    username = store2.session.get('username');
    if (username) {
      setFavProduct(product);
    } else {
      Router.push('/signin');
    }
  };

  const clickHandler = () => {
    // Bug for demonstration
    if (!(isFirefox && browserVersion == 50)) {
      props.addProduct(product)
    }
  };

  return (
    <div
      className="shelf-item"
      data-sku={product.sku}
      id={product.id}
    >
      <div className="shelf-stopper">
        <FavouriteButton onClick={favClickHandler} isFavourited={product.isFav} />
      </div>
      <Thumb
        classes="shelf-item__thumb"
        src={isImageNotLoadingUser(username) || hideFirstProductImageForFirefox50 ? '' : product.sku && require(`../../../../public/static/${product.sku}`)}
        alt={product.altText || product.title}
      />
      <p className="shelf-item__title">{product.title}</p>
      <div className="shelf-item__price">
        <div className="val">
          <small>{product.currencyFormat}</small>
          <b>{formattedPrice.substr(0, formattedPrice.length - 3)}</b>
          <span>{formattedPrice.substr(formattedPrice.length - 3, 3)}</span>
        </div>
        {productInstallment}
      </div>
      <div onClick={clickHandler} className="shelf-item__buy-btn">Add to cart</div>
    </div>
  );
};

Product.propTypes = {
  product: PropTypes.object.isRequired,
  addProduct: PropTypes.func.isRequired
};

export default connect(
  null,
  { setFavProduct }
)(Product);
