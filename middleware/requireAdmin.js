module.exports = function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.redirect("/admin/login");
  }
  next();
};
