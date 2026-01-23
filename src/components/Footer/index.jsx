import Newsletter from "../Newsletter";

const Footer = () => {
  return (
    <footer>
      <hr style={{ padding: "0", margin: "0" }} />
      <img className="m-auto h-56 " alt="flowchart main" style={{ minWidth: '860px', minHeight: '320px' }} src={require(`../../../public/static/FlowchartShopflowdemo.png`)} />
      <div className="mx-auto max-w-8xl px-6">
        <div className="py-12 flex flex-col md:flex-row justify-between items-center space-y-4">
          <div className=" relative" style={{ width: "40%" }}>
            <span className="block absolute">
              © 2020 All rights reserved.
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
