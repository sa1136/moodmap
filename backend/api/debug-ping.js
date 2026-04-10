/** Tiny handler to verify Vercel runs Node functions (see vercel.json rewrite order). */
"use strict";

module.exports = (req, res) => {
  res.status(200).json({ ping: true, t: Date.now() });
};
