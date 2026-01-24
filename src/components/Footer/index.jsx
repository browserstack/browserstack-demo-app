import Newsletter from "../Newsletter";
import "./style.scss";

const Footer = () => {
  return (
    <div>
      <hr style={{ padding: "0", margin: "0" }} />
      <img className="m-auto h-56 " alt="flowchart main" style={{ minWidth: '860px', minHeight: '320px' }} src={require(`../../../public/static/FlowchartBstackdemo.png`)} />
      <div class="gradient-fail-bg example">Exclusive offers coming soon</div>

      <div className="mx-auto max-w-8xl px-6 " style={{ justifyContent: 'space-between' }}>
        <div class="footer-section-wrapper" id="custom-footer">
          <div class="container">

            <div class="footer-links">
              <a href="/offers">Offers</a>
              <br />
              <a href="/contact">Contact Us</a>
              <br />
              <a href="/privacy">Privacy Policy</a>
              <br />
              <a href="/careers">Careers</a>
            </div>
            <ul>
              <li>A single, simple list item.</li>
            </ul>
            <p>© 2026 BrowserStack Demo</p>
          </div>
          <span className="block absolute" style={{ right: "16px" }}>
            Privacy Policy <a href="/">Read More</a>
          </span>
        </div>
        <div className="py-12 flex flex-col md:flex-row justify-between items-center space-y-4">
          <div className=" relative" style={{ width: "40%" }}>
          </div>
          <Newsletter />
        </div>
      </div>
    </div>
  );
};

export default Footer;
