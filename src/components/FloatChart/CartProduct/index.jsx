import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  isFirefox,
  browserVersion
} from "react-device-detect";

import Thumb from '../../Thumb';
import util from '../../../services/util';

class CartProduct extends Component {
  static propTypes = {
    product: PropTypes.object.isRequired,
    removeProduct: PropTypes.func.isRequired,
    changeProductQuantity: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      product: this.props.product,
      isMouseOver: false
    };
  }

  handleMouseOver = () => {
    this.setState({ isMouseOver: true });
  };

  handleMouseOut = () => {
    this.setState({ isMouseOver: false });
  };

  handleOnIncrease = () => {
    const { changeProductQuantity } = this.props;
    const { product } = this.state;
    product.quantity = product.quantity + 1;
    changeProductQuantity(product);
  }

  handleOnDecrease = () => {
    const { changeProductQuantity } = this.props;
    const { product } = this.state;
    product.quantity = product.quantity - 1;
    changeProductQuantity(product);
  }

  render() {
    const { product, removeProduct } = this.props;
    const isFirefox50 = isFirefox && browserVersion == 50;
    // Bug: Hide first product image for firefox 50
    const hideFirstProductImageForFirefox50 = product.id === 1 && isFirefox50;

    const classes = ['shelf-item'];

    if (!!this.state.isMouseOver) {
      classes.push('shelf-item--mouseover');
    }

    return (
      <div className={classes.join(' ')}>
        <div
          className="shelf-item__del"
          onMouseOver={() => this.handleMouseOver()}
          onMouseOut={() => this.handleMouseOut()}
          onClick={() => removeProduct(product)}
        />
        <Thumb
          classes="shelf-item__thumb"
          src={hideFirstProductImageForFirefox50 ? '' : product.sku && require(`../../../../public/static/${product.sku}`)}
          alt={product.title}
        />
        <div className="shelf-item__details">
          <p className="title">{product.title}</p>
          <p className="desc">
            {`${product.availableSizes[0]}`} <br />
            Quantity: {product.quantity}
          </p>
        </div>
        <div className="shelf-item__price">
          <p>{`${product.currencyFormat}  ${util.formatPrice(
            product.price
          )}`}</p>
          <div>
            <button onClick={this.handleOnDecrease} disabled={product.quantity === 1 ? true : false} className="change-product-button">-</button>
            <button onClick={this.handleOnIncrease} className="change-product-button">+</button>
          </div>
        </div>

        <div className="clearfix" />
      </div>
    );
  }
}

export default CartProduct;
