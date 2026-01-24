import React from "react";
import './style.scss';

const Newsletter = () => {
  return (
    <form>
      <input
        id="newsletter-email"
        name="email-addr"
        className="inputClr border border-gray-300 p-2 mx-2"
        type="email"
        placeholder="Email"
        required
      />
      <button type="submit" className="bg-blue-500 text-white p-2">Subscribe to Newsletter</button>
    </form>
  );
};

export default Newsletter;
