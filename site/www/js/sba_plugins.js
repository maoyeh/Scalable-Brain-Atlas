browser.include_script_once('../js/errorConsole.js');

/* sbaPlugin_class */

function sbaPlugin_class(name) {
  if (name == undefined) return;
  this.name = this.niceName = name;
}

sbaPlugin_class.prototype.getQuery = function() { return this.query; }

sbaPlugin_class.prototype.setQuery = function(query) { this.query = query; }

sbaPlugin_class.prototype.externalLink = function(sbaState) {
  // when called without argument, this function must return true or false
  return false;
}

sbaPlugin_class.prototype.activate = function(sbaViewer,divElem) {
  url = this.externalLink(sbaViewer.getState());
  if (url) {
    if (this.externalWindow != undefined) {
      try { this.externalWindow.close() } catch(e) {};
    }
    this.externalWindow = window.open(url);
  }
}

sbaPlugin_class.prototype.applyStateChange = function(sbaViewer,divElem) {
  this.activate(sbaViewer,divElem);
}

sbaPlugin_class.prototype.iconHtml = function(size) {
  var sizePx = (size == 'S' ? 36 : 72); 
  return '<img src="../plugins/icon.php?plugin='+this.name+'&amp;size_px='+sizePx+'" style="vertical-align: middle; width:'+sizePx+'px; height:'+sizePx+'px; border:0px; margin-right:4px"/>';
}


sbaPlugin_class.prototype.menuItemHtml = function(mode) {
  var ans = this.iconHtml('L')+this.niceName;
  if (this.externalLink()) ans += '<img src="../img/linkout.gif" style="border: 0px; padding: 2px; padding-left: 4px;"/>';
  return ans;
}

/* menuPlugin_class */

function menuPlugin_class(windowName) {
  this.windowName = windowName;
  this.name = undefined;
  this.mode = 'list';
}
menuPlugin_class.prototype = new sbaPlugin_class();

menuPlugin_class.prototype.activate = function(sbaViewer,divElem) {
  var ans = '';
  for (var k in sbaPluginManager.plugins) {
    var pn = sbaPluginManager.plugins[k];
    ans += '<div class="plugin-item" onclick="sbaPluginManager.activatePlugin(\''+this.windowName+'\',\''+k+'\')"><a href="javascript:void(0)">'+pn.menuItemHtml()+'</a></div>' ;
  }
  divElem.innerHTML = ans;
}

/* propertiesPlugin_class */

function propertiesPlugin_class(name) {
  sbaPlugin_class.apply(this,[name]);
  this.acr = null;
}
propertiesPlugin_class.prototype = new sbaPlugin_class();

propertiesPlugin_class.prototype.activate = function(sbaViewer,divElem) {
  var acr = sbaViewer.currentAcr;
  var ctr_vol = sbaViewer.regionCenterAndVolume(acr);
  var rgbList = ctr_vol[2];
  var attr = {};
  var full = ACR_TO_FULL[acr];
  attr['Full name'] = full;
  attr['Number of subregions'] = rgbList.length;
  attr['RGB value(s)'] = rgbList.join(', ');
  attr['Volume [mm3]'] = Math.round(100*ctr_vol[1])/100;
  var ctr = ctr_vol[0];
  var label = rgbList.length>1 ? 'Center of largest subregion' : 'Center';
  if (ctr) {
    var os = sbaViewer.nearestOrigSlice(ctr[1]);
    var xz = sbaViewer.mm2svg([ctr[0],ctr[2]]);
    attr[label+' [mm]'] = Math.round(100*ctr[0])/100 + '; ' + Math.round(100*ctr[1])/100+'; ' + Math.round(100*ctr[2])/100 +
      ' <a class="link" onclick="var os='+os+';markers=[new sbaMarker_class(\''+acr+'\',os,['+xz[0]+','+xz[1]+'])];sbaViewer.addMarkers(markers,0);sbaViewer.selectOrigSlice(os);">[show marker]</a>';
  } else {
    attr[label+' [mm]'] = '[unknown]';
  }
  tmp = {};
  tmp['Properties of region '+acr] = attr;
  var myTree = new myTree_class('SBA_PROPERTIES_PLUGIN',tmp);
  divElem.innerHTML = myTree.html();
  myTree.contentRoot.showMore();
}

/* sbaPluginWindow_class */

function sbaPluginWindow_class(divElemId) {
  this.divElemId = divElemId; // this is also the window name
  this.activePluginName = undefined;
  //this.history = [undefined];
  //this.historyIndex = 0;
}

