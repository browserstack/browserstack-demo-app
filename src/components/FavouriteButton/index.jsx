import { IconButton } from '@material-ui/core';
import FavoriteIcon from '@material-ui/icons/Favorite';
import FavoriteBorderIcon from '@material-ui/icons/FavoriteBorder';

import styles from './style.scss';

const FavouriteButton = ({ onClick, variant, isFavourited, className, ...props }) => {
  const ButtonStyles = ['Button'];
  if (variant === 'green') {
    ButtonStyles.push('green');
  }
  if (isFavourited) {
    ButtonStyles.push('clicked');
  }
  if (!onClick) {
    ButtonStyles.push('inactive');
  }
  ButtonStyles.push(className);
  return (
    <IconButton onClick={onClick} className={ButtonStyles.join(' ')} aria-label="delete" {...props}>
      {isFavourited ? <FavoriteIcon className='Icon' /> : <FavoriteBorderIcon className='Icon' />}
    </IconButton>
  );
};

export default FavouriteButton;
