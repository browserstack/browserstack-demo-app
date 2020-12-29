import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { fetchProducts } from '../../services/shelf/actions';
import { addProduct } from '../../services/cart/actions';

import Product from './Product';
import Filter from './Filter';
import ShelfHeader from './ShelfHeader';
import Clearfix from '../Clearfix';
import Spinner from '../Spinner';

import './style.scss';

class Shelf extends Component {
  static propTypes = {
    fetchProducts: PropTypes.func.isRequired,
    products: PropTypes.array.isRequired,
    addProduct: PropTypes.func.isRequired,
    filters: PropTypes.array,
    sort: PropTypes.string
  };

  state = {
    loading: false,
    filteredProducts: this.props.products
  };

  componentDidMount() {
    this.handleFetchProducts();
  }

  componentWillReceiveProps(nextProps) {
    const { filters: nextFilters, sort: nextSort, products } = nextProps;
    if (window.location.href.indexOf('/favourites') >= 0) {
      this.setState({ filteredProducts: products.filter(product => product.isFav) });
    } else {
      this.setState({ filteredProducts: products });
    }
    if (nextFilters !== this.props.filters) {
      this.setState({ loading: true });
      this.props.fetchProducts(nextFilters, nextSort, () => {
        this.setState({ loading: false });
      });
    }

    if (nextSort !== this.props.sort) {
      this.setState({ loading: true });
      this.props.fetchProducts(nextFilters, nextSort, () => {
        this.setState({ loading: false });
      });
    }
  }

  handleFetchProducts = (
    filters = this.props.filters,
    sort = this.props.sort
  ) => {
    const { filteredProducts } = { ...this.state };
    if (window.location.href.indexOf('/favourites') >= 0 && filteredProducts.length !== 0) {
      const products = filteredProducts.filter((product) => product.isFav);
      this.setState({ filteredProducts: products })
    } else if (filteredProducts.length === 0 || window.location.href.indexOf('signin') >= 0) {
      this.setState({ loading: true });
      this.props.fetchProducts(filters, sort, () => {
        this.setState({ loading: false });
      });
    }
  };

  render() {
    const { filteredProducts } = this.state;

    const p = filteredProducts.map(p => {
      return (
        <Product product={p} addProduct={this.props.addProduct} key={p.id} />
      );
    });

    return (
      <React.Fragment>
        {this.state.loading && <Spinner />}
        <Filter />
        <div className="shelf-container">
          <ShelfHeader productsLength={filteredProducts.length} />
          {p}
          <Clearfix />
        </div>
        <Clearfix />
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => ({
  products: state.shelf.products,
  filters: state.filters.items,
  sort: state.sort.type
});

export default connect(
  mapStateToProps,
  { fetchProducts, addProduct }
)(Shelf);
