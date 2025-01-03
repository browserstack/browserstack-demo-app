import React from "react";

const Newsletter = () => {
  return (
    <form>
      <label htmlFor="newsletter-email">Subscribe to newsletter</label>
      <input
        id="newsletter-email"
        name="email-addr"
        className="border border-gray-300 rounded-md p-2 mx-2"
        type="email"
        placeholder="Email"
        required
      />
    </form>
  );
};

export default Newsletter;
