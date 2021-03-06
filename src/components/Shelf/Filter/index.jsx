import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import { updateFilters } from '../../../services/filters/actions';
import Checkbox from '../../CheckBox';

const availableSizes = ['Apple', 'Samsung', 'Google', 'OnePlus'];

import './style.scss';

class Filter extends Component {
  static propTypes = {
    updateFilters: PropTypes.func.isRequired,
    filters: PropTypes.array
  };

  state = {
    isFavouritesPage: true
  };

  componentDidMount() {
    this.selectedCheckboxes = new Set();
    if (window.location.href.indexOf("/favourites") >= 0) {
      this.setState({ isFavouritesPage: true });
    } else {
      this.setState({ isFavouritesPage: false });
    }
  }

  toggleCheckbox = label => {
    if (this.selectedCheckboxes.has(label)) {
      this.selectedCheckboxes.delete(label);
    } else {
      this.selectedCheckboxes.add(label);
    }
    this.props.updateFilters(Array.from(this.selectedCheckboxes));
  };

  createCheckbox = label => (
    <Checkbox
      classes="filters-available-size"
      label={label}
      handleCheckboxChange={this.toggleCheckbox}
      key={label}
    />
  );

  createCheckboxes = () => availableSizes.map(this.createCheckbox);

  render() {
    const { isFavouritesPage } = this.state;
    if (isFavouritesPage) {
      return <></>;
    }
    return (
      <div className="filters">
        <h4 className="title">Vendors:</h4>
        {this.createCheckboxes()}
      </div>
    );
  }
}

const mapStateToProps = state => ({
  filters: state.filters.items
});

export default connect(
  mapStateToProps,
  { updateFilters }
)(Filter);
