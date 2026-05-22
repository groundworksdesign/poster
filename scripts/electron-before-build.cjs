module.exports = async () => {
  // Returning false tells electron-builder that dependency handling is external.
  // CI installs/rebuilds dependencies before invoking electron-builder.
  return false;
};
