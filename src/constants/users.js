const validUsers = ['image_not_loading_user', 'existing_orders_user', 'fav_user', 'demouser'];
const validPassword = 'testingisfun99';
export const isValidUser = user => validUsers.indexOf(user) >= 0;
export const isValidPassword = password => validPassword === password;
export const isLockedUser = user => user === 'locked_user';
export const isImageNotLoadingUser = user => user === 'image_not_loading_user';
