import store2 from 'store2';
import Link from 'next/link';
import Router from 'next/router';

import useWindowSize from '../utils/useWindowSize';
import './style.scss';

const Header = () => {
  const userName = store2.session.get('username');
  const size = useWindowSize();
  const logOutHandler = (e) => {
    e.preventDefault();
    if (userName) {
      store2.session.clearAll();
      Router.replace('/');
    } else {
      Router.replace('/signin');
    }
  };

  return (
    <div className="Navbar_root__2kbI9">
      <div className="mx-auto max-w-8xl px-6">
        <div className="flex justify-between align-center flex-row py-4 md:py-6 :py-6 relative">
          <div className="flex flex-1 items-center">
            <Link href="/">
              <a className="Navbar_logo__26S5Y">
                <img 
                  className="Navbar_logo__image__3Blki" 
                  alt="logo"
                  style={{ width:'265px', height: 'auto' }}
                  src={require(`../../../public/static/bstackdemo_logo.jpg`)} 
                />
              </a>
            </Link>
            <div className="space-x-4 ml-6 menu" style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(3, auto)',
              gap: '1rem'
            }}>
              {/* Items in reverse DOM order but displayed in original order via grid */}
              <Link href="/favourites">
                <a 
                  id="favourites" 
                  className="Navbar_link__3Blki menu-item" 
                  style={{ order: 3 }}
                >
                  <strong>Favourites</strong>
                </a>
              </Link>
              <Link href="/orders">
                <a 
                  id="orders" 
                  className="Navbar_link__3Blki menu-item"
                  style={{ order: 2 }}
 
                >
                  <strong>Orders</strong>
                </a>
              </Link>
              <Link href="/offers">
                <a 
                  id="offers" 
                  className="Navbar_link__3Blki menu-item"
                  style={{ order: 1 }}
                >
                  <strong>Offers</strong>
                </a>
              </Link>
            </div>
          </div>
          
          <div className="flex flex-1 justify-end align-center space-x-8">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Search"
                className="px-4 py-1 border border-gray-300 rounded-l focus:outline-none"
                aria-label="Search"
              />
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-1 bg-gray-100 border border-l-0 border-gray-300"
                role='button'
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <img className="m-auto h-56 " alt="flowchart main" style={{ width: '17px', height: '17px', marginRight: '7px' }} src={require(`../../../public/static/search.png`)} />
                Search
              </button> 
            </div>
            {userName ? (<span className="username">{userName}</span>) : ''}
            <nav className="UserNav_root__343id align-center pt-1">
              <span class="Navbar_link__3Blki logout-link mt-2" id="signin"  onClick={logOutHandler}  role="link">{userName ? 'Logout' : 'Sign In'}</span>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
