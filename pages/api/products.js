import productsData from '../../src/constants/products.json';

export default (req, res) => {
  const userName = req.query['userName'];

  // Set 5 product as fav
  if (userName === 'fav_user') {
    const products = productsData.products;
    const favProducts =  products.slice(0, 5).map((product) => product.isFav = true);
    res.statusCode = 200;
    res.json({ products: products.map(itm => ({
      ...favProducts.find((item) => (item.id === itm.id) && item),
      ...itm
    }))});
  } else {
    const products = productsData.products;
    products.map(product => product.isFav = false);
    res.statusCode = 200;
    res.json(productsData);
  }
};
