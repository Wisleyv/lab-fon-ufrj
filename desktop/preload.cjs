const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("labfonDesktopHost", {
  selectProjectImage(rootPath) {
    return ipcRenderer.invoke("labfon:selectProjectImage", rootPath);
  },
  readProjectImage(rootPath, publicPath) {
    return ipcRenderer.invoke("labfon:readProjectImage", rootPath, publicPath);
  },
  openProjectDirectory() {
    return ipcRenderer.invoke("labfon:openProjectDirectory");
  },

  pathExists(rootPath, relativePath) {
    return ipcRenderer.invoke("labfon:pathExists", rootPath, relativePath);
  },

  readTextFile(rootPath, relativePath) {
    return ipcRenderer.invoke("labfon:readTextFile", rootPath, relativePath);
  },

  readJsonFiles(rootPath, relativePath) {
    return ipcRenderer.invoke("labfon:readJsonFiles", rootPath, relativePath);
  },

  readContentDataset(rootPath, key) {
    return ipcRenderer.invoke("labfon:readContentDataset", rootPath, key);
  },

  saveContentRecord(rootPath, key, name, expected, value) {
    return ipcRenderer.invoke("labfon:saveContentRecord", rootPath, key, name, expected, value);
  },

  writeTextFileAtomic(rootPath, relativePath, content) {
    return ipcRenderer.invoke(
      "labfon:writeTextFileAtomic",
      rootPath,
      relativePath,
      content,
    );
  },

  runProjectBuild(rootPath) {
    return ipcRenderer.invoke("labfon:runProjectBuild", rootPath);
  },

  previewGeneratedSite(rootPath) {
    return ipcRenderer.invoke("labfon:previewGeneratedSite", rootPath);
  },

  loadPublishProfile() {
    return ipcRenderer.invoke("labfon:loadPublishProfile");
  },

  savePublishProfile(profile, password) {
    return ipcRenderer.invoke("labfon:savePublishProfile", profile, password);
  },

  testFtpConnection(profile, password) {
    return ipcRenderer.invoke("labfon:testFtpConnection", profile, password);
  },

  connectFtp(profile, password) {
    return ipcRenderer.invoke("labfon:connectFtp", profile, password);
  },

  listRemoteDirectory(profile, password, remotePath) {
    return ipcRenderer.invoke(
      "labfon:listRemoteDirectory",
      profile,
      password,
      remotePath,
    );
  },

  publishGeneratedSite(rootPath, profile, password) {
    return ipcRenderer.invoke(
      "labfon:publishGeneratedSite",
      rootPath,
      profile,
      password,
    );
  },

  retrieveRemoteProject(profile, password) {
    return ipcRenderer.invoke("labfon:retrieveRemoteProject", profile, password);
  },

  initializeRemoteProjectSource(rootPath, profile, password) {
    return ipcRenderer.invoke(
      "labfon:initializeRemoteProjectSource",
      rootPath,
      profile,
      password,
    );
  },

  updateRemoteProjectSource(rootPath, profile, password) {
    return ipcRenderer.invoke(
      "labfon:updateRemoteProjectSource",
      rootPath,
      profile,
      password,
    );
  },
});
