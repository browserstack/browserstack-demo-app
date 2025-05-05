import React from "react";
import './style.scss';

const Newsletter = () => {
  return (
    <form>
      <label htmlFor="newsletter-email">Subscribe to newsletter</label>
      <input
        id="newsletter-email"
        name="email-addr"
        className="inputClr border border-gray-300 p-2 mx-2"
        type="email"
        placeholder="Email"
        required
      />
    </form>
  );
};

export default Newsletter;
