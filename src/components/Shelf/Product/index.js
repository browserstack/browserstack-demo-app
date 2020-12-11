import React from 'react';
import PropTypes from 'prop-types';
import store2 from 'store2';
import Router from 'next/router';
import { connect } from 'react-redux';

import { setFavProduct } from '../../../services/shelf/actions';

import FavouriteButton from '../../FavouriteButton';
import { isImageNotLoadingUser } from '../../../constants/users';

import Thumb from '../../Thumb';
import util from '../../../services/util';

const Product = props => {
  const { product, setFavProduct } = props;
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

  return (
    <div
      className="shelf-item"
      data-sku={product.sku}
    >
      <div className="shelf-stopper">
        <FavouriteButton onClick={favClickHandler} isFavourited={product.isFav} />
      </div>
      <Thumb
        classes="shelf-item__thumb"
        src={isImageNotLoadingUser(username) ? '' : product.sku && require(`../../../../public/static/${product.sku}`)}
        alt={product.title}
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
      <div onClick={() => props.addProduct(product)} className="shelf-item__buy-btn">Add to cart</div>
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
