import Newsletter from "../Newsletter";
import "./style.scss";

const Footer = () => {
  return (
    <footer>
      <hr style={{ padding: "0", margin: "0" }} />

      <div className="mx-auto max-w-8xl px-6">
        <div className="py-12 flex flex-col md:flex-row justify-between items-center space-y-4">
          <div className=" relative" style={{ width: "40%" }}>
            <span className="block absolute">
              © 2020 BrowserStack. All rights reserved.
            </span>
            <span className="block absolute" style={{ right: "0%" }}>
              Privacy Policy <a href="/">Read More</a>
            </span>
          </div>
          <Newsletter />
        </div>
      </div>
      <div class="gradient-fail-bg example">Exclusive offers coming soon</div>
    </footer>
  );
};

export default Footer;
