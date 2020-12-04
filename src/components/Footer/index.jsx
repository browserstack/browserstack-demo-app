import './style.scss';

const Footer = () => {
  return (
    <footer>
      <hr style={{padding: '0', margin: '0'}} />
      <div className="mx-auto max-w-8xl px-6">
        <div className="py-12 flex flex-col md:flex-row justify-between items-center space-y-4">
          <div><span>© 2020 BrowserStack. All rights reserved.</span></div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