sbaPluginWindow_class.prototype.activatePlugin = function(pluginName,sbaViewer,pluginQuery) {
  var plugin;
  if (pluginName) {
    plugin = sbaPluginManager.getPlugin(pluginName);
    if (plugin) { 
      if (pluginQuery) plugin.setQuery(pluginQuery);
    } else {
      globalErrorConsole.addError('Invalid plugin "'+pluginName+'"');
    }
  }
  if (!plugin) {
    plugin = new menuPlugin_class(this.divElemId);
    pluginName = plugin.name;
  }
  if (plugin.externalLink()) {
    plugin.activate(sbaViewer);
    return;
  }
  this.render(plugin,sbaViewer);
  this.activePluginName = pluginName;
  /*
  // remember history
  pluginPath = pluginName;
  if (pluginQuery != undefined) pluginPath += '?'+pluginQuery;
  if (this.history[this.historyIndex] != pluginPath) {
    this.history = this.history.slice(0,this.historyIndex);
    this.history.push(pluginPath);
    this.historyIndex++;
  }
  */
}

sbaPluginWindow_class.prototype.applyStateChange = function(sbaViewer) {
  if (this.activePluginName) {
    var plugin = sbaPluginManager.getPlugin(this.activePluginName);
    if (plugin != undefined) {
      var contentElem = document.getElementById(this.divElemId+'_CONTENT');
      plugin.applyStateChange(sbaViewer,contentElem);
    }
  }
}

sbaPluginWindow_class.prototype.navBarHtml = function(pluginName,pluginNiceName,pluginQuery) {
  var a = [];
  if (pluginName != undefined) {
    a.push('<a href="javascript:void(0)" onclick="sbaPluginManager.activatePlugin(\''+this.divElemId+'\')">Plugins</a>');
    if (pluginQuery != undefined) {
      a.push('<a href="javascript:void(0)" onclick="sbaPluginManager.activatePlugin(\''+this.divElemId+'\',\''+pluginName+'\')">'+pluginNiceName+'</a>');
      a.push(pluginQuery);
    } else a.push(pluginNiceName);
  } else a.push('Available plugins');
  return a.join('&#160;&gt;&#160;');
}

sbaPluginWindow_class.prototype.render = function(plugin,sbaViewer) {
  var divElem = document.getElementById(this.divElemId);
  divElem.innerHTML = '';
  divHeight = browser.elemHeight(divElem);
  var navBarElem = document.createElement('div');
  navBarElem.className = 'plugin-head';
  var pluginElem = document.createElement('div');
  pluginElem.id = this.divElemId+'_CONTENT'
  pluginElem.className = 'plugin-content';
  divElem.appendChild(navBarElem);
  divElem.appendChild(pluginElem);
  navBarElem.innerHTML = this.navBarHtml(plugin.name,plugin.niceName,plugin.getQuery());
  plugin.activate(sbaViewer,pluginElem);
}


/* sbaPluginManager_class */

function sbaPluginManager_class() {
  this.plugins = {};
  this.windows = {};
}

// first add plugins...
sbaPluginManager_class.prototype.addPlugin = function(pluginName,sbaViewer) {
  var className = pluginName.toLowerCase()+'Plugin_class';
  if (window[className]) {
    this.plugins[pluginName.toLowerCase()] = new window[className](pluginName,sbaViewer);
  } else {
    globalErrorConsole.addError('Cannot find plugin class "'+className+'"');
  }
}

// ... then add windows to display these plugins
sbaPluginManager_class.prototype.addWindow = function(divElemId,defaultPlugin,sbaViewer) {
  var sbaPluginWindow = new sbaPluginWindow_class(divElemId);
  // load defaultPlugin or menu if it is undefined
  if (defaultPlugin != false) sbaPluginWindow.activatePlugin(defaultPlugin,sbaViewer); 
  this.windows[divElemId] = sbaPluginWindow;
  return sbaPluginWindow;
}

sbaPluginManager_class.prototype.applyStateChange = function(sbaViewer) {
  for (var k in this.windows) {
    this.windows[k].applyStateChange(sbaViewer);
  }
}

sbaPluginManager_class.prototype.getPlugin = function(pluginName) {
  return this.plugins[pluginName.toLowerCase()];
}

sbaPluginManager_class.prototype.getWindow = function(windowName) {
  return this.windows[windowName];
}

sbaPluginManager_class.prototype.activatePlugin = function(windowName,pluginName,pluginQuery) {
  this.windows[windowName].activatePlugin(pluginName,sbaViewer,pluginQuery);
}

/* sbaPluginManager instance */

sbaPluginManager = new sbaPluginManager_class();
