import React from 'react';
import PropTypes from 'prop-types';

import Sort from '../Sort';
import Clearfix from '../../Clearfix';

const ShelfHeader = props => {
  return (
    <>
      <div style={{
        fontSize: '1.5em',
        fontWeight: 'bold',
        margin: '0.67em 0'
      }}>
        Products
      </div >
      <div className="shelf-container-header" style={{ marginRight: '50px' }}>
        <small className="products-found">
          <h3>{props.productsLength} Product(s) found.</h3>
        </small>
        <Sort />
        <Clearfix />
      </div>
    </>
  );
};

ShelfHeader.propTypes = {
  productsLength: PropTypes.number.isRequired
};

export default ShelfHeader;
