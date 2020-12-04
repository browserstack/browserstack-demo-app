import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import { updateSort } from '../../../services/sort/actions';
import Selectbox from '../../Selectbox';

const sortBy = [
  { value: '', label: 'Select' },
  { value: 'lowestprice', label: 'Lowest to highest' },
  { value: 'highestprice', label: 'Highest to lowest' }
];

class Sort extends Component {
  static propTypes = {
    updateSort: PropTypes.func.isRequired,
    sort: PropTypes.string.isRequired
  };

  state = {
    isFavouritesPage: true
  };

  componentDidMount() {
    if (window.location.href.indexOf("/favourites") >= 0) {
      this.setState({ isFavouritesPage: true });
    } else {
      this.setState({ isFavouritesPage: false });
    }
  }

  handleSort = value => {
    this.props.updateSort(value);
  };

  render() {
    const { isFavouritesPage } = this.state;
    if (isFavouritesPage) {
      return <></>;
    }

    return (
      <div className="sort">
        Order by
        <Selectbox options={sortBy} handleOnChange={this.handleSort} />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  sort: state.sort.type
});

export default connect(
  mapStateToProps,
  { updateSort }
)(Sort);
