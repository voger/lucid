dojo.provide("desktop.apps.KatanaIDE");
dojo.require("dijit.layout.SplitContainer");
dojo.require("dijit.layout.TabContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.Tree");
dojo.require("dijit.form.Textarea");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.Toolbar");
dojo.require("dijit.Dialog");
dojo.require("dijit.form.FilteringSelect");
dojo.require("dojo.data.ItemFileWriteStore");
dojo.requireLocalization("desktop", "common");
dojo.requireLocalization("desktop", "apps");
dojo.requireLocalization("desktop.ui", "menus");
dojo.requireLocalization("desktop", "system");

dojo.declare("desktop.apps.KatanaIDE", desktop.apps._App, {
	files: [], //file information
	appInfo: {}, //application information
	metaUi: {}, //metadata form UI
	init: function(args) {
		var cm = dojo.i18n.getLocalization("desktop", "common");
		var app = dojo.i18n.getLocalization("desktop", "apps");
		var sys = dojo.i18n.getLocalization("desktop", "system");
		this.win = new api.Window({
			title: app["Katana IDE"],
			onClose: dojo.hitch(this, "kill")
		});
		
		var client = new dijit.layout.SplitContainer({
			layoutAlign: "client"
		});
		var right = this.tabArea = new dijit.layout.TabContainer({
			sizeShare: 70
		});
		dojo.connect(right, "selectChild", this, function(wid) {
			if(!wid.ide_info) return;
			this.setMeta(this.appInfo[wid.ide_info.appName]);
		});
		desktop.app.list(dojo.hitch(this, function(apps) {
			for(var i in apps) {
				if(apps[i].filename) continue;
				this.appInfo[apps[i].sysname] = apps[i];
				var files = apps[i].files;
				delete apps[i].files;
				var children = [];
				for(var f in files) {
					var fileItem = {
						sysname: apps[i].sysname+files[f],
						name: files[f],
						label: files[f].substring(files[f].lastIndexOf("/", files[f].length)) || files[f],
						filename: files[f],
						appname: apps[i].sysname
					}
					apps.push(fileItem);
					children.push({
						_reference: apps[i].sysname+files[f]
					})
				}
				apps[i].children = children;
			}
			var appStore = this.appStore = new dojo.data.ItemFileWriteStore({
				data: {
					identifier: "sysname",
					label: "name",
					items: apps
				}
			});
			var left = new dijit.Tree({
				store: appStore,
				query: {category: "*"},
				sizeMin: 0,
				sizeShare: 30,
				style: "overflow: auto;"
			})
			dojo.connect(left, "onClick", this, "onItem");
			client.addChild(left);
			client.addChild(right);
		}));
		
		this.win.addChild(client);
		this.toolbar = new dijit.Toolbar({layoutAlign: "top"});
//			this.toolbar.addChild(new dijit.form.Button({label: cm["new"], iconClass: "icon-16-actions-document-new", onClick: dojo.hitch(this, "newApp", 1)}));
			this.toolbar.addChild(new dijit.form.Button({label: cm.save, iconClass: "icon-16-actions-document-save", onClick: dojo.hitch(this, "save")}));
			this.toolbar.addChild(new dijit.form.DropDownButton({label: cm.metadata, iconClass: "icon-16-actions-document-properties", dropDown: this._makeMetaDialog()}));
			this.toolbar.addChild(new dijit.form.Button({label: cm.run, iconClass: "icon-16-actions-media-playback-start", onClick: dojo.hitch(this, "run")}));
			this.toolbar.addChild(new dijit.form.Button({label: sys.kill, iconClass: "icon-16-actions-media-playback-stop", onClick: dojo.hitch(this, "killExec")}));
	
		this.win.addChild(this.toolbar);
		this.win.show();
		this.win.startup();
		
	},
	makeTab: function(appname, filename, content) {
		var div = dojo.doc.createElement("div");
		dojo.style(div, {
			width: "100%",
			height: "100%",
			overflow: "hidden"
		});
		
		var editor = new desktop.apps.KatanaIDE.CodeTextArea({
			width: "100%",
			height: "100%",
			plugins: "BlinkingCaret GoToLineDialog Bookmarks MatchingBrackets",
			colorsUrl: dojo.moduleUrl("desktop.apps.KatanaIDE.data", "javascript_dojo_color.json"),
			autocompleteUrl: dojo.moduleUrl("desktop.apps.KatanaIDE.data", "javascript_dojo_ac.json")
		});
		div.appendChild(editor.domNode);
		
		var cpane = new dijit.layout.ContentPane({
			closable: true,
			title: filename.substring(filename.lastIndexOf("/")+1) || filename,
			ide_info: {
				fileName: filename,
				appName: appname,
				editor: editor
			}
		});
		
		cpane.setContent(div);
		this.tabArea.addChild(cpane);
		this.tabArea.selectChild(cpane);
		editor.startup();
		if(content != "")
			editor.massiveWrite(content);
		editor.setCaretPosition(0, 0); 
		setTimeout(dojo.hitch(this.tabArea, "layout"), 100);
	},
	_makeMetaDialog: function() {
		var mnu = dojo.i18n.getLocalization("desktop.ui", "menus");
		var sys = dojo.i18n.getLocalization("desktop", "system");
		var cmn = dojo.i18n.getLocalization("desktop", "common");
		var div = document.createElement("div");
		
		var row = document.createElement("div");
		row.textContent = sys.id+": ";
		this.metaUi.sysname = new dijit.form.TextBox({value: "", disabled: true});
		row.appendChild(this.metaUi.sysname.domNode);
		div.appendChild(row);
		
		var row = document.createElement("div");
		row.textContent = sys.name+": ";
		this.metaUi.name = new dijit.form.TextBox({value: ""});
		row.appendChild(this.metaUi.name.domNode);
		div.appendChild(row);
		
		var row = document.createElement("div");
		row.textContent = sys.author+": ";
		this.metaUi.author = new dijit.form.TextBox({value: ""});
		row.appendChild(this.metaUi.author.domNode);
		div.appendChild(row);
		
		var row = document.createElement("div");
		row.textContent = sys.email+": ";
		this.metaUi.email = new dijit.form.TextBox({value: ""});
		row.appendChild(this.metaUi.email.domNode);
		div.appendChild(row);
		
		var row = document.createElement("div");
		row.textContent = sys.version+": ";
		this.metaUi.version = new dijit.form.TextBox({value: ""});
		row.appendChild(this.metaUi.version.domNode);
		div.appendChild(row);
		
		var row = document.createElement("div");
		row.textContent = sys.maturity+": ";
		this.metaUi.maturity = new dijit.form.TextBox({value: ""});
		row.appendChild(this.metaUi.maturity.domNode);
		div.appendChild(row);
		
		var row = document.createElement("div");
		row.textContent = sys.category+": ";
		this.metaUi.category = new dijit.form.FilteringSelect({
			autoComplete: true,
			searchAttr: "label",
			store: new dojo.data.ItemFileReadStore({
				data: {
					identifier: "value",
					items: [
						{ label: mnu.accessories, value: "Accessories" },
						{ label: mnu.development, value: "Development" },
						{ label: mnu.games, value: "Games" },
						{ label: mnu.graphics, value: "Graphics" },
						{ label: mnu.internet, value: "Internet" },
						{ label: mnu.multimedia, value: "Multimedia" },
						{ label: mnu.office, value: "Office" },
						{ label: mnu.system, value: "System" },
						{ label: mnu.administration, value: "Administration" },
						{ label: mnu.preferences, value: "Preferences" }
					]
				}
			}),
			onChange: dojo.hitch( this, function(val) {
				if ( typeof val == "undefined" ) return;
			})
		});
		row.appendChild(this.metaUi.category.domNode);
		div.appendChild(row);
		
		var closeButton = new dijit.form.Button({
			label: cmn.save,
			onClick: dojo.hitch(this, "saveMeta")
		});
		div.appendChild(closeButton.domNode);
		
		var dialog = new dijit.TooltipDialog({}, div);
		return dialog;
	},
	saveMeta: function() {
		var data = {};
		for(var key in this.metaUi) {
			data[key] = this.metaUi[key].getValue();
		}
		desktop.app.save(data);
	},
	setMeta: function(info) {
		for(var key in this.metaUi) {
			this.metaUi[key].setValue(info[key]);
		}
	},
	_newApp: function(name) {
		this.appInfo[name] = {
			sysname: name,
			name: "",
			author: "",
			email: "",
			version: "1.0",
			maturity: "Alpha",
			category: "Accessories"
		}
		var defaultContent = "dojo.provide(\"desktop.apps."+name+"\");\r\n\r\n"
								+"dojo.declare(\"desktop.apps."+name+"\", desktop.apps._App, {\r\n"
								+"	init: function(args) {\r\n"
								+"		/*Startup code goes here*/\r\n"
								+"	}\r\n"
								+"	kill: function(args) {\r\n"
								+"		/*Cleanup code goes here*/\r\n"
								+"	}\r\n"
								+"});"
		this.makeTab(name, "/"+name+".js", defaultContent);
		desktop.app.save(dojo.mixin(this.appInfo[name], {
			filename: "/"+name+".js",
			content: defaultContent
		}));
	},
	onItem: function(item) {
		var store = this.appStore;
		if(!store.isItem(item)) return;
		var filename = store.getValue(item, "filename");
		if(!filename) return;
		var app = store.getValue(item, "appname");
		var tac = this.tabArea.getChildren();
		for(var i in tac) {
			if(typeof tac[i] != "object") continue;
			if(tac[i].ide_info.fileName == filename && tac[i].ide_info.appName == app) {
				return this.tabArea.selectChild(tac[i]);
			}
		}
		desktop.app.get(app, filename, dojo.hitch(this, function(content) {
			this.makeTab(app, filename, content);
		}))
	},
	save: function() {
		var pane = this.tabArea.selectedChildWidget;
		var content = pane.ide_info.editor.getContent();
		desktop.app.save({
			filename: pane.ide_info.fileName,
			content: content
		});
	},
	run: function()
	{
		desktop.app.execString(this.editor.value);
	},
	
	killExec: function() {
		for(key in desktop.app.instances) {
			var instance = desktop.app.instances[key];
			if(!instance) continue;
			if(instance.id == -1) desktop.app.kill(instance.instance);
		}
	},

	kill: function()
	{
		if(typeof this.loadwin != "undefined") {
			if(!this.loadwin.closed) this.loadwin.close();
		}
		if(!this.win.closed)this.win.close();
		this.killExec();
	}
});

dojo.require("desktop.apps.KatanaIDE.CodeTextArea");
api.addDojoCss("desktop/apps/KatanaIDE/codeEditor.css");